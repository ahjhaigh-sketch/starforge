import { D, type Decimal } from './decimal';
import { seedRng, type RngState } from './rng';

/** Bump with every change to the save's shape, and add a migration + an old-save fixture test. */
export const SAVE_VERSION = 15;
/** A new Fusion board is 3 x 3 (BALANCE.fusion.baseSize). */
const BALANCE_FUSION_CELLS = 9;

export type Notation = 'suffix' | 'scientific' | 'engineering';
/** 'next' buys up to the next milestone (an engine's next x2, a constant's next doubling). */
export type BuyAmount = 1 | 10 | 100 | 1000 | 'max' | 'custom' | 'next';

/** A Star Quest on the board (see engine/systems/quests.ts). */
export interface QuestState {
  kind: 'taps' | 'engines' | 'comets' | 'stardust' | 'crits' | 'own' | 'upgrades' | 'evolve';
  engine?: string;
  start: number;
  need: number;
  startD?: Decimal;
  needD?: Decimal;
}

export interface Settings {
  notation: Notation;
  autosaveSeconds: number;
  reducedMotion: boolean;
  reduceFlashing: boolean;
  muted: boolean;
  volumeMaster: number;
  volumeSfx: number;
  volumeMusic: number;
  confirmResets: boolean;
  buyAmount: BuyAmount;
  customBuyAmount: number;
  showToasts: boolean;
  hotkeys: boolean;
}

