// Phase 2 features behind the Experimental flags, exercised through the UI.
import { test, expect } from '@playwright/test';
import { PRNG, watch } from './helpers.js';

async function practice(page, kind, flags = []) {
  await page.addInitScript(PRNG);
  await page.goto('./');
  await page.click('#labBox summary');
  for (const f of flags) await page.check('#' + f);
  await page.click('#nav-practice');
  await page.click('#setBox summary');
  const chips = page.locator('#kindChips button');
  await chips
    .nth(['note', 'interval', 'chord', 'inv', 'degree', 'melody', 'prog', 'cadence', 'scale'].indexOf(kind))
    .click();
  await chips.nth(0).click();
}

test('labMelody: dictated melodies end on 1, 3 or 5 and never repeat a note', async ({ page }) => {
  const problems = watch(page);
  await page.clock.install();
  await practice(page, 'melody', ['labMelody']);
  await page.selectOption('#melLen', '6');
  await page.click('#btnPlay');
  for (let i = 0; i < 12; i++) {
    const len = await page.locator('#answers .slots').first().locator('.slot').count();
    for (let k = 0; k < len; k++) await page.locator('#answers .grid button').first().click();
    const seq = (await page.locator('#msg b').textContent()).split('   ')[0].split(' ');
    expect(seq).toHaveLength(6);
    expect(['1', '3', '5']).toContain(seq.at(-1));
    for (let k = 1; k < seq.length; k++) expect(seq[k]).not.toBe(seq[k - 1]);
    await page.clock.runFor(2500);
  }
  expect(problems).toEqual([]);
});

test('labMelody: minor-key practice asks minor and modal progressions', async ({ page }) => {
  await page.clock.install();
  await practice(page, 'prog', ['labMelody']);
  await page.selectOption('#keyQual', 'min');
  await page.click('#btnPlay');
  const buttons = await page.locator('#answers .grid button').allTextContents();
  expect(buttons).toContain('i');
  expect(buttons).toContain('iv');
  expect(buttons).not.toContain('I');
  expect(await page.locator('#msg').textContent()).toBeTruthy();
});

test('without the flag, progressions stay major', async ({ page }) => {
  await practice(page, 'prog');
  await page.selectOption('#keyQual', 'min');
  await page.click('#btnPlay');
  const buttons = await page.locator('#answers .grid button').allTextContents();
  expect(buttons).toContain('I');
  expect(buttons).not.toContain('i');
});

test('labSrs: answers create review cards, and due cards drive the Review button', async ({ page }) => {
  const problems = watch(page);
  await page.clock.install();
  await practice(page, 'interval', ['labSrs']);
  await page.click('#btnPlay');
  await page.locator('#answers .grid button').first().click();
  const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('pe.prog')));
  const cards = Object.values(prog.srs.interval);
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({ reps: expect.any(Number), interval: 1, history: [{ q: expect.any(Number) }] });

  // A chord card that was due yesterday.
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('pe.prog'));
    p.srs.chord = { dim7: { ef: 2.5, reps: 2, interval: 6, due: '2000-01-01', history: [] } };
    localStorage.setItem('pe.prog', JSON.stringify(p));
  });
  await page.reload();
  await expect(page.locator('.due')).toContainText('1');
  await page.click('#btnReview');
  await expect(page.locator('#nav-practice')).toHaveAttribute('aria-selected', 'true');
  await page.click('#btnPlay');
  // Practice is set to notes only; review drills the kind that is due.
  const symbols = await page.locator('#answers .grid button b').allTextContents();
  expect(symbols).toContain('\u00b07');
  expect(problems).toEqual([]);
});

test('without labSrs no review cards are recorded', async ({ page }) => {
  await practice(page, 'interval');
  await page.click('#btnPlay');
  await page.locator('#answers .grid button').first().click();
  const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('pe.prog')));
  expect(prog.srs).toEqual({});
  await page.click('#nav-map');
  await expect(page.locator('.due')).toHaveCount(0);
});
