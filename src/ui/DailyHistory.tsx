import { useState } from 'react';
import type { ContentLibrary } from '../content/library';
import {
  readDailyResults,
  reviewDailyResult,
  type DailyResult,
} from '../storage/daily-results';
import { browserStorage } from '../storage/progress';
import { StageSummary } from './StageSummary';
import { Icon } from './Icons';
export function DailyHistory({ library }: { library: ContentLibrary }) {
  const [history] = useState(() => readDailyResults(browserStorage()));
  const [selected, setSelected] = useState<DailyResult | null>(null);
  const reviewed = selected ? reviewDailyResult(library, selected) : null;
  if (reviewed?.status === 'VALID') {
    const scoring = reviewed.content.manifest.scoring;
    return (
      <>
        <div className="page-heading">
          <p className="eyebrow">FROM YOUR SHIFT HISTORY</p>
          <h1>Saved shift report</h1>
          <p>
            Completed{' '}
            {new Date(selected!.completedAt).toLocaleDateString('en', {
              timeZone: 'UTC',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}{' '}
            · Original result
          </p>
        </div>
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
          restartLabel="Back to shift history"
        />
      </>
    );
  }
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">A FEW JOURNEYS TO LOOK BACK ON</p>
        <h1>Shift history</h1>
        <p>Your past daily shifts, saved on this device.</p>
      </div>
      <section
        className="panel history-panel"
        aria-labelledby="history-heading"
      >
        <h2 id="history-heading">Your completed shifts</h2>
        <p className="muted">
          Your first completed result stays yours. Replays never replace it.
        </p>
        {history.status !== 'READY' && (
          <p role="status">
            Saved daily results cannot be read in this browser. Existing records
            have been kept.
          </p>
        )}
        {history.status === 'READY' && history.entries.length === 0 && (
          <div className="empty-history">
            <Icon name="history" />
            <h3>Your first shift is waiting.</h3>
            <p>
              Finish a daily shift and its report will be here, ready to
              revisit.
            </p>
          </div>
        )}
        <ol className="history-list">
          {[...history.entries].reverse().map((entry) => {
            const challenge = entry.session.challenge;
            if (challenge.kind !== 'DAILY') return null;
            const checked = reviewDailyResult(library, entry);
            return (
              <li key={challenge.id}>
                <div className="history-date">
                  <Icon name="ticket" />
                  <div>
                    <span className="eyebrow">DAILY SHIFT</span>
                    <h3>{challenge.utcDate} UTC</h3>
                  </div>
                </div>
                <p className="history-score">
                  <strong>{entry.session.totalScore}</strong> points
                </p>
                {checked.status === 'VALID' ? (
                  <button
                    type="button"
                    onClick={() => setSelected(entry)}
                    aria-label={`View shift report for ${challenge.utcDate}`}
                  >
                    View report
                    <Icon name="arrow" />
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
    </>
  );
}
