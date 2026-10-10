// Visual check helper: node scripts/shots.mjs [baseUrl]
// Serves nothing itself: run `npx vite preview --port 4173` first. Writes PNGs to shots/ (git-ignored).
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:4173';
const steps = JSON.parse(process.env.SHOTS ?? '[]');
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch();
const errors = [];
const only = process.env.VIEW;
for (const view of [
  { name: 'desktop', width: 1400, height: 900 },
  { name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true },
].filter((v) => !only || v.name === only)) {
  const page = await browser.newPage({ viewport: { width: view.width, height: view.height }, isMobile: view.isMobile, hasTouch: view.hasTouch });
  page.on('console', (m) => m.type() === 'error' && errors.push(`${view.name}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${view.name}: ${e.message}`));
  for (const step of steps) {
    if (step.goto) await page.goto(base + step.goto);
    if (step.clear) await page.evaluate(() => localStorage.clear());
    if (step.eval) await page.evaluate(step.eval);
    if (step.click) await page.locator(step.click).first().click({ force: true });
    if (step.wait) await page.waitForTimeout(step.wait);
    if (step.shot) await page.screenshot({ path: `shots/${view.name}-${step.shot}.png`, clip: step.clip?.[view.name] });
  }
  await page.close();
}
await browser.close();
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console errors');