export interface GameState {
  version: number;
  createdAt: number;
  /** Wall-clock ms of the last simulated tick. Gaps are measured from here. */
  lastTick: number;
  lastSave: number;
  /** Seconds simulated, all time. */
  playtime: number;
  rng: RngState;
  currencies: Record<string, Decimal>;
  totals: {
    /** Gained since the last reset of the layer that resets that currency. */
    run: Record<string, Decimal>;
    all: Record<string, Decimal>;
  };
  /** Plain counters for the Stats screen (taps, purchases, comets caught...). */
  stats: Record<string, number>;
  /** Star Tier, 0 = Protostar. */
  tier: number;
  /** Engines owned this run, by engine ID. */
  engines: Record<string, number>;
  /** Engines ever bought, by engine ID (Engine Mastery reads this; never reset). */
  enginesEver: Record<string, number>;
  /** Systems whose unlock requirement has been met at least once (unlocks are permanent). */
  unlocked: string[];
  /** Unlocked systems the player has opened; the rest pulse on the rails. */
  seen: string[];
  /** One-off upgrades bought (IDs). */
  upgrades: string[];
  /** Medals earned (achievement IDs). Never reset. */
  achievements: string[];
  /** Highest tier reached on each Goal. Never reset. */
  goals: Record<string, number>;
  /** Active buffs: the playtime second each one ends (simulated time, so offline stays consistent). */
  buffs: Record<string, number>;
  /** Playtime when the next comet streaks across, and until when the current one can be caught. */
  comet: { nextAt: number; until: number };
  /** Playtime of the last rolling backup. */
  lastBackupAt: number;
  /** Cosmic Constant levels, by ID. */
  constants: Record<string, number>;
  /** Planets by slot ("ring.slot"). */
  planets: Record<string, { type: string; level: number }>;
  /** The Star Quest board. */
  quests: QuestState[];
  /** Playtime of each layer's last reset (run length, Quick Burn). */
  lastResetAt: Record<string, number>;
  /** Nova Tree nodes owned, by ID, with their level (repeatable nodes go past 1). */
  novaTree: Record<string, number>;
  /** Auto-buyer switches and how much of your Stardust each may spend (1, 0.5, 0.1). */
  auto: Record<string, { on: boolean; spend: number }>;
  /** The Asteroid Belt: upgrade levels, Belt Tier, and the asteroids in the field (ids and rarities). */
  belt: {
    upgrades: Record<string, number>;
    tier: number;
    /** Asteroids in the field: id, rarity and (from 3 Nebulas) a mutation, 1 Golden to 4 Prismatic. */
    field: Array<{ id: number; r: number; m?: number }>;
    nextId: number;
    spawnAcc: number;
    droneAcc: number;
    oreThisTier: Decimal;
    /** The Belt's own random stream, so asteroids never shift the rolls of comets, crits or runes. */
    rng: RngState;
  };
  /** Deep Core Drilling: depth, damage on the current core, drones, bits and ore mastery. */
  drill: { depth: number; damage: Decimal; drones: number; bits: number; mastery: Record<string, number> };
  /** Starsmith perk points spent, by perk ID. */
  starsmith: { perks: Record<string, number> };
  /**
   * The Starforge furnace: the grade it smelts, whether it's running, upgrade levels, and every
   * batch in a crucible with the ore it took and the alloy it will give (so a reload loses nothing).
   */
  forge: {
    grade: string;
    on: boolean;
    upgrades: Record<string, number>;
    lanes: Array<{ grade: string; ore: Decimal; alloy: Decimal; t: number }>;
    /** Share of newly mined common ore the hopper takes (1, 0.5, 0.1), so Belt upgrades keep the rest. */
    share: number;
    /** Common ore the hopper may still take, and all-time ore last counted. */
    allowance: Decimal;
    seen: Decimal;
  };
  /** Relic levels (0 = not crafted) and which are equipped. */
  relics: { levels: Record<string, number>; equipped: string[] };
  /** Element Codex: samples of each element, by element ID. */
  codex: Record<string, number>;
  /** Comet Fusion: the board (comet level per cell, 0 = empty), upgrades, spawn progress and best level made. */
  fusion: { board: number[]; upgrades: Record<string, number>; acc: number; best: number; autoOwned: boolean; autoOn: boolean; spawned: number };
  /** Star Pulse Attunements: unlocked and equipped, the Pulse rating memory, the heart meter, the Chaos Die. */
  attune: { unlocked: string[]; equipped: string[]; pulse: number[]; heart: number; chaosTaps: number; chaos: { id: string; until: number } | null; rng: RngState };
  /** The Wandering Merchant: today's deals, Merchant Luck, rerolls since the last Supernova, its own random stream. */
  merchant: { deals: Deal[]; luck: number; rerolls: number; rng: RngState };
  /** Starship Expeditions: each ship's destination and time left, and fleet upgrades. */
  ships: { fleet: Array<{ sector: string | null; t: number; auto: boolean }>; upgrades: Record<string, number>; rng: RngState };
  /** Nebula Tree node levels. */
  nebulaTree: Record<string, number>;
  /** Nebula settings: auto-Supernova when the gain reaches this many shards (0 = off). */
  nebula: { autoAt: Decimal };
  /** Constellation Runes: each shrine's settings and progress, copies of every rune, the rune stream. */
  runes: { shrines: Record<string, ShrineState>; copies: Record<string, Decimal>; rng: RngState; stars: Record<string, number> };
  /** Celestial Auras: copies found, the one equipped, auto-rolling dice, and their own stream. */
  auras: { copies: Record<string, Decimal>; equipped: string | null; auto: boolean; rng: RngState };
  /** Mutations: mutated copies of each rune by mutation, asteroids harvested by rarity.mutation, their own stream. */
  mutations: { runes: Record<string, Record<string, Decimal>>; asteroids: Record<string, number>; others: Record<string, number>; rng: RngState };
  /** Void Wyrms: stacks of identical Wyrms ("species|form|mutation"), stack levels, the team, eggs hatched, variants found. */
  wyrms: { stacks: Record<string, Decimal>; levels: Record<string, number>; team: string[]; eggs: number; found: string[]; catchAcc: number; rng: RngState };
  /** The Star Nursery: plots (species and seconds grown), seeds, upgrades, species grown. */
  nursery: { plots: Array<{ species: string | null; t: number }>; seeds: Record<string, number>; upgrades: Record<string, number>; found: string[]; rng: RngState };
  /** Spectral Focus: energy of each colour, the colour in focus, upgrades. */
  spectral: { energy: Record<string, Decimal>; focus: string | null; upgrades: Record<string, number> };
  /** Tarot of the Void: cards owned, the deck (null = empty slot), packs opened, the Gambler's current roll. */
  tarot: { owned: string[]; deck: Array<string | null>; packs: number; gamble: number; rng: RngState };
  /** The Singularity: the Event Horizon key (bought once with Embers) and the auto-Nebula threshold. */
  singularity: { key: boolean; autoAt: Decimal };
  singularityTree: Record<string, number>;
  /** The Black Hole: mass, the share of Stardust fed to it; the Prism Wheel; the Dark Matter Reactor. */
  blackHole: { mass: Decimal; dustShare: number };
  wheel: { on: boolean; shares: number[]; banks: Record<string, Decimal> };
  reactor: { charge: Decimal };
  /** Trials: levels earned, the Trials running now (one, or a Fusion of several), when they began, Fast Nova and Fusion bests. */
  trials: { levels: Record<string, number>; active: string[]; start: number; fastBest: number; fusionBest: number; auto: boolean };
  /** The Spire: floors cleared, damage on the floor you're on, whether you're climbing, the banner you show. */
  spire: { floor: number; damage: Decimal; climbing: boolean; banner: string | null };
  /** The Void Leviathans: times each was beaten, which one you face, damage dealt to it, whether you're fighting. */
  leviathans: { kills: Record<string, number>; current: number; damage: Decimal; fighting: boolean };
  scaleTree: Record<string, number>;
  /** Phase 14: the Antimatter Mirror (its own engines, collapse depth and upgrades) and the Wormhole Network. */
  mirror: { engines: Record<string, number>; ever: Record<string, number>; depth: number; upgrades: string[] };
  wormholes: { links: Array<{ from: string; to: string; share: number }> };
  settings: Settings;
}

