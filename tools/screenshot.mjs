// Regenerates docs/screenshot.png for the README: a phone-sized view of a drill in
// progress. Needs `npm run serve` running.
import { chromium, devices } from '@playwright/test';

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], colorScheme: 'dark' });
const page = await ctx.newPage();
await page.goto('http://localhost:4173/ear-training/');
await page.click('[data-c="3"][data-s="0"]');
await page.click('#btnPlay');
await page.locator('#answers .grid button').first().click();
// Past the score pop-up; the next question has started.
await page.waitForTimeout(1200);
await page.screenshot({ path: 'docs/screenshot.png' });
await browser.close();
