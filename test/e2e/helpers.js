export const ORIGIN = 'http://localhost:4173/ear-trainer/';
export const SEED = 'test/baseline/seed.html';

// Records everything that must stay empty: console errors, uncaught exceptions, and
// any request that leaves the served subpath (the no-network rule).
export function watch(page) {
  const problems = [];
  page.on('console', m => {
    if (m.type() === 'error') problems.push('console: ' + m.text());
  });
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('request', r => {
    const u = r.url();
    if (!u.startsWith(ORIGIN) && !u.startsWith('blob:') && !u.startsWith('data:')) problems.push('request: ' + u);
  });
  page.on('response', r => {
    if (r.status() >= 400) problems.push('http ' + r.status() + ': ' + r.url());
  });
  return problems;
}

export const verdict = page => page.locator('#msg.ok, #msg.bad');

// Answers the current trial through whichever answer widget is on screen. `k` picks
// which button, so the same k gives the same click in every build.
export async function answer(page, k) {
  if (await page.locator('#answers .kb').count()) {
    const keys = page.locator('#answers .kb .k:not([disabled])');
    await keys.nth(k % (await keys.count())).click();
    const oct = page.locator('#octrow button[data-oct]');
    if ((await oct.count()) && !(await verdict(page).count())) await oct.nth(k % (await oct.count())).click();
    return 'keyboard';
  }
  const btns = page.locator('#answers .grid button');
  const n = await btns.count();
  if (await page.locator('#answers .slot').count()) {
    const len = await page.locator('#answers .slots').first().locator('.slot').count();
    for (let i = 0; i < len; i++) await btns.nth((k + i) % n).click();
    return 'sequence';
  }
  await btns.nth(k % n).click();
  return 'grid';
}
