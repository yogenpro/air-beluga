import { describe, expect, it, vi } from 'vitest';
import {
  DAILY_ALGORITHM_VERSION,
  fnv1a32,
  mulberry32,
  selectDaily,
  utcDate,
} from '../src/core/daily';
import { createDailySession } from '../src/core/engine';
import { content, fixtureCopy } from './helpers';

const poolId = 'fixture-pool-v1';
const development = { allowIllustrative: true };

describe('daily algorithm contract', () => {
  it('matches known FNV-1a and Mulberry32 vectors', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('hello')).toBe(0x4f9f2cab);
    const random = mulberry32(1);
    expect([random(), random(), random()]).toEqual([
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522,
    ]);
  });

  it('uses the UTC day across timezone offsets and midnight', () => {
    expect(utcDate(new Date('2026-10-24T23:59:59Z'))).toBe('2026-10-24');
    expect(utcDate(new Date('2026-10-24T17:00:00-07:00'))).toBe('2026-10-25');
    expect(utcDate(new Date('2026-10-25T00:00:00Z'))).toBe('2026-10-25');
  });

  it('requires explicit development opt-in for illustrative daily fixtures', () => {
    expect(() => selectDaily(content, poolId, '2026-10-24')).toThrow(
      'excluded from public',
    );
    const misleadingPool = fixtureCopy();
    misleadingPool.dailyPools[0]!.verificationStatus = 'VERIFIED';
    expect(() => selectDaily(misleadingPool, poolId, '2026-10-24')).toThrow(
      'excluded from public',
    );
  });

  it('returns identical selection without using Math.random, file order or wall clock', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Unseeded random');
    });
    try {
      const first = selectDaily(content, poolId, '2026-10-24', development);
      expect(selectDaily(content, poolId, '2026-10-24', development)).toEqual(
        first,
      );
      const reordered = fixtureCopy();
      reordered.cases.reverse();
      reordered.dailyPools[0]!.caseIds.reverse();
      expect(selectDaily(reordered, poolId, '2026-10-24', development)).toEqual(
        first,
      );
      expect(first.id).toBe(
        `daily:${DAILY_ALGORITHM_VERSION}:illustrative-v1:${poolId}:2026-10-24`,
      );
      // A selection change requires a new algorithm/content version.
      expect(first.caseIds).toEqual([
        'fixture-03-expired',
        'fixture-04-no-visa',
        'fixture-02-hidden-visa',
        'fixture-05-resident',
        'fixture-08-alternatives',
      ]);
    } finally {
      random.mockRestore();
    }
  });

  it('keeps uniqueness, pool membership and difficulty limits over a year', () => {
    const selections = new Set<string>();
    for (let day = 0; day < 366; day++) {
      const date = utcDate(new Date(Date.UTC(2026, 0, 1 + day)));
      const selected = selectDaily(content, poolId, date, development);
      expect(selected.caseIds).toHaveLength(5);
      expect(new Set(selected.caseIds).size).toBe(5);
      for (const id of selected.caseIds)
        expect(content.dailyPools[0]!.caseIds).toContain(id);
      for (const difficulty of ['EASY', 'MEDIUM', 'HARD'] as const) {
        const count = content.cases.filter(
          (item) =>
            selected.caseIds.includes(item.id) &&
            item.difficulty === difficulty,
        ).length;
        const limit = content.dailyPools[0]!.difficulty[difficulty];
        expect(count).toBeGreaterThanOrEqual(limit.min);
        expect(count).toBeLessThanOrEqual(limit.max);
      }
      selections.add(JSON.stringify(selected.caseIds));
    }
    expect(selections.size).toBeGreaterThan(10);
  });

  it('changes the challenge identity when the content version changes', () => {
    const updated = fixtureCopy();
    updated.manifest.contentVersion = 'illustrative-v2';
    const original = selectDaily(content, poolId, '2026-10-24', development);
    const next = selectDaily(updated, poolId, '2026-10-24', development);
    expect(next.id).not.toBe(original.id);
    expect(original.contentVersion).toBe('illustrative-v1');
  });

  it('fails explicitly for insufficient or invalid pools', () => {
    const copy = fixtureCopy();
    copy.dailyPools[0]!.count = 10;
    expect(() => selectDaily(copy, poolId, '2026-10-24', development)).toThrow(
      'insufficient pool size',
    );
    copy.dailyPools[0]!.count = 5;
    copy.dailyPools[0]!.difficulty.HARD = { min: 3, max: 3 };
    expect(() => selectDaily(copy, poolId, '2026-10-24', development)).toThrow(
      'insufficient HARD',
    );
    expect(() =>
      selectDaily(content, 'missing', '2026-10-24', development),
    ).toThrow('Unknown daily pool');
    expect(() =>
      selectDaily(content, poolId, '2026-02-30', development),
    ).toThrow();
  });

  it('starts a daily session carrying the frozen version identifiers', () => {
    const selected = selectDaily(content, poolId, '2026-10-24', development);
    const state = createDailySession(content, selected, development);
    expect(state.caseIds).toEqual(selected.caseIds);
    expect(state.challenge).toMatchObject({
      kind: 'DAILY',
      id: selected.id,
      utcDate: '2026-10-24',
      dailyAlgorithmVersion: DAILY_ALGORITHM_VERSION,
    });
    expect(() => createDailySession(content, selected)).toThrow(
      'excluded from public',
    );
    expect(() =>
      createDailySession(
        content,
        { ...selected, contentVersion: 'old' },
        development,
      ),
    ).toThrow('version mismatch');
    expect(() =>
      createDailySession(
        content,
        { ...selected, caseIds: [...selected.caseIds].reverse() },
        development,
      ),
    ).toThrow('does not match');
  });
});
