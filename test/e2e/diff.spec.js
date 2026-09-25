// Behaviour-freeze test for the Phase 0 restructure. Drives the seed prototype and the
// target build through one scripted session with Math.random seeded and the clock paused,
// and requires identical DOM, form values, localStorage and downloaded files after every
// step. The PRNG is reseeded per step so a divergence is reported at the step that caused
// it rather than smearing across the rest of the run.
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { SEED, watch, answer, verdict } from './helpers.js';

const TARGET = process.env.DIFF_TARGET ?? './';
const T0 = new Date('2026-03-02T10:00:00Z');

const PRNG = `(() => {
  let s = 1;
  Math.random = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  window.__reseed = n => { s = n; };
})();`;

async function snap(page, label) {
  return page.evaluate(label => {
    const wrap = document.querySelector('.wrap').cloneNode(true);
    // The countdown bar's width comes from a CSS transition on the real compositor
    // clock, which page.clock does not control.
    wrap.querySelectorAll('#timer i').forEach(i => i.removeAttribute('style'));
    const values = [...document.querySelectorAll('.wrap input, .wrap select')]
      .map(e => (e.id || e.className) + '=' + (e.type === 'checkbox' ? e.checked : e.value));
    return {
      label,
      html: wrap.innerHTML,
      values,
      set: localStorage.getItem('pe.set'),
      prog: localStorage.getItem('pe.prog'),
    };
  }, label);
}

async function download(page, click) {
  const [d] = await Promise.all([page.waitForEvent('download'), click()]);
  return { name: d.suggestedFilename(), body: (await readFile(await d.path())).toString('base64') };
}

