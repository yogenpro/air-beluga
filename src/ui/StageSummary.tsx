import { useEffect, useRef } from 'react';
import type { ContentBundle, GameSession } from '../core/types';
import { DECISION_LABELS } from './labels';
import { RuleSources } from './Rulebook';
import { Icon } from './Icons';
export function StageSummary({
  session,
  content,
  maximumScore,
  onRestart,
  restartLabel = 'Play again',
  onExit,
}: {
  session: GameSession;
  content: ContentBundle;
  maximumScore: number;
  onRestart: () => void;
  restartLabel?: string;
  onExit?: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const correct = session.results.filter((result) => result.correct).length;
  const scoring = content.manifest.scoring;
  return (
    <section className="panel shift-report" aria-labelledby="summary-heading">
      <div className="report-heading">
        <div>
          <p className="eyebrow">AIR BELUGA · END OF SHIFT</p>
          <h2 id="summary-heading" tabIndex={-1} ref={heading}>
            {session.challenge.kind === 'DAILY'
              ? 'Daily shift complete'
              : 'Shift complete'}
          </h2>
          <p>
            {correct === session.results.length
              ? 'Every passenger, thoughtfully handled. A good day at the desk.'
              : 'Your counter is closed. Let’s take a look at what you learned.'}
          </p>
        </div>
        <div className="completion-stamp" aria-hidden="true">
          <Icon name="check" />
          <span>
            SHIFT
            <br />
            COMPLETE
          </span>
        </div>
      </div>
      <div className="report-stats">
        <div>
          <span>CORRECT DECISIONS</span>
          <strong>
            {correct}
            <small> / {session.results.length}</small>
          </strong>
        </div>
        <div>
          <span>SHIFT SCORE</span>
          <strong>
            {session.totalScore}
            <small> / {maximumScore}</small>
          </strong>
        </div>
        <div>
          <span>INQUIRY POINTS</span>
          <strong>
            {session.results.reduce(
              (total, result) => total + result.score.inquiry,
              0,
            )}
            <small>
              {' '}
              / {session.caseIds.length * scoring.appropriateInquiry}
            </small>
          </strong>
        </div>
      </div>
      <p className="report-total">
        {correct} of {session.results.length} correct · {session.totalScore} of{' '}
        {maximumScore} points.
      </p>
      <div className="report-actions actions">
        {onExit && (
          <button type="button" className="button-primary" onClick={onExit}>
            Back to terminal
            <Icon name="arrow" />
          </button>
        )}
        <button type="button" onClick={onRestart}>
          {restartLabel}
        </button>
      </div>
      <div className="review-heading">
        <h3>Your passengers</h3>
        <span>A little reflection goes a long way.</span>
      </div>
      <ol className="stage-results">
        {session.results.map((result, index) => (
          <li key={result.caseId}>
            <div className="result-row">
              <span
                className={`result-symbol ${result.correct ? 'correct' : 'incorrect'}`}
              >
                <Icon name={result.correct ? 'check' : 'close'} />
                <span className="sr-only">
                  {result.correct ? 'Correct' : 'Incorrect'}
                </span>
              </span>
              <span>
                <span className="eyebrow">
                  PASSENGER {String(index + 1).padStart(2, '0')}
                </span>
                <strong>
                  {
                    content.cases.find((item) => item.id === result.caseId)!
                      .passenger.displayName
                  }
                </strong>
                <span>
                  {DECISION_LABELS[result.decision]}
                  {!result.correct &&
                    ` · Expected ${DECISION_LABELS[result.expectedDecision]}`}
                </span>
              </span>
              <span className="result-points">
                +{result.score.total}
                <small>points</small>
              </span>
            </div>
            <details>
              <summary>Review decision</summary>
              <p>{result.rationale}</p>
              {content.ruleSnapshots
                .find((snapshot) => snapshot.id === result.ruleSnapshotId)!
                .rules.filter((rule) => result.ruleIds.includes(rule.id))
                .map((rule) => (
                  <div className="review-rule" key={rule.id}>
                    <strong>{rule.title}</strong>
                    <p>{rule.body}</p>
                    <RuleSources rule={rule} />
                  </div>
                ))}
            </details>
          </li>
        ))}
      </ol>
      <details className="content-details">
        <summary>About this shift’s rules and saved result</summary>
        <p>
          Airline acceptance is separate from admission at the border. Decisions
          are reviewed against the original case dates and frozen rules.
        </p>
        <p>
          Content: {session.contentVersion}
          {session.challenge.kind === 'DAILY' && (
            <>
              {' '}
              · {session.challenge.utcDate} UTC · Algorithm:{' '}
              {session.challenge.dailyAlgorithmVersion}
            </>
          )}
        </p>
      </details>
    </section>
  );
}
