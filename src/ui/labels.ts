import type { Decision, TravelDocument } from '../core/types';

export const DECISION_LABELS: Record<Decision, string> = {
  CHECK_IN: 'Check in',
  DENY: 'Deny',
  ESCALATE: 'Escalate',
};

export const DOCUMENT_LABELS: Record<TravelDocument['type'], string> = {
  PASSPORT: 'passport',
  VISA: 'visa',
  RESIDENCE_PERMIT: 'residence permit',
  ONWARD_TICKET: 'onward ticket',
};
