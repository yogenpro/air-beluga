import { useState } from 'react';
import type { ContentLibrary } from '../content/library';
import {
  readDailyResults,
  reviewDailyResult,
  type DailyResult,
} from '../storage/daily-results';
import { browserStorage } from '../storage/progress';
import { StageSummary } from './StageSummary';

export function DailyHistory({ library }: { library: ContentLibrary }) {
  const [history] = useState(() => readDailyResults(browserStorage()));
  const [selected, setSelected] = useState<DailyResult | null>(null);
  const reviewed = selected ? reviewDailyResult(library, selected) : null;
  if (reviewed?.status === 'VALID') {
    const scoring = reviewed.content.manifest.scoring;
    return (
      <>
        <p>
          Frozen result · {selected!.session.contentVersion} · Completed{' '}
          {selected!.completedAt}
        </p>
        <StageSummary
          session={reviewed.session}
          content={reviewed.content}
          maximumScore={
            reviewed.session.caseIds.length *
            (scoring.correctDecision +
              scoring.appropriateInquiry +
              scoring.efficiency)
          }
          onRestart={() => setSelected(null)}
          restartLabel="Back to daily results"
        />
      </>
    );
  }
  return (
    <section className="panel" aria-labelledby="history-heading">
      <h2 id="history-heading">Daily results</h2>
      <p>
        Your first completion is kept for each date, content version and daily
        algorithm. Replaying a daily does not replace it.
      </p>
      {history.status !== 'READY' && (
        <p role="status">
          Saved daily results cannot be read in this browser. Existing records
          have been kept.
        </p>
      )}
      {history.status === 'READY' && history.entries.length === 0 && (
        <p>No completed daily challenges yet.</p>
      )}
      <ol>
        {[...history.entries].reverse().map((entry) => {
          const challenge = entry.session.challenge;
          if (challenge.kind !== 'DAILY') return null;
          const checked = reviewDailyResult(library, entry);
          return (
            <li key={challenge.id}>
              <h3>
                {challenge.utcDate} UTC · {entry.session.totalScore} points
              </h3>
              <p>
                Content: {entry.session.contentVersion}
                <br />
                Algorithm: {challenge.dailyAlgorithmVersion}
              </p>
              {checked.status === 'VALID' ? (
                <button type="button" onClick={() => setSelected(entry)}>
                  View frozen result for {challenge.utcDate}
                </button>
              ) : (
                <p>
                  {checked.status === 'UNAVAILABLE'
                    ? 'The matching frozen content is unavailable.'
                    : 'This record could not be validated.'}{' '}
                  Your stored result has been kept.
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
