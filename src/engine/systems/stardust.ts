import { BALANCE } from '../../content/balance';
import { ENGINES } from '../../content/engines';
import { TIERS, tierCost } from '../../content/tiers';
import type { CostCurve } from '../cost';
import { makeEngineLayer } from '../engineKit';
import { D, type Decimal, ZERO } from '../decimal';
import { events } from '../events';
import { nextFloat } from '../rng';
import { cur, gain, type GameState, spend } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { giveXp } from './starsmith';

/**
 * Layer 0: the Star Core, the 15 engines and the 12 Star Tiers.
 * Stats: tapPower, critChance, critMult, productionMult, engineMult.<id>, stardustPerSec.
 */

// ---------- engines ----------

/** The Stardust layer's engines run on the shared engine kit (the Antimatter Mirror is its second user). */
const WITH_HELIUM = [...BALANCE.engines.milestones, BALANCE.codex.heliumMilestone].sort((a, b) => a - b);

/** Engine milestone counts: helium in the Codex adds one more. */
export const engineMilestones = (s?: GameState): readonly number[] => (s && (s.codex.he ?? 0) > 0 ? WITH_HELIUM : BALANCE.engines.milestones);

export const STARDUST_ENGINES = makeEngineLayer({
  id: 'stardust',
  label: 'Stardust',
  currency: 'stardust',
  engines: ENGINES,
  brackets: [
    { from: 0, ratio: BALANCE.engines.ratio },
    { from: BALANCE.engines.steepFrom, ratio: BALANCE.engines.steepRatio },
  ],
  owned: (s) => s.engines,
  ever: (s) => s.enginesEver,
  stats: { engineMult: 'engineMult.', layerMult: 'productionMult', perSec: 'stardustPerSec', costMult: 'engineCostMult', milestoneBase: 'milestoneBase' },
  milestones: engineMilestones,
  onBuy: (s, _id, count) => {
    s.stats.enginesBought = (s.stats.enginesBought ?? 0) + count;
    giveXp(s, BALANCE.starsmith.xp.engine * count);
  },
  order: 10,
});

export const engineCurve = (id: string): CostCurve => STARDUST_ENGINES.curve(id);
export const owned = (s: GameState, id: string): number => STARDUST_ENGINES.owned(s, id);

/** How many output doublings an engine has at `n` owned. */
export const milestonesReached = (n: number, s?: GameState): number => STARDUST_ENGINES.milestonesReached(n, s);

/** The next milestone above `n`, and the one before it (for the progress bar). Null past the last. */
export const milestoneSpan = (n: number, s?: GameState): { from: number; to: number } | null => STARDUST_ENGINES.milestoneSpan(n, s);

/** Stardust per second from ONE of this engine, with every multiplier. */
export const engineEach = (s: GameState, id: string): Decimal => STARDUST_ENGINES.each(s, id);
/** Everything one kind of engine makes together, and what buying `count` more adds (a second). */
export const engineTotal = (s: GameState, id: string): Decimal => STARDUST_ENGINES.total(s, id);
export const engineAdds = (s: GameState, id: string, count: number): Decimal => STARDUST_ENGINES.adds(s, id, count);

/** An engine is shown once the one before it has ever been owned; the next one is a "???" row. */
export const engineRevealed = (s: GameState, index: number): boolean => STARDUST_ENGINES.revealed(s, index);

/** Buys exactly `count` of an engine if the Stardust covers the exact total. */
export const buyEngine = (s: GameState, id: string, count: number): boolean => STARDUST_ENGINES.buy(s, id, count);

// ---------- star tiers ----------

export const MAX_TIER = TIERS.length - 1;

export function nextTierCost(s: GameState): Decimal | null {
  return s.tier >= MAX_TIER ? null : D(tierCost(s.tier + 1)).mul(stat(s, 'tierCostMult'));
}

export function evolve(s: GameState): boolean {
  const price = nextTierCost(s);
  if (!price || !spend(s, 'stardust', price)) return false;
  s.tier += 1;
  s.stats.evolves = (s.stats.evolves ?? 0) + 1;
  giveXp(s, BALANCE.starsmith.xp.evolve);
  events.emit({ t: 'tierUp', tier: s.tier });
  return true;
}

// ---------- tapping ----------

/** Session-only tap state: combo and the 30-a-second limit. Not saved. */
export interface TapRuntime {
  combo: number;
  lastTapMs: number;
  recent: number[];
  /** Pulse: the last beat that has had its one graded tap. */
  pulseBeat?: number;
}

export function createTapRuntime(): TapRuntime {
  return { combo: 0, lastTapMs: 0, recent: [] };
}

/** The combo count right now, after draining for any pause since the last tap. */
export function comboNow(rt: TapRuntime, nowMs: number, drainMult = 1): number {
  const t = BALANCE.tap;
  const idle = (nowMs - rt.lastTapMs) / 1000 - t.comboGraceSeconds;
  return idle > 0 ? Math.max(0, rt.combo - idle * t.comboDrainPerSecond * drainMult) : rt.combo;
}

