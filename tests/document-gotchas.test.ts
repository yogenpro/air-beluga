import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { DEFAULT_DATA_ROOT } from '../scripts/lib/content';
import { validateLibraryFromDisk } from '../scripts/lib/releases';
import { dailyForDate } from '../src/content/library';
import { validateContent } from '../src/content/validate';
import {
  createStageSession,
  getPassengerView,
  reduceSession,
} from '../src/core/engine';
import type { Decision, GameSession } from '../src/core/types';

const content = validateContent(
  JSON.parse(
    await readFile(
      `${DEFAULT_DATA_ROOT}/releases/canada-documents-2026-10-26-v2/bundle.json`,
      'utf8',
    ),
  ),
);
const library = await validateLibraryFromDisk();
const ids = Array.from(
  { length: 12 },
  (_, index) => `ca-${String(index + 13).padStart(3, '0')}`,
);
const expected: Record<string, Decision> = {
  'ca-013': 'CHECK_IN',
  'ca-014': 'CHECK_IN',
  'ca-015': 'DENY',
  'ca-016': 'ESCALATE',
  'ca-017': 'ESCALATE',
  'ca-018': 'DENY',
  'ca-019': 'DENY',
  'ca-020': 'CHECK_IN',
  'ca-021': 'CHECK_IN',
  'ca-022': 'DENY',
  'ca-023': 'DENY',
  'ca-024': 'ESCALATE',
};
function one(id: string) {
  const stage = {
    ...content.stages.find((stage) => stage.id === '003-sfo-yvr-documents')!,
    caseIds: [id],
  };
  return createStageSession({ ...content, stages: [stage] }, stage.id);
}
function ask(session: GameSession, id: string) {
  return reduceSession(
    session,
    { type: 'ASK_QUESTION', questionId: id },
    content,
  );
}
function decide(session: GameSession, decision: Decision) {
  return reduceSession(session, { type: 'SUBMIT_DECISION', decision }, content)
    .results[0]!;
}

