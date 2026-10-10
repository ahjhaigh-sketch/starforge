import { BALANCE } from '../content/balance';
import { planPurchase } from '../engine/buy';
import { saveToSlots } from '../engine/save/store';
import { catchComet, type CometKind } from '../engine/systems/comets';
import { buyUpgrade } from '../engine/systems/upgrades';
import { backupNow, readBackup } from './backups';
import { D } from '../engine/decimal';
import { simulateElapsed } from '../engine/offline';
import { exportSave, importSave } from '../engine/save/store';
import { type BuyAmount, createInitialState, cur, gain, type Notation } from '../engine/state';
import { invalidateStats, stat } from '../engine/stats';
import { buyEngine, createTapRuntime, engineCurve, evolve, owned, tapStar } from '../engine/systems/stardust';
import { checkUnlocks } from '../engine/systems/unlocks';
import { requestPersistentStorage, webStore } from '../platform/web';
import { format } from '../ui/format';
import { game } from './game';
import { saveNow, wipeSave } from './persistence';
import { publish } from './uiSnapshot';

/**
 * The only API the UI calls. Each command changes the engine state, then publishes the snapshot
 * immediately so clicks feel instant instead of waiting for the next 10 Hz refresh.
 */
function done(): void {
  invalidateStats();
  checkUnlocks(game.state);
  publish();
}

let askedToKeepData = false;

export const commands = {
  /** One tap on the Star Core. Returns the floating text, or null if the 30-a-second cap dropped it. */
  tap(): { text: string; crit: boolean } | null {
    const r = tapStar(game.state, game.tapRuntime, performance.now());
    if (!r) return null;
    done();
    return { text: `+${format(r.amount, game.state.settings.notation)}`, crit: r.crit };
  },
  /** Buys an engine with the current buy amount (x1, x10, x100, x1,000, Max or typed). */
  buyEngine(id: string): boolean {
    const s = game.state;
    const plan = planPurchase(engineCurve(id), owned(s, id), cur(s, 'stardust'), s.settings.buyAmount, s.settings.customBuyAmount, stat(s, 'engineCostMult'));
    const ok = plan.canAfford && buyEngine(s, id, plan.count);
    if (ok && !askedToKeepData) {
      askedToKeepData = true;
      requestPersistentStorage();
    }
    done();
    return ok;
  },
  evolve(): boolean {
    const ok = evolve(game.state);
    done();
    return ok;
  },
  buyUpgrade(id: string): boolean {
    const ok = buyUpgrade(game.state, id);
    done();
    return ok;
  },
  /** Catches the comet on screen. Returns the words to float where it was caught. */
  catchComet(): { title: string; body: string } | null {
    const r = catchComet(game.state);
    done();
    if (!r) return null;
    const n = game.state.settings.notation;
    const secs = r.seconds ? `${Math.round(r.seconds)} s` : '';
    const text: Record<CometKind, { title: string; body: string }> = {
      frenzy: { title: 'Frenzy!', body: `Engines x${BALANCE.comets.frenzy.mult} for ${secs}` },
      lucky: { title: 'Lucky!', body: `+${format(r.amount ?? 0, n)} Stardust` },
      tapstorm: { title: 'Tapstorm!', body: `Taps x${BALANCE.comets.tapstorm.mult} for ${secs}` },
      wish: { title: 'A Wish!', body: `Engines half price for ${secs}` },
    };
    return text[r.kind];
  },
  toggleMute() {
    game.state.settings.muted = !game.state.settings.muted;
    done();
  },
  /** Loads a rolling backup (the live game is backed up first). Returns an error message or null. */
  async restoreBackup(key: string): Promise<string | null> {
    const code = await readBackup(key);
    if (!code) return 'That backup could not be read.';
    await backupNow();
    return commands.importCode(code);
  },
  /** The player opened an unlocked system: its rail button stops pulsing. */
  markSeen(id: string) {
    if (!game.state.seen.includes(id)) game.state.seen.push(id);
    done();
  },
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
      void backupNow(); // a rolling backup of the current game first
      saveNow(); // and it goes into the other slot
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
    game.tapRuntime = createTapRuntime();
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
  /** Saves the game as if it was closed `seconds` ago, then reloads: tests the welcome-back path. */
  devSaveAway(seconds: number) {
    const r = exportSave(game.state);
    if (!r.ok) return;
    const copy = importSave(r.code).state; // a real copy: structuredClone would strip the Decimals
    copy.lastTick = game.state.lastTick - seconds * 1000;
    game.saveBlocked = 'Reloading';
    saveToSlots(webStore, copy);
    location.reload();
  },
  devWarp(seconds: number) {
    simulateElapsed(game.state, seconds, { cap: Infinity, efficiency: 1, offline: false });
    done();
  },
};
