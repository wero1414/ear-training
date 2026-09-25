// Renders icons/icon.svg to the PNG sizes the manifest and iOS need (npm run icons).
// The artwork keeps its glyph inside the central 80% circle, so the same drawing is a
// valid maskable icon.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const svg = readFileSync('icons/icon.svg', 'utf8');
const browser = await chromium.launch();
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`,
  );
  await page.screenshot({ path: 'icons/' + name, omitBackground: false });
  await page.close();
}
await browser.close();
console.log('icons written');
