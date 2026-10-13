import { manual } from './manual';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BALANCE } from '../../src/content/balance';
import { RUNE_BY_ID } from '../../src/content/runes';
import { SINGULARITY_TREE } from '../../src/content/singularityTree';
import { D } from '../../src/engine/decimal';
import { milestoneReached, performReset } from '../../src/engine/layers';
import { effLog10 } from '../../src/engine/odds';
import { simulateElapsed } from '../../src/engine/offline';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { breakdown, invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { bhStage, feedDarkMatter, feedReactor, moveBoundary, normalizeShares, reactorMult, setDustShare, setShare } from '../../src/engine/systems/blackhole';
import { nebulaReady } from '../../src/engine/systems/nebula';
import { runeEffLog } from '../../src/engine/systems/runes';
import { buyKey, singularityGain, singularityReady, singularityTree } from '../../src/engine/systems/singularity';
import { buyEngine } from '../../src/engine/systems/stardust';
import { gameSpeed, tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

/** A player at Nebula milestone 8 with the key and a big Essence run. */
function player(seed = 41): GameState {
  const s = createInitialState(12_000_000, seed);
  s.tier = 3;
  s.stats.supernovasAll = 300;
  s.stats.nebulas = 8;
  s.stats.nebulasAll = 8;
  s.stats.nebulasBest = 8;
  s.forge.on = false;
  s.singularity.key = true;
  gain(s, 'essence', D('1e94'));
  invalidateStats();
  return manual(s);
}

function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

describe('the Singularity', () => {
  it('needs the key and (1.4.0) 1e40 Essence this run; gives floor(1.05^(log10 NE - 6)) x Dark Matter gain', () => {
    const s = player();
    expect(singularityGain(s).toNumber()).toBe(Math.floor(1.05 ** 88 * stat(s, 'darkMatterGain').toNumber()));
    expect(singularityReady(s)).toBe(true);
    s.singularity.key = false;
    expect(singularityReady(s)).toBe(false);
    const small = createInitialState(1, 1);
    small.singularity.key = true;
    gain(small, 'essence', D('9.9e39'));
    expect(singularityReady(small)).toBe(false);
    gain(small, 'essence', D('1e38'));
    invalidateStats();
    expect(singularityGain(small).toNumber()).toBe(Math.floor(1.05 ** 34 * stat(small, 'darkMatterGain').toNumber()));
  });

  it('the Event Horizon key costs Embers and is on sale from Nebula milestone 8', () => {
    const s = createInitialState(2, 2);
    gain(s, 'embers', D(BALANCE.singularity.keyEmbers));
    expect(buyKey(s)).toBe(false);
    s.stats.nebulas = 8;
    expect(buyKey(s)).toBe(true);
    expect(cur(s, 'embers').toNumber()).toBe(0);
    expect(s.singularity.key).toBe(true);
    expect(buyKey(s)).toBe(false);
  });

  it('resets the Nebula layer and keeps collections; the same state always gives the same result', () => {
    const s = player();
    s.nebulaTree = { nroot: 1 };
    s.constants['nebula.speed'] = 5;
    s.constants['stellar.gravity'] = 9;
    s.spectral.energy = { red: D(1e9) };
    s.runes.copies['dust.0'] = D(77);
    s.tarot.owned = ['card.sun'];
    s.wyrms.stacks['wyrm.ashling|0|'] = D(3);
    s.relics.levels.anvil = 4;
    const twin = clone(s);
    const g = performReset(s, 'singularity')!;
    performReset(twin, 'singularity');
    expect(exportSave(s).ok && JSON.stringify(s.currencies)).toBe(JSON.stringify(twin.currencies));
    expect(cur(s, 'darkMatter').eq(g)).toBe(true);
    expect(cur(s, 'essence').toNumber()).toBe(0);
    expect(s.nebulaTree).toEqual({});
    expect(s.constants['nebula.speed']).toBe(0);
    expect(s.constants['stellar.gravity']).toBe(0);
    expect(s.spectral.energy).toEqual({});
    expect(s.stats.nebulas).toBe(0);
    expect(s.stats.singularitiesAll).toBe(1);
    expect(s.runes.copies['dust.0']!.toNumber()).toBe(77);
    expect(s.tarot.owned).toEqual(['card.sun']);
    expect(s.wyrms.stacks['wyrm.ashling|0|']!.toNumber()).toBe(3);
    expect(s.relics.levels.anvil).toBe(4);
    expect(s.singularity.key).toBe(true);
    // the first Singularity keeps Nebula milestones
    expect(milestoneReached(s, 'nebula', 'keepTree')).toBe(true);
  });

  it('milestone 3 keeps the Nebula Tree; milestone 10 makes a Nebula reset nothing and trickles its gain', () => {
    const s = player();
    s.stats.singularities = 3;
    s.nebulaTree = { nroot: 1 };
    performReset(s, 'singularity');
    expect(s.nebulaTree).toEqual({ nroot: 1 });
    const t = player();
    t.stats.singularities = 10;
    t.stats.supernovas = 30;
    t.totals.run.shards = D(1e9);
    t.novaTree = { root: 1 };
    invalidateStats();
    expect(nebulaReady(t)).toBe(true);
    performReset(t, 'nebula');
    expect(t.novaTree).toEqual({ root: 1 });
    expect(t.stats.supernovas).toBe(30);
    // the run's shards still start over, so the same shards can't pay twice (an auto-Nebula every tick)
    expect(t.totals.run.shards!.toNumber()).toBe(0);
    expect(performReset(t, 'nebula')).toBeNull();
    // 1/50 of the gain a second once shards come in again (measured from zero: next to 1e94 a trickle is lost to rounding)
    t.totals.run.shards = D(1e9);
    t.currencies.essence = D(0);
    tick(t, 1);
    expect(cur(t, 'essence').toNumber()).toBeGreaterThan(0);
  });

  it('auto-Nebula (milestone 2) goes Nebula once the gain reaches your number', () => {
    const s = player();
    s.stats.singularities = 2;
    s.stats.supernovas = 30;
    s.totals.run.shards = D(1e9);
    s.singularity.autoAt = D(2);
    tick(s, 0.05);
    expect(s.stats.nebulasAll).toBe(9);
  });
});

describe('game speed', () => {
  it('a minute away and a minute played move the game the same amount', () => {
    const make = () => {
      const s = createInitialState(5_000, 7);
      s.stats.singularitiesAll = 1;
      s.blackHole.mass = D(1e6);
      gain(s, 'stardust', D(1e6));
      buyEngine(s, 'mote', 20);
      invalidateStats();
      return manual(s);
    };
    const online = make();
    const away = make();
    // log10(1e6) x 0.04, plus the pink stage's +0.1 (1e6 mass is stage 7)
    expect(gameSpeed(online)).toBeCloseTo(1 + 0.04 * 6 + 0.1, 6);
    for (let i = 0; i < 60 * 20; i++) tick(online, 0.05);
    simulateElapsed(away, 60, { cap: 1e9, efficiency: 1, offline: true });
    expect(online.playtime).toBeCloseTo(60 * gameSpeed(online), 3);
    expect(away.playtime).toBeCloseTo(online.playtime, 3);
    const a = online.totals.all.stardust!.toNumber();
    const b = away.totals.all.stardust!.toNumber();
    expect(Math.abs(a - b) / a).toBeLessThan(0.01);
  });
});

describe('the Prism Wheel', () => {
  it('its shares always add up to exactly its limit, whatever you drag', () => {
    const s = player();
    const L = BALANCE.blackHole.wheelLimit;
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2000; i++) {
      if (rnd() < 0.5) moveBoundary(s, Math.floor(rnd() * 8), (rnd() - 0.5) * 0.6);
      else setShare(s, Math.floor(rnd() * 8), rnd());
      const sum = s.wheel.shares.reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - L)).toBeLessThan(1e-12);
      expect(Math.min(...s.wheel.shares)).toBeGreaterThanOrEqual(0);
      expect(s.wheel.shares).toHaveLength(8);
    }
    expect(normalizeShares([0, 0, 0, 0, 0, 0, 0, 0]).reduce((a, b) => a + b, 0)).toBeCloseTo(L, 12);
  });

  it('while on, it splits that share of each Singularity into its banks', () => {
    const s = player();
    s.stats.singularitiesAll = 1;
    s.blackHole.mass = D(1e7);
    expect(bhStage(s)).toBe(8);
    s.wheel.on = true;
    setShare(s, 0, 0.4);
    const g = performReset(s, 'singularity')!;
    expect(cur(s, 'darkMatter').toNumber()).toBeCloseTo(g.toNumber() * (1 - BALANCE.blackHole.wheelLimit), 6);
    const total = Object.values(s.wheel.banks).reduce((t, b) => t + b.toNumber(), 0);
    expect(total).toBeCloseTo(g.toNumber() * BALANCE.blackHole.wheelLimit, 6);
    expect(s.wheel.banks.red!.toNumber()).toBeCloseTo(g.toNumber() * 0.4, 6);
    invalidateStats();
    expect(breakdown(s, 'productionMult').some((l) => l.label === 'Prism Wheel: Stardust')).toBe(true);
  });
});

