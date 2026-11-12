import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_DATA_ROOT, loadContentFromDisk } from '../scripts/lib/content';
import { validateLibraryFromDisk } from '../scripts/lib/releases';
import {
  dailyForDate,
  loadLibrary,
  ReleaseIndexSchema,
} from '../src/content/library';
import { validateContent } from '../src/content/validate';
import { selectDaily, utcDate } from '../src/core/daily';
import {
  createDailySession,
  createStageSession,
  getPassengerView,
  reduceSession,
} from '../src/core/engine';
import type { Decision } from '../src/core/types';

const content = await loadContentFromDisk();
const library = await validateLibraryFromDisk();
const stages = content.stages.filter((stage) => stage.network);
const cases = content.cases.filter((item) => /^(ana|cx|sq)-/.test(item.id));
const outcomes: Record<string, Decision[]> = {
  ana: [
    'CHECK_IN',
    'DENY',
    'DENY',
    'CHECK_IN',
    'DENY',
    'ESCALATE',
    'ESCALATE',
    'ESCALATE',
  ],
  cx: [
    'CHECK_IN',
    'DENY',
    'DENY',
    'CHECK_IN',
    'DENY',
    'ESCALATE',
    'ESCALATE',
    'ESCALATE',
  ],
  sq: [
    'CHECK_IN',
    'DENY',
    'DENY',
    'CHECK_IN',
    'DENY',
    'ESCALATE',
    'ESCALATE',
    'ESCALATE',
  ],
};
function one(id: string) {
  const stage = stages.find((item) => item.caseIds.includes(id))!;
  return createStageSession(
    { ...content, stages: [{ ...stage, caseIds: [id] }] },
    stage.id,
  );
}

