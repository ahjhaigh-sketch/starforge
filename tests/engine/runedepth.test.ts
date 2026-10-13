import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BALANCE } from '../../src/content/balance';
import { ELEMENTS } from '../../src/content/elements';
import { RUNE_BY_ID } from '../../src/content/runes';
import { AURA_BY_ID, AURAS, MUTATIONS } from '../../src/content/runeDepth';
import { D } from '../../src/engine/decimal';
import { simulateElapsed } from '../../src/engine/offline';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { breakdown, invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { auraEffLog, equipAura, rollAuraDice, rollAuras } from '../../src/engine/systems/auras';
import { harvest } from '../../src/engine/systems/belt';
import { pageCount } from '../../src/engine/systems/collection';
import { effectiveCopies, mutateRunes, rollAsteroidMutation } from '../../src/engine/systems/mutations';
import { runeEffLog, runeLevel, setShrine } from '../../src/engine/systems/runes';
import { craftPlan, craftRune, salvage, starUp } from '../../src/engine/systems/starring';
import { tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

/** A player with this many Nebulas behind them (every Phase 9 system opens by 4). */
function player(nebulas = 4, seed = 5): GameState {
  const s = createInitialState(9_000_000, seed);
  s.tier = 3;
  s.stats.supernovasAll = 40;
  s.stats.nebulas = nebulas;
  s.stats.nebulasAll = nebulas;
  s.forge.on = false;
  // 1.2.0: Auto-Supernova (40 Supernovas) would reset this run: these tests are about runes and auras
  s.auto['auto.supernova'] = { on: false, spend: 1 };
  invalidateStats();
  return s;
}

function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

describe('Rune Starring', () => {
  it('only removes the copies the star asks for', () => {
    const s = player();
    s.runes.copies['dust.4'] = D(1000);
    s.runes.copies['dust.0'] = D(77);
    s.runes.copies['nova.4'] = D(5000);
    s.mutations.runes['dust.4'] = { golden: D(900), rainbow: D(20) };
    expect(starUp(s, 'dust')).toBe(true);
    expect(s.runes.copies['dust.4']!.toNumber()).toBe(750);
    expect(s.runes.copies['dust.0']!.toNumber()).toBe(77);
    expect(s.runes.copies['nova.4']!.toNumber()).toBe(5000);
    // mutated copies stay inside what is left, the commonest mutation giving way first
    const m = s.mutations.runes['dust.4']!;
    expect(m.golden!.add(m.rainbow!).toNumber()).toBe(750);
    expect(m.rainbow!.toNumber()).toBe(20);
    expect(s.runes.stars.dust).toBe(1);
    // the next star wants 2,500 Celestial runes: not there yet
    expect(starUp(s, 'dust')).toBe(false);
    expect(s.runes.copies['dust.4']!.toNumber()).toBe(750);
  });

  it('waits for 2 Nebulas, and each star is +20% to that shrine in the breakdowns', () => {
    const early = player(1);
    early.runes.copies['dust.4'] = D(1000);
    expect(starUp(early, 'dust')).toBe(false);
    const s = player();
    s.runes.copies['dust.0'] = D(1e9);
    s.runes.copies['dust.4'] = D(250);
    invalidateStats();
    const before = breakdown(s, 'productionMult').find((l) => l.label === 'Runes: Dust Shrine' && l.op === 'mul')!.value.toNumber();
    starUp(s, 'dust');
    invalidateStats();
    // dust.4 has no copies left, so the line is the common rune alone: 1 + 0.02 x 500 x 1.2
    const after = breakdown(s, 'productionMult').find((l) => l.label === 'Runes: Dust Shrine' && l.op === 'mul')!.value.toNumber();
    expect(after).toBeCloseTo(1 + 0.02 * 500 * 1.2, 9);
    expect(before).toBeGreaterThan(1);
  });

  it('two stars reveal the hidden rune and make it 10 times likelier', () => {
    const s = player();
    const hidden = RUNE_BY_ID.get('dust.hidden')!;
    const base = runeEffLog(s, hidden, 1);
    s.runes.stars.dust = 2;
    expect(runeEffLog(s, hidden, 1)).toBeCloseTo(base - 1, 9);
  });
});

describe('Rune Crafting', () => {
  it('salvage keeps every copy a level uses; crafting follows the buy amount', () => {
    const s = player();
    s.runes.copies['dust.0'] = D(1e9);
    const common = RUNE_BY_ID.get('dust.0')!;
    const got = salvage(s, 'dust');
    expect(s.runes.copies['dust.0']!.toNumber()).toBe(500 * 500);
    expect(runeLevel(s, common)).toBe(500);
    expect(got.toNumber()).toBeCloseTo(((1e9 - 250_000) * 2) / BALANCE.runeDepth.salvageRatio, 0);
    // a 1-in-6 rune costs 6 shards each
    s.currencies.runeShards = D(1000);
    s.settings.buyAmount = 10;
    expect(craftPlan(s, 'dust.1').cost.toNumber()).toBeCloseTo(60, 6);
    expect(craftRune(s, 'dust.1')).toBe(true);
    expect(s.runes.copies['dust.1']!.toNumber()).toBe(10);
    s.settings.buyAmount = 'max';
    expect(craftPlan(s, 'dust.1').count.toNumber()).toBe(Math.floor(940 / 6));
    // a hidden rune can't be crafted until it's found or revealed
    s.currencies.runeShards = D('1e300');
    expect(craftRune(s, 'dust.hidden')).toBe(false);
  });
});

describe('Celestial Auras', () => {
  it('rates match their odds over a million dice, rolled in small batches', () => {
    const s = player();
    const totals = new Map<string, number>();
    for (let i = 0; i < 1000; i++) for (const h of rollAuraDice(s, D(1000)).hits) totals.set(h.id, (totals.get(h.id) ?? 0) + h.count.toNumber());
    for (const a of AURAS) {
      const lambda = 1e6 * 10 ** -auraEffLog(s, a);
      const got = totals.get(a.id) ?? 0;
      expect(Math.abs(got - lambda)).toBeLessThanOrEqual(5 * Math.sqrt(lambda) + 2);
    }
    expect(AURAS[0]!.log10).toBeCloseTo(Math.log10(5), 9);
    expect(AURAS[AURAS.length - 1]!.log10).toBeCloseTo(Math.log10(1.75e6), 9);
  });

  it('dice come from rolling runes; rolling follows the buy amount; the worn aura shows in Stats', () => {
    const s = player();
    gain(s, 'stardust', D(1e12));
    setShrine(s, 'dust', { auto: true });
    s.constants['nebula.bulk'] = 60;
    invalidateStats();
    tick(s, 10);
    expect(cur(s, 'auraDice').toNumber()).toBeCloseTo(s.runes.shrines.dust!.rolled.toNumber() / 1000, 6);
    s.currencies.auraDice = D(500);
    s.settings.buyAmount = 100;
    expect(rollAuras(s)).not.toBeNull();
    expect(cur(s, 'auraDice').toNumber()).toBe(400);
    s.auras.copies['aura.crown'] = D(1);
    expect(equipAura(s, 'aura.crown')).toBe(true);
    invalidateStats();
    const line = breakdown(s, 'productionMult').find((l) => l.label === 'Celestial Auras');
    expect(line?.value.toNumber()).toBe(6);
    expect(AURA_BY_ID.get('aura.crown')!.effects.find((e) => e.stat === 'runeLuck')!.mul).toBe(4);
    expect(equipAura(s, 'aura.throne')).toBe(false);
  });

  it('auto-roll throws every die it earns, in steps of any size and offline', () => {
    const run = (steps: number) => {
      const s = player(4, 11);
      gain(s, 'stardust', D(1e15));
      setShrine(s, 'dust', { auto: true });
      s.constants['nebula.bulk'] = 200;
      s.auras.auto = true;
      invalidateStats();
      for (let i = 0; i < steps; i++) tick(s, 600 / steps);
      return s;
    };
    // every die earned is rolled or still waiting, whatever the step size (finer steps can find bulk sooner)
    for (const x of [run(10), run(100)]) {
      const runes = x.runes.shrines.dust!.rolled.toNumber();
      expect(runes).toBeGreaterThan(1e5);
      expect((x.stats.diceRolled ?? 0) + cur(x, 'auraDice').toNumber()).toBeCloseTo(runes / 1000, 3);
      expect(cur(x, 'auraDice').toNumber()).toBeLessThan(1);
    }
    const s = player(4, 3);
    gain(s, 'stardust', D(1e15));
    setShrine(s, 'dust', { auto: true });
    s.auras.auto = true;
    simulateElapsed(s, 3600, { cap: 86_400, efficiency: 0.5, offline: true });
    expect(s.stats.diceRolled ?? 0).toBeGreaterThan(0);
  });
});

describe('Mutations', () => {
  it('rune mutation rates match their odds', () => {
    const s = player();
    for (let i = 0; i < 1000; i++) mutateRunes(s, 'dust.0', D(1000));
    const m = s.mutations.runes['dust.0']!;
    const expectN = (id: string) => 1e6 / 10 ** MUTATIONS.find((x) => x.id === id)!.log10;
    expect(Math.abs(m.golden!.toNumber() - expectN('golden')) / expectN('golden')).toBeLessThan(0.03);
    expect(Math.abs(m.rainbow!.toNumber() - expectN('rainbow')) / expectN('rainbow')).toBeLessThan(0.08);
    expect(Math.abs(m.void!.toNumber() - expectN('void'))).toBeLessThanOrEqual(5 * Math.sqrt(expectN('void')));
  });

  it('asteroid mutation rates match their odds, and none before 3 Nebulas', () => {
    const early = player(2);
    const rng = [...early.mutations.rng];
    expect(rollAsteroidMutation(early)).toBe(0);
    expect(early.mutations.rng).toEqual(rng);
    const s = player();
    const counts = [0, 0, 0, 0, 0];
    const n = 200_000;
    for (let i = 0; i < n; i++) counts[rollAsteroidMutation(s)]!++;
    expect(Math.abs(counts[1]! - n / 50) / (n / 50)).toBeLessThan(0.06);
    expect(Math.abs(counts[2]! - n / 500)).toBeLessThanOrEqual(5 * Math.sqrt(n / 500));
  });

  it('mutated copies count toward levels; a mutated asteroid pays its multiple', () => {
    const s = player();
    s.runes.copies['dust.0'] = D(100);
    s.mutations.runes['dust.0'] = { golden: D(20) };
    expect(effectiveCopies(s, 'dust.0', D(100)).toNumber()).toBe(120);
    expect(runeLevel(s, RUNE_BY_ID.get('dust.0')!)).toBe(10);
    s.belt.field = [{ id: 1, r: 0 }];
    harvest(s, [1]);
    const plain = cur(s, 'ore').toNumber();
    s.belt.field = [{ id: 2, r: 0, m: 2 }];
    harvest(s, [2]);
    expect(cur(s, 'ore').toNumber() - plain).toBeCloseTo(plain * 5, 6);
    expect(s.mutations.asteroids['iron.rainbow']).toBe(1);
  });
});

describe('The Index', () => {
  it('page bonuses appear in the stat breakdowns', () => {
    const s = player();
    for (const e of ELEMENTS.slice(0, 12)) s.codex[e.id] = 1;
    invalidateStats();
    expect(pageCount(s, 'elements')).toEqual({ found: 12, total: 118 });
    const line = breakdown(s, 'productionMult').find((l) => l.label === 'Index: Elements');
    expect(line?.value.toNumber()).toBe(2);
    for (const e of ELEMENTS.slice(0, 30)) s.codex[e.id] = 1;
    invalidateStats();
    expect(breakdown(s, 'productionMult').find((l) => l.label === 'Index: Elements')?.value.toNumber()).toBe(4);
    s.auras.copies['aura.haze'] = D(1);
    s.auras.copies['aura.veil'] = D(1);
    s.auras.copies['aura.ember'] = D(1);
    invalidateStats();
    expect(breakdown(s, 'runeBulk').find((l) => l.label === 'Index: Auras')?.value.toNumber()).toBe(1.5);
    expect(stat(s, 'runeBulk').gte(1.5)).toBe(true);
  });
});

describe('save version 10', () => {
  it('loads a real version 9 save', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v9.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.stats.nebulasAll).toBe(2);
    expect(state.runes.copies['dust.0']!.toNumber()).toBe(400);
    expect(state.runes.shrines.dust).toMatchObject({ auto: true, rate: 0.5, keep: 1 });
    expect(state.runes.stars).toEqual({});
    expect(state.auras.copies).toEqual({});
    expect(state.auras.equipped).toBeNull();
    expect(state.mutations.runes).toEqual({});
    expect(state.belt.field).toEqual([
      { id: 7, r: 0 },
      { id: 8, r: 2 },
    ]);
    expect(state.mutations.rng).toHaveLength(4);
  });

  it('round-trips stars, auras, mutations and mutated asteroids', () => {
    const s = player();
    s.runes.stars = { dust: 2 };
    s.auras.copies['aura.haze'] = D('1e50');
    s.auras.equipped = 'aura.haze';
    s.auras.auto = true;
    s.mutations.runes['nova.3'] = { prismatic: D(3) };
    s.mutations.asteroids['gold.void'] = 4;
    s.belt.field = [{ id: 3, r: 1, m: 4 }];
    s.currencies.runeShards = D(123);
    const c = clone(s);
    expect(c.runes.stars).toEqual({ dust: 2 });
    expect(c.auras.copies['aura.haze']!.eq('1e50')).toBe(true);
    expect(c.auras).toMatchObject({ equipped: 'aura.haze', auto: true });
    expect(c.mutations.runes['nova.3']!.prismatic!.toNumber()).toBe(3);
    expect(c.mutations.asteroids).toEqual({ 'gold.void': 4 });
    expect(c.belt.field).toEqual([{ id: 3, r: 1, m: 4 }]);
    expect(cur(c, 'runeShards').toNumber()).toBe(123);
  });
});
