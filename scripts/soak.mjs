// Soak test: node scripts/soak.mjs [seconds] [baseUrl]
// Plays the real build for a while at desktop and phone size (taps, purchases, every built panel,
// Belt sweeps, drilling, perks) and fails on any console error or page crash.
// Serves nothing itself: run `npx vite preview --port 4173` first.
import { chromium } from '@playwright/test';

const seconds = Number(process.argv[2] ?? 120);
const base = process.argv[3] ?? 'http://localhost:4173';
const PANELS = ['upgrades', 'medals', 'stats', 'constants', 'quests', 'orbitals', 'mastery', 'novatree', 'automation', 'ascent', 'belt', 'level', 'drill', 'starforge'];

const browser = await chromium.launch();
let failed = false;
for (const view of [
  { name: 'desktop', width: 1400, height: 900 },
  { name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true },
]) {
  const page = await browser.newPage({ viewport: { width: view.width, height: view.height }, isMobile: view.isMobile, hasTouch: view.hasTouch });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/?dev=1`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${base}/?dev=1`);
  await page.waitForTimeout(800);
  // a mid-game state: Blue Giant, 5 Supernovas, every Phase 5 system open
  await page.evaluate(() => {
    const { game, commands } = window.sf;
    const s = game.state;
    s.tier = 3;
    s.stats.supernovas = 5;
    commands.devAdd('stardust', 1e9);
    commands.devAdd('shards', 50);
    commands.devAdd('ore', 1e4);
    commands.devAdd('xp', 3000);
    commands.devAdd('alloy.iron', 500);
    commands.devAdd('ore.gold', 2000);
  });
  const end = Date.now() + seconds * 1000;
  let round = 0;
  while (Date.now() < end) {
    round++;
    // tap the star and buy what the auto-buyers would
    for (let i = 0; i < 10; i++) await page.locator('.star-btn').click({ force: true });
    await page.evaluate(() => {
      const { game, commands } = window.sf;
      for (const id of ['mote', 'catcher', 'moonmill']) commands.buyEngine?.(id);
      commands.devAdd('stardust', 1e6);
      void game;
    });
    const panel = PANELS[round % PANELS.length];
    // click through the DOM: with ?dev=1 the dev panel can sit over the right rail
    const opened = await page.evaluate((id) => {
      const btn = [...document.querySelectorAll(`[data-rail="${id}"]`)].find((b) => b.offsetParent !== null);
      btn?.click();
      return !!btn;
    }, panel);
    if (opened) {
      await page.waitForTimeout(300);
      if (panel === 'belt') {
        const field = page.getByTestId('belt-field');
        const box = await field.boundingBox();
        if (box) {
          for (let row = 0; row < 3; row++) {
            const y = box.y + 20 + ((box.height - 40) * row) / 2;
            await page.mouse.move(box.x + 4, y);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width - 4, y, { steps: 10 });
            await page.mouse.up();
          }
          await page.locator('[data-belt-up="value"] button').click({ force: true });
        }
      }
      if (panel === 'drill') for (let i = 0; i < 5; i++) await page.getByTestId('drill-core').click({ force: true });
      if (panel === 'starforge') {
        await page.locator('[data-grade="gold"]').click();
        await page.getByRole('tab', { name: 'Relics' }).click();
        await page.locator('[data-relic="anvil"] button').first().click({ force: true });
        await page.getByRole('tab', { name: 'Codex' }).click();
        await page.locator('[data-el="c"]').click();
        await page.getByRole('tab', { name: 'Furnace' }).click();
        await page.waitForTimeout(1500);
      }
      if (panel === 'level') {
        await page.locator('[data-perk="ore"] button').click({ force: true });
        if (round % 3 === 0) await page.getByRole('button', { name: 'Reset perks (free)' }).click({ force: true });
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(400);
  }
  const stats = await page.evaluate(() => {
    const s = window.sf.game.state;
    return { harvested: s.stats.harvested ?? 0, depth: s.drill.depth, taps: s.stats.taps ?? 0, heapMb: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6) };
  });
  console.log(`${view.name}: ${round} rounds, ${JSON.stringify(stats)}, ${errors.length} errors`);
  for (const e of errors) console.log(`  ${e}`);
  if (errors.length) failed = true;
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