describe('real airline network shifts', () => {
  it('adds three networks and distinct bases without changing any previous content', async () => {
    expect(cases).toHaveLength(24);
    expect(
      stages.map((item) => [item.departureAirport, item.network!.modeledOn]),
    ).toEqual([
      ['SFO', 'ANA'],
      ['LAX', 'Cathay Pacific'],
      ['LHR', 'Singapore Airlines'],
    ]);
    const previous = JSON.parse(
      await readFile(
        `${DEFAULT_DATA_ROOT}/releases/historical-covid-2026-10-26-v3/bundle.json`,
        'utf8',
      ),
    );
    expect(content.cases.filter((item) => !cases.includes(item))).toEqual(
      previous.cases,
    );
    expect(content.stages.filter((item) => !item.network)).toEqual(
      previous.stages,
    );
    expect(content.ruleSnapshots.slice(0, -1)).toEqual(previous.ruleSnapshots);
    for (const stage of stages) {
      expect(stage.caseIds).toHaveLength(8);
      expect(
        stage.network!.sources.every(
          (source) => source.verifiedDate === '2026-11-03',
        ),
      ).toBe(true);
      const queue = cases.filter((item) => stage.caseIds.includes(item.id));
      expect(
        new Set(queue.map((item) => item.itinerary.at(-1)!.to)).size,
      ).toBeGreaterThan(1);
      expect(
        queue.filter((item) => item.resolution.expectedDecision === 'CHECK_IN'),
      ).toHaveLength(2);
      expect(
        queue.filter((item) => item.resolution.expectedDecision === 'DENY'),
      ).toHaveLength(3);
      expect(
        queue.filter((item) => item.resolution.expectedDecision === 'ESCALATE'),
      ).toHaveLength(3);
    }
  });

  it.each(
    cases.map(
      (item) =>
        [
          item.id,
          outcomes[item.id.split('-')[0]!]![Number(item.id.split('-')[1]) - 1]!,
        ] as const,
    ),
  )(
    'requires complete evidence and rejects wrong decisions for %s',
    (id, expected) => {
      const item = cases.find((item) => item.id === id)!;
      expect(item.resolution.expectedDecision).toBe(expected);
      for (const path of item.resolution.paths) {
        let session = one(id);
        for (const questionId of path.requiredQuestionIds) {
          const premature = reduceSession(
            session,
            { type: 'SUBMIT_DECISION', decision: expected },
            content,
          );
          expect(premature.results[0]!.correct).toBe(false);
          session = reduceSession(
            session,
            { type: 'ASK_QUESTION', questionId },
            content,
          );
        }
        expect(
          reduceSession(
            session,
            { type: 'SUBMIT_DECISION', decision: expected },
            content,
          ).results[0],
        ).toMatchObject({ correct: true, score: { total: 125 } });
        for (const decision of ['CHECK_IN', 'DENY', 'ESCALATE'] as const) {
          if (decision !== expected)
            expect(
              reduceSession(
                session,
                { type: 'SUBMIT_DECISION', decision },
                content,
              ).results[0]!.correct,
            ).toBe(false);
        }
      }
    },
  );

  it('exposes the ground transfer and obtains a live eVISA instead of relying on a screenshot', () => {
    const route = getPassengerView(one('ana-003'), content).itinerary;
    expect(route.map((leg) => [leg.from, leg.to])).toEqual([
      ['SFO', 'NRT'],
      ['NRT', 'HND'],
      ['HND', 'SIN'],
    ]);
    expect(route[1]).toMatchObject({
      transportMode: 'GROUND',
      transit: 'LANDSIDE',
    });
    expect(
      getPassengerView(one('ana-004'), content).documents.map(
        (item) => item.id,
      ),
    ).toEqual(['passport']);
    const checked = reduceSession(
      one('ana-004'),
      { type: 'ASK_QUESTION', questionId: 'display-live' },
      content,
    );
    expect(
      getPassengerView(checked, content).documents.map((item) => item.id),
    ).toContain('jp-evisa');
    for (const item of cases.filter(
      (item) => item.resolution.expectedDecision === 'ESCALATE',
    )) {
      expect(item.questions.some((q) => q.kind === 'DOCUMENT_CHECK')).toBe(
        true,
      );
      expect(
        item.assumptions!.some((text) =>
          text.includes('fictional carrier policy'),
        ),
      ).toBe(true);
    }
  });

  it('validates pool/stage membership and rule jurisdiction', () => {
    for (const change of [
      'missing-stage',
      'wrong-stage',
      'wrong-jurisdiction',
    ] as const) {
      const copy = structuredClone(content);
      const pool = copy.dailyPools.find(
        (pool) => pool.id === 'ana-network-pool-v1',
      )!;
      if (change === 'missing-stage') pool.stageId = 'unknown-stage';
      if (change === 'wrong-stage') pool.stageId = '006-lax-hong-kong-network';
      if (change === 'wrong-jurisdiction')
        copy.ruleSnapshots
          .at(-1)!
          .rules.find(
            (rule) => rule.id === 'net-jp-entry',
          )!.jurisdictionCountry = 'CA';
      expect(() => validateContent(copy)).toThrow();
    }
  });
});

