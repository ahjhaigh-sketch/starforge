import { UPDATES } from '../content/updates';
import { events } from '../engine/events';

/**
 * After an update, one toast says what's new (the full log is in Settings). The version last seen
 * is kept beside the save, not in it, so no save changes shape for this.
 */
const KEY = 'starforge:seenVersion';

export function announceUpdate(hasPlayed: boolean): void {
  try {
    const seen = localStorage.getItem(KEY);
    if (seen === __APP_VERSION__) return;
    localStorage.setItem(KEY, __APP_VERSION__);
    const note = UPDATES.find((u) => u.version === __APP_VERSION__);
    // a brand-new game has nothing to compare with: no "updated" toast
    if (!note || !hasPlayed) return;
    events.emit({ t: 'toast', title: `Updated to ${note.version}: ${note.title}`, body: "See what's new in Settings, under Update log.", icon: 'gear', priority: true });
  } catch {
    // storage blocked (a private window): just don't announce
  }
}
