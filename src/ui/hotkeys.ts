import { commands } from '../app/commands';
import { snapshotStore } from '../app/uiSnapshot';
import type { BuyAmount } from '../engine/state';
import { useUi } from './store';

const AMOUNTS: Record<string, BuyAmount> = { '1': 1, '2': 10, '3': 100, '4': 1000, '5': 'max' };

/** Keyboard shortcuts (listed in Settings, switchable off). Never fire while typing in a field. */
export function installHotkeys(): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (!snapshotStore.getState().hotkeys || useUi.getState().catchUp !== null) return;
    const k = e.key.toLowerCase();
    if (k === 't') {
      if (!e.repeat) window.dispatchEvent(new Event('starforge:tap'));
    } else if (k === 'e') {
      if (!e.repeat) commands.evolve();
    } else if (k === 'c') {
      window.dispatchEvent(new Event('starforge:catch'));
    } else if (k === 'm') {
      if (!e.repeat) commands.toggleMute();
    } else if (AMOUNTS[k] !== undefined) {
      commands.setBuyAmount(AMOUNTS[k]);
    } else return;
    e.preventDefault();
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
