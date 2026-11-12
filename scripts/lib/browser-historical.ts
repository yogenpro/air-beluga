import assert from 'node:assert/strict';
import type { Browser } from 'playwright';
import type { ContentLibrary } from '../../src/content/library';
import { playQueue } from './browser-milestone3';

export async function runHistoricalBrowserChecks(
  browser: Browser,
  baseURL: string,
  library: ContentLibrary,
) {
  const content = library.current;
  const stage = content.stages.find(
    (stage) => stage.id === '004-del-yvr-2021',
  )!;
  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['mobile', { width: 390, height: 844 }],
  ] as const) {
    const context = await browser.newContext({
      viewport,
      timezoneId: name === 'mobile' ? 'America/Los_Angeles' : 'Asia/Tokyo',
    });
    const page = await context.newPage();
    const errors: string[] = [];
    let requests = 0,
      offlineRequests = 0;
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', () => requests++);
    await page.clock.install({ time: new Date('2035-04-02T12:00:00Z') });
    await page.goto(`${baseURL}/?mode=stage`);
    const card = page.getByRole('button', {
      name: /15 October 2021: the 18-hour desk/,
    });
    assert((await card.innerText()).includes('HISTORICAL · 2021-10-15'));
    await card.click();
    await page
      .getByRole('heading', { name: 'Historical shift', exact: true })
      .waitFor();
    await page.getByText('HISTORICAL SHIFT', { exact: true }).waitFor();
    await page
      .getByRole('button', { name: 'Start shift', exact: true })
      .click();
    if (name === 'mobile')
      await page
        .getByRole('button', { name: 'Travel reference', exact: true })
        .click();
    await page
      .getByText('Historical rules · As of 2021-10-15', { exact: true })
      .waitFor();
    await page.getByText(/Sources reviewed 2026-10-26/).waitFor();
    if (name === 'mobile')
      await page
        .getByRole('button', { name: 'Passenger', exact: true })
        .click();
    await page
      .getByText('Scheduled departure: 2021-10-15 12:00:00 UTC+05:30', {
        exact: true,
      })
      .waitFor();
    await playQueue(page, content, stage.caseIds, {
      reload: true,
      offline: async () => {
        offlineRequests = requests;
        await context.setOffline(true);
      },
      afterInspect: async (id) => {
        if (id === 'hist-009')
          assert.equal(
            await page
              .getByRole('button', {
                name: 'Inspect COVID test report (replacement-test)',
                exact: true,
              })
              .count(),
            0,
          );
      },
      afterQuestions: async (id) => {
        const item = content.cases.find((item) => item.id === id)!;
        for (const document of item.documents.filter(
          (document) => document.type === 'COVID_TEST',
        )) {
          await page
            .getByRole('button', {
              name: `Inspect COVID test report (${document.id})`,
              exact: true,
            })
            .click();
          const report = await page
            .locator(`#document-${document.id}`)
            .innerText();
          assert(
            report.includes('Sample collected') &&
              report.includes('Report issued') &&
              report.includes('Laboratory'),
          );
          assert(
            !report.includes('Valid until'),
            'A test report must not invent an expiry date',
          );
          if (id === 'hist-007')
            assert(report.includes('time zone not printed'));
          if (id === 'hist-012')
            assert(report.includes('2021-10-14 21:00:00 UTC'));
        }
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        if (id === 'hist-006')
          await page.screenshot({
            path: `test-results/${name}-historical-test-report.png`,
            fullPage: true,
          });
      },
    });
    await page
      .getByText('12 of 12 correct · 1500 of 1500 points.', { exact: true })
      .waitFor();
    assert.equal(
      requests,
      offlineRequests,
      'Remaining historical cases must play offline',
    );
    assert.deepEqual(errors, []);
    await context.setOffline(false);
    await page.reload();
    await page
      .getByText('12 of 12 correct · 1500 of 1500 points.', { exact: true })
      .waitFor();
    await context.close();
    console.log(
      `${name}: historical catalog/date, report timestamps/offsets, all 12 outcomes, offline play and reload passed.`,
    );
  }
}
