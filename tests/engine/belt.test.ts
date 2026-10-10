import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BALANCE } from '../../src/content/balance';
import { RARITIES } from '../../src/content/belt';
import { D } from '../../src/engine/decimal';
import { performReset } from '../../src/engine/layers';
import { simulateElapsed } from '../../src/engine/offline';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import {
  beltOpen,
  beltTierNeed,
  beltTierUp,
  buyBeltUpgrade,
  buyDrillBit,
  buyDrillDrone,
  coreHp,
  drillDamage,
  drillDps,
  drillOpen,
  harvest,
  oreFor,
  rollRarity,
  tapCore,
} from '../../src/engine/systems/belt';
import { addPerk, levelInfo, perksFree, resetPerks, starsmithOpen, xpForLevel } from '../../src/engine/systems/starsmith';
import { buyEngine } from '../../src/engine/systems/stardust';
import { tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

/** A Red Dwarf (the Belt and the Starsmith Level are open), nothing else. */
function beltRun(seed = 7): GameState {
  const s = createInitialState(5_000_000, seed);
  s.tier = 1;
  invalidateStats();
  return s;
}

function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

describe('the Asteroid Belt', () => {
  it('opens at Red Dwarf, with the Starsmith Level', () => {
    const s = createInitialState(1, 1);
    expect(beltOpen(s)).toBe(false);
    expect(starsmithOpen(s)).toBe(false);
    s.tier = 1;
    expect(beltOpen(s)).toBe(true);
    expect(starsmithOpen(s)).toBe(true);
  });

  it('rolls rarities at their odds over a million rolls', () => {
    const s = beltRun(99);
    const counts = new Array<number>(RARITIES.length).fill(0);
    const N = 1_000_000;
    for (let i = 0; i < N; i++) counts[rollRarity(s)]!++;
    // rarest first, so each rarity's share is 1/oneIn of what the rarer ones left over
    let left = 1;
    const expected: number[] = [];
    for (let i = RARITIES.length - 1; i > 0; i--) {
      expected[i] = left / RARITIES[i]!.oneIn;
      left -= expected[i]!;
    }
    expected[0] = left;
    for (let i = 0; i < RARITIES.length; i++) {
      const mean = N * expected[i]!;
      const sd = Math.sqrt(mean * (1 - expected[i]!));
      expect(Math.abs(counts[i]! - mean), `${RARITIES[i]!.name}: ${counts[i]} vs ${mean.toFixed(1)}`).toBeLessThan(5 * sd + 1);
    }
  });

  it('spawns 100,000 asteroids through the real field at those odds', () => {
    const s = beltRun(3);
    s.belt.upgrades.amount = BALANCE.belt.maxCap; // the field holds 400
    s.belt.upgrades.growth = 10_000; // ~400 arrive a second
    invalidateStats();
    const counts = new Array<number>(RARITIES.length).fill(0);
    let spawned = 0;
    while (spawned < 100_000) {
      tick(s, 1);
      for (const a of s.belt.field) counts[a.r]!++;
      spawned += s.belt.field.length;
      harvest(s, s.belt.field.map((a) => a.id));
    }
    expect(s.stats.spawned).toBe(spawned);
    expect(s.stats.harvested).toBe(spawned);
    const share = (i: number) => counts[i]! / spawned;
    expect(share(1)).toBeGreaterThan(0.0185); // gold 1 in 50
    expect(share(1)).toBeLessThan(0.0215);
    expect(share(2)).toBeGreaterThan(0.0019); // crystal 1 in 400
    expect(share(2)).toBeLessThan(0.0031);
    expect(counts[3]).toBeGreaterThan(5); // prismatic 1 in 5,000: ~20
    expect(counts[3]).toBeLessThan(40);
  });

  it('rolls from its own random stream, leaving the main one untouched', () => {
    const s = beltRun();
    const before = [...s.rng];
    for (let i = 0; i < 20 * 60; i++) tick(s, 0.05);
    expect(s.belt.field.length).toBeGreaterThan(0);
    expect(s.rng).toEqual(before);
  });

  it('fills the field up to its cap, one every 2.5 s', () => {
    const s = beltRun();
    for (let i = 0; i < 20 * 10; i++) tick(s, 0.05);
    expect(s.belt.field.length).toBe(4); // 10 s
    for (let i = 0; i < 20 * 60; i++) tick(s, 0.05);
    expect(s.belt.field.length).toBe(BALANCE.belt.baseCap);
  });

  it('harvests ore, XP and a little Stardust, and ignores ids that are gone', () => {
    const s = beltRun();
    buyEngine(s, 'mote', 0);
    s.belt.field = [
      { id: 1, r: 0 },
      { id: 2, r: 1 },
      { id: 3, r: 0 },
    ];
    expect(harvest(s, [1, 2, 99])).toBe(2);
    expect(cur(s, 'ore').toNumber()).toBe(1 + 10);
    expect(s.belt.field.map((a) => a.id)).toEqual([3]);
    expect(harvest(s, [1, 2])).toBe(0);
    expect((s.totals.all.xp ?? D(0)).toNumber()).toBeGreaterThanOrEqual(11);
  });

  it('prices upgrades on their curves and applies them', () => {
    const s = beltRun();
    gain(s, 'ore', D(1e6));
    expect(buyBeltUpgrade(s, 'value')).toBe(true);
    expect(cur(s, 'ore').toNumber()).toBe(1e6 - 10);
    expect(oreFor(s, 0).toNumber()).toBe(2); // (1 + 1)
    s.belt.upgrades.value = 25;
    invalidateStats();
    expect(oreFor(s, 0).toNumber()).toBe(26 * 2); // doubles every 25 levels
    buyBeltUpgrade(s, 'amount');
    invalidateStats();
    expect(stat(s, 'beltCap').toNumber()).toBe(11);
    s.belt.upgrades.beam = BALANCE.belt.beamMaxLevel;
    expect(buyBeltUpgrade(s, 'beam')).toBe(false);
  });

  it('Belt Tiers: 100 x 3^(T^1.2) ore this tier; resets ore and upgrades, x2 ore', () => {
    const s = beltRun();
    expect(beltTierNeed(1).toNumber()).toBe(300);
    expect(beltTierNeed(2).toNumber()).toBeCloseTo(100 * 3 ** 2 ** 1.2, 6);
    s.belt.upgrades.value = 3;
    gain(s, 'ore', D(1000));
    expect(beltTierUp(s)).toBe(false); // gathered, not just held
    s.belt.oreThisTier = D(300);
    s.belt.field = [{ id: 5, r: 0 }];
    expect(beltTierUp(s)).toBe(true);
    invalidateStats();
    expect(s.belt.tier).toBe(1);
    expect(cur(s, 'ore').toNumber()).toBe(0);
    expect(s.belt.upgrades).toEqual({});
    expect(s.belt.field).toHaveLength(1);
    expect(oreFor(s, 0).toNumber()).toBe(2);
  });

  it('drones keep harvesting while you are away', () => {
    const s = beltRun();
    s.belt.tier = 1; // one drone, one asteroid a second
    invalidateStats();
    simulateElapsed(s, 3600, { cap: 86_400, efficiency: 1, offline: true });
    // the drone outpaces arrivals (one every 2.5 s), so it takes about every one
    expect(s.stats.harvested ?? 0).toBeGreaterThan(1400);
    expect(cur(s, 'ore').toNumber()).toBeGreaterThan(1400);
    expect(s.belt.field.length).toBeLessThanOrEqual(1);
  });

  it('a day away harvests what a day played would, at the offline efficiency', () => {
    const away = beltRun(11);
    away.belt.tier = 1;
    const played = clone(away);
    const awayFull = clone(away);
    invalidateStats();
    simulateElapsed(awayFull, 86_400, { cap: 86_400, efficiency: 1, offline: true });
    // 24 h in 2,000 catch-up steps of 43 s against 1 h played in 50 ms ticks, scaled up
    simulateElapsed(away, 86_400, { cap: 86_400, efficiency: 0.5, offline: true });
    for (let i = 0; i < 20 * 3600; i++) tick(played, 0.05);
    const perHourAway = (away.stats.harvested ?? 0) / 24;
    expect(perHourAway / (played.stats.harvested ?? 1)).toBeGreaterThan(0.97);
    expect(perHourAway / (played.stats.harvested ?? 1)).toBeLessThan(1.03);
    // the drone keeps up with arrivals (one every 2.5 s): about 1,440 an hour
    expect(played.stats.harvested ?? 0).toBeGreaterThan(1400);
    // the same day at 50% efficiency: the same asteroids (same seed), half the ore
    expect(awayFull.stats.harvested).toBe(away.stats.harvested);
    expect(cur(away, 'ore').toNumber() / cur(awayFull, 'ore').toNumber()).toBeCloseTo(0.5, 6);
  });

  it('passive ore from Belt Tier 3 is a tenth of the field each second', () => {
    const s = beltRun();
    s.belt.tier = 3;
    s.belt.field = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, r: 0 }));
    s.belt.nextId = 11;
    invalidateStats();
    const per = oreFor(s, 0).toNumber();
    const before = cur(s, 'ore').toNumber();
    tick(s, 0.05);
    // drones also took ore; the passive part alone is field x 0.1 x dt
    const passive = 10 * per * 0.1 * 0.05;
    expect(cur(s, 'ore').toNumber() - before).toBeGreaterThanOrEqual(passive * 0.99);
  });

  it('survives a save round trip, field and all', () => {
    const s = beltRun();
    for (let i = 0; i < 20 * 30; i++) tick(s, 0.05);
    s.belt.upgrades.value = 4;
    const c = clone(s);
    expect(c.belt.field).toEqual(s.belt.field);
    expect(c.belt.upgrades).toEqual({ value: 4 });
    expect(c.belt.oreThisTier.eq(s.belt.oreThisTier)).toBe(true);
  });

  it('is kept through a Supernova', () => {
    const s = beltRun();
    s.tier = 3;
    s.belt.tier = 2;
    s.belt.upgrades.value = 7;
    gain(s, 'ore', D(500));
    gain(s, 'stardust', D(1e9));
    performReset(s, 'supernova');
    expect(s.belt.tier).toBe(2);
    expect(s.belt.upgrades.value).toBe(7);
    expect(cur(s, 'ore').toNumber()).toBe(500);
  });
});