describe('document and status curveballs', () => {
  it.each(['ca-018', 'ca-021'])(
    'keeps same-booklet visa chronology consistent for %s',
    (id) => {
      const item = content.cases.find((item) => item.id === id)!;
      const identity = item.documents.find(
        (document) =>
          document.type === 'PASSPORT' || document.type === 'TRAVEL_DOCUMENT',
      )!;
      const visa = item.documents.find((document) => document.type === 'VISA')!;
      expect(visa.validFrom! >= identity.validFrom!).toBe(true);
      expect(visa.validUntil! <= identity.validUntil!).toBe(true);
    },
  );

  it('adds twelve reviewed cases and an advanced shift without rewriting old cases', async () => {
    expect(content.cases).toHaveLength(32);
    expect(
      library.index.releases.find(
        (entry) => entry.contentVersion === 'illustrative-v1',
      )!.sha256,
    ).toBe('452531c8cb3f23c1239c516d7849ca4d41d8ca811c48be374ada78282ea3ecc0');
    expect(
      library.index.releases.find(
        (entry) => entry.contentVersion === 'canada-2026-10-25-v1',
      )!.sha256,
    ).toBe('4fd7d0a040c1912f0feacd4a95815c745c6bd402ac3af1228bc1df192879e287');
    expect(
      content.cases.filter((item) => item.verificationStatus === 'VERIFIED'),
    ).toHaveLength(24);
    expect(
      content.stages.find((stage) => stage.id === '003-sfo-yvr-documents')!
        .caseIds,
    ).toEqual(ids);
    const original = JSON.parse(
      await readFile(
        `${DEFAULT_DATA_ROOT}/releases/canada-2026-10-25-v1/bundle.json`,
        'utf8',
      ),
    );
    expect(content.cases.filter((item) => !ids.includes(item.id))).toEqual(
      original.cases,
    );
    for (const id of ids) {
      const item = content.cases.find((item) => item.id === id)!;
      expect(item.travelDate).toBe('2026-10-26');
      expect(item.review?.method).toBe('OFFICIAL_SOURCE_CROSS_CHECK');
      expect(item.review?.notes).toContain('not independent human');
      const snapshot = content.ruleSnapshots.find(
        (snapshot) => snapshot.id === item.ruleSnapshotId,
      )!;
      expect(snapshot.asOfDate).toBe('2026-10-26');
      for (const rule of snapshot.rules.filter((rule) =>
        item.ruleIds.includes(rule.id),
      )) {
        expect(rule.sources.length).toBeGreaterThan(0);
        expect(
          rule.sources.every(
            (source) =>
              new URL(source.url).hostname.endsWith('canada.ca') &&
              source.verifiedDate === '2026-10-26',
          ),
        ).toBe(true);
      }
    }
  });
  it.each(Object.entries(expected))(
    'resolves %s and rejects wrong or premature dispositions',
    (id, decision) => {
      const item = content.cases.find((item) => item.id === id)!;
      let session = one(id);
      for (const question of item.resolution.paths[0]!.requiredQuestionIds) {
        expect(decide(session, decision).correct).toBe(false);
        session = ask(session, question);
      }
      expect(decide(session, decision)).toMatchObject({
        correct: true,
        score: { total: 125 },
      });
      for (const wrong of (['CHECK_IN', 'DENY', 'ESCALATE'] as const).filter(
        (value) => value !== decision,
      ))
        expect(decide(session, wrong).correct).toBe(false);
    },
  );
  it('keeps a hidden Indian Green Card undisclosed until requested', () => {
    expect(
      getPassengerView(one('ca-013'), content).documents.map(
        (document) => document.id,
      ),
    ).toEqual(['passport']);
    expect(decide(one('ca-013'), 'CHECK_IN').missingDocumentIds).toContain(
      'green-card',
    );
    const session = ask(one('ca-013'), 'ask-status');
    expect(
      getPassengerView(session, content).documents.find(
        (document) => document.id === 'green-card',
      )?.attributes.documentCode,
    ).toBe('I-551');
    expect(decide(session, 'CHECK_IN').correct).toBe(true);
  });
  it('accepts presented Chinese passport plus Green Card without requiring a Canadian visa or eTA', () => {
    expect(decide(one('ca-014'), 'CHECK_IN').correct).toBe(true);
    const checked = ask(one('ca-014'), 'check-eta');
    expect(decide(checked, 'CHECK_IN').score.efficiency).toBe(8);
  });
  it('distinguishes nonimmigrant U.S. visas from permanent-resident proof', () => {
    expect(decide(one('ca-015'), 'CHECK_IN').correct).toBe(false);
    expect(decide(ask(one('ca-015'), 'ask-visa'), 'DENY').correct).toBe(false);
    expect(
      decide(ask(ask(one('ca-015'), 'ask-status'), 'ask-visa'), 'DENY').correct,
    ).toBe(true);
  });
  it('does not grade an expired Green Card as current proof or assume status has ended', () => {
    const item = content.cases.find((item) => item.id === 'ca-016')!;
    expect(
      item.documents.find((document) => document.id === 'green-card')!
        .validUntil! < item.travelDate,
    ).toBe(true);
    expect(decide(one(item.id), 'ESCALATE').missingQuestionIds).toEqual([
      'ask-extension',
      'check-extension',
      'ask-visa',
    ]);
    expect(item.rationale).toContain('not a conclusion');
  });
  it('investigates conflicting I-571/Green Card identity while allowing a sufficient I-327', () => {
    expect(decide(one('ca-017'), 'CHECK_IN').correct).toBe(false);
    const presented = ask(one('ca-017'), 'ask-status');
    expect(decide(presented, 'ESCALATE').correct).toBe(false);
    expect(decide(ask(presented, 'check-name-link'), 'ESCALATE').correct).toBe(
      true,
    );
    expect(
      content.cases.find((item) => item.id === 'ca-020')!.documents,
    ).toHaveLength(1);
    expect(decide(one('ca-020'), 'CHECK_IN').correct).toBe(true);
  });
  it('distinguishes refugee-document identity from Canadian travel permission', () => {
    expect(decide(one('ca-018'), 'CHECK_IN').correct).toBe(false);
    expect(decide(ask(one('ca-018'), 'ask-visa'), 'DENY').correct).toBe(false);
    expect(
      decide(ask(ask(one('ca-019'), 'ask-status'), 'ask-visa'), 'DENY').correct,
    ).toBe(true);
  });
  it('uses temporary, diplomatic and official passport categories without blanket acceptance or rejection', () => {
    const temporary = content.cases.find((item) => item.id === 'ca-021')!
      .documents[0]!;
    expect(temporary.attributes).toMatchObject({
      passportKind: 'TEMPORARY',
      biometric: false,
    });
    expect(decide(one('ca-021'), 'CHECK_IN').correct).toBe(true);
    expect(decide(one('ca-022'), 'CHECK_IN').correct).toBe(false);
    expect(decide(one('ca-023'), 'CHECK_IN').correct).toBe(false);
    expect(decide(ask(one('ca-024'), 'ask-visa'), 'ESCALATE').correct).toBe(
      false,
    );
  });
  it('switches to the harder six-person daily only at the new boundary', () => {
    for (const date of ['2026-10-25', '2026-10-26'])
      expect(dailyForDate(library, date)!.selection.contentVersion).toBe(
        'canada-2026-10-25-v1',
      );
    for (let day = 27; day <= 31; day++) {
      const daily = dailyForDate(library, `2026-10-${day}`)!;
      expect(daily.selection.contentVersion).toBe(
        'canada-documents-2026-10-26-v2',
      );
      expect(daily.selection.caseIds).toHaveLength(6);
      expect(daily.selection.caseIds.every((id) => ids.includes(id))).toBe(
        true,
      );
      const cases = daily.selection.caseIds.map(
        (id) => daily.content.cases.find((item) => item.id === id)!,
      );
      expect(
        cases.filter((item) => item.difficulty === 'HARD').length,
      ).toBeGreaterThanOrEqual(3);
      expect(dailyForDate(library, `2026-10-${day}`)!.selection).toEqual(
        daily.selection,
      );
    }
  });
  it.each(['category', 'number', 'passport-kind', 'identity-path'] as const)(
    'rejects structurally incomplete travel evidence: %s',
    (change) => {
      const copy = structuredClone(content);
      const item = copy.cases.find((item) => item.id === 'ca-017')!;
      item.resolution.expectedDecision = 'CHECK_IN';
      item.documents.forEach(
        (document) => (document.holder = item.passenger.displayName),
      );
      const document = item.documents.find(
        (document) => document.id === 'travel-document',
      )!;
      if (change === 'category') delete document.attributes.category;
      if (change === 'number') delete document.attributes.number;
      if (change === 'passport-kind')
        document.attributes.passportKind = 'ORDINARY';
      if (change === 'identity-path')
        item.resolution.paths[0]!.requiredDocumentIds = ['green-card'];
      expect(() => validateContent(copy)).toThrow();
    },
  );
  it('allows complete passport-free travel-document paths', () => {
    expect(() => validateContent(content)).not.toThrow();
    for (const id of ['ca-017', 'ca-018', 'ca-020'])
      expect(
        content.cases.find((item) => item.id === id)!.resolution.paths[0]!
          .requiredDocumentIds,
      ).toContain('travel-document');
  });

  it('curates the advanced shift toward denial and escalation', () => {
    const cases = content.cases.filter((item) => ids.includes(item.id));
    const counts = Object.fromEntries(
      (['CHECK_IN', 'DENY', 'ESCALATE'] as const).map((decision) => [
        decision,
        cases.filter((item) => item.resolution.expectedDecision === decision)
          .length,
      ]),
    );
    expect(counts).toEqual({ CHECK_IN: 4, DENY: 5, ESCALATE: 3 });
    for (const item of cases.filter(
      (item) => item.resolution.expectedDecision === 'ESCALATE',
    )) {
      expect(
        item.assumptions?.some((text) =>
          text.includes('fictional carrier policy'),
        ),
      ).toBe(true);
      expect(
        item.resolution.paths[0]!.requiredQuestionIds.some(
          (id) =>
            item.questions.find((question) => question.id === id)?.kind ===
            'DOCUMENT_CHECK',
        ),
      ).toBe(true);
    }
  });

  it('keeps check-ins a minority across a year of daily selections', () => {
    const seen = new Set<string>();
    for (let day = 0; day < 366; day++) {
      const date = new Date(Date.UTC(2026, 9, 27 + day))
        .toISOString()
        .slice(0, 10);
      const daily = dailyForDate(library, date)!;
      const cases = daily.selection.caseIds.map(
        (id) => daily.content.cases.find((item) => item.id === id)!,
      );
      expect(
        cases.filter((item) => item.resolution.expectedDecision === 'CHECK_IN')
          .length,
      ).toBeLessThanOrEqual(2);
      for (const item of cases) seen.add(item.id);
    }
    expect([...seen].sort()).toEqual(
      content.dailyPools
        .find((pool) => pool.id === 'canada-documents-pool-v2')!
        .caseIds.slice()
        .sort(),
    );
  });

  it('rejects silent name mismatches in check-in and denial cases', () => {
    for (const id of ['ca-013', 'ca-015']) {
      const copy = structuredClone(content);
      copy.cases.find((item) => item.id === id)!.documents[0]!.holder =
        'Someone Else';
      expect(() => validateContent(copy)).toThrow(
        'holder does not match passenger',
      );
    }
  });

  it('does not escalate an I-571/Green Card pair once the identity link is resolved', () => {
    const copy = structuredClone(content);
    const item = copy.cases.find((item) => item.id === 'ca-017')!;
    item.documents.forEach(
      (document) => (document.holder = item.passenger.displayName),
    );
    item.resolution.expectedDecision = 'CHECK_IN';
    item.resolution.paths[0]!.requiredQuestionIds = ['ask-status'];
    const checked = validateContent(copy);
    const session = createStageSession(
      { ...checked, stages: [{ ...checked.stages[0]!, caseIds: [item.id] }] },
      checked.stages[0]!.id,
    );
    const presented = reduceSession(
      session,
      { type: 'ASK_QUESTION', questionId: 'ask-status' },
      checked,
    );
    expect(
      reduceSession(
        presented,
        { type: 'SUBMIT_DECISION', decision: 'CHECK_IN' },
        checked,
      ).results[0]!.correct,
    ).toBe(true);
  });
});
