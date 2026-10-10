import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { beforeAll, describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/content/balance';
import { ENGINES } from '../../src/content/engines';
import { registerContent } from '../../src/content';
import { TIERS, tierCost } from '../../src/content/tiers';
import { planPurchase } from '../../src/engine/buy';
import { bulkCost, maxBuy, priceAt } from '../../src/engine/cost';
import { D } from '../../src/engine/decimal';
import { importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, SAVE_VERSION } from '../../src/engine/state';
import { invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import {
  buyEngine,
  comboMult,
  createTapRuntime,
  engineCurve,
  engineRevealed,
  evolve,
  milestonesReached,
  tapStar,
} from '../../src/engine/systems/stardust';
import { checkUnlocks, reqProgress, reqText } from '../../src/engine/systems/unlocks';
import { tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

const fresh = () => createInitialState(1_000_000, 7);

describe('bracketed costs', () => {
  const mote = engineCurve('mote');

  it('x10 costs exactly the geometric series', () => {
    const expected = 15 * (1.15 ** 10 - 1) / 0.15;
    expect(bulkCost(mote, 0, 10).toNumber()).toBeCloseTo(expected, 6);
  });

  it('bulk cost across the 200-owned step equals the item-by-item sum', () => {
    let sum = D(0);
    for (let n = 190; n < 215; n++) sum = sum.add(priceAt(mote, n));
    expect(bulkCost(mote, 190, 25).div(sum).toNumber()).toBeCloseTo(1, 12);
    // and the step itself: item 201 costs 1.25x item 200
    expect(priceAt(mote, 201).div(priceAt(mote, 200)).toNumber()).toBeCloseTo(1.25, 12);
    expect(priceAt(mote, 200).div(priceAt(mote, 199)).toNumber()).toBeCloseTo(1.15, 12);
  });

  it('Max never overspends and is never one short, at any scale (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5000 }), fc.double({ min: 0, max: 400, noNaN: true }), fc.integer({ min: 0, max: 14 }), (own, exp, ei) => {
        const curve = engineCurve(ENGINES[ei]!.id);
        const money = D(10).pow(exp);
        const n = maxBuy(curve, own, money);
        expect(bulkCost(curve, own, n).lte(money)).toBe(true);
        expect(bulkCost(curve, own, n + 1).gt(money)).toBe(true);
      }),
      { numRuns: 400 },
    );
  });

  it('a million levels is one calculation', () => {
    const t0 = performance.now();
    const n = maxBuy(mote, 0, D('1e60000'));
    expect(n).toBeGreaterThan(100_000);
    expect(performance.now() - t0).toBeLessThan(50);
  });

  it('plans: fixed amounts buy exactly that many or nothing; Max shows one when it can buy none', () => {
    const p10 = planPurchase(mote, 0, D(100), 10, 1);
    expect(p10).toMatchObject({ count: 10, canAfford: false });
    expect(p10.cost.eq(bulkCost(mote, 0, 10))).toBe(true);
    const pMax0 = planPurchase(mote, 0, D(10), 'max', 1);
    expect(pMax0).toMatchObject({ count: 1, canAfford: false });
    const pMax = planPurchase(mote, 0, D(1000), 'max', 1);
    expect(pMax.canAfford).toBe(true);
    expect(pMax.cost.lte(1000)).toBe(true);
    expect(planPurchase(mote, 0, D(1e9), 'custom', 37).count).toBe(37);
  });
});

describe('tapping', () => {
  it('100 taps give exactly 100 x tap power (crits off, no combo)', () => {
    for (const tier of [0, 1]) {
      const s = fresh();
      s.tier = tier;
      invalidateStats();
      const rt = createTapRuntime();
      const power = stat(s, 'tapPower');
      for (let i = 0; i < 100; i++) tapStar(s, rt, 1e9 + i * 3000); // 3 s apart: the combo fully drains
      expect(cur(s, 'stardust').eq(power.mul(100))).toBe(true);
      expect(s.stats.taps).toBe(100);
    }
  });

  it('the combo steps up at 10, 25 and 50 taps in a row', () => {
    const s = fresh();
    const rt = createTapRuntime();
    for (let i = 0; i < 50; i++) tapStar(s, rt, 1e9 + i * 40);
    // taps 1-9 x1, 10-24 x1.5, 25-49 x2, the 50th x3
    expect(cur(s, 'stardust').toNumber()).toBeCloseTo(9 + 15 * 1.5 + 25 * 2 + 3, 9);
    expect(comboMult(9)).toBe(1);
    expect(comboMult(50)).toBe(3);
  });

  it('caps taps at 30 a second', () => {
    const s = fresh();
    const rt = createTapRuntime();
    let counted = 0;
    for (let i = 0; i < 60; i++) if (tapStar(s, rt, 5e9 + i)) counted++;
    expect(counted).toBe(BALANCE.tap.maxPerSecond);
  });

  it('crits start at Golden Sun: about 5% of taps, each x10', () => {
    const s = fresh();
    const rt = createTapRuntime();
    expect(stat(s, 'critChance').toNumber()).toBe(0);
    s.tier = 2;
    invalidateStats();
    let crits = 0;
    const N = 20_000;
    for (let i = 0; i < N; i++) {
      const r = tapStar(s, rt, 1e9 + i * 3000)!;
      if (r.crit) {
        crits++;
        expect(r.amount.eq(stat(s, 'tapPower').mul(10))).toBe(true);
      }
    }
    expect(crits / N).toBeGreaterThan(0.045);
    expect(crits / N).toBeLessThan(0.055);
  });
});

