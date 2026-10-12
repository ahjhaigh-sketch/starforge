import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { ORBITALS } from '../../src/content/early';
import { D, type Decimal } from '../../src/engine/decimal';
import { exportSave, importSave } from '../../src/engine/save/store';
import { type BuyAmount, createInitialState, cur, gain, type GameState } from '../../src/engine/state';
import { resetStatRegistry } from '../../src/engine/stats';
import { buyPlanet, levelPlanet, levelPlanetPlan, levelPrice, nextPlanetStep } from '../../src/engine/systems/orbitals';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

/** A run at Blue Giant with one rocky planet on ring 1 and plenty of Stardust. */
function withPlanet(money = 1e30): GameState {
  const s = createInitialState(3_000_000, 7);
  s.tier = 3;
  gain(s, 'stardust', D(1e15));
  expect(buyPlanet(s, '0.0', 'rocky')).toBe(true);
  // top up to exactly `money` so the tests know what the wallet holds
  s.currencies.stardust = D(money);
  return s;
}

const setAmount = (s: GameState, amount: BuyAmount, custom = 1) => {
  s.settings.buyAmount = amount;
  s.settings.customBuyAmount = custom;
};

/** The old way: one level at a time, summed in a loop. */
function loopSum(level: number, k: number): Decimal {
  let total = D(0);
  for (let i = 0; i < k; i++) total = total.add(levelPrice({ type: 'rocky', level: level + i }));
  return total;
}

const relErr = (a: Decimal, b: Decimal) => a.sub(b).abs().div(b).toNumber();

