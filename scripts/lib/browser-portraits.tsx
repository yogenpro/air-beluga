import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Browser } from 'playwright';
import type { ContentLibrary } from '../../src/content/library';
import { Icon, PassengerPortrait } from '../../src/ui/Icons';

export async function runPortraitBrowserChecks(
  browser: Browser,
  baseURL: string,
  library: ContentLibrary,
) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto(baseURL);
  const styles = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) =>
      links.map((link) => (link as HTMLLinkElement).href),
    );
  const names = [
    ...new Set(library.current.cases.map((item) => item.passenger.displayName)),
  ];
  const gallery = renderToStaticMarkup(
    <main style={{ padding: 24, background: '#f5efd9', color: '#274b46' }}>
      <h1>Passenger portrait and flight icon review</h1>
      <div
        style={{
          display: 'flex',
          gap: 28,
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        {[16, 20, 24, 32, 48].map((size) => (
          <div key={size}>
            <div style={{ width: size, height: size }}>
              <Icon name="plane" />
            </div>
            <small>{size}px</small>
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8,minmax(0,1fr))',
          gap: 20,
        }}
      >
        {names.map((name) => (
          <article key={name}>
            <PassengerPortrait name={name} />
            <p style={{ fontSize: 12, marginTop: 6 }}>{name}</p>
          </article>
        ))}
      </div>
    </main>,
  );
  await page.setContent(
    `<!doctype html><html><head>${styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('')}<style>article .passenger-portrait{width:96px;height:112px} .icon-plane{width:100%;height:100%}</style></head><body>${gallery}</body></html>`,
  );
  await page.evaluate(() => document.fonts.ready);
  const icons = await page.locator('.icon-plane').evaluateAll((nodes) =>
    nodes.map((node) => {
      const path = node.querySelector('path')!;
      const b = path.getBBox();
      return {
        x: b.x,
        y: b.y,
        right: b.x + b.width,
        bottom: b.y + b.height,
        fill: getComputedStyle(path).fill,
        stroke: getComputedStyle(path).stroke,
      };
    }),
  );
  assert(
    icons.every(
      (icon) =>
        icon.x >= 0 &&
        icon.y >= 0 &&
        icon.right <= 24 &&
        icon.bottom <= 24 &&
        icon.fill !== 'none' &&
        icon.stroke === 'none',
    ),
    'All flight icons must use an unclipped filled silhouette',
  );
  await page.screenshot({
    path: 'test-results/passenger-portrait-flight-gallery.png',
    fullPage: true,
  });
  await page.goto(`${baseURL}/?mode=stage&stage=007-lhr-singapore-network`);
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  const main = await page
    .locator('.passenger-welcome .passenger-portrait')
    .getAttribute('data-portrait');
  await page
    .getByRole('button', { name: 'Inspect passport (passport)', exact: true })
    .click();
  assert.equal(
    await page
      .locator('#document-passport .passenger-portrait')
      .getAttribute('data-portrait'),
    main,
    'Document and desk portraits must show the same passenger',
  );
  assert(
    (await page.locator('.route-icon-wrap .icon-plane').count()) >= 2,
    'Multi-leg air itineraries must use the repaired shared plane',
  );
  await page.screenshot({
    path: 'test-results/desktop-multi-leg-portrait-flight.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: 'test-results/mobile-multi-leg-portrait-flight.png',
    fullPage: true,
  });
  await context.close();
  console.log(
    `${names.length} distinct passenger sprites, bounded flight silhouettes, consistent desk/document identity and desktop/mobile multi-leg route rendering passed.`,
  );
}
