import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { loadContentFromDisk } from '../scripts/lib/content';
import { PassengerPortrait } from '../src/ui/Icons';
import { passengerAppearance } from '../src/ui/passengerAppearance';
import { DocumentView } from '../src/ui/DocumentView';

const content = await loadContentFromDisk();
const names = [
  ...new Set(content.cases.map((item) => item.passenger.displayName)),
];

describe('passenger appearance', () => {
  it('gives every current passenger a distinct portrait rather than only recoloring a uniform face', () => {
    const portraits = names.map((name) =>
      renderToStaticMarkup(<PassengerPortrait name={name} />),
    );
    expect(new Set(portraits).size).toBe(names.length);
    const appearances = names.map(passengerAppearance);
    expect(new Set(appearances.map((a) => a.skin)).size).toBeGreaterThanOrEqual(
      5,
    );
    expect(new Set(appearances.map((a) => a.hair)).size).toBeGreaterThanOrEqual(
      6,
    );
    expect(new Set(appearances.map((a) => a.face)).size).toBe(4);
    expect(
      new Set(appearances.map((a) => a.hairColor)).size,
    ).toBeGreaterThanOrEqual(5);
    expect(appearances.some((a) => a.glasses === 1)).toBe(true);
    expect(appearances.some((a) => a.headwear >= 6)).toBe(true);
  });
  it('is deterministic and normalizes harmless name case, whitespace and Unicode variants', () => {
    expect(passengerAppearance(' Ari  Vale ')).toEqual(
      passengerAppearance('ARI VALE'),
    );
    expect(passengerAppearance('Zoë Élan')).toEqual(
      passengerAppearance('Zoe\u0308 E\u0301lan'),
    );
    expect(passengerAppearance('Ari Vale')).toEqual(
      passengerAppearance('Ari Vale'),
    );
  });
  it('keeps a passenger consistent across their desk and documents, including authored name discrepancies', () => {
    for (const item of content.cases) {
      const name = item.passenger.displayName;
      const identity = passengerAppearance(name).id;
      for (const document of item.documents) {
        const html = renderToStaticMarkup(
          <DocumentView
            document={document}
            passengerName={name}
            inspected
            onInspect={() => {}}
          />,
        );
        const identities = [
          ...html.matchAll(/data-portrait="([a-f0-9]+)"/g),
        ].map((match) => match[1]);
        expect(
          identities.every((value) => value === identity),
          `${item.id}/${document.id}`,
        ).toBe(true);
      }
    }
  });
});
