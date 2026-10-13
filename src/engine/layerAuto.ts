import { AUTO_LAYERS, type AutoLayer, LAYER_COUNTERS, LAYER_IDS, layerIndex } from '../content/layers';
import { type Decimal, ZERO } from './decimal';
import { events } from './events';
import { automatedSpend, type GameState } from './state';
import { registerSystem, type TickContext, upkeepDue } from './tick';

/**
 * 1.4.0: layers you've passed run themselves (the playtest: "By the time you're two reset layers above
 * something, it should be far automated. Even one reset layer above should be automated").
 * - One layer up (level 1): the layer's reset on its rule, its tree, its constants and its main systems;
 *   its last few things wait (milestones of the layer above can bring them in early).
 * - Two layers up (level 2): everything in it, and its menus tuck away.
 * Each system registers what "running itself" means for it (registerLayerAuto); one pass of every
 * switched-on layer runs once a game second, highest layer first (a higher reset makes lower ones moot),
 * and buys all it can at once (never gradually), inside automatedSpend so the safe tenth stays.
 */

/** The furthest layer reached: the highest with at least one reset ever (0 before the first Supernova). */
export function reachedLayer(s: GameState): number {
  let r = 0;
  for (let i = 1; i < LAYER_IDS.length; i++) if ((s.stats[LAYER_COUNTERS[LAYER_IDS[i]!]!.all] ?? 0) >= 1) r = i;
  return r;
}

/** Things that make a layer fully automated sooner (Eternity's Eternal Galaxy). Registered by their systems. */
const early: Array<{ layer: AutoLayer; full: (s: GameState) => boolean }> = [];
export function registerEarlyAuto(layer: AutoLayer, full: (s: GameState) => boolean): void {
  early.push({ layer, full });
}

/** How far a layer runs itself: 0 not yet, 1 one layer up (all but its last few things), 2 two layers up (all of it). */
export function autoLevel(s: GameState, layer: AutoLayer): 0 | 1 | 2 {
  const i = layerIndex(layer);
  const r = reachedLayer(s);
  if (r >= i + 2 || early.some((e) => e.layer === layer && e.full(s))) return 2;
  return r >= i + 1 ? 1 : 0;
}

export interface LayerAutoSetting {
  on: boolean;
  /** "double": reset once it would at least double the run's currency (or its rate falls); "amount": once the gain reaches `at`. */
  mode: 'double' | 'amount';
  at: Decimal;
}

/** A layer's switch and reset rule (on, "double", until you change it). Kept in the Eternity state, where it began. */
export function layerAutoSetting(s: GameState, layer: AutoLayer): LayerAutoSetting {
  return s.eternity.auto[layer] ?? { on: true, mode: 'double', at: ZERO };
}

export function setLayerAuto(s: GameState, layer: AutoLayer, patch: Partial<LayerAutoSetting>): void {
  const next = { ...layerAutoSetting(s, layer), ...patch };
  if (next.mode !== 'double' && next.mode !== 'amount') next.mode = 'double';
  if (!next.at.gte(0)) next.at = ZERO;
  s.eternity.auto[layer] = next;
}

/** Whether a layer is running itself right now (reached and switched on). */
export const automating = (s: GameState, layer: AutoLayer): boolean => autoLevel(s, layer) > 0 && layerAutoSetting(s, layer).on;
/** Whether all of a layer runs itself (two layers up, or early) and it's switched on. */
export const fullyAutomated = (s: GameState, layer: AutoLayer): boolean => autoLevel(s, layer) >= 2 && layerAutoSetting(s, layer).on;

export interface LayerAutoEntry {
  /** The system it runs ("starforge"): the menu that tucks away when the layer fully runs itself. */
  id: string;
  name: string;
  layer: AutoLayer;
  /** 1: runs one layer up; 2: only two layers up (the layer's last few things). */
  level: 1 | 2;
  /** A milestone that brings it in sooner (Galactic milestone 6 runs the Mirror). */
  sooner?: (s: GameState) => boolean;
  /** At most once this many game seconds (systems whose own purchases needn't be checked every second). */
  every?: number;
  run: (s: GameState) => void;
}

/** When each slow entry last ran, in game seconds (not saved). */
const lastRuns = new WeakMap<GameState, Map<LayerAutoEntry, number>>();

