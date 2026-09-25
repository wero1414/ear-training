// One test per fixed bug, each reproducing the original failure through the UI.
// REG_URL points them at another page (e.g. the seed) to confirm they catch the bug.
import { test, expect } from '@playwright/test';
import { PRNG } from './helpers.js';

const URL = process.env.REG_URL ?? './';

async function openPractice(page, kinds) {
  await page.click('#nav-practice');
  await page.click('#setBox summary');
  for (const k of kinds) await page.locator('#kindChips button', { hasText: new RegExp('^' + k + '$') }).click();
  await page.locator('#kindChips button', { hasText: /^notes$/ }).click();
}

async function statRows(page) {
  await page.click('#statBox summary');
  return page
    .locator('#statTbl tr:not(.h)')
    .evaluateAll(rows => rows.map(r => [r.querySelector('td.n').textContent, r.querySelector('td.c').textContent]));
}

for (const [name, setup] of [
  ['chromatic', page => page.check('#chrom')],
  ['minor key', page => page.selectOption('#keyQual', 'min')],
]) {
  test(`degree stats: ${name} answers are labelled by the degree that was asked`, async ({ page }) => {
    await page.addInitScript(PRNG);
    await page.clock.install();
    await page.goto(URL);
    await openPractice(page, ['degrees']);
    await setup(page);
    await page.click('#btnPlay');
    const asked = [];
    for (let i = 0; i < 12; i++) {
      await page.locator('#answers .grid button').first().click();
      asked.push((await page.locator('#msg b').textContent()).split('  of  ')[0]);
      await page.clock.runFor(2400);
    }
    const rows = await statRows(page);
    for (const [label] of rows) expect(asked).toContain(label);
    expect(rows.map(r => r[0]).sort()).toEqual([...new Set(asked)].sort());
  });
}

test('degree stats: v1 progress migrates without changing the labels it showed', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem(
        'pe.prog',
        JSON.stringify({ xp: 10, stats: { degree: { 1: { n: 2, ok: 1 }, 9: { n: 1, ok: 1 } } } }),
      );
    }
  });
  await page.goto(URL);
  expect(await statRows(page)).toEqual([
    ['2', '50%  n=2'],
    ['6', '100%  n=1'],
  ]);
  await openPractice(page, ['intervals']); // chip clicks save
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pe.prog')));
  expect(stored.schema).toBe(2);
  expect(stored.stats.degree).toEqual({ 2: { n: 2, ok: 1 }, 9: { n: 1, ok: 1 } });
  expect(stored.xp).toBe(10);
});