describe('Deep Core Drilling', () => {
  it('opens at 5 Supernovas', () => {
    const s = beltRun();
    expect(drillOpen(s)).toBe(false);
    s.stats.supernovas = 5;
    expect(drillOpen(s)).toBe(true);
  });

  it('breaks cores for ore, goes deeper, and raises that ore mastery', () => {
    const s = beltRun();
    s.stats.supernovas = 5;
    expect(coreHp(0).toNumber()).toBe(100);
    expect(coreHp(2).toNumber()).toBeCloseTo(6400, 6);
    expect(drillDamage(s, D(150))).toBe(1);
    expect(s.drill.depth).toBe(1);
    expect(s.drill.damage.toNumber()).toBe(50);
    expect(cur(s, 'ore').toNumber()).toBe(50);
    expect(s.drill.mastery.cobalt).toBe(1);
    expect(tapCore(s)).toBe(0); // 2 s of drilling on an 800 HP core, +10% from Cobalt mastery 1
    expect(s.drill.damage.toNumber()).toBeCloseTo(52.2, 9);
  });

  it('drones add drilling and bits multiply it', () => {
    const s = beltRun();
    s.stats.supernovas = 5;
    gain(s, 'ore', D(1e5));
    expect(buyDrillDrone(s)).toBe(true);
    expect(drillDps(s).toNumber()).toBe(3);
    expect(buyDrillBit(s)).toBe(true);
    expect(drillDps(s).toNumber()).toBeCloseTo(4.5, 9);
    expect(cur(s, 'ore').toNumber()).toBe(1e5 - 500 - 1000);
  });

  it('drills on its own, offline too', () => {
    const s = beltRun();
    s.stats.supernovas = 5;
    simulateElapsed(s, 600, { cap: 86_400, efficiency: 1, offline: true });
    expect(s.drill.depth).toBeGreaterThanOrEqual(1);
  });
});

