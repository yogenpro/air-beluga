import { mkdtemp, readFile, rm, writeFile, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContentFromDisk, DEFAULT_DATA_ROOT } from '../scripts/lib/content';
import {
  freezeRelease,
  validateLibraryFromDisk,
} from '../scripts/lib/releases';
import {
  dailyForDate,
  loadLibrary,
  ReleaseIndexSchema,
} from '../src/content/library';
import { validateContent } from '../src/content/validate';
import {
  createDailySession,
  createStageSession,
  getPassengerView,
  reduceSession,
} from '../src/core/engine';
import { selectDaily } from '../src/core/daily';
import type { ContentBundle, Decision, GameSession } from '../src/core/types';
import {
  recordDailyResult,
  readDailyResults,
  reviewDailyResult,
  DAILY_RESULTS_KEY,
} from '../src/storage/daily-results';
import { restoreSessionProgress, saveProgress } from '../src/storage/progress';

const current = await loadContentFromDisk();
const library = await validateLibraryFromDisk();
const date = '2026-10-25';
const poolId = 'canada-pool-v1';
const expected: Record<string, Decision> = {
  'ca-001': 'CHECK_IN',
  'ca-002': 'CHECK_IN',
  'ca-003': 'CHECK_IN',
  'ca-004': 'DENY',
  'ca-005': 'CHECK_IN',
  'ca-006': 'CHECK_IN',
  'ca-007': 'DENY',
  'ca-008': 'DENY',
  'ca-009': 'CHECK_IN',
  'ca-010': 'CHECK_IN',
  'ca-011': 'CHECK_IN',
  'ca-012': 'CHECK_IN',
};
class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}
function oneCase(id: string) {
  const stage = {
    ...current.stages.find((item) => item.id === '002-sfo-yvr')!,
    caseIds: [id],
  };
  return createStageSession({ ...current, stages: [stage] }, stage.id);
}
function solve(session: GameSession, content: ContentBundle = current) {
  while (session.status !== 'COMPLETED') {
    const item = content.cases.find(
      (entry) => entry.id === session.caseIds[session.passengerIndex],
    )!;
    for (const questionId of item.resolution.paths[0]!.requiredQuestionIds)
      session = reduceSession(
        session,
        { type: 'ASK_QUESTION', questionId },
        content,
      );
    session = reduceSession(
      session,
      { type: 'SUBMIT_DECISION', decision: expected[item.id]! },
      content,
    );
    session = reduceSession(session, { type: 'NEXT_PASSENGER' }, content);
  }
  return session;
}

