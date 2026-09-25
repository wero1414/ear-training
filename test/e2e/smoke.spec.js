import { test, expect } from '@playwright/test';
import { SEED, watch, answer, verdict } from './helpers.js';

const TARGETS = { seed: SEED, app: process.env.APP_URL ?? './' };

for (const [name, url] of Object.entries(TARGETS)) {
  test(`smoke: ${name}`, async ({ page }) => {
    const problems = watch(page);
    await page.goto(url);

    for (const tab of ['practice', 'jam', 'ref', 'map']) {
      await page.click('#nav-' + tab);
      await expect(page.locator('#nav-' + tab)).toHaveAttribute('aria-selected', 'true');
    }

    // keyboard widget: stage A1 (note)
    await page.click('[data-c="0"][data-s="0"]');
    await page.click('#btnPlay');
    expect(await answer(page, 0)).toBe('keyboard');
    await expect(verdict(page)).toHaveCount(1);
    await page.click('#btnQuit');

    // grid widget: stage B1 (interval)
    await page.click('[data-c="1"][data-s="0"]');
    await page.click('#btnPlay');
    expect(await answer(page, 0)).toBe('grid');
    await expect(verdict(page)).toHaveCount(1);
    await page.click('#btnQuit');

    // sequence widget: practice with melody as the only drill
    await page.click('#nav-practice');
    await page.click('#setBox summary');
    await page.locator('#kindChips button', { hasText: 'melody' }).click();
    await page.locator('#kindChips button', { hasText: 'notes' }).click();
    await page.click('#btnPlay');
    expect(await answer(page, 0)).toBe('sequence');
    await expect(verdict(page)).toHaveCount(1);

    await page.click('#nav-jam');
    await page.click('#jamBtn');
    await expect(page.locator('#jamBtn')).toHaveText('Stop');
    await page.click('#jamBtn');

    await expect(page.locator('#statTbl tr')).not.toHaveCount(0);
    expect(problems).toEqual([]);
  });
}
