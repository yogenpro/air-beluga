import { useEffect, useRef } from 'react';
import type { ContentBundle, GameSession } from '../core/types';
import { DECISION_LABELS } from './labels';

export function StageSummary({
  session,
  content,
  maximumScore,
  onRestart,
}: {
  session: GameSession;
  content: ContentBundle;
  maximumScore: number;
  onRestart: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section className="panel" aria-labelledby="summary-heading">
      <h2 id="summary-heading" tabIndex={-1} ref={heading}>
        Stage complete
      </h2>
      <p>
        <strong>
          {session.results.filter((result) => result.correct).length} of{' '}
          {session.results.length} correct · {session.totalScore} of{' '}
          {maximumScore} points.
        </strong>
      </p>
      <p>Airline acceptance is separate from admission at the border.</p>
      <ol className="stage-results">
        {session.results.map((result) => (
          <li key={result.caseId}>
            <strong>
              {
                content.cases.find((item) => item.id === result.caseId)!
                  .passenger.displayName
              }
            </strong>
            <p>
              {DECISION_LABELS[result.decision]} ·{' '}
              {result.correct
                ? 'Correct'
                : `Incorrect; expected ${DECISION_LABELS[result.expectedDecision]}`}{' '}
              · {result.score.total} points
            </p>
          </li>
        ))}
      </ol>
      <button type="button" onClick={onRestart}>
        Play again
      </button>
    </section>
  );
}
