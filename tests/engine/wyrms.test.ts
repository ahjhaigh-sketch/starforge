import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BALANCE } from '../../src/content/balance';
import { BASE_SEEDS, CROSSBREEDS, crossOf, STAR_BY_ID, STAR_SPECIES } from '../../src/content/nursery';
import { SHRINE_BY_ID } from '../../src/content/runes';
import { WYRM_SPECIES, wyrmKey } from '../../src/content/wyrms';
import { D } from '../../src/engine/decimal';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { breakdown, invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { pageCount } from '../../src/engine/systems/collection';
import { buyNurseryUpgrade, crossbreed, harvestPlot, plant, plotProgress, uprootPlot } from '../../src/engine/systems/nursery';
import { shrineOpen } from '../../src/engine/systems/runes';
import { launch } from '../../src/engine/systems/ships';
import { effLog10 } from '../../src/engine/odds';
import { boostOfKey, buyEggs, embersPerSecond, equipWyrm, fuseWyrms, hatchEggs, speciesEffLog, stackOf, teamSlots, trainPlan, trainWyrm } from '../../src/engine/systems/wyrms';
import { tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

function player(nebulas = 4, seed = 21): GameState {
  const s = createInitialState(10_000_000, seed);
  s.tier = 3;
  s.stats.supernovasAll = 60;
  s.stats.nebulas = nebulas;
  s.stats.nebulasAll = nebulas;
  s.forge.on = false;
  invalidateStats();
  return s;
}

function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

const ash = WYRM_SPECIES[0]!.id;

describe('Void Wyrm fusion', () => {
  it('uses exactly 5 identical Wyrms, Normal to Golden to Rainbow', () => {
    const s = player();
    const normal = wyrmKey(ash, 0);
    s.wyrms.stacks[normal] = D(12);
    expect(fuseWyrms(s, normal)).toBe(true);
    expect(stackOf(s, normal).toNumber()).toBe(7);
    expect(stackOf(s, wyrmKey(ash, 1)).toNumber()).toBe(1);
    expect(fuseWyrms(s, normal)).toBe(true);
    expect(stackOf(s, normal).toNumber()).toBe(2);
    expect(fuseWyrms(s, normal)).toBe(false);
    expect(stackOf(s, normal).toNumber()).toBe(2);
    s.wyrms.stacks[wyrmKey(ash, 1)] = D(5);
    expect(fuseWyrms(s, wyrmKey(ash, 1))).toBe(true);
    expect(stackOf(s, wyrmKey(ash, 1)).toNumber()).toBe(0);
    expect(stackOf(s, wyrmKey(ash, 2)).toNumber()).toBe(1);
    s.wyrms.stacks[wyrmKey(ash, 2)] = D(50);
    expect(fuseWyrms(s, wyrmKey(ash, 2))).toBe(false);
    // mutated Wyrms only fuse with identical mutated ones
    s.wyrms.stacks[wyrmKey(ash, 0, 'void')] = D(4);
    expect(fuseWyrms(s, wyrmKey(ash, 0, 'void'))).toBe(false);
  });

  it('a stack fused away leaves the team', () => {
    const s = player();
    const k = wyrmKey(ash, 0);
    s.wyrms.stacks[k] = D(5);
    expect(equipWyrm(s, k)).toBe(true);
    fuseWyrms(s, k);
    expect(s.wyrms.team).toEqual([]);
  });
});

describe('hatching', () => {
  it('species rates match the rune odds at the square root of luck', () => {
    const s = player();
    const counts = new Map<string, number>();
    for (let i = 0; i < 1000; i++) for (const h of hatchEggs(s, 1000).hits) counts.set(h.key.split('|')[0]!, (counts.get(h.key.split('|')[0]!) ?? 0) + h.count.toNumber());
    // rarest first: each species gets its odds of what the rarer ones left
    let left = 1e6;
    for (let i = WYRM_SPECIES.length - 1; i >= 1; i--) {
      const w = WYRM_SPECIES[i]!;
      const lambda = left * 10 ** -speciesEffLog(s, w);
      const got = counts.get(w.id) ?? 0;
      expect(Math.abs(got - lambda)).toBeLessThanOrEqual(5 * Math.sqrt(lambda) + 2);
      left -= got;
    }
    expect(counts.get(ash)).toBe(left);
    // luck counts at its square root: Heart of the Void at its cap makes rune luck x3
    s.runes.copies['dust.7'] = D(1e6);
    invalidateStats();
    const L = stat(s, 'runeLuck').toNumber();
    expect(L).toBeGreaterThan(2);
    expect(speciesEffLog(s, WYRM_SPECIES[10]!)).toBeCloseTo(effLog10(WYRM_SPECIES[10]!.log10, Math.sqrt(L), 1), 9);
    expect(speciesEffLog(s, WYRM_SPECIES[10]!)).toBeGreaterThan(effLog10(WYRM_SPECIES[10]!.log10, L, 1));
  });

  it('eggs cost 10 x 1.5^eggs and follow the buy amount; the first Wyrm opens the Wyrm shrine', () => {
    const s = player(3);
    gain(s, 'essence', D(1e6));
    s.settings.buyAmount = 10;
    const before = cur(s, 'essence').toNumber();
    const res = buyEggs(s)!;
    expect(res.count).toBe(10);
    const cost = Array.from({ length: 10 }, (_, k) => 10 * 1.5 ** k).reduce((a, b) => a + b, 0);
    expect(before - cur(s, 'essence').toNumber()).toBeCloseTo(cost, 6);
    expect(s.wyrms.eggs).toBe(10);
    expect(s.stats.wyrmsHatched).toBe(10);
    expect(s.wyrms.team).toHaveLength(1);
    expect(shrineOpen(s, SHRINE_BY_ID.get('wyrm')!)).toBe(true);
    expect(buyEggs(player(2))).toBeNull();
  });
});

describe('training, the team and Embers', () => {
  it('training costs 20 x 1.35^level Iron alloy, less with Wyrm XP, and the boost shows in Stats', () => {
    const s = player();
    const k = wyrmKey(WYRM_SPECIES[3]!.id, 1);
    s.wyrms.stacks[k] = D(1);
    gain(s, 'alloy.iron', D(1e6));
    s.settings.buyAmount = 10;
    const plan = trainPlan(s, k);
    expect(plan.cost.toNumber()).toBeCloseTo((20 * (1.35 ** 10 - 1)) / 0.35, 4);
    expect(trainWyrm(s, k)).toBe(true);
    expect(s.wyrms.levels[k]).toBe(10);
    // base x 1.5^rank x (1 + 0.1 x level) x Golden 3
    expect(boostOfKey(s, k).toNumber()).toBeCloseTo(0.1 * 1.5 ** 3 * 2 * 3, 9);
    equipWyrm(s, k);
    invalidateStats();
    const line = breakdown(s, WYRM_SPECIES[3]!.stat).find((l) => l.label === 'Void Wyrms');
    expect(line?.value.toNumber()).toBeCloseTo(1 + 0.1 * 1.5 ** 3 * 2 * 3, 9);
  });

  it('slots go from 3 to 6 with Wyrms hatched; Embers flow offline too', () => {
    const s = player();
    expect(teamSlots(s)).toBe(3);
    s.stats.wyrmsHatched = 400;
    expect(teamSlots(s)).toBe(6);
    for (let i = 0; i < 7; i++) {
      s.wyrms.stacks[wyrmKey(WYRM_SPECIES[i]!.id, 0)] = D(1);
      equipWyrm(s, wyrmKey(WYRM_SPECIES[i]!.id, 0));
    }
    expect(s.wyrms.team).toHaveLength(6);
    invalidateStats();
    const rate = embersPerSecond(s).toNumber();
    expect(rate).toBeGreaterThan(0);
    tick(s, 10);
    expect(cur(s, 'embers').toNumber()).toBeCloseTo(rate * 10, 3);
  });

  it('a Wyrm catches a comet a moment after it appears, never during catch-up', () => {
    const s = player();
    s.wyrms.stacks[wyrmKey(ash, 0)] = D(1);
    equipWyrm(s, wyrmKey(ash, 0));
    s.comet.until = s.playtime + 20;
    s.comet.nextAt = s.playtime + 1e6;
    tick(s, 1);
    expect(s.stats.wyrmCatches ?? 0).toBe(0);
    tick(s, 2);
    expect(s.stats.wyrmCatches).toBe(1);
    expect(s.comet.until).toBe(0);
  });
});

describe('the Star Nursery', () => {
  it('crossbreeding results match their table, in either order, and nothing else crosses', () => {
    expect(CROSSBREEDS).toHaveLength(20);
    expect(STAR_SPECIES).toHaveLength(25);
    const children = new Set(CROSSBREEDS.map((c) => c[2]));
    expect(children.size).toBe(20);
    for (const [a, b, c] of CROSSBREEDS) {
      const s = player();
      gain(s, 'essence', D(1e9));
      s.nursery.seeds = { [a]: 2, [b]: 1 };
      expect(crossOf(b, a)).toBe(c);
      expect(crossbreed(s, b, a)).toBe(c);
      expect(s.nursery.seeds).toEqual({ [a]: 1, [b]: 0, [c]: 1 });
      // tier 2 children come from base seeds, tier 3 from tier 2
      expect(STAR_BY_ID.get(a)!.tier).toBe(STAR_BY_ID.get(c)!.tier - 1);
    }
    const s = player();
    gain(s, 'essence', D(1e9));
    s.nursery.seeds = { 'star.ember': 5, 'star.aurora': 5 };
    expect(crossbreed(s, 'star.ember', 'star.aurora')).toBeNull();
    expect(crossbreed(s, 'star.ember', 'star.ember')).toBeNull();
    expect(s.nursery.seeds).toEqual({ 'star.ember': 5, 'star.aurora': 5 });
  });

  it('plant, grow through the stages, harvest Essence and the seed back', () => {
    const s = player();
    s.nursery.seeds['star.sol'] = 1;
    tick(s, 0.05);
    expect(plant(s, 0, 'star.sol')).toBe(true);
    expect(s.nursery.seeds['star.sol']).toBe(0);
    tick(s, 15);
    expect(plotProgress(s, 0)).toBeCloseTo(0.5, 2);
    expect(harvestPlot(s, 0)).toBeNull();
    tick(s, 16);
    const e = cur(s, 'essence').toNumber();
    expect(harvestPlot(s, 0)!.toNumber()).toBe(5);
    expect(cur(s, 'essence').toNumber() - e).toBe(5);
    expect(s.nursery.seeds['star.sol']).toBeGreaterThanOrEqual(1);
    expect(s.nursery.found).toEqual(['star.sol']);
    expect(pageCount(s, 'species')).toEqual({ found: 1, total: 25 });
  });

  it('with Tending, one long step harvests what many short ones do', () => {
    const run = (steps: number) => {
      const s = player(4, 8);
      gain(s, 'essence', D(1e6));
      s.nursery.upgrades.tending = 1;
      s.nursery.seeds['star.ember'] = 3;
      tick(s, 0.05);
      for (let i = 0; i < 3; i++) plant(s, i, 'star.ember');
      for (let i = 0; i < steps; i++) tick(s, 3000 / steps);
      return s;
    };
    const a = run(1);
    const b = run(300);
    expect(a.stats.nurseryHarvests).toBe(300);
    expect(b.stats.nurseryHarvests).toBe(300);
    // about half the harvests leave a spare seed
    expect(Math.abs((a.nursery.seeds['star.ember'] ?? 0) - 150)).toBeLessThan(40);
  });

  it('upgrades follow the buy amount; starships bring seeds home once it opens', () => {
    const s = player();
    gain(s, 'essence', D(1e8));
    s.settings.buyAmount = 'max';
    expect(buyNurseryUpgrade(s, 'plots')).toBe(true);
    expect(s.nursery.upgrades.plots).toBe(BALANCE.nursery.maxPlots - BALANCE.nursery.plots);
    expect(s.nursery.plots).toHaveLength(BALANCE.nursery.maxPlots);
    // growth and yield stop at 20 and 50 levels, however much Essence there is
    gain(s, 'essence', D('1e300'));
    buyNurseryUpgrade(s, 'growth');
    buyNurseryUpgrade(s, 'yield');
    expect(s.nursery.upgrades).toMatchObject({ growth: 20, yield: 50 });
    expect(buyNurseryUpgrade(s, 'growth')).toBe(false);
    // pulling up a star gives its seed back
    s.nursery.seeds['star.umber'] = 1;
    expect(plant(s, 0, 'star.umber')).toBe(true);
    expect(uprootPlot(s, 0)).toBe(true);
    expect(s.nursery.seeds['star.umber']).toBe(1);
    expect(s.nursery.plots[0]).toEqual({ species: null, t: 0 });
    const seeds = (x: GameState) => BASE_SEEDS.reduce((t, id) => t + (x.nursery.seeds[id] ?? 0), 0);
    const fly = (x: GameState) => {
      x.stats.supernovas = 15;
      x.stats.bestTier = 4;
      expect(launch(x, 0, 'kuiper', false)).toBe(true);
      tick(x, 700);
      return x;
    };
    const had = seeds(s);
    expect(seeds(fly(s))).toBe(had + 1);
    // before the Nursery opens, trips bring no seeds
    expect(seeds(fly(player(3)))).toBe(0);
  });
});

describe('save version 11', () => {
  it('loads a real version 10 save', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v10.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.stats.nebulasAll).toBe(3);
    expect(state.runes.stars).toEqual({ dust: 1 });
    expect(state.auras.equipped).toBe('aura.haze');
    expect(state.mutations.runes['dust.0']!.golden!.toNumber()).toBe(7);
    expect(state.mutations.others).toEqual({});
    expect(state.belt.field[0]).toEqual({ id: 7, r: 0, m: 1 });
    expect(state.wyrms).toMatchObject({ team: [], eggs: 0, found: [] });
    expect(state.nursery).toMatchObject({ plots: [], seeds: {}, found: [] });
    expect(cur(state, 'runeShards').toNumber()).toBe(55);
  });

  it('round-trips Wyrms and the Nursery', () => {
    const s = player();
    const k = wyrmKey(ash, 1, 'void');
    s.wyrms.stacks[k] = D('1e30');
    s.wyrms.levels[k] = 12;
    s.wyrms.team = [k];
    s.wyrms.eggs = 44;
    s.wyrms.found = [`${ash}|1`];
    s.nursery.plots = [{ species: 'star.opal', t: 12.5 }, { species: null, t: 0 }, { species: null, t: 0 }];
    s.nursery.seeds = { 'star.opal': 2 };
    s.nursery.upgrades = { growth: 3 };
    s.nursery.found = ['star.opal'];
    s.mutations.others['wyrm.x.void'] = 1;
    const c = clone(s);
    expect(c.wyrms.stacks[k]!.eq('1e30')).toBe(true);
    expect(c.wyrms).toMatchObject({ levels: { [k]: 12 }, team: [k], eggs: 44, found: [`${ash}|1`] });
    expect(c.nursery).toMatchObject({ plots: s.nursery.plots, seeds: { 'star.opal': 2 }, upgrades: { growth: 3 }, found: ['star.opal'] });
    expect(c.mutations.others).toEqual({ 'wyrm.x.void': 1 });
  });
});
