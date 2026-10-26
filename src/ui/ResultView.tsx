import { useEffect, useRef } from 'react';
import type { CaseResult, PassengerCase, RuleSnapshot } from '../core/types';
import { DECISION_LABELS, DOCUMENT_LABELS } from './labels';
import { RuleSources } from './Rulebook';
import { Icon } from './Icons';

export function ResultView({
  result,
  passengerCase,
  snapshot,
  isLast,
  onNext,
  summaryLabel = 'View shift report',
}: {
  result: CaseResult;
  passengerCase: PassengerCase;
  snapshot: RuleSnapshot;
  isLast: boolean;
  onNext: () => void;
  summaryLabel?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section
      aria-labelledby="result-heading"
      className={`panel feedback ${result.correct ? 'feedback-correct' : 'feedback-incorrect'}`}
    >
      <p className="eyebrow">
        <Icon name={result.correct ? 'check' : 'book'} />{' '}
        {result.correct ? 'NICELY HANDLED' : 'A MOMENT TO LEARN'}
      </p>
      <h2 id="result-heading" tabIndex={-1} ref={heading}>
        Decision feedback
      </h2>
      <p>
        <strong>{result.correct ? 'Correct' : 'Incorrect'}</strong> · Your
        decision: {DECISION_LABELS[result.decision]} · Expected disposition:{' '}
        {DECISION_LABELS[result.expectedDecision]}
      </p>
      {result.missingDocumentIds.length > 0 && (
        <p>
          Missing presented evidence:{' '}
          {result.missingDocumentIds
            .map((id) => {
              const document = passengerCase.documents.find(
                (item) => item.id === id,
              )!;
              return DOCUMENT_LABELS[document.type];
            })
            .join(', ')}
          .
        </p>
      )}
      {result.missingQuestionIds.length > 0 && (
        <p>
          Required inquiries:{' '}
          {result.missingQuestionIds
            .map(
              (id) =>
                passengerCase.questions.find((question) => question.id === id)!
                  .label,
            )
            .join('; ')}
          .
        </p>
      )}
      <p>{result.rationale}</p>
      <p>
        <strong>+{result.score.total} points</strong> · Decision{' '}
        {result.score.decision} · Inquiry {result.score.inquiry} · Efficiency{' '}
        {result.score.efficiency}
      </p>
      <details className="feedback-sources">
        <summary>Rules and sources behind this decision</summary>
        <ul>
          {snapshot.rules
            .filter((rule) => result.ruleIds.includes(rule.id))
            .map((rule) => (
              <li key={rule.id}>
                <strong>{rule.title}</strong>{' '}
                <span className="muted">({rule.id})</span>
                <p>{rule.body}</p>
                <RuleSources rule={rule} />
              </li>
            ))}
        </ul>
      </details>
      <button type="button" className="button-primary" onClick={onNext}>
        {isLast ? summaryLabel : 'Next passenger'}
        <Icon name="arrow" />
      </button>
    </section>
  );
}
