import { createStore, del, entries, get, set, type UseStore } from 'idb-keyval';

/**
 * Rolling backups in the browser's database (IndexedDB), separate from the two localStorage
 * slots, so a bad save or a wiped slot can always be undone. Keys start with "starforge:".
 */
export interface BackupMeta {
  key: string;
  time: number;
  summary: string;
}

interface BackupRecord {
  code: string;
  time: number;
  summary: string;
}

let store: UseStore | null = null;
function db(): UseStore | null {
  try {
    store ??= createStore('starforge:backups', 'backups');
    return store;
  } catch {
    return null; // IndexedDB blocked (private mode on some browsers)
  }
}

export async function writeBackup(code: string, summary: string, keep: number): Promise<boolean> {
  const s = db();
  if (!s) return false;
  try {
    const time = Date.now();
    await set(`starforge:backup:${time}`, { code, time, summary } satisfies BackupRecord, s);
    const all = await listBackups();
    for (const old of all.slice(keep)) await del(old.key, s);
    return true;
  } catch {
    return false;
  }
}

/** Newest first. */
export async function listBackups(): Promise<BackupMeta[]> {
  const s = db();
  if (!s) return [];
  try {
    const all = (await entries<string, BackupRecord>(s)).filter(([k]) => typeof k === 'string' && k.startsWith('starforge:backup:'));
    return all.map(([key, r]) => ({ key, time: r.time, summary: r.summary })).sort((a, b) => b.time - a.time);
  } catch {
    return [];
  }
}

export async function readBackup(key: string): Promise<string | null> {
  const s = db();
  if (!s) return null;
  try {
    return (await get<BackupRecord>(key, s))?.code ?? null;
  } catch {
    return null;
  }
}
