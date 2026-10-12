import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { INGREDIENTS, mixKey, RECIPES } from '../../src/content/alchemy';
import { BALANCE } from '../../src/content/balance';
import { BACKGROUNDS, SKINS, TRAILS } from '../../src/content/cosmetics';
import { WEATHERS } from '../../src/content/weather';
import { D } from '../../src/engine/decimal';
import { events, type GameEvent } from '../../src/engine/events';
import { performReset } from '../../src/engine/layers';
import { simulateElapsed } from '../../src/engine/offline';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { breakdown, invalidateStats, isStat, resetStatRegistry, stat } from '../../src/engine/stats';
import { alchemyOpen, brew, dose, drink, elixirLeft, maxBrews } from '../../src/engine/systems/alchemy';
import { cosmeticUnlocked, setCosmetic, wardrobeOpen } from '../../src/engine/systems/cosmetics';
import { buyPlanet } from '../../src/engine/systems/orbitals';
import { buyEngine, evolve } from '../../src/engine/systems/stardust';
import { supernovaReady } from '../../src/engine/systems/supernova';
import { buyUpgrade } from '../../src/engine/systems/upgrades';
import { bestDesign, buyPart, designMults, designOf, fitBest, fitPart, launch, lootPerHour, rareChance, recallShip, tripLoot, tripSeconds } from '../../src/engine/systems/ships';
import { DEFAULT_DESIGN, PART_BY_ID, type ShipDesign } from '../../src/content/shipParts';
import { SECTOR_BY_ID, SECTORS } from '../../src/content/extras';
import { RELICS } from '../../src/content/forge';
import { ELEMENTS } from '../../src/content/elements';
import { advanceWeather, beaconProgress, summonWeather, weatherKindOpen, weatherLeft, weatherNow, weatherOpen } from '../../src/engine/systems/weather';
import { tick } from '../../src/engine/tick';
import { SIGIL_BY_ID, SIGILS } from '../../src/content/sigils';
import { buySigil, SIGIL_TREES, sigilPrice, sigilRevealed, toggleSigil } from '../../src/engine/systems/sigils';
import { TURRET_BY_ID, socketAt } from '../../src/content/defense';
import { advanceDefense, battleResult, battleSetup, buyTurretLevels, clearSocket, defenseOpen, fightWave, placeCost, placeTurret, setDefenseAuto, winAlloy } from '../../src/engine/systems/defense';
import { createBattle, hasArmour, hasBoss, relativeHit, runBattle, stepBattle, swarmCount } from '../../src/engine/systems/defenseBattle';

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

/** A game just past its first Supernova, with the sky not yet scheduled. */
function sky(seed = 20): GameState {
  const s = fresh(seed);
  s.stats.supernovasAll = 1;
  return s;
}
const W = BALANCE.weather;

