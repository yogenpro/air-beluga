import { useState } from 'react';
import type { TravelDocument } from '../core/types';
import { DOCUMENT_LABELS } from './labels';
import { Icon } from './Icons';
import { displayInstant } from './time';

export function DocumentView({
  document,
  inspected,
  onInspect,
}: {
  document: TravelDocument;
  inspected: boolean;
  onInspect: () => void;
}) {
  const [expanded, setExpanded] = useState(inspected);
  const label = `${DOCUMENT_LABELS[document.type]} (${document.id})`;
  const attributes = document.attributes;
  const test =
    document.type === 'COVID_TEST' ? attributes.covidTest : undefined;
  return (
    <article
      className={`document document-${document.type.toLowerCase()} ${expanded ? 'is-open' : ''}`}
    >
      <button
        type="button"
        className="document-cover"
        aria-label={`${expanded ? 'Close' : 'Inspect'} ${label}`}
        aria-expanded={expanded}
        aria-controls={`document-${document.id}`}
        onClick={() => {
          setExpanded(!expanded);
          if (!expanded) onInspect();
        }}
      >
        <Icon
          name={
            document.type === 'PASSPORT'
              ? 'globe'
              : document.type === 'ONWARD_TICKET'
                ? 'ticket'
                : 'book'
          }
        />
        <span>
          <strong>{DOCUMENT_LABELS[document.type]}</strong>
          <small>
            {document.issuingCountry} ·{' '}
            {expanded ? 'Close document' : 'Inspect document'}
          </small>
        </span>
        <span className="document-toggle" aria-hidden="true">
          {expanded ? '−' : '+'}
        </span>
      </button>
      {expanded && (
        <dl id={`document-${document.id}`}>
          <dt>Holder</dt>
          <dd>{document.holder}</dd>
          {attributes.number && (
            <>
              <dt>Document number</dt>
              <dd>{attributes.number}</dd>
            </>
          )}
          <dt>Issued by</dt>
          <dd>{document.issuingCountry}</dd>
          {document.type !== 'COVID_TEST' && (
            <>
              <dt>Valid from</dt>
              <dd>{document.validFrom}</dd>
              <dt>Valid until</dt>
              <dd>{document.validUntil}</dd>
            </>
          )}
          {test && (
            <>
              <dt>Sample collected</dt>
              <dd>
                {test.sampleCollectedAt
                  ? displayInstant(test.sampleCollectedAt)
                  : test.sampleTimeLabel}
              </dd>
              <dt>Report issued</dt>
              <dd>{displayInstant(test.reportedAt)}</dd>
              <dt>Test method</dt>
              <dd>{test.method}</dd>
              <dt>Result</dt>
              <dd>{test.result.toLowerCase()}</dd>
              <dt>Laboratory</dt>
              <dd>{test.laboratory}</dd>
              <dt>Collection site</dt>
              <dd>{test.laboratoryLocation}</dd>
              <dt>Laboratory identity</dt>
              <dd>
                {test.laboratoryIdentity === 'CONFIRMED'
                  ? 'Confirmed in this fictional report'
                  : 'Unresolved — verify the report'}
              </dd>
            </>
          )}
          {attributes.category && (
            <>
              <dt>Category</dt>
              <dd>{attributes.category}</dd>
            </>
          )}
          {attributes.passportKind && (
            <>
              <dt>Passport type</dt>
              <dd>{attributes.passportKind.toLowerCase()}</dd>
            </>
          )}
          {attributes.biometric !== undefined && (
            <>
              <dt>Electronic passport</dt>
              <dd>
                {attributes.biometric
                  ? 'Yes · electronic chip'
                  : 'No · non-electronic'}
              </dd>
            </>
          )}
          {attributes.documentCode && (
            <>
              <dt>Document form</dt>
              <dd>{attributes.documentCode}</dd>
            </>
          )}
          {attributes.destinationCountry && (
            <>
              <dt>Destination country</dt>
              <dd>{attributes.destinationCountry}</dd>
            </>
          )}
          {attributes.entriesRemaining !== undefined && (
            <>
              <dt>Entries remaining</dt>
              <dd>{attributes.entriesRemaining}</dd>
            </>
          )}
          {attributes.status && (
            <>
              <dt>Status</dt>
              <dd>{attributes.status}</dd>
            </>
          )}
          {attributes.bookingReference && (
            <>
              <dt>Booking reference</dt>
              <dd>{attributes.bookingReference}</dd>
            </>
          )}
          {attributes.linkedPassportNumber && (
            <>
              <dt>Linked passport number</dt>
              <dd>{attributes.linkedPassportNumber}</dd>
            </>
          )}
        </dl>
      )}
    </article>
  );
}