async function scenario(browser, url) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const problems = watch(page);
  const out = [];
  let step = 0;
  const S = async label => {
    await page.clock.runFor(10);
    out.push(await snap(page, label));
    await page.evaluate(n => window.__reseed(n), ++step * 7919);
  };
  const next = () => page.clock.runFor(2400);

  await page.addInitScript(PRNG);
  await page.clock.install({ time: T0 });
  await page.clock.pauseAt(T0);
  await page.goto(url);
  await page.evaluate(() => window.__reseed(1));
  await S('boot');

  // A full stage run, answering alternately low and high until the run ends.
  await page.click('[data-c="0"][data-s="0"]');
  await S('A1 open');
  await page.click('#btnPlay');
  await S('A1 start');
  // A1 has two notes and the no-repeat guard makes them strictly alternate, starting on
  // F# under this seed (key index 1). Answer along with it and miss question 5 on
  // purpose, so the run covers streak, multiplier, a lost heart and a cleared stage.
  for (let i = 0; i < 12 && !await page.locator('#rAgain').count(); i++) {
    await answer(page, (i % 2 ? 0 : 1) ^ (i === 5 ? 1 : 0));
    await S('A1 answer ' + i);
    await next();
    await S('A1 next ' + i);
  }
  await page.clock.runFor(1500);
  await S('A1 result');
  await page.locator('#rNext, #rMap').first().click();
  await S('after result');

  // Grid drill with a time limit, including a timeout.
  await page.click('#nav-map');
  await page.click('[data-c="3"][data-s="0"]');
  await page.click('#btnPlay');
  await S('D1 start');
  await answer(page, 2);
  await S('D1 answered');
  await next();
  await page.keyboard.press('Space');
  await page.keyboard.press('1');
  await S('D1 key 1');
  await page.click('#btnQuit');
  await S('D1 quit');

  // Practice: every drill kind, chromatic degrees, both key qualities, octave naming.
  await page.click('#nav-practice');
  await page.click('#setBox summary');
  await page.click('#audioBox summary');
  for (const k of ['intervals', 'chords', 'inversions', 'degrees', 'melody', 'progressions', 'cadences', 'scales'])
    await page.locator('#kindChips button', { hasText: new RegExp('^' + k + '$') }).click();
  await page.locator('[data-preset="all"]').click();
  await page.selectOption('#keyQual', 'both');
  await page.selectOption('#keyMode', 'random');
  await page.selectOption('#dir', 'random');
  await page.selectOption('#arp', '2');
  await page.selectOption('#limit', '6');
  await page.check('#reqOct');
  await S('practice configured');
  await page.click('#btnPlay');
  for (let i = 0; i < 30; i++) {
    if (i === 12) { await page.check('#chrom'); await page.click('#btnSkip'); }
    if (i === 20) { await page.selectOption('#naming', 'solf'); await page.click('#nav-practice'); await page.click('#btnPlay'); }
    await answer(page, i);
    await S('practice answer ' + i);
    await next();
    await S('practice next ' + i);
  }
  // Let one trial run out of time, then advance with Enter.
  await page.click('#btnSkip');
  await page.clock.runFor(6500);
  await S('practice timeout');
  await page.keyboard.press('Enter');
  await S('practice enter');

  // Settings that feed rendering.
  await page.selectOption('#naming', 'flat');
  await page.selectOption('#timbre', 'pluck');
  await page.fill('#a4', '432');
  await page.locator('#a4').dispatchEvent('change');
  await page.locator('#vol').fill('0.3');
  await page.locator('#rev').fill('0.1');
  await page.locator('#dur').fill('2');
  await page.selectOption('#octLow', '5');
  await page.selectOption('#octHigh', '2');
  await S('settings changed');

  // Reference tab and drone.
  await page.click('#nav-ref');
  await page.locator('#answers .kb .k').nth(3).click();
  await page.selectOption('#refrow select', '64');
  await page.click('#refrow button');
  await S('drone on');
  await page.click('#refrow button');
  await S('drone off');

  // Jam: controls, playback, MIDI export. Snapshotted after stop, because the bar
  // highlight follows AudioContext.currentTime, which page.clock does not control.
  await page.click('#nav-jam');
  await page.selectOption('#jamPreset', '2');
  await page.selectOption('#jamKey', '7');
  await page.locator('#jamBpm').fill('140');
  await page.uncheck('#jamDrums');
  await S('jam configured');
  await page.click('#jamBtn');
  await page.clock.runFor(3000);
  await page.click('#jamBtn');
  await S('jam stopped');
  const midi = await download(page, () => page.click('#jamMidi'));

  // Stats, export, reset, reload.
  await page.click('#statBox summary');
  await S('stats open');
  const progress = await download(page, () => page.click('#btnExport'));
  page.once('dialog', d => d.accept());
  await page.click('#btnReset');
  await S('after reset');
  await page.reload();
  await page.evaluate(() => window.__reseed(99));
  await S('after reload');

  await ctx.close();
  return { snaps: out, midi, progress, problems };
}

test('restructured build matches the seed step for step', async ({ browser }) => {
  const want = await scenario(browser, SEED);
  const got = await scenario(browser, TARGET);

  expect(want.problems).toEqual([]);
  expect(got.problems).toEqual([]);
  // Controls: a diff over code the scenario never reaches proves nothing, so require
  // the stage run and the practice run to each hit both grading paths, and the stage
  // run to reach a cleared result with a multiplier on screen.
  const html = prefix => want.snaps.filter(s => s.label.startsWith(prefix)).map(s => s.html).join('');
  for (const prefix of ['A1 answer', 'practice answer']) {
    expect(html(prefix), prefix).toContain('class="msg ok"');
    expect(html(prefix), prefix).toContain('class="msg bad"');
  }
  expect(html('A1')).toMatch(/id="hc">×\d/);
  expect(html('A1 result')).toContain('Stage cleared');

  expect(got.snaps.map(s => s.label)).toEqual(want.snaps.map(s => s.label));
  for (let i = 0; i < want.snaps.length; i++) expect(got.snaps[i], want.snaps[i].label).toEqual(want.snaps[i]);
  expect(got.midi).toEqual(want.midi);
  expect(got.progress).toEqual(want.progress);
});
