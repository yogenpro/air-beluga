import { useState } from 'react';
import type { PassengerCase, RuleSnapshot } from '../core/types';
import { Icon } from './Icons';

export function RuleSources({ rule }: { rule: RuleSnapshot['rules'][number] }) {
  return rule.sources.length ? (
    <ul>
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
  const countries = [
    ...new Set(itinerary.map((leg) => leg.destinationCountry)),
  ];
  const scoped = snapshot.rules.filter(
    (rule) =>
      rule.scope.departureAirports.includes(itinerary[0]!.from) &&
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
        [
          ...rule.scope.destinationCountries,
          ...rule.scope.transitCountries,
        ].includes(country)) &&
      `${rule.id} ${rule.title} ${rule.body}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <aside className="panel rulebook" aria-labelledby="rulebook-heading">
      <div className="reference-title">
        <Icon name="book" />
        <span className="eyebrow">YOUR DESK MANUAL</span>
      </div>
      <h2 id="rulebook-heading" tabIndex={-1}>
        Travel reference
      </h2>
      <p>
        <a href="#passenger-heading" onClick={onBack}>
          Back to passenger
        </a>
      </p>
      <p>
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
      <label htmlFor="rule-search">Search rules</label>
      <input
        placeholder="Find a requirement…"
        id="rule-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
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
      <p role="status" className="reference-count">
        {rules.length} matching {rules.length === 1 ? 'rule' : 'rules'}
      </p>
      {rules.length === 0 && <p>Try another search or jurisdiction.</p>}
      {rules.map((rule) => (
        <details
          key={rule.id}
          onToggle={(event) => {
            if (event.currentTarget.open) onOpenRule(rule.id);
          }}
        >
          <summary>{rule.title}</summary>
          <p>{rule.body}</p>
          <p className="muted">
            From {rule.scope.departureAirports.join(', ')} · Destination{' '}
            {rule.scope.destinationCountries.join(', ')}
            {rule.scope.transitCountries.length > 0 &&
              ` · Transit ${rule.scope.transitCountries.join(', ')}`}
          </p>
          <RuleSources rule={rule} />
        </details>
      ))}
    </aside>
  );
}