const entries: LayerAutoEntry[] = [];

export function registerLayerAuto(...list: LayerAutoEntry[]): void {
  for (const e of list) if (!entries.some((x) => x.id === e.id && x.layer === e.layer)) entries.push(e);
}

export const layerAutoEntries = (layer?: AutoLayer): readonly LayerAutoEntry[] => (layer ? entries.filter((e) => e.layer === layer) : entries);

/** Whether this entry runs now: its layer is switched on, and reached far enough (or a milestone brings it in). */
export function entryRunning(s: GameState, e: LayerAutoEntry): boolean {
  if (!layerAutoSetting(s, e.layer).on) return false;
  return autoLevel(s, e.layer) >= e.level || !!e.sooner?.(s);
}

/** Whether a system's menu runs itself: every entry for it is running. */
export function systemRunsItself(s: GameState, id: string): boolean {
  const list = entries.filter((e) => e.id === id);
  return list.length > 0 && list.every((e) => entryRunning(s, e));
}

/** 1.4.0: whether a system's menu can tuck away: all of its layer runs itself (two layers up) and it's switched on. */
export function systemFullyAutomated(s: GameState, id: string): boolean {
  const list = entries.filter((e) => e.id === id);
  return list.length > 0 && list.every((e) => fullyAutomated(s, e.layer));
}

/** Catch-up steps since the slower entries last ran (not saved). */
const catchUpSkip = new WeakMap<GameState, number>();

/**
 * One pass: every running entry, highest layer first. In a catch-up the slower entries join every third step.
 * With `part` (0 to 3), only every fourth entry from that one: online the pass is spread over four upkeeps a
 * second, so no one frame carries all of it (found by the speed budgets).
 */
export function runLayerAutomation(s: GameState, catchUp = false, part?: number): void {
  let slowNow = true;
  if (catchUp) {
    const n = (catchUpSkip.get(s) ?? 0) + 1;
    slowNow = n >= 3;
    catchUpSkip.set(s, slowNow ? 0 : n);
  }
  events.automated(() => {
    for (let i = AUTO_LAYERS.length - 1; i >= 0; i--) {
      const layer = AUTO_LAYERS[i]!;
      for (let k = 0; k < entries.length; k++) {
        const e = entries[k]!;
        if (part !== undefined && k % PARTS !== part) continue;
        if (e.layer !== layer || !entryRunning(s, e)) continue;
        if (e.every && !slowNow) continue;
        if (e.every && !catchUp) {
          let m = lastRuns.get(s);
          if (!m) lastRuns.set(s, (m = new Map()));
          const last = m.get(e);
          if (last !== undefined && s.playtime >= last && s.playtime - last < e.every) continue;
          m.set(e, s.playtime);
        }
        automatedSpend(`Automation: ${e.name}`, () => e.run(s));
      }
    }
  });
}

/** Online, the pass comes in this many parts, one an upkeep (four a second). */
const PARTS = 4;
/** Which part each game runs next (not saved). */
const nextPart = new WeakMap<GameState, number>();

export function registerLayerAutomation(): void {
  registerSystem({
    id: 'layerAuto',
    order: 69,
    tick: (s: GameState, _dt: number, ctx: TickContext) => {
      // four upkeeps a real second, a quarter of the entries each (every entry about once a second); a catch-up step
      // is a long stretch, so it runs them all
      if (!upkeepDue(s, 'layerAuto', ctx, 0.25)) return;
      if (reachedLayer(s) === 0 && !early.some((e) => e.full(s))) return;
      if (ctx.catchUp) return runLayerAutomation(s, true);
      // a tick of a second or more (a long frame) covers every part at once
      if ((ctx.realDt ?? 0) >= 1) return runLayerAutomation(s, false);
      const part = nextPart.get(s) ?? 0;
      nextPart.set(s, (part + 1) % PARTS);
      runLayerAutomation(s, false, part);
    },
  });
}

/** For "x of y" read-outs: how many of a layer's entries run now. */
export function layerAutoCount(s: GameState, layer: AutoLayer): { running: number; total: number } {
  const list = layerAutoEntries(layer);
  return { running: list.filter((e) => entryRunning(s, e)).length, total: list.length };
}

