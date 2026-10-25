import type { Decision } from './types';

export type Action =
  | { type: 'INSPECT_DOCUMENT'; documentId: string }
  | { type: 'OPEN_RULE'; ruleId: string }
  | { type: 'ASK_QUESTION'; questionId: string }
  | { type: 'SUBMIT_DECISION'; decision: Decision }
  | { type: 'NEXT_PASSENGER' };

export class InvalidActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidActionError';
  }
}
