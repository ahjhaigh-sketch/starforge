import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { INGREDIENTS, mixKey, RECIPES } from '../../src/content/alchemy';
import { BALANCE } from '../../src/content/balance';
import { BACKGROUNDS, SKINS, TRAILS } from '../../src/content/cosmetics';
import { D } from '../../src/engine/decimal';
import { performReset } from '../../src/engine/layers';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { breakdown, invalidateStats, isStat, resetStatRegistry, stat } from '../../src/engine/stats';
import { alchemyOpen, brew, dose, drink, elixirLeft, maxBrews } from '../../src/engine/systems/alchemy';
import { cosmeticUnlocked, setCosmetic, wardrobeOpen } from '../../src/engine/systems/cosmetics';
import { buyPlanet } from '../../src/engine/systems/orbitals';
import { buyEngine, evolve } from '../../src/engine/systems/stardust';
import { supernovaReady } from '../../src/engine/systems/supernova';
import { buyUpgrade } from '../../src/engine/systems/upgrades';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

const fresh = (seed = 20): GameState => createInitialState(1_000_000, seed);
function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

describe('save version 20', () => {
  it('loads a real version 19 save (the 1.0.0 build): everything new starts at its default', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v19.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.stats.multiversesAll).toBe(1);
    expect(state.ships.fleet).toHaveLength(2);
    expect(state.cosmetics).toEqual({ skin: 'classic', trail: 'none', background: 'violet' });
    expect(state.alchemy).toEqual({ known: [], tried: [], shelf: {}, active: {} });
  });
});

describe('20.1 the Wardrobe', () => {
  it('opens at 10 medals; Classic, no trail and Deep Violet are always there', () => {
    const s = fresh();
    expect(wardrobeOpen(s)).toBe(false);
    s.achievements = Array.from({ length: 10 }, (_, i) => `m${i}`);
    expect(wardrobeOpen(s)).toBe(true);
    expect(cosmeticUnlocked(s, 'skin', 'classic')).toBe(true);
    expect(cosmeticUnlocked(s, 'trail', 'none')).toBe(true);
    expect(cosmeticUnlocked(s, 'background', 'violet')).toBe(true);
  });

  it('each choice unlocks with its own medal or count, and a locked or unknown one is refused', () => {
    const s = fresh();
    expect(setCosmetic(s, 'skin', 'blacksun')).toBe(false);
    expect(setCosmetic(s, 'skin', 'nonsense')).toBe(false);
    expect(s.cosmetics.skin).toBe('classic');
    s.stats.bhStageBest = 8;
    expect(setCosmetic(s, 'skin', 'blacksun')).toBe(true);
    expect(s.cosmetics.skin).toBe('blacksun');
    // everything there is, unlocked by the numbers that unlock it
    Object.assign(s.stats, { smelts: 1000, elements: 26, questsDone: 50, taps: 1e6, multiversesAll: 1, comets: 100, supernovasAll: 30, singularitiesAll: 1, nebulasAll: 1, crunchesAll: 1, galacticsAll: 1 });
    s.achievements = Array.from({ length: 50 }, (_, i) => `m${i}`);
    for (const k of SKINS) expect(setCosmetic(s, 'skin', k.id)).toBe(true);
    for (const t of TRAILS) expect(setCosmetic(s, 'trail', t.id)).toBe(true);
    for (const b of BACKGROUNDS) expect(setCosmetic(s, 'background', b.id)).toBe(true);
  });

  it('only the choices are saved: they round-trip, and no reset touches them', () => {
    const s = fresh();
    s.stats.bhStageBest = 8;
    s.stats.comets = 100;
    setCosmetic(s, 'skin', 'blacksun');
    setCosmetic(s, 'trail', 'comet');
    const c = clone(s);
    expect(c.cosmetics).toEqual({ skin: 'blacksun', trail: 'comet', background: 'violet' });
  });
});

/** A game with the cauldron open and plenty of every ingredient. */
function cauldron(amount = 1e6): GameState {
  const s = fresh();
  s.stats.supernovasAll = BALANCE.alchemy.supernovas;
  for (const i of INGREDIENTS) gain(s, i.id, D(amount));
  return s;
}

function permutations<T>(a: readonly T[]): T[][] {
  if (a.length <= 1) return [a.slice()];
  return a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));
}

const ALE = ['ore', 'ore', 'ore'];

