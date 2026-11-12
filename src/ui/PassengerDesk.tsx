import { useEffect, useRef } from 'react';
import type { Action } from '../core/actions';
import { getPassengerView } from '../core/engine';
import type { ContentBundle, GameSession } from '../core/types';
import { DocumentView } from './DocumentView';
import {
  airportCity,
  countryName,
  DECISION_GUIDES,
  DECISION_LABELS,
  isBoilerplateAssumption,
} from './labels';
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

  const specificFacts = view.assumptions.filter(
    (fact) => !isBoilerplateAssumption(fact),
  );
  const standardFacts = view.assumptions.filter((fact) =>
    isBoilerplateAssumption(fact),
  );
  const presentedPassport = view.documents.find(
    (doc) => doc.type === 'PASSPORT' || doc.type === 'TRAVEL_DOCUMENT',
  );
  const flightDeparture = view.itinerary[0]?.scheduledDeparture;

  return (
    <section
      aria-labelledby="passenger-heading"
      className="panel passenger-panel"
    >
      <header className="passenger-welcome">
        <PassengerPortrait name={view.passenger.displayName} />
        <div className="passenger-title-block">
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
          <p>Check-in counter inspection</p>
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
            <Icon name="ticket" /> BOOKING ITINERARY &amp; PASSENGER PROFILE
          </span>
          <span className="slip-carrier">AIR BELUGA</span>
        </div>

        <dl className="passenger-facts">
          <div className="fact-card">
            <dt>Nationality</dt>
            <dd>
              <strong>{view.passenger.nationality}</strong>{' '}
              <span className="fact-sub">
                {countryName(view.passenger.nationality)}
              </span>
            </dd>
          </div>
          <div className="fact-card">
            <dt>Travel date</dt>
            <dd className="doc-mono">{view.travelDate}</dd>
          </div>
          {view.historical && (
            <div className="fact-card fact-card-warn">
              <dt>Historical rules date</dt>
              <dd className="doc-mono">{view.rulesDate}</dd>
            </div>
          )}
          {view.passenger.residence && (
            <div className="fact-card fact-card-accent">
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

        <ol className="itinerary">
          {view.itinerary.map((leg, index) => {
            const isGround = leg.transportMode === 'GROUND';
            const isLandside = leg.transit === 'LANDSIDE';
            const isAirside = leg.transit === 'AIRSIDE';
            return (
              <li
                key={index}
                className={`itinerary-leg ${isGround || isLandside ? 'leg-entry-required' : ''}`}
              >
                <div className="leg-endpoint">
                  <span className="route-airport">{leg.from}</span>
                  <span className="route-city" aria-hidden="true">
                    {airportCity(leg.from)}
                  </span>
                </div>
                <div className="route-line">
                  <span className="route-icon-wrap">
                    <Icon name={isGround ? 'arrow' : 'plane'} />
                  </span>
                  <div className="route-badges" aria-hidden="true">
                    {isGround && (
                      <span className="leg-badge badge-danger">
                        Ground transfer · Enters{' '}
                        {countryName(leg.destinationCountry)}
                      </span>
                    )}
                    {!isGround && isLandside && (
                      <span className="leg-badge badge-warn">
                        Landside connection · Clears immigration
                      </span>
                    )}
                    {isAirside && (
                      <span className="leg-badge badge-teal">
                        Airside transit · No border entry
                      </span>
                    )}
                    {leg.transit === 'NONE' && (
                      <span className="leg-badge badge-ok">
                        Destination · {countryName(leg.destinationCountry)}
                      </span>
                    )}
                    {leg.separateTicket && (
                      <span className="leg-badge badge-warn">
                        Separate ticket
                      </span>
                    )}
                  </div>
                </div>
                <div className="leg-endpoint leg-endpoint-to">
                  <span className="route-airport">{leg.to}</span>
                  <span className="route-city" aria-hidden="true">
                    {airportCity(leg.to)}
                  </span>
                </div>
                <div className="leg-meta-row">
                  <span className="leg-description">
                    {leg.destinationCountry}
                    {leg.transportMode === 'GROUND' && ' · Ground transfer'}
                    {leg.transit !== 'NONE' &&
                      ` · ${leg.transit === 'AIRSIDE' ? 'Airside' : 'Landside'} connection`}
                    {leg.separateTicket && ' · Separate ticket'}
                  </span>
                  {leg.scheduledDeparture && (
                    <span className="leg-description leg-clock">
                      Scheduled departure:{' '}
                      {displayInstant(leg.scheduledDeparture)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="counter-brief-grid">
        <div className="passenger-speech">
          <span className="speech-label">
            <Icon name="chat" /> AT THE COUNTER
          </span>
          {view.clues.map((clue) => (
            <p key={clue}>“{clue}”</p>
          ))}
        </div>

        {specificFacts.length > 0 && (
          <div className="case-specific-facts">
            <span className="speech-label">
              <Icon name="info" /> KEY SITUATION FACTS
            </span>
            {specificFacts.map((fact) => (
              <p key={fact}>{fact}</p>
            ))}
          </div>
        )}
      </div>

      {standardFacts.length > 0 && (
        <details className="case-facts">
          <summary>Established case facts</summary>
          {standardFacts.map((fact) => (
            <p key={fact}>{fact}</p>
          ))}
        </details>
      )}

      <div className="document-tray">
        <div className="section-header-row">
          <div>
            <h3>
              Presented documents{' '}
              <span className="count-badge">{view.documents.length}</span>
            </h3>
            <p className="section-hint">
              Click any document to inspect its full details and verification
              badges.
            </p>
          </div>
        </div>
        <div className="document-grid">
          {view.documents.map((document) => (
            <DocumentView
              key={document.id}
              document={document}
              inspected={session.inspectedDocumentIds.includes(document.id)}
              travelDate={view.travelDate}
              passengerName={view.passenger.displayName}
              flightDeparture={flightDeparture}
              presentedPassportNumber={presentedPassport?.attributes.number}
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
        <div className="section-header-row">
          <div>
            <h3>Ask the passenger &amp; run checks</h3>
            <p className="section-hint">
              Verify missing permissions or resolve conflicts before deciding.
              Relevant checks are free; unnecessary ones cost 2 pts.
            </p>
          </div>
          {view.questions.length > 0 && (
            <span className="inquiry-counter" aria-hidden="true">
              {session.askedQuestionIds.length} / {view.questions.length} used
            </span>
          )}
        </div>
        <div className="question-options">
          {view.questions.map((question) => {
            const asked = session.askedQuestionIds.includes(question.id);
            const isSystemCheck = question.kind === 'DOCUMENT_CHECK';
            return (
              <button
                key={question.id}
                type="button"
                className={`question-btn ${asked ? 'is-asked' : ''} ${isSystemCheck ? 'is-system-check' : ''}`}
                aria-label={
                  asked ? `${question.label} · Asked` : question.label
                }
                disabled={!active || asked}
                onClick={() =>
                  dispatch({ type: 'ASK_QUESTION', questionId: question.id })
                }
              >
                <Icon
                  name={asked ? 'check' : isSystemCheck ? 'chip' : 'chat'}
                />
                <span className="question-kind-tag" aria-hidden="true">
                  {isSystemCheck ? 'SYSTEM CHECK' : 'ASK PASSENGER'}
                </span>
                <span className="question-label-text">
                  {question.label}
                  {asked ? ' · Asked' : ''}
                </span>
              </button>
            );
          })}
        </div>
        {view.questions.length === 0 && (
          <p className="muted">No additional questions for this passenger.</p>
        )}
        <div
          aria-live="polite"
          aria-label="Responses and check results"
          className="responses-container"
        >
          {view.responses.map((response) => {
            const q = view.questions.find(
              (item) => item.id === response.questionId,
            );
            return (
              <div key={response.questionId} className="response-card">
                {q && (
                  <span className="response-origin" aria-hidden="true">
                    <Icon
                      name={q.kind === 'DOCUMENT_CHECK' ? 'chip' : 'chat'}
                    />
                    {q.label}
                  </span>
                )}
                <p className="response">{response.response}</p>
              </div>
            );
          })}
        </div>
      </div>

      <fieldset className="decision-panel" disabled={!active}>
        <legend>Your decision</legend>
        <p>
          Complete any needed checks first — premature decisions fail if
          required evidence is still missing.
        </p>
        <div className="decision-actions">
          {(['CHECK_IN', 'DENY', 'ESCALATE'] as const).map((decision) => (
            <button
              type="button"
              key={decision}
              aria-label={DECISION_LABELS[decision]}
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
              <span>{DECISION_LABELS[decision]}</span>
            </button>
          ))}
        </div>
        <div className="decision-guides" aria-hidden="true">
          {(['CHECK_IN', 'DENY', 'ESCALATE'] as const).map((decision) => (
            <span key={decision} className="decision-guide-item">
              {DECISION_GUIDES[decision]}
            </span>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
