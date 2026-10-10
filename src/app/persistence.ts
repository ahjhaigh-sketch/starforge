import { events } from '../engine/events';
import { saveToSlots, wipeSlots } from '../engine/save/store';
import { webStore } from '../platform/web';
import { game } from './game';

/** Saves now unless saving is blocked. Returns whether it worked. */
export function saveNow(): boolean {
  if (game.saveBlocked) return false;
  const r = saveToSlots(webStore, game.state);
  if (r.ok) {
    game.lastSaveError = null;
    events.emit({ t: 'saved', slot: r.slot });
    return true;
  }
  game.lastSaveError = r.error;
  console.warn('Save skipped:', r.error);
  events.emit({ t: 'saveError', message: r.error });
  return false;
}

export function wipeSave(): void {
  wipeSlots(webStore);
}

let installed = false;

/** Save when the tab hides or the page goes away. Never `beforeunload`: it is unreliable on phones. */
export function installSaveHooks(): void {
  if (installed) return;
  installed = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });
  window.addEventListener('pagehide', () => saveNow());
}
