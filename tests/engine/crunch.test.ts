import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BALANCE } from '../../src/content/balance';
import { ECHO_ENGINES, ETERNITY_UPGRADES } from '../../src/content/crunch';
import { GALACTIC_TREE, GALAXIES } from '../../src/content/galactic';
import { RUNES } from '../../src/content/runes';
import { maxBuy } from '../../src/engine/cost';
import { D } from '../../src/engine/decimal';
import { events, type GameEvent } from '../../src/engine/events';
import { milestoneReached, performReset } from '../../src/engine/layers';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { breakdown, invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { AUTO_BUYERS, autoUnlocked } from '../../src/engine/systems/automation';
import { crunchGain, crunchReady, galaxiesNeeded, nextChrononAt } from '../../src/engine/systems/crunch';
import { ECHO_BOARD, echoNebulaGain, echoNovaGain, echoTap } from '../../src/engine/systems/echoes';
import { buyEternity, eternityAuto, setEternityAuto } from '../../src/engine/systems/eternity';
import { galacticReady } from '../../src/engine/systems/galactic';
import { shrineState } from '../../src/engine/systems/runes';
import { tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

const EXPLORED = ['milkyway', 'spiral', 'elliptical', 'ring', 'dwarf', 'quasar', 'lenticular'];

/** A player with 7 galaxies explored and a Crunch run's worth of Galaxy Cores. */
function ready(seed = 7): GameState {
  const s = createInitialState(40_000_000, seed);
  s.forge.on = false;
  s.stats.galactics = 9;
  s.stats.galacticsAll = 9;
  s.stats.galacticsBest = 9;
  s.stats.singularitiesAll = 120;
  s.stats.nebulasAll = 400;
  s.galactic = { galaxy: 'lenticular', next: 'starburst', cleared: [...EXPLORED], autoAt: D(0) };
  s.galacticTree = { 'gal.core': 1 };
  s.constants['gal.expansion'] = 4;
  s.megastructures = { dyson: 2 };
  s.starChart = { 'chart.root': 1 };
  s.wormholes.links = [{ from: 'ore', to: 'darkmatter', share: 0.5 }];
  s.mirror.upgrades = ['mu.spark', 'mu.key'];
  s.mirror.depth = 11;
  s.blackHole.mass = D(2e7);
  gain(s, 'galaxyCores', D(20_000));
  gain(s, 'darkMatter', D(1e12));
  invalidateStats();
  return s;
}

function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

/** Everything a fresh post-Crunch player has, with Eternity open. */
function crunched(seed = 11): GameState {
  const s = createInitialState(50_000_000, seed);
  s.forge.on = false;
  s.stats.crunches = 1;
  s.stats.crunchesAll = 1;
  invalidateStats();
  return s;
}

describe('the Big Crunch', () => {
  it('needs 7 galaxies explored; gives floor((log10(GC / 10) + 1)^1.5) x Chronon gain', () => {
    const s = ready();
    const expected = Math.floor((Math.log10(20_000 / 10) + 1) ** 1.5 * stat(s, 'chrononGain').toNumber());
    expect(crunchGain(s).toNumber()).toBe(expected);
    expect(expected).toBeGreaterThanOrEqual(5);
    expect(crunchReady(s)).toBe(true);
    s.galactic.cleared.pop();
    expect(crunchReady(s)).toBe(false);
    const poor = ready();
    poor.totals.run.galaxyCores = D(9);
    expect(crunchGain(poor).toNumber()).toBe(0);
    // "next Chronon at": exactly where the gain steps up
    const at = nextChrononAt(s);
    const t = ready();
    t.totals.run.galaxyCores = at.mul(1.0001);
    expect(crunchGain(t).toNumber()).toBe(expected + 1);
  });

  it('resets the Galactic layer and below; keeps megastructures, colonies, the Chart, wormholes and collections', () => {
    const s = ready();
    s.runes.copies['dust.0'] = D(77);
    s.echoes.engines = { 'echo.mote': 3 };
    const sky = s.observatory.seed;
    const got = performReset(s, 'crunch')!;
    expect(cur(s, 'chronons').eq(got)).toBe(true);
    expect(cur(s, 'galaxyCores').toNumber()).toBe(0);
    expect(cur(s, 'darkMatter').toNumber()).toBe(0);
    expect(s.totals.run.galaxyCores!.toNumber()).toBe(0);
    expect(s.galactic).toMatchObject({ galaxy: 'milkyway', next: 'milkyway', cleared: [] });
    expect(s.galacticTree).toEqual({});
    expect(s.constants['gal.expansion']).toBe(0);
    expect(s.stats.galactics).toBe(0);
    expect(s.stats.galacticsAll).toBe(9);
    expect(s.blackHole.mass.toNumber()).toBe(0);
    expect(s.mirror.upgrades).toEqual(['mu.key']);
    // kept
    expect(s.megastructures).toEqual({ dyson: 2 });
    expect(s.starChart).toEqual({ 'chart.root': 1 });
    expect(s.wormholes.links).toHaveLength(1);
    expect(s.runes.copies['dust.0']!.toNumber()).toBe(77);
    expect(s.echoes.engines).toEqual({ 'echo.mote': 3 });
    expect(s.stats.crunchesAll).toBe(1);
    expect(s.observatory.seed).not.toBe(sky);
    // milestone 1 keeps the Galactic milestones, up to your best count (9 here)
    expect(milestoneReached(s, 'galactic', 'crunch')).toBe(true);
    expect(milestoneReached(s, 'galactic', 'singularityFree')).toBe(false);
  });

  it('each Big Crunch in a universe needs two more galaxies explored, up to all 20', () => {
    const s = ready();
    expect(galaxiesNeeded(s)).toBe(7);
    performReset(s, 'crunch');
    expect(s.stats.crunchesCycle).toBe(1);
    expect(galaxiesNeeded(s)).toBe(9);
    s.galactic.cleared = GALAXIES.slice(0, 8).map((g) => g.id);
    s.totals.run.galaxyCores = D(1000);
    expect(crunchReady(s)).toBe(false);
    s.galactic.cleared = GALAXIES.slice(0, 9).map((g) => g.id);
    expect(crunchReady(s)).toBe(true);
    s.stats.crunchesCycle = 50;
    expect(galaxiesNeeded(s)).toBe(20);
  });

  it('milestones 3 and 5 keep the Galactic Tree and Galactic Constants', () => {
    const s = ready();
    s.stats.crunches = 5;
    performReset(s, 'crunch');
    expect(s.galacticTree).toEqual({ 'gal.core': 1 });
    expect(s.constants['gal.expansion']).toBe(4);
  });

  it("every currency below starts again, even with a kept tree's \"keep some Dark Matter\" node", () => {
    const s = ready();
    s.stats.crunches = 3;
    const reserve = GALACTIC_TREE.find((n) => 'flag' in n.effect && n.effect.flag === 'keepDarkMatter')!;
    s.galacticTree = { 'gal.core': 1, [reserve.id]: 1 };
    gain(s, 'essence', D('1e50'));
    gain(s, 'shards', D('1e30'));
    performReset(s, 'crunch');
    expect(s.galacticTree[reserve.id]).toBe(1);
    for (const c of ['galaxyCores', 'darkMatter', 'essence', 'shards', 'stardust']) expect(cur(s, c).toNumber()).toBe(0);
  });

  it('lifetime Chronons multiply Galaxy Cores by (1 + Chronons)^0.5', () => {
    const s = ready();
    const before = stat(s, 'galaxyCoreGain');
    gain(s, 'chronons', D(15));
    invalidateStats();
    expect(stat(s, 'galaxyCoreGain').div(before).toNumber()).toBeCloseTo(4, 6);
    expect(breakdown(s, 'galaxyCoreGain').map((l) => l.label)).toContain('Chronons (lifetime)');
  });

  it('milestone 10: a Galactic Rebirth resets nothing, pays once for its Dark Matter, and trickles 1/50 a second', () => {
    const s = ready();
    s.stats.crunches = 10;
    s.galactic.galaxy = 'milkyway';
    s.totals.run.darkMatter = D(1.6e9);
    s.singularityTree = { score: 1 };
    invalidateStats();
    expect(galacticReady(s)).toBe(true);
    performReset(s, 'galactic');
    expect(s.singularityTree).toEqual({ score: 1 });
    expect(s.blackHole.mass.toNumber()).toBe(2e7);
    expect(s.totals.run.darkMatter!.toNumber()).toBe(0);
    expect(performReset(s, 'galactic')).toBeNull();
    s.totals.run.darkMatter = D(1.6e9);
    s.currencies.galaxyCores = D(0);
    invalidateStats();
    tick(s, 1);
    expect(cur(s, 'galaxyCores').toNumber()).toBeGreaterThan(0);
  });

  it('fully levelled Void, Galactic and Eternal shrines stay modest on the late currencies (found by the simulator)', () => {
    const s = ready();
    const before = { dm: stat(s, 'darkMatterGain'), gc: stat(s, 'galaxyCoreGain'), ch: stat(s, 'chrononGain') };
    for (const r of RUNES) if (['void', 'galactic', 'eternal'].includes(r.shrine)) s.runes.copies[r.id] = D('1e30');
    invalidateStats();
    expect(stat(s, 'darkMatterGain').div(before.dm).toNumber()).toBeLessThan(1e3 ** 2);
    expect(stat(s, 'galaxyCoreGain').div(before.gc).toNumber()).toBeLessThan(30 ** 3);
    expect(stat(s, 'chrononGain').div(before.ch).toNumber()).toBeLessThan(5 ** 3);
    // Stardust-sized stats keep their full strength
    expect(stat(s, 'productionMult').log10().toNumber()).toBeGreaterThan(29);
  });

  it('"as a power" constants stop at their caps, so Cores can never compound their own exponent (found by the simulator)', () => {
    const at = (arms: number) => {
      const s = ready();
      s.constants['gal.arms'] = arms;
      invalidateStats();
      return stat(s, 'galaxyCoreGain');
    };
    // Arms at 50 levels already reaches x2 (1 + 0.02 x 50); a thousand levels gives no more
    expect(at(1000).eq(at(50))).toBe(true);
    expect(at(50).gt(at(0))).toBe(true);
  });

  it('a free Singularity also pays only once for the same Essence', () => {
    const s = ready();
    s.stats.galactics = 10;
    s.singularity.key = true;
    s.totals.run.essence = D('1e94');
    invalidateStats();
    expect(performReset(s, 'singularity')).not.toBeNull();
    expect(s.totals.run.essence!.toNumber()).toBe(0);
    expect(performReset(s, 'singularity')).toBeNull();
  });
});

describe('the Echo boards', () => {
  it('open with the first Big Crunch: five engines bought with Echo Dust, and a star to tap', () => {
    const closed = createInitialState(1, 1);
    expect(ECHO_BOARD.buy(closed, 'echo.mote', 1)).toBe(false);
    const s = crunched();
    expect(ECHO_ENGINES).toHaveLength(5);
    expect(echoTap(s).gt(0)).toBe(true);
    gain(s, 'echoDust', D(1000));
    expect(ECHO_BOARD.buy(s, 'echo.mote', 10)).toBe(true);
    expect(ECHO_BOARD.buy(s, 'echo.mill', 1)).toBe(true);
    invalidateStats();
    // 10 motes double their output (the first milestone)
    expect(ECHO_BOARD.each(s, 'echo.mote').toNumber()).toBe(2);
    const dust = cur(s, 'echoDust');
    tick(s, 1);
    expect(cur(s, 'echoDust').gt(dust)).toBe(true);
  });

  it('Echo Supernova at 1e6 Echo Dust, Echo Nebula at 100 Echo Shards, each resetting what it should', () => {
    const s = crunched();
    s.echoes.engines = { 'echo.mote': 30 };
    gain(s, 'echoDust', D(4e6));
    expect(echoNovaGain(s).toNumber()).toBe(2);
    expect(performReset(s, 'echoNova')!.toNumber()).toBe(2);
    expect(s.echoes.engines).toEqual({});
    expect(cur(s, 'echoDust').toNumber()).toBe(0);
    // 2 from the Echo Supernova + 98 = 100 this echo run
    gain(s, 'echoShards', D(98));
    expect(echoNebulaGain(s).toNumber()).toBe(1);
    performReset(s, 'echoNebula');
    expect(cur(s, 'echoShards').toNumber()).toBe(0);
    expect(cur(s, 'echoEssence').toNumber()).toBe(1);
    // Echo Essence multiplies the next Echo Supernova's shards, by 1 + log10(1 + Essence)
    gain(s, 'echoEssence', D(98));
    gain(s, 'echoDust', D(4e6));
    expect(echoNovaGain(s).toNumber()).toBe(Math.floor(2 * (1 + Math.log10(100))));
  });

  it('lifetime echo currencies boost the real game, in the breakdowns', () => {
    const s = crunched();
    const dust = stat(s, 'productionMult');
    gain(s, 'echoDust', D(1e20));
    gain(s, 'echoEssence', D(80));
    invalidateStats();
    expect(stat(s, 'productionMult').div(dust).toNumber()).toBeCloseTo(10, 3);
    expect(breakdown(s, 'essenceGain').map((l) => l.label)).toContain('Echo Essence (lifetime)');
    expect(breakdown(s, 'chrononGain').map((l) => l.label)).toContain('Echo Essence (lifetime)');
  });

  it("an echo reset never ends a Trial, and is never announced as a big reset's cinematic", () => {
    const s = crunched();
    s.trials.active = ['dim'];
    gain(s, 'echoDust', D(1e6));
    const seen: GameEvent[] = [];
    const off = events.on((e) => seen.push(e));
    performReset(s, 'echoNova');
    off();
    expect(s.trials.active).toEqual(['dim']);
    expect(seen.some((e) => e.t === 'reset' && e.layer === 'echoNova')).toBe(true);
  });

  it('never run away: two hours of buying every echo engine with auto echo resets stays modest (found by the simulator)', () => {
    const s = crunched();
    s.stats.crunches = 2;
    s.eternity.upgrades = ['et.echoes'];
    invalidateStats();
    for (let t = 0; t < 7200; t++) {
      for (const e of [...ECHO_ENGINES].reverse()) {
        const n = maxBuy(ECHO_BOARD.curve(e.id), ECHO_BOARD.owned(s, e.id), cur(s, 'echoDust').div(stat(s, 'echoCostMult')));
        if (n > 0) ECHO_BOARD.buy(s, e.id, n);
      }
      echoTap(s);
      tick(s, 1);
    }
    expect(s.stats.echoNovas ?? 0).toBeGreaterThan(5);
    // the first draft reached e235,000 within minutes; the log-scale boosts keep it to tens of orders
    expect(s.totals.all.echoDust!.log10().toNumber()).toBeLessThan(60);
  });

  it('Crunch milestone 2: echo resets go off by themselves once they at least double what you hold', () => {
    const s = crunched();
    s.stats.crunches = 2;
    gain(s, 'echoDust', D(1e6));
    tick(s, 0.05);
    expect(s.stats.echoNovas).toBe(1);
  });
});

describe('Eternity', () => {
  it('upgrades cost Chronons, once each, and their boosts show in the breakdowns', () => {
    const s = crunched();
    expect(buyEternity(s, 'et.arrow')).toBe(false);
    gain(s, 'chronons', D(4));
    const before = stat(s, 'chrononGain');
    expect(buyEternity(s, 'et.arrow')).toBe(true);
    expect(cur(s, 'chronons').toNumber()).toBe(0);
    expect(buyEternity(s, 'et.arrow')).toBe(false);
    invalidateStats();
    expect(stat(s, 'chrononGain').div(before).toNumber()).toBe(2);
    expect(breakdown(s, 'chrononGain').map((l) => l.label)).toContain('Arrow of Time (Eternity)');
    expect(ETERNITY_UPGRADES.reduce((a, u) => a + u.cost, 0)).toBe(54);
  });

  it('False Dawn starts every Crunch run with three galaxies explored', () => {
    const s = ready();
    s.eternity.upgrades = ['et.dawn'];
    performReset(s, 'crunch');
    expect(s.galactic.cleared).toEqual(['milkyway', 'spiral', 'elliptical']);
    expect(s.stats.galaxiesCleared).toBe(3);
  });

  it('Eternal Forge unlocks every Stardust auto-buyer from the start, and switching Stardust off takes them back', () => {
    // the tree auto-buyers (1.2.0) are earned by their own counts, not by Eternity
    const stardust = AUTO_BUYERS.filter((a) => !a.req);
    const s = crunched();
    expect(stardust.every((a) => autoUnlocked(s, a))).toBe(false);
    s.eternity.upgrades = ['et.forge'];
    expect(stardust.every((a) => autoUnlocked(s, a))).toBe(true);
    setEternityAuto(s, 'stardust', { on: false });
    expect(stardust.every((a) => autoUnlocked(s, a))).toBe(false);
  });

  it('with every automation upgrade, each layer resets by itself and buys from its own tree', () => {
    const auto = ['et.forge', 'et.nova', 'et.mist', 'et.void', 'et.galaxy'];
    // Supernova
    const a = crunched();
    a.eternity.upgrades = [...auto];
    a.tier = BALANCE.supernova.tier;
    gain(a, 'stardust', D(1e9));
    tick(a, 1.01);
    expect(a.stats.supernovasAll).toBe(1);
    expect(Object.keys(a.novaTree).length).toBeGreaterThan(0);
    // Nebula (and every shrine you haven't used starts rolling, never the Eternal Shrine)
    const b = crunched();
    b.eternity.upgrades = [...auto];
    b.stats.supernovas = 30;
    b.stats.supernovasAll = 300;
    b.stats.nebulasAll = 1;
    gain(b, 'shards', D(1e9));
    gain(b, 'chronons', D(1));
    tick(b, 1.01);
    expect(b.stats.nebulasAll).toBe(2);
    expect(Object.keys(b.nebulaTree).length).toBeGreaterThan(0);
    expect(shrineState(b, 'dust').auto).toBe(true);
    expect(shrineState(b, 'eternal').auto).toBe(false);
    // Singularity (the key bought for you)
    const c = crunched();
    c.eternity.upgrades = [...auto];
    c.stats.nebulas = 8;
    c.stats.nebulasAll = 8;
    // (1.3.0: automation never spends the safe tenth, so the key needs a little over its price)
    gain(c, 'embers', D(BALANCE.singularity.keyEmbers).div(0.85));
    gain(c, 'essence', D('1e94'));
    tick(c, 1.01);
    expect(c.singularity.key).toBe(true);
    expect(c.stats.singularitiesAll).toBe(1);
    expect(Object.keys(c.singularityTree).length).toBeGreaterThan(0);
    // Galactic Rebirth, heading for the first galaxy not explored yet
    const d = ready();
    d.stats.crunchesAll = 1;
    d.eternity.upgrades = [...auto];
    d.galactic = { galaxy: 'milkyway', next: 'milkyway', cleared: ['milkyway'], autoAt: D(0) };
    d.totals.run.galaxyCores = D(0);
    d.totals.run.darkMatter = D(1.6e9);
    d.galacticTree = {};
    invalidateStats();
    tick(d, 1.01);
    expect(d.stats.galacticsAll).toBe(10);
    expect(d.galactic.galaxy).toBe('spiral');
    expect(Object.keys(d.galacticTree).length).toBeGreaterThan(0);
  });

  it('never cuts an unfinished Trial short, and "amount" waits for your number', () => {
    const s = crunched();
    s.eternity.upgrades = ['et.nova'];
    s.tier = BALANCE.supernova.tier;
    s.trials.active = ['dim'];
    gain(s, 'stardust', D(1e9));
    tick(s, 1.01);
    expect(s.stats.supernovasAll ?? 0).toBe(0);
    s.trials.active = [];
    setEternityAuto(s, 'supernova', { mode: 'amount', at: D(1e6) });
    expect(eternityAuto(s, 'supernova').mode).toBe('amount');
    tick(s, 1);
    expect(s.stats.supernovasAll ?? 0).toBe(0);
    setEternityAuto(s, 'supernova', { at: D(1) });
    tick(s, 1);
    expect(s.stats.supernovasAll).toBe(1);
  });

  it('"double" also goes once the run\'s gain per second starts to fall, so passive income can never stall it', () => {
    const s = crunched();
    s.eternity.upgrades = ['et.nova'];
    s.tier = BALANCE.supernova.tier;
    s.stats.supernovasAll = 5;
    gain(s, 'stardust', D(1e9));
    // far more shards this run than one Supernova could double: only the slowing gain can trigger it
    s.totals.run.shards = D('1e30');
    for (let t = 0; t < 8; t++) tick(s, 1);
    expect(s.stats.supernovasAll).toBe(5);
    for (let t = 0; t < 8; t++) tick(s, 1);
    expect(s.stats.supernovasAll).toBe(6);
  });

  it('a layer whose reset is free goes as soon as it is ready, however far passive income has run ahead (found by the simulator)', () => {
    const s = crunched();
    s.eternity.upgrades = ['et.nova'];
    s.tier = BALANCE.supernova.tier;
    s.stats.supernovasAll = 5;
    // Nebula milestone 10: a Supernova resets nothing
    Object.assign(s.stats, { nebulas: 10, nebulasAll: 10, nebulasBest: 10 });
    expect(milestoneReached(s, 'nebula', 'novaFree')).toBe(true);
    gain(s, 'stardust', D(1e9));
    // the run's shards dwarf the gain, and the gain is still climbing: neither "double" nor "slowing" would ever fire
    s.totals.run.shards = D('1e300');
    tick(s, 1);
    tick(s, 1);
    expect(s.stats.supernovasAll).toBeGreaterThan(5);
  });

  it('buys quietly: automated purchases are marked auto', () => {
    const s = crunched();
    s.eternity.upgrades = ['et.nova'];
    gain(s, 'shards', D(1e6));
    s.stats.supernovas = 1;
    s.stats.supernovasAll = 1;
    const seen: GameEvent[] = [];
    const off = events.on((e) => seen.push(e));
    tick(s, 1.01);
    off();
    const buys = seen.filter((e) => e.t === 'purchase');
    expect(buys.length).toBeGreaterThan(0);
    expect(buys.every((e) => e.t === 'purchase' && e.auto)).toBe(true);
  });
});

describe('save version 18', () => {
  it('loads a real version 17 save', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v17.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.stats.galacticsAll).toBe(3);
    expect(state.galactic.cleared).toEqual(['milkyway', 'spiral', 'elliptical']);
    expect(state.eternity).toEqual({ upgrades: [], auto: {} });
    expect(state.echoes).toEqual({ engines: {}, ever: {} });
    expect(state.settings.soundtrack).toBe('starlight');
  });

  it('round-trips Eternity and the Echo boards', () => {
    const s = crunched();
    s.eternity.upgrades = ['et.forge', 'et.nova'];
    setEternityAuto(s, 'supernova', { mode: 'amount', at: D('1e40') });
    s.echoes = { engines: { 'echo.mote': 12 }, ever: { 'echo.mote': 40 } };
    const c = clone(s);
    expect(c.eternity.upgrades).toEqual(['et.forge', 'et.nova']);
    expect(c.eternity.auto.supernova!.mode).toBe('amount');
    expect(c.eternity.auto.supernova!.at.eq('1e40')).toBe(true);
    expect(c.echoes).toEqual(s.echoes);
  });
});

describe('quiet automation', () => {
  it("resets made by automation inside a tick are marked auto (no cinematic, toast or chord); the player's own are not", () => {
    const s = crunched();
    s.eternity.upgrades = ['et.nova'];
    s.tier = BALANCE.supernova.tier;
    s.stats.supernovasAll = 5;
    Object.assign(s.stats, { nebulas: 10, nebulasAll: 10, nebulasBest: 10 });
    gain(s, 'stardust', D(1e9));
    const seen: GameEvent[] = [];
    const off = events.on((e) => {
      if (e.t === 'reset') seen.push(e);
    });
    tick(s, 1);
    tick(s, 1);
    gain(s, 'stardust', D(1e9));
    performReset(s, 'supernova');
    off();
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen.slice(0, -1).every((e) => e.t === 'reset' && e.auto)).toBe(true);
    expect((seen[seen.length - 1] as { auto?: boolean }).auto).toBeUndefined();
  });
});
