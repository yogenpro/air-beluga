import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, type Page } from 'playwright';
import { preview } from 'vite';

// Test the production static build, not a backend or a browser simulation.
const browser = await chromium.launch();
const server = await preview({
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
}).catch(async (error: unknown) => {
  await browser.close();
  throw error;
});
const baseURL = 'http://127.0.0.1:4173';
const key = 'air-beluga:progress:001-sfo';

async function visible(page: Page, text: string) {
  await page.getByText(text, { exact: true }).waitFor({ state: 'visible' });
}
async function decision(page: Page, label: string, last = false) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page
    .getByRole('heading', { name: 'Decision feedback', exact: true })
    .waitFor();
  await visible(page, 'Correct');
  assert.equal(
    await page.getByRole('button', { name: label, exact: true }).isDisabled(),
    true,
  );
  await page
    .getByRole('button', {
      name: last ? 'View stage summary' : 'Next passenger',
      exact: true,
    })
    .click();
}
async function noOverflow(page: Page) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
    'Page must fit the viewport',
  );
}

try {
  await mkdir('test-results', { recursive: true });
  for (const [name, viewport] of [
    ['desktop', { width: 1280, height: 900 }],
    ['mobile', { width: 390, height: 844 }],
  ] as const) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors: string[] = [];
    const requests: { url: string; method: string }[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) =>
      requests.push({ url: request.url(), method: request.method() }),
    );
    await page.goto(baseURL);
    await page
      .getByRole('button', { name: 'Start stage', exact: true })
      .focus();
    await page.keyboard.press('Enter');
    await page
      .getByRole('heading', { name: 'Passenger 1 of 8: Ari Vale', exact: true })
      .waitFor();
    await page
      .getByRole('button', { name: 'Inspect passport (passport)', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Inspect visa (visa)', exact: true })
      .click();
    await page
      .getByRole('link', { name: 'Open travel reference', exact: true })
      .click();
    await page
      .getByLabel('Search rules', { exact: true })
      .fill('visitor permission');
    await page
      .getByText('Training visitor permission', { exact: true })
      .click();
    await page
      .getByText(/Invented exercise rule: fictional XZ visitors/)
      .waitFor({ state: 'visible' });
    await page.getByLabel('Jurisdiction', { exact: true }).selectOption('GB');
    await noOverflow(page);
    await page.screenshot({
      path: `test-results/${name}-desk.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Check in', exact: true }).focus();
    await page.keyboard.press('Enter');
    await visible(page, 'Correct');
    await page.reload();
    await page
      .getByRole('heading', { name: 'Decision feedback', exact: true })
      .waitFor();
    await visible(page, 'Your saved progress has been restored.');
    await page
      .getByRole('button', { name: 'Next passenger', exact: true })
      .click();
    await page
      .getByRole('heading', { name: 'Passenger 2 of 8: Bo Reed', exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole('button', { name: 'Inspect visa (visa)', exact: true })
        .count(),
      0,
      'Hidden visa must not appear',
    );
    await page
      .getByRole('button', { name: 'Ask for destination visa', exact: true })
      .click();
    await visible(page, 'Here is my training visitor visa.');
    await page
      .getByRole('button', { name: 'Inspect visa (visa)', exact: true })
      .click();
    await page.reload();
    await visible(page, 'Here is my training visitor visa.');
    assert.equal(
      await page
        .getByRole('button', {
          name: 'Ask for destination visa · Asked',
          exact: true,
        })
        .isDisabled(),
      true,
    );
    await page
      .getByRole('button', { name: 'Close visa (visa)', exact: true })
      .waitFor();
    const requestCount = requests.length;
    await context.setOffline(true);
    await decision(page, 'Check in');
    await decision(page, 'Deny');
    await page
      .getByRole('button', {
        name: 'Ask for a visa or residence permit',
        exact: true,
      })
      .click();
    await decision(page, 'Deny');
    await page
      .getByRole('button', { name: 'Ask for residence permit', exact: true })
      .click();
    await decision(page, 'Check in');
    await page
      .getByRole('button', {
        name: 'Ask about the manual-review status',
        exact: true,
      })
      .click();
    await decision(page, 'Escalate');
    await page
      .getByRole('button', { name: 'Ask for onward ticket', exact: true })
      .click();
    await decision(page, 'Check in');
    await page
      .getByRole('button', { name: 'Ask for second passport', exact: true })
      .click();
    await decision(page, 'Check in', true);
    await page
      .getByRole('heading', { name: 'Stage complete', exact: true })
      .waitFor();
    await visible(page, '8 of 8 correct · 1000 of 1000 points.');
    await noOverflow(page);
    assert.equal(
      requests.length,
      requestCount,
      'Playing the stage must make zero network requests',
    );
    assert.deepEqual(errors, [], 'No browser errors');
    assert(
      requests.every(
        (request) =>
          request.method === 'GET' &&
          request.url.startsWith(baseURL) &&
          !request.url.includes('/api/'),
      ),
      'Only local static assets may load',
    );
    await page.screenshot({
      path: `test-results/${name}-summary.png`,
      fullPage: true,
    });
    await context.setOffline(false);
    await page.reload();
    await page
      .getByRole('heading', { name: 'Stage complete', exact: true })
      .waitFor();
    await visible(page, '8 of 8 correct · 1000 of 1000 points.');
    await page.getByRole('button', { name: 'Play again', exact: true }).click();
    await page
      .getByRole('heading', { name: 'Passenger 1 of 8: Ari Vale', exact: true })
      .waitFor();
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await page
      .getByRole('button', { name: 'Keep playing', exact: true })
      .click();
    await page.evaluate((storageKey) => {
      const record = JSON.parse(localStorage.getItem(storageKey)!);
      record.storageVersion = 999;
      localStorage.setItem(storageKey, JSON.stringify(record));
    }, key);
    await page.reload();
    await visible(
      page,
      'Your saved progress uses an incompatible version. You can start a new stage.',
    );
    await page
      .getByRole('button', { name: 'Start stage', exact: true })
      .waitFor();
    await page.evaluate(
      (storageKey) => localStorage.setItem(storageKey, '{bad-json'),
      key,
    );
    await page.reload();
    await visible(
      page,
      'Your saved progress could not be read. You can start a new stage.',
    );
    await context.close();
    console.log(
      `${name}: complete stage, keyboard/mouse, reference, document requests, offline play, resume, restart, incompatible/corrupt saves passed.`,
    );
  }

  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage blocked', 'SecurityError');
      },
    });
  });
  const page = await blocked.newPage();
  await page.goto(baseURL);
  await visible(
    page,
    'Saving is unavailable in this browser. You can still play while this page stays open.',
  );
  await page.getByRole('button', { name: 'Start stage', exact: true }).click();
  await decision(page, 'Check in');
  await blocked.close();

  const premature = await browser.newContext();
  const prematurePage = await premature.newPage();
  await prematurePage.goto(baseURL);
  await prematurePage
    .getByRole('button', { name: 'Start stage', exact: true })
    .click();
  await decision(prematurePage, 'Check in');
  await prematurePage
    .getByRole('button', { name: 'Check in', exact: true })
    .click();
  await visible(prematurePage, 'Incorrect');
  await visible(prematurePage, 'Missing presented evidence: visa.');
  await visible(prematurePage, 'Required inquiries: Ask for destination visa.');
  await visible(prematurePage, 'Score: 125 / 1000');
  await prematurePage.reload();
  await visible(prematurePage, 'Incorrect');
  await prematurePage
    .getByRole('button', { name: 'Next passenger', exact: true })
    .click();
  await prematurePage
    .getByRole('button', { name: 'Restart', exact: true })
    .click();
  await prematurePage
    .getByRole('button', { name: 'Restart stage', exact: true })
    .click();
  await prematurePage
    .getByRole('heading', { name: 'Passenger 1 of 8: Ari Vale', exact: true })
    .waitFor();
  await visible(prematurePage, 'Score: 0 / 1000');
  await premature.close();

  const failure = await browser.newContext();
  await failure.route('**/data/manifest.json', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  const failedPage = await failure.newPage();
  await failedPage.goto(baseURL);
  await failedPage
    .getByRole('heading', {
      name: 'Unable to load training content',
      exact: true,
    })
    .waitFor();
  await failure.unroute('**/data/manifest.json');
  await failedPage
    .getByRole('button', { name: 'Retry loading', exact: true })
    .click();
  await failedPage
    .getByRole('button', { name: 'Start stage', exact: true })
    .waitFor();
  await failure.close();
  console.log(
    'Premature feedback, restart, blocked storage and failed-content retry passed. Milestone 2 browser acceptance passed.',
  );
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
