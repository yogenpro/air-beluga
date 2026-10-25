import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { Browser, Page } from 'playwright';
import { dailyForDate, type ContentLibrary } from '../../src/content/library';
import type { ContentBundle, GameSession } from '../../src/core/types';
import { DAILY_RESULTS_KEY } from '../../src/storage/daily-results';

async function expectText(page: Page, text: string) {
  await page.getByText(text, { exact: true }).waitFor({ state: 'visible' });
}
async function savedDaily(page: Page): Promise<GameSession> {
  await page.getByText(/Progress saved on this device/).waitFor();
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((value) =>
      value.startsWith('air-beluga:daily-progress:'),
    )!;
    return JSON.parse(localStorage.getItem(key)!).session as GameSession;
  });
}
async function playQueue(
  page: Page,
  content: ContentBundle,
  caseIds: string[],
  options: {
    daily: boolean;
    reload?: boolean;
    firstWrong?: boolean;
    offline?: () => Promise<void>;
  },
) {
  for (const [index, id] of caseIds.entries()) {
    const item = content.cases.find((entry) => entry.id === id)!;
    await page
      .getByRole('heading', {
        name: `Passenger ${index + 1} of ${caseIds.length}: ${item.passenger.displayName}`,
        exact: true,
      })
      .waitFor();
    await page
      .getByRole('button', { name: 'Inspect passport (passport)', exact: true })
      .click();
    for (const questionId of item.resolution.paths[0]!.requiredQuestionIds) {
      const question = item.questions.find((entry) => entry.id === questionId)!;
      await page
        .getByRole('button', { name: question.label, exact: true })
        .click();
      await expectText(page, question.response);
    }
    if (options.reload && index === 1) {
      await page.reload();
      await expectText(page, 'Your saved progress has been restored.');
      for (const questionId of item.resolution.paths[0]!.requiredQuestionIds) {
        await expectText(
          page,
          item.questions.find((entry) => entry.id === questionId)!.response,
        );
      }
      await options.offline?.();
    }
    const wrong = options.firstWrong && index === 0;
    const disposition = wrong
      ? item.resolution.expectedDecision === 'CHECK_IN'
        ? 'Deny'
        : 'Check in'
      : { CHECK_IN: 'Check in', DENY: 'Deny', ESCALATE: 'Escalate' }[
          item.resolution.expectedDecision
        ];
    await page.getByRole('button', { name: disposition, exact: true }).click();
    await expectText(page, wrong ? 'Incorrect' : 'Correct');
    assert(
      (await page
        .getByRole('link', {
          name: 'Immigration, Refugees and Citizenship Canada (IRCC)',
          exact: true,
        })
        .count()) > 0,
      'Feedback must contain official source links',
    );
    if (options.reload && index === 0) {
      await page.reload();
      await expectText(page, 'Your saved progress has been restored.');
      await expectText(page, 'Correct');
    }
    const last = index === caseIds.length - 1;
    await page
      .getByRole('button', {
        name: last
          ? options.daily
            ? 'View daily summary'
            : 'View stage summary'
          : 'Next passenger',
        exact: true,
      })
      .click();
  }
}