/** x1.5 / x2 / x3 at 10 / 25 / 50 taps; `power` scales the bonus part (Fever Pitch: x1.75 / x2.5 / x4). */
export function comboMult(combo: number, power = 1): number {
  let m = 1;
  for (const step of BALANCE.tap.combo) if (combo >= step.taps) m = step.mult;
  return 1 + (m - 1) * power;
}

/**
 * What one tap gives before combo and crit: tap power ((1 + additions) x tier x multipliers),
 * plus a share of Stardust per second added AFTER the multipliers (Starstrike and friends).
 */
export function tapValue(s: GameState): Decimal {
  return stat(s, 'tapPower').add(stat(s, 'stardustPerSec').mul(stat(s, 'tapSpsShare')));
}

export interface TapResult {
  amount: Decimal;
  crit: boolean;
  combo: number;
  /** Pulse grade of this tap ('Perfect', 'Off beat'...), when Pulse is equipped. */
  grade?: string;
}

/**
 * Attunements change tapping without stardust.ts knowing them: a cap on taps a second, and hooks
 * that see every tap and return a multiplier for it (0 = the tap gives nothing) and a label.
 */
export const tapRules: {
  cap: Array<(s: GameState) => number>;
  hooks: Array<(s: GameState, rt: TapRuntime, nowMs: number) => { mult: number; grade?: string }>;
} = { cap: [], hooks: [] };

/** One tap on the Star Core. Returns null when the 30-taps-a-second limit drops it. */
export function tapStar(s: GameState, rt: TapRuntime, nowMs: number): TapResult | null {
  const t = BALANCE.tap;
  while (rt.recent.length && nowMs - rt.recent[0]! >= 1000) rt.recent.shift();
  const cap = tapRules.cap.reduce<number>((c, f) => Math.min(c, f(s)), t.maxPerSecond);
  if (rt.recent.length >= cap) return null;
  rt.recent.push(nowMs);

  rt.combo = comboNow(rt, nowMs, stat(s, 'comboDrain').toNumber()) + 1;
  rt.lastTapMs = nowMs;
  if (rt.combo > (s.stats.maxCombo ?? 0)) s.stats.maxCombo = Math.floor(rt.combo);

  const crit = nextFloat(s.rng) < stat(s, 'critChance').toNumber();
  let amount = tapValue(s).mul(comboMult(rt.combo, stat(s, 'comboPower').toNumber()));
  if (crit) amount = amount.mul(stat(s, 'critMult'));
  let grade: string | undefined;
  for (const h of tapRules.hooks) {
    const r = h(s, rt, nowMs);
    if (r.mult !== 1) amount = amount.mul(r.mult);
    grade ??= r.grade;
  }
  gain(s, 'stardust', amount);
  s.stats.taps = (s.stats.taps ?? 0) + 1;
  giveXp(s, BALANCE.starsmith.xp.tap);
  if (crit) s.stats.crits = (s.stats.crits ?? 0) + 1;
  events.emit({ t: 'tap', amount, crit });
  return { amount, crit, combo: rt.combo, ...(grade ? { grade } : {}) };
}

// ---------- registration ----------

const tierMult = (s: GameState): Decimal => D(BALANCE.tiers.mult).pow(s.tier);

export function registerStardust(): void {
  defineStat({ id: 'tapPower', label: 'Tap power', base: () => D(BALANCE.tap.base) });
  defineStat({ id: 'tapSpsShare', label: 'Share of Stardust per second added to each tap', base: () => ZERO });
  defineStat({ id: 'critChance', label: 'Crit chance', base: () => ZERO });
  defineStat({ id: 'critMult', label: 'Crit multiplier', base: () => D(BALANCE.tap.critMult) });
  defineStat({ id: 'productionMult', label: 'Production multiplier', base: () => D(1) });
  defineStat({ id: 'engineCostMult', label: 'Engine prices', base: () => D(1) });
  defineStat({ id: 'milestoneBase', label: 'Engine milestone multiplier', base: () => D(2) });
  defineStat({ id: 'tierCostMult', label: 'Evolve prices', base: () => D(1) });
  defineStat({ id: 'comboPower', label: 'Combo bonus', base: () => D(1) });
  defineStat({ id: 'comboDrain', label: 'Combo drain speed', base: () => D(1) });
  // stardustPerSec itself is defined in core.ts; its base is the sum of the engines.
  registerSources(
    { id: 'tier.tap', stat: 'tapPower', op: 'mul', label: 'Star Tier', value: tierMult },
    { id: 'tier.prod', stat: 'productionMult', op: 'mul', label: 'Star Tier', value: tierMult },
    {
      id: 'goldensun.crit',
      stat: 'critChance',
      op: 'add',
      label: 'Golden Sun',
      value: () => D(BALANCE.tap.critChance),
      active: (s) => s.tier >= BALANCE.tap.critTier,
    },
  );
  STARDUST_ENGINES.register();
}

export const stardust = (s: GameState): Decimal => cur(s, 'stardust');
