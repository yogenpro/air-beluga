import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { loadContentFromDisk } from '../scripts/lib/content';
import { DocumentArtwork } from '../src/ui/DocumentArtwork';
import { getDocumentDesign } from '../src/ui/documentDesigns';

const content = await loadContentFromDisk();
const documents = content.cases.flatMap((item) => item.documents);

describe('live document artwork', () => {
  it('renders all case documents with a reviewed layout and visible fictional marking', () => {
    for (const document of documents) {
      const html = renderToStaticMarkup(
        <DocumentArtwork document={document} />,
      );
      expect(html).toContain(
        `data-design="${getDocumentDesign(document)!.id}"`,
      );
      expect(html).toContain('FICTIONAL GAME PROP');
      expect(html).toContain('NOT VALID FOR TRAVEL');
      expect(html).toContain(document.holder);
    }
  });

  it('keeps actual specimen numbers and validity values as selectable text', () => {
    for (const document of documents) {
      const html = renderToStaticMarkup(
        <DocumentArtwork document={document} />,
      );
      if (document.attributes.number)
        expect(html).toContain(document.attributes.number);
      if (document.type !== 'COVID_TEST') {
        expect(html).toContain(document.validFrom);
        expect(html).toContain(document.validUntil);
      }
    }
  });

  it('prints test collection evidence without fabricating an expiry date', () => {
    for (const document of documents.filter(
      (item) => item.type === 'COVID_TEST',
    )) {
      const html = renderToStaticMarkup(
        <DocumentArtwork document={document} />,
      );
      expect(html).toContain('Sample collected');
      expect(html).toContain('Report issued');
      expect(html).not.toContain('Valid until');
    }
  });

  it('keeps screenshots, declaration receipts and carrier records distinct', () => {
    const screenshot = documents.find((item) =>
      /screenshot/i.test(item.attributes.category ?? ''),
    )!;
    expect(
      renderToStaticMarkup(<DocumentArtwork document={screenshot} />),
    ).toContain('Saved image presented');
    const arrival = documents.find(
      (item) =>
        item.type === 'ELECTRONIC_AUTHORIZATION' &&
        item.issuingCountry === 'SG',
    )!;
    expect(
      renderToStaticMarkup(<DocumentArtwork document={arrival} />),
    ).toContain('not a visa or entry permission');
    const eta = documents.find(
      (item) =>
        item.type === 'ELECTRONIC_AUTHORIZATION' &&
        item.issuingCountry === 'CA',
    )!;
    expect(renderToStaticMarkup(<DocumentArtwork document={eta} />)).toContain(
      'an eTA is not a passenger paper permit',
    );
  });
});
