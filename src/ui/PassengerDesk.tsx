import { useEffect, useRef } from 'react';
import type { Action } from '../core/actions';
import { getPassengerView } from '../core/engine';
import type { ContentBundle, GameSession } from '../core/types';
import { DocumentView } from './DocumentView';
import { DECISION_LABELS } from './labels';

export function PassengerDesk({
  session,
  content,
  dispatch,
}: {
  session: GameSession;
  content: ContentBundle;
  dispatch: (action: Action) => void;
}) {
  const view = getPassengerView(session, content);
  const active = session.status === 'IN_PROGRESS';
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (active) heading.current?.focus();
  }, [view.id, active]);
  return (
    <section aria-labelledby="passenger-heading" className="panel">
      <h2 id="passenger-heading" tabIndex={-1} ref={heading}>
        Passenger {session.passengerIndex + 1} of {session.caseIds.length}:{' '}
        {view.passenger.displayName}
      </h2>
      <p>
        <a href="#rulebook-heading">Open travel reference</a>
      </p>
      <dl>
        <dt>Nationality</dt>
        <dd>{view.passenger.nationality}</dd>
        <dt>Travel date</dt>
        <dd>{view.travelDate}</dd>
      </dl>
      <h3>Booking itinerary</h3>
      <ol>
        {view.itinerary.map((leg, index) => (
          <li key={index}>
            {leg.from} → {leg.to} ({leg.destinationCountry})
            {leg.transit !== 'NONE' &&
              ` · ${leg.transit === 'AIRSIDE' ? 'Airside' : 'Landside'} connection`}
            {leg.separateTicket && ' · Separate ticket'}
          </li>
        ))}
      </ol>
      <h3>At the counter</h3>
      {view.clues.map((clue) => (
        <p key={clue}>{clue}</p>
      ))}
      <h3>Presented documents</h3>
      {view.documents.length === 0 && <p>No documents have been presented.</p>}
      {view.documents.map((document) => (
        <DocumentView
          key={document.id}
          document={document}
          inspected={session.inspectedDocumentIds.includes(document.id)}
          onInspect={() => {
            if (active)
              dispatch({ type: 'INSPECT_DOCUMENT', documentId: document.id });
          }}
        />
      ))}
      <h3>Ask the passenger</h3>
      <div className="actions">
        {view.questions.map((question) => (
          <button
            key={question.id}
            type="button"
            disabled={!active || session.askedQuestionIds.includes(question.id)}
            onClick={() =>
              dispatch({ type: 'ASK_QUESTION', questionId: question.id })
            }
          >
            {question.label}
            {session.askedQuestionIds.includes(question.id) ? ' · Asked' : ''}
          </button>
        ))}
      </div>
      {view.questions.length === 0 && (
        <p>No additional questions are offered for this passenger.</p>
      )}
      <div aria-live="polite" aria-label="Passenger responses">
        {view.responses.map((response) => (
          <p key={response.questionId} className="response">
            {response.response}
          </p>
        ))}
      </div>
      <fieldset disabled={!active}>
        <legend>Disposition</legend>
        <p>Commit when you have enough evidence. Each decision is final.</p>
        <div className="actions">
          {(['CHECK_IN', 'DENY', 'ESCALATE'] as const).map((decision) => (
            <button
              type="button"
              key={decision}
              onClick={() => dispatch({ type: 'SUBMIT_DECISION', decision })}
            >
              {DECISION_LABELS[decision]}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