describe('engines and tiers', () => {
  it('engine output doubles at each milestone', () => {
    expect(milestonesReached(9)).toBe(0);
    expect(milestonesReached(10)).toBe(1);
    expect(milestonesReached(1000)).toBe(12);
    const s = fresh();
    gain(s, 'stardust', D(1e6));
    expect(buyEngine(s, 'mote', 10)).toBe(true);
    invalidateStats();
    expect(stat(s, 'stardustPerSec').toNumber()).toBeCloseTo(0.1 * 10 * 2, 12);
    const before = cur(s, 'stardust');
    tick(s, 1);
    expect(cur(s, 'stardust').sub(before).toNumber()).toBeCloseTo(2, 9);
  });

  it('buying spends exactly the bulk cost and refuses what it cannot afford', () => {
    const s = fresh();
    gain(s, 'stardust', D(100));
    expect(buyEngine(s, 'mote', 10)).toBe(false);
    expect(cur(s, 'stardust').eq(100)).toBe(true);
    expect(buyEngine(s, 'mote', 3)).toBe(true);
    expect(cur(s, 'stardust').toNumber()).toBeCloseTo(100 - bulkCost(engineCurve('mote'), 0, 3).toNumber(), 9);
    expect(s.engines.mote).toBe(3);
    expect(s.enginesEver.mote).toBe(3);
  });

  it('the next engine is hidden until the one before it is owned', () => {
    const s = fresh();
    gain(s, 'stardust', D(1e9));
    expect(engineRevealed(s, 1)).toBe(false);
    expect(buyEngine(s, 'catcher', 1)).toBe(false);
    buyEngine(s, 'mote', 1);
    expect(engineRevealed(s, 1)).toBe(true);
    expect(buyEngine(s, 'catcher', 1)).toBe(true);
  });

  it('Star Tiers cost 1,000 x 50^(k - 2), resets nothing, and double everything', () => {
    expect(tierCost(1)).toBe(1000);
    expect(tierCost(2)).toBe(50_000);
    expect(tierCost(11)).toBeCloseTo(9.765625e19, 0);
    const s = fresh();
    gain(s, 'stardust', D(1e6));
    buyEngine(s, 'mote', 10);
    const left = cur(s, 'stardust');
    invalidateStats();
    const sps = stat(s, 'stardustPerSec');
    expect(evolve(s)).toBe(true);
    expect(s.tier).toBe(1);
    expect(cur(s, 'stardust').eq(left.sub(1000))).toBe(true);
    expect(s.engines.mote).toBe(10);
    invalidateStats();
    expect(stat(s, 'stardustPerSec').div(sps).toNumber()).toBeCloseTo(2, 12);
    expect(stat(s, 'tapPower').toNumber()).toBe(2);
  });

  it('can evolve all the way to White Hole and no further', () => {
    const s = fresh();
    gain(s, 'stardust', D(1e25));
    for (let i = 1; i < TIERS.length; i++) expect(evolve(s)).toBe(true);
    expect(s.tier).toBe(TIERS.length - 1);
    expect(evolve(s)).toBe(false);
  });
});

describe('unlocks', () => {
  it('records unlocks once, from amounts, and keeps them', () => {
    const s = fresh();
    checkUnlocks(s);
    expect(s.unlocked).not.toContain('belt');
    expect(reqProgress(s, { kind: 'tier', tier: 1 })).toBe(0);
    gain(s, 'stardust', D(500));
    expect(reqProgress(s, { kind: 'tier', tier: 1 })).toBeCloseTo(0.5, 9);
    gain(s, 'stardust', D(500));
    evolve(s);
    checkUnlocks(s);
    checkUnlocks(s);
    expect(s.unlocked.filter((x) => x === 'belt')).toHaveLength(1);
    s.tier = 0; // a later reset must not take it away
    checkUnlocks(s);
    expect(s.unlocked).toContain('belt');
  });

  it('describes requirements in plain words', () => {
    expect(reqText({ kind: 'tier', tier: 1 })).toBe('Reach Red Dwarf');
    expect(reqText({ kind: 'engine', id: 'catcher', count: 1 })).toBe('Own a Comet Catcher');
    expect(reqText({ kind: 'engine', id: 'mote', count: 5 })).toBe('Own 5 Spark Motes');
    expect(reqText({ kind: 'count', stat: 'supernovas', count: 3, noun: 'Supernova' })).toBe('3 Supernovas');
  });
});

describe('save version 2', () => {
  it('loads and migrates a real version 1 save', () => {
    const code = readFileSync('tests/fixtures/save-v1.txt', 'utf8').trim();
    const { state } = importSave(code);
    expect(state.version).toBe(SAVE_VERSION);
    expect(cur(state, 'stardust').toNumber()).toBeCloseTo(123456.789, 6);
    expect(state.stats.taps).toBe(42);
    expect(state.settings.notation).toBe('scientific');
    expect(state.tier).toBe(0);
    expect(state.engines).toEqual({});
    expect(state.unlocked).toEqual([]);
  });
});