describe('frozen UTC network rotation', () => {
  it('keeps every prior daily pinned through the new boundary', () => {
    const previous = library.versions['canada-documents-2026-10-26-v2']!;
    for (let day = 27; day <= 34; day++) {
      const date = utcDate(new Date(Date.UTC(2026, 9, day)));
      expect(dailyForDate(library, date)!.selection).toEqual(
        selectDaily(previous, 'canada-documents-pool-v2', date),
      );
    }
    expect(dailyForDate(library, '2026-11-04')!.selection.poolId).toBe(
      'ana-network-pool-v1',
    );
    expect(dailyForDate(library, '2026-11-05')!.selection.poolId).toBe(
      'cx-network-pool-v1',
    );
    expect(dailyForDate(library, '2026-11-06')!.selection.poolId).toBe(
      'sq-network-pool-v1',
    );
    expect(dailyForDate(library, '2026-11-07')!.selection.poolId).toBe(
      'ana-network-pool-v1',
    );
    expect(utcDate(new Date('2026-11-03T16:00:00-08:00'))).toBe('2026-11-04');
  });

  it('rotates bases fairly over 366 UTC days with varied, balanced queues', () => {
    const seen = new Set<string>();
    const subsets = new Map<string, Set<string>>();
    const counts = new Map<string, number>();
    let lastBase = '';
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Unseeded random');
    });
    try {
      for (let day = 0; day < 366; day++) {
        const date = utcDate(new Date(Date.UTC(2026, 10, 4 + day)));
        const daily = dailyForDate(library, date)!;
        const pool = content.dailyPools.find(
          (pool) => pool.id === daily.selection.poolId,
        )!;
        const stage = stages.find((stage) => stage.id === pool.stageId)!;
        const selected = daily.selection.caseIds.map(
          (id) => cases.find((item) => item.id === id)!,
        );
        expect(selected).toHaveLength(6);
        expect(new Set(selected.map((item) => item.id)).size).toBe(6);
        expect(
          selected.every(
            (item) =>
              stage.caseIds.includes(item.id) &&
              item.itinerary[0]!.from === stage.departureAirport,
          ),
        ).toBe(true);
        const positive = selected.filter(
          (item) => item.resolution.expectedDecision === 'CHECK_IN',
        ).length;
        expect(positive).toBeGreaterThanOrEqual(1);
        expect(positive).toBeLessThanOrEqual(2);
        expect(
          selected.filter(
            (item) => item.resolution.expectedDecision === 'DENY',
          ),
        ).toHaveLength(2);
        expect(stage.departureAirport).not.toBe(lastBase);
        lastBase = stage.departureAirport;
        expect(dailyForDate(library, date)!.selection).toEqual(daily.selection);
        expect(
          createDailySession(daily.content, daily.selection).caseIds,
        ).toEqual(daily.selection.caseIds);
        counts.set(
          stage.departureAirport,
          (counts.get(stage.departureAirport) ?? 0) + 1,
        );
        const variants = subsets.get(pool.id) ?? new Set<string>();
        variants.add([...daily.selection.caseIds].sort().join(','));
        subsets.set(pool.id, variants);
        selected.forEach((item) => seen.add(item.id));
      }
    } finally {
      random.mockRestore();
    }
    expect([...counts.values()]).toEqual([122, 122, 122]);
    expect(seen.size).toBe(24);
    expect([...subsets.values()].every((values) => values.size >= 10)).toBe(
      true,
    );
  });

  it.each([
    { poolIds: [] },
    { poolIds: ['ana-network-pool-v1'] },
    { poolIds: ['ana-network-pool-v1', 'ana-network-pool-v1'] },
  ])('rejects invalid rotations $poolIds', ({ poolIds }) => {
    const index = structuredClone(library.index);
    index.dailySchedule[index.dailySchedule.length - 1] = {
      from: '2026-11-04',
      contentVersion: content.manifest.contentVersion,
      poolIds,
    };
    expect(() => ReleaseIndexSchema.parse(index)).toThrow();
  });

  it('checks every rotation member, including a pool that is not selected on the boundary', async () => {
    for (const poolId of ['missing-pool', 'fixture-pool-v1']) {
      const index = structuredClone(library.index);
      index.dailySchedule[index.dailySchedule.length - 1] = {
        from: '2026-11-04',
        contentVersion: content.manifest.contentVersion,
        poolIds: ['ana-network-pool-v1', poolId],
      };
      await expect(
        loadLibrary(async (path) =>
          path === 'releases.json'
            ? index
            : JSON.parse(
                await readFile(`${DEFAULT_DATA_ROOT}/${path}`, 'utf8'),
              ),
        ),
      ).rejects.toThrow();
    }
  });
});
