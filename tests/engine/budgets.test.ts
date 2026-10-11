import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { D } from '../../src/engine/decimal';
import { simulateElapsed } from '../../src/engine/offline';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, type GameState } from '../../src/engine/state';
import { invalidateStats, resetStatRegistry } from '../../src/engine/stats';
import { rollRunes } from '../../src/engine/systems/runes';
import { tick } from '../../src/engine/tick';

/**
 * The engine's side of the Tech tab's speed budgets, on a real late-game save (the simulator's
 * game after nine Big Crunches, every system running). Times here only catch big regressions:
 * test machines differ, so the exact budgets are measured in the browser by `npm run budgets`.
 */
beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

/** Shared CI machines are several times slower and noisy: their limits are looser (the exact budgets are browser-side). */
const SLOW = process.env.CI ? 5 : 1;

const lateGame = (): GameState => importSave(readFileSync('tests/fixtures/late-game.txt', 'utf8').trim()).state;

const timeIt = (fn: () => void, n: number): number => {
  const t0 = performance.now();
  for (let i = 0; i < n; i++) fn();
  return (performance.now() - t0) / n;
};

describe('speed budgets (engine)', () => {
  it('a late-game save loads, plays two minutes with every system on, and saves again', () => {
    const s = lateGame();
    expect(s.stats.crunchesAll).toBe(9);
    expect(s.eternity.upgrades).toHaveLength(10);
    for (let i = 0; i < 2400; i++) tick(s, 0.05);
    const r = exportSave(s);
    expect(r.ok).toBe(true);
  });

  it('a late-game tick stays well inside the frame (the 2 ms budget is checked in the browser)', () => {
    const s = lateGame();
    for (let i = 0; i < 200; i++) tick(s, 0.05); // warm up
    const ms = timeIt(() => tick(s, 0.05), 1000);
    expect(ms).toBeLessThan(10 * SLOW);
  });

  it('eight hours away catch up within a time budget, taking longer steps when the late game makes each one dear', () => {
    const s = lateGame();
    const playtime = s.playtime;
    const singularities = s.stats.singularitiesAll ?? 0;
    const t0 = performance.now();
    const report = simulateElapsed(s, 8 * 3600, { cap: 8 * 3600, efficiency: 1, offline: true, budgetMs: 250 });
    const ms = performance.now() - t0;
    expect(report.secondsCounted).toBe(8 * 3600);
    expect(s.playtime - playtime).toBeGreaterThanOrEqual(8 * 3600);
    expect(s.stats.singularitiesAll ?? 0).toBeGreaterThan(singularities);
    // 250 ms here; a slow test machine still stops at the 32-step floor
    expect(ms).toBeLessThan(1500 * SLOW);
  });

  it('rolling at e30 runes a second does the same computer work as rolling one', () => {
    const s = createInitialState(8_000_000, 3);
    Object.assign(s.stats, { supernovasAll: 40, nebulas: 1, nebulasAll: 1 });
    s.tier = 3;
    s.forge.on = false;
    invalidateStats();
    // the gems are free here: this measures the rolling, not the price
    timeIt(() => rollRunes(s, 'dust', D(1)), 200);
    const one = timeIt(() => rollRunes(s, 'dust', D(1)), 2000);
    const huge = timeIt(() => rollRunes(s, 'dust', D('1e30')), 2000);
    expect(huge).toBeLessThan(Math.max(one * 4, 0.05));
  });
});
