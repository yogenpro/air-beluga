import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { TravelDocument } from '../core/types';
import { getDocumentDesign, type DocumentDesign } from './documentDesigns';
import { countryName } from './labels';
import { PassengerPortrait } from './Icons';
import { displayInstant } from './time';

const TILE: Record<string, number> = {
  GB: 0,
  US: 1,
  CA: 2,
  IN: 3,
  CN: 4,
  FR: 5,
  ID: 6,
  RO: 7,
  TH: 8,
  JP: 9,
  SG: 10,
  HK: 11,
};

function Field({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: ReactNode;
  wide?: boolean;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className={`art-field ${wide ? 'art-field-wide' : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** An invented beluga emblem, deliberately distinct from official state seals. */
function BelugaSeal({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`art-seal ${className}`}
      viewBox="0 0 48 48"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M20 2h8v4h4v4H16V6h4zM8 12h4v4H8zm28 0h4v4h-4zM4 20h4v16h4v4h8v4H12v-4H8v-4H4zm36 0h4v16h-4v4h-4v4h-8v-4h8v-4h4zM12 22h4v-4h12v4h4v4h4v-4h8v8h-8v4h-8v-4h-8v-4h-8z"
      />
      <path fill="var(--art-paper, #f9efd9)" d="M18 22h4v4h-4z" />
      <path fill="currentColor" d="M16 44h16v4H16z" />
    </svg>
  );
}

function Portrait({
  document,
  ghost = false,
}: {
  document: TravelDocument;
  ghost?: boolean;
}) {
  return (
    <div className={`art-photo ${ghost ? 'art-ghost' : ''}`} aria-hidden="true">
      <PassengerPortrait name={document.holder} />
      {!ghost && <span>GAME PORTRAIT</span>}
    </div>
  );
}

function Validity({ document }: { document: TravelDocument }) {
  return (
    <>
      <Field label="Valid from" value={document.validFrom} />
      <Field label="Valid until" value={document.validUntil} />
    </>
  );
}

function Identity({ document }: { document: TravelDocument }) {
  return (
    <>
      <Field label="Holder / name" value={document.holder} wide />
      <Field label="Document number" value={document.attributes.number} />
    </>
  );
}

function DocumentFooter({ machine = false }: { machine?: boolean }) {
  return (
    <footer className="art-footer">
      {machine && (
        <div className="art-nonscannable" aria-hidden="true">
          AIR&lt;BELUGA&lt;&lt;GAME&lt;SPECIMEN
          <br />
          NOT&lt;AN&lt;IDENTITY&lt;DOCUMENT
        </div>
      )}
      <span>FICTIONAL GAME PROP · NOT VALID FOR TRAVEL</span>
    </footer>
  );
}

function ArtHeading({
  design,
  short = false,
}: {
  design: DocumentDesign;
  short?: boolean;
}) {
  // The bundled game fonts cover Latin text. Keep non-Latin reference titles
  // in registry metadata rather than showing missing-glyph boxes to players.
  const localTitle =
    design.languageTitle &&
    !/[^\p{Script=Latin}\p{Number}\p{Punctuation}\p{Separator}]/u.test(
      design.languageTitle,
    )
      ? design.languageTitle
      : undefined;
  return (
    <header className="art-heading">
      <BelugaSeal />
      <div>
        <span>{design.issuer}</span>
        <strong>{design.title}</strong>
        {localTitle && <small className="art-local-title">{localTitle}</small>}
        {!short && <small>{design.subtitle}</small>}
      </div>
      <span className="art-specimen">
        GAME
        <br />
        SPECIMEN
      </span>
    </header>
  );
}

function Passport({
  document,
  design,
}: {
  document: TravelDocument;
  design: DocumentDesign;
}) {
  const a = document.attributes;
  return (
    <>
      <div className="art-booklet-leaf">
        <span>{design.issuer}</span>
        <BelugaSeal />
        <span>
          {a.documentCode ?? a.passportKind?.toLowerCase() ?? 'Identity page'}
        </span>
      </div>
      <ArtHeading design={design} />
      <div className="art-passport-bio">
        <Portrait document={document} />
        <dl>
          <Identity document={document} />
          <Field
            label="Issuing country"
            value={`${document.issuingCountry} · ${countryName(document.issuingCountry)}`}
          />
          <Field label="Document form" value={a.documentCode} />
          <Validity document={document} />
          <Field label="Passport type" value={a.passportKind?.toLowerCase()} />
          <Field
            label="Electronic passport"
            value={
              a.biometric === undefined
                ? undefined
                : a.biometric
                  ? 'Yes · electronic chip'
                  : 'No · non-electronic'
            }
          />
        </dl>
        <BelugaSeal className="art-watermark" />
      </div>
      <div className="art-document-category">{a.category}</div>
      <DocumentFooter machine />
    </>
  );
}

function ResidentCard({
  document,
  design,
  back,
}: {
  document: TravelDocument;
  design: DocumentDesign;
  back: boolean;
}) {
  const a = document.attributes;
  if (back)
    return (
      <>
        <header className="art-card-back-heading">
          <span>{design.issuer}</span>
          <strong>{design.title} · reverse</strong>
          <span>GAME SPECIMEN</span>
        </header>
        <div className="art-card-reverse">
          {design.layout === 'uk-residence-card' ? (
            <div className="art-chip" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : (
            <div className="art-reverse-mark" aria-hidden="true">
              <BelugaSeal />
              <span>
                GAME
                <br />
                SPECIMEN
              </span>
            </div>
          )}
          <dl>
            <Field label="Holder" value={document.holder} wide />
            <Field
              label="Status / remarks"
              value={a.status ?? a.category}
              wide
            />
            <Field label="Document form" value={a.documentCode} />
            <Field label="Document number" value={a.number} />
            <Field
              label="Destination country"
              value={a.destinationCountry && countryName(a.destinationCountry)}
            />
          </dl>
          <Portrait document={document} ghost />
        </div>
        <DocumentFooter machine />
      </>
    );
  return (
    <>
      <ArtHeading design={design} short />
      <div className="art-resident-face">
        <Portrait document={document} />
        <dl>
          <Identity document={document} />
          <Field label="Status" value={a.status} wide />
          <Validity document={document} />
          <Field label="Document form" value={a.documentCode} />
          <Field label="Category" value={a.category} wide />
        </dl>
        <div className="art-resident-decoration" aria-hidden="true">
          <BelugaSeal />
          <span>GAME ONLY</span>
          <Portrait document={document} ghost />
          <span>SPECIMEN</span>
        </div>
      </div>
      <DocumentFooter />
    </>
  );
}

function Visa({
  document,
  design,
}: {
  document: TravelDocument;
  design: DocumentDesign;
}) {
  const a = document.attributes;
  return (
    <>
      <ArtHeading design={design} />
      <div className="art-visa-face">
        <div className="art-visa-crest">
          <BelugaSeal />
          <span>{document.issuingCountry}</span>
        </div>
        <dl>
          <Identity document={document} />
          <Validity document={document} />
          <Field label="Category / visa type" value={a.category} wide />
          <Field label="Entries remaining" value={a.entriesRemaining} />
          <Field
            label="Valid for"
            value={a.destinationCountry && countryName(a.destinationCountry)}
          />
          <Field
            label="Linked passport number"
            value={a.linkedPassportNumber}
            wide
          />
        </dl>
        <Portrait document={document} />
      </div>
      <div className="art-document-category">{a.status}</div>
      <DocumentFooter machine />
    </>
  );
}

function Permit({
  document,
  design,
}: {
  document: TravelDocument;
  design: DocumentDesign;
}) {
  const a = document.attributes;
  return (
    <>
      <ArtHeading design={design} />
      <div className="art-permit-title">
        {design.title}
        <BelugaSeal />
      </div>
      <div className="art-permit-content">
        <p className="art-paper-notice">
          Air Beluga fictional specimen · document evidence as presented
        </p>
        <dl>
          <Identity document={document} />
          <Field
            label="Issuing country"
            value={countryName(document.issuingCountry)}
          />
          <Validity document={document} />
          <Field label="Category" value={a.category} wide />
          <Field label="Status / conditions" value={a.status} wide />
          <Field
            label="Destination country"
            value={a.destinationCountry && countryName(a.destinationCountry)}
          />
          <Field label="Entries remaining" value={a.entriesRemaining} />
        </dl>
        <div className="art-paper-signoff">
          <BelugaSeal />
          <span>
            GAME SPECIMEN
            <br />
            Not an official authorization
          </span>
        </div>
      </div>
      <DocumentFooter />
    </>
  );
}

function LabReport({
  document,
  design,
}: {
  document: TravelDocument;
  design: DocumentDesign;
}) {
  if (document.type !== 'COVID_TEST') return null;
  const t = document.attributes.covidTest;
  return (
    <>
      <ArtHeading design={design} />
      <div className="art-lab-letterhead">
        <strong>{t.laboratory}</strong>
        <span>{t.laboratoryLocation}</span>
      </div>
      <h4 className="art-report-title">Laboratory test report</h4>
      <dl className="art-report-fields">
        <Identity document={document} />
        <Field
          label="Sample collected"
          value={
            t.sampleCollectedAt
              ? displayInstant(t.sampleCollectedAt)
              : t.sampleTimeLabel
          }
          wide
        />
        <Field
          label="Report issued"
          value={displayInstant(t.reportedAt)}
          wide
        />
        <Field label="Test method" value={`${t.method} · ${t.testType}`} />
        <Field label="Result" value={t.result} />
        <Field label="Laboratory" value={t.laboratory} />
        <Field label="Collection site" value={t.laboratoryLocation} />
        <Field
          label="Laboratory identity"
          value={
            t.laboratoryIdentity === 'CONFIRMED'
              ? 'Confirmed in this fictional report'
              : 'Unresolved — verify the report'
          }
          wide
        />
        <Field
          label="Report category"
          value={document.attributes.category}
          wide
        />
      </dl>
      <div className="art-lab-signoff">
        Fictional report · laboratory names are case evidence, not issuer
        branding.
      </div>
      <DocumentFooter />
    </>
  );
}

function ElectronicRecord({
  document,
  design,
}: {
  document: TravelDocument;
  design: DocumentDesign;
}) {
  const a = document.attributes;
  const isScreen = ['eta-record', 'japan-evisa', 'uk-status-record'].includes(
    design.layout,
  );
  const screenshot = /screenshot/i.test(a.category ?? '');
  return (
    <>
      <div className="art-record-toolbar">
        <span aria-hidden="true">▪ ▪ ▪</span>
        <span>
          {screenshot
            ? 'PRESENTED IMAGE'
            : isScreen
              ? 'SIMULATED RECORD'
              : 'PRESENTED PAPER'}
        </span>
        <span>OFFLINE GAME</span>
      </div>
      <ArtHeading design={design} />
      {design.layout === 'arrival-receipt' && (
        <p className="art-record-notice">
          Arrival declaration receipt · not a visa or entry permission
        </p>
      )}
      {design.layout === 'eta-record' && (
        <p className="art-record-notice">
          Simulated carrier lookup · an eTA is not a passenger paper permit
        </p>
      )}
      {design.layout === 'japan-evisa' && (
        <p className="art-record-notice">
          {screenshot
            ? 'Saved image presented — not a live issuance notice'
            : 'Simulated Visa issuance notice — no real connection or verification'}
        </p>
      )}
      <div className="art-record-body">
        {design.layout === 'uk-status-record' && (
          <Portrait document={document} />
        )}
        <dl>
          <Identity document={document} />
          <Field label="Status" value={a.status} wide />
          <Field label="Record / category" value={a.category} wide />
          <Validity document={document} />
          <Field
            label="Linked passport number"
            value={a.linkedPassportNumber}
            wide
          />
          <Field
            label="Destination country"
            value={a.destinationCountry && countryName(a.destinationCountry)}
          />
          <Field label="Entries remaining" value={a.entriesRemaining} />
        </dl>
      </div>
      <DocumentFooter />
    </>
  );
}

function Ticket({
  document,
  design,
}: {
  document: TravelDocument;
  design: DocumentDesign;
}) {
  const a = document.attributes;
  return (
    <>
      <ArtHeading design={design} />
      <div className="art-ticket-body">
        <div className="art-ticket-main">
          <span className="art-ticket-label">E-TICKET / RESERVATION</span>
          <dl>
            <Field label="Passenger" value={document.holder} wide />
            <Field label="Journey as presented" value={a.category} wide />
            <Validity document={document} />
          </dl>
        </div>
        <div className="art-ticket-stub">
          <span>BOOKING REF</span>
          <strong>{a.bookingReference}</strong>
          <span>DESTINATION</span>
          <strong>{a.destinationCountry}</strong>
          <small>
            {a.destinationCountry && countryName(a.destinationCountry)}
          </small>
          <span>NOT A BOARDING PASS</span>
        </div>
      </div>
      <DocumentFooter />
    </>
  );
}

function Surface({
  document,
  design,
  back,
}: {
  document: TravelDocument;
  design: DocumentDesign;
  back: boolean;
}) {
  const tile = TILE[document.issuingCountry];
  const style = {
    '--art-accent': design.accent,
    '--art-paper': design.paper,
    '--art-secondary': design.secondary,
    '--art-pattern-x': `${tile === undefined ? 0 : ((tile % 4) * 100) / 3}%`,
    '--art-pattern-y': `${tile === undefined ? 0 : Math.floor(tile / 4) * 50}%`,
  } as CSSProperties;
  let body: ReactNode;
  switch (design.layout) {
    case 'passport':
    case 'travel-booklet':
      body = <Passport document={document} design={design} />;
      break;
    case 'uk-residence-card':
    case 'us-residence-card':
    case 'ca-residence-card':
      body = <ResidentCard document={document} design={design} back={back} />;
      break;
    case 'visa-sticker':
    case 'japan-visa':
    case 'us-visa':
      body = <Visa document={document} design={design} />;
      break;
    case 'study-permit':
      body = <Permit document={document} design={design} />;
      break;
    case 'lab-report':
      body = <LabReport document={document} design={design} />;
      break;
    case 'ticket':
      body = <Ticket document={document} design={design} />;
      break;
    case 'uk-status-record':
    case 'singapore-evisa':
    case 'eta-record':
    case 'hk-registration':
    case 'japan-evisa':
    case 'arrival-receipt':
      body = <ElectronicRecord document={document} design={design} />;
      break;
    default: {
      const unsupported: never = design.layout;
      throw new Error(`Document layout has no renderer: ${unsupported}`);
    }
  }
  return (
    <div
      className={`document-art art-layout-${design.layout} art-issuer-${document.issuingCountry.toLowerCase()} ${tile === undefined ? 'art-no-pattern' : ''}`}
      data-design={design.id}
      style={style}
    >
      <div className="art-pattern" aria-hidden="true" />
      {body}
    </div>
  );
}

export function DocumentArtwork({ document }: { document: TravelDocument }) {
  const design = getDocumentDesign(document);
  const [back, setBack] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    if (!enlarged) return;
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, [enlarged]);
  if (!design)
    return (
      <p className="art-unsupported">
        Fictional document · no reviewed visual profile. Inspect the supplied
        evidence below.
      </p>
    );
  const flippable = design.layout.endsWith('residence-card');
  return (
    <div className="document-artwork">
      <div className="art-tools">
        <span>{design.subtitle}</span>
        <div>
          {flippable && (
            <button
              type="button"
              onClick={() => setBack(!back)}
              aria-label={`Show ${back ? 'front' : 'reverse'} of ${document.id}`}
            >
              {back ? 'Front' : 'Reverse'} ↺
            </button>
          )}
          <button
            type="button"
            onClick={() => setEnlarged(true)}
            aria-label={`Enlarge ${document.id}`}
          >
            Enlarge ↗
          </button>
        </div>
      </div>
      <Surface document={document} design={design} back={back} />
      {enlarged && (
        <dialog
          ref={dialog}
          className="document-art-dialog"
          aria-labelledby={id}
          onClose={() => setEnlarged(false)}
        >
          <div className="art-dialog-heading">
            <strong id={id}>{design.title} · enlarged inspection</strong>
            <button type="button" onClick={() => setEnlarged(false)} autoFocus>
              Close ×
            </button>
          </div>
          <p>Scroll across the document to read it at full size.</p>
          <div className="art-enlarged-scroll">
            <Surface document={document} design={design} back={back} />
          </div>
          {flippable && (
            <button type="button" onClick={() => setBack(!back)}>
              {back ? 'Show front' : 'Show reverse'} ↺
            </button>
          )}
        </dialog>
      )}
    </div>
  );
}
