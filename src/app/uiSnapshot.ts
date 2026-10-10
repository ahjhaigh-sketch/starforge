import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { cur } from '../engine/state';
import { stat } from '../engine/stats';
import type { BuyAmount, Notation } from '../engine/state';
import { format, formatRate, formatTime } from '../ui/format';
import { game } from './game';

/**
 * A flat object of pre-formatted strings and small values, rebuilt 10 times a second (and right
 * after every command). Components select single fields; strings compare cheaply, so nothing
 * re-renders unless what it shows changed. The UI never reads GameState directly.
 */
export interface Snapshot {
  notation: Notation;
  dust: string;
  dustRate: string;
  playtime: string;
  saveLabel: string;
  saveBlocked: string | null;
  buyAmount: BuyAmount;
  customBuyAmount: number;
  reducedMotion: boolean;
  reduceFlashing: boolean;
  tickMs: string;
}

export function buildSnapshot(): Snapshot {
  const s = game.state;
  const n = s.settings.notation;
  const since = s.lastSave ? (Date.now() - s.lastSave) / 1000 : -1;
  return {
    notation: n,
    dust: format(cur(s, 'stardust'), n),
    dustRate: formatRate(stat(s, 'stardustPerSec'), n),
    playtime: formatTime(s.playtime),
    saveLabel: game.saveBlocked
      ? 'Saving paused'
      : game.lastSaveError
        ? 'Save failed'
        : since < 0
          ? 'Not saved yet'
          : since < 2
            ? 'Saved'
            : `Saved ${formatTime(since)} ago`,
    saveBlocked: game.saveBlocked,
    buyAmount: s.settings.buyAmount,
    customBuyAmount: s.settings.customBuyAmount,
    reducedMotion: s.settings.reducedMotion,
    reduceFlashing: s.settings.reduceFlashing,
    tickMs: game.tickMs.toFixed(2),
  };
}

export const snapshotStore = createStore<Snapshot>(() => buildSnapshot());

export function publish(): void {
  snapshotStore.setState(buildSnapshot());
}

/** Select ONE primitive field (or use useShallow): a new object per call loops forever. */
export function useSnap<T>(selector: (s: Snapshot) => T): T {
  return useStore(snapshotStore, selector);
}
