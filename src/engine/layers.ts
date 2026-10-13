import { BALANCE } from '../content/balance';
import { LAYER_COUNTERS } from '../content/layers';
import { D, type Decimal } from './decimal';
import { events } from './events';
import { gain, type GameState, trimKept } from './state';
import { invalidateStats, stat } from './stats';

/**
 * Reset layers (Tech tab, "Reset layers"). Each layer is a definition: its currency, when it is
 * ready, how much it gives, what it resets (and what can keep each part), and its milestones.
 * ONE function performs every reset (CLAUDE.md rule 6), so adding a layer is mostly data.
 * A reset uses no randomness: the same state in always gives the same state out.
 */
export interface ResetPart {
  id: string;
  /** What the confirm screen calls it: "Engines", "Star Tier". */
  label: string;
  reset: (s: GameState) => void;
  /** Why this part is kept this time ("Milestone: 8 Supernovas"), or null if it resets. */
  keptBy?: (s: GameState) => string | null;
}

export interface LayerMilestone {
  at: number;
  id: string;
  text: string;
}

/** The run as it stood just before a reset. */
export interface ResetBefore {
  tier: number;
  runStardust: Decimal;
  /** log10 of Stardust per second just before the reset (1.2.0: sizes the next Supernova). */
  rateLog?: number;
  /** What this reset gave (the layer's currency). */
  gained: Decimal;
}

export interface LayerDef {
  id: string;
  name: string;
  /** "Go Supernova": the button's verb phrase. */
  action: string;
  currency: string;
  color: string;
  /** state.stats key that counts this layer's resets. */
  counter: string;
  ready: (s: GameState) => boolean;
  gain: (s: GameState) => Decimal;
  parts: readonly ResetPart[];
  /** Always kept, listed on the confirm screen so nobody fears losing them. */
  alwaysKept: readonly string[];
  milestones: readonly LayerMilestone[];
  /** A count this layer's milestones never drop below (a Nebula keeps Supernova milestones). */
  milestoneFloor?: (s: GameState) => number;
  /**
   * Runs after the reset: rewards that aren't the layer's currency (Starsmith XP, Codex samples).
   * `before` is what the run reached, since the reset has already cleared it.
   */
  onReset?: (s: GameState, before: ResetBefore) => void;
}

const layers = new Map<string, LayerDef>();

export function registerLayer(def: LayerDef): void {
  layers.set(def.id, def);
}

export function layer(id: string): LayerDef | undefined {
  return layers.get(id);
}

/** The Echo boards' resets (Phase 17): small layers inside the Big Crunch that the real game's hooks, toasts and effects ignore. */
export const isEchoLayer = (id: string): boolean => id === 'echoNova' || id === 'echoNebula';

export const resetsDone = (s: GameState, def: LayerDef): number => s.stats[def.counter] ?? 0;

export function milestoneReached(s: GameState, layerId: string, milestoneId: string): boolean {
  const def = layers.get(layerId);
  const m = def?.milestones.find((x) => x.id === milestoneId);
  return !!def && !!m && Math.max(resetsDone(s, def), def.milestoneFloor?.(s) ?? 0) >= m.at;
}

export interface ResetPreview {
  gain: Decimal;
  resets: string[];
  kept: Array<{ label: string; why: string }>;
}

/** Exactly what the reset would do right now, for the confirm screen. */
export function resetPreview(s: GameState, id: string): ResetPreview | null {
  const def = layers.get(id);
  if (!def) return null;
  const resets: string[] = [];
  const kept: Array<{ label: string; why: string }> = [];
  for (const p of def.parts) {
    const why = p.keptBy?.(s) ?? null;
    if (why) kept.push({ label: p.label, why });
    else resets.push(p.label);
  }
  for (const label of def.alwaysKept) kept.push({ label, why: 'Always kept' });
  return { gain: def.gain(s), resets, kept };
}

/** Systems that react to any reset (a new Merchant ship docks after a Supernova). */
const resetHooks: Array<(s: GameState, layerId: string, before: ResetBefore) => void> = [];
export function onAnyReset(fn: (s: GameState, layerId: string, before: ResetBefore) => void): void {
  resetHooks.push(fn);
}

/** Systems that must see the run before it's reset (a Trial is judged on the run it ends). */
const beforeHooks: Array<(s: GameState, layerId: string) => void> = [];
export function onBeforeReset(fn: (s: GameState, layerId: string) => void): void {
  beforeHooks.push(fn);
}

