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
      <div className="feedback-header">
        <div>
          <p className="eyebrow">
            <Icon name={result.correct ? 'check' : 'alert'} />{' '}
            {result.correct ? 'NICELY HANDLED' : 'A MOMENT TO LEARN'}
          </p>
          <h2 id="result-heading" tabIndex={-1} ref={heading}>
            Decision feedback
          </h2>
        </div>
        <div className="feedback-score-badge">
          <strong>+{result.score.total} points</strong>
          <span>
            Decision {result.score.decision} · Inquiry {result.score.inquiry} ·
            Efficiency {result.score.efficiency}
          </span>
        </div>
      </div>

      <div className="feedback-comparison">
        <div className="comparison-card">
          <span className="comparison-label">Status</span>
          <strong>{result.correct ? 'Correct' : 'Incorrect'}</strong>
        </div>
        <div className="comparison-card">
          <span className="comparison-label">Your decision</span>
          <span className="comparison-value">
            {DECISION_LABELS[result.decision]}
          </span>
        </div>
        <div className="comparison-card">
          <span className="comparison-label">Expected disposition</span>
          <span className="comparison-value">
            {DECISION_LABELS[result.expectedDecision]}
          </span>
        </div>
      </div>

      {(result.missingDocumentIds.length > 0 ||
        result.missingQuestionIds.length > 0) && (
        <div className="feedback-missing-alerts">
          {result.missingDocumentIds.length > 0 && (
            <p className="missing-alert">
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
            <p className="missing-alert">
              Required inquiries:{' '}
              {result.missingQuestionIds
                .map(
                  (id) =>
                    passengerCase.questions.find(
                      (question) => question.id === id,
                    )!.label,
                )
                .join('; ')}
              .
            </p>
          )}
        </div>
      )}

      <div className="feedback-rationale-box">
        <span className="eyebrow" aria-hidden="true">
          WHY THIS CALL WORKS
        </span>
        <p>{result.rationale}</p>
      </div>

      <div className="feedback-footer">
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
      </div>
    </section>
  );
}
