import type { Decimal } from './decimal';
import { events } from './events';
import { gain, type GameState } from './state';
import { invalidateStats } from './stats';

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
  /** Runs after the reset (rewards that aren't the layer's currency, like Starsmith XP). */
  onReset?: (s: GameState) => void;
}

const layers = new Map<string, LayerDef>();

export function registerLayer(def: LayerDef): void {
  layers.set(def.id, def);
}

export function layer(id: string): LayerDef | undefined {
  return layers.get(id);
}

export const resetsDone = (s: GameState, def: LayerDef): number => s.stats[def.counter] ?? 0;

export function milestoneReached(s: GameState, layerId: string, milestoneId: string): boolean {
  const def = layers.get(layerId);
  const m = def?.milestones.find((x) => x.id === milestoneId);
  return !!def && !!m && resetsDone(s, def) >= m.at;
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

/** The one reset function. Returns the gain, or null if the layer isn't ready. */
export function performReset(s: GameState, id: string): Decimal | null {
  const def = layers.get(id);
  if (!def || !def.ready(s)) return null;
  const amount = def.gain(s);
  // decide what is kept BEFORE anything changes, so parts can't affect each other's rules
  const keep = def.parts.map((p) => !!p.keptBy?.(s));
  gain(s, def.currency, amount);
  s.stats[def.counter] = resetsDone(s, def) + 1;
  def.parts.forEach((p, i) => {
    if (!keep[i]) p.reset(s);
  });
  s.lastResetAt[id] = s.playtime;
  def.onReset?.(s);
  // every stat depends on what was just reset: nothing may read a cached value from the old run
  invalidateStats();
  events.emit({ t: 'reset', layer: id, gain: amount });
  return amount;
}