describe('Orbitals: bulk planet levels', () => {
  it('x1 costs exactly the one-level price it always has, and buys one level', () => {
    const s = withPlanet();
    setAmount(s, 1);
    for (let i = 0; i < 12; i++) {
      const p = s.planets['0.0']!;
      const plan = levelPlanetPlan(s, '0.0');
      expect(plan.count).toBe(1);
      expect(plan.cost.eq(levelPrice(p))).toBe(true);
      // and the price is the documented formula: planetBase x 2 x levelGrowth^level
      expect(relErr(plan.cost, D(ORBITALS.planetBase).mul(2).mul(D(ORBITALS.levelGrowth).pow(p.level)))).toBeLessThan(1e-12);
      const before = cur(s, 'stardust');
      const lv = p.level;
      expect(levelPlanet(s, '0.0')).toBe(true);
      expect(s.planets['0.0']!.level).toBe(lv + 1);
      expect(cur(s, 'stardust').eq(before.sub(plan.cost))).toBe(true);
    }
  });

  it('x5, x10 and x100 cost the sum of that many level prices (closed form matches the loop)', () => {
    for (const k of [5, 10, 100] as const) {
      // 1.2.0: levels past 20 and 40 cost more (x3.5, then x8 each), so x100 needs a much bigger bank
      const s = withPlanet(1e150);
      setAmount(s, k);
      const lv = s.planets['0.0']!.level;
      const plan = levelPlanetPlan(s, '0.0');
      expect(plan.count).toBe(k);
      expect(relErr(plan.cost, loopSum(lv, k))).toBeLessThan(1e-9);
      const before = cur(s, 'stardust');
      expect(levelPlanet(s, '0.0')).toBe(true);
      expect(s.planets['0.0']!.level).toBe(lv + k);
      expect(cur(s, 'stardust').eq(before.sub(plan.cost))).toBe(true);
    }
  });

  it('a fixed amount that is not affordable buys nothing and shows the full total', () => {
    const s = withPlanet();
    setAmount(s, 10);
    const lv = s.planets['0.0']!.level;
    s.currencies.stardust = loopSum(lv, 10).mul(0.99);
    const plan = levelPlanetPlan(s, '0.0');
    expect(plan.count).toBe(10);
    expect(plan.canAfford).toBe(false);
    const before = cur(s, 'stardust');
    expect(levelPlanet(s, '0.0')).toBe(false);
    expect(s.planets['0.0']!.level).toBe(lv);
    expect(cur(s, 'stardust').eq(before)).toBe(true);
  });

  it('Max buys the most the Stardust covers, and never overspends', () => {
    const s = withPlanet();
    const lv = s.planets['0.0']!.level;
    // enough for exactly 23 levels and a bit, not 24
    s.currencies.stardust = loopSum(lv, 23).add(levelPrice({ type: 'rocky', level: lv + 23 }).mul(0.5));
    setAmount(s, 'max');
    const plan = levelPlanetPlan(s, '0.0');
    expect(plan.count).toBe(23);
    expect(plan.canAfford).toBe(true);
    expect(plan.cost.lte(cur(s, 'stardust'))).toBe(true);
    expect(loopSum(lv, 24).gt(cur(s, 'stardust'))).toBe(true);
    expect(levelPlanet(s, '0.0')).toBe(true);
    expect(s.planets['0.0']!.level).toBe(lv + 23);
    expect(cur(s, 'stardust').gte(0)).toBe(true);
    // what is left does not cover one more level
    expect(cur(s, 'stardust').lt(levelPrice(s.planets['0.0']!))).toBe(true);
  });

  it('Max with too little for one level shows the price of one and buys nothing', () => {
    const s = withPlanet();
    const p = s.planets['0.0']!;
    s.currencies.stardust = levelPrice(p).mul(0.5);
    setAmount(s, 'max');
    const plan = levelPlanetPlan(s, '0.0');
    expect(plan.count).toBe(1);
    expect(plan.canAfford).toBe(false);
    expect(plan.cost.eq(levelPrice(p))).toBe(true);
    expect(levelPlanet(s, '0.0')).toBe(false);
  });

  it('Max at enormous Stardust buys hundreds of levels in one closed-form step', () => {
    const s = withPlanet();
    s.currencies.stardust = D('1e300');
    setAmount(s, 'max');
    const t0 = performance.now();
    const plan = levelPlanetPlan(s, '0.0');
    expect(performance.now() - t0).toBeLessThan(50);
    expect(plan.count).toBeGreaterThan(300); // the steeper curve past level 40 (1.2.0) keeps it to hundreds
    expect(relErr(plan.cost, loopSum(1, plan.count))).toBeLessThan(1e-9);
    expect(plan.cost.lte(D('1e300'))).toBe(true);
  });

  it('Next levels up to the next round ten, and a typed amount buys exactly that many', () => {
    const s = withPlanet();
    setAmount(s, 'next');
    expect(levelPlanetPlan(s, '0.0').count).toBe(9); // Lv 1 -> 10
    expect(levelPlanet(s, '0.0')).toBe(true);
    expect(s.planets['0.0']!.level).toBe(10);
    expect(levelPlanetPlan(s, '0.0').count).toBe(10); // Lv 10 -> 20
    expect(nextPlanetStep(17)).toBe(20);
    setAmount(s, 'custom', 7);
    const lv = s.planets['0.0']!.level;
    const plan = levelPlanetPlan(s, '0.0');
    expect(plan.count).toBe(7);
    expect(relErr(plan.cost, loopSum(lv, 7))).toBeLessThan(1e-9);
  });

  it('an empty slot has nothing to level', () => {
    const s = withPlanet();
    setAmount(s, 10);
    expect(levelPlanetPlan(s, '0.1').count).toBe(0);
    expect(levelPlanet(s, '0.1')).toBe(false);
  });

  it('a save with bulk-levelled planets round-trips unchanged', () => {
    const s = withPlanet(1e150);
    setAmount(s, 100);
    expect(levelPlanet(s, '0.0')).toBe(true);
    expect(buyPlanet(s, '0.2', 'gas')).toBe(true);
    setAmount(s, 5);
    expect(levelPlanet(s, '0.2')).toBe(true);
    const exported = exportSave(s, 123);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const back = importSave(exported.code).state;
    expect(back.planets).toEqual(s.planets);
    expect(back.planets['0.0']!.level).toBe(101);
    expect(back.planets['0.2']!.level).toBe(6);
    expect(back.settings.buyAmount).toBe(5);
    expect(cur(back, 'stardust').eq(cur(s, 'stardust'))).toBe(true);
  });
});
