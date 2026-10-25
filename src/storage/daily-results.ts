import { z } from 'zod';
import { GameSessionSchema } from '../content/schemas';
import type { ContentLibrary } from '../content/library';
import { createDailySession } from '../core/engine';
import { selectDaily } from '../core/daily';
import type { GameSession } from '../core/types';
import { replaySession, type ProgressStorage } from './progress';

export const DAILY_RESULTS_KEY = 'air-beluga:daily-results:v1';
const DailyResultSchema = z
  .object({
    completedAt: z.iso.datetime(),
    session: GameSessionSchema,
  })
  .strict()
  .refine(
    (entry) =>
      entry.session.challenge.kind === 'DAILY' &&
      entry.session.status === 'COMPLETED',
    'Daily results must be completed daily sessions',
  );
const HistorySchema = z
  .object({ storageVersion: z.literal(1), entries: z.array(DailyResultSchema) })
  .strict()
  .refine(
    (history) =>
      new Set(history.entries.map((entry) => entry.session.challenge.id))
        .size === history.entries.length,
    'Duplicate daily results',
  );
export type DailyResult = z.infer<typeof DailyResultSchema>;
export type DailyHistory = {
  status: 'READY' | 'UNAVAILABLE' | 'INVALID';
  entries: DailyResult[];
};

export function readDailyResults(
  storage: ProgressStorage | null,
): DailyHistory {
  if (!storage) return { status: 'UNAVAILABLE', entries: [] };
  try {
    const raw = storage.getItem(DAILY_RESULTS_KEY);
    if (raw === null) return { status: 'READY', entries: [] };
    const parsed = HistorySchema.safeParse(JSON.parse(raw));
    return parsed.success
      ? { status: 'READY', entries: parsed.data.entries }
      : { status: 'INVALID', entries: [] };
  } catch {
    return { status: 'UNAVAILABLE', entries: [] };
  }
}

/** Keep the first completion of each versioned challenge, including after replay. */
export function recordDailyResult(
  storage: ProgressStorage | null,
  session: GameSession,
  completedAt: string,
): 'SAVED' | 'ALREADY_SAVED' | 'UNAVAILABLE' | 'INVALID' {
  if (!storage) return 'UNAVAILABLE';
  const history = readDailyResults(storage);
  if (history.status !== 'READY') return history.status;
  const result = DailyResultSchema.safeParse({ session, completedAt });
  if (!result.success) return 'INVALID';
  if (
    history.entries.some(
      (entry) => entry.session.challenge.id === session.challenge.id,
    )
  )
    return 'ALREADY_SAVED';
  try {
    storage.setItem(
      DAILY_RESULTS_KEY,
      JSON.stringify({
        storageVersion: 1,
        entries: [...history.entries, result.data],
      }),
    );
    return 'SAVED';
  } catch {
    return 'UNAVAILABLE';
  }
}

export function reviewDailyResult(
  library: ContentLibrary,
  result: DailyResult,
) {
  const content = library.versions[result.session.contentVersion];
  if (!content) return { status: 'UNAVAILABLE' as const };
  const challenge = result.session.challenge;
  if (challenge.kind !== 'DAILY') return { status: 'INVALID' as const };
  try {
    const selection = selectDaily(content, challenge.poolId, challenge.utcDate);
    const session = replaySession(
      result.session,
      content,
      createDailySession(content, selection),
    );
    return { status: 'VALID' as const, content, session };
  } catch {
    return { status: 'INVALID' as const };
  }
}
