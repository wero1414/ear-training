// Phase 1 items 2 and 3: AudioContext lifecycle and the iOS silent-switch workaround.
// The context's state is stubbed so the tests control it without audio hardware and
// can produce iOS's 'interrupted' state; the app's own code decides when to resume.
import { test, expect, devices } from '@playwright/test';
import { watch } from './helpers.js';

const STUB = () => {
  const state = new WeakMap();
  window.__contexts = 0;
  window.__resumes = 0;
  const Real = window.AudioContext;
  window.AudioContext = class extends Real {
    constructor(...a) {
      super(...a);
      window.__contexts++;
      window.__ac = this;
    }
  };
  Object.defineProperty(BaseAudioContext.prototype, 'state', {
    get() {
      return state.get(this) || 'suspended';
    },
  });
  AudioContext.prototype.resume = function () {
    window.__resumes++;
    state.set(this, 'running');
    return Promise.resolve();
  };
  window.__setState = s => state.set(window.__ac, s);
  window.__played = [];
  window.__paused = 0;
  HTMLMediaElement.prototype.play = function () {
    window.__played.push({ src: this.src, loop: this.loop });
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function () {
    window.__paused++;
  };
};

// Gesture listeners are installed once the app has booted (strings loaded).
const booted = page => page.waitForFunction(() => 'ready' in document.documentElement.dataset);
const open = async (page, url = './') => {
  await page.goto(url);
  await booted(page);
};

const stat = page =>
  page.evaluate(() => ({
    contexts: window.__contexts,
    resumes: window.__resumes,
    state: window.__ac && window.__ac.state,
  }));
const visible = page => page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

test('the first gesture creates and starts the one context', async ({ page }) => {
  await page.addInitScript(STUB);
  await open(page);
  expect((await stat(page)).contexts).toBe(0);
  await page.mouse.click(5, 5);
  expect(await stat(page)).toEqual({ contexts: 1, resumes: 1, state: 'running' });
});

test('coming back to the page resumes a suspended or interrupted context', async ({ page }) => {
  await page.addInitScript(STUB);
  await open(page);
  await page.mouse.click(5, 5);
  for (const s of ['suspended', 'interrupted']) {
    await page.evaluate(s => window.__setState(s), s);
    await visible(page);
    await expect.poll(async () => (await stat(page)).state).toBe('running');
  }
});

test('a tap recovers a context iOS interrupted (call, Siri)', async ({ page }) => {
  await page.addInitScript(STUB);
  await open(page);
  await page.mouse.click(5, 5);
  await page.evaluate(() => window.__setState('interrupted'));
  await page.mouse.click(5, 5);
  expect((await stat(page)).state).toBe('running');
});

test('there is never a second context', async ({ page }) => {
  await page.addInitScript(STUB);
  const problems = watch(page);
  await open(page);
  await page.click('[data-c="0"][data-s="0"]');
  await page.click('#btnPlay');
  await page.locator('#answers .kb .k:not([disabled])').first().click();
  for (const tab of ['practice', 'jam', 'ref', 'map', 'jam']) {
    await page.click('#nav-' + tab);
    await page.evaluate(() => window.__setState('suspended'));
    await visible(page);
  }
  await page.click('#jamBtn');
  await page.click('#jamBtn');
  await page.reload();
  await booted(page);
  await page.mouse.click(5, 5);
  expect((await stat(page)).contexts).toBe(1);
  expect(problems).toEqual([]);
});

test.describe('on iPhone', () => {
  // eslint-disable-next-line no-unused-vars
  const { defaultBrowserType, ...iPhone } = devices['iPhone 13'];
  test.use(iPhone);

  test('the first tap starts the silent loop that moves audio off the ringer channel', async ({ page }) => {
    await page.addInitScript(STUB);
    await open(page);
    await page.locator('#nav-practice').tap();
    const played = await page.evaluate(() => window.__played);
    // A tap is both a pointer and a touch gesture, and this stub does not flip
    // `paused` as a real element would, so count at least one start.
    expect(played.length).toBeGreaterThan(0);
    for (const p of played) expect(p).toEqual({ src: expect.stringMatching(/^blob:/), loop: true });
    expect((await stat(page)).state).toBe('running');
  });

  test('the setting turns the workaround off and back on', async ({ page }) => {
    await page.addInitScript(STUB);
    await open(page);
    await page.locator('#audioBox summary').tap();
    await expect(page.locator('#iosRow')).toBeVisible();
    await expect(page.locator('#iosMediaChannel')).toBeChecked();
    await page.locator('#iosMediaChannel').tap();
    expect(await page.evaluate(() => window.__paused)).toBe(1);
    await page.reload();
    await booted(page);
    await page.locator('#nav-practice').tap();
    expect(await page.evaluate(() => window.__played)).toEqual([]);
  });
});

test('desktop browsers do not get the iOS workaround or its setting', async ({ page }) => {
  await page.addInitScript(STUB);
  await open(page);
  await page.mouse.click(5, 5);
  expect(await page.evaluate(() => window.__played)).toEqual([]);
  await page.click('#audioBox summary');
  await expect(page.locator('#iosRow')).toBeHidden();
});
