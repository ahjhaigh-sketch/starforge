import { registerSW } from 'virtual:pwa-register';
import { create } from 'zustand';
import { inTauri } from '../platform/tauri';
import { saveNow } from './persistence';

/**
 * The installable app (Tech tab: "Installable app"). The service worker precaches every file, so
 * the game plays offline. A new version never takes over by itself: a banner offers it, and taking
 * it saves the game first, then reloads into the new version. The Windows app (Tauri) ships its
 * files inside the .exe, so it has no service worker.
 */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const useAppShell = create<{ updateReady: boolean; canInstall: boolean }>(() => ({ updateReady: false, canInstall: false }));

let update: ((reload?: boolean) => Promise<void>) | null = null;
let installEvent: InstallPromptEvent | null = null;

/** Check for a new version once an hour in long sessions (updates are never applied without asking). */
const CHECK_EVERY_MS = 60 * 60 * 1000;

export function installPwa(): void {
  if (inTauri() || import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  update = registerSW({
    onNeedRefresh: () => useAppShell.setState({ updateReady: true }),
    onRegisteredSW: (_url, reg) => {
      if (reg) window.setInterval(() => void reg.update(), CHECK_EVERY_MS);
    },
    onRegisterError: (err: unknown) => console.warn('Offline play is unavailable:', err),
  });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // the Settings button offers it instead of a browser pop-up
    installEvent = e as InstallPromptEvent;
    useAppShell.setState({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    useAppShell.setState({ canInstall: false });
  });
}

/** Saves, then swaps to the waiting version (the page reloads). */
export async function updateNow(): Promise<void> {
  saveNow();
  await update?.(true);
}

export function dismissUpdate(): void {
  useAppShell.setState({ updateReady: false });
}

/** Shows the browser's own install dialog (Chrome and Edge). */
export async function installApp(): Promise<boolean> {
  const e = installEvent;
  if (!e) return false;
  await e.prompt();
  const { outcome } = await e.userChoice;
  installEvent = null;
  useAppShell.setState({ canInstall: false });
  return outcome === 'accepted';
}