/** 1.3.0: log10 of the best gain a layer's reset has paid (kept in stats as a plain number), or null before the first. */
export function bestGainLog(s: GameState, id: string): number | null {
  const v = s.stats[`bestGain.${id}`];
  return typeof v === 'number' ? v : null;
}

/**
 * 1.3.0: true when this reset would pay under 1% of the layer's best (the playtest's first Singularity
 * paid 52 billion Dark Matter and the next ones about 1,000, because they ran on passive Essence alone).
 */
export function weakReset(s: GameState, id: string, gain: Decimal): boolean {
  const best = bestGainLog(s, id);
  return best !== null && best >= 2 && gain.add(1).log10().toNumber() < best - BALANCE.recommend.weakOoM;
}

/** 1.4.0: the reset ceiling's order of magnitude and margin for a layer with `done` resets ever (see BALANCE.resetCeiling). */
export function ceilingFor(done: number): { c: number; a: number } | null {
  const R = BALANCE.resetCeiling;
  const g = R.growth ** done;
  const c = R.capLog * g;
  return Number.isFinite(c) && c < 1e6 ? { c, a: R.margin * g } : null;
}

const resetsEver = (s: GameState, layerId: string): number => s.stats[`${LAYER_COUNTERS[layerId]?.all ?? layerId}`] ?? 0;

/**
 * 1.4.0, the reset ceiling: what a reset of this layer really pays for a gain worked out as `raw`. Up to
 * 10^(c - a) nothing changes; above, the order of magnitude x becomes c - a^2 / (a + x - (c - a)), which
 * leaves at slope 1 and never reaches c.
 */
export function resetCeiling(s: GameState, layerId: string, raw: Decimal): Decimal {
  const cap = ceilingFor(resetsEver(s, layerId));
  if (!cap || raw.lte(1)) return raw;
  const x = raw.log10().toNumber();
  const x0 = cap.c - cap.a;
  if (x <= x0) return raw;
  return D(10).pow(cap.c - (cap.a * cap.a) / (cap.a + x - x0)).floor();
}

/** The raw gain that the ceiling turns into `out` (its inverse, for "next one at" read-outs); Infinity past the ceiling. */
export function unResetCeiling(s: GameState, layerId: string, out: Decimal): Decimal {
  const cap = ceilingFor(resetsEver(s, layerId));
  if (!cap || out.lte(1)) return out;
  const y = out.log10().toNumber();
  const x0 = cap.c - cap.a;
  if (y <= x0) return out;
  if (y >= cap.c) return D(Infinity);
  return D(10).pow(x0 + (cap.a * cap.a) / (cap.c - y) - cap.a);
}

/** Whether the ceiling is holding this reset back now (for the reset screens). */
export const ceilingBites = (s: GameState, layerId: string, raw: Decimal): boolean => resetCeiling(s, layerId, raw).lt(raw.floor());

/** The one reset function. Returns the gain, or null if the layer isn't ready. */
export function performReset(s: GameState, id: string): Decimal | null {
  const def = layers.get(id);
  if (!def || !def.ready(s)) return null;
  for (const h of beforeHooks) h(s, id);
  const amount = def.gain(s);
  // decide what is kept BEFORE anything changes, so parts can't affect each other's rules
  const keep = def.parts.map((p) => !!p.keptBy?.(s));
  // only a Supernova needs the rate (it sizes the next one), and working it out is a full stat rebuild
  const sps = id === 'supernova' ? stat(s, 'stardustPerSec') : null;
  const before: ResetBefore = { tier: s.tier, runStardust: s.totals.run.stardust ?? D(0), gained: amount, rateLog: sps?.gt(0) ? sps.log10().toNumber() : 0 };
  gain(s, def.currency, amount);
  s.stats[def.counter] = resetsDone(s, def) + 1;
  if (amount.gt(0)) s.stats[`bestGain.${id}`] = Math.max(bestGainLog(s, id) ?? 0, amount.add(1).log10().toNumber());
  def.parts.forEach((p, i) => {
    if (!keep[i]) p.reset(s);
  });
  s.lastResetAt[id] = s.playtime;
  def.onReset?.(s, before);
  // 1.5.0: a reset that kept part of a currency leaves its safe tenth a tenth of what's left
  trimKept(s);
  for (const h of resetHooks) h(s, id, before);
  // every stat depends on what was just reset: nothing may read a cached value from the old run
  invalidateStats();
  events.emit({ t: 'reset', layer: id, gain: amount });
  return amount;
}