describe('20.2 Starlight Alchemy', () => {
  it('opens at 12 Supernovas; 12 recipes, each a different mix of real ingredients boosting a real stat', () => {
    const s = fresh();
    expect(alchemyOpen(s)).toBe(false);
    expect(brew(s, ALE)).toBeNull();
    s.stats.supernovasAll = 12;
    expect(alchemyOpen(s)).toBe(true);
    expect(RECIPES).toHaveLength(12);
    expect(new Set(RECIPES.map((r) => mixKey(r.mix))).size).toBe(12);
    const ings = new Set(INGREDIENTS.map((i) => i.id));
    for (const r of RECIPES) {
      expect(isStat(r.stat), r.stat).toBe(true);
      for (const id of r.mix) expect(ings.has(id), id).toBe(true);
    }
  });

  it('a recipe brews in any order, goes in the book the first time, and lands on the shelf', () => {
    for (const r of RECIPES) {
      for (const order of permutations(r.mix)) {
        const s = cauldron();
        expect(brew(s, order)).toEqual({ kind: 'elixir', recipe: r.id, count: 1, first: true });
        expect(s.alchemy.known).toEqual([r.id]);
        expect(s.alchemy.shelf[r.id]).toBe(1);
        expect(brew(s, order)).toEqual({ kind: 'elixir', recipe: r.id, count: 1, first: false });
        expect(s.stats.recipesFound).toBe(1);
        expect(s.stats.brews).toBe(2);
      }
    }
  });

  it('any other mix is sludge with an honest hint, and a mix tried twice says so', () => {
    const s = cauldron();
    // two Void Ore belong together in the Echo Elixir
    expect(brew(s, ['ore.void', 'ore.void', 'ore.void'])).toEqual({ kind: 'sludge', hint: 2, again: false });
    // Crystal Alloy is in three recipes, but only once in each
    const crystal = ['alloy.crystal', 'alloy.crystal', 'alloy.crystal'];
    expect(brew(s, crystal)).toEqual({ kind: 'sludge', hint: 1, again: false });
    expect(brew(s, crystal)).toEqual({ kind: 'sludge', hint: 1, again: true });
    expect(s.alchemy.tried).toHaveLength(2);
    // once those three recipes are found, Crystal Alloy points nowhere new
    for (const id of ['essenceInfusion', 'forgeTonic', 'voidPhilter']) brew(s, RECIPES.find((r) => r.id === id)!.mix);
    expect(brew(s, crystal)).toEqual({ kind: 'sludge', hint: 0, again: true });
    // not three, or not an ingredient: nothing happens
    expect(brew(s, ['ore', 'ore'])).toBeNull();
    expect(brew(s, ['ore', 'ore', 'stardust'])).toBeNull();
  });

  it('a dose is a twentieth of what you hold (at least its floor); you must hold every dose', () => {
    const s = cauldron(0);
    expect(dose(s, 'ore').toNumber()).toBe(1000);
    expect(brew(s, ALE)).toBeNull();
    gain(s, 'ore', D(2999));
    expect(brew(s, ALE)).toBeNull();
    gain(s, 'ore', D(1));
    expect(brew(s, ALE)?.kind).toBe('elixir');
    expect(cur(s, 'ore').toNumber()).toBe(0);
    gain(s, 'ore', D('1e40'));
    expect(dose(s, 'ore').eq(D('5e38'))).toBe(true);
    brew(s, ALE);
    expect(cur(s, 'ore').div(D('1e40')).sub(0.85).abs().lt(1e-9)).toBe(true);
  });

  it('a known recipe brews in bulk, up to the closed-form most you can pay for; an unknown one brews once', () => {
    const s = cauldron(1e6);
    expect(maxBrews(s, 'minersAle')).toBe(6); // 3 doses of 50,000 from 1M
    expect(brew(s, ALE, 5)).toEqual({ kind: 'elixir', recipe: 'minersAle', count: 1, first: true });
    // doses shrink as you spend: 850,000 held, a dose is 42,500
    const max = maxBrews(s, 'minersAle');
    expect(max).toBe(Math.floor(850_000 / (3 * 42_500)));
    expect(brew(s, ALE, max + 1)).toBeNull();
    expect(brew(s, ALE, max)).toEqual({ kind: 'elixir', recipe: 'minersAle', count: max, first: false });
    expect(s.alchemy.shelf.minersAle).toBe(1 + max);
    // a batch is priced at the dose when it starts: six brews take 90%, never more than you hold
    expect(cur(s, 'ore').toNumber()).toBe(850_000 - max * 3 * 42_500);
    // down at the floor, the floor sets the price
    s.currencies.ore = D(5999);
    expect(maxBrews(s, 'minersAle')).toBe(1);
    // a huge holding is still one calculation
    gain(s, 'ore', D('1e300'));
    expect(maxBrews(s, 'minersAle')).toBe(6);
  });

  it('drinking starts the boost, stacks its time up to an hour, and the boost ends on time', () => {
    const s = cauldron();
    expect(drink(s, 'minersAle')).toBe(false);
    for (let i = 0; i < 6; i++) brew(s, ALE);
    const before = stat(s, 'oreGain');
    expect(drink(s, 'minersAle')).toBe(true);
    expect(elixirLeft(s, 'minersAle')).toBe(900);
    expect(stat(s, 'oreGain').eq(before.mul(10))).toBe(true);
    expect(breakdown(s, 'oreGain').some((l) => l.label === "Miner's Ale (elixir)")).toBe(true);
    for (let i = 0; i < 5; i++) drink(s, 'minersAle');
    expect(elixirLeft(s, 'minersAle')).toBe(BALANCE.alchemy.maxSeconds);
    expect(s.alchemy.shelf.minersAle).toBe(0);
    expect(s.stats.elixirsDrunk).toBe(6);
    s.playtime += BALANCE.alchemy.maxSeconds;
    invalidateStats();
    expect(elixirLeft(s, 'minersAle')).toBe(0);
    expect(stat(s, 'oreGain').eq(before)).toBe(true);
  });

  it('the book, the shelf and a running boost survive a Supernova and a save', () => {
    const s = cauldron();
    gain(s, 'stardust', D(4e8));
    for (const e of ['mote', 'catcher', 'moonmill', 'drill']) buyEngine(s, e, 20);
    for (let i = 0; i < 3; i++) evolve(s);
    s.stats.taps = 300;
    buyUpgrade(s, 'tap.warm');
    buyPlanet(s, '0.0', 'rocky');
    invalidateStats();
    brew(s, ALE);
    brew(s, ALE);
    drink(s, 'minersAle');
    brew(s, ['ore.void', 'ore.void', 'ore.void']);
    expect(supernovaReady(s)).toBe(true);
    performReset(s, 'supernova');
    expect(s.alchemy.known).toEqual(['minersAle']);
    expect(s.alchemy.shelf.minersAle).toBe(1);
    expect(s.alchemy.tried).toHaveLength(1);
    expect(elixirLeft(s, 'minersAle')).toBe(900);
    const c = clone(s);
    expect(c.alchemy).toEqual(s.alchemy);
    expect(elixirLeft(c, 'minersAle')).toBe(900);
  });
});
