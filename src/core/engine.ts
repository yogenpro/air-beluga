import { DecisionSchema } from '../content/schemas';
import { InvalidActionError, type Action } from './actions';
import { selectDaily, type DailySelection } from './daily';
import { scoreDecision } from './scoring';
import type {
  CaseResult,
  ContentBundle,
  GameSession,
  PassengerCase,
  ResolutionPath,
} from './types';

function initialEvidence(item: PassengerCase) {
  return {
    revealedDocumentIds: [...item.initiallyPresentedDocumentIds],
    askedQuestionIds: [] as string[],
    inspectedDocumentIds: [] as string[],
    openedRuleIds: [] as string[],
  };
}

function newSession(
  content: ContentBundle,
  challenge: GameSession['challenge'],
  caseIds: string[],
): GameSession {
  const first = content.cases.find((item) => item.id === caseIds[0]);
  if (!first)
    throw new Error('Cannot start a session without a valid passenger');
  return {
    schemaVersion: 1,
    contentVersion: content.manifest.contentVersion,
    challenge,
    caseIds: [...caseIds],
    passengerIndex: 0,
    ...initialEvidence(first),
    status: 'IN_PROGRESS',
    totalScore: 0,
    results: [],
  };
}

export function createStageSession(
  content: ContentBundle,
  stageId: string,
): GameSession {
  const stage = content.stages.find((item) => item.id === stageId);
  if (!stage) throw new Error(`Unknown stage ${stageId}`);
  return newSession(content, { kind: 'STAGE', id: stage.id }, stage.caseIds);
}

export function createDailySession(
  content: ContentBundle,
  selection: DailySelection,
  options: { allowIllustrative?: boolean } = {},
): GameSession {
  if (selection.contentVersion !== content.manifest.contentVersion) {
    throw new Error('Daily content version mismatch');
  }
  const expected = selectDaily(
    content,
    selection.poolId,
    selection.utcDate,
    options,
  );
  if (
    selection.id !== expected.id ||
    selection.dailyAlgorithmVersion !== expected.dailyAlgorithmVersion ||
    selection.caseIds.length !== expected.caseIds.length ||
    selection.caseIds.some((id, index) => id !== expected.caseIds[index])
  ) {
    throw new Error(
      'Daily selection does not match its frozen content and algorithm',
    );
  }
  return newSession(
    content,
    {
      kind: 'DAILY',
      id: selection.id,
      utcDate: selection.utcDate,
      poolId: selection.poolId,
      dailyAlgorithmVersion: selection.dailyAlgorithmVersion,
    },
    selection.caseIds,
  );
}

function currentCase(
  state: GameSession,
  content: ContentBundle,
): PassengerCase {
  if (
    state.schemaVersion !== 1 ||
    state.contentVersion !== content.manifest.contentVersion
  ) {
    throw new InvalidActionError('Session content version is incompatible');
  }
  const item = content.cases.find(
    (entry) => entry.id === state.caseIds[state.passengerIndex],
  );
  if (!item) throw new InvalidActionError('No current passenger');
  return item;
}

function missingEvidence(state: GameSession, path: ResolutionPath) {
  return {
    missingDocumentIds: path.requiredDocumentIds.filter(
      (id) => !state.revealedDocumentIds.includes(id),
    ),
    missingQuestionIds: path.requiredQuestionIds.filter(
      (id) => !state.askedQuestionIds.includes(id),
    ),
  };
}

/** Player-facing projection deliberately omits hidden documents and the answer. */
export function getPassengerView(state: GameSession, content: ContentBundle) {
  const item = currentCase(state, content);
  const snapshot = content.ruleSnapshots.find(
    (snapshot) => snapshot.id === item.ruleSnapshotId,
  )!;
  return {
    id: item.id,
    verificationStatus: item.verificationStatus,
    notice: item.notice,
    passenger: structuredClone(item.passenger),
    itinerary: structuredClone(item.itinerary),
    travelDate: item.travelDate,
    historical: snapshot.historical ?? false,
    rulesDate: snapshot.asOfDate,
    clues: [...item.clues],
    assumptions: [...(item.assumptions ?? [])],
    documents: structuredClone(
      item.documents.filter((doc) =>
        state.revealedDocumentIds.includes(doc.id),
      ),
    ),
    questions: item.questions.map(({ id, label, kind }) => ({
      id,
      label,
      ...(kind ? { kind } : {}),
    })),
    responses: item.questions
      .filter((question) => state.askedQuestionIds.includes(question.id))
      .map(({ id, response }) => ({ questionId: id, response })),
  };
}

