import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BALANCE } from '../../src/content/balance';
import { NOVA_NODE, NOVA_TREE } from '../../src/content/novaTree';
import { D } from '../../src/engine/decimal';
import { layer, performReset, resetPreview } from '../../src/engine/layers';
import { simulateElapsed } from '../../src/engine/offline';
import { toPlain } from '../../src/engine/save/serialize';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { setAuto } from '../../src/engine/systems/automation';
import { buyNode, nodeCost, treeFlag } from '../../src/engine/systems/novaTree';
import { buyPlanet } from '../../src/engine/systems/orbitals';
import { buyEngine, evolve } from '../../src/engine/systems/stardust';
import { nextShardAt, supernovaGain, supernovaReady } from '../../src/engine/systems/supernova';
import { buyUpgrade } from '../../src/engine/systems/upgrades';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

/** A run that has reached Blue Giant with plenty gathered. */
function readyRun(gathered = 4e8): GameState {
  const s = createInitialState(4_000_000, 21);
  gain(s, 'stardust', D(gathered));
  for (const e of ['mote', 'catcher', 'moonmill', 'drill']) buyEngine(s, e, 20);
  for (let i = 0; i < 3; i++) evolve(s);
  s.stats.taps = 300;
  buyUpgrade(s, 'tap.warm');
  buyPlanet(s, '0.0', 'rocky');
  s.constants['stellar.gravity'] = 40;
  s.buffs.frenzy = s.playtime + 20;
  invalidateStats();
  return s;
}

describe('Supernova', () => {
  it('needs a Blue Giant and 10M gathered this run; the first always gives exactly 3', () => {
    const s = readyRun();
    expect(supernovaReady(s)).toBe(true);
    expect(supernovaGain(s).toNumber()).toBe(BALANCE.supernova.firstGain);
    const low = readyRun(1e6);
    expect(supernovaReady(low)).toBe(false);
    const dwarf = readyRun();
    dwarf.tier = 2;
    expect(supernovaReady(dwarf)).toBe(false);
    // after the first ever: floor((S / 1e7)^gainPow)
    s.stats.supernovas = 1;
    s.stats.supernovasAll = 1;
    const S = s.totals.run.stardust!.toNumber();
    const raw = (S / 1e7) ** BALANCE.supernova.gainPow;
    expect(supernovaGain(s).toNumber()).toBe(Math.floor(raw));
    // "next shard at" is exactly where the gain ticks up
    const next = nextShardAt(s);
    s.totals.run.stardust = next.mul(1.0000001);
    expect(supernovaGain(s).toNumber()).toBe(Math.floor(raw) + 1);
  });

  it('is deterministic: the same state in gives the same state out', () => {
    const a = readyRun();
    const b = clone(a);
    performReset(a, 'supernova');
    performReset(b, 'supernova');
    expect(toPlain(b)).toEqual(toPlain(a));
  });

  it('the confirm screen lists exactly what resets and what is kept', () => {
    const s = readyRun();
    s.stats.supernovas = 8; // milestone: start 2 tiers below best
    s.stats.bestTier = 5;
    s.novaTree = { root: 1, 'dream.1': 1, 'dream.2': 1, 'dream.3': 1, 'dream.4': 1, 'dream.5': 1, 'dream.6': 1, 'dream.7': 1 }; // Keep the Tools
    invalidateStats();
    const p = resetPreview(s, 'supernova')!;
    expect(p.kept.map((k) => k.label)).toContain('Upgrades');
    expect(p.kept.map((k) => k.label)).toContain('Star Tier');
    expect(p.resets).toEqual(expect.arrayContaining(['Stardust', 'Engines', 'Stellar Constants', 'Planets', 'Comet buffs']));
    const before = clone(s);
    performReset(s, 'supernova');
    expect(s.upgrades).toEqual(before.upgrades);
    expect(s.tier).toBe(3);
    expect(s.engines).toEqual({});
    expect(cur(s, 'stardust').toNumber()).toBe(0);
    expect(s.planets).toEqual({});
    expect(s.constants['stellar.gravity']).toBe(0);
    expect(s.buffs).toEqual({});
    // always kept
    expect(s.achievements).toEqual(before.achievements);
    expect(s.enginesEver).toEqual(before.enginesEver);
    expect(s.stats.supernovas).toBe(9);
    expect(cur(s, 'shards').gt(cur(before, 'shards'))).toBe(true);
  });

  it('lifetime shards boost every Stardust gain', () => {
    const s = readyRun();
    const prod = stat(s, 'productionMult').toNumber();
    gain(s, 'shards', D(99));
    invalidateStats();
    const glow = 100 ** BALANCE.supernova.passivePow;
    expect(stat(s, 'productionMult').toNumber()).toBeCloseTo(prod * glow, 6);
    // spending shards never weakens you: the glow counts lifetime shards
    s.currencies.shards = D(0);
    invalidateStats();
    expect(stat(s, 'productionMult').toNumber()).toBeCloseTo(prod * glow, 6);
  });
});

