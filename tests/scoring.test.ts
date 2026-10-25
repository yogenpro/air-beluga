import { describe, expect, it } from 'vitest';
import { scoreDecision } from '../src/core/scoring';
import { content } from './helpers';

describe('configurable scoring', () => {
  const config = content.manifest.scoring;

  it('awards no points for any inquiry strategy with a wrong decision', () => {
    expect(scoreDecision(false, ['visa', 'extra'], ['visa'], config)).toEqual({
      decision: 0,
      inquiry: 0,
      efficiency: 0,
      total: 0,
    });
  });

  it('never penalizes justified inquiries', () => {
    expect(scoreDecision(true, ['a', 'b'], ['a', 'b'], config).total).toBe(125);
    expect(scoreDecision(true, [], [], config).total).toBe(125);
  });

  it('deduplicates actions and clamps efficiency at zero', () => {
    expect(scoreDecision(true, ['extra', 'extra'], [], config).efficiency).toBe(
      8,
    );
    const extras = Array.from({ length: 20 }, (_, index) => `q${index}`);
    expect(scoreDecision(true, extras, [], config)).toEqual({
      decision: 100,
      inquiry: 15,
      efficiency: 0,
      total: 115,
    });
  });

  it('reads point values from configuration', () => {
    expect(
      scoreDecision(true, ['extra'], [], {
        correctDecision: 800,
        appropriateInquiry: 120,
        efficiency: 80,
        extraQuestionPenalty: 5,
      }).total,
    ).toBe(995);
  });
});
