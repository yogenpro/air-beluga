import { z } from 'zod';
import { GameSessionSchema } from '../content/schemas';
import { createStageSession, reduceSession } from '../core/engine';
import type { ContentBundle, GameSession } from '../core/types';

export interface ProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const RecordSchema = z
  .object({
    storageVersion: z.literal(1),
    session: GameSessionSchema,
  })
  .strict();

export function progressKey(stageId: string) {
  return `air-beluga:progress:${stageId}`;
}

export function sessionProgressKey(session: GameSession) {
  return session.challenge.kind === 'STAGE'
    ? progressKey(session.challenge.id)
    : `air-beluga:daily-progress:${session.challenge.id}`;
}

export type RestoreResult =
  | { status: 'RESTORED'; session: GameSession }
  | {
      status: 'EMPTY' | 'INVALID' | 'INCOMPATIBLE' | 'UNAVAILABLE';
      session: null;
    };

export function browserStorage(): ProgressStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Replay authored actions instead of trusting saved scores or evidence IDs. */
export function replaySession(
  saved: GameSession,
  content: ContentBundle,
  initialSession: GameSession,
) {
  saved = GameSessionSchema.parse(saved);
  let replayed = initialSession;
  if (
    saved.contentVersion !== content.manifest.contentVersion ||
    JSON.stringify(saved.challenge) !==
      JSON.stringify(initialSession.challenge) ||
    JSON.stringify(saved.caseIds) !== JSON.stringify(replayed.caseIds)
  )
    throw new Error('Saved stage does not match content');

  const observe = () => {
    for (const documentId of saved.inspectedDocumentIds) {
      replayed = reduceSession(
        replayed,
        { type: 'INSPECT_DOCUMENT', documentId },
        content,
      );
    }
    for (const ruleId of saved.openedRuleIds) {
      replayed = reduceSession(
        replayed,
        { type: 'OPEN_RULE', ruleId },
        content,
      );
    }
  };
  for (const [index, result] of saved.results.entries()) {
    for (const questionId of result.askedQuestionIds) {
      replayed = reduceSession(
        replayed,
        { type: 'ASK_QUESTION', questionId },
        content,
      );
    }
    const isCurrentResult =
      saved.status === 'AWAITING_NEXT' && index === saved.results.length - 1;
    if (isCurrentResult) observe();
    replayed = reduceSession(
      replayed,
      { type: 'SUBMIT_DECISION', decision: result.decision },
      content,
    );
    if (!isCurrentResult)
      replayed = reduceSession(replayed, { type: 'NEXT_PASSENGER' }, content);
  }
  if (saved.status === 'IN_PROGRESS') {
    for (const questionId of saved.askedQuestionIds) {
      replayed = reduceSession(
        replayed,
        { type: 'ASK_QUESTION', questionId },
        content,
      );
    }
    observe();
  }
  // Parsing orders object keys consistently; array order remains significant.
  if (
    JSON.stringify(GameSessionSchema.parse(replayed)) !== JSON.stringify(saved)
  ) {
    throw new Error('Saved progress is inconsistent with this content');
  }
  return replayed;
}

export function restoreProgress(
  storage: ProgressStorage | null,
  content: ContentBundle,
  stageId: string,
): RestoreResult {
  return restoreSessionProgress(
    storage,
    content,
    createStageSession(content, stageId),
  );
}

export function restoreSessionProgress(
  storage: ProgressStorage | null,
  content: ContentBundle,
  initialSession: GameSession,
): RestoreResult {
  if (!storage) return { status: 'UNAVAILABLE', session: null };
  let raw: string | null;
  try {
    raw = storage.getItem(sessionProgressKey(initialSession));
  } catch {
    return { status: 'UNAVAILABLE', session: null };
  }
  if (raw === null) return { status: 'EMPTY', session: null };
  try {
    const envelope: unknown = JSON.parse(raw);
    if (
      envelope &&
      typeof envelope === 'object' &&
      'storageVersion' in envelope
    ) {
      if (envelope.storageVersion !== 1)
        return { status: 'INCOMPATIBLE', session: null };
      if (
        'session' in envelope &&
        envelope.session &&
        typeof envelope.session === 'object'
      ) {
        const session = envelope.session;
        if (
          ('schemaVersion' in session && session.schemaVersion !== 1) ||
          ('contentVersion' in session &&
            session.contentVersion !== content.manifest.contentVersion)
        )
          return { status: 'INCOMPATIBLE', session: null };
      }
    }
    const record = RecordSchema.parse(envelope);
    return {
      status: 'RESTORED',
      session: replaySession(record.session, content, initialSession),
    };
  } catch {
    return { status: 'INVALID', session: null };
  }
}

export function saveProgress(
  storage: ProgressStorage | null,
  session: GameSession,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(
      sessionProgressKey(session),
      JSON.stringify({ storageVersion: 1, session }),
    );
    return true;
  } catch {
    return false;
  }
}
