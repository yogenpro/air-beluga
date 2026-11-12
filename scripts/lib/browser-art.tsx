import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Browser } from 'playwright';
import type { ContentLibrary } from '../../src/content/library';
import { DocumentView } from '../../src/ui/DocumentView';
import { getDocumentDesign } from '../../src/ui/documentDesigns';

/** A test-only specimen gallery: no debug route or hidden-case gallery ships in the game. */
export async function runDocumentArtBrowserChecks(
  browser: Browser,
  baseURL: string,
  library: ContentLibrary,
) {
  const documents = library.current.cases.flatMap((item) => item.documents);
  const examples = [
    ...new Map(
      documents.map((document) => [getDocumentDesign(document)!.id, document]),
    ).values(),
  ];
  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['mobile', { width: 390, height: 844 }],
  ] as const) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(baseURL);
    const styles = await page
      .locator('link[rel="stylesheet"]')
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLLinkElement).href),
      );
    const gallery = renderToStaticMarkup(
      <main style={{ maxWidth: '1200px', margin: 'auto', padding: '16px' }}>
        <h1>Document specimen review</h1>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              viewport.width > 600
                ? 'repeat(2,minmax(0,1fr))'
                : 'minmax(0,1fr)',
            gap: '24px',
          }}
        >
          {examples.map((document) => (
            <section
              key={getDocumentDesign(document)!.id}
              style={{ minWidth: 0, padding: '12px', background: '#f8f2e1' }}
            >
              <h2 style={{ fontSize: '14px' }}>
                {getDocumentDesign(document)!.id}
              </h2>
              <DocumentView
                document={document}
                inspected
                onInspect={() => {}}
              />
            </section>
          ))}
        </div>
      </main>,
    );
    await page.setContent(
      `<!doctype html><html><head>${styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('')}</head><body>${gallery}</body></html>`,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(
      () => Array.from(document.styleSheets).length > 0,
    );
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('.art-pattern')).length > 0,
    );
    const image = await context.request.get(
      `${baseURL}/art/documents/issuer-patterns-v1.png`,
    );
    assert.equal(image.status(), 200);
    assert.equal(await page.locator('.document-art').count(), examples.length);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${name}: artwork gallery must fit the viewport`,
    );
    const overflow = await page
      .locator('.document-art')
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => node.scrollWidth > node.clientWidth + 2)
          .map((node) => node.getAttribute('data-design')),
      );
    assert.deepEqual(
      overflow,
      [],
      `${name}: document text must stay inside its artwork`,
    );
    await page.screenshot({
      path: `test-results/${name}-document-art-gallery.png`,
      fullPage: true,
    });
    await context.close();
    console.log(
      `${name}: ${examples.length} country/form artwork profiles, live evidence, asset loading and no overflow passed.`,
    );
  }
  // Real app behavior, including native modal keyboard handling and offline card flips.
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/?mode=stage&stage=001-sfo`);
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await page
    .getByRole('button', { name: 'Inspect passport (passport)', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Enlarge passport', exact: true })
    .click();
  await page.getByRole('dialog').waitFor();
  assert((await page.getByRole('dialog').innerText()).includes('Ari Vale'));
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await context.setOffline(true);
  await page
    .getByRole('button', { name: 'Enlarge passport', exact: true })
    .click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('button', { name: 'Close ×', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page
    .getByRole('button', { name: 'Close passport (passport)', exact: true })
    .click();
  const stage = library.current.stages.find((item) => item.id === '001-sfo')!;
  let flipped = false;
  for (const caseId of stage.caseIds) {
    const item = library.current.cases.find((item) => item.id === caseId)!;
    for (const questionId of item.resolution.paths[0]!.requiredQuestionIds) {
      const question = item.questions.find(
        (question) => question.id === questionId,
      )!;
      await page
        .getByRole('button', { name: question.label, exact: true })
        .click();
    }
    const card = item.documents.find(
      (document) => getDocumentDesign(document)?.layout === 'uk-residence-card',
    );
    if (!card) {
      const label = {
        CHECK_IN: 'Check in',
        DENY: 'Deny',
        ESCALATE: 'Escalate',
      }[item.resolution.expectedDecision];
      await page.getByRole('button', { name: label, exact: true }).click();
      await page
        .getByRole('heading', { name: 'Decision feedback', exact: true })
        .waitFor();
      await page
        .getByRole('button', { name: 'Next passenger', exact: true })
        .click();
      continue;
    }
    await page
      .getByRole('button', {
        name: `Inspect residence permit (${card.id})`,
        exact: true,
      })
      .click();
    await page
      .getByRole('button', {
        name: `Show reverse of ${card.id}`,
        exact: true,
      })
      .click();
    await page.locator(`#document-${card.id} .art-card-reverse`).waitFor();
    await page
      .getByRole('button', { name: `Enlarge ${card.id}`, exact: true })
      .click();
    await page.getByRole('dialog').locator('.art-card-reverse').waitFor();
    await page.screenshot({
      path: 'test-results/mobile-residence-reverse-enlarged.png',
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    await page
      .getByRole('button', { name: `Show front of ${card.id}`, exact: true })
      .click();
    await page.locator(`#document-${card.id} .art-resident-face`).waitFor();
    flipped = true;
    break;
  }
  assert(
    flipped,
    'A real revealed residence card must support offline front/reverse inspection',
  );
  await context.close();
  console.log(
    'Mobile enlarged inspection, native Escape/close and offline residence-card reverse passed.',
  );
}