describe('Luck Root, the Black Hole and the Reactor', () => {
  it('Luck Root matches the worked examples, and the tree and the violet stage raise it to about 1.5', () => {
    expect(10 ** effLog10(Math.log10(625e9), 1, 10)).toBeCloseTo(15.1, 1);
    expect(10 ** effLog10(Math.log10(200), 1, 10)).toBe(10);
    expect(10 ** effLog10(Math.log10(6.67), 1, 10)).toBeCloseTo(6.67, 9);
    const s = player();
    s.stats.singularitiesAll = 1;
    for (const n of SINGULARITY_TREE) if ('stat' in n.effect && n.effect.stat === 'luckRoot') s.singularityTree[n.id] = 1;
    invalidateStats();
    expect(stat(s, 'luckRoot').toNumber()).toBeCloseTo(1.5, 9);
    s.blackHole.mass = D(100);
    invalidateStats();
    expect(stat(s, 'luckRoot').toNumber()).toBeCloseTo(1.6, 9);
    // a rune's odds use it: 1 in 1e18 at root 1.6 with no luck
    const r = RUNE_BY_ID.get('dust.12')!;
    expect(runeEffLog(s, r, 1)).toBeCloseTo(Math.max(1, r.log10 / 1.6), 9);
  });

  it('the Black Hole passes a stage at each power of ten; feeding Stardust costs that share of production', () => {
    const s = player();
    s.stats.singularitiesAll = 1;
    expect(bhStage(s)).toBe(0);
    s.blackHole.mass = D(0.999);
    expect(bhStage(s)).toBe(0);
    s.blackHole.mass = D(1);
    expect(bhStage(s)).toBe(1);
    s.blackHole.mass = D(999_999);
    expect(bhStage(s)).toBe(6);
    s.blackHole.mass = D(1e6);
    expect(bhStage(s)).toBe(7);
    gain(s, 'darkMatter', D(50));
    s.settings.buyAmount = 10;
    const m = s.blackHole.mass;
    expect(feedDarkMatter(s)).toBe(true);
    expect(s.blackHole.mass.sub(m).toNumber()).toBeCloseTo(10 * 10 * stat(s, 'massGain').toNumber(), 6);
    setDustShare(s, 0.9);
    expect(s.blackHole.dustShare).toBe(0.5);
    invalidateStats();
    expect(breakdown(s, 'productionMult').find((l) => l.label === 'Fed to the Black Hole')?.value.toNumber()).toBe(0.5);
  });

  it('the Reactor turns fed Dark Matter into a lasting Dark Matter multiplier', () => {
    const s = player();
    s.stats.singularitiesAll = 5;
    gain(s, 'darkMatter', D(1000));
    s.settings.buyAmount = 'max';
    expect(feedReactor(s)).toBe(true);
    expect(cur(s, 'darkMatter').toNumber()).toBe(0);
    expect(reactorMult(s).toNumber()).toBeCloseTo(1001 ** 0.15, 9);
    invalidateStats();
    expect(breakdown(s, 'darkMatterGain').find((l) => l.label === 'Dark Matter Reactor')?.value.toNumber()).toBeCloseTo(1001 ** 0.15, 9);
  });

  it('the Singularity Tree has 101 nodes (1.4.5); capstones need both parents', () => {
    // 1.4.5: plus the Nebula Constant Engine
    expect(SINGULARITY_TREE).toHaveLength(101);
    expect(new Set(SINGULARITY_TREE.map((n) => n.id)).size).toBe(101);
    const s = player();
    s.stats.singularitiesAll = 1;
    gain(s, 'darkMatter', D('1e30'));
    expect(singularityTree.buy(s, 'score')).toBe(true);
    const cap = SINGULARITY_TREE.find((n) => n.id === 'scap.horizon')!;
    s.singularityTree[cap.parents[0]!] = 1;
    expect(singularityTree.reachable(s, cap)).toBe(false);
    s.singularityTree[cap.parents[1]!] = 1;
    expect(singularityTree.reachable(s, cap)).toBe(true);
  });
});