/** One rune shrine: auto-roll, the share of your speed it uses, luck turned down, the keep filter. */
export interface ShrineState {
  auto: boolean;
  /** Share of your roll speed to use (0 to 1). */
  rate: number;
  /** Share of your luck to use (0 to 1): turn it down to farm commons. */
  luck: number;
  /** Auto-roll keeps runes of this rarity and up (0 = keep everything). */
  keep: number;
  /** Fraction of a rune carried to the next tick. */
  acc: number;
  /** Rolls since the shrine's rarest visible rune (hard pity). */
  pity: Decimal;
  rolled: Decimal;
}

/** One Merchant offer: pay this, get that. Amounts are fixed when the deal appears. */
export interface Deal {
  kind: string;
  quality: 'common' | 'rare' | 'mythical';
  pay: { currency: string; amount: Decimal };
  get: { currency?: string; amount?: Decimal; id?: string; count?: number };
}

export function defaultSettings(): Settings {
  return {
    notation: 'suffix',
    autosaveSeconds: 15,
    reducedMotion: false,
    reduceFlashing: false,
    muted: false,
    volumeMaster: 0.8,
    volumeSfx: 0.8,
    volumeMusic: 0.5,
    confirmResets: true,
    buyAmount: 1,
    customBuyAmount: 25,
    showToasts: true,
    hotkeys: true,
  };
}

