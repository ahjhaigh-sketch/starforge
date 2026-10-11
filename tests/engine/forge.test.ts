import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BALANCE } from '../../src/content/balance';
import { ELEMENTS } from '../../src/content/elements';
import { GRADES, RELICS } from '../../src/content/forge';
import { planLimited } from '../../src/engine/buy';
import { D } from '../../src/engine/decimal';
import { performReset } from '../../src/engine/layers';
import { simulateElapsed } from '../../src/engine/offline';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { breakdown, invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { beltPlan, buyBeltUpgrade, buyDrillBit, harvest, oreFor } from '../../src/engine/systems/belt';
import { codexPreview, elementLevel, grantCodex, maxZForTier, rowComplete, samplesFor } from '../../src/engine/systems/codex';
import { batchSeconds, buyForgeUpgrade, buyRelic, collectorDone, crucibles, equipRelic, relicEffect, relicPlan, relicSlots, runFurnace, unequipRelic } from '../../src/engine/systems/forge';
import { buyEngine, milestonesReached } from '../../src/engine/systems/stardust';
import { tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

/** A player with 3 Supernovas: the Starforge is open. */
function forgeRun(seed = 5): GameState {
  const s = createInitialState(6_000_000, seed);
  s.tier = 3;
  s.stats.supernovas = 3;
  s.forge.share = 1; // the furnace may use all common ore (the share has its own test)
  invalidateStats();
  return s;
}

function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

const alloy = (s: GameState, g = 'iron') => cur(s, `alloy.${g}`).toNumber();

describe('ore grades', () => {
  it('a rare asteroid gives its common ore and the same again of its own grade', () => {
    const s = forgeRun();
    s.belt.field = [
      { id: 1, r: 0 },
      { id: 2, r: 1 },
      { id: 3, r: 2 },
    ];
    harvest(s, [1, 2, 3]);
    expect(cur(s, 'ore').toNumber()).toBe(1 + 10 + 50);
    expect(cur(s, 'ore.gold').toNumber()).toBe(oreFor(s, 1).toNumber());
    expect(cur(s, 'ore.crystal').toNumber()).toBe(50);
  });

  it('every grade arrives at a similar rate: multiplier / odds is about a tenth for each', () => {
    // the expected rare ore per asteroid, relative to the common ore it gives
    const rates = GRADES.slice(1).map((g, i) => {
      const r = [50, 400, 5000, 100_000][i]!;
      const m = [10, 50, 500, 10_000][i]!;
      return { g: g.id, perAsteroid: m / r };
    });
    for (const x of rates) {
      expect(x.perAsteroid).toBeGreaterThanOrEqual(0.1);
      expect(x.perAsteroid).toBeLessThanOrEqual(0.2);
    }
  });
});

describe('the furnace', () => {
  it('smelts 100 ore into 1 alloy in 10 s', () => {
    const s = forgeRun();
    gain(s, 'ore', D(250));
    runFurnace(s, 9.9);
    expect(alloy(s)).toBe(0);
    expect(cur(s, 'ore').toNumber()).toBe(150); // one batch in the crucible
    runFurnace(s, 0.1);
    expect(alloy(s)).toBe(1);
    expect(cur(s, 'ore').toNumber()).toBe(50); // the next batch started
    runFurnace(s, 10);
    expect(alloy(s)).toBe(2);
    expect(s.forge.lanes).toHaveLength(0); // not enough ore for a third
    expect(s.stats.smelts).toBe(2);
  });

  it('one long step gives what many short ticks would', () => {
    const a = forgeRun();
    gain(a, 'ore', D(1e5));
    a.forge.upgrades = { speed: 7, bulk: 3, crucibles: 2 };
    invalidateStats();
    const b = clone(a);
    invalidateStats();
    runFurnace(a, 3600);
    for (let i = 0; i < 3600 * 20; i++) runFurnace(b, 0.05);
    expect(Math.abs(alloy(a) - alloy(b))).toBeLessThanOrEqual(crucibles(a) * 4);
    expect(cur(a, 'ore').add(a.forge.lanes.reduce((x, l) => x.add(l.ore), D(0))).toNumber() + alloy(a) * 100).toBe(1e5);
  });

  it('upgrades: faster belt, bulk batches, more crucibles (with buy amounts)', () => {
    const s = forgeRun();
    gain(s, 'ore', D(1e9));
    s.settings.buyAmount = 10;
    expect(buyForgeUpgrade(s, 'speed')).toBe(true);
    invalidateStats();
    expect(s.forge.upgrades.speed).toBe(10);
    expect(batchSeconds(s)).toBeCloseTo(10 / 1.1 ** 10, 9);
    // crucibles stop at six, so x10 buys the five that are left
    expect(buyForgeUpgrade(s, 'crucibles')).toBe(true);
    expect(crucibles(s)).toBe(6);
    expect(buyForgeUpgrade(s, 'crucibles')).toBe(false);
  });

  it('nothing is lost if you reload mid-smelt', () => {
    const s = forgeRun();
    gain(s, 'ore', D(1000));
    s.forge.upgrades.crucibles = 2;
    runFurnace(s, 4); // three batches in, 4 s each
    expect(s.forge.lanes).toHaveLength(3);
    const reloaded = clone(s);
    expect(reloaded.forge.lanes).toHaveLength(3);
    expect(reloaded.forge.lanes[0]!.ore.toNumber()).toBe(100);
    expect(reloaded.forge.lanes[0]!.t).toBe(4);
    // both finish the same way
    invalidateStats();
    runFurnace(s, 6);
    runFurnace(reloaded, 6);
    expect(alloy(reloaded)).toBe(alloy(s));
    expect(alloy(s)).toBe(3);
    expect(cur(reloaded, 'ore').toNumber()).toBe(cur(s, 'ore').toNumber());
  });

  it('the hopper takes only its share of newly mined common ore, and all of the rare grades', () => {
    const s = forgeRun();
    s.forge.share = 0.5;
    gain(s, 'ore', D(1000));
    runFurnace(s, 1000);
    expect(alloy(s)).toBe(5);
    expect(cur(s, 'ore').toNumber()).toBe(500);
    // a tenth of what comes next
    s.forge.share = 0.1;
    gain(s, 'ore', D(2000));
    runFurnace(s, 1000);
    expect(alloy(s)).toBe(7);
    expect(cur(s, 'ore').toNumber()).toBe(2300);
    // rare ore has no other use: it all goes in
    s.forge.grade = 'gold';
    gain(s, 'ore.gold', D(300));
    runFurnace(s, 1000);
    expect(alloy(s, 'gold')).toBe(3);
    // and All smelts the stockpile too
    s.forge.grade = 'iron';
    s.forge.share = 1;
    runFurnace(s, 1000);
    expect(cur(s, 'ore').toNumber()).toBe(0);
  });

  it('switching off finishes what is in the crucible, then stops', () => {
    const s = forgeRun();
    gain(s, 'ore', D(1000));
    runFurnace(s, 1);
    s.forge.on = false;
    runFurnace(s, 30);
    expect(alloy(s)).toBe(1);
    expect(cur(s, 'ore').toNumber()).toBe(900);
  });

  it('smelts the chosen grade from its own ore', () => {
    const s = forgeRun();
    gain(s, 'ore', D(500));
    gain(s, 'ore.gold', D(250));
    s.forge.grade = 'gold';
    runFurnace(s, 20);
    expect(alloy(s, 'gold')).toBe(2);
    expect(cur(s, 'ore').toNumber()).toBe(500);
  });

  it('keeps working offline, at the offline efficiency', () => {
    const s = forgeRun();
    gain(s, 'ore', D(1e6));
    simulateElapsed(s, 3600, { cap: 86_400, efficiency: 0.5, offline: true });
    // 3600 s at half speed: 180 batches
    expect(alloy(s)).toBeGreaterThanOrEqual(179);
    expect(alloy(s)).toBeLessThanOrEqual(181);
  });
});

describe('relics', () => {
  it('has about 50, ten per alloy grade, with unique ids', () => {
    expect(RELICS).toHaveLength(50);
    expect(new Set(RELICS.map((r) => r.id)).size).toBe(50);
    for (const g of GRADES) expect(RELICS.filter((r) => r.grade === g.id)).toHaveLength(10);
  });

  it('crafting costs 10 alloy, level L costs 10 x 1.6^L, effect = base x 1.25^(level - 1)', () => {
    const s = forgeRun();
    gain(s, 'alloy.iron', D(1e6));
    expect(buyRelic(s, 'anvil')).toBe(true);
    expect(alloy(s)).toBe(1e6 - 10);
    expect(s.relics.levels.anvil).toBe(1);
    expect(s.relics.equipped).toEqual(['anvil']);
    s.settings.buyAmount = 10;
    const plan = relicPlan(s, 'anvil');
    expect(plan.count).toBe(10);
    let sum = 0;
    for (let L = 1; L <= 10; L++) sum += 10 * 1.6 ** L;
    expect(plan.cost.toNumber()).toBeCloseTo(sum, 6);
    buyRelic(s, 'anvil');
    expect(s.relics.levels.anvil).toBe(11);
    const def = RELICS.find((r) => r.id === 'anvil')!;
    expect(relicEffect(def, 11).toNumber()).toBeCloseTo(0.25 * 1.25 ** 10, 9);
  });

  it('show in stat breakdowns, but only while equipped', () => {
    const s = forgeRun();
    gain(s, 'alloy.iron', D(1e6));
    buyRelic(s, 'anvil');
    invalidateStats();
    const line = breakdown(s, 'productionMult').find((l) => l.label === 'Anvil of Dawn (relic)');
    expect(line?.value.toNumber()).toBeCloseTo(1.25, 9);
    unequipRelic(s, 'anvil');
    invalidateStats();
    expect(breakdown(s, 'productionMult').some((l) => l.label === 'Anvil of Dawn (relic)')).toBe(false);
  });

  it('six slots, one more with iron in the Codex', () => {
    const s = forgeRun();
    gain(s, 'alloy.iron', D(1e9));
    for (const r of RELICS.filter((x) => x.grade === 'iron').slice(0, 7)) buyRelic(s, r.id);
    expect(s.relics.equipped).toHaveLength(6);
    const seventh = RELICS.filter((x) => x.grade === 'iron')[6]!.id;
    expect(equipRelic(s, seventh)).toBe(false);
    s.codex.fe = 1;
    invalidateStats();
    expect(relicSlots(s)).toBe(7);
    expect(equipRelic(s, seventh)).toBe(true);
  });

  it('caps the ones on capped stats', () => {
    const s = forgeRun();
    gain(s, 'alloy.iron', D(1e30));
    s.settings.buyAmount = 'max';
    buyRelic(s, 'lodestone');
    buyRelic(s, 'lodestone');
    expect(s.relics.levels.lodestone).toBe(10);
    expect(buyRelic(s, 'lodestone')).toBe(false);
  });

  it('crafting every relic of a grade doubles that alloy', () => {
    const s = forgeRun();
    gain(s, 'alloy.iron', D(1e9));
    for (const r of RELICS.filter((x) => x.grade === 'iron')) buyRelic(s, r.id);
    invalidateStats();
    expect(collectorDone(s, 'iron')).toBe(true);
    expect(stat(s, 'alloyGain.iron').toNumber()).toBe(2);
    expect(stat(s, 'alloyGain.gold').toNumber()).toBe(1);
  });
});

describe('the Element Codex', () => {
  it('holds all 118 elements in a proper table', () => {
    expect(ELEMENTS).toHaveLength(118);
    expect(ELEMENTS.map((e) => e.z)).toEqual(Array.from({ length: 118 }, (_, i) => i + 1));
    expect(new Set(ELEMENTS.map((e) => e.symbol)).size).toBe(118);
    const at = (sym: string) => ELEMENTS.find((e) => e.symbol === sym)!;
    expect([at('Fe').row, at('Fe').col]).toEqual([4, 8]);
    expect([at('Au').row, at('Au').col]).toEqual([6, 11]);
    expect([at('La').row, at('La').col]).toEqual([9, 3]);
    expect([at('Og').row, at('Og').col]).toEqual([7, 18]);
    // no two in the same cell
    expect(new Set(ELEMENTS.map((e) => `${e.row}.${e.col}`)).size).toBe(118);
  });

  it('a Neutron Star Supernova grants elements up to iron; a Blue Giant only up to oxygen', () => {
    for (const [tier, last, next] of [
      [3, 'o', 'f'],
      [6, 'fe', 'co'],
    ] as const) {
      const s = forgeRun();
      s.tier = tier;
      gain(s, 'stardust', D(1e9));
      performReset(s, 'supernova');
      expect(s.codex[last]).toBeGreaterThan(0);
      expect(s.codex[next] ?? 0).toBe(0);
      expect(s.codex.h).toBe(s.codex[last]);
    }
    expect(maxZForTier(3)).toBe(8);
    expect(maxZForTier(6)).toBe(26);
  });

  it('samples = floor(1 + log10(S / 1e7)); levels from log2', () => {
    expect(samplesFor(D(1e7))).toBe(1);
    expect(samplesFor(D(9.9e7))).toBe(1);
    expect(samplesFor(D(1e8))).toBe(2);
    expect(samplesFor(D(1e12))).toBe(6);
    expect(samplesFor(D(1e6))).toBe(0);
    const s = forgeRun();
    s.codex.h = 1;
    expect(elementLevel(s, 'h')).toBe(1);
    s.codex.h = 7;
    expect(elementLevel(s, 'h')).toBe(3);
    s.codex.h = 8;
    expect(elementLevel(s, 'h')).toBe(4);
  });

  it('families and completed rows show in breakdowns', () => {
    const s = forgeRun();
    grantCodex(s, D(1e7), 4); // up to silicon: rows 1 and 2 complete
    invalidateStats();
    expect(rowComplete(s, 1)).toBe(true);
    expect(rowComplete(s, 2)).toBe(true);
    expect(rowComplete(s, 3)).toBe(false);
    const labels = breakdown(s, 'productionMult').map((l) => l.label);
    expect(labels).toContain('Codex: Nonmetals');
    expect(labels).toContain('Codex: row 1 complete');
    expect(breakdown(s, 'tapPower').map((l) => l.label)).toContain('Codex: row 2 complete');
    expect(s.stats.elements).toBe(14);
    expect(s.stats.codexRows).toBe(2);
  });

  it('helium adds an engine milestone at 1,250 owned; uranium raises shard gain', () => {
    const s = forgeRun();
    expect(milestonesReached(1250, s)).toBe(12);
    s.codex.he = 1;
    invalidateStats();
    expect(milestonesReached(1250, s)).toBe(13);
    expect(milestonesReached(1249, s)).toBe(12);
    s.codex.u = 4; // level 3: its own +30%, and it counts for the Actinides family too
    invalidateStats();
    const lines = breakdown(s, 'shardGain');
    expect(lines.find((l) => l.label === 'Codex: Uranium')?.value.toNumber()).toBeCloseTo(1.3, 9);
    expect(lines.find((l) => l.label === 'Codex: Actinides')?.value.toNumber()).toBeCloseTo(1.06, 9);
  });

  it('previews what a Supernova would add', () => {
    const s = forgeRun();
    const p = codexPreview(s, D(1e9), 6);
    expect(p.each).toBe(3);
    expect(p.upTo?.name).toBe('Iron');
    expect(p.count).toBe(26);
  });

  it('starts once the Starforge opens (3 Supernovas)', () => {
    const s = forgeRun();
    s.stats.supernovas = 1;
    gain(s, 'stardust', D(1e8));
    performReset(s, 'supernova'); // the second
    expect(s.codex).toEqual({});
    s.tier = 3;
    gain(s, 'stardust', D(1e8));
    performReset(s, 'supernova'); // the third: the Starforge opens
    expect(s.codex.o).toBe(2);
  });

  it('is kept through a Supernova, and adds up', () => {
    const s = forgeRun();
    gain(s, 'stardust', D(1e8));
    performReset(s, 'supernova');
    s.tier = 3;
    gain(s, 'stardust', D(1e8));
    performReset(s, 'supernova');
    expect(s.codex.o).toBe(4);
  });
});

describe('buy amounts everywhere (rule 8)', () => {
  it('Belt upgrades: x10, Max and the beam cap', () => {
    const s = forgeRun();
    gain(s, 'ore', D(1e12));
    s.settings.buyAmount = 10;
    buyBeltUpgrade(s, 'value');
    expect(s.belt.upgrades.value).toBe(10);
    s.settings.buyAmount = 'next';
    expect(beltPlan(s, 'value').count).toBe(15); // up to the doubling at 25
    s.settings.buyAmount = 'max';
    buyBeltUpgrade(s, 'beam');
    expect(s.belt.upgrades.beam).toBe(BALANCE.belt.beamMaxLevel);
    expect(beltPlan(s, 'beam').count).toBe(0);
  });

  it('planLimited never overspends and never passes the cap', () => {
    const curve = { base: 10, brackets: [{ from: 0, ratio: 1.6 }] };
    for (const money of [0, 9, 10, 26, 1e3, 1e9]) {
      const p = planLimited(curve, 0, D(money), 'max', 1, 5);
      if (p.canAfford) expect(p.cost.lte(money)).toBe(true);
      expect(p.count).toBeLessThanOrEqual(5);
    }
  });

  it('drill bits cost Iron alloy', () => {
    const s = forgeRun();
    s.stats.supernovas = 5;
    gain(s, 'alloy.iron', D(100));
    expect(buyDrillBit(s)).toBe(true);
    expect(alloy(s)).toBe(95);
  });
});

describe('save version 7', () => {
  it('loads and migrates a real version 6 save', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v6.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.belt.upgrades).toEqual({ value: 12, amount: 4 });
    expect(state.drill.depth).toBe(3);
    expect(state.starsmith.perks).toEqual({ cap: 2 });
    expect(cur(state, 'ore').toNumber()).toBe(12345);
    expect(state.forge).toMatchObject({ grade: 'iron', on: true, upgrades: {}, lanes: [], share: 0.5 });
    expect(state.relics).toEqual({ levels: {}, equipped: [] });
    expect(state.codex).toEqual({});
  });

  it('round-trips the furnace, relics and Codex', () => {
    const s = forgeRun();
    gain(s, 'ore', D(500));
    runFurnace(s, 3);
    s.relics = { levels: { anvil: 4 }, equipped: ['anvil'] };
    s.codex = { h: 3, he: 3 };
    const c = clone(s);
    expect(c.forge.lanes).toHaveLength(1);
    expect(c.relics).toEqual(s.relics);
    expect(c.codex).toEqual(s.codex);
  });

  it('a full tick runs the forge', () => {
    const s = forgeRun();
    gain(s, 'ore', D(100));
    for (let i = 0; i < 20 * 10 + 1; i++) tick(s, 0.05);
    expect(alloy(s)).toBe(1);
  });
});
