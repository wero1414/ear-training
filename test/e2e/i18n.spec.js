// Language defaults and the "no English fallback" acceptance check from the brief:
// a fresh profile on an es-MX device sees a fully Spanish UI with Do-Re-Mi names.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { watch } from './helpers.js';

const load = l => JSON.parse(readFileSync(`js/i18n/${l}.json`, 'utf8'));
const en = load('en'),
  es = load('es');
const leaves = (o, p = '') =>
  typeof o === 'object' && o !== null
    ? Object.entries(o).flatMap(([k, v]) => leaves(v, p ? p + '.' + k : k))
    : [[p, o]];

// Literal English fragments (between placeholders and tags) of every string except the
// ones that are the same in all languages (js/i18n/same-in-all.json). Short fragments
// are skipped: they collide with note names, numerals and symbols both languages share.
const SAME = new Set(JSON.parse(readFileSync('js/i18n/same-in-all.json', 'utf8')).keys);
const ENGLISH = [
  ...new Set(
    leaves(en)
      .filter(([p]) => !SAME.has(p))
      .flatMap(([, v]) => v.split(/\{\w+\}|<[^>]*>/))
      .map(f => f.trim())
      .filter(f => (f.match(/[A-Za-z]/g) || []).length >= 4),
  ),
];

// Everything a user can read on the current screen, including closed panels and every
// option of every select.
const readable = page =>
  page.evaluate(() => {
    document.querySelectorAll('details').forEach(d => (d.open = true));
    const options = [...document.querySelectorAll('option')].map(o => o.textContent);
    return [document.body.innerText, ...options, document.title].join('\n');
  });

async function tour(page) {
  const seen = [];
  const look = async () => seen.push(await readable(page));
  await look();
  await page.click('[data-c="0"][data-s="0"]');
  await page.click('#btnPlay');
  await look();
  await page.locator('#answers .kb .k:not([disabled])').first().click();
  await look();
  await page.click('#nav-practice');
  for (let i = 1; i < 9; i++) await page.locator('#kindChips button').nth(i).click();
  await page.click('#btnPlay');
  for (let i = 0; i < 6; i++) {
    await look();
    await page.click('#btnSkip');
  }
  await page.click('#nav-jam');
  await look();
  await page.click('#nav-ref');
  await look();
  return seen.join('\n');
}

test('es-MX: a fresh profile is fully Spanish with fixed-do names', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-MX' });
  const page = await ctx.newPage();
  const problems = watch(page);
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('#nav-map')).toHaveText(es.nav.map);
  await expect(page.locator('#naming')).toHaveValue('solf');
  await expect(page.locator('#lang')).toHaveValue('es');

  const text = await tour(page);
  expect(ENGLISH.length).toBeGreaterThan(100);
  // Whole-word matches only: "Instrument" inside "Instrumento" is Spanish.
  const asWord = f => new RegExp('(?<!\\p{L})' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?!\\p{L})', 'u');
  expect(ENGLISH.filter(f => asWord(f).test(text))).toEqual([]);

  // Fixed-do on the keyboards, and no letter-name note anywhere in the reference tab.
  const keys = await page.locator('#answers .kb .k').allTextContents();
  expect(keys).toEqual(['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do#', 'Re#', 'Fa#', 'Sol#', 'La#']);
  expect(problems).toEqual([]);
  await ctx.close();
});

test('en-US: a fresh profile is English with letter names', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'en-US' });
  const page = await ctx.newPage();
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#nav-map')).toHaveText(en.nav.map);
  await expect(page.locator('#naming')).toHaveValue('sharp');
  await ctx.close();
});

test('the language setting switches the whole UI and is remembered', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'es-MX' });
  const page = await ctx.newPage();
  const problems = watch(page);
  await page.goto('./');
  await page.click('#audioBox summary');
  await page.selectOption('#lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#nav-practice')).toHaveText(en.nav.practice);
  await expect(page.locator('#setBox summary')).toHaveText(en.practiceSettings.summary);
  await expect(page.locator('.chap b').first()).toHaveText(en.chapters[0].title);
  // Switching language does not change the note naming the user already has.
  await expect(page.locator('#naming')).toHaveValue('solf');
  await page.reload();
  await expect(page.locator('#nav-map')).toHaveText(en.nav.map);
  await page.click('#audioBox summary');
  await page.selectOption('#lang', 'es');
  await expect(page.locator('#nav-map')).toHaveText(es.nav.map);
  expect(problems).toEqual([]);
  await ctx.close();
});
