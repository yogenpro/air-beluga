import { useEffect, useRef } from 'react';
import type { Action } from '../core/actions';
import { getPassengerView } from '../core/engine';
import type { ContentBundle, GameSession } from '../core/types';
import { DocumentView } from './DocumentView';
import { DECISION_LABELS } from './labels';
import { Icon, PassengerPortrait } from './Icons';
import { displayInstant } from './time';
export function PassengerDesk({
  session,
  content,
  dispatch,
  onOpenReference,
}: {
  session: GameSession;
  content: ContentBundle;
  dispatch: (action: Action) => void;
  onOpenReference: () => void;
}) {
  const view = getPassengerView(session, content);
  const active = session.status === 'IN_PROGRESS';
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (active) heading.current?.focus();
  }, [view.id, active]);
  return (
    <section
      aria-labelledby="passenger-heading"
      className="panel passenger-panel"
    >
      <header className="passenger-welcome">
        <PassengerPortrait name={view.passenger.displayName} />
        <div>
          <p className="eyebrow">
            PASSENGER {session.passengerIndex + 1} OF {session.caseIds.length}
          </p>
          <h2 id="passenger-heading" tabIndex={-1} ref={heading}>
            <span className="sr-only">
              Passenger {session.passengerIndex + 1} of {session.caseIds.length}
              :{' '}
            </span>
            {view.passenger.displayName}
          </h2>
          <p>Ready for their next chapter.</p>
        </div>
        <a
          className="manual-shortcut"
          href="#rulebook-heading"
          onClick={onOpenReference}
          aria-label="Open travel reference"
        >
          <Icon name="book" />
          <span>Travel reference</span>
        </a>
      </header>
      <div className="booking-slip">
        <div className="slip-topline">
          <span className="eyebrow">
            <Icon name="ticket" /> BOOKING ITINERARY
          </span>
          <span>AIR BELUGA</span>
        </div>
        <ol className="itinerary">
          {view.itinerary.map((leg, index) => (
            <li key={index}>
              <span className="route-airport">{leg.from}</span>
              <span className="route-line">
                <Icon name="plane" />
              </span>
              <span className="route-airport">{leg.to}</span>
              <span className="leg-description">
                {leg.destinationCountry}
                {leg.transit !== 'NONE' &&
                  ` · ${leg.transit === 'AIRSIDE' ? 'Airside' : 'Landside'} connection`}
                {leg.separateTicket && ' · Separate ticket'}
              </span>
              {leg.scheduledDeparture && (
                <span className="leg-description">
                  Scheduled departure: {displayInstant(leg.scheduledDeparture)}
                </span>
              )}
            </li>
          ))}
        </ol>
        <dl className="passenger-facts">
          <div>
            <dt>Nationality</dt>
            <dd>{view.passenger.nationality}</dd>
          </div>
          <div>
            <dt>Travel date</dt>
            <dd>{view.travelDate}</dd>
          </div>
          {view.historical && (
            <div>
              <dt>Historical rules date</dt>
              <dd>{view.rulesDate}</dd>
            </div>
          )}
          {view.passenger.residence && (
            <div>
              <dt>Residence status</dt>
              <dd>
                {view.passenger.residence.country} ·{' '}
                {view.passenger.residence.status === 'STUDENT'
                  ? 'Student'
                  : 'Permanent resident'}
              </dd>
            </div>
          )}
        </dl>
      </div>
      <div className="passenger-speech">
        <span className="speech-label">
          <Icon name="chat" /> AT THE COUNTER
        </span>
        {view.clues.map((clue) => (
          <p key={clue}>{clue}</p>
        ))}
      </div>
      {view.assumptions.length > 0 && (
        <details className="case-facts">
          <summary>Established case facts</summary>
          {view.assumptions.map((fact) => (
            <p key={fact}>{fact}</p>
          ))}
        </details>
      )}
      <div className="document-tray">
        <h3>
          Presented documents{' '}
          <span className="count-badge">{view.documents.length}</span>
        </h3>
        <p className="section-hint">Open a document to take a closer look.</p>
        <div className="document-grid">
          {view.documents.map((document) => (
            <DocumentView
              key={document.id}
              document={document}
              inspected={session.inspectedDocumentIds.includes(document.id)}
              onInspect={() => {
                if (active)
                  dispatch({
                    type: 'INSPECT_DOCUMENT',
                    documentId: document.id,
                  });
              }}
            />
          ))}
        </div>
        {view.documents.length === 0 && (
          <p>No documents have been presented.</p>
        )}
      </div>
      <div className="questions-panel">
        <h3>Ask the passenger</h3>
        <p className="section-hint">
          A good question can make all the difference.
        </p>
        <div className="question-options">
          {view.questions.map((question) => (
            <button
              key={question.id}
              type="button"
              disabled={
                !active || session.askedQuestionIds.includes(question.id)
              }
              onClick={() =>
                dispatch({ type: 'ASK_QUESTION', questionId: question.id })
              }
            >
              <Icon
                name={
                  session.askedQuestionIds.includes(question.id)
                    ? 'check'
                    : 'chat'
                }
              />
              <span>
                {question.label}
                {session.askedQuestionIds.includes(question.id)
                  ? ' · Asked'
                  : ''}
              </span>
            </button>
          ))}
        </div>
        {view.questions.length === 0 && (
          <p className="muted">No additional questions for this passenger.</p>
        )}
        <div aria-live="polite" aria-label="Responses and check results">
          {view.responses.map((response) => (
            <p key={response.questionId} className="response">
              {response.response}
            </p>
          ))}
        </div>
      </div>
      <fieldset className="decision-panel" disabled={!active}>
        <legend>Your decision</legend>
        <p>Have everything you need? Make the call.</p>
        <div className="decision-actions">
          {(['CHECK_IN', 'DENY', 'ESCALATE'] as const).map((decision) => (
            <button
              type="button"
              key={decision}
              className={`decision-${decision.toLowerCase()}`}
              onClick={() => dispatch({ type: 'SUBMIT_DECISION', decision })}
            >
              <Icon
                name={
                  decision === 'CHECK_IN'
                    ? 'check'
                    : decision === 'DENY'
                      ? 'close'
                      : 'arrow'
                }
              />
              {DECISION_LABELS[decision]}
            </button>
          ))}
        </div>
        <p className="decision-hint">
          Each decision is final. You’ll see the reasoning next.
        </p>
      </fieldset>
    </section>
  );
}
