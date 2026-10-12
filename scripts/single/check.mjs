// Opens the one-file build straight from disk (file://) at desktop and phone sizes: taps, saves,
// reloads, opens a panel, and fails on any console error. Usage: node scripts/single/check.mjs <file.html>
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const file = pathToFileURL(resolve(process.argv[2])).href;
const browser = await chromium.launch();
const errors = [];
for (const view of [{ name: 'desktop', width: 1400, height: 900 }, { name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true }]) {
  const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height }, isMobile: view.isMobile, hasTouch: view.hasTouch });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`${view.name}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${view.name}: ${e.message}`));
  await page.goto(file);
  await page.waitForSelector('[data-star-anchor]', { timeout: 15000 });
  const star = page.locator('[data-testid="star"], [data-star-anchor]').first();
  for (let i = 0; i < 25; i++) await star.click({ force: true });
  await page.waitForTimeout(1500);
  const dust1 = await page.locator('.hud').first().innerText();
  // save, then reload from disk: progress must come back
  await page.keyboard.press('Control+s').catch(() => {});
  await page.waitForTimeout(6000);
  await page.reload();
  await page.waitForSelector('[data-star-anchor]', { timeout: 15000 });
  await page.waitForTimeout(1500);
  const dust2 = await page.locator('.hud').first().innerText();
  const saved = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('starforge:')));
  // open a panel from the rail
  const rail = page.locator('[data-rail="upgrades"]:visible').first();
  if (await rail.count()) await rail.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `shots/file-${view.name}.png` });
  console.log(`${view.name}: before reload "${dust1.split('\n')[0]}", after "${dust2.split('\n')[0]}", save keys ${saved.join(', ')}`);
  await ctx.close();
}
await browser.close();
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console errors');
