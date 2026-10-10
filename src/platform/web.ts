import type { KeyValueStore } from '../engine/save/store';

/** localStorage is synchronous, so a save started in `pagehide` actually finishes. */
export const webStore: KeyValueStore = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    localStorage.setItem(key, value); // errors (quota, blocked storage) are handled by the caller
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage blocked */
    }
  },
};

/** Ask the browser not to evict our data (Safari deletes site data after 7 days without a visit). */
export function requestPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.();
  } catch {
    /* not supported */
  }
}
