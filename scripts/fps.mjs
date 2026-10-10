// Frame-rate check: node scripts/fps.mjs [baseUrl]. Runs the real game with 400 live particles,
// a White Hole star and 36 motes, and reports fps. Headless Chromium draws WebGL in software,
// so a real GPU only does better.
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://localhost:4173';
const browser = await chromium.launch({ args: (process.env.GL_ARGS ?? '--use-angle=swiftshader').split(' ') });
for (const view of [{ name: 'desktop', width: 1400, height: 900 }, { name: 'phone', width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport: { width: view.width, height: view.height } });
  await page.goto(`${base}/?dev=1`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${base}/?dev=1`);
  await page.waitForTimeout(800);
  const gpu = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const ext = gl?.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
  console.log(view.name, 'GPU:', gpu);
  const r = await page.evaluate(async () => {
    const sf = window.sf;
    sf.game.state.tier = 11;
    sf.commands.devAdd('stardust', 1e7);
    for (let i = 0; i < 40; i++) sf.commands.buyEngine('mote');
    await new Promise((res) => setTimeout(res, 500));
    const frames = [];
    let last = performance.now();
    let stop = false;
    const loop = (t) => { frames.push(t - last); last = t; if (!stop) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    const spam = setInterval(() => sf.fx.burst(innerWidth / 2, innerHeight / 2, 80, 0xffc83d, 200, 14), 100);
    let maxLive = 0;
    const probe = setInterval(() => { maxLive = Math.max(maxLive, sf.fx.liveParticles()); }, 50);
    await new Promise((res) => setTimeout(res, 5000));
    stop = true; clearInterval(spam); clearInterval(probe);
    const f = frames.slice(10).sort((a, b) => a - b);
    const avg = f.reduce((a, b) => a + b, 0) / f.length;
    return { fps: +(1000 / avg).toFixed(1), median: +f[Math.floor(f.length / 2)].toFixed(1), p95: +f[Math.floor(f.length * 0.95)].toFixed(1), maxLive, tickMs: sf.game.tickMs.toFixed(3), renderMs: sf.fx.renderMs().toFixed(2) };
  });
  console.log(view.name, JSON.stringify(r));
  await page.close();
}
await browser.close();
