import { AUTO_LAYERS, type AutoLayer, LAYER_COLORS, LAYER_NAMES, layerIndex, LAYER_IDS } from '../content/layers';
import { BALANCE } from '../content/balance';
import { CONSTANT_SETS } from '../content/constants';
import { AUTO_BUYERS, autoSetting, autoUnlocked } from '../engine/systems/automation';
import { constantSetAuto } from '../engine/systems/constants';
import { galacticTree } from '../engine/systems/galactic';
import { singularityTree } from '../engine/systems/singularity';
import { reqMet, reqText } from '../engine/systems/unlocks';
import { autoLevel, entryRunning, layerAutoEntries, layerAutoSetting, reachedLayer } from '../engine/layerAuto';
import { format } from '../ui/format';
import { game } from './game';

/**
 * 1.4.0: the Automation menu's "Layers that run themselves": each layer you've passed, how far it runs
 * itself, its switch and reset rule, and which of its systems run now (and which wait for the next layer).
 */
export interface LayerAutoRow {
  layer: AutoLayer;
  name: string;
  color: string;
  /** 0: not yet; 1: one layer up (all but its last few things); 2: two layers up (all of it). */
  level: 0 | 1 | 2;
  on: boolean;
  mode: 'double' | 'amount';
  at: string;
  /** What reaching it needs, for a layer not running yet; and what the next level needs. */
  needs: string;
  running: string[];
  waiting: string[];
  /** Whether it has a reset of its own (the Stardust layer doesn't). */
  resets: boolean;
}

const nameOf = (i: number) => LAYER_NAMES[LAYER_IDS[i]!];

export function layerAutoReport(): LayerAutoRow[] {
  const s = game.state;
  const r = reachedLayer(s);
  const rows: LayerAutoRow[] = [];
  for (const layer of AUTO_LAYERS) {
    const i = layerIndex(layer);
    // the layers running now, and the next one (so there is always something to reach for)
    if (i > r) break;
    const level = autoLevel(s, layer);
    const st = layerAutoSetting(s, layer);
    const entries = layerAutoEntries(layer);
    const running = entries.filter((e) => entryRunning(s, e)).map((e) => e.name);
    const waiting = entries.filter((e) => !entryRunning(s, e)).map((e) => e.name);
    const needs =
      level === 0
        ? `Runs itself from your first ${nameOf(i + 1)}`
        : level === 1
          ? `All of it from your first ${nameOf(Math.min(LAYER_IDS.length - 1, i + 2))}`
          : 'All of it runs itself';
    rows.push({ layer, name: LAYER_NAMES[layer], color: LAYER_COLORS[layer], level, on: st.on, mode: st.mode, at: st.at.gt(0) ? format(st.at, s.settings.notation) : '', needs, running, waiting, resets: layer !== 'stardust' });
  }
  return rows;
}

/** 1.5.0: who buys a constant set by itself now, and its own switch (shown on every Constants panel and in Automation). */
export interface ConstantAuto {
  set: string;
  name: string;
  open: boolean;
  on: boolean;
  /** What is buying it ('' when nothing yet), or what would. */
  why: string;
}

export function constantAutoState(set: string): ConstantAuto {
  const s = game.state;
  const def = CONSTANT_SETS.find((x) => x.id === set);
  const on = constantSetAuto(s, set);
  const who: string[] = [];
  const ac = AUTO_BUYERS.find((a) => a.id === 'auto.constants')!;
  if (autoUnlocked(s, ac) && autoSetting(s, ac.id).on) who.push('Auto-Constants');
  const e = layerAutoEntries().find((x) => x.id === `constants.${set}`);
  if (e && entryRunning(s, e)) who.push(set === 'nebula' && singularityTree.flag(s, 'autoNebulaConstants') > 0 ? 'the Nebula Constant Engine' : galacticTree.flag(s, 'autoConstants') > 0 ? 'the Constant Engine' : `the ${def?.name.replace(' Constants', '')} layer running itself`);
  const why = !on
    ? 'Switched off: only your own purchases buy these.'
    : who.length
      ? `Buying by itself: ${who.join(' and ')}.`
      : `Not yet: Auto-Constants unlocks at ${BALANCE.automation.unlockAt.constants} lifetime Supernovas${set === 'nebula' ? '; the Nebula Constant Engine (Singularity Tree)' : ''}; the Constant Engine (Galactic Tree) runs every set.`;
  return { set, name: def?.name ?? set, open: !!def && reqMet(s, def.req), on, why };
}

export const constantAutoReport = (): ConstantAuto[] => CONSTANT_SETS.map((x) => constantAutoState(x.id)).filter((x) => x.open);

/** 1.5.0: a tree's auto-buyer, for the switch beside its Buy all. */
export function treeAutoState(tree: string): { on: boolean; unlocked: boolean; req: string } {
  const s = game.state;
  const a = AUTO_BUYERS.find((x) => x.id === `auto.${tree}`);
  if (!a) return { on: false, unlocked: false, req: '' };
  return { on: autoSetting(s, a.id).on, unlocked: autoUnlocked(s, a), req: a.req ? reqText(a.req) : '' };
}
