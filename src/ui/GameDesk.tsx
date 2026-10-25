import { useEffect, useReducer, useState } from 'react';
import type { Action } from '../core/actions';
import { reduceSession } from '../core/engine';
import type { ContentBundle, GameSession } from '../core/types';
import {
  browserStorage,
  restoreSessionProgress,
  saveProgress,
  type RestoreResult,
} from '../storage/progress';
import { recordDailyResult } from '../storage/daily-results';
import { PassengerDesk } from './PassengerDesk';
import { ResultView } from './ResultView';
import { Rulebook } from './Rulebook';
import { StageSummary } from './StageSummary';

export interface DeskMetadata {
  title: string;
  flightLabel: string;
  departureLabel: string;
  notice: string;
  tutorial?: string;
}

interface DeskState {
  session: GameSession | null;
  notice: string;
  error: string;
}

const RESTORE_NOTICES: Record<RestoreResult['status'], string> = {
  RESTORED: 'Your saved progress has been restored.',
  EMPTY: '',
  INVALID: 'Your saved progress could not be read. You can start a new stage.',
  INCOMPATIBLE:
    'Your saved progress uses an incompatible version. You can start a new stage.',
  UNAVAILABLE:
    'Saving is unavailable in this browser. You can still play while this page stays open.',
};

export function GameDesk({
  content,
  metadata,
  initialSession,
}: {
  content: ContentBundle;
  metadata: DeskMetadata;
  initialSession: GameSession;
}) {
  const [storage] = useState(browserStorage);
  const [state, dispatch] = useReducer(
    (
      current: DeskState,
      action: Action | { type: 'START_SESSION' },
    ): DeskState => {
      if (action.type === 'START_SESSION')
        return {
          session: structuredClone(initialSession),
          notice: '',
          error: '',
        };
      if (!current.session) return current;
      try {
        return {
          ...current,
          session: reduceSession(current.session, action, content),
          error: '',
        };
      } catch (error) {
        return {
          ...current,
          error:
            error instanceof Error
              ? error.message
              : 'That action could not be completed.',
        };
      }
    },
    undefined,
    () => {
      const restored = restoreSessionProgress(storage, content, initialSession);
      return {
        session: restored.session,
        notice:
          initialSession.challenge.kind === 'DAILY'
            ? RESTORE_NOTICES[restored.status].replace('stage', 'challenge')
            : RESTORE_NOTICES[restored.status],
        error: '',
      };
    },
  );
  const [saveStatus, setSaveStatus] = useState('');
  const [confirmRestart, setConfirmRestart] = useState(false);
  const { session } = state;
  const scoring = content.manifest.scoring;
  const maximumScore =
    initialSession.caseIds.length *
    (scoring.correctDecision + scoring.appropriateInquiry + scoring.efficiency);
  useEffect(() => {
    if (!session) return;
    const messages = [
      saveProgress(storage, session)
        ? 'Progress saved on this device.'
        : 'Progress cannot be saved. You can still play while this page stays open.',
    ];
    if (session.challenge.kind === 'DAILY' && session.status === 'COMPLETED') {
      const result = recordDailyResult(
        storage,
        session,
        new Date().toISOString(),
      );
      messages.push(
        result === 'SAVED' || result === 'ALREADY_SAVED'
          ? 'Your first daily result is saved. Replays do not replace it.'
          : 'The daily result could not be saved. Existing records have been kept.',
      );
    }
    setSaveStatus(messages.join(' '));
  }, [storage, session]);
  const start = () => {
    setConfirmRestart(false);
    dispatch({ type: 'START_SESSION' });
  };
  const passengerCase =
    session && session.status !== 'COMPLETED'
      ? content.cases.find(
          (item) => item.id === session.caseIds[session.passengerIndex],
        )!
      : null;
  const snapshot = passengerCase
    ? content.ruleSnapshots.find(
        (item) => item.id === passengerCase.ruleSnapshotId,
      )!
    : null;
  return (
    <>
      <header className="stage-header">
        <h2>{metadata.title}</h2>
        <p>{metadata.flightLabel}</p>
        <p>
          {metadata.departureLabel} · {initialSession.caseIds.length} passengers
        </p>
        {session && (
          <p>
            <strong>
              Score: {session.totalScore} / {maximumScore}
            </strong>
          </p>
        )}
        <p className="notice">{metadata.notice}</p>
      </header>
      {state.notice && <p role="status">{state.notice}</p>}
      {saveStatus && (
        <p role="status" className="muted">
          {saveStatus}
        </p>
      )}
      {state.error && <p role="alert">{state.error}</p>}
      {!session ? (
        <section className="panel" aria-labelledby="intro-heading">
          <h2 id="intro-heading">Open the desk</h2>
          <p>{metadata.tutorial}</p>
          <ol>
            <li>Inspect the booking and presented documents.</li>
            <li>Look up the requirements in the travel reference.</li>
            <li>Ask a targeted question when more evidence is needed.</li>
            <li>Check in, deny, or escalate, then review the explanation.</li>
          </ol>
          <p>
            No timer. A correct evidence-backed decision earns up to{' '}
            {scoring.correctDecision +
              scoring.appropriateInquiry +
              scoring.efficiency}{' '}
            points. Justified inquiries are free; an unnecessary question costs{' '}
            {scoring.extraQuestionPenalty} efficiency points.
          </p>
          <button type="button" onClick={start}>
            {initialSession.challenge.kind === 'DAILY'
              ? 'Start daily challenge'
              : 'Start stage'}
          </button>
        </section>
      ) : session.status === 'COMPLETED' ? (
        <StageSummary
          session={session}
          content={content}
          maximumScore={maximumScore}
          onRestart={start}
        />
      ) : (
        <>
          <div className="desk-layout">
            <PassengerDesk
              key={`passenger-${passengerCase!.id}`}
              session={session}
              content={content}
              dispatch={dispatch}
            />
            <Rulebook
              key={`rulebook-${passengerCase!.id}`}
              snapshot={snapshot!}
              itinerary={passengerCase!.itinerary}
              onOpenRule={(ruleId) => {
                if (session.status === 'IN_PROGRESS')
                  dispatch({ type: 'OPEN_RULE', ruleId });
              }}
            />
          </div>
          {session.status === 'AWAITING_NEXT' && (
            <ResultView
              key={passengerCase!.id}
              result={session.results.at(-1)!}
              passengerCase={passengerCase!}
              snapshot={snapshot!}
              isLast={session.passengerIndex === session.caseIds.length - 1}
              onNext={() => dispatch({ type: 'NEXT_PASSENGER' })}
              summaryLabel={
                initialSession.challenge.kind === 'DAILY'
                  ? 'View daily summary'
                  : 'View stage summary'
              }
            />
          )}
          {confirmRestart ? (
            <section className="panel" aria-label="Restart stage">
              <p>
                Restart this stage? This clears your current progress on this
                device.
              </p>
              <div className="actions">
                <button type="button" onClick={() => setConfirmRestart(false)}>
                  Keep playing
                </button>
                <button type="button" onClick={start}>
                  Restart stage
                </button>
              </div>
            </section>
          ) : (
            <button
              className="restart"
              type="button"
              onClick={() => setConfirmRestart(true)}
            >
              Restart
            </button>
          )}
        </>
      )}
    </>
  );
}
