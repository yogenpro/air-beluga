import { describe, expect, it } from 'vitest';
import { InvalidActionError, type Action } from '../src/core/actions';
import {
  createStageSession,
  getPassengerView,
  reduceSession,
} from '../src/core/engine';
import { GameSessionSchema } from '../src/content/schemas';
import { content, deepFreeze, fixtureCopy, sessionFor } from './helpers';

describe('passenger evidence and decisions', () => {
  it('accepts complete initial evidence and records the frozen rule snapshot', () => {
    const state = sessionFor('fixture-01-ready');
    const resolved = reduceSession(
      state,
      { type: 'SUBMIT_DECISION', decision: 'CHECK_IN' },
      content,
    );
    expect(resolved.results[0]).toMatchObject({
      correct: true,
      caseVersion: 1,
      ruleSnapshotId: 'illustrative-rules-v1',
      ruleIds: ['training-passport', 'training-visa'],
      score: { decision: 100, inquiry: 15, efficiency: 10, total: 125 },
    });
    expect(resolved.totalScore).toBe(125);
    expect(resolved.status).toBe('AWAITING_NEXT');
    expect(state.results).toEqual([]);
  });

  it('shows only presented documents, offered labels and clues before resolution', () => {
    const view = getPassengerView(
      sessionFor('fixture-02-hidden-visa'),
      content,
    );
    expect(view.documents.map((doc) => doc.id)).toEqual(['passport']);
    expect(view.questions).toEqual([
      { id: 'ask-visa', label: 'Ask for destination visa' },
      { id: 'ask-onward', label: 'Ask for onward booking' },
    ]);
    expect(view.responses).toEqual([]);
    expect(view).not.toHaveProperty('resolution');
    expect(view).not.toHaveProperty('rationale');
    expect(view.questions[0]).not.toHaveProperty('justified');
  });

  it('grades premature check-in as wrong despite possession of the hidden visa', () => {
    const resolved = reduceSession(
      sessionFor('fixture-02-hidden-visa'),
      { type: 'SUBMIT_DECISION', decision: 'CHECK_IN' },
      content,
    );
    expect(resolved.results[0]).toMatchObject({
      correct: false,
      expectedDecision: 'CHECK_IN',
      missingDocumentIds: ['visa'],
      missingQuestionIds: ['ask-visa'],
      score: { total: 0 },
    });
  });

  it('reveals exactly the specified evidence and deterministic response', () => {
    const state = sessionFor('fixture-02-hidden-visa');
    const asked = reduceSession(
      state,
      { type: 'ASK_QUESTION', questionId: 'ask-visa' },
      content,
    );
    expect(asked.revealedDocumentIds).toEqual(['passport', 'visa']);
    expect(asked.askedQuestionIds).toEqual(['ask-visa']);
    expect(getPassengerView(asked, content).responses).toEqual([
      { questionId: 'ask-visa', response: 'Here is my training visitor visa.' },
    ]);
    const inspected = reduceSession(
      asked,
      { type: 'INSPECT_DOCUMENT', documentId: 'visa' },
      content,
    );
    expect(inspected.inspectedDocumentIds).toEqual(['visa']);
    const resolved = reduceSession(
      inspected,
      { type: 'SUBMIT_DECISION', decision: 'CHECK_IN' },
      content,
    );
    expect(resolved.results[0]?.correct).toBe(true);
    expect(resolved.totalScore).toBe(125);
  });

  it('does not reward early denial before the relevant absence inquiry', () => {
    let state = sessionFor('fixture-04-no-visa');
    const early = reduceSession(
      state,
      { type: 'SUBMIT_DECISION', decision: 'DENY' },
      content,
    );
    expect(early.results[0]).toMatchObject({
      correct: false,
      missingQuestionIds: ['ask-permission'],
    });
    state = reduceSession(
      state,
      { type: 'ASK_QUESTION', questionId: 'ask-permission' },
      content,
    );
    expect(state.revealedDocumentIds).toEqual(['passport']);
    state = reduceSession(
      state,
      { type: 'SUBMIT_DECISION', decision: 'DENY' },
      content,
    );
    expect(state.results[0]?.correct).toBe(true);
  });

  it('accepts either authored evidence route without requiring every question', () => {
    for (const questionId of ['ask-second-passport', 'ask-visa']) {
      let state = sessionFor('fixture-08-alternatives');
      state = reduceSession(
        state,
        { type: 'ASK_QUESTION', questionId },
        content,
      );
      state = reduceSession(
        state,
        { type: 'SUBMIT_DECISION', decision: 'CHECK_IN' },
        content,
      );
      expect(state.results[0]?.correct).toBe(true);
      expect(state.totalScore).toBe(125);
    }
  });

  it('requires the authored status inquiry before escalation', () => {
    let state = sessionFor('fixture-06-referral');
    const early = reduceSession(
      state,
      { type: 'SUBMIT_DECISION', decision: 'ESCALATE' },
      content,
    );
    expect(early.results[0]?.correct).toBe(false);
    state = reduceSession(
      state,
      { type: 'ASK_QUESTION', questionId: 'ask-status' },
      content,
    );
    state = reduceSession(
      state,
      { type: 'SUBMIT_DECISION', decision: 'ESCALATE' },
      content,
    );
    expect(state.results[0]?.correct).toBe(true);
  });

  it.each(['DENY', 'ESCALATE'] as const)(
    '%s is not a safe fallback for an eligible passenger',
    (decision) => {
      const state = reduceSession(
        sessionFor('fixture-01-ready'),
        { type: 'SUBMIT_DECISION', decision },
        content,
      );
      expect(state.results[0]?.correct).toBe(false);
      expect(state.totalScore).toBe(0);
    },
  );

  it('charges only a small efficiency cost for irrelevant questions', () => {
    let state = sessionFor('fixture-02-hidden-visa');
    for (const questionId of ['ask-onward', 'ask-visa']) {
      state = reduceSession(
        state,
        { type: 'ASK_QUESTION', questionId },
        content,
      );
    }
    state = reduceSession(
      state,
      { type: 'SUBMIT_DECISION', decision: 'CHECK_IN' },
      content,
    );
    expect(state.results[0]?.score).toEqual({
      decision: 100,
      inquiry: 15,
      efficiency: 8,
      total: 123,
    });
  });
});

