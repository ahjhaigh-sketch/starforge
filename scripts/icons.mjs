// Renders the app icons from public/icons/icon.svg: node scripts/icons.mjs
// Writes the installable app's PNGs (and a 1024 master that `npx tauri icon` turns into the .exe icons).
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const svg = readFileSync('public/icons/icon.svg', 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
/** A maskable icon keeps everything inside the middle 80% circle: a square full-bleed sky, the star scaled into the safe zone. */
const maskableSvg = svg
  .replace('rx="112"', 'rx="0"')
  .replace(/(<rect [^>]*\/>)([\s\S]*)(<\/svg>)/, '$1<g transform="translate(256 256) scale(0.8) translate(-256 -256)">$2</g>$3');
const sizes = [
  { file: '../../src-tauri/app-icon.png', size: 1024, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'apple-touch-icon.png', size: 180, maskable: true },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
];
for (const { file, size, maskable } of sizes) {
  const art = `<div style="width:${size}px;height:${size}px">${maskable ? maskableSvg : svg}</div>`;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${art}</body></html>`);
  await page.evaluate(() => document.querySelectorAll('svg').forEach((s) => s.setAttribute('width', '100%') || s.setAttribute('height', '100%')));
  await page.screenshot({ path: `public/icons/${file}`, omitBackground: !maskable, clip: { x: 0, y: 0, width: size, height: size } });
}
await browser.close();
console.log('icons written');
