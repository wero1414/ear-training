// Phase 1 item 1: installable and genuinely offline, plus the update flow.
import { test, expect } from '@playwright/test';
import { answer, watch } from './helpers.js';

async function installed(page) {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
}

async function useEverything(page) {
  await page.click('[data-c="0"][data-s="0"]');
  await page.click('#btnPlay');
  await answer(page, 0);
  await expect(page.locator('#msg.ok, #msg.bad')).toHaveCount(1);
  await page.click('#btnQuit');
  for (const tab of ['practice', 'ref', 'jam', 'map']) {
    await page.click('#nav-' + tab);
    await expect(page.locator('#nav-' + tab)).toHaveAttribute('aria-selected', 'true');
  }
  await page.click('#nav-jam');
  const idle = await page.locator('#jamBtn').textContent();
  await page.click('#jamBtn');
  await expect(page.locator('#jamBtn')).not.toHaveText(idle);
  await page.click('#jamBtn');
  await expect(page.locator('#jamBtn')).toHaveText(idle);
}

test('works with the network gone: reload, cold launch and deep link', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await installed(page);
  await ctx.setOffline(true);

  const problems = watch(page);
  await page.reload();
  await useEverything(page);
  expect(problems).toEqual([]);

  // Cold launch: a new page with no network at all.
  const cold = await ctx.newPage();
  const coldProblems = watch(cold);
  await cold.goto('./?source=pwa');
  await expect(cold.locator('.chap').first()).toBeVisible();
  await useEverything(cold);
  expect(coldProblems).toEqual([]);
  await ctx.close();
});

test('the manifest is installable from the subpath', async ({ page }) => {
  const res = await page.request.get('./manifest.webmanifest');
  const m = await res.json();
  expect(m.start_url).toBe('./');
  expect(m.scope).toBe('./');
  expect(m.display).toBe('standalone');
  for (const icon of m.icons) {
    expect(icon.src.startsWith('/')).toBe(false);
    expect((await page.request.get('./' + icon.src)).status()).toBe(200);
  }
  expect(m.icons.some(i => i.purpose === 'maskable')).toBe(true);
});

test('a new version shows the reload bar and takes over only when accepted', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await installed(page);
  const before = await page.evaluate(() => caches.keys());
  expect(before).toHaveLength(1);

  // Serve a new build of the worker from now on (see the hook in test/serve.mjs).
  await ctx.addCookies([{ name: 'sw-version', value: 'next-build', url: page.url() }]);
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
  await expect(page.locator('#updateBar')).toBeVisible();
  // Not taken over yet.
  expect(await page.evaluate(() => caches.keys())).toEqual(expect.arrayContaining(before));

  await Promise.all([page.waitForEvent('load'), page.locator('#updateBar .play').click()]);
  await expect(page.locator('#updateBar')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => caches.keys())).toEqual(['ear-next-build']);
  await ctx.close();
});