export async function runMilestone3BrowserChecks(
  browser: Browser,
  baseURL: string,
  content: ContentBundle,
  library: ContentLibrary,
) {
  const authored = content.stages.find((stage) => stage.id === '002-sfo-yvr')!;
  const stageContext = await browser.newContext();
  const stagePage = await stageContext.newPage();
  await stagePage.goto(baseURL);
  await stagePage
    .getByRole('button', { name: 'Start stage', exact: true })
    .click();
  await playQueue(stagePage, content, authored.caseIds, { daily: false });
  await expectText(stagePage, '8 of 8 correct · 1000 of 1000 points.');
  await stageContext.close();

  const date = '2026-10-25';
  const expected = dailyForDate(library, date)!;
  let firstClientIds: string[] | undefined;
  for (const [name, viewport] of [
    ['desktop', { width: 1280, height: 900 }],
    ['mobile', { width: 390, height: 844 }],
  ] as const) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let requests = 0;
    page.on('request', () => requests++);
    await page.goto(`${baseURL}/?mode=daily&date=${date}`);
    await page
      .getByRole('button', { name: 'Start daily challenge', exact: true })
      .focus();
    await page.keyboard.press('Enter');
    const initial = await savedDaily(page);
    assert.deepEqual(initial.caseIds, expected.selection.caseIds);
    if (firstClientIds)
      assert.deepEqual(
        initial.caseIds,
        firstClientIds,
        'Clients must receive identical daily case IDs and order',
      );
    else firstClientIds = initial.caseIds;
    let offlineRequestCount = 0;
    await playQueue(page, expected.content, initial.caseIds, {
      daily: true,
      reload: true,
      offline: async () => {
        offlineRequestCount = requests;
        await context.setOffline(true);
      },
    });
    await expectText(page, '6 of 6 correct · 750 of 750 points.');
    await page.getByText(/Your first daily result is saved/).waitFor();
    assert.equal(
      requests,
      offlineRequestCount,
      'Daily actions must not make network requests',
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: `test-results/${name}-daily.png`,
      fullPage: true,
    });
    await page
      .getByRole('button', { name: 'Daily results', exact: true })
      .click();
    await page
      .getByRole('button', {
        name: `View frozen result for ${date}`,
        exact: true,
      })
      .click();
    await page
      .getByRole('heading', { name: 'Daily challenge complete', exact: true })
      .waitFor();
    await expectText(page, '6 of 6 correct · 750 of 750 points.');
    await page.getByText('Review decision', { exact: true }).first().click();
    await page
      .getByRole('link', {
        name: 'Immigration, Refugees and Citizenship Canada (IRCC)',
        exact: true,
      })
      .first()
      .waitFor({ state: 'visible' });
    assert.equal(
      requests,
      offlineRequestCount,
      'Reviewing saved results must use already-loaded snapshots',
    );
    await context.setOffline(false);
    await page.reload();
    await page
      .getByRole('button', {
        name: `View frozen result for ${date}`,
        exact: true,
      })
      .waitFor();
    const originalHistory = await page.evaluate(
      (key) => localStorage.getItem(key),
      DAILY_RESULTS_KEY,
    );
    assert(originalHistory?.includes(expected.selection.contentVersion));

    if (name === 'desktop') {
      await page
        .getByRole('button', { name: 'Daily challenge', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Play again', exact: true })
        .click();
      await playQueue(page, expected.content, initial.caseIds, {
        daily: true,
        firstWrong: true,
      });
      await expectText(page, '5 of 6 correct · 625 of 750 points.');
      assert.equal(
        await page.evaluate(
          (key) => localStorage.getItem(key),
          DAILY_RESULTS_KEY,
        ),
        originalHistory,
        'Replay must preserve first completion',
      );

      // Simulate a later deployment with changed scoring and a new UTC boundary.
      const newer = structuredClone(content);
      newer.manifest.contentVersion = 'browser-test-v2';
      newer.manifest.scoring.correctDecision = 999;
      const index = structuredClone(library.index);
      const bytes = JSON.stringify(newer);
      index.currentContentVersion = newer.manifest.contentVersion;
      index.releases.push({
        contentVersion: newer.manifest.contentVersion,
        path: 'releases/browser-test-v2/bundle.json',
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
      index.dailySchedule.push({
        from: '2026-10-26',
        contentVersion: newer.manifest.contentVersion,
        poolId: 'canada-pool-v1',
      });
      await context.route('**/data/manifest.json', (route) =>
        route.fulfill({ json: newer.manifest }),
      );
      await context.route('**/data/releases.json', (route) =>
        route.fulfill({ json: index }),
      );
      await context.route(
        '**/data/releases/browser-test-v2/bundle.json',
        (route) =>
          route.fulfill({ body: bytes, contentType: 'application/json' }),
      );
      await page.goto(`${baseURL}/?mode=results`);
      await page
        .getByRole('button', {
          name: `View frozen result for ${date}`,
          exact: true,
        })
        .click();
      await expectText(page, '6 of 6 correct · 750 of 750 points.');
      assert.equal(
        await page.evaluate(
          (key) => localStorage.getItem(key),
          DAILY_RESULTS_KEY,
        ),
        originalHistory,
      );
      await context.route(
        `**/data/releases/${content.manifest.contentVersion}/bundle.json`,
        (route) => route.abort(),
      );
      await page.reload();
      await expectText(
        page,
        'The matching frozen content is unavailable. Your stored result has been kept.',
      );
      assert.equal(
        await page.evaluate(
          (key) => localStorage.getItem(key),
          DAILY_RESULTS_KEY,
        ),
        originalHistory,
      );
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      `${name}: source-reviewed daily, matching client order, offline play/history, resume and frozen results passed.`,
    );
  }

  const midnight = await browser.newContext();
  const midnightPage = await midnight.newPage();
  await midnightPage.clock.install({ time: new Date('2026-10-25T23:59:30Z') });
  await midnightPage.goto(`${baseURL}/?mode=daily`);
  await midnightPage
    .getByRole('button', { name: 'Start daily challenge', exact: true })
    .click();
  const before = await savedDaily(midnightPage);
  await midnightPage.clock.fastForward(60_000);
  await midnightPage.getByText(/Today is 2026-10-26 UTC/).waitFor();
  assert.equal(
    await midnightPage
      .getByLabel('Daily UTC date', { exact: true })
      .inputValue(),
    date,
    'Midnight must not replace an in-progress daily',
  );
  assert.deepEqual((await savedDaily(midnightPage)).caseIds, before.caseIds);
  await midnightPage
    .getByRole('button', { name: "Play today's challenge", exact: true })
    .click();
  await midnightPage
    .getByRole('button', { name: 'Start daily challenge', exact: true })
    .waitFor();
  await midnight.close();
  console.log(
    'Verified stage, release rollover, missing-archive retention and UTC midnight behavior passed.',
  );
}