describe('the Starsmith Level', () => {
  it('needs 50 x 2.7^(L^0.75) XP a level', () => {
    expect(xpForLevel(0).toNumber()).toBe(50);
    expect(xpForLevel(4).toNumber()).toBeCloseTo(50 * 2.7 ** 4 ** 0.75, 6);
    const s = beltRun();
    gain(s, 'xp', D(50));
    expect(levelInfo(s).level).toBe(1);
    gain(s, 'xp', xpForLevel(1));
    expect(levelInfo(s).level).toBe(2);
  });

  it('gives XP for taps, purchases and harvests', () => {
    const s = beltRun();
    gain(s, 'stardust', D(1e6));
    buyEngine(s, 'mote', 10);
    expect((s.totals.all.xp ?? D(0)).toNumber()).toBeCloseTo(10 * BALANCE.starsmith.xp.engine, 9);
  });

  it('counts levels the same when XP arrives bit by bit as all at once', () => {
    const a = beltRun();
    const b = beltRun();
    for (let i = 0; i < 400; i++) {
      gain(a, 'xp', D(37.5));
      levelInfo(a);
      levelInfo(b); // another state in between must not confuse the memo
    }
    gain(b, 'xp', D(15_000));
    expect(levelInfo(a)).toEqual(levelInfo(b));
    expect(levelInfo(a).level).toBeGreaterThan(5);
  });

  it('a perk point a level; perks apply and reset for free', () => {
    const s = beltRun();
    gain(s, 'xp', D(50 + xpForLevel(1).toNumber()));
    expect(perksFree(s)).toBe(2);
    expect(addPerk(s, 'cap')).toBe(true);
    expect(addPerk(s, 'cap')).toBe(true);
    expect(addPerk(s, 'cap')).toBe(false);
    invalidateStats();
    expect(stat(s, 'beltCap').toNumber()).toBe(BALANCE.belt.baseCap + 4);
    resetPerks(s);
    invalidateStats();
    expect(perksFree(s)).toBe(2);
    expect(stat(s, 'beltCap').toNumber()).toBe(BALANCE.belt.baseCap);
    expect(addPerk(s, 'nope')).toBe(false);
  });
});

describe('save version 6', () => {
  it('loads and migrates a real version 5 save', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v5.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(6);
    const { rng, ...belt } = state.belt;
    expect(belt).toEqual({ upgrades: {}, tier: 0, field: [], nextId: 1, spawnAcc: 0, droneAcc: 0, oreThisTier: D(0) });
    expect(rng).toHaveLength(4);
    expect(state.drill.depth).toBe(0);
    expect(state.starsmith.perks).toEqual({});
    expect(cur(state, 'ore').toNumber()).toBe(0);
  });
});
