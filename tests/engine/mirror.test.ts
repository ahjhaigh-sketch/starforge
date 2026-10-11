import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BALANCE } from '../../src/content/balance';
import { ANTIMATTER_ENGINES, MIRROR_DEPTHS, MIRROR_UPGRADES } from '../../src/content/mirror';
import { bulkCost, maxBuy } from '../../src/engine/cost';
import { D } from '../../src/engine/decimal';
import { performReset } from '../../src/engine/layers';
import { simulateElapsed } from '../../src/engine/offline';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { breakdown, invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { buyMirrorUpgrade, collapse, collapsePrice, MIRROR_ENGINES, mirrorKey, mirrorOpen, twinMult } from '../../src/engine/systems/mirror';
import { buyKey } from '../../src/engine/systems/singularity';
import { STARDUST_ENGINES } from '../../src/engine/systems/stardust';
import { closeLink, inputOf, linkCost, openLink, outShare, setLinkShare } from '../../src/engine/systems/wormholes';
import { tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

/** A player with 8 Singularities (the Mirror's milestone). */
function player(singularities = 8, seed = 5): GameState {
  const s = createInitialState(12_000_000, seed);
  s.stats.singularities = singularities;
  s.stats.singularitiesAll = singularities;
  s.stats.nebulasAll = 30;
  s.forge.on = false;
  invalidateStats();
  return s;
}

function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

const labels = (s: GameState, id: string) => breakdown(s, id).map((l) => l.label);

describe('the Mirror runs on the Stardust layer code', () => {
  it('both layers are the one engine kit with different data', () => {
    expect(Object.keys(MIRROR_ENGINES).sort()).toEqual(Object.keys(STARDUST_ENGINES).sort());
    expect(STARDUST_ENGINES.def.engines).toHaveLength(15);
    expect(MIRROR_ENGINES.def.engines).toHaveLength(10);
    // no second copy of the engine code: the Mirror only feeds data to makeEngineLayer
    const src = readFileSync('src/engine/systems/mirror.ts', 'utf8');
    expect(src).toContain('makeEngineLayer(');
    expect(src).not.toMatch(/bulkCost|maxBuy|for \(const e of ANTIMATTER_ENGINES\) \{\s*const n/);
  });

  it('its engines are the top ten Stardust engines in reverse, as twins', () => {
    expect(ANTIMATTER_ENGINES[0]!.twin).toBe('lantern');
    expect(ANTIMATTER_ENGINES[9]!.twin).toBe('sail');
    expect(ANTIMATTER_ENGINES[0]!.name).toBe('Anti-Lantern');
  });
});

describe('the Antimatter Mirror', () => {
  it('opens at Singularity milestone 8, and the anti-star makes 1 Antimatter a second', () => {
    const early = player(7);
    expect(mirrorOpen(early)).toBe(false);
    tick(early, 10);
    expect(cur(early, 'antimatter').toNumber()).toBe(0);
    expect(MIRROR_ENGINES.buy(early, 'am.lantern', 1)).toBe(false);
    const s = player();
    expect(mirrorOpen(s)).toBe(true);
    tick(s, 10);
    expect(cur(s, 'antimatter').toNumber()).toBeCloseTo(10, 6);
  });

  it('inverted rule: milestones slow price growth instead of doubling output', () => {
    const s = player();
    const c = MIRROR_ENGINES.curve('am.lantern');
    // x1.3 for the first 10, x1.25 from 10
    expect(bulkCost(c, 9, 1).div(bulkCost(c, 8, 1)).toNumber()).toBeCloseTo(1.3, 9);
    expect(bulkCost(c, 11, 1).div(bulkCost(c, 10, 1)).toNumber()).toBeCloseTo(1.25, 9);
    expect(bulkCost(c, 2000, 1).div(bulkCost(c, 1999, 1)).toNumber()).toBeCloseTo(1.06, 9);
    // and no output doubling: 10 owned make exactly 10 x base
    gain(s, 'antimatter', D('1e9'));
    expect(MIRROR_ENGINES.buy(s, 'am.lantern', 10)).toBe(true);
    invalidateStats();
    expect(stat(s, 'amEngineMult.am.lantern').toNumber()).toBe(1);
    expect(MIRROR_ENGINES.each(s, 'am.lantern').toNumber()).toBeCloseTo(BALANCE.mirror.engineProdBase, 9);
  });

  it('buying a million levels costs exactly the series sum, and Max never overspends', () => {
    const c = MIRROR_ENGINES.curve('am.foundry');
    const big = bulkCost(c, 0, 1_000_000);
    expect(big.gt(0)).toBe(true);
    const n = maxBuy(c, 0, big);
    expect(n).toBe(1_000_000);
    for (const money of ['1e3', '1e40', '1e300', 'e5000']) {
      const k = maxBuy(c, 37, D(money));
      expect(bulkCost(c, 37, k).lte(money)).toBe(true);
      expect(bulkCost(c, 37, k + 1).gt(money)).toBe(true);
    }
  });

  it('engines reveal in order, and each is boosted by its Stardust twin\'s Mastery rank', () => {
    const s = player();
    gain(s, 'antimatter', D('1e12'));
    expect(MIRROR_ENGINES.buy(s, 'am.foundry', 1)).toBe(false);
    expect(MIRROR_ENGINES.buy(s, 'am.lantern', 1)).toBe(true);
    expect(MIRROR_ENGINES.buy(s, 'am.foundry', 1)).toBe(true);
    expect(twinMult(s, 'lantern')).toBe(1);
    s.enginesEver.lantern = 1e6;
    invalidateStats();
    expect(twinMult(s, 'lantern')).toBeGreaterThan(1);
    expect(labels(s, 'amEngineMult.am.lantern')).toContain('Stardust twin (Mastery)');
  });

  it('collapses down the tiers: 11 steps, each Antimatter x3, priced by formula, scrapping the engines', () => {
    const s = player();
    expect(MIRROR_DEPTHS).toHaveLength(11);
    expect(MIRROR_DEPTHS[0]!.name).toBe('Blazar');
    expect(MIRROR_DEPTHS[10]!.name).toBe('Protostar');
    expect(collapsePrice(s)!.toNumber()).toBe(1000);
    gain(s, 'antimatter', D('1e30'));
    MIRROR_ENGINES.buy(s, 'am.lantern', 12);
    const before = stat(s, 'antimatterMult');
    expect(collapse(s)).toBe(true);
    expect(stat(s, 'antimatterMult').div(before).toNumber()).toBeCloseTo(3, 9);
    // inverted: evolving keeps engines, collapsing scraps them (they stay revealed)
    expect(MIRROR_ENGINES.owned(s, 'am.lantern')).toBe(0);
    expect(s.mirror.ever['am.lantern']).toBe(12);
    expect(MIRROR_ENGINES.revealed(s, 1)).toBe(true);
    for (let i = 0; i < 20; i++) collapse(s);
    expect(s.mirror.depth).toBe(11);
    expect(collapsePrice(s)).toBeNull();
    expect(s.stats.mirrorDepth).toBe(11);
  });

  it('upgrades need their depth; the last is the Mirror Key; Dark Mirror shows in Dark Matter', () => {
    const s = player();
    gain(s, 'antimatter', D('1e40'));
    const key = MIRROR_UPGRADES.find((u) => u.id === 'mu.key')!;
    expect(buyMirrorUpgrade(s, key.id)).toBe(false);
    expect(buyMirrorUpgrade(s, 'mu.dark')).toBe(false); // needs depth 3
    for (let i = 0; i < 3; i++) collapse(s);
    expect(buyMirrorUpgrade(s, 'mu.dark')).toBe(true);
    expect(labels(s, 'darkMatterGain')).toContain('Dark Mirror (Mirror)');
    for (let i = 0; i < 8; i++) collapse(s);
    expect(buyMirrorUpgrade(s, key.id)).toBe(true);
    expect(mirrorKey(s)).toBe(true);
  });

  it('a Singularity never resets the Mirror', () => {
    const s = player();
    gain(s, 'antimatter', D('1e9'));
    collapse(s);
    MIRROR_ENGINES.buy(s, 'am.lantern', 5);
    s.tier = 3;
    s.stats.nebulas = 8;
    s.stats.nebulasAll = 30;
    s.singularity.key = true;
    gain(s, 'embers', D('1e9'));
    buyKey(s);
    gain(s, 'essence', D('1e94'));
    invalidateStats();
    expect(performReset(s, 'singularity')).not.toBeNull();
    expect(s.mirror.engines['am.lantern']).toBe(5);
    expect(s.mirror.depth).toBe(1);
    expect(cur(s, 'antimatter').gt(0)).toBe(true);
  });

  it('time away makes the same Antimatter as time played', () => {
    const a = player();
    const b = player();
    for (const s of [a, b]) {
      gain(s, 'antimatter', D(1e6));
      MIRROR_ENGINES.buy(s, 'am.lantern', 20);
      MIRROR_ENGINES.buy(s, 'am.foundry', 5);
    }
    for (let i = 0; i < 600; i++) tick(a, 1);
    simulateElapsed(b, 600, { cap: Infinity, efficiency: 1, offline: true });
    expect(cur(b, 'antimatter').div(cur(a, 'antimatter')).toNumber()).toBeCloseTo(1, 4);
  });
});

describe('the Wormhole Network', () => {
  it('opens at 6 Singularities; links cost Dark Matter, x10 each', () => {
    const s = player(5);
    gain(s, 'darkMatter', D('1e9'));
    expect(openLink(s, 'ore', 'essence')).toBe(false);
    s.stats.singularitiesAll = 6;
    expect(linkCost(s).toNumber()).toBe(1000);
    expect(openLink(s, 'ore', 'essence')).toBe(true);
    expect(linkCost(s).toNumber()).toBe(10_000);
    expect(openLink(s, 'ore', 'essence')).toBe(false); // already open
    expect(openLink(s, 'ore', 'ore')).toBe(false);
    expect(cur(s, 'darkMatter').toNumber()).toBe(1e9 - 1000);
  });

  it('both ends show in the stat breakdowns, with exact values', () => {
    const s = player();
    gain(s, 'darkMatter', D('1e9'));
    s.upgrades.push('tap.strike1');
    invalidateStats();
    const tapBefore = stat(s, 'tapPower');
    expect(openLink(s, 'taps', 'shards', 0.3)).toBe(true);
    tick(s, 0.05);
    tick(s, 0.05);
    const label = 'Wormhole: Taps to Shards';
    expect(labels(s, 'tapPower')).toContain(label);
    expect(labels(s, 'shardGain')).toContain(label);
    const into = breakdown(s, 'shardGain').find((l) => l.label === label)!;
    expect(into.value.toNumber()).toBeCloseTo(1 + 0.3 * inputOf(s, 'taps'), 9);
    const out = breakdown(s, 'tapPower').find((l) => l.label === label)!;
    expect(out.op).toBe('pow');
    expect(out.value.toNumber()).toBeCloseTo(0.7, 9);
    expect(stat(s, 'tapPower').lte(tapBefore)).toBe(true);
    closeLink(s, 0);
    expect(labels(s, 'shardGain')).not.toContain(label);
  });

  it('at most half of a system leaves it, in 5% steps', () => {
    const s = player();
    gain(s, 'darkMatter', D('1e20'));
    expect(openLink(s, 'stardust', 'essence', 0.4)).toBe(true);
    expect(openLink(s, 'stardust', 'shards', 0.4)).toBe(true);
    expect(outShare(s, 'stardust')).toBeCloseTo(0.5, 9);
    expect(openLink(s, 'stardust', 'ore', 0.2)).toBe(false);
    setLinkShare(s, 0, 0.9);
    expect(s.wormholes.links[0]!.share).toBeCloseTo(0.4, 9);
    setLinkShare(s, 0, 0.123);
    expect(s.wormholes.links[0]!.share).toBeCloseTo(0.1, 9);
  });

  it('a loop of links settles instead of running away', () => {
    const s = player();
    gain(s, 'darkMatter', D('1e20'));
    openLink(s, 'shards', 'essence', 0.5);
    openLink(s, 'essence', 'shards', 0.5);
    for (let i = 0; i < 200; i++) tick(s, 0.05);
    const a = stat(s, 'shardGain').toNumber();
    tick(s, 0.05);
    expect(Number.isFinite(a)).toBe(true);
    expect(stat(s, 'shardGain').toNumber()).toBeCloseTo(a, 6);
  });
});

describe('save version 15', () => {
  it('loads a real version 14 save', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v14.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.trials.levels).toEqual({ dim: 2, notaps: 3 });
    expect(state.spire.floor).toBe(31);
    expect(state.leviathans.kills).toEqual({ calf: 4, humpback: 1 });
    expect(state.mirror).toEqual({ engines: {}, ever: {}, depth: 0, upgrades: [] });
    expect(state.wormholes).toEqual({ links: [] });
  });

  it('round-trips the Mirror and the wormholes', () => {
    const s = player();
    s.mirror = { engines: { 'am.lantern': 12 }, ever: { 'am.lantern': 30 }, depth: 4, upgrades: ['mu.spark'] };
    s.wormholes = { links: [{ from: 'ore', to: 'essence', share: 0.25 }] };
    gain(s, 'antimatter', D('1e20'));
    const c = clone(s);
    expect(c.mirror).toEqual(s.mirror);
    expect(c.wormholes).toEqual(s.wormholes);
    expect(cur(c, 'antimatter').toNumber()).toBe(1e20);
  });
});
