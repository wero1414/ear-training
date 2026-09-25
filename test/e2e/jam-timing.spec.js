// Phase 1 item 4: the jam bar highlight follows the audio clock. Records the audio
// time at which each bar lights up and requires it to land on the bar grid, with and
// without setTimeout being made unreliable.
import { test, expect } from '@playwright/test';
import { AUDIO_CLOCK } from './helpers.js';

const BPM = 180;
const BAR = (60 / BPM) * 4;
// One animation frame plus scheduling slack.
const TOLERANCE = 0.035;

async function record(page) {
  await page.addInitScript(AUDIO_CLOCK);
  await page.goto('./');
  await page.click('#nav-jam');
  await page.locator('#jamBpm').fill(String(BPM));
  await page.evaluate(async () => {
    // Read ac through the module namespace: the context is created on first sound.
    const audio = await import('./js/audio/context.js');
    window.__marks = [];
    new MutationObserver(() => {
      const on = [...document.querySelectorAll('.bar')].findIndex(b => b.classList.contains('on'));
      if (on >= 0 && (!window.__marks.length || window.__marks.at(-1).bar !== on))
        window.__marks.push({ bar: on, t: audio.ac.currentTime });
    }).observe(document.getElementById('jamBars'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await page.click('#jamBtn');
  await page.waitForFunction(() => window.__marks.length >= 5, null, { timeout: 15_000 });
  await page.click('#jamBtn');
  return page.evaluate(() => window.__marks);
}

function expectOnGrid(marks) {
  expect(marks.map(m => m.bar)).toEqual([0, 1, 2, 3, 0].slice(0, marks.length));
  const gaps = marks.slice(1).map((m, i) => m.t - marks[i].t);
  for (const g of gaps) expect(Math.abs(g - BAR), `bar gap ${g.toFixed(3)} s`).toBeLessThan(TOLERANCE);
}

// Page errors only: console noise about the audio device comes from the machine, and
// the smoke test already requires a clean console.
const errorsOf = page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  return errors;
};

test.describe.configure({ mode: 'serial' });

test('bar highlight lands on the audio bar grid', async ({ page }) => {
  const errors = errorsOf(page);
  expectOnGrid(await record(page));
  expect(errors).toEqual([]);
});

test('bar highlight does not depend on setTimeout', async ({ page }) => {
  // Every other setTimeout fires 250 ms late, like a throttled phone. A constant delay
  // would shift every bar equally and hide the problem; a varying one breaks the gaps
  // of anything that rides setTimeout, as the old highlight did.
  await page.addInitScript(() => {
    const st = window.setTimeout;
    let n = 0;
    window.setTimeout = (fn, ms, ...a) => st(fn, (ms || 0) + (n++ % 2) * 250, ...a);
  });
  const errors = errorsOf(page);
  expectOnGrid(await record(page));
  expect(errors).toEqual([]);
});
