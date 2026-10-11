import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { CONSTANT_BY_ID, CONSTANTS } from '../../src/content/constants';
import { BALANCE } from '../../src/content/balance';
import { MASTERY_RANKS, ORBITALS } from '../../src/content/early';
import { bulkCost, maxBuy, priceAt } from '../../src/engine/cost';
import { D } from '../../src/engine/decimal';
import { performReset } from '../../src/engine/layers';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, SAVE_VERSION } from '../../src/engine/state';
import { invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { buyConstant, constantCurve, doublings, effectValue, level, nextDoubling } from '../../src/engine/systems/constants';
import { masteryRank } from '../../src/engine/systems/mastery';
import { buyPlanet, differentNeighbours, engineOrbitalBonus, levelPlanet, planetPrice, setPlanetType } from '../../src/engine/systems/orbitals';
import { claimQuest, fillQuests, questProgress } from '../../src/engine/systems/quests';
import { buyEngine } from '../../src/engine/systems/stardust';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

const fresh = () => createInitialState(3_000_000, 99);
const gravity = CONSTANT_BY_ID.get('stellar.gravity')!;

describe('Cosmic Constants', () => {
  it('buying 1,000,000 levels costs exactly the series sum, and is instant', () => {
    const curve = constantCurve(gravity);
    const g = D(gravity.growth);
    // the three brackets summed independently with the closed form
    const seg = (first: ReturnType<typeof D>, r: ReturnType<typeof D>, k: number) => first.mul(r.pow(k).sub(1)).div(r.sub(1));
    const r0 = g;
    const r1 = g.pow(1.1);
    const r2 = g.pow(1.2);
    const p0 = D(gravity.base);
    const p1 = p0.mul(r0.pow(1000));
    const p2 = p1.mul(r1.pow(99_000));
    const expected = seg(p0, r0, 1000).add(seg(p1, r1, 99_000)).add(seg(p2, r2, 900_000));
    const t0 = performance.now();
    const got = bulkCost(curve, 0, 1_000_000);
    expect(performance.now() - t0).toBeLessThan(20);
    expect(got.div(expected).toNumber()).toBeCloseTo(1, 9);
  });

  it('bulk cost across the level-1,000 step equals the item-by-item sum', () => {
    const curve = constantCurve(gravity);
    let sum = D(0);
    for (let L = 950; L < 1100; L++) sum = sum.add(priceAt(curve, L));
    expect(bulkCost(curve, 950, 150).div(sum).toNumber()).toBeCloseTo(1, 10);
  });

  it('Max never overspends and is never one short, across every bracket (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 400_000 }), fc.double({ min: 0, max: 60_000, noNaN: true }), fc.integer({ min: 0, max: CONSTANTS.length - 1 }), (L, exp, ci) => {
        const curve = constantCurve(CONSTANTS[ci]!);
        const money = D(10).pow(exp);
        const n = maxBuy(curve, L, money);
        expect(bulkCost(curve, L, n).lte(money)).toBe(true);
        expect(bulkCost(curve, L, n + 1).gt(money)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it('effects double every 25 levels to 1,000, then every 100, then every 1,000', () => {
    expect(doublings(24)).toBe(0);
    expect(doublings(25)).toBe(1);
    expect(doublings(1000)).toBe(40);
    expect(doublings(1100)).toBe(41);
    expect(doublings(100_000)).toBe(1030);
    expect(doublings(1_000_000)).toBe(1930);
    expect(nextDoubling(0)).toBe(25);
    expect(nextDoubling(990)).toBe(1000);
    expect(nextDoubling(1000)).toBe(1100);
    expect(nextDoubling(100_000)).toBe(101_000);
    expect(effectValue(0.05, true, 50).toNumber()).toBeCloseTo((1 + 0.05 * 50) * 4, 9);
    expect(effectValue(0.01, false, 50).toNumber()).toBeCloseTo(1.5, 9);
  });

  it('opens at Golden Sun, buys with the chosen amount, and feeds the stat pipeline', () => {
    const s = fresh();
    gain(s, 'stardust', D(1e15));
    expect(buyConstant(s, gravity.id)).toBe(false); // locked before Golden Sun
    s.tier = 2;
    invalidateStats();
    const before = stat(s, 'productionMult').toNumber();
    s.settings.buyAmount = 'next';
    expect(buyConstant(s, gravity.id)).toBe(true);
    expect(level(s, gravity.id)).toBe(25); // up to the first doubling
    invalidateStats();
    expect(stat(s, 'productionMult').toNumber()).toBeCloseTo(before * (1 + 0.05 * 25) * 2, 6);
    s.settings.buyAmount = 10;
    const money = cur(s, 'stardust');
    expect(buyConstant(s, gravity.id)).toBe(true);
    expect(level(s, gravity.id)).toBe(35);
    expect(money.sub(cur(s, "stardust")).div(bulkCost(constantCurve(gravity), 25, 10)).toNumber()).toBeCloseTo(1, 6);
    expect(buyConstant(s, 'stellar.orbit')).toBe(false); // Orbit needs Blue Giant
  });
});

describe('Engine Mastery', () => {
  it('ranks come from engines ever bought and survive wiping the run', () => {
    const s = fresh();
    s.tier = 4;
    gain(s, 'stardust', D(1e9));
    buyEngine(s, 'mote', 30);
    expect(masteryRank(s, 'mote')).toBe(1);
    invalidateStats();
    const withRank = stat(s, 'engineMult.mote').toNumber();
    // wipe the run state as a reset would, then save and load
    s.engines = {};
    s.currencies.stardust = D(0);
    const r = exportSave(s);
    if (!r.ok) throw new Error(r.error);
    const back = importSave(r.code).state;
    expect(masteryRank(back, 'mote')).toBe(1);
    back.engines.mote = 30;
    invalidateStats();
    expect(stat(back, 'engineMult.mote').toNumber()).toBe(withRank);
    back.enginesEver.mote = MASTERY_RANKS[4].at;
    expect(masteryRank(back, 'mote')).toBe(5);
  });
});

describe('Star Quests', () => {
  it('a reset keeps every quest\'s progress, though it takes away the engines, tier and Stardust they count (found by review)', () => {
    const s = fresh();
    s.tier = BALANCE.supernova.tier;
    s.engines = { mote: 120 };
    gain(s, 'stardust', D(1e9));
    s.quests = [
      { kind: 'own', engine: 'mote', start: 100, need: 40 },
      { kind: 'evolve', start: BALANCE.supernova.tier - 1, need: 2 },
      { kind: 'stardust', start: 0, need: 1, startD: D(0), needD: D(2e9) },
    ];
    const before = s.quests.map((q) => questProgress(s, q));
    expect(before).toEqual([0.5, 0.5, 0.5]);
    expect(performReset(s, 'supernova')).not.toBeNull();
    expect(s.engines).toEqual({});
    expect(s.quests.map((q) => questProgress(s, q))).toEqual(before);
    // and they still move on from there
    s.engines.mote = 20;
    expect(questProgress(s, s.quests[0]!)).toBe(1);
  });

  it('fills three at Golden Sun, measures from when each appeared, and refills on claim', () => {
    const s = fresh();
    fillQuests(s);
    expect(s.quests).toHaveLength(0); // not open yet
    s.tier = 2;
    s.stats.taps = 1000;
    fillQuests(s);
    expect(s.quests).toHaveLength(3);
    const i = s.quests.findIndex((q) => q.kind !== 'stardust');
    const q = s.quests[i]!;
    expect(questProgress(s, q)).toBe(0);
    expect(claimQuest(s, i)).toBeNull();
    // complete it the simple way: move its counter on by what it needs
    if (q.kind === 'own') s.engines[q.engine!] = (s.engines[q.engine!] ?? 0) + q.need;
    else if (q.kind === 'upgrades') s.upgrades.push('tap.warm');
    else if (q.kind === 'evolve') s.tier += 1;
    else s.stats[{ taps: 'taps', engines: 'enginesBought', comets: 'comets', crits: 'crits' }[q.kind as 'taps']] = (s.stats[{ taps: 'taps', engines: 'enginesBought', comets: 'comets', crits: 'crits' }[q.kind as 'taps']] ?? 0) + q.need;
    expect(questProgress(s, q)).toBe(1);
    const before = cur(s, 'stardust');
    expect(claimQuest(s, i)).not.toBeNull();
    expect(cur(s, 'stardust').gt(before)).toBe(true);
    expect(s.quests).toHaveLength(3);
    expect(s.stats.questsDone).toBe(1);
    invalidateStats();
    expect(stat(s, 'productionMult').toNumber()).toBeGreaterThan(1);
  });
});

describe('Orbitals', () => {
  it('rings open with tiers, planets cost more each time, neighbours of a different type add more', () => {
    const s = fresh();
    gain(s, 'stardust', D(1e15));
    expect(buyPlanet(s, '0.0', 'rocky')).toBe(false); // ring 1 needs Blue Giant
    s.tier = 3;
    const p0 = planetPrice(s);
    expect(buyPlanet(s, '0.0', 'rocky')).toBe(true);
    expect(planetPrice(s).div(p0).toNumber()).toBeCloseTo(ORBITALS.planetGrowth, 9);
    expect(buyPlanet(s, '0.0', 'ice')).toBe(false); // taken
    expect(buyPlanet(s, '1.0', 'ice')).toBe(false); // ring 2 not open yet
    expect(buyPlanet(s, '0.1', 'rocky')).toBe(true);
    invalidateStats();
    // two rocky planets side by side: no variety bonus yet
    expect(differentNeighbours(s, '0.0')).toBe(0);
    expect(engineOrbitalBonus(s, 'drill')).toBeCloseTo(2 * ORBITALS.perLevel, 9);
    // changing one to ice is free and gives both a different neighbour
    const money = cur(s, 'stardust');
    expect(setPlanetType(s, '0.1', 'ice')).toBe(true);
    expect(cur(s, 'stardust').eq(money)).toBe(true);
    invalidateStats();
    expect(differentNeighbours(s, '0.0')).toBe(1);
    expect(engineOrbitalBonus(s, 'drill')).toBeCloseTo(ORBITALS.perLevel * (1 + ORBITALS.neighbourBonus), 9);
    expect(levelPlanet(s, '0.0')).toBe(true);
    invalidateStats();
    expect(stat(s, 'engineMult.drill').toNumber()).toBeCloseTo(1 + 2 * ORBITALS.perLevel * (1 + ORBITALS.neighbourBonus), 9);
  });
});

describe('save version 4', () => {
  it('loads and migrates a real version 3 save', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v3.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.tier).toBe(3);
    expect(state.upgrades).toContain('tap.warm');
    expect(state.constants).toEqual({});
    expect(state.planets).toEqual({});
    expect(state.quests).toEqual([]);
    expect(state.buffs.frenzy).toBeGreaterThan(0);
  });
});
