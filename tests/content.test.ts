import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadContent } from '../src/content/loader';
import { DateSchema, ILLUSTRATIVE_NOTICE } from '../src/content/schemas';
import {
  ContentValidationError,
  validateContent,
} from '../src/content/validate';
import { DEFAULT_DATA_ROOT } from '../scripts/lib/content';
import type { ContentBundle } from '../src/core/types';
import { content, fixtureCopy } from './helpers';

describe('fixture contract and content validation', () => {
  it('loads eight explicitly illustrative cases and one complete stage', () => {
    expect(content.cases).toHaveLength(8);
    expect(content.stages[0]?.caseIds).toHaveLength(8);
    expect(
      new Set(content.cases.map((item) => item.resolution.expectedDecision)),
    ).toEqual(new Set(['CHECK_IN', 'DENY', 'ESCALATE']));
    for (const item of [
      ...content.cases,
      ...content.ruleSnapshots,
      ...content.stages,
      ...content.dailyPools,
    ]) {
      expect(item.verificationStatus).toBe('ILLUSTRATIVE_ONLY');
      expect(item.notice).toBe(ILLUSTRATIVE_NOTICE);
    }
    expect(validateContent(content)).toEqual(content);
  });

  it.each(['2026-02-30', '2026-13-01', '2026-1-02', 'not-a-date'])(
    'rejects invalid date %s',
    (date) => {
      expect(DateSchema.safeParse(date).success).toBe(false);
    },
  );

  it('accepts leap days only in leap years', () => {
    expect(DateSchema.safeParse('2028-02-29').success).toBe(true);
    expect(DateSchema.safeParse('2026-02-29').success).toBe(false);
  });

  const invalid: [string, (copy: ContentBundle) => void, string][] = [
    [
      'duplicate cases',
      (copy) => {
        copy.cases.push(copy.cases[0]!);
      },
      'duplicate IDs',
    ],
    [
      'duplicate stage entries',
      (copy) => {
        copy.stages[0]!.caseIds.push(copy.stages[0]!.caseIds[0]!);
      },
      'duplicate IDs',
    ],
    [
      'duplicate documents',
      (copy) => {
        copy.cases[0]!.documents.push(copy.cases[0]!.documents[0]!);
      },
      'duplicate IDs',
    ],
    [
      'duplicate questions',
      (copy) => {
        copy.cases[1]!.questions.push(copy.cases[1]!.questions[0]!);
      },
      'duplicate IDs',
    ],
    [
      'unknown stage case',
      (copy) => {
        copy.stages[0]!.caseIds.push('missing');
      },
      'unknown reference missing',
    ],
    [
      'unlisted manifest case',
      (copy) => {
        copy.manifest.cases.pop();
      },
      'unknown reference',
    ],
    [
      'path traversal',
      (copy) => {
        copy.manifest.cases[0]!.path = '../secret.json';
      },
      'manifest.cases.0.path',
    ],
    [
      'duplicated asset path',
      (copy) => {
        copy.manifest.cases[1]!.path = copy.manifest.cases[0]!.path;
      },
      'asset paths',
    ],
    [
      'missing snapshot',
      (copy) => {
        copy.cases[0]!.ruleSnapshotId = 'absent';
      },
      'unknown rule snapshot',
    ],
    [
      'missing rule',
      (copy) => {
        copy.cases[0]!.ruleIds.push('absent');
      },
      'unknown reference absent',
    ],
    [
      'unpossessed initial document',
      (copy) => {
        copy.cases[0]!.initiallyPresentedDocumentIds.push('absent');
      },
      'unknown reference absent',
    ],
    [
      'unpossessed reveal',
      (copy) => {
        copy.cases[1]!.questions[0]!.revealsDocumentIds.push('absent');
      },
      'unknown reference absent',
    ],
    [
      'unreachable evidence',
      (copy) => {
        copy.cases[1]!.questions[0]!.revealsDocumentIds = [];
      },
      'unreachable required evidence visa',
    ],
    [
      'incomplete path preconditions',
      (copy) => {
        copy.cases[1]!.resolution.paths[0]!.requiredQuestionIds = [];
      },
      'unreachable required evidence visa',
    ],
    [
      'unknown path question',
      (copy) => {
        copy.cases[1]!.resolution.paths[0]!.requiredQuestionIds.push('missing');
      },
      'unknown reference missing',
    ],
    [
      'unjustified required question',
      (copy) => {
        copy.cases[1]!.questions[0]!.justified = false;
      },
      'must be justified',
    ],
    [
      'premature denial path',
      (copy) => {
        copy.cases[3]!.resolution.paths[0]!.requiredQuestionIds = [];
      },
      'denial leaves relevant inquiry',
    ],
    [
      'expired check-in evidence',
      (copy) => {
        copy.cases[0]!.documents[0]!.validUntil = '2026-10-23';
      },
      'check-in relies on invalid document',
    ],
    [
      'not-yet-valid check-in evidence',
      (copy) => {
        copy.cases[0]!.documents[0]!.validFrom = '2026-10-25';
      },
      'check-in relies on invalid document',
    ],
    [
      'reversed document range',
      (copy) => {
        copy.cases[0]!.documents[0]!.validFrom = '2028-01-01';
      },
      'validity range is reversed',
    ],
    [
      'exhausted visa',
      (copy) => {
        copy.cases[0]!.documents[1]!.attributes.entriesRemaining = 0;
      },
      'exhausted visa',
    ],
    [
      'incomplete visa attributes',
      (copy) => {
        delete copy.cases[0]!.documents[1]!.attributes.category;
      },
      'lacks category',
    ],
    [
      'different document holder',
      (copy) => {
        copy.cases[0]!.documents[0]!.holder = 'Somebody else';
      },
      'holder does not match',
    ],
    [
      'travel before snapshot',
      (copy) => {
        copy.cases[0]!.travelDate = '2026-10-23';
      },
      'predates rule snapshot',
    ],
    [
      'disconnected itinerary',
      (copy) => {
        copy.cases[6]!.itinerary[1]!.from = 'FRA';
      },
      'disconnected',
    ],
    [
      'irrelevant rule scope',
      (copy) => {
        copy.ruleSnapshots[0]!.rules[0]!.scope.departureAirports = ['LHR'];
      },
      'outside itinerary scope',
    ],
    [
      'different stage airport',
      (copy) => {
        copy.stages[0]!.departureAirport = 'LHR';
      },
      'another airport',
    ],
    [
      'different stage date',
      (copy) => {
        copy.stages[0]!.scheduledDeparture = '2026-10-25T18:00:00Z';
      },
      'differs from stage departure',
    ],
    [
      'unlabeled illustrative case',
      (copy) => {
        copy.cases[0]!.notice = 'Training';
      },
      'explicit fixture notice',
    ],
    [
      'unreviewed verified case',
      (copy) => {
        copy.cases[0]!.verificationStatus = 'VERIFIED';
      },
      'recorded review',
    ],
    [
      'unverified rules for verified case',
      (copy) => {
        copy.cases[0]!.verificationStatus = 'VERIFIED';
      },
      'verified rule snapshot',
    ],
    [
      'unsourced verified rules',
      (copy) => {
        copy.ruleSnapshots[0]!.verificationStatus = 'VERIFIED';
      },
      'require source URLs',
    ],
    [
      'illustrative content in verified stage',
      (copy) => {
        copy.stages[0]!.verificationStatus = 'VERIFIED';
      },
      'verified stage includes illustrative',
    ],
    [
      'illustrative content in verified daily',
      (copy) => {
        copy.dailyPools[0]!.verificationStatus = 'VERIFIED';
      },
      'verified daily pool includes illustrative',
    ],
    [
      'insufficient daily pool',
      (copy) => {
        copy.dailyPools[0]!.count = 10;
      },
      'insufficient pool size',
    ],
    [
      'impossible difficulty minimum',
      (copy) => {
        copy.dailyPools[0]!.difficulty.HARD = { min: 3, max: 3 };
      },
      'insufficient HARD',
    ],
    [
      'impossible difficulty capacity',
      (copy) => {
        copy.dailyPools[0]!.difficulty = {
          EASY: { min: 0, max: 1 },
          MEDIUM: { min: 0, max: 1 },
          HARD: { min: 0, max: 1 },
        };
      },
      'cannot meet daily count',
    ],
  ];
  it.each(invalid)('rejects %s', (_label, mutate, message) => {
    const copy = fixtureCopy();
    mutate(copy);
    expect(() => validateContent(copy)).toThrow(message);
  });

  it('allows an expired document as deliberate negative evidence for denial', () => {
    const expired = content.cases.find(
      (item) => item.id === 'fixture-03-expired',
    )!;
    expect(expired.documents[0]!.validUntil! < expired.travelDate).toBe(true);
    expect(() => validateContent(content)).not.toThrow();
  });

  it('rejects sources outside their documented effective dates', () => {
    const copy = fixtureCopy();
    copy.ruleSnapshots[0]!.rules[0]!.sources = [
      {
        url: 'https://example.com/test-source',
        publisher: 'Test-only source',
        verifiedDate: '2026-10-24',
        effectiveFrom: '2026-10-25',
      },
    ];
    expect(() => validateContent(copy)).toThrow('does not cover travel date');
  });
});

