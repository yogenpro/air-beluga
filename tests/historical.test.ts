import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { loadContentFromDisk, DEFAULT_DATA_ROOT } from '../scripts/lib/content';
import { validateLibraryFromDisk } from '../scripts/lib/releases';
import { validateContent } from '../src/content/validate';
import { testEvidenceIssues } from '../src/content/health';
import { dailyForDate } from '../src/content/library';
import { InstantSchema, TravelDocumentSchema } from '../src/content/schemas';
import {
  createStageSession,
  getPassengerView,
  reduceSession,
} from '../src/core/engine';
import type { Decision, GameSession } from '../src/core/types';

const content = await loadContentFromDisk();
const library = await validateLibraryFromDisk();
const stageId = '004-del-yvr-2021';
const snapshot = content.ruleSnapshots.find(
  (item) => item.id === 'canada-covid-rules-2021-10-15-v1',
)!;
const requirement = snapshot.testingRequirement!;
const departure = '2021-10-15T12:00:00+05:30';
const cases = content.cases.filter(
  (item) => item.ruleSnapshotId === snapshot.id,
);
const expected: Decision[] = [
  'CHECK_IN',
  'DENY',
  'DENY',
  'DENY',
  'DENY',
  'CHECK_IN',
  'ESCALATE',
  'ESCALATE',
  'CHECK_IN',
  'DENY',
  'ESCALATE',
  'CHECK_IN',
];
function one(id: string, bundle = content) {
  const stage = {
    ...bundle.stages.find((stage) => stage.id === stageId)!,
    caseIds: [id],
  };
  return createStageSession({ ...bundle, stages: [stage] }, stageId);
}
function ask(session: GameSession, id: string, bundle = content) {
  return reduceSession(
    session,
    { type: 'ASK_QUESTION', questionId: id },
    bundle,
  );
}
function decide(session: GameSession, decision: Decision, bundle = content) {
  return reduceSession(session, { type: 'SUBMIT_DECISION', decision }, bundle)
    .results[0]!;
}
function report(id = 'hist-006') {
  return structuredClone(
    cases
      .find((item) => item.id === id)!
      .documents.find((document) => document.type === 'COVID_TEST')!,
  );
}

