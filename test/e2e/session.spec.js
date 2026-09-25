// Behaviour snapshot test. Drives the app through one scripted session per locale with
// Math.random seeded (reseeded per step) and the clock paused, and compares DOM, form
// values, localStorage and downloaded files after every step, plus full-page screenshots
// at chosen steps, against the recorded snapshots in __golden__/.
//
// The first recording (commit "test: compare the app against recorded session
// snapshots") was taken from a build proven identical to the seed prototype plus the
// documented fixes, so the snapshots start out equal to that reference.
//
// A deliberate behaviour change updates the snapshots in the same commit:
//   npx playwright test session -u
// and the snapshot diff in that commit is the review of what changed. Screenshots are
// per platform (-darwin, -linux); DOM snapshots are shared.
import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { PRNG, watch, answer } from './helpers.js';

const LOCALES = ['en-US', 'es-MX'];
const T0 = new Date('2026-03-02T10:00:00Z');
// Steps that also get a full-page screenshot, chosen to cover every view and widget.
const SHOTS = new Set([
  'boot',
  'A1 answer 6',
  'A1 result',
  'D1 answered',
  'practice configured',
  'practice answer 1',
  'practice answer 2',
  'practice answer 4',
  'practice answer 12',
  'practice answer 14',
  'settings changed',
  'drone on',
  'jam configured',
  'stats open',
]);
// Drill kind chips, in the order the settings panel draws them.
const KIND_CHIPS = ['note', 'interval', 'chord', 'inv', 'degree', 'melody', 'prog', 'cadence', 'scale'];
const STRICT = { fullPage: true, threshold: 0, maxDiffPixels: 0 };

const strings = locale => JSON.parse(readFileSync(`js/i18n/${locale.slice(0, 2)}.json`, 'utf8'));
const shotName = (locale, label) => `${locale}-${label.replace(/[^a-z0-9]+/gi, '-')}.png`;

// The app sets data-ready once its strings are applied. Polled from Node because the
// page's timers are faked.
async function ready(page) {
  const done = () => page.evaluate(() => 'ready' in document.documentElement.dataset);
  while (!(await done())) await new Promise(r => setTimeout(r, 20));
}

async function snap(page, label) {
  return page.evaluate(label => {
    const wrap = document.querySelector('.wrap').cloneNode(true);
    // The countdown bar's width comes from a CSS transition on the real compositor
    // clock, which page.clock does not control.
    wrap.querySelectorAll('#timer i').forEach(i => i.removeAttribute('style'));
    const values = [...document.querySelectorAll('.wrap input, .wrap select')].map(
      e => (e.id || e.className) + '=' + (e.type === 'checkbox' ? e.checked : e.value),
    );
    // One entry per top-level section of the page, one tag per line, so a snapshot diff
    // points at the element that changed.
    const sections = {};
    [...wrap.children].forEach((e, i) => (sections[e.id || e.className || e.tagName + i] = e.outerHTML.split(/(?=<)/)));
    return { label, ...sections, values, set: localStorage.getItem('pe.set'), prog: localStorage.getItem('pe.prog') };
  }, label);
}

async function download(page, click) {
  const [d] = await Promise.all([page.waitForEvent('download'), click()]);
  return { name: d.suggestedFilename(), body: (await readFile(await d.path())).toString('base64') };
}

async function scenario(browser, locale) {
  // Reduced motion keeps CSS animations out of the screenshots.
  const ctx = await browser.newContext({ locale, reducedMotion: 'reduce', colorScheme: 'dark' });
  const page = await ctx.newPage();
  const problems = watch(page);
  const out = [];
  let step = 0;
  const shoot = label => expect.soft(page).toHaveScreenshot(shotName(locale, label), STRICT);
  const S = async label => {
    await page.clock.runFor(10);
    out.push(await snap(page, label));
    if (SHOTS.has(label)) await shoot(label);
    await page.evaluate(n => window.__reseed(n), ++step * 7919);
  };
  const next = () => page.clock.runFor(2400);

  await page.addInitScript(PRNG);
  await page.clock.install({ time: T0 });
  await page.clock.pauseAt(T0);
  await page.goto('./');
  await ready(page);
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
  for (let i = 0; i < 12 && !(await page.locator('#rAgain').count()); i++) {
    await answer(page, (i % 2 ? 0 : 1) ^ (i === 5 ? 1 : 0));
    await S('A1 answer ' + i);
    await next();
    await S('A1 next ' + i);
  }
  await page.clock.runFor(1500);
  await S('A1 result');
  await page.locator('#rNext, #rMap').first().click();
  await S('after result');

  // Grid drill, keyboard answers.
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
  for (const k of KIND_CHIPS.slice(1)) await page.locator('#kindChips button').nth(KIND_CHIPS.indexOf(k)).click();
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
    if (i === 12) {
      await page.check('#chrom');
      await page.click('#btnSkip');
    }
    if (i === 20) {
      await page.selectOption('#naming', 'solf');
      await page.click('#nav-practice');
      await page.click('#btnPlay');
    }
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
  await ready(page);
  await page.evaluate(() => window.__reseed(99));
  await S('after reload');
  await page.emulateMedia({ colorScheme: 'light' });
  await shoot('light: map');
  await page.click('#nav-jam');
  await page.click('#audioBox summary');
  await shoot('light: jam and sound panel');

  await ctx.close();
  return { snaps: out, midi, progress, problems };
}

for (const locale of LOCALES) {
  test(`session snapshot: ${locale}`, async ({ browser }) => {
    const got = await scenario(browser, locale);
    expect(got.problems).toEqual([]);

    // Controls: a snapshot of code the scenario never reaches proves nothing, so require
    // the stage run and the practice run to each hit both grading paths, and the stage
    // run to reach a cleared result with a multiplier on screen.
    const html = prefix =>
      got.snaps
        .filter(s => s.label.startsWith(prefix))
        .map(s => Object.values(s).flat().join(''))
        .join('');
    for (const prefix of ['A1 answer', 'practice answer']) {
      expect(html(prefix), prefix).toContain('class="msg ok"');
      expect(html(prefix), prefix).toContain('class="msg bad"');
    }
    expect(html('A1')).toMatch(/id="hc">\u00d7\d/);
    expect(html('A1 result')).toContain(strings(locale).result.cleared);

    // Store each step as only the fields that changed since the previous step.
    let prev = {};
    const steps = got.snaps.map(s => {
      const d = { label: s.label };
      for (const k of Object.keys(s))
        if (k !== 'label' && JSON.stringify(s[k]) !== JSON.stringify(prev[k])) d[k] = s[k];
      prev = s;
      return d;
    });
    const file = `test/e2e/__golden__/session-${locale}.json`;
    const mode = test.info().config.updateSnapshots;
    if ((mode === 'all' || mode === 'changed' || (mode === 'missing' && !existsSync(file))) && mode !== 'none') {
      // Non-ASCII is written as JSON \u escapes, like everywhere else in the repo.
      const json = JSON.stringify({ steps, midi: got.midi, progress: got.progress }, null, 1).replace(
        /[\u0080-\uffff]/g,
        c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'),
      );
      writeFileSync(file, json + '\n');
      return;
    }
    const want = JSON.parse(readFileSync(file, 'utf8'));
    expect(steps.map(s => s.label)).toEqual(want.steps.map(s => s.label));
    for (let i = 0; i < want.steps.length; i++) expect(steps[i], want.steps[i].label).toEqual(want.steps[i]);
    expect(got.midi).toEqual(want.midi);
    expect(got.progress).toEqual(want.progress);
  });
}
