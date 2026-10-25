import { useState } from 'react';
import type { TravelDocument } from '../core/types';
import { DOCUMENT_LABELS } from './labels';

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
  return (
    <article className="document">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`document-${document.id}`}
        onClick={() => {
          setExpanded(!expanded);
          if (!expanded) onInspect();
        }}
      >
        {expanded ? 'Close' : 'Inspect'} {label}
      </button>
      {expanded && (
        <dl id={`document-${document.id}`}>
          <dt>Holder</dt>
          <dd>{document.holder}</dd>
          <dt>Issued by</dt>
          <dd>{document.issuingCountry}</dd>
          <dt>Valid from</dt>
          <dd>{document.validFrom}</dd>
          <dt>Valid until</dt>
          <dd>{document.validUntil}</dd>
          {attributes.category && (
            <>
              <dt>Category</dt>
              <dd>{attributes.category}</dd>
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
        </dl>
      )}
    </article>
  );
}
