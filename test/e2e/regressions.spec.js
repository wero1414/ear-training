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

// Melodies are always diatonic; "Chromatic degrees" used to relabel their answer buttons
// as if the degree indices were semitones.
for (const [qual, want] of [
  ['maj', ['1', '2', '3', '4', '5', '6', '7']],
  ['min', ['1', '2', '\u266d3', '4', '5', '\u266d6', '\u266d7']],
]) {
  test(`melody labels stay diatonic with chromatic degrees on (${qual})`, async ({ page }) => {
    await page.addInitScript(PRNG);
    await page.goto(URL);
    await openPractice(page, ['melody']);
    await page.check('#chrom');
    await page.selectOption('#keyQual', qual);
    await page.click('#btnPlay');
    expect(await page.locator('#answers .grid button').allTextContents()).toEqual(want);
    const len = await page.locator('#answers .slots').first().locator('.slot').count();
    for (let i = 0; i < len; i++) await page.locator('#answers .grid button').nth(i).click();
    expect(await page.locator('#answers .slots').first().locator('.slot').allTextContents()).toEqual(
      want.slice(0, len),
    );
    const truth = (await page.locator('#msg b').textContent()).split('   in ')[0].split(' ');
    for (const label of truth) expect(want).toContain(label);
  });
}

// Stage-run timeouts (next trial, end of run) were never cancelled, so leaving a run
// during the post-answer delay either crashed endRun or drove the next run.
async function startStage(page) {
  await page.click('#nav-map');
  await page.click('[data-c="0"][data-s="0"]');
  await page.click('#btnPlay');
}

test('quitting during the end-of-run delay does not throw', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(PRNG);
  await page.clock.install();
  await page.goto(URL);
  await startStage(page);
  for (let i = 0; i < 12; i++) {
    await page.locator('#answers .kb .k:not([disabled])').first().click();
    const lives = await page.locator('#hh span:not(.off)').count();
    if (lives === 0 || (await page.locator('#hq').textContent()) === '12 / 12') break;
    await page.clock.runFor(2100);
  }
  await page.click('#btnQuit');
  await page.clock.runFor(3000);
  expect(errors).toEqual([]);
  await expect(page.locator('#nav-map')).toHaveAttribute('aria-selected', 'true');
});

test('a new stage run does not start itself from the previous run', async ({ page }) => {
  await page.addInitScript(PRNG);
  await page.clock.install();
  await page.goto(URL);
  await startStage(page);
  await page.locator('#answers .kb .k:not([disabled])').first().click();
  await page.click('#btnQuit');
  await page.click('[data-c="0"][data-s="0"]');
  await page.clock.runFor(3000);
  await expect(page.locator('#msg')).toHaveText('Headphones on. Press start.');
  await expect(page.locator('#answers')).toBeEmpty();
});

// Starting the jam on a fresh page built the shared noise buffer by scheduling a burst
// 99 s in the past; with the audio clock under 99 s that is a negative time, Web Audio
// throws, the first bar is abandoned half-scheduled and then scheduled again.
test('starting the jam on a fresh page does not throw', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL);
  await page.click('#nav-jam');
  await page.click('#jamBtn');
  await page.waitForTimeout(400);
  await page.click('#jamBtn');
  expect(errors).toEqual([]);
});