describe('20.3 Space Weather', () => {
  it('starts after the first Supernova; kinds join with the systems they touch', () => {
    const s = fresh();
    expect(weatherOpen(s)).toBe(false);
    advanceWeather(s, false);
    expect(s.weather.next).toBe(0);
    s.stats.supernovasAll = 1;
    expect(WEATHERS.filter((k) => weatherKindOpen(s, k.id)).map((k) => k.id)).toEqual(['meteor', 'flare']);
    s.stats.supernovasAll = 15;
    s.stats.nebulasAll = 3;
    expect(WEATHERS.every((k) => weatherKindOpen(s, k.id))).toBe(true);
    for (const k of WEATHERS) for (const e of k.effects) expect(isStat(e.stat), e.stat).toBe(true);
  });

  it('rolls in every 6 to 12 minutes, lasts 90 to 180 seconds, one at a time', () => {
    const s = sky();
    advanceWeather(s, false);
    const first = s.weather.next - s.playtime;
    expect(first).toBeGreaterThanOrEqual(W.gapMin);
    expect(first).toBeLessThanOrEqual(W.gapMax);
    let lastEnd = -1;
    let starts = 0;
    for (let i = 0; i < 6 * 3600; i++) {
      const wasKind = s.weather.kind;
      const due = s.weather.next;
      const until = s.weather.until;
      s.playtime += 1;
      advanceWeather(s, false);
      if (wasKind && s.weather.kind !== wasKind) lastEnd = until;
      if (s.weather.kind && s.weather.until !== until) {
        // a new weather began at the moment it was due, and lasts its roll
        starts++;
        const start = s.weather.kind && wasKind ? until : due;
        expect(s.weather.until - start).toBeGreaterThanOrEqual(W.lastMin);
        expect(s.weather.until - start).toBeLessThanOrEqual(W.lastMax);
        if (lastEnd >= 0) {
          expect(start - lastEnd).toBeGreaterThanOrEqual(W.gapMin);
          expect(start - lastEnd).toBeLessThanOrEqual(W.gapMax);
        }
      }
    }
    // 6 hours at one weather every 7.5 to 15 minutes
    expect(starts).toBeGreaterThanOrEqual(24);
    expect(starts).toBeLessThanOrEqual(48);
    expect(s.stats.weathers).toBe(starts);
  });

  it('a long catch-up, one giant step and second-by-second play roll exactly the same skies', () => {
    // the first weather is set from the tick that first sees the sky open (within one step of it);
    // after that, the schedule runs on play time alone
    const live = sky(7);
    advanceWeather(live, false);
    for (let i = 0; i < 3 * 3600; i++) tick(live, 1);
    const away = sky(7);
    advanceWeather(away, false);
    simulateElapsed(away, 3 * 3600, { cap: 86_400, efficiency: 1, offline: true });
    // game speed is integrated per step, so the two clocks differ by a few seconds in 3 hours:
    // bring the one behind up to the same play-time moment (the sky only reads play time)
    for (const [a, b] of [[live, away], [away, live]] as const) {
      if (a.playtime < b.playtime) {
        a.playtime = b.playtime;
        advanceWeather(a, false);
      }
    }
    const jump = sky(7);
    advanceWeather(jump, false);
    jump.playtime = live.playtime;
    advanceWeather(jump, false);
    expect(live.stats.weathers).toBeGreaterThan(10);
    for (const other of [away, jump]) {
      expect(other.playtime).toBe(live.playtime);
      expect(other.stats.weathers).toBe(live.stats.weathers);
      expect(other.weather.kind).toBe(live.weather.kind);
      expect(other.weather.until).toBeCloseTo(live.weather.until, 6);
      expect(other.weather.next).toBeCloseTo(live.weather.next, 6);
      expect(other.weather.rng).toEqual(live.weather.rng);
    }
  });

  it('a weather boosts its stats (in the breakdowns) and ends on time', () => {
    const s = sky();
    advanceWeather(s, false);
    const rate = stat(s, 'cometRate');
    const taps = stat(s, 'tapPower');
    while (!weatherNow(s)) {
      s.playtime += 5;
      advanceWeather(s, false);
    }
    if (weatherNow(s) === 'meteor') {
      expect(stat(s, 'cometRate').eq(rate.mul(W.meteor))).toBe(true);
      expect(breakdown(s, 'cometRate').some((l) => l.label === 'Meteor Shower (weather)')).toBe(true);
    } else {
      expect(stat(s, 'tapPower').eq(taps.mul(W.flare))).toBe(true);
      expect(breakdown(s, 'tapPower').some((l) => l.label === 'Solar Flare (weather)')).toBe(true);
    }
    s.playtime += weatherLeft(s);
    advanceWeather(s, false);
    expect(weatherNow(s)).toBeNull();
    expect(stat(s, 'cometRate').eq(rate)).toBe(true);
    expect(stat(s, 'tapPower').eq(taps)).toBe(true);
  });

  it('the beacon gets a charge for every 25 comets caught, stores at most 5, and never banks past that', () => {
    const s = sky();
    s.stats.comets = 24;
    advanceWeather(s, false);
    expect(s.weather.charges).toBe(0);
    expect(beaconProgress(s)).toBe(24);
    s.stats.comets = 25;
    advanceWeather(s, false);
    expect(s.weather.charges).toBe(1);
    s.stats.comets = 1000;
    advanceWeather(s, false);
    expect(s.weather.charges).toBe(5);
    expect(summonWeather(s, 'meteor')).toBe(true);
    expect(s.weather.charges).toBe(4);
    // the comets caught while full were not saved up: the next charge takes 25 more
    s.stats.comets = 1024;
    advanceWeather(s, false);
    expect(s.weather.charges).toBe(4);
    s.stats.comets = 1025;
    advanceWeather(s, false);
    expect(s.weather.charges).toBe(5);
  });

  it('a charge summons the weather you choose while the sky is clear, and the natural schedule carries on', () => {
    const s = sky();
    advanceWeather(s, false);
    expect(summonWeather(s, 'meteor')).toBe(false); // no charge
    s.weather.charges = 2;
    expect(summonWeather(s, 'aurora')).toBe(false); // not open yet
    expect(summonWeather(s, 'nonsense')).toBe(false);
    s.comet.nextAt = s.playtime + 100;
    expect(summonWeather(s, 'meteor')).toBe(true);
    expect(weatherNow(s)).toBe('meteor');
    expect(weatherLeft(s)).toBe(W.summonSeconds);
    // the shower's first comet comes at once, not after the old gap
    expect(s.comet.nextAt).toBe(s.playtime + W.hurryComet);
    expect(summonWeather(s, 'flare')).toBe(false); // one at a time
    expect(s.weather.charges).toBe(1);
    expect(s.weather.spent).toBe(1);
    // a natural weather that came due under the summoned one follows straight after it
    s.weather.next = s.playtime + 60;
    const ends = s.weather.until;
    s.playtime = ends + 0.5;
    advanceWeather(s, false);
    expect(weatherNow(s)).not.toBeNull();
    expect(s.weather.summoned).toBe(false);
    expect(s.weather.until - ends).toBeGreaterThanOrEqual(W.lastMin);
    expect(s.weather.until - ends).toBeLessThanOrEqual(W.lastMax);
  });

  it('only live weather is announced; the sky and the beacon survive a Supernova and a save', () => {
    const s = sky();
    const seen: GameEvent[] = [];
    const off = events.on((e) => {
      if (e.t === 'weather') seen.push(e);
    });
    simulateElapsed(s, 3600, { cap: 86_400, efficiency: 1, offline: true });
    expect(s.stats.weathers).toBeGreaterThan(0);
    expect(seen).toHaveLength(0);
    // into a clear sky, then summon
    while (weatherNow(s)) {
      s.playtime += 10;
      advanceWeather(s, false);
    }
    s.weather.charges = 3;
    expect(summonWeather(s, 'flare')).toBe(true);
    off();
    expect(seen).toEqual([{ t: 'weather', kind: 'flare', summoned: true }]);
    const c = clone(s);
    expect(c.weather).toEqual(s.weather);
    expect(weatherNow(c)).toBe('flare');
  });
});