describe('Nova Tree', () => {
  it('has about 80 nodes with real parents and unique IDs', () => {
    expect(NOVA_TREE.length).toBeGreaterThanOrEqual(78);
    expect(new Set(NOVA_TREE.map((n) => n.id)).size).toBe(NOVA_TREE.length);
    for (const n of NOVA_TREE) for (const p of n.parents) expect(NOVA_NODE.has(p)).toBe(true);
    const spots = new Set(NOVA_TREE.map((n) => `${n.x},${n.y}`));
    expect(spots.size).toBe(NOVA_TREE.length);
  });

  it('opens after the first Supernova; picks escalate; repeatables grow; capstones need both arms', () => {
    const s = createInitialState(5_000_000, 3);
    gain(s, 'shards', D('1e40'));
    expect(buyNode(s, 'root')).toBe(false); // the tree opens at 1 Supernova
    s.stats.supernovas = 1;
    expect(buyNode(s, 'root')).toBe(true);
    const strike = NOVA_NODE.get('strike.1')!;
    const before = nodeCost(s, strike).toNumber();
    expect(buyNode(s, 'forge.1')).toBe(true);
    expect(nodeCost(s, strike).toNumber()).toBe(before * 3);
    expect(buyNode(s, 'forge.5')).toBe(false); // not reachable yet
    const cap = NOVA_NODE.get('cap.blaze')!;
    for (const id of cap.parents) expect(buyNode(s, id)).toBe(false);
    // own the path to the end of Forge-heart, but not Starstrike: the capstone stays shut
    const forge = NOVA_TREE.filter((n) => n.arm === 'forge');
    for (let pass = 0; pass < 3; pass++) for (const n of forge) buyNode(s, n.id);
    expect(buyNode(s, 'cap.blaze')).toBe(false);
    const strikeNodes = NOVA_TREE.filter((n) => n.arm === 'strike');
    for (let pass = 0; pass < 3; pass++) for (const n of strikeNodes) buyNode(s, n.id);
    expect(buyNode(s, 'cap.blaze')).toBe(true);
    const echo = NOVA_NODE.get('echo.stellar.a')!;
    const c1 = nodeCost(s, echo).toNumber();
    expect(buyNode(s, echo.id)).toBe(true);
    expect(buyNode(s, echo.id)).toBe(true);
    expect(s.novaTree[echo.id]).toBe(2);
    expect(nodeCost(s, echo).toNumber()).toBeCloseTo(c1 * echo.repeat!.growth ** 2, 6);
    expect(treeFlag(s, 'keepPlanets')).toBe(1);
  });
});

describe('automation', () => {
  it('auto-buyers obey their switches, including while away', () => {
    const s = createInitialState(6_000_000, 8);
    s.stats.supernovas = 3; // Spark Mote auto-buyer
    gain(s, 'stardust', D(1e6));
    setAuto(s, 'auto.mote', { on: false });
    simulateElapsed(s, 600, { cap: 7200, efficiency: 0.5, offline: true });
    expect(s.engines.mote ?? 0).toBe(0);
    setAuto(s, 'auto.mote', { on: true });
    simulateElapsed(s, 600, { cap: 7200, efficiency: 0.5, offline: true });
    expect(s.engines.mote ?? 0).toBeGreaterThan(50);
    expect(s.engines.catcher ?? 0).toBe(0); // engines 2 to 5 come at 5 Supernovas
  });

  it('a spending limit keeps the rest', () => {
    const s = createInitialState(6_000_000, 8);
    s.stats.supernovas = 3;
    gain(s, 'stardust', D(1e6));
    setAuto(s, 'auto.mote', { spend: 0.1 });
    simulateElapsed(s, 1, { cap: 7200, efficiency: 1, offline: true });
    expect(cur(s, 'stardust').toNumber()).toBeGreaterThan(0.89e6);
  });
});

describe('save version 5', () => {
  it('loads and migrates a real version 4 save', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v4.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.tier).toBe(4);
    expect(state.constants['stellar.gravity']).toBe(25);
    expect(Object.keys(state.planets)).toHaveLength(2);
    expect(state.quests.length).toBe(3);
    expect(state.novaTree).toEqual({});
    expect(cur(state, 'shards').toNumber()).toBe(0);
    expect(state.stats.supernovas ?? 0).toBe(0);
    expect(layer('supernova')).toBeDefined();
  });
});
