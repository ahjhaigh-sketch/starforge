import { AUTO_LAYERS, type AutoLayer, LAYER_COLORS, LAYER_NAMES, layerIndex, LAYER_IDS } from '../content/layers';
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
