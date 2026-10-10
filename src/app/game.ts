import { createInitialState, type GameState } from '../engine/state';
import type { OfflineReport } from '../engine/offline';
import { createTapRuntime, type TapRuntime } from '../engine/systems/stardust';

/** The single live game. Only the engine and app/commands touch `state`; the UI reads the snapshot. */
export const game: {
  state: GameState;
  /** Combo and tap-rate limit for this session (not saved). */
  tapRuntime: TapRuntime;
  /** Set when saving must not happen (e.g. the stored save is from a newer build). */
  saveBlocked: string | null;
  lastSaveError: string | null;
  /** Report from the catch-up that ran at boot, shown by the welcome-back screen. */
  bootReport: OfflineReport | null;
  devMode: boolean;
  /** Average engine tick time in ms (dev panel). */
  tickMs: number;
} = {
  state: createInitialState(),
  tapRuntime: createTapRuntime(),
  saveBlocked: null,
  lastSaveError: null,
  bootReport: null,
  devMode: false,
  tickMs: 0,
};
