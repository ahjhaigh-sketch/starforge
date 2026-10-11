import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { CONSTANT_BY_ID } from '../../src/content/constants';
import { MULTIVERSE_ARMS, SPARK_TREE, UNIVERSE_RULES } from '../../src/content/multiverse';
import { bulkCost } from '../../src/engine/cost';
import { D } from '../../src/engine/decimal';
import { milestoneReached, performReset } from '../../src/engine/layers';
import { nextFloat, seedRng } from '../../src/engine/rng';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { breakdown, invalidateStats, isStat, resetStatRegistry } from '../../src/engine/stats';
import { buyConstant, constantCurve, level } from '../../src/engine/systems/constants';
import { crunchReady } from '../../src/engine/systems/crunch';
import { maxRules, multiverseGain, multiverseReady, setNextRule, sparkFlag, sparkTree } from '../../src/engine/systems/multiverse';
import { tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

/** A player with ten Big Crunches in this universe and a lot to lose. */
function ready(seed = 18): GameState {
  const s = createInitialState(90_000_000, seed);
  s.forge.on = false;
  Object.assign(s.stats, { supernovas: 40, supernovasAll: 900, supernovasBest: 40, nebulas: 12, nebulasAll: 120, nebulasBest: 12, singularities: 20, singularitiesAll: 400, singularitiesBest: 20, galactics: 9, galacticsAll: 60, galacticsBest: 9, crunches: 10, crunchesAll: 10, crunchesBest: 10, crunchesCycle: 10 });
  s.tier = 9;
  s.engines = { mote: 300 };
  s.upgrades = ['tap.warm'];
  s.novaTree = { root: 1 };
  s.nebulaTree = { nroot: 1 };
  s.singularityTree = { score: 1 };
  s.galacticTree = { 'gal.core': 1 };
  s.singularity.key = true;
  s.mirror.upgrades = ['mu.key'];
  s.megastructures = { dyson: 3 };
  s.eternity.upgrades = ['et.forge', 'et.nova', 'et.galaxy'];
  s.constants = { 'stellar.gravity': 50, 'et.entropy': 4 };
  s.trials.levels = { dim: 3 };
  s.spire.floor = 40;
  s.runes.copies['dust.0'] = D(77);
  s.relics.levels.anvil = 4;
  s.achievements = ['taps.1'];
  s.enginesEver = { mote: 5000 };
  for (const c of ['stardust', 'shards', 'essence', 'darkMatter', 'galaxyCores', 'chronons', 'echoDust']) gain(s, c, D(1e30));
  invalidateStats();
  return s;
}

function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

describe('the Multiverse', () => {
  it('needs 10 Big Crunches in this universe; pays 6 Sparks, in fifths', () => {
    const s = ready();
    expect(multiverseReady(s)).toBe(true);
    expect(multiverseGain(s).toNumber()).toBe(6);
    s.stats.crunchesCycle = 9;
    expect(multiverseReady(s)).toBe(false);
  });

  it('resets every earlier layer and keeps collections, challenges, medals, Mastery and Omni Constants', () => {
    const s = ready();
    s.constants['omni.gain'] = 1234;
    performReset(s, 'multiverse');
    expect(cur(s, 'sparks').toNumber()).toBe(6);
    expect(s.stats.multiversesAll).toBe(1);
    expect(s.stats.crunchesCycle).toBe(0);
    for (const c of ['stardust', 'shards', 'essence', 'darkMatter', 'galaxyCores', 'chronons', 'echoDust']) expect(cur(s, c).toNumber()).toBe(0);
    expect(s.totals.all.shards!.toNumber()).toBe(0);
    expect(s.engines).toEqual({});
    expect(s.tier).toBe(0);
    expect(s.novaTree).toEqual({});
    expect(s.nebulaTree).toEqual({});
    expect(s.singularityTree).toEqual({});
    expect(s.galacticTree).toEqual({});
    expect(s.singularity.key).toBe(false);
    expect(s.mirror.upgrades).toEqual([]);
    expect(s.megastructures).toEqual({});
    expect(s.eternity.upgrades).toEqual([]);
    expect(s.constants['stellar.gravity']).toBe(0);
    expect(s.constants['et.entropy']).toBe(0);
    expect(s.stats.supernovas).toBe(0);
    expect(s.stats.crunches).toBe(0);
    // kept
    expect(s.constants['omni.gain']).toBe(1234);
    expect(s.trials.levels).toEqual({ dim: 3 });
    expect(s.spire.floor).toBe(40);
    expect(s.runes.copies['dust.0']!.toNumber()).toBe(77);
    expect(s.relics.levels.anvil).toBe(4);
    expect(s.achievements).toContain('taps.1');
    expect(s.enginesEver).toEqual({ mote: 5000 });
    expect(s.stats.supernovasAll).toBe(900);
    expect(s.ships.fleet).toHaveLength(1);
    expect(milestoneReached(s, 'multiverse', 'omni')).toBe(true);
  });

  it('Unbound keeps a whole layer, Remembered its milestones, Undying its Eternity automation', () => {
    const s = ready();
    s.multiverse.tree = { 'mv.nebula.keep': 1, 'mv.supernova.milestones': 1, 'mv.galactic.auto': 1 };
    gain(s, 'sparks', D(0));
    invalidateStats();
    performReset(s, 'multiverse');
    expect(s.nebulaTree).toEqual({ nroot: 1 });
    expect(cur(s, 'essence').toNumber()).toBe(1e30);
    expect(s.stats.nebulas).toBe(12);
    expect(s.novaTree).toEqual({});
    expect(s.stats.supernovas).toBe(40);
    expect(milestoneReached(s, 'supernova', 'autoAll')).toBe(true);
    expect(s.eternity.upgrades).toEqual(['et.galaxy']);
    expect(s.singularityTree).toEqual({});
  });

  it('every Spark choice can be bought in any order (114 choices, 0.2 Sparks each)', () => {
    const fixed = SPARK_TREE.filter((n) => !n.repeat);
    expect(SPARK_TREE).toHaveLength(114);
    expect(fixed).toHaveLength(90);
    expect(MULTIVERSE_ARMS).toHaveLength(6);
    const finals: string[] = [];
    for (let trial = 0; trial < 5; trial++) {
      const s = ready(100 + trial);
      s.stats.multiversesAll = 1;
      gain(s, 'sparks', D(fixed.length * 0.2));
      const rng = seedRng(trial + 1);
      const order = [...fixed].sort(() => nextFloat(rng) - 0.5);
      for (const n of order) expect(sparkTree.buy(s, n.id)).toBe(true);
      expect(cur(s, 'sparks').toNumber()).toBeCloseTo(0, 9);
      for (const n of fixed) expect(sparkTree.buy(s, n.id)).toBe(false);
      finals.push(JSON.stringify(Object.keys(s.multiverse.tree).sort()));
      expect(sparkFlag(s, 'keep.crunch')).toBe(true);
      expect(sparkFlag(s, 'autoCrunch')).toBe(true);
    }
    expect(new Set(finals).size).toBe(1);
  });

  it('every Spark choice, Universe rule and Omni Constant boosts a stat that exists', () => {
    const missing: string[] = [];
    for (const n of SPARK_TREE) if ('stat' in n.effect && !isStat(n.effect.stat)) missing.push(`${n.id}: ${n.effect.stat}`);
    for (const r of UNIVERSE_RULES) for (const e of r.effects) if (!isStat(e.stat)) missing.push(`${r.id}: ${e.stat}`);
    for (const id of ['omni.gain', 'omni.luck', 'omni.speed']) for (const e of CONSTANT_BY_ID.get(id)!.effects) if (!isStat(e.stat)) missing.push(`${id}: ${e.stat}`);
    expect(missing).toEqual([]);
  });

  it('the Spark tree is laid out with room for every choice and its label', () => {
    let min = Infinity;
    for (let i = 0; i < SPARK_TREE.length; i++)
      for (let j = i + 1; j < SPARK_TREE.length; j++) min = Math.min(min, Math.hypot(SPARK_TREE[i]!.x - SPARK_TREE[j]!.x, SPARK_TREE[i]!.y - SPARK_TREE[j]!.y));
    expect(min).toBeGreaterThanOrEqual(100);
    expect(new Set(SPARK_TREE.map((n) => n.id)).size).toBe(114);
  });

  it('Sparks stay whole fifths: 0.6 Sparks buy exactly three choices (floating point would leave 0.1999...)', () => {
    const s = ready();
    s.stats.multiversesAll = 1;
    s.currencies.sparks = D(0.6);
    expect(sparkTree.buy(s, 'mv.stardust.keep')).toBe(true);
    expect(sparkTree.buy(s, 'mv.nebula.keep')).toBe(true);
    expect(sparkTree.buy(s, 'mv.crunch.keep')).toBe(true);
    expect(cur(s, 'sparks').toNumber()).toBe(0);
    // gains snap too
    s.currencies.sparks = D(0.6);
    performReset(s, 'multiverse');
    expect(cur(s, 'sparks').toNumber()).toBe(6.6);
  });

  it('echoes level up with no cap, x2 the price a level', () => {
    const s = ready();
    s.stats.multiversesAll = 1;
    const echo = SPARK_TREE.find((n) => n.repeat)!;
    gain(s, 'sparks', D(10));
    expect(sparkTree.cost(s, echo).toNumber()).toBeCloseTo(0.2, 9);
    sparkTree.buy(s, echo.id);
    expect(sparkTree.cost(s, echo).toNumber()).toBeCloseTo(0.4, 9);
    sparkTree.buy(s, echo.id);
    expect(sparkTree.level(s, echo.id)).toBe(2);
  });

  it('Omni Constants at 10,000,000 levels still buy instantly, for exactly the series sum', () => {
    const s = ready();
    s.stats.multiversesAll = 1;
    const c = CONSTANT_BY_ID.get('omni.gain')!;
    const exact = bulkCost(constantCurve(c), 0, 10_000_000);
    s.currencies.stardust = exact;
    const t0 = performance.now();
    expect(buyConstant(s, 'omni.gain', 'max')).toBe(true);
    expect(performance.now() - t0).toBeLessThan(50);
    expect(level(s, 'omni.gain')).toBe(10_000_000);
    expect(cur(s, 'stardust').div(exact).toNumber()).toBeLessThan(1e-9);
    invalidateStats();
    // linear: x(1 + 0.001 x 10M) Stardust, and no doublings
    expect(breakdown(s, 'productionMult').find((l) => l.label === 'Omni Gain (constant)')!.value.toNumber()).toBe(10_001);
  });

  it('the Universe Forge: rules for the next universe apply while you play it and pay more Sparks', () => {
    const s = ready();
    expect(maxRules(s)).toBe(2);
    expect(setNextRule(s, 'dim', true)).toBe(true);
    expect(setNextRule(s, 'dear', true)).toBe(true);
    expect(setNextRule(s, 'cold', true)).toBe(false);
    performReset(s, 'multiverse');
    expect(s.multiverse.rules).toEqual(['dim', 'dear']);
    invalidateStats();
    expect(breakdown(s, 'productionMult').map((l) => l.label)).toContain('Universe: Dim Universe');
    expect(breakdown(s, 'engineCostMult').map((l) => l.label)).toContain('Universe: Dear Universe');
    // the next Multiverse pays for the rules it was played under: 6 x (1 + 0.5 + 0.25)
    s.stats.crunchesCycle = 10;
    expect(multiverseGain(s).toNumber()).toBe(10.4);
    expect(UNIVERSE_RULES).toHaveLength(7);
  });

  it('Auto-Crunch (a Spark choice) Crunches by itself once ready', () => {
    const s = ready();
    s.stats.crunchesCycle = 0;
    s.multiverse.tree = { 'mv.crunch.auto': 1 };
    s.galactic.cleared = ['milkyway', 'spiral', 'elliptical', 'ring', 'dwarf', 'quasar', 'lenticular'];
    s.totals.run.galaxyCores = D(1e6);
    s.totals.run.chronons = D(0);
    invalidateStats();
    expect(crunchReady(s)).toBe(true);
    tick(s, 0.05);
    expect(s.stats.crunchesCycle).toBe(1);
  });
});

describe('save version 19', () => {
  it('loads a real version 18 save: Big Crunches so far count towards this universe', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v18.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.stats.crunchesCycle).toBe(2);
    expect(state.eternity.upgrades).toEqual(['et.forge', 'et.nova']);
    expect(state.echoes.engines['echo.mote']).toBe(1);
    expect(state.settings.soundtrack).toBe('nebula');
    expect(state.multiverse).toEqual({ tree: {}, rules: [], next: [], storySeen: false });
  });

  it('round-trips Spark choices, the rules and the story flag', () => {
    const s = ready();
    s.multiverse = { tree: { 'mv.stardust.keep': 1, 'mv.crunch.echo.0': 3 }, rules: ['dim'], next: ['cold', 'faint'], storySeen: true };
    s.constants['omni.luck'] = 5_000_000;
    const c = clone(s);
    expect(c.multiverse).toEqual(s.multiverse);
    expect(c.constants['omni.luck']).toBe(5_000_000);
  });
});
