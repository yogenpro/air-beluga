import assert from 'node:assert/strict';
import type { Browser, Page } from 'playwright';
import { dailyForDate, type ContentLibrary } from '../../src/content/library';
import { createDailySession } from '../../src/core/engine';
import { sessionProgressKey } from '../../src/storage/progress';
import { playQueue } from './browser-milestone3';

async function fits(page: Page) {
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    'The UI must fit the viewport',
  );
}
export async function runUiBrowserChecks(
  browser: Browser,
  baseURL: string,
  library: ContentLibrary,
) {
  const date = '2026-10-26';
  const daily = dailyForDate(library, date)!;
  const progressKey = sessionProgressKey(
    createDailySession(daily.content, daily.selection),
  );
  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['mobile', { width: 390, height: 844 }],
  ] as const) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors: string[] = [];
    const requests: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => requests.push(request.url()));
    await page.clock.install({ time: new Date(`${date}T12:00:00Z`) });
    await page.goto(baseURL);
    const primary = page.getByRole('button', {
      name: "Today's shift · Open shift briefing",
      exact: true,
    });
    await primary.waitFor();
    await page.evaluate(() => document.fonts.ready);
    await fits(page);
    assert.equal(
      await page.evaluate(() => localStorage.length),
      0,
      'The terminal must not start or overwrite a shift',
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/${name}-terminal.png`,
      fullPage: true,
    });
    await primary.focus();
    await page.keyboard.press('Enter');
    await page
      .getByRole('heading', { name: 'Make yourself comfortable.', exact: true })
      .waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/${name}-briefing.png`,
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(() => localStorage.length),
      0,
      'Reading the briefing does not begin a shift',
    );
    await page
      .getByRole('button', { name: 'Start daily shift', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Inspect passport (passport)', exact: true })
      .click();
    await page
      .getByRole('link', { name: 'Open travel reference', exact: true })
      .click();
    await page
      .getByRole('heading', { name: 'Travel reference', exact: true })
      .waitFor({ state: 'visible' });
    if (name === 'mobile')
      assert.equal(await page.locator('#passenger-pane').isVisible(), false);
    await fits(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/${name}-reference.png`,
      fullPage: true,
    });
    await page
      .getByRole('link', { name: 'Back to passenger', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Close passport (passport)', exact: true })
      .waitFor();
    await fits(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/${name}-daily-desk.png`,
      fullPage: true,
    });
    await page
      .getByRole('button', { name: 'Back to terminal', exact: true })
      .click();
    await page
      .getByRole('button', {
        name: "Today's shift · Continue shift",
        exact: true,
      })
      .waitFor();
    await page.goBack();
    await page
      .getByText('Your saved progress has been restored.', { exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole('button', { name: 'Close passport (passport)', exact: true })
        .isVisible(),
      true,
    );
    await page.goForward();
    await page
      .getByRole('button', {
        name: "Today's shift · Continue shift",
        exact: true,
      })
      .click();
    const restored = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).session,
      progressKey,
    );
    assert.deepEqual(restored.caseIds, daily.selection.caseIds);
    assert(restored.inspectedDocumentIds.includes('passport'));
    await page
      .getByRole('button', { name: 'Close passport (passport)', exact: true })
      .click();
    await playQueue(page, daily.content, daily.selection.caseIds, {});
    await page
      .getByRole('heading', { name: 'Daily shift complete', exact: true })
      .waitFor();
    await page
      .getByText('6 of 6 correct · 750 of 750 points.', { exact: true })
      .waitFor();
    await fits(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/${name}-shift-report.png`,
      fullPage: true,
    });
    await page
      .getByRole('button', { name: 'Back to terminal', exact: true })
      .first()
      .click();
    await page
      .getByRole('button', {
        name: "Today's shift · View shift report",
        exact: true,
      })
      .click();
    await page
      .getByRole('heading', { name: 'Daily shift complete', exact: true })
      .waitFor();
    await page
      .getByRole('button', { name: 'Shift history', exact: true })
      .click();
    await page
      .getByRole('button', {
        name: `View shift report for ${date}`,
        exact: true,
      })
      .click();
    await page
      .getByText('6 of 6 correct · 750 of 750 points.', { exact: true })
      .waitFor();
    await page
      .getByRole('navigation', { name: 'Game modes', exact: true })
      .getByRole('button', { name: 'Practice shifts', exact: true })
      .click();
    assert.equal(
      await page.locator('.catalog-card').count(),
      1,
      'The practice catalog must contain only the source-reviewed shift',
    );
    await page.locator('.catalog-card').click();
    await page
      .getByRole('button', { name: 'Start shift', exact: true })
      .waitFor();
    await page
      .getByRole('navigation', { name: 'Game modes', exact: true })
      .getByRole('button', { name: 'Training', exact: true })
      .click();
    await page
      .getByText(
        'Illustrative training fixture only. These invented requirements are not verified travel rules.',
        { exact: true },
      )
      .waitFor();
    await page
      .getByRole('button', { name: 'Start shift', exact: true })
      .click();
    await page
      .getByRole('heading', { name: 'Passenger 1 of 8: Ari Vale', exact: true })
      .waitFor();
    await fits(page);
    assert(
      requests.every((url) => url.startsWith(baseURL)),
      'All art, fonts, and game content must be self-hosted',
    );
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      `${name}: terminal, keyboard entry, mobile reference, browser history, resume, completion, history and training passed.`,
    );
  }
  const context = await browser.newContext({
    viewport: { width: 320, height: 740 },
  });
  const page = await context.newPage();
  await page.goto(baseURL);
  await page.getByRole('button', { name: /Today's shift/ }).waitFor();
  await fits(page);
  await context.close();
}