/** A fleet at the Galactic Rim's tier, every sector open, the Starforge off. */
function fleet(seed = 9): GameState {
  const s = createInitialState(7_000_000, seed);
  s.tier = 11;
  s.stats.supernovas = 15;
  s.forge.on = false;
  invalidateStats();
  return s;
}
const fitted = (id: string): ShipDesign => ({ ...DEFAULT_DESIGN, [PART_BY_ID.get(id)!.slot]: id });

describe('20.4 the Ship Customizer', () => {
  it('a ship without a design (every ship in an old save) flies exactly as before', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v19.txt', 'utf8').trim());
    expect(state.ships.parts).toEqual([]);
    for (const sh of state.ships.fleet) expect(designOf(sh)).toEqual(DEFAULT_DESIGN);
    const s = fleet();
    for (const sec of SECTORS) {
      expect(designMults(DEFAULT_DESIGN, sec)).toEqual({ speed: 1, loot: 1 });
      expect(tripSeconds(s, sec)).toBe(sec.distance / stat(s, 'shipSpeed').toNumber());
      expect(tripLoot(s, sec, DEFAULT_DESIGN)).toEqual(tripLoot(s, sec));
    }
    // a bare ship and one carrying the default design: the same trips, loot and random draws
    const bare = fleet();
    const dressed = fleet();
    dressed.ships.fleet[0]!.design = { ...DEFAULT_DESIGN };
    for (const g of [bare, dressed]) {
      g.ships.upgrades.crew = 20;
      launch(g, 0, 'kuiper');
      simulateElapsed(g, 6 * 600 + 1, { cap: 86_400, efficiency: 1, offline: true });
    }
    expect(bare.stats.trips).toBe(6);
    expect(dressed.stats.trips).toBe(6);
    expect(cur(dressed, 'ore').eq(cur(bare, 'ore'))).toBe(true);
    expect(dressed.ships.rng).toEqual(bare.ships.rng);
    expect(dressed.stats.rareFinds).toBe(bare.stats.rareFinds);
  });

  it('each part changes exactly its own numbers', () => {
    const s = fleet();
    const kuiper = SECTOR_BY_ID.get('kuiper')!;
    const ember = SECTOR_BY_ID.get('ember')!;
    const rim = SECTOR_BY_ID.get('rim')!;
    const P = BALANCE.shipParts;
    expect(designMults(fitted('hull.freighter'), kuiper)).toEqual({ speed: P.freighterSpeed, loot: P.freighterLoot });
    // a matched hull: only in its own sectors
    expect(designMults(fitted('hull.icebreaker'), kuiper)).toEqual({ speed: P.fitSpeed, loot: P.fitLoot });
    expect(designMults(fitted('hull.icebreaker'), ember)).toEqual({ speed: 1, loot: 1 });
    expect(designMults(fitted('hull.heatshield'), ember)).toEqual({ speed: P.fitSpeed, loot: P.fitLoot });
    expect(designMults(fitted('hull.voidplating'), rim)).toEqual({ speed: P.fitSpeed, loot: P.fitLoot });
    expect(designMults(fitted('engine.fusion'), rim)).toEqual({ speed: 1.5, loot: 1 });
    expect(designMults(fitted('engine.warp'), rim)).toEqual({ speed: 3, loot: 0.8 });
    expect(designMults(fitted('engine.sail'), rim)).toEqual({ speed: 1.25, loot: 1.25 });
    expect(designMults(fitted('cargo.expanded'), rim)).toEqual({ speed: 0.8, loot: 2 });
    for (const id of ['cargo.vault', 'cargo.seedpod', 'scanner.deep', 'scanner.relic', 'scanner.codex']) expect(designMults(fitted(id), rim)).toEqual({ speed: 1, loot: 1 });
    expect(tripSeconds(s, rim, fitted('engine.warp'))).toBeCloseTo(tripSeconds(s, rim) / 3, 9);
    expect(tripLoot(s, rim, fitted('cargo.expanded')).alloy.eq(tripLoot(s, rim).alloy.mul(2))).toBe(true);
    expect(rareChance(s, fitted('scanner.deep'))).toBeCloseTo(rareChance(s) + 0.1, 12);
  });

  it('a Vault doubles rare finds from the same draws; the Relic Finder and Codex Scanner send them one way; a Seed Pod brings 4 seeds', () => {
    const trial = (id: string | null, extra?: (g: GameState) => void) => {
      const g = fleet();
      g.ships.upgrades.crew = 20;
      g.relics.levels[RELICS[0]!.id] = 1;
      g.codex[ELEMENTS[0]!.id] = 1;
      extra?.(g);
      if (id) g.ships.fleet[0]!.design = fitted(id);
      launch(g, 0, 'kuiper');
      simulateElapsed(g, 10 * 600 + 1, { cap: 86_400, efficiency: 1, offline: true });
      return g;
    };
    const plain = trial(null);
    const vault = trial('cargo.vault');
    expect(plain.stats.rareFinds).toBeGreaterThan(0);
    expect(vault.stats.rareFinds).toBe(2 * plain.stats.rareFinds!);
    const relic = trial('scanner.relic');
    expect(relic.codex[ELEMENTS[0]!.id]).toBe(1);
    expect(relic.relics.levels[RELICS[0]!.id]).toBe(1 + relic.stats.rareFinds!);
    const codex = trial('scanner.codex');
    expect(codex.relics.levels[RELICS[0]!.id]).toBe(1);
    expect(codex.codex[ELEMENTS[0]!.id]).toBeGreaterThan(1);
    const nursery = (g: GameState) => (g.stats.nebulasAll = 10);
    const seeds = (g: GameState) => Object.values(g.nursery.seeds).reduce((a, b) => a + b, 0);
    expect(seeds(trial('cargo.seedpod', nursery))).toBe(4 * seeds(trial(null, nursery)));
  });

  it('parts are bought once with alloy; fitting is free while docked and refused mid-trip', () => {
    const s = fleet();
    expect(buyPart(s, 'engine.fusion')).toBe(false); // no alloy
    gain(s, 'alloy.iron', D(5000));
    expect(buyPart(s, 'engine.fusion')).toBe(true);
    expect(cur(s, 'alloy.iron').toNumber()).toBe(0);
    gain(s, 'alloy.iron', D(5000));
    expect(buyPart(s, 'engine.fusion')).toBe(false); // owned
    expect(buyPart(s, 'engine.ion')).toBe(false); // a default part is owned from the start
    expect(buyPart(s, 'engine.nonsense')).toBe(false);
    expect(fitPart(s, 0, 'engine.warp')).toBe(false); // not owned
    expect(fitPart(s, 0, 'engine.fusion')).toBe(true);
    expect(designOf(s.ships.fleet[0])).toEqual(fitted('engine.fusion'));
    launch(s, 0, 'kuiper');
    expect(s.ships.fleet[0]!.design).toEqual(fitted('engine.fusion')); // a launch keeps the design
    expect(s.ships.fleet[0]!.t).toBeCloseTo(600 / 1.5, 9);
    expect(fitPart(s, 0, 'engine.ion')).toBe(false); // flying
    expect(fitBest(s, 0, 'kuiper')).toBe(false);
    expect(recallShip(s, 0)).toBe(true);
    expect(s.ships.fleet[0]!.sector).toBeNull();
    expect(fitPart(s, 0, 'engine.ion')).toBe(true);
    const c = clone(s);
    expect(c.ships.parts).toEqual(['engine.fusion']);
    expect(c.ships.fleet[0]!.design).toEqual(DEFAULT_DESIGN);
  });

  it('Best fit picks the owned hull, engine and pod with the most loot an hour, and keeps the scanner', () => {
    const s = fleet();
    s.ships.parts = ['hull.icebreaker', 'hull.freighter', 'engine.warp', 'engine.sail', 'engine.fusion', 'cargo.expanded', 'scanner.deep'];
    s.ships.fleet[0]!.design = fitted('scanner.deep');
    expect(fitBest(s, 0, 'kuiper')).toBe(true);
    expect(s.ships.fleet[0]!.design).toEqual({ hull: 'hull.icebreaker', engine: 'engine.warp', cargo: 'cargo.expanded', scanner: 'scanner.deep' });
    // away from the Ice-breaker's sectors, the Freighter carries more
    expect(bestDesign(s, SECTOR_BY_ID.get('ember')!, designOf(s.ships.fleet[0])).hull).toBe('hull.freighter');
  });

  it("the panel's loot an hour is what an hour of trips brings home", () => {
    const s = fleet();
    s.ships.parts = ['engine.fusion', 'cargo.expanded'];
    s.ships.fleet[0]!.design = { ...DEFAULT_DESIGN, engine: 'engine.fusion', cargo: 'cargo.expanded' };
    const kuiper = SECTOR_BY_ID.get('kuiper')!;
    const h = lootPerHour(s, kuiper, designOf(s.ships.fleet[0]));
    expect(h.trips).toBeCloseTo(3600 / (600 / (1.5 * 0.8)), 9);
    const trip = tripLoot(s, kuiper, designOf(s.ships.fleet[0]));
    launch(s, 0, 'kuiper');
    simulateElapsed(s, 3600 + 1, { cap: 86_400, efficiency: 1, offline: true });
    expect(s.stats.trips).toBe(Math.floor(h.trips));
    expect(cur(s, 'alloy.iron').eq(trip.alloy.mul(s.stats.trips!))).toBe(true);
    expect(h.alloy.div(trip.alloy).toNumber()).toBeCloseTo(h.trips, 9);
  });
});

