import { beforeEach, describe, expect, it } from 'vitest';
import { D } from '../../src/engine/decimal';
import { simulateElapsed } from '../../src/engine/offline';
import { nextFloat, seedRng } from '../../src/engine/rng';
import { createInitialState, gain } from '../../src/engine/state';
import { breakdown, defineStat, invalidateStats, registerSources, resetStatRegistry, stat } from '../../src/engine/stats';
import { registerSystem } from '../../src/engine/tick';

describe('stat pipeline', () => {
  beforeEach(() => resetStatRegistry());

  it('applies additions, then multipliers, then exponents, then softcaps', () => {
    const s = createInitialState(0, 1);
    defineStat({ id: 'x', label: 'X', base: () => D(2), softcaps: [{ label: 'cap', start: () => D(1e6), power: 0.5 }] });
    registerSources(
      { id: 'a', stat: 'x', op: 'mul', label: 'times 3', value: () => D(3) },
      { id: 'b', stat: 'x', op: 'add', label: 'plus 8', value: () => D(8) },
      { id: 'c', stat: 'x', op: 'pow', label: 'squared', value: () => D(2) },
    );
    expect(stat(s, "x").toNumber()).toBeCloseTo(900, 9); // ((2+8)*3)^2
    const lines = breakdown(s, 'x').map((l) => l.op);
    expect(lines).toEqual(['base', 'add', 'mul', 'pow']);
  });

  it('respects active() and caches until invalidated', () => {
    const s = createInitialState(0, 1);
    let on = false;
    defineStat({ id: 'y', label: 'Y', base: () => D(1) });
    registerSources({ id: 'y2', stat: 'y', op: 'mul', label: 'x2', value: () => D(2), active: () => on });
    expect(stat(s, 'y').toNumber()).toBe(1);
    on = true;
    expect(stat(s, 'y').toNumber()).toBe(1); // cached
    invalidateStats();
    expect(stat(s, 'y').toNumber()).toBe(2);
  });

  it('softcaps growth above the start', () => {
    const s = createInitialState(0, 1);
    defineStat({ id: 'z', label: 'Z', base: () => D(1e8), softcaps: [{ label: 'cap', start: () => D(1e6), power: 0.5 }] });
    expect(stat(s, 'z').toNumber()).toBeCloseTo(1e7, 3);
  });
});

describe('rng', () => {
  it('is deterministic from a seed and roughly uniform', () => {
    const a = seedRng(123);
    const b = seedRng(123);
    const xs = Array.from({ length: 5 }, () => nextFloat(a));
    const ys = Array.from({ length: 5 }, () => nextFloat(b));
    expect(xs).toEqual(ys);
    const st = seedRng(7);
    let sum = 0;
    const n = 100_000;
    for (let i = 0; i < n; i++) sum += nextFloat(st);
    expect(Math.abs(sum / n - 0.5)).toBeLessThan(0.005);
  });
});

describe('time and offline catch-up', () => {
  it('a 1 hour warp advances playtime by 3600 s and runs systems in at most 2,000 steps', () => {
    resetStatRegistry();
    let calls = 0;
    registerSystem({
      id: 'test-producer',
      order: 0,
      tick: (s, dt, ctx) => {
        calls++;
        gain(s, 'stardust', D(10 * dt * ctx.gainScale));
      },
    });
    const s = createInitialState(0, 1);
    const report = simulateElapsed(s, 3600, { cap: Infinity, efficiency: 1, offline: false });
    expect(s.playtime).toBeCloseTo(3600, 6);
    expect(calls).toBeLessThanOrEqual(2000);
    expect(report.gains.stardust!.toNumber()).toBeCloseTo(36000, 3);
  });

  it('applies the offline cap and efficiency', () => {
    const s = createInitialState(0, 1);
    const report = simulateElapsed(s, 10 * 3600, { cap: 2 * 3600, efficiency: 0.5, offline: true });
    expect(report.secondsCounted).toBe(7200);
    expect(report.capped).toBe(true);
    // the test producer above makes 10/s at full efficiency
    expect(report.gains.stardust!.toNumber()).toBeCloseTo(36000, 3);
  });

  it('ignores negative and absurd gaps', () => {
    const s = createInitialState(0, 1);
    expect(simulateElapsed(s, -50, { cap: Infinity, efficiency: 1, offline: true }).secondsCounted).toBe(0);
    expect(simulateElapsed(s, NaN, { cap: Infinity, efficiency: 1, offline: true }).secondsCounted).toBe(0);
  });
});
