import { useState } from 'react';
import type { TravelDocument } from '../core/types';
import { countryName, DOCUMENT_LABELS } from './labels';
import { Icon, type IconName } from './Icons';
import { displayInstant } from './time';

function documentIcon(type: TravelDocument['type']): IconName {
  switch (type) {
    case 'PASSPORT':
      return 'globe';
    case 'ONWARD_TICKET':
      return 'ticket';
    case 'COVID_TEST':
      return 'lab';
    case 'ELECTRONIC_AUTHORIZATION':
      return 'chip';
    case 'RESIDENCE_PERMIT':
    case 'STUDY_PERMIT':
    case 'PERMANENT_RESIDENT_TRAVEL_DOCUMENT':
      return 'shield';
    default:
      return 'book';
  }
}

export function DocumentView({
  document,
  inspected,
  onInspect,
  travelDate,
  passengerName,
  flightDeparture,
  presentedPassportNumber,
}: {
  document: TravelDocument;
  inspected: boolean;
  onInspect: () => void;
  travelDate?: string;
  passengerName?: string;
  flightDeparture?: string;
  presentedPassportNumber?: string;
}) {
  const [expanded, setExpanded] = useState(inspected);
  const label = `${DOCUMENT_LABELS[document.type]} (${document.id})`;
  const attributes = document.attributes;
  const test =
    document.type === 'COVID_TEST' ? attributes.covidTest : undefined;

  const isExpired =
    document.type !== 'COVID_TEST' && Boolean(travelDate)
      ? document.validUntil < travelDate!
      : false;

  const daysRemaining =
    document.type !== 'COVID_TEST' && travelDate && !isExpired
      ? Math.round(
          (Date.parse(`${document.validUntil}T00:00:00Z`) -
            Date.parse(`${travelDate}T00:00:00Z`)) /
            86_400_000,
        )
      : undefined;

  const holderMismatch = Boolean(
    passengerName && document.holder !== passengerName,
  );

  const linkMismatch = Boolean(
    presentedPassportNumber &&
    attributes.linkedPassportNumber &&
    attributes.linkedPassportNumber !== presentedPassportNumber,
  );

  const elapsedHours =
    test?.sampleCollectedAt && flightDeparture
      ? Math.round(
          ((Date.parse(flightDeparture) - Date.parse(test.sampleCollectedAt)) /
            3_600_000) *
            10,
        ) / 10
      : undefined;

  return (
    <article
      className={`document document-${document.type.toLowerCase()} ${expanded ? 'is-open' : ''} ${inspected ? 'is-inspected' : ''}`}
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
        <span className="document-cover-icon" aria-hidden="true">
          <Icon name={documentIcon(document.type)} />
        </span>
        <span className="document-cover-main">
          <span className="document-cover-top">
            <strong>{DOCUMENT_LABELS[document.type]}</strong>
            {attributes.documentCode && (
              <span className="doc-pill doc-pill-code">
                {attributes.documentCode}
              </span>
            )}
            {attributes.passportKind &&
              attributes.passportKind !== 'ORDINARY' && (
                <span className="doc-pill doc-pill-warn">
                  {attributes.passportKind}
                </span>
              )}
            {attributes.biometric === false && (
              <span className="doc-pill doc-pill-warn">Non-electronic</span>
            )}
            {attributes.biometric === true && (
              <span className="doc-pill doc-pill-neutral">e-Passport</span>
            )}
          </span>
          <small className="document-cover-sub">
            <span>
              {document.issuingCountry} ({countryName(document.issuingCountry)})
            </span>
            {document.type !== 'COVID_TEST' && (
              <span>
                {' · '}
                {isExpired ? (
                  <span className="doc-inline-alert">
                    Expired {document.validUntil}
                  </span>
                ) : daysRemaining !== undefined && daysRemaining < 30 ? (
                  <span className="doc-inline-warn">
                    {daysRemaining}d left ({document.validUntil})
                  </span>
                ) : daysRemaining !== undefined && daysRemaining < 180 ? (
                  <span className="doc-inline-warn">
                    &lt; 6 mo left ({document.validUntil})
                  </span>
                ) : (
                  `Until ${document.validUntil}`
                )}
              </span>
            )}
            {test && (
              <span>
                {' · '}
                {test.method} · {test.result}
                {elapsedHours !== undefined
                  ? ` · ${elapsedHours}h before flight`
                  : ' · Offset missing'}
              </span>
            )}
          </small>
        </span>
        <span className="document-cover-right" aria-hidden="true">
          {holderMismatch && (
            <span className="doc-pill doc-pill-danger">Name mismatch</span>
          )}
          {isExpired && (
            <span className="doc-pill doc-pill-danger">Expired</span>
          )}
          {attributes.entriesRemaining === 0 && (
            <span className="doc-pill doc-pill-danger">0 entries</span>
          )}
          {linkMismatch && (
            <span className="doc-pill doc-pill-danger">Passport mismatch</span>
          )}
          <span className="document-toggle-badge">
            {expanded ? 'Close −' : 'Inspect +'}
          </span>
        </span>
      </button>
      {expanded && (
        <dl id={`document-${document.id}`} className="document-details">
          <div className="doc-field">
            <dt>Holder</dt>
            <dd>
              <span>{document.holder}</span>
              {holderMismatch ? (
                <span className="doc-pill doc-pill-danger">
                  Mismatch ({passengerName})
                </span>
              ) : (
                passengerName && (
                  <span className="doc-pill doc-pill-ok">Matches booking</span>
                )
              )}
            </dd>
          </div>
          {attributes.number && (
            <div className="doc-field">
              <dt>Document number</dt>
              <dd className="doc-mono">{attributes.number}</dd>
            </div>
          )}
          <div className="doc-field">
            <dt>Issued by</dt>
            <dd>
              <strong>{document.issuingCountry}</strong>{' '}
              <span className="muted">
                ({countryName(document.issuingCountry)})
              </span>
            </dd>
          </div>
          {document.type !== 'COVID_TEST' && (
            <>
              <div className="doc-field">
                <dt>Valid from</dt>
                <dd className="doc-mono">{document.validFrom}</dd>
              </div>
              <div className="doc-field">
                <dt>Valid until</dt>
                <dd>
                  <span className="doc-mono">{document.validUntil}</span>
                  {isExpired ? (
                    <span className="doc-pill doc-pill-danger">
                      Expired before {travelDate}
                    </span>
                  ) : daysRemaining !== undefined && daysRemaining < 30 ? (
                    <span className="doc-pill doc-pill-warn">
                      {daysRemaining}d after travel (&lt; 1 month)
                    </span>
                  ) : daysRemaining !== undefined && daysRemaining < 180 ? (
                    <span className="doc-pill doc-pill-warn">
                      ~{Math.floor(daysRemaining / 30)} mo after travel (&lt; 6
                      months)
                    </span>
                  ) : (
                    travelDate && (
                      <span className="doc-pill doc-pill-ok">
                        Current on {travelDate}
                      </span>
                    )
                  )}
                </dd>
              </div>
            </>
          )}
          {test && (
            <>
              <div className="doc-field doc-field-wide">
                <dt>Sample collected</dt>
                <dd>
                  <span className="doc-mono">
                    {test.sampleCollectedAt
                      ? displayInstant(test.sampleCollectedAt)
                      : test.sampleTimeLabel}
                  </span>
                  {elapsedHours !== undefined ? (
                    <span
                      className={`doc-pill ${elapsedHours <= 18 && elapsedHours >= 0 ? 'doc-pill-ok' : 'doc-pill-danger'}`}
                    >
                      {elapsedHours}h before departure
                    </span>
                  ) : (
                    <span className="doc-pill doc-pill-warn">
                      Offset unverified
                    </span>
                  )}
                </dd>
              </div>
              <div className="doc-field doc-field-wide">
                <dt>Report issued</dt>
                <dd className="doc-mono">{displayInstant(test.reportedAt)}</dd>
              </div>
              <div className="doc-field">
                <dt>Test method</dt>
                <dd>
                  <span>{test.method}</span>
                  <span
                    className={`doc-pill ${test.testType === 'MOLECULAR' ? 'doc-pill-ok' : 'doc-pill-warn'}`}
                  >
                    {test.testType}
                  </span>
                </dd>
              </div>
              <div className="doc-field">
                <dt>Result</dt>
                <dd>
                  <span>{test.result.toLowerCase()}</span>
                  <span
                    className={`doc-pill ${test.result === 'NEGATIVE' ? 'doc-pill-ok' : 'doc-pill-danger'}`}
                  >
                    {test.result}
                  </span>
                </dd>
              </div>
              <div className="doc-field">
                <dt>Laboratory</dt>
                <dd>{test.laboratory}</dd>
              </div>
              <div className="doc-field">
                <dt>Collection site</dt>
                <dd>{test.laboratoryLocation}</dd>
              </div>
              <div className="doc-field doc-field-wide">
                <dt>Laboratory identity</dt>
                <dd>
                  <span>
                    {test.laboratoryIdentity === 'CONFIRMED'
                      ? 'Confirmed in this fictional report'
                      : 'Unresolved — verify the report'}
                  </span>
                  <span
                    className={`doc-pill ${test.laboratoryIdentity === 'CONFIRMED' ? 'doc-pill-ok' : 'doc-pill-warn'}`}
                  >
                    {test.laboratoryIdentity}
                  </span>
                </dd>
              </div>
            </>
          )}
          {attributes.category && (
            <div className="doc-field doc-field-wide">
              <dt>Category</dt>
              <dd>{attributes.category}</dd>
            </div>
          )}
          {attributes.passportKind && (
            <div className="doc-field">
              <dt>Passport type</dt>
              <dd>
                <span>{attributes.passportKind.toLowerCase()}</span>
                {attributes.passportKind !== 'ORDINARY' && (
                  <span className="doc-pill doc-pill-warn">
                    Special classification
                  </span>
                )}
              </dd>
            </div>
          )}
          {attributes.biometric !== undefined && (
            <div className="doc-field">
              <dt>Electronic passport</dt>
              <dd>
                <span>
                  {attributes.biometric
                    ? 'Yes · electronic chip'
                    : 'No · non-electronic'}
                </span>
                <span
                  className={`doc-pill ${attributes.biometric ? 'doc-pill-ok' : 'doc-pill-warn'}`}
                >
                  {attributes.biometric ? 'Biometric' : 'Non-biometric'}
                </span>
              </dd>
            </div>
          )}
          {attributes.documentCode && (
            <div className="doc-field">
              <dt>Document form</dt>
              <dd>
                <span className="doc-pill doc-pill-code">
                  {attributes.documentCode}
                </span>
              </dd>
            </div>
          )}
          {attributes.destinationCountry && (
            <div className="doc-field">
              <dt>Destination country</dt>
              <dd>
                <strong>{attributes.destinationCountry}</strong>{' '}
                <span className="muted">
                  ({countryName(attributes.destinationCountry)})
                </span>
              </dd>
            </div>
          )}
          {attributes.entriesRemaining !== undefined && (
            <div className="doc-field">
              <dt>Entries remaining</dt>
              <dd>
                <span>{attributes.entriesRemaining}</span>
                <span
                  className={`doc-pill ${attributes.entriesRemaining > 0 ? 'doc-pill-ok' : 'doc-pill-danger'}`}
                >
                  {attributes.entriesRemaining > 0 ? 'Available' : 'Exhausted'}
                </span>
              </dd>
            </div>
          )}
          {attributes.status && (
            <div className="doc-field">
              <dt>Status</dt>
              <dd>
                <span className="doc-pill doc-pill-code">
                  {attributes.status}
                </span>
              </dd>
            </div>
          )}
          {attributes.bookingReference && (
            <div className="doc-field">
              <dt>Booking reference</dt>
              <dd className="doc-mono">{attributes.bookingReference}</dd>
            </div>
          )}
          {attributes.linkedPassportNumber && (
            <div className="doc-field doc-field-wide">
              <dt>Linked passport number</dt>
              <dd>
                <span className="doc-mono">
                  {attributes.linkedPassportNumber}
                </span>
                {linkMismatch ? (
                  <span className="doc-pill doc-pill-danger">
                    Does not match passport ({presentedPassportNumber})
                  </span>
                ) : (
                  presentedPassportNumber && (
                    <span className="doc-pill doc-pill-ok">
                      Matches presented passport
                    </span>
                  )
                )}
              </dd>
            </div>
          )}
        </dl>
      )}
    </article>
  );
}
