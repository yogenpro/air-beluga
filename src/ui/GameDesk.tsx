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
import { Icon } from './Icons';

export interface DeskMetadata {
  title: string;
  flightLabel: string;
  departureLabel: string;
  notice: string;
  tutorial?: string;
  kind: 'DAILY' | 'PRACTICE' | 'TRAINING';
  airport: string;
}

interface DeskState {
  session: GameSession | null;
  notice: string;
  error: string;
}

const RESTORE_NOTICES: Record<RestoreResult['status'], string> = {
  RESTORED: 'Your saved progress has been restored.',
  EMPTY: '',
  INVALID: 'Your saved progress could not be read. You can start a new shift.',
  INCOMPATIBLE:
    'Your saved progress uses an incompatible version. You can start a new shift.',
  UNAVAILABLE:
    'Saving is unavailable in this browser. You can still play while this page stays open.',
};

export function GameDesk({
  content,
  metadata,
  initialSession,
  onExit,
}: {
  content: ContentBundle;
  metadata: DeskMetadata;
  initialSession: GameSession;
  onExit: () => void;
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
  const [pane, setPane] = useState<'PASSENGER' | 'REFERENCE'>('PASSENGER');
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
    setPane('PASSENGER');
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
    <div className="shift-workspace">
      <header className="shift-strip">
        <div className="counter-sign">
          <Icon name="plane" />
          <span>
            {metadata.airport}
            <small>COUNTER 01</small>
          </span>
        </div>
        <div className="shift-identity">
          <p className="eyebrow">
            {metadata.kind === 'DAILY'
              ? 'DAILY SHIFT'
              : metadata.kind === 'TRAINING'
                ? 'TRAINING DESK'
                : 'PRACTICE SHIFT'}
          </p>
          <h2>{metadata.title}</h2>
          <p>{metadata.departureLabel}</p>
        </div>
        <div className="shift-score">
          <span>
            {session
              ? `${session.results.length} / ${session.caseIds.length} reviewed`
              : `${initialSession.caseIds.length} passengers`}
          </span>
          {session ? (
            <strong>
              Score: {session.totalScore} / {maximumScore}
            </strong>
          ) : (
            <strong>At your own pace</strong>
          )}
        </div>
      </header>
      {session && (
        <div
          className="queue-progress"
          aria-label={`${session.results.length} of ${session.caseIds.length} passengers reviewed`}
        >
          {session.caseIds.map((id, index) => (
            <span
              key={id}
              className={
                index < session.results.length
                  ? 'reviewed'
                  : index === session.passengerIndex
                    ? 'current'
                    : ''
              }
            />
          ))}
        </div>
      )}
      <p
        className={`notice ${metadata.kind === 'TRAINING' ? 'illustrative-notice' : ''}`}
      >
        {metadata.notice}
      </p>
      <div className="save-notices">
        {state.notice && <p role="status">{state.notice}</p>}
        {saveStatus && (
          <p role="status" className="muted">
            {saveStatus}
          </p>
        )}
      </div>
      {state.error && (
        <p className="notice" role="alert">
          {state.error}
        </p>
      )}
      {!session ? (
        <section className="panel briefing" aria-labelledby="intro-heading">
          <div className="briefing-copy">
            <p className="eyebrow">A FEW THINGS BEFORE WE BEGIN</p>
            <h2 id="intro-heading">Make yourself comfortable.</h2>
            <p>{metadata.tutorial}</p>
            <ol className="briefing-steps">
              <li>
                <strong>Meet your passenger</strong>
                <span>
                  Read their booking and the documents they’ve brought.
                </span>
              </li>
              <li>
                <strong>Put the pieces together</strong>
                <span>
                  Consult your travel reference. Ask a question if something’s
                  missing.
                </span>
              </li>
              <li>
                <strong>Make the call</strong>
                <span>
                  Check in, deny, or escalate. You’ll learn the reasoning after
                  every decision.
                </span>
              </li>
            </ol>
            <button type="button" className="button-primary" onClick={start}>
              {initialSession.challenge.kind === 'DAILY'
                ? 'Start daily shift'
                : 'Start shift'}
              <Icon name="arrow" />
            </button>
            <details className="scoring-help">
              <summary>How your shift is scored</summary>
              <p>
                No timer. A correct evidence-backed decision earns up to{' '}
                {scoring.correctDecision +
                  scoring.appropriateInquiry +
                  scoring.efficiency}{' '}
                points. Justified inquiries are free; each unnecessary question
                costs {scoring.extraQuestionPenalty} efficiency points. You can
                always finish your shift, even after a mistake.
              </p>
            </details>
          </div>
          <div className="briefing-art" aria-hidden="true">
            <div className="paper-ticket">
              <span>AIR BELUGA</span>
              <Icon name="plane" />
              <strong>{metadata.airport}</strong>
              <span>YOUR DESK. THEIR JOURNEY.</span>
              <div className="ticket-barcode" />
            </div>
            <div className="mini-passport">
              <Icon name="globe" />
              <span>PASSPORT</span>
            </div>
            <div className="briefing-sticker">
              ASK GOOD
              <br />
              QUESTIONS.
            </div>
          </div>
        </section>
      ) : session.status === 'COMPLETED' ? (
        <StageSummary
          session={session}
          content={content}
          maximumScore={maximumScore}
          onRestart={start}
          onExit={onExit}
        />
      ) : (
        <>
          <nav className="desk-tabs" aria-label="Desk panels">
            <button
              type="button"
              aria-pressed={pane === 'PASSENGER'}
              aria-controls="passenger-pane"
              onClick={() => setPane('PASSENGER')}
            >
              <Icon name="ticket" />
              Passenger
            </button>
            <button
              type="button"
              aria-pressed={pane === 'REFERENCE'}
              aria-controls="reference-pane"
              onClick={() => setPane('REFERENCE')}
            >
              <Icon name="book" />
              Travel reference
            </button>
          </nav>
          <div className="desk-layout">
            <div
              id="passenger-pane"
              className="passenger-pane"
              data-mobile-active={pane === 'PASSENGER'}
            >
              <PassengerDesk
                key={`passenger-${passengerCase!.id}`}
                session={session}
                content={content}
                dispatch={dispatch}
                onOpenReference={() => setPane('REFERENCE')}
              />
            </div>
            <div
              id="reference-pane"
              className="reference-pane"
              data-mobile-active={pane === 'REFERENCE'}
            >
              <Rulebook
                key={`rulebook-${passengerCase!.id}`}
                snapshot={snapshot!}
                itinerary={passengerCase!.itinerary}
                onBack={() => setPane('PASSENGER')}
                onOpenRule={(ruleId) => {
                  if (session.status === 'IN_PROGRESS')
                    dispatch({ type: 'OPEN_RULE', ruleId });
                }}
              />
            </div>
          </div>
          {session.status === 'AWAITING_NEXT' && (
            <ResultView
              key={passengerCase!.id}
              result={session.results.at(-1)!}
              passengerCase={passengerCase!}
              snapshot={snapshot!}
              isLast={session.passengerIndex === session.caseIds.length - 1}
              onNext={() => {
                setPane('PASSENGER');
                dispatch({ type: 'NEXT_PASSENGER' });
              }}
              summaryLabel="View shift report"
            />
          )}
          {confirmRestart ? (
            <section
              className="panel restart-confirmation"
              aria-label="Restart shift"
            >
              <p>
                Restart this shift? This clears your current progress on this
                device. Your first completed daily result is kept.
              </p>
              <div className="actions">
                <button type="button" onClick={() => setConfirmRestart(false)}>
                  Keep playing
                </button>
                <button type="button" onClick={start}>
                  Restart shift
                </button>
              </div>
            </section>
          ) : (
            <button
              className="restart text-button"
              type="button"
              onClick={() => setConfirmRestart(true)}
            >
              Restart
            </button>
          )}
        </>
      )}
    </div>
  );
}
