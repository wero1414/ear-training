// Phase 2 item 12: progress import, the inverse of export.
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { watch } from './helpers.js';

test('an exported file restores progress and settings after a reset', async ({ page }) => {
  const problems = watch(page);
  await page.goto('./');
  await page.click('[data-c="0"][data-s="0"]');
  await page.click('#btnPlay');
  await page.locator('#answers .kb .k:not([disabled])').first().click();
  await page.click('#btnQuit');
  await page.click('#audioBox summary');
  await page.selectOption('#naming', 'flat');
  await page.click('#statBox summary');
  const before = await page.evaluate(() => localStorage.getItem('pe.prog'));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnExport')]);
  const file = await readFile(await dl.path());

  page.once('dialog', d => d.accept());
  await page.click('#btnReset');
  await page.selectOption('#naming', 'sharp');
  expect(await page.evaluate(() => localStorage.getItem('pe.prog'))).not.toBe(before);

  page.once('dialog', d => d.accept());
  await page
    .locator('#importFile')
    .setInputFiles({ name: 'perfect-ear.json', mimeType: 'application/json', buffer: file });
  await expect(page.locator('#naming')).toHaveValue('flat');
  expect(await page.evaluate(() => localStorage.getItem('pe.prog'))).toBe(before);
  await expect(page.locator('#statTbl td.n').first()).not.toHaveText('');
  expect(problems).toEqual([]);
});

test('a file that is not an export changes nothing', async ({ page }) => {
  await page.goto('./');
  await page.click('#statBox summary');
  const before = await page.evaluate(() => [localStorage.getItem('pe.set'), localStorage.getItem('pe.prog')]);
  await page
    .locator('#importFile')
    .setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await expect(page.locator('#importMsg')).not.toBeEmpty();
  expect(await page.evaluate(() => [localStorage.getItem('pe.set'), localStorage.getItem('pe.prog')])).toEqual(before);
});