export function reduceSession(
  state: GameSession,
  action: Action,
  content: ContentBundle,
): GameSession {
  if (state.status === 'COMPLETED')
    throw new InvalidActionError('Session is complete');
  const item = currentCase(state, content);
  if (action.type === 'NEXT_PASSENGER') {
    if (state.status !== 'AWAITING_NEXT') {
      throw new InvalidActionError(
        'Resolve the current passenger before continuing',
      );
    }
    const passengerIndex = state.passengerIndex + 1;
    if (passengerIndex === state.caseIds.length) {
      return {
        ...state,
        passengerIndex,
        revealedDocumentIds: [],
        askedQuestionIds: [],
        inspectedDocumentIds: [],
        openedRuleIds: [],
        status: 'COMPLETED',
      };
    }
    const next = content.cases.find(
      (entry) => entry.id === state.caseIds[passengerIndex],
    );
    if (!next)
      throw new InvalidActionError('Next passenger is missing from content');
    return {
      ...state,
      passengerIndex,
      ...initialEvidence(next),
      status: 'IN_PROGRESS',
    };
  }
  if (state.status !== 'IN_PROGRESS') {
    throw new InvalidActionError('This passenger has already been resolved');
  }
  switch (action.type) {
    case 'INSPECT_DOCUMENT': {
      if (!state.revealedDocumentIds.includes(action.documentId)) {
        throw new InvalidActionError(
          'Cannot inspect a hidden or unknown document',
        );
      }
      if (state.inspectedDocumentIds.includes(action.documentId)) return state;
      return {
        ...state,
        inspectedDocumentIds: [
          ...state.inspectedDocumentIds,
          action.documentId,
        ],
      };
    }
    case 'OPEN_RULE': {
      const snapshot = content.ruleSnapshots.find(
        (entry) => entry.id === item.ruleSnapshotId,
      );
      if (!snapshot?.rules.some((rule) => rule.id === action.ruleId)) {
        throw new InvalidActionError('Rule does not exist in this snapshot');
      }
      if (state.openedRuleIds.includes(action.ruleId)) return state;
      return {
        ...state,
        openedRuleIds: [...state.openedRuleIds, action.ruleId],
      };
    }
    case 'ASK_QUESTION': {
      const question = item.questions.find(
        (entry) => entry.id === action.questionId,
      );
      if (!question)
        throw new InvalidActionError(
          'Question is not offered for this passenger',
        );
      if (state.askedQuestionIds.includes(question.id)) return state;
      if (
        question.revealsDocumentIds.some(
          (id) => !item.documents.some((doc) => doc.id === id),
        )
      ) {
        throw new InvalidActionError(
          'Question cannot reveal an unpossessed document',
        );
      }
      return {
        ...state,
        askedQuestionIds: [...state.askedQuestionIds, question.id],
        revealedDocumentIds: [
          ...new Set([
            ...state.revealedDocumentIds,
            ...question.revealsDocumentIds,
          ]),
        ],
      };
    }
    case 'SUBMIT_DECISION': {
      if (!DecisionSchema.safeParse(action.decision).success) {
        throw new InvalidActionError('Unknown decision');
      }
      const routes = item.resolution.paths.map((path) =>
        missingEvidence(state, path),
      );
      // Stable sort preserves authored path order when equally close.
      routes.sort(
        (a, b) =>
          a.missingDocumentIds.length +
          a.missingQuestionIds.length -
          b.missingDocumentIds.length -
          b.missingQuestionIds.length,
      );
      const nearest = routes[0]!;
      const correct =
        action.decision === item.resolution.expectedDecision &&
        nearest.missingDocumentIds.length === 0 &&
        nearest.missingQuestionIds.length === 0;
      const score = scoreDecision(
        correct,
        state.askedQuestionIds,
        item.questions
          .filter((question) => question.justified)
          .map((question) => question.id),
        content.manifest.scoring,
      );
      const result: CaseResult = {
        caseId: item.id,
        caseVersion: item.version,
        ruleSnapshotId: item.ruleSnapshotId,
        decision: action.decision,
        expectedDecision: item.resolution.expectedDecision,
        correct,
        ...nearest,
        askedQuestionIds: [...state.askedQuestionIds],
        revealedDocumentIds: [...state.revealedDocumentIds],
        rationale: item.rationale,
        ruleIds: [...item.ruleIds],
        score,
      };
      return {
        ...state,
        status: 'AWAITING_NEXT',
        results: [...state.results, result],
        totalScore: state.totalScore + score.total,
      };
    }
    default:
      throw new InvalidActionError(
        `Unknown action type: ${String((action as Action).type)}`,
      );
  }
}
