import { describe, expect, it } from 'vitest';
import { loadContentFromDisk } from '../scripts/lib/content';
import { validateLibraryFromDisk } from '../scripts/lib/releases';
import type { TravelDocument } from '../src/core/types';
import {
  getDocumentDesign,
  type DesignLayout,
} from '../src/ui/documentDesigns';

const content = await loadContentFromDisk();
const library = await validateLibraryFromDisk();
const bundles = [
  ['current', content] as const,
  ...Object.entries(library.versions),
];
const documents = content.cases.flatMap((item) => item.documents);
const passport = documents.find(
  (item): item is Exclude<TravelDocument, { type: 'COVID_TEST' }> =>
    item.type === 'PASSPORT',
)!;

function sample(
  type: Exclude<TravelDocument['type'], 'COVID_TEST'>,
  issuingCountry: string,
  attributes: TravelDocument['attributes'] = {},
): TravelDocument {
  return { ...passport, type, issuingCountry, attributes };
}

describe('country and form document designs', () => {
  it.each(bundles)(
    'covers every document in %s without changing evidence',
    (_, bundle) => {
      for (const passenger of bundle.cases) {
        for (const document of passenger.documents) {
          const before = structuredClone(document);
          const result = getDocumentDesign(document);
          expect(result, passenger.id + '/' + document.id).toBeDefined();
          expect(result?.country).toBe(document.issuingCountry);
          expect(result?.id).toBeTruthy();
          expect(result?.title).toBeTruthy();
          expect(result?.subtitle).toBeTruthy();
          expect(result?.issuer).toBeTruthy();
          expect(result?.motif).toBeTruthy();
          for (const color of [
            result?.accent,
            result?.paper,
            result?.secondary,
          ])
            expect(color).toMatch(/^#[0-9a-f]{6}$/i);
          for (const reference of result!.references)
            expect(new URL(reference).protocol).toBe('https:');
          expect(document).toEqual(before);
        }
      }
    },
  );

  it.each(['CA', 'CN', 'FR', 'GB', 'ID', 'IN', 'RO', 'TH', 'US', 'XY', 'XZ'])(
    'explicitly supports passport issuer %s',
    (country) => {
      const result = getDocumentDesign(sample('PASSPORT', country));
      expect(result?.layout).toBe('passport');
      expect(result?.country).toBe(country);
    },
  );

  const layouts: [
    Exclude<TravelDocument['type'], 'COVID_TEST'>,
    string,
    DesignLayout,
  ][] = [
    ['VISA', 'CA', 'visa-sticker'],
    ['VISA', 'GB', 'visa-sticker'],
    ['VISA', 'JP', 'japan-visa'],
    ['VISA', 'SG', 'singapore-evisa'],
    ['VISA', 'US', 'us-visa'],
    ['RESIDENCE_PERMIT', 'GB', 'uk-residence-card'],
    ['RESIDENCE_PERMIT', 'US', 'us-residence-card'],
    ['RESIDENCE_PERMIT', 'CA', 'ca-residence-card'],
    ['STUDY_PERMIT', 'CA', 'study-permit'],
    ['PERMANENT_RESIDENT_TRAVEL_DOCUMENT', 'CA', 'visa-sticker'],
    ['ELECTRONIC_AUTHORIZATION', 'CA', 'eta-record'],
    ['ELECTRONIC_AUTHORIZATION', 'HK', 'hk-registration'],
    ['ELECTRONIC_AUTHORIZATION', 'JP', 'japan-evisa'],
    ['ELECTRONIC_AUTHORIZATION', 'SG', 'arrival-receipt'],
    ['ONWARD_TICKET', 'GB', 'ticket'],
    ['ONWARD_TICKET', 'SG', 'ticket'],
  ];
  it.each(layouts)('selects %s/%s layout %s', (type, country, layout) => {
    const residentEvidence: Record<string, TravelDocument['attributes']> = {
      US: { documentCode: 'I-551' },
      CA: { status: 'Canadian permanent resident — PR card' },
      GB: { status: 'TRAINING-RESIDENT' },
    };
    expect(
      getDocumentDesign(
        sample(
          type,
          country,
          type === 'RESIDENCE_PERMIT' ? residentEvidence[country] : {},
        ),
      )?.layout,
    ).toBe(layout);
  });

  it.each(['US', 'CA', 'GB'])(
    'does not give an unknown %s residence document a reviewed card title',
    (country) => {
      expect(
        getDocumentDesign(sample('RESIDENCE_PERMIT', country)),
      ).toBeUndefined();
      expect(
        getDocumentDesign(
          sample('RESIDENCE_PERMIT', country, {
            category: 'Temporary residence document',
            status: 'TEMPORARY',
          }),
        ),
      ).toBeUndefined();
    },
  );

  it('selects the fictional laboratory report from real current data', () => {
    const report = documents.find((item) => item.type === 'COVID_TEST')!;
    expect(getDocumentDesign(report)?.layout).toBe('lab-report');
    expect(getDocumentDesign(report)?.subtitle).toContain(
      'Fictional laboratory',
    );
  });

  it.each([
    'PASSPORT',
    'TRAVEL_DOCUMENT',
    'VISA',
    'RESIDENCE_PERMIT',
    'ONWARD_TICKET',
    'ELECTRONIC_AUTHORIZATION',
    'STUDY_PERMIT',
    'PERMANENT_RESIDENT_TRAVEL_DOCUMENT',
  ] as const)('rejects unsupported issuer for %s', (type) => {
    expect(getDocumentDesign(sample(type, 'ZZ'))).toBeUndefined();
  });

  it('rejects unsupported lab issuers and country/type combinations', () => {
    const report = documents.find((item) => item.type === 'COVID_TEST')!;
    expect(
      getDocumentDesign({ ...report, issuingCountry: 'ZZ' }),
    ).toBeUndefined();
    expect(getDocumentDesign(sample('PASSPORT', 'JP'))).toBeUndefined();
    expect(getDocumentDesign(sample('VISA', 'FR'))).toBeUndefined();
    expect(getDocumentDesign(sample('STUDY_PERMIT', 'GB'))).toBeUndefined();
    expect(
      getDocumentDesign(
        sample('TRAVEL_DOCUMENT', 'CA', {
          documentCode: 'I-571',
        }),
      ),
    ).toBeUndefined();
  });

  it('requires a recognized US travel form and keeps I-571 and I-327 distinct', () => {
    const refugee = getDocumentDesign(
      sample('TRAVEL_DOCUMENT', 'US', {
        documentCode: 'I-571',
      }),
    )!;
    const reentry = getDocumentDesign(
      sample('TRAVEL_DOCUMENT', 'US', {
        documentCode: 'I-327',
      }),
    )!;
    expect(refugee.layout).toBe('travel-booklet');
    expect(reentry.layout).toBe('travel-booklet');
    expect(refugee.id).not.toBe(reentry.id);
    expect(refugee.title).toBe('Refugee Travel Document');
    expect(reentry.title).toBe('Permit to Re-enter');
    expect(getDocumentDesign(sample('TRAVEL_DOCUMENT', 'US'))).toBeUndefined();
    expect(
      getDocumentDesign(
        sample('TRAVEL_DOCUMENT', 'US', {
          category: 'U.S. Refugee Travel Document',
        }),
      ),
    ).toBeUndefined();
    expect(
      getDocumentDesign(
        sample('TRAVEL_DOCUMENT', 'US', {
          documentCode: 'I-999',
        }),
      ),
    ).toBeUndefined();
    expect(
      getDocumentDesign(
        sample('RESIDENCE_PERMIT', 'US', {
          documentCode: 'I-571',
        }),
      ),
    ).toBeUndefined();
  });

  it('requires explicit review for a new form even when its issuer is supported', () => {
    for (const type of [
      'PASSPORT',
      'VISA',
      'STUDY_PERMIT',
      'RESIDENCE_PERMIT',
    ] as const)
      expect(
        getDocumentDesign(sample(type, 'CA', { documentCode: 'NEW-FORM' })),
      ).toBeUndefined();
  });

  it('distinguishes UK electronic status records from physical training cards in every archive', () => {
    let electronic = 0;
    let physical = 0;
    for (const [, bundle] of bundles) {
      for (const item of bundle.cases.flatMap(
        (passenger) => passenger.documents,
      )) {
        if (item.type !== 'RESIDENCE_PERMIT' || item.issuingCountry !== 'GB')
          continue;
        if (
          item.attributes.category ===
          'Simulated issued UK immigration status record'
        ) {
          electronic++;
          expect(getDocumentDesign(item)?.layout).toBe('uk-status-record');
        } else {
          physical++;
          expect(getDocumentDesign(item)?.layout).toBe('uk-residence-card');
        }
      }
    }
    expect(electronic).toBeGreaterThan(0);
    expect(physical).toBeGreaterThan(0);
  });
});
