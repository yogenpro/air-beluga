import type { Score, ScoringConfig } from './types';

export function scoreDecision(
  correct: boolean,
  askedQuestionIds: readonly string[],
  justifiedQuestionIds: readonly string[],
  config: ScoringConfig,
): Score {
  if (!correct) return { decision: 0, inquiry: 0, efficiency: 0, total: 0 };

  const extraQuestions = [...new Set(askedQuestionIds)].filter(
    (id) => !justifiedQuestionIds.includes(id),
  ).length;
  const efficiency = Math.max(
    0,
    config.efficiency - extraQuestions * config.extraQuestionPenalty,
  );
  // A correct evidence-backed resolution earns inquiry credit, including when
  // the initial presentation was sufficient and no inquiry was necessary.
  return {
    decision: config.correctDecision,
    inquiry: config.appropriateInquiry,
    efficiency,
    total: config.correctDecision + config.appropriateInquiry + efficiency,
  };
}
