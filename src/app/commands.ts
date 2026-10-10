import { D } from '../engine/decimal';
import { simulateElapsed } from '../engine/offline';
import { exportSave, importSave } from '../engine/save/store';
import { type BuyAmount, createInitialState, gain, type Notation } from '../engine/state';
import { invalidateStats } from '../engine/stats';
import { game } from './game';
import { saveNow, wipeSave } from './persistence';
import { publish } from './uiSnapshot';

/**
 * The only API the UI calls. Each command changes the engine state, then publishes the snapshot
 * immediately so clicks feel instant instead of waiting for the next 10 Hz refresh.
 */
function done(): void {
  invalidateStats();
  publish();
}

export const commands = {
  setNotation(n: Notation) {
    game.state.settings.notation = n;
    done();
  },
  setBuyAmount(a: BuyAmount) {
    game.state.settings.buyAmount = a;
    done();
  },
  setCustomBuyAmount(n: number) {
    game.state.settings.customBuyAmount = Math.max(1, Math.min(1e15, Math.floor(n) || 1));
    done();
  },
  setSetting<K extends keyof typeof game.state.settings>(key: K, value: (typeof game.state.settings)[K]) {
    game.state.settings[key] = value;
    done();
  },
  saveNow() {
    const ok = saveNow();
    done();
    return ok;
  },
  exportCode(): { ok: true; code: string } | { ok: false; error: string } {
    return exportSave(game.state);
  },
  /** Replaces the game with an imported save after validating it. Returns an error message or null. */
  importCode(code: string): string | null {
    try {
      const r = importSave(code);
      saveNow(); // back up the current game into the other slot first
      game.state = r.state;
      game.state.lastTick = Date.now();
      saveNow();
      done();
      return null;
    } catch (err) {
      return (err as Error).message;
    }
  },
  wipe() {
    wipeSave();
    game.state = createInitialState();
    done();
  },
  // ---- dev tools (only reachable with ?dev=1) ----
  devAdd(currency: string, amount: number) {
    gain(game.state, currency, D(amount));
    done();
  },
  devMultiply(currency: string, factor: number) {
    const have = game.state.currencies[currency] ?? D(0);
    gain(game.state, currency, have.mul(factor - 1).max(D(factor)));
    done();
  },
  devWarp(seconds: number) {
    simulateElapsed(game.state, seconds, { cap: Infinity, efficiency: 1, offline: false });
    done();
  },
};