/** A game past its third Singularity, with a planet and plenty of every alloy. */
function bastion(alloy = 1e9): GameState {
  const s = createInitialState(7_000_000, 31);
  s.stats.singularitiesAll = 3;
  s.planets['0.0'] = { type: 'rocky', level: 1 } as never;
  for (const a of ['alloy.iron', 'alloy.gold', 'alloy.crystal', 'alloy.prismatic', 'alloy.void']) gain(s, a, D(alloy));
  invalidateStats();
  return s;
}
const only = (kind: string, n = 12) => Array.from({ length: n }, (_, i) => (i === 0 ? kind : ''));
const hits = (kind: string, wave = 1, level = 0) => ({ [kind]: relativeHit(TURRET_BY_ID.get(kind)!.damage, level, wave) });

describe('20.5 Planet Defense', () => {
  it('opens at 3 Singularities with a planet; waves grow as planned', () => {
    const s = createInitialState(7_000_000, 31);
    s.stats.singularitiesAll = 3;
    expect(defenseOpen(s)).toBe(false); // no planet yet
    s.planets['0.0'] = { type: 'rocky', level: 1 } as never;
    expect(defenseOpen(s)).toBe(true);
    expect(swarmCount(1)).toBe(8);
    expect(swarmCount(20)).toBe(18);
    expect(swarmCount(500)).toBe(60);
    expect([hasArmour(5), hasArmour(6), hasBoss(10), hasBoss(15)]).toEqual([true, false, true, false]);
    // health and damage are relative to the wave: no Infinity or NaN at any wave or level
    for (const [wave, level] of [[1, 0], [6000, 0], [6000, 10_000], [1e6, 5]] as const) expect(Number.isFinite(relativeHit(12, level, wave))).toBe(true);
  });

  it('the panel replays exactly the battle the engine scored', () => {
    const setup = { wave: 7, seed: 99, sockets: ['laser', '', 'flak', '', 'frost', '', 'prism', '', 'lance', '', '', ''], hit: { ...hits('laser', 7), ...hits('flak', 7), ...hits('frost', 7), ...hits('prism', 7), ...hits('lance', 7) } };
    const scored = runBattle(setup);
    const watched = createBattle(setup);
    let shots = 0;
    while (!watched.done) {
      stepBattle(watched);
      shots += watched.shots.length;
    }
    expect({ win: watched.win, seconds: watched.t, kills: watched.kills, leaks: watched.leaks }).toEqual(scored);
    expect(shots).toBeGreaterThan(0);
    expect(runBattle(setup)).toEqual(scored); // and again: a pure function
  });

  it('each turret does what it says', () => {
    const firstShot = (kind: string) => {
      const b = createBattle({ wave: 3, seed: 5, sockets: only(kind), hit: hits(kind, 3) });
      const before = () => Array.from(b.hp);
      let prev = before();
      while (!b.done) {
        stepBattle(b);
        if (b.shots.length > 0) break;
        prev = before();
      }
      const damaged = [...b.hp.keys()].filter((i) => b.hp[i]! < prev[i]!);
      return { b, shot: b.shots[0]!, damaged };
    };
    const laser = firstShot('laser');
    expect(laser.shot.to).toHaveLength(1);
    expect(laser.damaged).toHaveLength(1);
    const flak = firstShot('flak');
    const [fx, fy] = flak.shot.to[0]!;
    for (const i of flak.damaged) expect(Math.hypot(flak.b.x[i]! - fx, flak.b.y[i]! - fy)).toBeLessThanOrEqual(TURRET_BY_ID.get('flak')!.splash! + 1e-9);
    const frost = firstShot('frost');
    for (const i of frost.damaged) expect(frost.b.slowUntil[i]).toBeGreaterThan(frost.b.t);
    const prism = firstShot('prism');
    expect(prism.damaged.length).toBeLessThanOrEqual(3);
    expect(prism.shot.to.length).toBe(prism.damaged.length);
    const lance = firstShot('lance');
    const s0 = socketAt(0);
    const [lx, ly] = lance.shot.to[0]!;
    const len = Math.hypot(lx - s0.x, ly - s0.y);
    for (const i of lance.damaged) {
      const px = lance.b.x[i]! - s0.x;
      const py = lance.b.y[i]! - s0.y;
      expect(Math.abs((px * (ly - s0.y) - py * (lx - s0.x)) / len)).toBeLessThanOrEqual(TURRET_BY_ID.get('lance')!.pierce! + 1e-9);
    }
    // an armoured swarmer takes half damage; a slowed one moves at half speed
    expect(BALANCE.defense.armourTaken).toBe(0.5);
    expect(TURRET_BY_ID.get('frost')!.slow).toBe(0.5);
  });

  it('wave 500 simulates in under 50 ms', () => {
    const sockets = ['laser', 'flak', 'frost', 'prism', 'lance', 'laser', 'flak', 'frost', 'prism', 'lance', 'laser', 'flak'];
    const hit: Record<string, number> = {};
    for (const k of new Set(sockets)) hit[k] = relativeHit(TURRET_BY_ID.get(k)!.damage, 1000, 500);
    runBattle({ wave: 500, seed: 1, sockets, hit }); // warm up the JIT
    const t0 = performance.now();
    const r = runBattle({ wave: 500, seed: 2, sockets, hit });
    expect(performance.now() - t0).toBeLessThan(50);
    expect(r.win).toBe(true);
  });

  it('turrets cost alloy, clearing one pays it back, and levels buy in bulk', () => {
    const s = bastion(1000);
    expect(placeCost(s, 'laser').toNumber()).toBe(200);
    expect(placeTurret(s, 0, 'laser')).toBe(true);
    expect(placeTurret(s, 0, 'flak')).toBe(false); // taken
    expect(placeCost(s, 'laser').toNumber()).toBe(800);
    expect(cur(s, 'alloy.iron').toNumber()).toBe(800);
    expect(clearSocket(s, 0)).toBe(true);
    expect(cur(s, 'alloy.iron').toNumber()).toBe(1000);
    placeTurret(s, 0, 'laser');
    s.settings.buyAmount = 'max';
    expect(buyTurretLevels(s, 'laser')).toBe(true);
    // 50 x 1.4^k summed: as many as 800 Iron buys
    expect(s.defense.levels.laser).toBe(5);
    const c = clone(s);
    expect(c.defense).toEqual(s.defense);
  });

  it('a win sets a new best with lasting boosts; a loss costs nothing', () => {
    const s = bastion();
    expect(fightWave(s)).toBeNull(); // nothing placed
    const dust = stat(s, 'productionMult');
    placeTurret(s, 0, 'laser');
    const r = fightWave(s)!;
    expect(r.result.win).toBe(true);
    expect(s.defense.best).toBe(1);
    expect(stat(s, 'productionMult').eq(dust.mul(1 + BALANCE.defense.stardustPerBest))).toBe(true);
    expect(breakdown(s, 'planetPower').some((l) => l.label === 'Planet Defense')).toBe(true);
    // fight until a loss: the best stays, nothing is spent
    let last = r;
    while (last.result.win) last = fightWave(s)!;
    const best = s.defense.best;
    const alloy = cur(s, 'alloy.iron');
    expect(fightWave(s)!.result.win).toBe(false);
    expect(s.defense.best).toBe(best);
    expect(cur(s, 'alloy.iron').eq(alloy)).toBe(true);
  });

  it('auto-defend pushes on, then farms its best wave for alloy, offline too', () => {
    const s = bastion();
    for (let i = 0; i < 4; i++) placeTurret(s, i * 3, 'laser');
    s.defense.levels.laser = 6;
    while (fightWave(s)!.result.win);
    const best = s.defense.best;
    expect(best).toBeGreaterThanOrEqual(BALANCE.defense.autoFrom);
    setDefenseAuto(s, true);
    expect(s.defense.auto).toBe(true);
    const lose = battleResult(battleSetup(s, best + 1));
    const farm = battleResult(battleSetup(s, best));
    expect(lose.win).toBe(false);
    const iron = cur(s, 'alloy.iron');
    simulateElapsed(s, lose.seconds + 10 * farm.seconds + 1, { cap: 86_400, efficiency: 1, offline: true });
    expect(s.defense.best).toBe(best);
    expect(s.defense.lost).not.toBe('');
    expect(s.stats.defenseWins).toBe(10);
    expect(cur(s, 'alloy.iron').sub(iron).eq(winAlloy(s, best)[0]!.amount.mul(10))).toBe(true);
    // stronger turrets: it pushes on again by itself
    s.defense.levels.laser = 40;
    advanceDefense(s, 3600, 1);
    expect(s.defense.best).toBeGreaterThan(best);
  });
});