describe('historical COVID-era shift', () => {
  it('pins applicability and audit dates separately and preserves every prior release', async () => {
    expect(content.cases).toHaveLength(44);
    expect(cases).toHaveLength(12);
    expect(snapshot).toMatchObject({
      historical: true,
      asOfDate: '2021-10-15',
      reviewedDate: '2026-10-26',
    });
    expect(content.stages.find((stage) => stage.id === stageId)).toMatchObject({
      historical: true,
      scheduledDeparture: '2021-10-15T06:30:00Z',
    });
    const old = JSON.parse(
      await readFile(
        `${DEFAULT_DATA_ROOT}/releases/canada-documents-2026-10-26-v2/bundle.json`,
        'utf8',
      ),
    );
    expect(
      content.cases.filter((item) => !item.id.startsWith('hist-')),
    ).toEqual(old.cases);
    const oldIndex = library.index.releases.find(
      (item) => item.contentVersion === 'canada-documents-2026-10-26-v2',
    )!;
    expect(oldIndex.sha256).toBe(
      '3496c1da87e82ce082709d4a7c186824c808394a93a90f2f65ec44163ffa5ef1',
    );
    expect(library.index.dailySchedule).toEqual([
      {
        from: '2026-10-25',
        contentVersion: 'canada-2026-10-25-v1',
        poolId: 'canada-pool-v1',
      },
      {
        from: '2026-10-27',
        contentVersion: 'canada-documents-2026-10-26-v2',
        poolId: 'canada-documents-pool-v2',
      },
    ]);
    for (const date of ['2026-10-26', '2026-10-27', '2030-03-01'])
      expect(
        dailyForDate(library, date)!.selection.caseIds.every(
          (id) => !id.startsWith('hist-'),
        ),
      ).toBe(true);
  });
  it.each(cases.map((item, index) => [item.id, expected[index]!] as const))(
    'grades %s only with its required evidence',
    (id, decision) => {
      const item = cases.find((item) => item.id === id)!;
      expect(item.resolution.expectedDecision).toBe(decision);
      for (const path of item.resolution.paths) {
        let session = one(id);
        for (const q of path.requiredQuestionIds) {
          expect(decide(session, decision).correct).toBe(false);
          session = ask(session, q);
        }
        expect(decide(session, decision)).toMatchObject({
          correct: true,
          score: { total: 125 },
        });
        for (const wrong of (['CHECK_IN', 'DENY', 'ESCALATE'] as const).filter(
          (value) => value !== decision,
        ))
          expect(decide(session, wrong).correct).toBe(false);
      }
    },
  );
  it('has a deny/escalate majority with four positive counterexamples', () => {
    expect(
      cases.filter((item) => item.resolution.expectedDecision === 'CHECK_IN'),
    ).toHaveLength(4);
    expect(
      cases.filter((item) => item.resolution.expectedDecision === 'DENY'),
    ).toHaveLength(5);
    expect(
      cases.filter((item) => item.resolution.expectedDecision === 'ESCALATE'),
    ).toHaveLength(3);
    for (const item of cases.filter(
      (item) => item.resolution.expectedDecision === 'ESCALATE',
    ))
      expect(
        item.resolution.paths[0]!.requiredQuestionIds.some(
          (id) =>
            item.questions.find((q) => q.id === id)?.kind === 'DOCUMENT_CHECK',
        ),
      ).toBe(true);
  });
  it('accepts the exact 18-hour boundary and equivalent UTC offsets', () => {
    const document = report();
    expect(testEvidenceIssues(document, departure, requirement)).toEqual([]);
    document.attributes.covidTest!.sampleCollectedAt = '2021-10-14T12:30:00Z';
    expect(testEvidenceIssues(document, departure, requirement)).toEqual([]);
    document.attributes.covidTest!.sampleCollectedAt = '2021-10-14T12:29:00Z';
    expect(testEvidenceIssues(document, departure, requirement)).toContain(
      'sample is outside the pre-departure window',
    );
  });
  it('uses sampling time rather than a recent report issue time', () => {
    const document = report('hist-005');
    expect(
      Date.parse(departure) -
        Date.parse(document.attributes.covidTest!.reportedAt),
    ).toBe(3 * 3_600_000);
    expect(testEvidenceIssues(document, departure, requirement)).toContain(
      'sample is outside the pre-departure window',
    );
  });
  it('cannot treat an ambiguous printed time as a guessed UTC instant', () => {
    const document = report('hist-007');
    expect(document.attributes.covidTest!.sampleCollectedAt).toBeUndefined();
    expect(testEvidenceIssues(document, departure, requirement)).toContain(
      'collection time and scheduled departure need explicit offsets',
    );
    for (const value of ['2021-10-14T13:00:00', '2021-02-30T12:00:00Z'])
      expect(InstantSchema.safeParse(value).success).toBe(false);
  });
  it.each([
    'method',
    'provider',
    'unresolved-provider',
    'positive',
    'future-collection',
    'late-result',
  ] as const)('rejects insufficient check-in health evidence: %s', (change) => {
    const copy = structuredClone(content);
    const item = copy.cases.find((item) => item.id === 'hist-006')!;
    const document = item.documents.find(
      (document) => document.type === 'COVID_TEST',
    )!;
    const test = document.attributes.covidTest!;
    if (change === 'method') test.testType = 'ANTIGEN';
    if (change === 'provider') test.laboratory = 'Other accredited clinic';
    if (change === 'unresolved-provider')
      test.laboratoryIdentity = 'UNRESOLVED';
    if (change === 'positive') test.result = 'POSITIVE';
    if (change === 'future-collection') {
      test.sampleCollectedAt = '2021-10-15T13:00:00+05:30';
      test.reportedAt = '2021-10-15T14:00:00+05:30';
    }
    if (change === 'late-result') test.reportedAt = '2021-10-15T13:00:00+05:30';
    expect(() => validateContent(copy)).toThrow();
  });
  it('requires a health report in the sufficient path and rejects made-up report validity dates', () => {
    const copy = structuredClone(content);
    copy.cases.find(
      (item) => item.id === 'hist-001',
    )!.resolution.paths[0]!.requiredDocumentIds = ['passport'];
    expect(() => validateContent(copy)).toThrow(
      'check-in needs a sufficient test',
    );
    expect(
      TravelDocumentSchema.safeParse({ ...report(), validUntil: '2021-10-15' })
        .success,
    ).toBe(false);
  });
  it('keeps replacement evidence hidden and prevents premature refusal', () => {
    const session = one('hist-009');
    expect(
      getPassengerView(session, content).documents.map(
        (document) => document.id,
      ),
    ).toEqual(['passport', 'test']);
    expect(decide(session, 'DENY').correct).toBe(false);
    expect(decide(session, 'CHECK_IN').missingDocumentIds).toContain(
      'replacement-test',
    );
    expect(decide(ask(session, 'ask-replacement'), 'CHECK_IN').correct).toBe(
      true,
    );
  });
  it.each([
    'rules-date',
    'unlabeled-stage',
    'flight-clock',
    'missing-review-date',
    'future-source-review',
  ] as const)('rejects mixed temporal context: %s', (change) => {
    const copy = structuredClone(content);
    const rules = copy.ruleSnapshots.find((item) => item.id === snapshot.id)!;
    const stage = copy.stages.find((item) => item.id === stageId)!;
    if (change === 'rules-date')
      copy.cases.find((item) => item.id === 'hist-001')!.travelDate =
        '2021-10-16';
    if (change === 'unlabeled-stage') delete stage.historical;
    if (change === 'flight-clock')
      copy.cases.find(
        (item) => item.id === 'hist-001',
      )!.itinerary[0]!.scheduledDeparture = '2021-10-15T13:00:00+05:30';
    if (change === 'missing-review-date') delete rules.reviewedDate;
    if (change === 'future-source-review')
      rules.rules[0]!.sources[0]!.verifiedDate = '2026-10-27';
    expect(() => validateContent(copy)).toThrow();
  });
  it('grades the historical shift independently of the current wall clock', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2040-05-20T00:00:00Z'));
    try {
      const session = one('hist-006');
      expect(decide(session, 'CHECK_IN').correct).toBe(true);
      expect(getPassengerView(session, content)).toMatchObject({
        historical: true,
        rulesDate: '2021-10-15',
        travelDate: '2021-10-15',
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