describe('save version 13', () => {
  it('loads a real version 12 save', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v12.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.stats.nebulasAll).toBe(9);
    expect(state.stats.nebulasBest).toBe(9);
    expect(state.tarot.deck.slice(0, 2)).toEqual(['card.ace.dust', 'card.mirror']);
    expect(state.spectral.focus).toBe('orange');
    expect(state.singularity).toMatchObject({ key: false });
    expect(state.blackHole.mass.toNumber()).toBe(0);
    expect(state.wheel.shares).toHaveLength(8);
  });

  it('round-trips the Singularity, Black Hole, wheel and Reactor', () => {
    const s = player();
    s.singularityTree = { score: 1 };
    s.blackHole = { mass: D('1e7'), dustShare: 0.25 };
    s.wheel = { on: true, shares: normalizeShares([1, 2, 3, 4, 5, 6, 7, 8]), banks: { red: D(12) } };
    s.reactor.charge = D(99);
    s.singularity.autoAt = D(5);
    const c = clone(s);
    expect(c.singularityTree).toEqual({ score: 1 });
    expect(c.blackHole.mass.eq(1e7)).toBe(true);
    expect(c.blackHole.dustShare).toBe(0.25);
    expect(c.wheel.on).toBe(true);
    expect(c.wheel.shares.reduce((a, b) => a + b, 0)).toBeCloseTo(0.8, 12);
    expect(c.wheel.banks.red!.toNumber()).toBe(12);
    expect(c.reactor.charge.toNumber()).toBe(99);
    expect(c.singularity).toMatchObject({ key: true });
  });
});
