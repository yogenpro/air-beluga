import { DateSchema } from '../content/schemas';
import { dailyPoolIssues, DIFFICULTIES } from '../content/validate';
import type { ContentBundle } from './types';

export const DAILY_ALGORITHM_VERSION = 'fnv1a32-mulberry32-v1' as const;

export interface DailySelection {
  id: string;
  utcDate: string;
  contentVersion: string;
  dailyAlgorithmVersion: typeof DAILY_ALGORITHM_VERSION;
  poolId: string;
  caseIds: string[];
}

export function utcDate(date: Date): string {
  return DateSchema.parse(date.toISOString().slice(0, 10));
}

/** FNV-1a over UTF-8 bytes, with explicit unsigned 32-bit arithmetic. */
export function fnv1a32(value: string): number {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(value)) {
    hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  }
  return hash;
}

/** Mulberry32 returns values in [0, 1); the seed is never taken from the clock. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}

export function selectDaily(
  content: ContentBundle,
  poolId: string,
  date: string,
  options: { allowIllustrative?: boolean } = {},
): DailySelection {
  DateSchema.parse(date);
  const pool = content.dailyPools.find((entry) => entry.id === poolId);
  if (!pool) throw new Error(`Unknown daily pool ${poolId}`);
  if (pool.dailyAlgorithmVersion !== DAILY_ALGORITHM_VERSION) {
    throw new Error('Unsupported daily algorithm version');
  }
  const cases = pool.caseIds.map((id) => {
    const item = content.cases.find((entry) => entry.id === id);
    if (!item) throw new Error(`Unknown daily case ${id}`);
    return item;
  });
  if (new Set(pool.caseIds).size !== pool.caseIds.length) {
    throw new Error('Duplicate daily pool cases');
  }
  if (
    !options.allowIllustrative &&
    (pool.verificationStatus !== 'VERIFIED' ||
      cases.some((item) => item.verificationStatus !== 'VERIFIED'))
  )
    throw new Error(
      'Illustrative fixtures are excluded from public daily challenges',
    );
  const issues = dailyPoolIssues(pool, cases);
  if (issues.length)
    throw new Error(`Invalid daily pool: ${issues.join('; ')}`);

  // JSON encoding makes tuple boundaries unambiguous. IDs are sorted with JS's
  // code-unit order before shuffling; locale and source file ordering never enter.
  const seed = fnv1a32(
    JSON.stringify([
      DAILY_ALGORITHM_VERSION,
      content.manifest.contentVersion,
      pool.id,
      date,
    ]),
  );
  const random = mulberry32(seed);
  const selected: typeof cases = [];
  const counts = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const byId = (a: (typeof cases)[number], b: (typeof cases)[number]) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  for (const difficulty of DIFFICULTIES) {
    const bucket = shuffle(
      cases.filter((item) => item.difficulty === difficulty).sort(byId),
      random,
    );
    const minimum = pool.difficulty[difficulty].min;
    selected.push(...bucket.slice(0, minimum));
    counts[difficulty] = minimum;
  }
  const selectedIds = new Set(selected.map((item) => item.id));
  const remaining = shuffle(
    cases.filter((item) => !selectedIds.has(item.id)).sort(byId),
    random,
  );
  for (const item of remaining) {
    if (selected.length === pool.count) break;
    if (counts[item.difficulty] < pool.difficulty[item.difficulty].max) {
      selected.push(item);
      counts[item.difficulty]++;
    }
  }
  if (selected.length !== pool.count)
    throw new Error('Daily constraints cannot be satisfied');
  return {
    id: `daily:${DAILY_ALGORITHM_VERSION}:${content.manifest.contentVersion}:${pool.id}:${date}`,
    utcDate: date,
    contentVersion: content.manifest.contentVersion,
    dailyAlgorithmVersion: DAILY_ALGORITHM_VERSION,
    poolId: pool.id,
    caseIds: shuffle(selected, random).map((item) => item.id),
  };
}