export function createInitialState(now: number = Date.now(), seed: number = now): GameState {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastTick: now,
    lastSave: 0,
    playtime: 0,
    rng: seedRng(seed),
    currencies: { stardust: D(0), shards: D(0) },
    totals: {
      run: { stardust: D(0), shards: D(0) },
      all: { stardust: D(0), shards: D(0) },
    },
    stats: { taps: 0, crits: 0, enginesBought: 0, evolves: 0, comets: 0, maxCombo: 0, questsDone: 0, supernovas: 0, bestTier: 0, harvested: 0, spawned: 0 },
    tier: 0,
    engines: {},
    enginesEver: {},
    unlocked: [],
    seen: [],
    upgrades: [],
    achievements: [],
    goals: {},
    buffs: {},
    comet: { nextAt: 90, until: 0 },
    lastBackupAt: 0,
    constants: {},
    planets: {},
    quests: [],
    lastResetAt: {},
    novaTree: {},
    auto: {},
    belt: { upgrades: {}, tier: 0, field: [], nextId: 1, spawnAcc: 0, droneAcc: 0, oreThisTier: D(0), rng: seedRng(seed ^ 0x5eed_be17) },
    drill: { depth: 0, damage: D(0), drones: 0, bits: 0, mastery: {} },
    starsmith: { perks: {} },
    forge: { grade: 'iron', on: true, upgrades: {}, lanes: [], share: 0.5, allowance: D(0), seen: D(0) },
    relics: { levels: {}, equipped: [] },
    codex: {},
    fusion: { board: new Array<number>(BALANCE_FUSION_CELLS).fill(0), upgrades: {}, acc: 0, best: 0, autoOwned: false, autoOn: true, spawned: 0 },
    attune: { unlocked: ['pulse'], equipped: [], pulse: [], heart: 0, chaosTaps: 0, chaos: null, rng: seedRng(seed ^ 0x0c4a_05d1) },
    merchant: { deals: [], luck: 0, rerolls: 0, rng: seedRng(seed ^ 0x3e7c_4a17) },
    ships: { fleet: [{ sector: null, t: 0, auto: true }], upgrades: {}, rng: seedRng(seed ^ 0x5417_9e11) },
    nebulaTree: {},
    nebula: { autoAt: D(0) },
    runes: { shrines: {}, copies: {}, rng: seedRng(seed ^ 0x7b3f_d611), stars: {} },
    auras: { copies: {}, equipped: null, auto: false, rng: seedRng(seed ^ 0x0a4a_51d3) },
    mutations: { runes: {}, asteroids: {}, others: {}, rng: seedRng(seed ^ 0x3d7a_7e05) },
    wyrms: { stacks: {}, levels: {}, team: [], eggs: 0, found: [], catchAcc: 0, rng: seedRng(seed ^ 0x77c3_9a01) },
    nursery: { plots: [], seeds: {}, upgrades: {}, found: [], rng: seedRng(seed ^ 0x5eed_0b10) },
    spectral: { energy: {}, focus: null, upgrades: {} },
    tarot: { owned: [], deck: [], packs: 0, gamble: 1, rng: seedRng(seed ^ 0x7a20_7c4d) },
    singularity: { key: false, autoAt: D(0) },
    singularityTree: {},
    blackHole: { mass: D(0), dustShare: 0 },
    wheel: { on: false, shares: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1], banks: {} },
    reactor: { charge: D(0) },
    trials: { levels: {}, active: [], start: 0, fastBest: -1, fusionBest: 0, auto: false },
    spire: { floor: 0, damage: D(0), climbing: false, banner: null },
    leviathans: { kills: {}, current: 0, damage: D(0), fighting: false },
    scaleTree: {},
    mirror: { engines: {}, ever: {}, depth: 0, upgrades: [] },
    wormholes: { links: [] },
    settings: defaultSettings(),
  };
}

/** Adds an amount of a currency, counting it toward this-run and all-time totals. */
export function gain(s: GameState, currency: string, amount: Decimal): void {
  if (amount.lte(0)) return;
  s.currencies[currency] = (s.currencies[currency] ?? D(0)).add(amount);
  s.totals.run[currency] = (s.totals.run[currency] ?? D(0)).add(amount);
  s.totals.all[currency] = (s.totals.all[currency] ?? D(0)).add(amount);
}

/** Spends if affordable; returns whether it did. */
export function spend(s: GameState, currency: string, amount: Decimal): boolean {
  const have = s.currencies[currency] ?? D(0);
  if (have.lt(amount)) return false;
  s.currencies[currency] = have.sub(amount);
  return true;
}

export function cur(s: GameState, currency: string): Decimal {
  return s.currencies[currency] ?? D(0);
}
