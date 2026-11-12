import { describe, expect, it } from 'vitest';
import {
  bundleDocumentArtIssues,
  documentArtIssues,
  validateDocumentArtFromDisk,
} from '../scripts/validate-document-art';
import { loadContentFromDisk } from '../scripts/lib/content';
import type { TravelDocument } from '../src/core/types';

const content = await loadContentFromDisk();
const passport = content.cases
  .flatMap((item) => item.documents)
  .find(
    (document): document is Exclude<TravelDocument, { type: 'COVID_TEST' }> =>
      document.type === 'PASSPORT',
  )!;

function unsupported(): TravelDocument {
  return { ...passport, issuingCountry: 'ZZ' };
}

describe('document art coverage gate', () => {
  it('covers authoring and every immutable release, including illustrative fixtures', async () => {
    const result = await validateDocumentArtFromDisk();
    expect(result.sourceDocuments).toBeGreaterThan(0);
    expect(result.releases).toBeGreaterThan(1);
  });

  it('requires review for a new issuer instead of accepting a generic fallback', () => {
    expect(documentArtIssues(unsupported()).join('\n')).toContain(
      'ZZ/PASSPORT',
    );
  });

  it('rejects unsupported country/type combinations', () => {
    const document: TravelDocument = {
      ...passport,
      type: 'STUDY_PERMIT',
      issuingCountry: 'JP',
    };
    expect(documentArtIssues(document).join('\n')).toContain('JP/STUDY_PERMIT');
  });

  it('requires a recognized US travel-document form rather than any booklet', () => {
    const document: TravelDocument = {
      ...passport,
      type: 'TRAVEL_DOCUMENT',
      issuingCountry: 'US',
      attributes: { documentCode: 'I-999' },
    };
    expect(documentArtIssues(document).join('\n')).toContain('I-999');
    expect(
      documentArtIssues({ ...document, attributes: {} }).length,
    ).toBeGreaterThan(0);
    for (const documentCode of ['I-327', 'I-571'])
      expect(
        documentArtIssues({ ...document, attributes: { documentCode } }),
      ).toEqual([]);
  });

  it('reports hidden documents with actionable case and archive context', () => {
    const copy = structuredClone(content);
    const item = copy.cases[0]!;
    item.documents.push({ ...unsupported(), id: 'later-revealed-document' });
    const issues = bundleDocumentArtIssues(copy, 'archive example-v1');
    expect(issues).toContainEqual(
      expect.stringContaining(
        `archive example-v1: case ${item.id}, document later-revealed-document:`,
      ),
    );
  });
});
