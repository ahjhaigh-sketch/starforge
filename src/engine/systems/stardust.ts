import { BALANCE } from '../../content/balance';
import { ENGINE_BY_ID, ENGINES } from '../../content/engines';
import { TIERS, tierCost } from '../../content/tiers';
import { bulkCost, type CostCurve } from '../cost';
import { D, type Decimal, ZERO } from '../decimal';
import { events } from '../events';
import { nextFloat } from '../rng';
import { cur, gain, type GameState, spend } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';

/**
 * Layer 0: the Star Core, the 15 engines and the 12 Star Tiers.
 * Stats: tapPower, critChance, critMult, productionMult, engineMult.<id>, stardustPerSec.
 */

// ---------- engines ----------

const curves = new Map<string, CostCurve>();

export function engineCurve(id: string): CostCurve {
  let c = curves.get(id);
  if (!c) {
    const def = ENGINE_BY_ID.get(id);
    if (!def) throw new Error(`Unknown engine ${id}`);
    const e = BALANCE.engines;
    c = { base: def.baseCost, brackets: [{ from: 0, ratio: e.ratio }, { from: e.steepFrom, ratio: e.steepRatio }] };
    curves.set(id, c);
  }
  return c;
}

export const owned = (s: GameState, id: string): number => s.engines[id] ?? 0;

/** How many output doublings an engine has at `n` owned. */
export function milestonesReached(n: number): number {
  let m = 0;
  for (const at of BALANCE.engines.milestones) if (n >= at) m++;
  return m;
}

/** The next milestone above `n`, and the one before it (for the progress bar). Null past the last. */
export function milestoneSpan(n: number): { from: number; to: number } | null {
  const ms = BALANCE.engines.milestones;
  for (let i = 0; i < ms.length; i++) if (n < ms[i]!) return { from: i === 0 ? 0 : ms[i - 1]!, to: ms[i]! };
  return null;
}

/** Stardust per second from ONE of this engine, with every multiplier. */
export function engineEach(s: GameState, id: string): Decimal {
  const def = ENGINE_BY_ID.get(id)!;
  return D(def.baseProd).mul(stat(s, `engineMult.${id}`)).mul(stat(s, 'productionMult'));
}

/** An engine is shown once the one before it has ever been owned; the next one is a "???" row. */
export function engineRevealed(s: GameState, index: number): boolean {
  if (index === 0) return true;
  const prev = ENGINES[index - 1];
  return !!prev && (s.enginesEver[prev.id] ?? 0) > 0;
}

/** Buys exactly `count` of an engine if the Stardust covers the exact total. */
export function buyEngine(s: GameState, id: string, count: number): boolean {
  if (count < 1 || !ENGINE_BY_ID.has(id)) return false;
  const index = ENGINES.findIndex((e) => e.id === id);
  if (!engineRevealed(s, index)) return false;
  const price = bulkCost(engineCurve(id), owned(s, id), count).mul(stat(s, 'engineCostMult'));
  if (!spend(s, 'stardust', price)) return false;
  s.engines[id] = owned(s, id) + count;
  s.enginesEver[id] = (s.enginesEver[id] ?? 0) + count;
  s.stats.enginesBought = (s.stats.enginesBought ?? 0) + count;
  events.emit({ t: 'purchase', kind: 'engine', id, amount: count });
  return true;
}

// ---------- star tiers ----------

export const MAX_TIER = TIERS.length - 1;

export function nextTierCost(s: GameState): Decimal | null {
  return s.tier >= MAX_TIER ? null : D(tierCost(s.tier + 1));
}

export function evolve(s: GameState): boolean {
  const price = nextTierCost(s);
  if (!price || !spend(s, 'stardust', price)) return false;
  s.tier += 1;
  s.stats.evolves = (s.stats.evolves ?? 0) + 1;
  events.emit({ t: 'tierUp', tier: s.tier });
  return true;
}

// ---------- tapping ----------

/** Session-only tap state: combo and the 30-a-second limit. Not saved. */
export interface TapRuntime {
  combo: number;
  lastTapMs: number;
  recent: number[];
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

export interface TapResult {
  amount: Decimal;
  crit: boolean;
  combo: number;
}

/** One tap on the Star Core. Returns null when the 30-taps-a-second limit drops it. */
export function tapStar(s: GameState, rt: TapRuntime, nowMs: number): TapResult | null {
  const t = BALANCE.tap;
  while (rt.recent.length && nowMs - rt.recent[0]! >= 1000) rt.recent.shift();
  if (rt.recent.length >= t.maxPerSecond) return null;
  rt.recent.push(nowMs);

  rt.combo = comboNow(rt, nowMs, stat(s, 'comboDrain').toNumber()) + 1;
  rt.lastTapMs = nowMs;
  if (rt.combo > (s.stats.maxCombo ?? 0)) s.stats.maxCombo = Math.floor(rt.combo);

  const crit = nextFloat(s.rng) < stat(s, 'critChance').toNumber();
  let amount = stat(s, 'tapPower').mul(comboMult(rt.combo, stat(s, 'comboPower').toNumber()));
  if (crit) amount = amount.mul(stat(s, 'critMult'));
  gain(s, 'stardust', amount);
  s.stats.taps = (s.stats.taps ?? 0) + 1;
  if (crit) s.stats.crits = (s.stats.crits ?? 0) + 1;
  events.emit({ t: 'tap', amount, crit });
  return { amount, crit, combo: rt.combo };
}

// ---------- registration ----------

const tierMult = (s: GameState): Decimal => D(BALANCE.tiers.mult).pow(s.tier);

export function registerStardust(): void {
  defineStat({ id: 'tapPower', label: 'Tap power', base: () => D(BALANCE.tap.base) });
  defineStat({ id: 'critChance', label: 'Crit chance', base: () => ZERO });
  defineStat({ id: 'critMult', label: 'Crit multiplier', base: () => D(BALANCE.tap.critMult) });
  defineStat({ id: 'productionMult', label: 'Production multiplier', base: () => D(1) });
  defineStat({ id: 'engineCostMult', label: 'Engine prices', base: () => D(1) });
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
    {
      id: 'engines.sps',
      stat: 'stardustPerSec',
      op: 'add',
      label: 'Engines',
      value: (s) => {
        let total = ZERO;
        for (const e of ENGINES) {
          const n = owned(s, e.id);
          if (n > 0) total = total.add(D(e.baseProd).mul(n).mul(stat(s, `engineMult.${e.id}`)));
        }
        return total;
      },
    },
    { id: 'prod.sps', stat: 'stardustPerSec', op: 'mul', label: 'Production multiplier', value: (s) => stat(s, 'productionMult') },
  );
  for (const e of ENGINES) {
    defineStat({ id: `engineMult.${e.id}`, label: `${e.name} multiplier`, base: () => D(1) });
    registerSources({
      id: `milestones.${e.id}`,
      stat: `engineMult.${e.id}`,
      op: 'mul',
      label: 'Milestones',
      value: (s) => D(2).pow(milestonesReached(owned(s, e.id))),
    });
  }
  registerSystem({
    id: 'stardust.production',
    order: 10,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      const sps = stat(s, 'stardustPerSec');
      if (sps.gt(0)) gain(s, 'stardust', sps.mul(dt * ctx.gainScale));
    },
  });
}

export const stardust = (s: GameState): Decimal => cur(s, 'stardust');