describe('source-reviewed Canadian content', () => {
  it('ships 12 reviewed cases, explicit scope and assumptions, and an eight-person stage', () => {
    expect(current.cases).toHaveLength(20);
    const reviewed = current.cases.filter(
      (item) => item.verificationStatus === 'VERIFIED',
    );
    expect(reviewed).toHaveLength(12);
    expect(
      current.stages.find((item) => item.id === '002-sfo-yvr')!.caseIds,
    ).toHaveLength(8);
    for (const item of reviewed) {
      expect(item.review?.method).toBe('OFFICIAL_SOURCE_CROSS_CHECK');
      expect(item.review?.notes).toContain('not independent human');
      expect(item.assumptions!.length).toBeGreaterThan(0);
      expect(item.travelDate).toBe(date);
      const snapshot = current.ruleSnapshots.find(
        (entry) => entry.id === item.ruleSnapshotId,
      )!;
      for (const rule of snapshot.rules.filter((rule) =>
        item.ruleIds.includes(rule.id),
      )) {
        expect(rule.sources.length).toBeGreaterThan(0);
        expect(
          rule.sources.every((source) =>
            new URL(source.url).hostname.endsWith('canada.ca'),
          ),
        ).toBe(true);
        expect(
          rule.sources.every((source) => source.verifiedDate === date),
        ).toBe(true);
      }
    }
  });

  it.each(Object.entries(expected))(
    'resolves %s with the reviewed disposition %s',
    (id, decision) => {
      let session = oneCase(id);
      const item = current.cases.find((entry) => entry.id === id)!;
      if (item.resolution.paths[0]!.requiredQuestionIds.length) {
        const early = reduceSession(
          session,
          { type: 'SUBMIT_DECISION', decision },
          current,
        );
        expect(early.results[0]!.correct).toBe(false);
      }
      for (const questionId of item.resolution.paths[0]!.requiredQuestionIds)
        session = reduceSession(
          session,
          { type: 'ASK_QUESTION', questionId },
          current,
        );
      for (const wrong of (['CHECK_IN', 'DENY', 'ESCALATE'] as const).filter(
        (value) => value !== decision,
      )) {
        expect(
          reduceSession(
            session,
            { type: 'SUBMIT_DECISION', decision: wrong },
            current,
          ).results[0]!.correct,
        ).toBe(false);
      }
      const resolved = reduceSession(
        session,
        { type: 'SUBMIT_DECISION', decision },
        current,
      );
      expect(resolved.results[0]!.correct).toBe(true);
      expect(resolved.totalScore).toBe(125);
    },
  );

  it('distinguishes the US-only student return from the trip that also included Japan', () => {
    expect(
      current.cases.find((item) => item.id === 'ca-008')!.resolution
        .expectedDecision,
    ).toBe('DENY');
    expect(
      current.cases.find((item) => item.id === 'ca-012')!.resolution
        .expectedDecision,
    ).toBe('CHECK_IN');
    for (const id of ['ca-008', 'ca-012']) {
      const item = current.cases.find((entry) => entry.id === id)!;
      expect(
        item.documents.find((document) => document.id === 'visa')!.validUntil <
          item.travelDate,
      ).toBe(true);
    }
    expect(() => validateContent(current)).not.toThrow();
  });

  it('uses a simulated carrier lookup rather than asking for an eTA printout', () => {
    const view = getPassengerView(oneCase('ca-003'), current);
    expect(view.questions[0]).toMatchObject({ kind: 'DOCUMENT_CHECK' });
    expect(view.documents.map((document) => document.type)).toEqual([
      'PASSPORT',
    ]);
    const checked = reduceSession(
      oneCase('ca-003'),
      { type: 'ASK_QUESTION', questionId: 'check-eta' },
      current,
    );
    const record = getPassengerView(checked, current).documents.find(
      (document) => document.id === 'eta-record',
    )!;
    expect(record.attributes.linkedPassportNumber).toBe('FR-SYNTHETIC-003');
  });

  it.each([
    'passport-link',
    'status',
    'expiry',
    'review',
    'assumptions',
  ] as const)('rejects incomplete verified evidence: %s', (change) => {
    const copy = structuredClone(current);
    const item = copy.cases.find((entry) => entry.id === 'ca-002')!;
    const record = item.documents.find(
      (document) => document.id === 'eta-record',
    )!;
    if (change === 'passport-link')
      record.attributes.linkedPassportNumber = 'other-passport';
    if (change === 'status') record.attributes.status = 'PENDING';
    if (change === 'expiry') record.validUntil = '2034-01-01';
    if (change === 'review') delete item.review!.method;
    if (change === 'assumptions') delete item.assumptions;
    expect(() => validateContent(copy)).toThrow();
  });
});