describe('adapter-based static JSON loader', () => {
  const readJson = async (path: string): Promise<unknown> =>
    JSON.parse(await readFile(resolve(DEFAULT_DATA_ROOT, path), 'utf8'));

  it('detects an ID mismatch in the actual file, even if the set of IDs is unchanged', async () => {
    const wrongId = fixtureCopy().cases[1]!;
    await expect(
      loadContent(async (path) =>
        path === 'scenarios/fixture-01-ready.json' ? wrongId : readJson(path),
      ),
    ).rejects.toThrow('file ID does not match manifest ID');
  });

  it('reports the path of unreadable or malformed JSON', async () => {
    await expect(
      loadContent(async (path) => {
        if (path === 'rules/illustrative-v1.json')
          throw new SyntaxError('bad JSON');
        return readJson(path);
      }),
    ).rejects.toThrow('rules/illustrative-v1.json: bad JSON');
  });

  it('does not follow paths from an invalid manifest', async () => {
    const manifest = fixtureCopy().manifest;
    manifest.cases[0]!.path = '../outside.json';
    const seen: string[] = [];
    await expect(
      loadContent(async (path) => {
        seen.push(path);
        return manifest;
      }),
    ).rejects.toThrow(ContentValidationError);
    expect(seen).toEqual(['manifest.json']);
  });
});