describe('20.6 the Hidden Sigils', () => {
  it('each hides between two real nodes of its tree and bends real stats', () => {
    expect(SIGILS).toHaveLength(7);
    expect(new Set(SIGILS.map((x) => x.tree)).size).toBe(7);
    for (const def of SIGILS) {
      for (const id of def.between) expect(SIGIL_TREES[def.tree].node(id), `${def.id}: ${id}`).toBeDefined();
      for (const e of def.effects) expect(isStat(e.stat), e.stat).toBe(true);
    }
  });

  it('shows only once both nodes beside it are owned, then costs x10 their price, x100 per sigil owned', () => {
    const s = fresh();
    const greed = SIGIL_BY_ID.get('sigil.greed')!;
    gain(s, 'shards', D('1e40'));
    expect(sigilRevealed(s, greed)).toBe(false);
    expect(buySigil(s, greed.id)).toBe(false);
    s.novaTree['strike.11'] = 1;
    expect(sigilRevealed(s, greed)).toBe(false);
    s.novaTree['strike.12'] = 1;
    expect(sigilRevealed(s, greed)).toBe(true);
    const base = greed.between.reduce((a, id) => a + SIGIL_TREES.nova.node(id)!.cost, 0);
    expect(sigilPrice(s, greed).eq(D(base).mul(10))).toBe(true);
    const before = cur(s, 'shards');
    expect(buySigil(s, greed.id)).toBe(true);
    expect(cur(s, 'shards').eq(before.sub(D(base).mul(10)))).toBe(true);
    expect(buySigil(s, greed.id)).toBe(false); // once
    const sloth = SIGIL_BY_ID.get('sigil.sloth')!;
    const chartBase = sloth.between.reduce((a, id) => a + SIGIL_TREES.starChart.node(id)!.cost, 0);
    expect(sigilPrice(s, sloth).eq(D(chartBase).mul(10).mul(100))).toBe(true);
  });

  it('works only while switched on (in the breakdowns), switching is free, and it lasts through resets and saves', () => {
    const s = fresh();
    gain(s, 'shards', D('1e40'));
    s.novaTree['strike.11'] = 1;
    s.novaTree['strike.12'] = 1;
    const crit = stat(s, 'critMult');
    const dust = stat(s, 'productionMult');
    buySigil(s, 'sigil.greed');
    expect(stat(s, 'critMult').eq(crit.mul(BALANCE.sigils.greedCrit))).toBe(true);
    expect(stat(s, 'productionMult').eq(dust.mul(BALANCE.sigils.greedDust))).toBe(true);
    expect(breakdown(s, 'critMult').some((l) => l.label === 'Sigil of Greed')).toBe(true);
    const shards = cur(s, 'shards');
    expect(toggleSigil(s, 'sigil.greed')).toBe(true);
    expect(stat(s, 'critMult').eq(crit)).toBe(true);
    expect(cur(s, 'shards').eq(shards)).toBe(true);
    expect(toggleSigil(s, 'sigil.wrath')).toBe(false); // not owned
    toggleSigil(s, 'sigil.greed');
    const c = clone(s);
    expect(c.sigils).toEqual({ owned: ['sigil.greed'], on: ['sigil.greed'] });
    expect(c.stats.sigils).toBe(1);
  });
});
