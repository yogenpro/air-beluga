import { useRef, useState } from 'react';
import type { PassengerCase, RuleSnapshot } from '../core/types';
import { countryName } from './labels';
import { Icon } from './Icons';

export function RuleSources({ rule }: { rule: RuleSnapshot['rules'][number] }) {
  return rule.sources.length ? (
    <ul className="rule-sources-list">
      {rule.sources.map((source) => (
        <li key={source.url}>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.publisher}
          </a>
          {' · Verified '}
          {source.verifiedDate}
          {source.effectiveFrom && ` · Effective from ${source.effectiveFrom}`}
          {source.effectiveUntil && ` through ${source.effectiveUntil}`}
        </li>
      ))}
    </ul>
  ) : (
    <p className="muted">Invented training rule; no verified source.</p>
  );
}

export function Rulebook({
  snapshot,
  itinerary,
  onOpenRule,
  onBack,
}: {
  snapshot: RuleSnapshot;
  itinerary: PassengerCase['itinerary'];
  onOpenRule: (ruleId: string) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [allExpanded, setAllExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const countries = [
    ...new Set(itinerary.map((leg) => leg.destinationCountry)),
  ];
  const scoped = snapshot.rules.filter(
    (rule) =>
      rule.scope.departureAirports.includes(itinerary[0]!.from) &&
      (!rule.jurisdictionCountry ||
        countries.includes(rule.jurisdictionCountry)) &&
      rule.scope.destinationCountries.includes(
        itinerary.at(-1)!.destinationCountry,
      ) &&
      itinerary
        .slice(0, -1)
        .every((leg) =>
          rule.scope.transitCountries.includes(leg.destinationCountry),
        ),
  );
  const rules = scoped.filter(
    (rule) =>
      (!country ||
        (rule.jurisdictionCountry
          ? [rule.jurisdictionCountry]
          : [...rule.scope.destinationCountries, ...rule.scope.transitCountries]
        ).includes(country)) &&
      `${rule.id} ${rule.title} ${rule.body}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );

  function toggleAll() {
    const next = !allExpanded;
    setAllExpanded(next);
    listRef.current?.querySelectorAll('details').forEach((el) => {
      el.open = next;
    });
  }

  return (
    <aside className="panel rulebook" aria-labelledby="rulebook-heading">
      <div className="rulebook-header">
        <div>
          <div className="reference-title">
            <Icon name="book" />
            <span className="eyebrow">YOUR DESK MANUAL</span>
          </div>
          <h2 id="rulebook-heading" tabIndex={-1}>
            Travel reference
          </h2>
        </div>
        <p className="back-to-passenger-wrap">
          <a href="#passenger-heading" onClick={onBack}>
            Back to passenger
          </a>
        </p>
      </div>

      <p className="rulebook-meta">
        {snapshot.historical
          ? 'Historical rules'
          : snapshot.verificationStatus === 'ILLUSTRATIVE_ONLY'
            ? 'Illustrative rules'
            : 'Source-reviewed rule snapshot'}{' '}
        · As of {snapshot.asOfDate}
      </p>

      {snapshot.historical && (
        <p className="notice historical-notice">
          Apply the rules for this shift’s date, not today’s requirements.{' '}
          Sources reviewed {snapshot.reviewedDate}.
        </p>
      )}

      {snapshot.testingRequirement && (
        <div className="testing-req-card" aria-hidden="true">
          <span className="eyebrow">ROUTE TESTING CHECKLIST</span>
          <div className="testing-req-pills">
            <span className="doc-pill doc-pill-code">
              Max {snapshot.testingRequirement.maxAgeHours}h before departure
            </span>
            <span className="doc-pill doc-pill-ok">
              {snapshot.testingRequirement.acceptedTestTypes.join(' / ')} only
            </span>
            <span className="doc-pill doc-pill-neutral">
              {snapshot.testingRequirement.requiredLaboratory} (
              {snapshot.testingRequirement.requiredLaboratoryLocation})
            </span>
          </div>
        </div>
      )}

      <div className="rulebook-filters">
        <div className="filter-field">
          <label htmlFor="rule-search">Search rules</label>
          <input
            placeholder="Keyword, form, country…"
            id="rule-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="rule-country">Jurisdiction</label>
          <select
            id="rule-country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            <option value="">Any on this itinerary</option>
            {countries.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {countries.length > 1 && (
        <div className="jurisdiction-pills" aria-hidden="true">
          <button
            type="button"
            className={`pill-btn ${country === '' ? 'is-active' : ''}`}
            tabIndex={-1}
            onClick={() => setCountry('')}
          >
            All ({scoped.length})
          </button>
          {countries.map((c) => (
            <button
              key={c}
              type="button"
              className={`pill-btn ${country === c ? 'is-active' : ''}`}
              tabIndex={-1}
              onClick={() => setCountry(country === c ? '' : c)}
            >
              {c} · {countryName(c)}
            </button>
          ))}
        </div>
      )}

      <div className="rulebook-toolbar">
        <p role="status" className="reference-count">
          {rules.length} matching {rules.length === 1 ? 'rule' : 'rules'}
        </p>
        {rules.length > 0 && (
          <button
            type="button"
            className="text-button expand-all-btn"
            onClick={toggleAll}
          >
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>

      {rules.length === 0 && <p>Try another search or jurisdiction.</p>}

      <div className="rules-list" ref={listRef}>
        {rules.map((rule) => {
          const badge =
            rule.jurisdictionCountry ??
            rule.scope.destinationCountries.join('/');
          return (
            <details
              key={rule.id}
              className="rule-item"
              onToggle={(event) => {
                if (event.currentTarget.open) onOpenRule(rule.id);
              }}
            >
              <summary>
                <span className="rule-title-text">{rule.title}</span>
                <span className="rule-scope-badge" aria-hidden="true">
                  {badge}
                </span>
              </summary>
              <div className="rule-content">
                <p className="rule-body">{rule.body}</p>
                <p className="muted rule-scope-line">
                  From {rule.scope.departureAirports.join(', ')} · Destination{' '}
                  {rule.scope.destinationCountries.join(', ')}
                  {rule.scope.transitCountries.length > 0 &&
                    ` · Transit ${rule.scope.transitCountries.join(', ')}`}
                </p>
                <RuleSources rule={rule} />
              </div>
            </details>
          );
        })}
      </div>
    </aside>
  );
}
