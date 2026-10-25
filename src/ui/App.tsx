import { useEffect, useReducer, useState } from 'react';
import { loadBrowserContent } from '../content/browser';
import type { Action } from '../core/actions';
import { createStageSession, reduceSession } from '../core/engine';
import type { ContentBundle, GameSession, Stage } from '../core/types';
import {
  browserStorage,
  restoreProgress,
  saveProgress,
  type RestoreResult,
} from '../storage/progress';
import { PassengerDesk } from './PassengerDesk';
import { ResultView } from './ResultView';
import { Rulebook } from './Rulebook';
import { StageSummary } from './StageSummary';

type LoadState =
  | { status: 'LOADING' }
  | { status: 'ERROR' }
  | { status: 'READY'; content: ContentBundle };
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

function StageGame({
  content,
  stage,
}: {
  content: ContentBundle;
  stage: Stage;
}) {
  const [storage] = useState(browserStorage);
  const [state, dispatch] = useReducer(
    (
      current: DeskState,
      action: Action | { type: 'START_STAGE' },
    ): DeskState => {
      if (action.type === 'START_STAGE')
        return {
          session: createStageSession(content, stage.id),
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
      const restored = restoreProgress(storage, content, stage.id);
      return {
        session: restored.session,
        notice: RESTORE_NOTICES[restored.status],
        error: '',
      };
    },
  );
  const [saveStatus, setSaveStatus] = useState('');
  const [confirmRestart, setConfirmRestart] = useState(false);
  const { session } = state;
  const scoring = content.manifest.scoring;
  const maximumScore =
    stage.caseIds.length *
    (scoring.correctDecision + scoring.appropriateInquiry + scoring.efficiency);
  useEffect(() => {
    if (!session) return;
    setSaveStatus(
      saveProgress(storage, session)
        ? 'Progress saved on this device.'
        : 'Progress cannot be saved. You can still play while this page stays open.',
    );
  }, [storage, session]);
  const start = () => {
    setConfirmRestart(false);
    dispatch({ type: 'START_STAGE' });
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
        <h2>{stage.title}</h2>
        <p>{stage.flightLabel}</p>
        <p>
          Departure:{' '}
          {stage.scheduledDeparture.replace('T', ' ').replace('Z', ' UTC')} ·{' '}
          {stage.caseIds.length} passengers
        </p>
        {session && (
          <p>
            <strong>
              Score: {session.totalScore} / {maximumScore}
            </strong>
          </p>
        )}
        <p className="notice">{stage.notice}</p>
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
          <p>{stage.tutorial}</p>
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
            Start stage
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

export function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'LOADING' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoadState({ status: 'LOADING' });
    loadBrowserContent().then(
      (content) => {
        if (!cancelled) setLoadState({ status: 'READY', content });
      },
      () => {
        if (!cancelled) setLoadState({ status: 'ERROR' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  return (
    <>
      <a className="skip-link" href="#desk">
        Skip to check-in desk
      </a>
      <main id="desk">
        <h1>Air Beluga</h1>
        <p>
          A travel-document puzzle. You decide airline acceptance; border
          admission is a separate decision.
        </p>
        {loadState.status === 'LOADING' && (
          <p role="status">Loading training content…</p>
        )}
        {loadState.status === 'ERROR' && (
          <section className="panel" role="alert">
            <h2>Unable to load training content</h2>
            <p>
              Check your connection and try again. Your saved progress has not
              been changed.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry loading
            </button>
          </section>
        )}
        {loadState.status === 'READY' && (
          <StageGame
            content={loadState.content}
            stage={loadState.content.stages[0]!}
          />
        )}
        <footer>
          <p>
            Educational puzzle; not an authoritative tool for real travel
            decisions. Verify requirements with official sources and your
            airline before travel.
          </p>
        </footer>
      </main>
    </>
  );
}
