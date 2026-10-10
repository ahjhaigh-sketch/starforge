import { D, type Decimal } from './decimal';
import { seedRng, type RngState } from './rng';

/** Bump with every change to the save's shape, and add a migration + an old-save fixture test. */
export const SAVE_VERSION = 4;

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
  settings: Settings;
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
    currencies: { stardust: D(0) },
    totals: {
      run: { stardust: D(0) },
      all: { stardust: D(0) },
    },
    stats: { taps: 0, crits: 0, enginesBought: 0, evolves: 0, comets: 0, maxCombo: 0, questsDone: 0 },
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
