import { describe, expect, it } from 'vitest';
import { createStageSession, reduceSession } from '../src/core/engine';
import type { GameSession } from '../src/core/types';
import {
  progressKey,
  restoreProgress,
  saveProgress,
  type ProgressStorage,
} from '../src/storage/progress';
import { content } from './helpers';

class MemoryStorage implements ProgressStorage {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

const stageId = '001-sfo';
function resolveCurrent(state: GameSession) {
  const item = content.cases.find(
    (entry) => entry.id === state.caseIds[state.passengerIndex],
  )!;
  for (const questionId of item.resolution.paths[0]!.requiredQuestionIds) {
    state = reduceSession(state, { type: 'ASK_QUESTION', questionId }, content);
  }
  return reduceSession(
    state,
    { type: 'SUBMIT_DECISION', decision: item.resolution.expectedDecision },
    content,
  );
}
function roundtrip(session: GameSession) {
  const storage = new MemoryStorage();
  expect(saveProgress(storage, session)).toBe(true);
  expect(restoreProgress(storage, content, stageId)).toEqual({
    status: 'RESTORED',
    session,
  });
}

describe('versioned stage progress', () => {
  it('starts clean when no record exists', () => {
    expect(restoreProgress(new MemoryStorage(), content, stageId)).toEqual({
      status: 'EMPTY',
      session: null,
    });
  });

  it('restores every stage boundary, including committed feedback and completion', () => {
    let session = createStageSession(content, stageId);
    roundtrip(session);
    for (let index = 0; index < 8; index++) {
      session = resolveCurrent(session);
      roundtrip(session);
      session = reduceSession(session, { type: 'NEXT_PASSENGER' }, content);
      roundtrip(session);
    }
    expect(session.status).toBe('COMPLETED');
  });

  it('restores inquiries, revealed evidence, inspections and opened rules mid-passenger', () => {
    let session = createStageSession(content, stageId);
    session = reduceSession(
      resolveCurrent(session),
      { type: 'NEXT_PASSENGER' },
      content,
    );
    session = reduceSession(
      session,
      { type: 'ASK_QUESTION', questionId: 'ask-visa' },
      content,
    );
    session = reduceSession(
      session,
      { type: 'INSPECT_DOCUMENT', documentId: 'visa' },
      content,
    );
    session = reduceSession(
      session,
      { type: 'OPEN_RULE', ruleId: 'training-visa' },
      content,
    );
    roundtrip(session);
    roundtrip(resolveCurrent(session));
  });

  it('preserves incorrect and premature decisions without upgrading them on resume', () => {
    let session = createStageSession(content, stageId);
    session = reduceSession(
      resolveCurrent(session),
      { type: 'NEXT_PASSENGER' },
      content,
    );
    session = reduceSession(
      session,
      { type: 'SUBMIT_DECISION', decision: 'CHECK_IN' },
      content,
    );
    expect(session.results.at(-1)!.correct).toBe(false);
    roundtrip(session);
  });

  it('allows a fresh replay to overwrite a completed saved stage', () => {
    const storage = new MemoryStorage();
    const fresh = createStageSession(content, stageId);
    saveProgress(storage, resolveCurrent(fresh));
    saveProgress(storage, fresh);
    expect(restoreProgress(storage, content, stageId).session).toEqual(fresh);
  });

  it.each([
    [
      'storage',
      (record: Record<string, unknown>) => {
        record.storageVersion = 2;
      },
    ],
    [
      'session',
      (record: Record<string, unknown>) => {
        (record.session as GameSession).schemaVersion = 2 as 1;
      },
    ],
    [
      'content',
      (record: Record<string, unknown>) => {
        (record.session as GameSession).contentVersion = 'old-content';
      },
    ],
  ] as const)(
    'invalidates incompatible %s versions without altering the record',
    (_name, mutate) => {
      const storage = new MemoryStorage();
      saveProgress(storage, createStageSession(content, stageId));
      const record = JSON.parse(
        storage.getItem(progressKey(stageId))!,
      ) as Record<string, unknown>;
      mutate(record);
      const raw = JSON.stringify(record);
      storage.setItem(progressKey(stageId), raw);
      expect(restoreProgress(storage, content, stageId)).toEqual({
        status: 'INCOMPATIBLE',
        session: null,
      });
      expect(storage.getItem(progressKey(stageId))).toBe(raw);
    },
  );

  it.each([
    [
      'score',
      (session: GameSession) => {
        session.totalScore += 100;
      },
    ],
    [
      'passenger index',
      (session: GameSession) => {
        session.passengerIndex = 999;
      },
    ],
    [
      'stage order',
      (session: GameSession) => {
        session.caseIds.reverse();
      },
    ],
    [
      'hidden evidence',
      (session: GameSession) => {
        session.revealedDocumentIds.push('unpossessed');
      },
    ],
    [
      'unknown question',
      (session: GameSession) => {
        session.askedQuestionIds.push('unknown');
      },
    ],
    [
      'unknown inspection',
      (session: GameSession) => {
        session.inspectedDocumentIds.push('unknown');
      },
    ],
    [
      'unknown rule',
      (session: GameSession) => {
        session.openedRuleIds.push('unknown');
      },
    ],
    [
      'completion',
      (session: GameSession) => {
        session.status = 'COMPLETED';
      },
    ],
    [
      'daily challenge',
      (session: GameSession) => {
        session.challenge = { kind: 'STAGE', id: 'other-stage' };
      },
    ],
  ] as const)('rejects inconsistent saved %s', (_name, mutate) => {
    const session = createStageSession(content, stageId);
    mutate(session);
    const storage = new MemoryStorage();
    saveProgress(storage, session);
    // An altered challenge is stored under another key; place it at the active stage key.
    storage.setItem(
      progressKey(stageId),
      JSON.stringify({ storageVersion: 1, session }),
    );
    expect(restoreProgress(storage, content, stageId)).toEqual({
      status: 'INVALID',
      session: null,
    });
  });

  it('recomputes result correctness, rationale and scores against frozen content', () => {
    for (const mutate of [
      (session: GameSession) => {
        session.results[0]!.correct = false;
      },
      (session: GameSession) => {
        session.results[0]!.rationale = 'Invented saved explanation';
      },
      (session: GameSession) => {
        session.results[0]!.score.total = 999;
      },
      (session: GameSession) => {
        session.results[0]!.caseVersion = 999;
      },
    ]) {
      const storage = new MemoryStorage();
      const session = resolveCurrent(createStageSession(content, stageId));
      mutate(session);
      saveProgress(storage, session);
      expect(restoreProgress(storage, content, stageId).status).toBe('INVALID');
    }
  });

  it.each(['{not-json', 'null', '[]', '{}'])(
    'handles malformed records: %s',
    (raw) => {
      const storage = new MemoryStorage();
      storage.setItem(progressKey(stageId), raw);
      expect(restoreProgress(storage, content, stageId)).toEqual({
        status: 'INVALID',
        session: null,
      });
    },
  );

  it('continues safely when storage is blocked, read-only or full', () => {
    const unavailable: ProgressStorage = {
      getItem() {
        throw new Error('Access denied');
      },
      setItem() {
        throw new Error('Quota exceeded');
      },
    };
    const session = createStageSession(content, stageId);
    expect(restoreProgress(unavailable, content, stageId).status).toBe(
      'UNAVAILABLE',
    );
    expect(restoreProgress(null, content, stageId).status).toBe('UNAVAILABLE');
    expect(saveProgress(unavailable, session)).toBe(false);
    expect(saveProgress(null, session)).toBe(false);
  });
});
