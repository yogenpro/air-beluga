import { useEffect, useRef } from 'react';
import type { ContentBundle, GameSession } from '../core/types';
import { DECISION_LABELS } from './labels';
import { RuleSources } from './Rulebook';

export function StageSummary({
  session,
  content,
  maximumScore,
  onRestart,
  restartLabel = 'Play again',
}: {
  session: GameSession;
  content: ContentBundle;
  maximumScore: number;
  onRestart: () => void;
  restartLabel?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section className="panel" aria-labelledby="summary-heading">
      <h2 id="summary-heading" tabIndex={-1} ref={heading}>
        {session.challenge.kind === 'DAILY'
          ? 'Daily challenge complete'
          : 'Stage complete'}
      </h2>
      <p>
        <strong>
          {session.results.filter((result) => result.correct).length} of{' '}
          {session.results.length} correct · {session.totalScore} of{' '}
          {maximumScore} points.
        </strong>
      </p>
      <p>Airline acceptance is separate from admission at the border.</p>
      {session.challenge.kind === 'DAILY' && (
        <p>
          {session.challenge.utcDate} UTC · Content {session.contentVersion} ·
          Algorithm {session.challenge.dailyAlgorithmVersion}
        </p>
      )}
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
            <details>
              <summary>Review decision</summary>
              <p>{result.rationale}</p>
              <p>Rule snapshot: {result.ruleSnapshotId}</p>
              {content.ruleSnapshots
                .find((snapshot) => snapshot.id === result.ruleSnapshotId)!
                .rules.filter((rule) => result.ruleIds.includes(rule.id))
                .map((rule) => (
                  <div key={rule.id}>
                    <strong>{rule.title}</strong>
                    <p>{rule.body}</p>
                    <RuleSources rule={rule} />
                  </div>
                ))}
            </details>
          </li>
        ))}
      </ol>
      <button type="button" onClick={onRestart}>
        {restartLabel}
      </button>
    </section>
  );
}
