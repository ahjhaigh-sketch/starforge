// The speed budgets (Tech tab: "Testing, dev tools and budgets"): npm run budgets [baseUrl]
// Measures every budget on the production build, mostly with the late-game save from the simulator
// (tests/fixtures/late-game.txt: nine Big Crunches, every system running), and exits 1 if any fails.
// Serves nothing itself: `npm run build`, then `npx vite preview --port 4173`.
// WebGL uses this computer's GPU through Direct3D 11 (GL_ARGS="--use-angle=swiftshader" draws in software instead).
// The "mid phone" is this computer's CPU slowed 4x by Chromium (Lighthouse's mobile setting).
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:4173';
const lateGame = readFileSync('tests/fixtures/late-game.txt', 'utf8').trim();
const rows = [];
const check = (budget, limit, measured, pass) => rows.push({ budget, limit, measured, pass: pass ? 'yes' : 'NO' });

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));

// ---- code download: every script, style sheet and page, gzipped ----
const code = walk('dist').filter((f) => /\.(js|css|html)$/.test(f));
const gz = code.reduce((a, f) => a + gzipSync(readFileSync(f), { level: 9 }).length, 0);
check('Code download', 'under 600 KB compressed', `${Math.round(gz / 1024)} KB (${code.length} files)`, gz < 600 * 1024);

const browser = await chromium.launch({ args: (process.env.GL_ARGS ?? '--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist').split(' ') });
{
  const page = await browser.newPage();
  const gpu = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  console.log(`GPU: ${gpu}`);
  await page.close();
}

async function fresh(view, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height }, isMobile: !!view.phone, hasTouch: !!view.phone, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (opts.cpu) await cdp.send('Emulation.setCPUThrottlingRate', { rate: opts.cpu });
  return { ctx, page, cdp };
}
const DESKTOP = { width: 1400, height: 900 };
const PHONE = { width: 390, height: 844, phone: true };

/** Average frames a second over `ms`, while `during` runs. */
const fps = (page, ms) =>
  page.evaluate(async (ms) => {
    const frames = [];
    let last = performance.now();
    let on = true;
    const loop = (t) => {
      frames.push(t - last);
      last = t;
      if (on) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    await new Promise((r) => setTimeout(r, ms));
    on = false;
    const f = frames.slice(5);
    return 1000 / (f.reduce((a, b) => a + b, 0) / f.length);
  }, ms);

/** A page playing the late-game save. */
async function lateGamePage(view, opts) {
  const p = await fresh(view, opts);
  await p.page.goto(`${base}/?dev=1`);
  await p.page.waitForFunction(() => !!window.sf);
  const err = await p.page.evaluate((code) => window.sf.commands.importCode(code), lateGame);
  if (err) throw new Error(`late-game save: ${err}`);
  await p.page.waitForTimeout(3000);
  return p;
}

// ---- first load on 4G (a first visit: nothing cached) ----
for (const net of [
  { name: '4G', down: 9, up: 1.5, rtt: 60, budget: true },
  { name: 'Slow 4G (for reference)', down: 1.6, up: 0.75, rtt: 150, budget: false },
]) {
  const { ctx, page, cdp } = await fresh(PHONE);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: net.rtt, downloadThroughput: (net.down * 1e6) / 8, uploadThroughput: (net.up * 1e6) / 8 });
  const t0 = Date.now();
  await page.goto(`${base}/`, { waitUntil: 'commit' });
  await page.locator('.star-btn').waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('.pill').first().waitFor({ state: 'visible' });
  const ms = Date.now() - t0;
  check(`First load, ${net.name} (${net.down} Mbit/s, ${net.rtt} ms)`, net.budget ? 'under 3 s' : '-', `${(ms / 1000).toFixed(2)} s`, !net.budget || ms < 3000);
  await ctx.close();
}

// ---- engine tick, UI updates and frame rate on a desktop, with every system running ----
{
  const { ctx, page } = await lateGamePage(DESKTOP);
  const tick = await page.evaluate(async () => {
    const samples = [];
    for (let i = 0; i < 80; i++) {
      await new Promise((r) => setTimeout(r, 100));
      samples.push(window.sf.game.tickMs);
    }
    return samples.reduce((a, b) => a + b, 0) / samples.length;
  });
  check('Engine tick (late game, every system on)', 'under 2 ms', `${tick.toFixed(2)} ms`, tick < 2);
  const updates = await page.evaluate(async () => {
    const pill = document.querySelector('.pill .val');
    let n = 0;
    const mo = new MutationObserver(() => n++);
    mo.observe(pill, { childList: true, characterData: true, subtree: true });
    await new Promise((r) => setTimeout(r, 5000));
    mo.disconnect();
    return n / 5;
  });
  check('UI updates (Stardust pill, no input)', 'at most 10 a second', `${updates.toFixed(1)} a second`, updates <= 10.5);
  const f = await fps(page, 5000);
  check('Frame rate, desktop (late game)', '60 fps', `${f.toFixed(1)} fps`, f >= 57);
  await ctx.close();
}

// ---- frame rate on a mid phone ----
{
  const { ctx, page } = await lateGamePage(PHONE, { cpu: 4 });
  const f = await fps(page, 5000);
  check('Frame rate, mid phone (late game, CPU x4 slower)', '30 fps or more', `${f.toFixed(1)} fps`, f >= 30);
  await ctx.close();
}

// ---- offline catch-up: eight hours away, late game ----
{
  const { ctx, page } = await lateGamePage(DESKTOP);
  await page.evaluate(() => window.sf.commands.devSaveAway(8 * 3600));
  await page.waitForFunction(() => window.sf && window.sf.game.catchUpMs > 0, null, { timeout: 30_000 });
  const ms = await page.evaluate(() => window.sf.game.catchUpMs);
  check('Offline catch-up (8 h away, late game)', 'under 300 ms', `${Math.round(ms)} ms`, ms < 300);
  await ctx.close();
}

// ---- big trees: panning the 200-node Galactic Tree on a mid phone ----
{
  const { ctx, page } = await lateGamePage(PHONE, { cpu: 4 });
  await page.evaluate(() => {
    window.sf.commands.devOwnGalacticTree();
    window.sf.open('galactictree');
  });
  await page.waitForTimeout(800);
  const nodes = await page.locator('[data-panel="galactictree"] [data-node]').count();
  const view = page.locator('[data-panel="galactictree"] .tree-view');
  const box = await view.boundingBox();
  const panning = (async () => {
    for (let k = 0; k < 6; k++) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + (k % 2 ? -120 : 120), box.y + box.height / 2 + 60, { steps: 20 });
      await page.mouse.up();
    }
  })();
  const f = await fps(page, 3000);
  await panning;
  check(`Big trees (${nodes} nodes, panning, mid phone)`, 'smooth: 30 fps or more', `${f.toFixed(1)} fps`, nodes >= 200 && f >= 30);
  await ctx.close();
}

await browser.close();

// ---- rune rolling: the engine test compares the work at e30 runes a second with one ----
let runesOk = true;
try {
  execSync('npx vitest --run tests/engine/budgets.test.ts -t "e30 runes"', { stdio: 'pipe' });
} catch {
  runesOk = false;
}
check('Rune rolling', 'same work at e30 runes a second as at 1', runesOk ? 'same (engine test)' : 'slower (engine test failed)', runesOk);

console.table(rows);
const failed = rows.filter((r) => r.pass !== 'yes');
console.log(failed.length ? `${failed.length} budget(s) missed` : 'every budget passes');
process.exit(failed.length ? 1 : 0);