describe('action integrity and progression', () => {
  it.each([
    { type: 'NEXT_PASSENGER' },
    { type: 'ASK_QUESTION', questionId: 'not-offered' },
    { type: 'INSPECT_DOCUMENT', documentId: 'visa' },
    { type: 'INSPECT_DOCUMENT', documentId: 'missing' },
    { type: 'OPEN_RULE', ruleId: 'not-a-rule' },
  ] satisfies Action[])(
    'rejects invalid action $type without mutation',
    (action) => {
      const state = deepFreeze(sessionFor('fixture-02-hidden-visa'));
      expect(() => reduceSession(state, action, content)).toThrow(
        InvalidActionError,
      );
      expect(state.totalScore).toBe(0);
      expect(state.revealedDocumentIds).toEqual(['passport']);
    },
  );

  it('rejects malformed runtime decisions and action types', () => {
    const state = sessionFor('fixture-01-ready');
    expect(() =>
      reduceSession(
        state,
        { type: 'SUBMIT_DECISION', decision: 'MAYBE' } as unknown as Action,
        content,
      ),
    ).toThrow('Unknown decision');
    expect(() =>
      reduceSession(state, { type: 'SKIP' } as unknown as Action, content),
    ).toThrow('Unknown action');
  });

  it('cannot reveal an unpossessed document even if passed corrupt typed content', () => {
    const broken = fixtureCopy();
    broken.cases[1]!.questions[0]!.revealsDocumentIds.push('invented');
    expect(() =>
      reduceSession(
        sessionFor('fixture-02-hidden-visa'),
        { type: 'ASK_QUESTION', questionId: 'ask-visa' },
        broken,
      ),
    ).toThrow('unpossessed');
  });

  it('treats repeated questions, inspections and rule opens as idempotent', () => {
    let state = sessionFor('fixture-02-hidden-visa');
    for (const action of [
      { type: 'ASK_QUESTION', questionId: 'ask-visa' },
      { type: 'INSPECT_DOCUMENT', documentId: 'visa' },
      { type: 'OPEN_RULE', ruleId: 'training-visa' },
    ] satisfies Action[]) {
      state = reduceSession(state, action, content);
      expect(reduceSession(state, action, content)).toBe(state);
    }
    expect(state.totalScore).toBe(0);
  });

  it('prevents resubmission and post-decision evidence changes', () => {
    const state = reduceSession(
      sessionFor('fixture-02-hidden-visa'),
      { type: 'SUBMIT_DECISION', decision: 'CHECK_IN' },
      content,
    );
    for (const action of [
      { type: 'SUBMIT_DECISION', decision: 'CHECK_IN' },
      { type: 'ASK_QUESTION', questionId: 'ask-visa' },
      { type: 'INSPECT_DOCUMENT', documentId: 'passport' },
    ] satisfies Action[]) {
      expect(() => reduceSession(state, action, content)).toThrow(
        'already been resolved',
      );
    }
  });

  it('resumes serialized state without changing deterministic outcomes', () => {
    let state = sessionFor('fixture-02-hidden-visa');
    state = reduceSession(
      state,
      { type: 'ASK_QUESTION', questionId: 'ask-visa' },
      content,
    );
    const restored = GameSessionSchema.parse(JSON.parse(JSON.stringify(state)));
    const action: Action = { type: 'SUBMIT_DECISION', decision: 'CHECK_IN' };
    expect(reduceSession(restored, action, content)).toEqual(
      reduceSession(state, action, content),
    );
    expect(() =>
      reduceSession(
        { ...state, contentVersion: 'other-version' },
        action,
        content,
      ),
    ).toThrow('incompatible');
  });

  it('completes the entire eight-passenger stage with immutable inputs and stable score', () => {
    const frozenContent = deepFreeze(fixtureCopy());
    const play = () => {
      let state = createStageSession(frozenContent, '001-sfo');
      for (const caseId of state.caseIds) {
        const item = frozenContent.cases.find((entry) => entry.id === caseId)!;
        for (const questionId of item.resolution.paths[0]!
          .requiredQuestionIds) {
          state = reduceSession(
            deepFreeze(state),
            { type: 'ASK_QUESTION', questionId },
            frozenContent,
          );
        }
        state = reduceSession(
          deepFreeze(state),
          {
            type: 'SUBMIT_DECISION',
            decision: item.resolution.expectedDecision,
          },
          frozenContent,
        );
        state = reduceSession(
          deepFreeze(state),
          { type: 'NEXT_PASSENGER' },
          frozenContent,
        );
      }
      return state;
    };
    const completed = play();
    expect(completed).toEqual(play());
    expect(completed.status).toBe('COMPLETED');
    expect(completed.totalScore).toBe(1000);
    expect(completed.results).toHaveLength(8);
    expect(completed.results.every((result) => result.correct)).toBe(true);
    expect(completed.revealedDocumentIds).toEqual([]);
    expect(GameSessionSchema.safeParse(completed).success).toBe(true);
    expect(() =>
      reduceSession(completed, { type: 'NEXT_PASSENGER' }, frozenContent),
    ).toThrow('complete');
  });

  it('resets passenger evidence while retaining prior results', () => {
    let state = createStageSession(content, '001-sfo');
    state = reduceSession(
      state,
      { type: 'INSPECT_DOCUMENT', documentId: 'visa' },
      content,
    );
    state = reduceSession(
      state,
      { type: 'SUBMIT_DECISION', decision: 'CHECK_IN' },
      content,
    );
    state = reduceSession(state, { type: 'NEXT_PASSENGER' }, content);
    expect(state.passengerIndex).toBe(1);
    expect(state.revealedDocumentIds).toEqual(['passport']);
    expect(state.inspectedDocumentIds).toEqual([]);
    expect(state.askedQuestionIds).toEqual([]);
    expect(state.results).toHaveLength(1);
  });
});
