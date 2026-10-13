import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { CONSTANT_BY_ID } from '../../src/content/constants';
import { NEBULA_TREE } from '../../src/content/nebulaTree';
import { RUNES, runesOf, SHRINE_BY_ID } from '../../src/content/runes';
import { D } from '../../src/engine/decimal';
import { milestoneReached, performReset } from '../../src/engine/layers';
import { simulateElapsed } from '../../src/engine/offline';
import { nextPoisson, seedRng } from '../../src/engine/rng';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { breakdown, invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { buyConstant, constantOpen } from '../../src/engine/systems/constants';
import { nebulaGain, nebulaReady } from '../../src/engine/systems/nebula';
import { buyNebulaNode } from '../../src/engine/systems/nebulaTree';
import { autoRoll, effLog10, rollOnce, rollRunes, runeEffLog, runeLevel, runePrice, setShrine, shrineLuck } from '../../src/engine/systems/runes';
import { supernovaGain } from '../../src/engine/systems/supernova';
import { tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

/** A player who has gone Nebula once (the shrines are open). */
function nebulaPlayer(seed = 3): GameState {
  const s = createInitialState(8_000_000, seed);
  s.tier = 3;
  s.stats.supernovas = 0;
  s.stats.supernovasAll = 40;
  s.stats.supernovasBest = 32;
  s.stats.nebulas = 1;
  s.stats.nebulasAll = 1;
  s.forge.on = false;
  // 1.2.0: Auto-Supernova (40 Supernovas) would reset this run: these tests are about other things
  s.auto['auto.supernova'] = { on: false, spend: 1 };
  invalidateStats();
  return s;
}

function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

describe('effective odds (the Math and balance tab cases)', () => {
  it('N = 625 billion, L = 1, R = 10 is about 1 in 15.1', () => {
    expect(10 ** effLog10(Math.log10(625e9), 1, 10)).toBeCloseTo(15.1, 1);
  });
  it('N = 200 at R = 10 hits the floor of 1 in 10', () => {
    expect(10 ** effLog10(Math.log10(200), 1, 10)).toBeCloseTo(10, 9);
  });
  it('N = 6.67 never changes; Anomalies ignore luck', () => {
    expect(10 ** effLog10(Math.log10(6.67), 1e6, 10)).toBeCloseTo(6.67, 9);
    expect(effLog10(5, 1e3, 1, true)).toBe(5);
    expect(10 ** effLog10(Math.log10(1000), 10, 1)).toBeCloseTo(100, 9);
  });
});

describe('rolling runes', () => {
  it('a million rolled runes match the odds', () => {
    const s = nebulaPlayer(11);
    const n = 1_000_000;
    for (let i = 0; i < n / 1000; i++) rollRunes(s, 'dust', D(1000));
    const L = shrineLuck(s, 'dust');
    for (const r of runesOf('dust')) {
      const p = 0.9 * 10 ** -runeEffLog(s, r, L) + 0.1 * 10 ** -runeEffLog(s, r, L * 2);
      const mean = n * p;
      if (mean < 5) continue;
      const got = (s.runes.copies[r.id] ?? D(0)).toNumber();
      expect(Math.abs(got - mean), `${r.name}: ${got} vs ${mean.toFixed(1)}`).toBeLessThan(5 * Math.sqrt(mean) + 1);
    }
  });

  it('the Poisson draw has the right mean and spread', () => {
    const st = seedRng(5);
    for (const lambda of [0.3, 4, 50, 600]) {
      let sum = 0;
      let sq = 0;
      const k = 20_000;
      for (let i = 0; i < k; i++) {
        const x = nextPoisson(st, lambda);
        sum += x;
        sq += x * x;
      }
      const mean = sum / k;
      const variance = sq / k - mean * mean;
      expect(Math.abs(mean - lambda)).toBeLessThan(0.05 * lambda + 0.02);
      expect(Math.abs(variance - lambda)).toBeLessThan(0.1 * lambda + 0.05);
    }
  });

  it('spend per second always equals price x runes rolled, and it never goes negative', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1e12, noNaN: true }), fc.double({ min: 0.01, max: 1, noNaN: true }), fc.double({ min: 0.01, max: 50, noNaN: true }), (money, rate, dt) => {
        const s = nebulaPlayer();
        s.currencies.stardust = D(money);
        setShrine(s, 'dust', { auto: true, rate });
        const before = cur(s, 'stardust');
        const rolledBefore = s.runes.shrines.dust!.rolled;
        const n = autoRoll(s, 'dust', dt);
        const spent = before.sub(cur(s, 'stardust'));
        expect(spent.eq(n.mul(runePrice(s, SHRINE_BY_ID.get('dust')!)))).toBe(true);
        expect(cur(s, 'stardust').gte(0)).toBe(true);
        expect(s.runes.shrines.dust!.rolled.sub(rolledBefore).eq(n)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it('slows to what you can afford instead of going negative', () => {
    const s = nebulaPlayer();
    s.constants['nebula.speed'] = 0;
    s.currencies.stardust = D(3.5e6); // 3 runes at 1M each
    setShrine(s, 'dust', { auto: true });
    s.stats.supernovas = 0;
    s.runes.copies = {};
    // bulk 1 and speed 1: 10 s would want 10 runes
    const n = autoRoll(s, 'dust', 10);
    expect(n.toNumber()).toBe(3);
    expect(cur(s, 'stardust').toNumber()).toBe(0.5e6);
  });

  it('reloading during the welcome-back screen does not change what was rolled', () => {
    const s = nebulaPlayer(21);
    gain(s, 'stardust', D(1e15));
    setShrine(s, 'dust', { auto: true });
    const a = clone(s);
    const b = clone(s);
    simulateElapsed(a, 3600, { cap: 86_400, efficiency: 0.5, offline: true });
    simulateElapsed(b, 3600, { cap: 86_400, efficiency: 0.5, offline: true });
    expect(Object.keys(a.runes.copies).length).toBeGreaterThan(2);
    for (const id of Object.keys(a.runes.copies)) expect(a.runes.copies[id]!.eq(b.runes.copies[id]!)).toBe(true);
  });

  it('RPS above 1e30 rolls instantly, with bulk maths', () => {
    const s = nebulaPlayer();
    const t0 = performance.now();
    rollRunes(s, 'dust', D('1e32'));
    rollRunes(s, 'nova', D('1e35'));
    expect(performance.now() - t0).toBeLessThan(200);
    const common = s.runes.copies['dust.0']!;
    expect(common.div('1e32').toNumber()).toBeCloseTo(0.5, 2);
    invalidateStats();
    expect(stat(s, 'productionMult').gt(0)).toBe(true);
  });

  it('levels are min(cap, floor(sqrt(copies))) and show in the breakdowns', () => {
    const s = nebulaPlayer();
    const common = RUNES.find((r) => r.id === 'dust.0')!;
    s.runes.copies['dust.0'] = D(99);
    expect(runeLevel(s, common)).toBe(9);
    s.runes.copies['dust.0'] = D(1e9);
    expect(runeLevel(s, common)).toBe(500);
    invalidateStats();
    const line = breakdown(s, 'productionMult').find((l) => l.label === 'Runes: Dust Shrine');
    expect(line?.value.toNumber()).toBeCloseTo(1 + 0.02 * 500, 9);
  });

  it('Resonance grows rune multipliers in a straight line and never touches rune powers', () => {
    const s = nebulaPlayer();
    s.runes.copies['dust.0'] = D(1e9);
    s.runes.copies['dust.8'] = D(1e6);
    s.constants['nebula.resonance'] = 200;
    invalidateStats();
    // +2% a level, no doublings: 200 levels is x5, not x5 x 2^n
    expect(stat(s, 'runeEffect').toNumber()).toBeCloseTo(5, 9);
    const lines = breakdown(s, 'productionMult').filter((l) => l.label === 'Runes: Dust Shrine');
    const mul = lines.find((l) => l.op === 'mul')!;
    const pow = lines.find((l) => l.op === 'pow')!;
    expect(mul.value.toNumber()).toBeCloseTo(1 + 0.02 * 500 * 5, 6);
    expect(pow.value.toNumber()).toBeCloseTo(1 + 0.0005 * 20, 9);
  });

  it('a hand roll is one roll of bulk runes; the keep filter only applies to auto-roll', () => {
    const s = nebulaPlayer();
    gain(s, 'stardust', D(1e9));
    setShrine(s, 'dust', { keep: 3 });
    const r = rollOnce(s, 'dust');
    expect(r?.runes.toNumber()).toBe(1);
    expect(cur(s, 'stardust').toNumber()).toBe(1e9 - 1e6);
  });

  it('every shrine has about 20 runes, a hidden one and an Anomaly, with unique ids', () => {
    expect(new Set(RUNES.map((r) => r.id)).size).toBe(RUNES.length);
    for (const sh of ['dust', 'nova', 'nebula', 'forge', 'wyrm', 'void', 'galactic', 'eternal']) {
      const list = runesOf(sh);
      expect(list.length).toBe(21);
      expect(list.filter((r) => r.hidden)).toHaveLength(1);
      expect(list.filter((r) => r.anomaly)).toHaveLength(1);
      expect(Math.max(...list.filter((r) => !r.hidden).map((r) => r.log10))).toBe(36);
      for (const r of list) expect(r.effects.length).toBeGreaterThanOrEqual(1), expect(r.effects.length).toBeLessThanOrEqual(8);
    }
  });
});

describe('the Nebula', () => {
  /** 30 Supernovas this Nebula run, 1e7 shards gathered. */
  function ready(): GameState {
    const s = nebulaPlayer();
    s.stats.supernovas = 30;
    gain(s, 'shards', D(2e7));
    s.novaTree = { root: 1, 'forge.1': 1, 'forge.2': 1 };
    s.relics = { levels: { anvil: 3 }, equipped: ['anvil'] };
    s.codex = { h: 4 };
    s.runes.copies = { 'dust.0': D(50) };
    s.belt.tier = 2;
    s.constants['stellar.gravity'] = 30;
    s.constants['nebula.bulk'] = 4;
    gain(s, 'stardust', D(1e12));
    invalidateStats();
    return s;
  }

  it('needs 30 Supernovas and 10M shards this Nebula run', () => {
    const s = nebulaPlayer();
    gain(s, 'shards', D(2e7));
    expect(nebulaReady(s)).toBe(false);
    s.stats.supernovas = 30;
    expect(nebulaReady(s)).toBe(true);
    s.totals.run.shards = D(9e6);
    expect(nebulaReady(s)).toBe(false);
  });

  it('gives floor((NS / 1e7)^0.35) Essence; the very first gives at least 2 and otherwise the same', () => {
    const s = nebulaPlayer();
    s.stats.nebulasAll = 0;
    s.totals.run.shards = D(1.5e7);
    expect(nebulaGain(s).toNumber()).toBe(2);
    // 1.2.0: a big first run pays for its shards (it used to be a flat 2 whatever you had)
    s.totals.run.shards = D(1.44e23);
    expect(nebulaGain(s).toNumber()).toBe(Math.floor((1.44e16) ** 0.35));
    s.totals.run.shards = D(1e10);
    expect(nebulaGain(s).toNumber()).toBe(Math.floor((1e3) ** 0.35));
    s.stats.nebulasAll = 1;
    expect(nebulaGain(s).toNumber()).toBe(Math.floor((1e3) ** 0.35));
  });

  it('resets the Stardust and Supernova layers and keeps relics, the Codex and runes', () => {
    const s = ready();
    const essence = nebulaGain(s);
    performReset(s, 'nebula');
    expect(cur(s, 'essence').eq(essence)).toBe(true);
    expect(cur(s, 'stardust').toNumber()).toBe(0);
    expect(cur(s, 'shards').toNumber()).toBe(0);
    expect(s.totals.run.shards?.toNumber() ?? 0).toBe(0);
    expect(s.novaTree).toEqual({});
    expect(s.stats.supernovas).toBe(0);
    expect(s.constants['stellar.gravity']).toBe(0);
    expect(s.constants['nebula.bulk']).toBe(4);
    expect(s.relics.levels.anvil).toBe(3);
    expect(s.codex.h).toBe(4);
    expect(s.runes.copies['dust.0']!.toNumber()).toBe(50);
    expect(s.belt.tier).toBe(2);
    expect(s.stats.nebulasAll).toBe(2);
  });

  it('from the first Nebula, Supernova milestones stay; the first-ever Supernova bonus is once only', () => {
    const s = ready();
    performReset(s, 'nebula');
    expect(milestoneReached(s, 'supernova', 'autoAll')).toBe(true);
    expect(milestoneReached(s, 'supernova', 'passive')).toBe(true);
    s.tier = 3;
    gain(s, 'stardust', D(1e7));
    expect(supernovaGain(s).toNumber()).not.toBe(3);
  });

  it('milestone 2: auto-Supernova once the gain reaches your number', () => {
    const s = ready();
    s.stats.nebulas = 2;
    s.stats.supernovas = 5;
    s.nebula.autoAt = D(1);
    tick(s, 0.05);
    expect(s.stats.supernovas).toBe(6);
  });

  it('milestone 10: a Supernova resets nothing (this run\'s Stardust count starts over)', () => {
    const s = ready();
    s.stats.nebulas = 10;
    s.stats.supernovas = 5;
    s.engines.mote = 50;
    s.upgrades = ['tap.warm'];
    const dust = cur(s, 'stardust');
    performReset(s, 'supernova');
    expect(s.engines.mote).toBe(50);
    expect(s.upgrades).toContain('tap.warm');
    expect(cur(s, 'stardust').eq(dust)).toBe(true);
    expect(s.totals.run.stardust?.toNumber() ?? 0).toBe(0);
    invalidateStats();
    expect(breakdown(s, 'passiveShards').some((l) => l.label === 'Milestone: 10 Nebulas')).toBe(true);
  });

  it('lifetime Essence boosts shard gain', () => {
    const s = nebulaPlayer();
    const before = stat(s, 'shardGain').toNumber();
    gain(s, 'essence', D(100));
    invalidateStats();
    expect(stat(s, 'shardGain').toNumber()).toBeCloseTo(before * 101 ** 0.4, 6);
  });
});

describe('the Nebula Tree and Nebula Constants', () => {
  it('has 101 nodes with unique ids (1.3.0: Constant Flow joins the 100), every parent real', () => {
    expect(NEBULA_TREE).toHaveLength(101);
    const ids = new Set(NEBULA_TREE.map((n) => n.id));
    expect(ids.size).toBe(101);
    for (const n of NEBULA_TREE) for (const p of n.parents) expect(ids.has(p)).toBe(true);
  });

  it('buys with Essence; Kept Embers, Head Start and Remembered Spiral change what a Nebula resets', () => {
    const s = nebulaPlayer();
    gain(s, 'essence', D(1e9));
    for (const id of ['nroot', 'bloom.1', 'bloom.2', 'bloom.3', 'bloom.4', 'bloom.5', 'bloom.6', 'bloom.7']) expect(buyNebulaNode(s, id), id).toBe(true);
    s.stats.supernovas = 30;
    gain(s, 'shards', D(1e8));
    s.novaTree = { root: 1, 'forge.1': 1, 'forge.2': 1 };
    invalidateStats();
    const shards = cur(s, 'shards');
    performReset(s, 'nebula');
    expect(cur(s, 'shards').toNumber()).toBe(shards.mul(0.1).floor().toNumber());
    expect(s.stats.supernovas).toBe(3);
    expect(s.novaTree).toEqual({ root: 1, 'forge.1': 1 });
  });

  it('Nebula Constants open at the first Nebula and cost Essence', () => {
    const s = createInitialState(1, 1);
    const speed = CONSTANT_BY_ID.get('nebula.speed')!;
    expect(constantOpen(s, speed)).toBe(false);
    const t = nebulaPlayer();
    expect(constantOpen(t, speed)).toBe(true);
    gain(t, 'essence', D(100));
    expect(buyConstant(t, 'nebula.speed', 1)).toBe(true);
    expect(cur(t, 'essence').toNumber()).toBe(98);
  });
});

describe('save version 9', () => {
  it('loads a real version 8 save: the Supernova count becomes the lifetime count too', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v8.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.stats.supernovas).toBe(31);
    expect(state.stats.supernovasAll).toBe(31);
    expect(state.stats.supernovasBest).toBe(31);
    expect(state.fusion.best).toBe(3);
    expect(state.runes.copies).toEqual({});
    expect(state.nebulaTree).toEqual({});
    expect(state.nebula.autoAt.toNumber()).toBe(0);
  });

  it('round-trips runes, shrine settings and the Nebula Tree', () => {
    const s = nebulaPlayer();
    s.runes.copies['dust.3'] = D('1e40');
    setShrine(s, 'nova', { auto: true, rate: 0.5, luck: 0.25, keep: 2 });
    s.nebulaTree = { nroot: 1 };
    const c = clone(s);
    expect(c.runes.copies['dust.3']!.eq('1e40')).toBe(true);
    expect(c.runes.shrines.nova).toMatchObject({ auto: true, rate: 0.5, luck: 0.25, keep: 2 });
    expect(c.nebulaTree).toEqual({ nroot: 1 });
  });
});
