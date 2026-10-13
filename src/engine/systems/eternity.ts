import { BALANCE } from '../../content/balance';
import { ETERNITY_BY_ID, ETERNITY_UPGRADES, type EternityUpgrade } from '../../content/crunch';
import { type AutoLayer, LAYER_IDS } from '../../content/layers';
import { D, type Decimal, ZERO } from '../decimal';
import { events } from '../events';
import { milestoneReached, onAnyReset } from '../layers';
import { automating, fullyAutomated, layerAutoSetting, registerEarlyAuto, setLayerAuto, type LayerAutoSetting } from '../layerAuto';
import { automatedSpend, cur, free, type GameState, spend } from '../state';
import { invalidateStats, registerSources } from '../stats';
import { reactorOpen } from './blackhole';

export { automating };

/**
 * Eternity (Game design: "Big Crunch"): upgrades bought with Chronons, and the rules automated layers
 * reset on. 1.4.0: layers run themselves once you've passed them (systems/layerAuto), so of the five
 * upgrades that automated a layer, Eternal Galaxy now runs all of the Galactic layer early and the
 * other four are boosts. Every automated layer has a switch and a rule for when it resets:
 * - "double": once the reset would at least double what this run has gathered of its currency, or
 *   once the run's gain per second starts to fall (waiting longer would only slow you down); and
 *   as soon as it is ready once the layer's reset is free (its "resets nothing" milestone one layer
 *   up). Passive income can make a run's total dwarf any one reset, so a free layer must not wait;
 * - "amount": once the reset gives at least a number you set.
 * Automation acts once a game second (at most 4 times a real second) and never cuts an unfinished Trial short.
 */
const ET = BALANCE.eternity;

export type EternityAuto = LayerAutoSetting;

export const eternityOpen = (s: GameState) => (s.stats.crunchesAll ?? 0) >= 1;
export const hasEternity = (s: GameState, id: string) => s.eternity.upgrades.includes(id);

export function canBuyEternity(s: GameState, u: EternityUpgrade): boolean {
  return eternityOpen(s) && !hasEternity(s, u.id) && cur(s, 'chronons').gte(u.cost);
}

export function buyEternity(s: GameState, id: string): boolean {
  const u = ETERNITY_BY_ID.get(id);
  if (!u || !canBuyEternity(s, u) || !spend(s, 'chronons', D(u.cost))) return false;
  s.eternity.upgrades.push(id);
  s.stats.eternityUpgrades = s.eternity.upgrades.length;
  invalidateStats();
  events.emit({ t: 'purchase', kind: 'eternity', id, amount: 1 });
  return true;
}

/** A layer's automation switch and rule (1.4.0: the layer automation's, systems/layerAuto). */
export const eternityAuto = (s: GameState, layer: AutoLayer): EternityAuto => layerAutoSetting(s, layer);
export const setEternityAuto = (s: GameState, layer: AutoLayer, patch: Partial<EternityAuto>): void => setLayerAuto(s, layer, patch);

/** The layers whose reset starts a run of each layer (its own and every higher one). */
const RESET_ORDER: readonly string[] = LAYER_IDS.slice(1);

/** The best gain a second each layer's current run has shown (not saved: relearned after a reload). */
const bestRates = new WeakMap<GameState, Map<string, { since: number; rate: Decimal }>>();

/**
 * Whether this run's gain per second has started to fall (below 90% of its best, after the first
 * few seconds): waiting longer would only slow you down. Without it, passive income that grows the
 * run total as fast as the gain (passive shards, trickles) could keep "double" waiting for ever.
 */
export function gainPeaked(s: GameState, layer: string, gain: Decimal): boolean {
  const since = Math.max(...RESET_ORDER.slice(Math.max(0, RESET_ORDER.indexOf(layer))).map((l) => s.lastResetAt[l] ?? 0));
  const secs = s.playtime - since;
  let runs = bestRates.get(s);
  if (!runs) bestRates.set(s, (runs = new Map()));
  let best = runs.get(layer);
  if (!best || best.since !== since) runs.set(layer, (best = { since, rate: ZERO }));
  const rate = gain.div(Math.max(1, secs));
  if (rate.gt(best.rate)) best.rate = rate;
  return secs >= ET.peakAfter && rate.lt(best.rate.mul(ET.peakShare));
}

/** A layer whose reset resets nothing (the milestone one layer up): waiting would gain nothing. */
const FREE: Partial<Record<AutoLayer, (s: GameState) => boolean>> = {
  supernova: (s) => milestoneReached(s, 'nebula', 'novaFree'),
  nebula: (s) => milestoneReached(s, 'singularity', 'nebulaFree'),
  singularity: (s) => milestoneReached(s, 'galactic', 'singularityFree'),
  galactic: (s) => milestoneReached(s, 'crunch', 'galacticFree'),
};
export const resetIsFree = (s: GameState, layer: AutoLayer): boolean => FREE[layer]?.(s) ?? false;

/** Whether the layer's rule says to reset now, given the gain and the run total of its currency. */
export function ruleSaysGo(s: GameState, layer: AutoLayer, gain: Decimal, currency: string): boolean {
  if (gain.lt(1)) return false;
  const a = eternityAuto(s, layer);
  if (a.mode === 'amount') return gain.gte(a.at);
  if (resetIsFree(s, layer)) return true;
  const peaked = gainPeaked(s, layer, gain);
  return peaked || gain.gte(s.totals.run[currency] ?? ZERO);
}

// ---------- the Eternal Void hook and the upgrades' boosts ----------

export function registerEternity(): void {
  registerSources(
    ...ETERNITY_UPGRADES.filter((u) => u.effect).map((u) => ({
      id: `eternity.${u.id}`,
      stat: u.effect!.stat,
      op: u.effect!.op,
      label: `${u.name} (Eternity)`,
      value: () => D(u.effect!.value),
      active: (s: GameState) => hasEternity(s, u.id),
    })),
  );
  // 1.4.0: Eternal Galaxy runs all of the Galactic layer before the Multiverse would (the four below it run
  // themselves two layers up, so their upgrades became boosts)
  registerEarlyAuto('galactic', (s) => hasEternity(s, 'et.galaxy'));
  // Eternal Void: a tenth of each Singularity's Dark Matter charges the Reactor once all of the Singularity layer runs
  // itself (one layer up it fed the Reactor from the first Galactic Rebirth, and Dark Matter ran away: the simulator)
  onAnyReset((s, layerId, before) => {
    if (layerId !== 'singularity' || !fullyAutomated(s, 'singularity') || !reactorOpen(s) || before.gained.lte(0)) return;
    automatedSpend('Automation: the Reactor', () => {
      const feed = before.gained.mul(0.1).floor().min(free(s, 'darkMatter').floor());
      if (feed.gte(1) && spend(s, 'darkMatter', feed)) s.reactor.charge = s.reactor.charge.add(feed);
    });
  });
}
