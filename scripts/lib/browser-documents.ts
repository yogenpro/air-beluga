import assert from 'node:assert/strict';
import type { Browser } from 'playwright';
import { dailyForDate, type ContentLibrary } from '../../src/content/library';
import { createDailySession } from '../../src/core/engine';
import { sessionProgressKey } from '../../src/storage/progress';
import { playQueue } from './browser-milestone3';

export async function runDocumentBrowserChecks(
  browser: Browser,
  baseURL: string,
  library: ContentLibrary,
) {
  const content = library.current;
  const stage = content.stages.find(
    (item) => item.id === '003-sfo-yvr-documents',
  )!;
  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['mobile', { width: 390, height: 844 }],
  ] as const) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors: string[] = [];
    let requests = 0;
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', () => requests++);
    await page.goto(`${baseURL}/?mode=stage&stage=${stage.id}`);
    await page
      .getByRole('button', { name: 'Start shift', exact: true })
      .click();
    assert.equal(
      await page
        .getByRole('button', {
          name: 'Inspect residence permit (green-card)',
          exact: true,
        })
        .count(),
      0,
      'Hidden Green Card must not leak into the desk',
    );
    await page.getByRole('button', { name: 'Check in', exact: true }).click();
    await page.getByText('Incorrect', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await page
      .getByRole('button', { name: 'Restart shift', exact: true })
      .click();
    const initialRequests = requests;
    await context.setOffline(true);
    await playQueue(page, content, stage.caseIds, {
      afterInspect: async (id) => {
        if (id === 'ca-014' || id === 'ca-016') {
          await page
            .getByRole('button', {
              name: 'Inspect residence permit (green-card)',
              exact: true,
            })
            .click();
          assert(
            (await page.locator('#document-green-card').innerText()).includes(
              'I-551',
            ),
          );
          if (id === 'ca-016')
            assert(
              (await page.locator('#document-green-card').innerText()).includes(
                '2026-10-25',
              ),
            );
        }
        if (id === 'ca-017' || id === 'ca-020') {
          const text = await page
            .locator('#document-travel-document')
            .innerText();
          assert(text.includes(id === 'ca-017' ? 'I-571' : 'I-327'));
          assert.equal(
            await page
              .getByRole('button', {
                name: 'Inspect passport (passport)',
                exact: true,
              })
              .count(),
            0,
          );
        }
        if (id === 'ca-021') {
          const text = await page.locator('#document-passport').innerText();
          assert(
            text.includes('temporary') && text.includes('No · non-electronic'),
          );
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({
            path: `test-results/${name}-temporary-passport.png`,
            fullPage: true,
          });
        }
        if (id === 'ca-023')
          assert(
            (await page.locator('#document-passport').innerText()).includes(
              'diplomatic',
            ),
          );
        if (id === 'ca-024')
          assert(
            (await page.locator('#document-passport').innerText()).includes(
              'official',
            ),
          );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
      },
    });
    await page
      .getByText('12 of 12 correct · 1500 of 1500 points.', { exact: true })
      .waitFor();
    assert.equal(
      requests,
      initialRequests,
      'The full advanced shift must work offline',
    );
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      `${name}: all twelve harder cases, hidden Green Card, I-571/I-327, passport metadata and offline completion passed.`,
    );
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-10-26T23:59:30Z') });
  const previous = dailyForDate(library, '2026-10-26')!;
  const previousKey = sessionProgressKey(
    createDailySession(previous.content, previous.selection),
  );
  await page.goto(`${baseURL}/?mode=daily&date=2026-10-26`);
  await page
    .getByRole('button', { name: 'Start daily shift', exact: true })
    .click();
  await page.getByText(/Progress saved on this device/).waitFor();
  const saved = await page.evaluate(
    (key) => localStorage.getItem(key),
    previousKey,
  );
  await page.clock.fastForward(60_000);
  await page.getByText('Today is 2026-10-27 UTC', { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel('Daily UTC date', { exact: true }).inputValue(),
    '2026-10-26',
  );
  assert.equal(
    await page.evaluate((key) => localStorage.getItem(key), previousKey),
    saved,
  );
  await page
    .getByRole('button', { name: "Play today's challenge", exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Start daily shift', exact: true })
    .click();
  const current = dailyForDate(library, '2026-10-27')!;
  const key = sessionProgressKey(
    createDailySession(current.content, current.selection),
  );
  const record = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).session,
    key,
  );
  assert.equal(record.contentVersion, 'canada-documents-2026-10-26-v2');
  assert.deepEqual(record.caseIds, current.selection.caseIds);
  await playQueue(page, current.content, current.selection.caseIds, {});
  await page
    .getByText('6 of 6 correct · 750 of 750 points.', { exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole('heading', { name: 'Daily shift complete', exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate((key) => localStorage.getItem(key), previousKey),
    saved,
  );
  await context.close();
  console.log(
    'Document daily release boundary, retained in-progress old shift, new queue and reload passed.',
  );
}