describe('daily release boundaries and immutable history', () => {
  const selected = selectDaily(current, poolId, date);
  const completed = solve(createDailySession(current, selected));

  it('matches across independent clients and excludes all illustrative cases', () => {
    const reordered = structuredClone(current);
    reordered.cases.reverse();
    reordered.dailyPools.find((pool) => pool.id === poolId)!.caseIds.reverse();
    expect(selectDaily(reordered, poolId, date)).toEqual(selected);
    expect(selected.caseIds).toHaveLength(6);
    expect(selected.caseIds.every((id) => id.startsWith('ca-'))).toBe(true);
    expect(new Set(selected.caseIds).size).toBe(6);
    expect(dailyForDate(library, '2026-10-24')).toBeNull();
  });

  it('resumes partial daily evidence and completed feedback using a separate daily key', () => {
    const storage = new MemoryStorage();
    const initial = createDailySession(current, selected);
    let session = initial;
    for (const question of current.cases.find(
      (item) => item.id === session.caseIds[0],
    )!.resolution.paths[0]!.requiredQuestionIds) {
      session = reduceSession(
        session,
        { type: 'ASK_QUESTION', questionId: question },
        current,
      );
    }
    saveProgress(storage, session);
    expect(restoreSessionProgress(storage, current, initial)).toEqual({
      status: 'RESTORED',
      session,
    });
    saveProgress(storage, completed);
    expect(restoreSessionProgress(storage, current, initial).session).toEqual(
      completed,
    );
  });

  it('keeps first results, algorithm versions and original timestamps across replay', () => {
    const storage = new MemoryStorage();
    expect(recordDailyResult(storage, completed, '2026-10-25T20:00:00Z')).toBe(
      'SAVED',
    );
    const original = storage.getItem(DAILY_RESULTS_KEY);
    expect(recordDailyResult(storage, completed, '2026-10-26T00:00:00Z')).toBe(
      'ALREADY_SAVED',
    );
    expect(storage.getItem(DAILY_RESULTS_KEY)).toBe(original);
    const result = readDailyResults(storage).entries[0]!;
    expect(result.session.contentVersion).toBe('canada-2026-10-25-v1');
    expect(result.session.challenge).toMatchObject({
      dailyAlgorithmVersion: 'fnv1a32-mulberry32-v1',
    });
    expect(reviewDailyResult(library, result).status).toBe('VALID');
  });

  it('preserves old daily selection and scores after a later content/scoring release', () => {
    const next = structuredClone(library);
    const newer = structuredClone(current);
    newer.manifest.contentVersion = 'canada-v2-test';
    newer.manifest.scoring.correctDecision = 999;
    next.current = newer;
    next.versions[newer.manifest.contentVersion] = newer;
    next.index.currentContentVersion = newer.manifest.contentVersion;
    next.index.releases.push({
      contentVersion: newer.manifest.contentVersion,
      path: 'releases/canada-v2-test/bundle.json',
      sha256: 'a'.repeat(64),
    });
    next.index.dailySchedule.push({
      from: '2026-10-26',
      contentVersion: newer.manifest.contentVersion,
      poolId,
    });
    expect(dailyForDate(next, date)!.selection).toEqual(selected);
    expect(
      dailyForDate(next, '2026-10-26')!.content.manifest.contentVersion,
    ).toBe(newer.manifest.contentVersion);
    const storage = new MemoryStorage();
    recordDailyResult(storage, completed, '2026-10-25T20:00:00Z');
    const reviewed = reviewDailyResult(
      next,
      readDailyResults(storage).entries[0]!,
    );
    expect(reviewed.status).toBe('VALID');
    if (reviewed.status === 'VALID')
      expect(reviewed.session.totalScore).toBe(750);
  });

  it('keeps records when the matching archive is missing, but rejects inconsistent saved scores', () => {
    const storage = new MemoryStorage();
    recordDailyResult(storage, completed, '2026-10-25T20:00:00Z');
    const result = readDailyResults(storage).entries[0]!;
    expect(reviewDailyResult({ ...library, versions: {} }, result).status).toBe(
      'UNAVAILABLE',
    );
    result.session.totalScore = 9000;
    expect(reviewDailyResult(library, result).status).toBe('INVALID');
    expect(readDailyResults(storage).entries).toHaveLength(1);
  });

  it('does not overwrite unreadable or future history records', () => {
    const storage = new MemoryStorage();
    for (const raw of ['{bad-json', '{"storageVersion":99,"entries":[]}']) {
      storage.setItem(DAILY_RESULTS_KEY, raw);
      expect(
        recordDailyResult(storage, completed, '2026-10-25T20:00:00Z'),
      ).not.toBe('SAVED');
      expect(storage.getItem(DAILY_RESULTS_KEY)).toBe(raw);
    }
    expect(recordDailyResult(null, completed, '2026-10-25T20:00:00Z')).toBe(
      'UNAVAILABLE',
    );
  });
});

describe('frozen release integrity', () => {
  it('refuses to overwrite an existing version with changed content', async () => {
    const root = await mkdtemp(join(tmpdir(), 'air-beluga-freeze-'));
    try {
      const first = await freezeRelease(current, root);
      expect(await freezeRelease(current, root)).toEqual(first);
      const changed = structuredClone(current);
      changed.manifest.scoring.correctDecision++;
      await expect(freezeRelease(changed, root)).rejects.toThrow(
        'cannot be overwritten',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('detects changes to an archived bundle even when its JSON still validates', async () => {
    const root = await mkdtemp(join(tmpdir(), 'air-beluga-release-'));
    try {
      await cp(DEFAULT_DATA_ROOT, root, { recursive: true });
      const target = join(root, 'releases/illustrative-v1/bundle.json');
      const archive = JSON.parse(
        await readFile(target, 'utf8'),
      ) as ContentBundle;
      archive.cases[0]!.version++;
      await writeFile(target, JSON.stringify(archive));
      await expect(validateLibraryFromDisk(root)).rejects.toThrow(
        'hash mismatch',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('allows current play to load if an old archive is unavailable and retains its missing version identity', async () => {
    const loaded = await loadLibrary(async (path) => {
      if (path === 'releases/illustrative-v1/bundle.json')
        throw new Error('Unavailable');
      return JSON.parse(
        await readFile(join(DEFAULT_DATA_ROOT, path), 'utf8'),
      ) as unknown;
    });
    expect(loaded.current.manifest.contentVersion).toBe(
      current.manifest.contentVersion,
    );
    expect(loaded.unavailableVersions).toEqual(['illustrative-v1']);
  });

  it('rejects duplicate or retrograde publication boundaries', () => {
    const index = structuredClone(library.index);
    index.dailySchedule.push({ ...index.dailySchedule[0]! });
    expect(ReleaseIndexSchema.safeParse(index).success).toBe(false);
  });
});
