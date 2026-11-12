import assert from 'node:assert/strict';
import type { Browser } from 'playwright';
import { dailyForDate, type ContentLibrary } from '../../src/content/library';
import { playQueue } from './browser-milestone3';

export async function runNetworkBrowserChecks(
  browser: Browser,
  baseURL: string,
  library: ContentLibrary,
) {
  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['mobile', { width: 390, height: 844 }],
  ] as const) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-11-04T12:00:00Z') });
    await page.goto(baseURL);
    await page.getByText('SFO · Tokyo connections', { exact: true }).waitFor();
    for (const date of ['2026-11-04', '2026-11-05', '2026-11-06']) {
      const daily = dailyForDate(library, date)!;
      const pool = daily.content.dailyPools.find(
        (pool) => pool.id === daily.selection.poolId,
      )!;
      const stage = daily.content.stages.find(
        (stage) => stage.id === pool.stageId,
      )!;
      await page.goto(`${baseURL}/?mode=daily&date=${date}`);
      await page
        .getByRole('heading', { name: stage.title, exact: true })
        .waitFor();
      assert(
        (await page.locator('.counter-sign').innerText()).includes(
          stage.departureAirport,
        ),
      );
      await page
        .getByRole('link', {
          name: `${stage.network!.modeledOn} network 1`,
          exact: true,
        })
        .waitFor();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (date === '2026-11-04') {
        await page
          .getByRole('button', { name: 'Start daily shift', exact: true })
          .click();
        await playQueue(page, daily.content, daily.selection.caseIds, {
          reload: true,
        });
        await page
          .getByText('6 of 6 correct · 750 of 750 points.', { exact: true })
          .waitFor();
        await page.getByText(/Your first daily result is saved/).waitFor();
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
      }
    }
    for (const stage of library.current.stages.filter(
      (stage) => stage.network,
    )) {
      await page.goto(`${baseURL}/?mode=stage`);
      await page
        .getByRole('heading', { name: 'Practice shifts', exact: true })
        .waitFor();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.getByRole('button', { name: new RegExp(stage.title) }).click();
      await page
        .getByRole('button', { name: 'Start shift', exact: true })
        .click();
      await playQueue(page, library.current, stage.caseIds, {
        afterInspect: async (id) => {
          if (id === 'ana-003')
            await page
              .getByText('JP · Ground transfer · Landside connection', {
                exact: true,
              })
              .waitFor();
          if (id === 'ana-001') {
            if (name === 'mobile')
              await page
                .getByRole('button', { name: 'Travel reference', exact: true })
                .click();
            await page
              .getByLabel('Jurisdiction', { exact: true })
              .selectOption('HK');
            await page.getByText('1 matching rule', { exact: true }).waitFor();
            if (name === 'mobile')
              await page
                .getByRole('button', { name: 'Passenger', exact: true })
                .click();
          }
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          );
          if (id === 'ana-003')
            await page.screenshot({
              path: `test-results/${name}-network-transfer.png`,
              fullPage: true,
            });
        },
      });
      await page
        .getByText('8 of 8 correct · 1000 of 1000 points.', { exact: true })
        .waitFor();
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      `${name}: three rotating network briefings, new daily/history, all 24 practice outcomes, ground transfer and jurisdiction filter passed.`,
    );
  }
}
