import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BALANCE } from '../../src/content/balance';
import { CARD_RARITIES, CARDS } from '../../src/content/nebulaExtras';
import { D } from '../../src/engine/decimal';
import { performReset } from '../../src/engine/layers';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { breakdown, invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { pageCount } from '../../src/engine/systems/collection';
import { buySpectral, colorOpen, energyOf, focusRate, oom, setFocus, spectralPlan } from '../../src/engine/systems/spectral';
import { deckSlots, deckValue, openPacks, placeCard, resolveDeck } from '../../src/engine/systems/tarot';
import { tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

function player(nebulas = 6, seed = 31): GameState {
  const s = createInitialState(11_000_000, seed);
  s.tier = 3;
  s.stats.supernovasAll = 200;
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

const line = (s: GameState, statId: string, label: string) => breakdown(s, statId).find((l) => l.label === label)?.value.toNumber();

describe('Spectral Focus', () => {
  it('counts whole orders of magnitude exactly at every power of ten', () => {
    expect(oom(D(9.999))).toBe(0);
    expect(oom(D(10))).toBe(1);
    expect(oom(D(999.999))).toBe(2);
    expect(oom(D(1000))).toBe(3);
    for (let k = 1; k <= 300; k++) {
      expect(oom(D(10).pow(k))).toBe(k);
      expect(oom(D(10).pow(k).mul(0.999999))).toBe(k - 1);
    }
    expect(oom(D('1e5000'))).toBe(5000);
  });

  it('each threshold triggers at its order of magnitude, and shows in Stats', () => {
    const s = player(5);
    s.spectral.energy.red = D(999.99);
    invalidateStats();
    expect(line(s, 'productionMult', 'Spectral: Red')).toBeCloseTo(1.1 ** 2, 9);
    s.spectral.energy.red = D(1000);
    invalidateStats();
    expect(line(s, 'productionMult', 'Spectral: Red')).toBeCloseTo(1.1 ** 3, 9);
    // Violet: every 3 orders of magnitude is one more order going into the Supernova and Nebula formulas
    s.spectral.energy.violet = D(99_999);
    invalidateStats();
    expect(line(s, 'shardGain', 'Spectral: Violet')).toBeCloseTo(10 ** (1 * BALANCE.supernova.gainPow), 9);
    s.spectral.energy.violet = D(1e6);
    invalidateStats();
    expect(line(s, 'shardGain', 'Spectral: Violet')).toBeCloseTo(10 ** (2 * BALANCE.supernova.gainPow), 9);
    expect(line(s, 'essenceGain', 'Spectral: Violet')).toBeCloseTo(10 ** (2 * BALANCE.nebula.gainPow), 9);
  });

  it('colours open in order at 1,000 energy; only the focused one builds unless Afterglow is bought', () => {
    const s = player(5);
    expect(colorOpen(s, 'orange')).toBe(false);
    expect(setFocus(s, 'orange')).toBe(false);
    expect(setFocus(s, 'red')).toBe(true);
    const rate = focusRate(s).toNumber();
    tick(s, 10);
    expect(energyOf(s, 'red').toNumber()).toBeCloseTo(rate * 10, 6);
    s.spectral.energy.red = D(1000);
    expect(colorOpen(s, 'orange')).toBe(true);
    expect(energyOf(s, 'orange').toNumber()).toBe(0);
    gain(s, 'essence', D(1e13));
    s.settings.buyAmount = 'max';
    expect(buySpectral(s, 'afterglow')).toBe(true);
    expect(s.spectral.upgrades.afterglow).toBe(BALANCE.spectral.afterglowMax);
    tick(s, 10);
    expect(energyOf(s, 'orange').toNumber()).toBeCloseTo(focusRate(s).toNumber() * 10 * 0.5, 4);
    // orange passed 1,000 on Afterglow alone, so yellow is open now
    expect(colorOpen(s, 'yellow')).toBe(energyOf(s, 'orange').gte(1000));
    expect(colorOpen(s, 'green')).toBe(false);
  });

  it('Prism Lens costs 100 x 20^n Essence and doubles the rate', () => {
    const s = player(5);
    gain(s, 'essence', D(1e6));
    s.settings.buyAmount = 10;
    expect(spectralPlan(s, 'lens').cost.div((100 * (20 ** 10 - 1)) / 19).toNumber()).toBeCloseTo(1, 9);
    s.settings.buyAmount = 1;
    const before = focusRate(s).toNumber();
    expect(buySpectral(s, 'lens')).toBe(true);
    expect(focusRate(s).toNumber()).toBeCloseTo(before * 2, 9);
  });
});

describe('Tarot of the Void', () => {
  it('packs draw the lowest unfinished rarity, never a duplicate, at 50 x 1.6^packs', () => {
    const s = player();
    gain(s, 'essence', D(1e15));
    s.settings.buyAmount = 'max';
    const before = cur(s, 'essence');
    const drawn = openPacks(s);
    expect(drawn).toHaveLength(60);
    expect(new Set(drawn.map((c) => c.id)).size).toBe(60);
    for (let i = 1; i < drawn.length; i++) expect(drawn[i]!.rarity).toBeGreaterThanOrEqual(drawn[i - 1]!.rarity);
    const cost = Array.from({ length: 60 }, (_, k) => 50 * 1.6 ** k).reduce((a, b) => a + b, 0);
    expect(before.sub(cur(s, 'essence')).div(cost).toNumber()).toBeCloseTo(1, 6);
    expect(openPacks(s)).toEqual([]);
    expect(deckSlots(s)).toBe(7);
    expect(pageCount(s, 'cards')).toEqual({ found: 60, total: 60 });
    expect(CARDS).toHaveLength(60);
    expect(CARD_RARITIES).toHaveLength(6);
  });

  /** A player who owns every card, with this deck. */
  function deck(cards: Array<string | null>): GameState {
    const s = player();
    s.tarot.owned = CARDS.map((c) => c.id);
    s.tarot.deck = cards.map((c) => (c ? `card.${c}` : null));
    invalidateStats();
    return s;
  }

  it('The Mirror copies the card on its left and disables the card on its right', () => {
    // A, Mirror, B: the Mirror is a second A; B does nothing
    let s = deck(['ace.dust', 'mirror', 'ace.shards']);
    let v = resolveDeck(s);
    expect(v.map((x) => x.active)).toEqual([true, true, false, false, false, false, false]);
    expect(v[1]!.acts?.id).toBe('card.ace.dust');
    expect(deckValue(s, 'productionMult', 'mul').toNumber()).toBeCloseTo(1.3 ** 2, 9);
    expect(deckValue(s, 'shardGain', 'mul').toNumber()).toBe(1);
    // leftmost, it copies nothing but still disables its right
    s = deck(['mirror', 'ace.dust']);
    v = resolveDeck(s);
    expect(v[0]!.acts).toBeNull();
    expect(v[1]!.active).toBe(false);
    expect(deckValue(s, 'productionMult', 'mul').toNumber()).toBe(1);
    // A, Mirror, Mirror, B: the first Mirror disables the second, so B stays on
    s = deck(['ace.dust', 'mirror', 'mirror', 'ace.shards']);
    v = resolveDeck(s);
    expect(v.slice(0, 4).map((x) => x.active)).toEqual([true, true, false, true]);
    expect(deckValue(s, 'productionMult', 'mul').toNumber()).toBeCloseTo(1.3 ** 2, 9);
    expect(deckValue(s, 'shardGain', 'mul').toNumber()).toBeCloseTo(1.3, 9);
    // next to an empty slot it copies nothing
    s = deck(['ace.dust', null, 'mirror', 'ace.shards']);
    v = resolveDeck(s);
    expect(v[2]!.acts).toBeNull();
    expect(v[3]!.active).toBe(false);
    // it copies a card's position rule too, worked out where the Mirror sits
    s = deck(['magician', 'mirror']);
    expect(deckValue(s, 'essenceGain', 'mul').toNumber()).toBeCloseTo(3 * 1.5, 9);
    // copying The Tower makes a second Tower (and the real one is disabled by it in turn? no: the Tower acts first)
    s = deck(['tower', 'mirror', 'ace.dust']);
    v = resolveDeck(s);
    expect(v.slice(0, 3).map((x) => x.active)).toEqual([true, false, true]);
  });

  it('The Lovers, Tower, Hermit, Chariot, Fool and Magician work from where they sit', () => {
    expect(deckValue(deck(['ace.dust', 'lovers', 'ace.dust']), 'productionMult', 'mul').toNumber()).toBeCloseTo(1.3 ** 4, 9);
    expect(deckValue(deck(['lovers', 'ace.dust', 'lovers']), 'productionMult', 'mul').toNumber()).toBeCloseTo(1.3 ** 4, 9);
    const t = deck(['ace.dust', 'tower', 'ace.shards']);
    expect(resolveDeck(t).slice(0, 3).map((x) => x.active)).toEqual([false, true, false]);
    expect(deckValue(t, 'productionMult', 'mul').toNumber()).toBe(8);
    expect(deckValue(deck(['hermit']), 'shardGain', 'mul').toNumber()).toBe(5);
    expect(deckValue(deck(['hermit', 'ace.runes']), 'shardGain', 'mul').toNumber()).toBe(1.2);
    expect(deckValue(deck([null, null, null, null, null, null, 'chariot']), 'runeBulk', 'mul').toNumber()).toBe(4);
    expect(deckValue(deck(['chariot']), 'runeBulk', 'mul').toNumber()).toBe(1.5);
    // 7 slots with 60 cards owned; the Fool leaves 6 of them empty
    expect(deckValue(deck(['fool']), 'tapPower', 'mul').toNumber()).toBe(2 ** 6);
    expect(deckValue(deck([null, 'magician']), 'essenceGain', 'mul').toNumber()).toBe(1.5);
    const sloth = deck(['sloth']);
    expect(deckValue(sloth, 'offlineCap', 'add').toNumber()).toBe(4 * 3600);
    invalidateStats();
    expect(line(sloth, 'productionMult', 'Tarot of the Void')).toBeCloseTo(0.8, 9);
  });

  it('The Gambler rolls when first dealt in and again after every Nebula: x4 at 44%, else x0.44', () => {
    const s = player();
    s.tarot.owned = ['card.gambler'];
    expect(s.tarot.gamble).toBe(1);
    placeCard(s, 'card.gambler', 0);
    expect([4, 0.44]).toContain(s.tarot.gamble);
    let wins = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) {
      s.stats.supernovas = 30;
      s.totals.run.shards = D(1e9);
      expect(performReset(s, 'nebula')).not.toBeNull();
      if (s.tarot.gamble === 4) wins++;
    }
    expect(Math.abs(wins / n - 0.44)).toBeLessThan(0.04);
    invalidateStats();
    expect(stat(s, 'essenceGain').gt(0)).toBe(true);
  });
});

describe('save version 12', () => {
  it('loads a real version 11 save', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v11.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.wyrms.team).toEqual(['wyrm.ashling|0|']);
    expect(state.wyrms.levels['wyrm.ashling|0|']).toBe(3);
    expect(state.nursery.plots[0]).toEqual({ species: 'star.sol', t: 10 });
    expect(state.spectral).toEqual({ energy: {}, focus: null, upgrades: {} });
    expect(state.tarot).toMatchObject({ owned: [], deck: [], packs: 0, gamble: 1 });
    expect(cur(state, 'embers').toNumber()).toBe(99);
  });

  it('round-trips Spectral Focus and the tarot deck', () => {
    const s = player();
    s.spectral.energy = { red: D('1e40'), orange: D(12) };
    s.spectral.focus = 'orange';
    s.spectral.upgrades = { lens: 4 };
    s.tarot.owned = ['card.mirror', 'card.sun'];
    s.tarot.deck = ['card.sun', 'card.mirror', null];
    s.tarot.packs = 2;
    s.tarot.gamble = 0.44;
    const c = clone(s);
    expect(c.spectral.energy.red!.eq('1e40')).toBe(true);
    expect(c.spectral).toMatchObject({ focus: 'orange', upgrades: { lens: 4 } });
    expect(c.tarot).toMatchObject({ owned: ['card.mirror', 'card.sun'], deck: ['card.sun', 'card.mirror', null], packs: 2, gamble: 0.44 });
  });
});
