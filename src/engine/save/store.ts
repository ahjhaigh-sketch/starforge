import { createInitialState, type GameState, SAVE_VERSION, trimKept } from '../state';
import { decodeEnvelope, encodeEnvelope, SaveFormatError } from './codec';
import { migrate, NewerSaveError } from './migrations';
import { validatePlainSave } from './schema';
import { findBrokenNumber, fromPlain, mergeDefaults, toPlain } from './serialize';

/** Synchronous key-value storage (localStorage in the browser, a Map in tests). */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** Every key starts with "starforge:": all *.github.io projects share one localStorage. */
export const KEYS = {
  slotA: 'starforge:save:A',
  slotB: 'starforge:save:B',
  latest: 'starforge:save:latest',
  corruptPrefix: 'starforge:corrupt:',
} as const;

type Slot = 'A' | 'B';
const slotKey = (slot: Slot) => (slot === 'A' ? KEYS.slotA : KEYS.slotB);

export type SaveResult = { ok: true; slot: Slot; code: string } | { ok: false; error: string };

export type LoadResult =
  | { status: 'ok'; state: GameState; slot: Slot; savedAt: number }
  | { status: 'empty' }
  | { status: 'newer'; saveVersion: number }
  | { status: 'corrupt'; errors: string[] };

/** Turns a state into a save code, refusing anything that would not load back cleanly. */
export function exportSave(s: GameState, now: number = Date.now()): { ok: true; code: string } | { ok: false; error: string } {
  const broken = findBrokenNumber(s);
  if (broken) return { ok: false, error: `Broken number at ${broken}` };
  const plain = toPlain(s);
  const invalid = validatePlainSave(plain);
  if (invalid) return { ok: false, error: invalid };
  const code = encodeEnvelope({ v: SAVE_VERSION, t: now, d: plain });
  try {
    const back = importSave(code);
    if (back.status !== 'ok') return { ok: false, error: 'Save did not round-trip.' };
  } catch (err) {
    return { ok: false, error: `Save did not round-trip: ${(err as Error).message}` };
  }
  return { ok: true, code };
}

/** Reads a save code (from storage or a paste). Throws SaveFormatError / NewerSaveError. */
export function importSave(code: string): { status: 'ok'; state: GameState; savedAt: number } {
  const env = decodeEnvelope(code);
  const plain = migrate(env.v, structuredClone(env.d) as Record<string, unknown>);
  const invalid = validatePlainSave(plain);
  if (invalid) throw new SaveFormatError(`That save failed checks (${invalid}).`);
  const state = mergeDefaults(createInitialState(env.t), fromPlain(plain));
  // 1.5.0: every safe tenth at most a tenth of what's held (older saves could keep a whole currency from automation)
  trimKept(state);
  const broken = findBrokenNumber(state);
  if (broken) throw new SaveFormatError(`That save has a broken number at ${broken}.`);
  return { status: 'ok', state, savedAt: env.t };
}

/**
 * Writes to the slot that is NOT the latest, then points "latest" at it,
 * so the last good save survives a crash or a bad write.
 */
export function saveToSlots(kv: KeyValueStore, s: GameState, now: number = Date.now()): SaveResult {
  s.lastSave = now;
  const exported = exportSave(s, now);
  if (!exported.ok) return exported;
  const slot: Slot = kv.get(KEYS.latest) === 'A' ? 'B' : 'A';
  try {
    kv.set(slotKey(slot), exported.code);
    kv.set(KEYS.latest, slot);
  } catch (err) {
    const quota = err instanceof Error && /quota/i.test(err.name + err.message);
    return { ok: false, error: quota ? 'Browser storage is full.' : `Couldn't write the save: ${(err as Error).message}` };
  }
  return { ok: true, slot, code: exported.code };
}

/** Loads the newest valid slot. Refuses outright if either slot came from a newer build. */
export function loadFromSlots(kv: KeyValueStore, now: number = Date.now()): LoadResult {
  const found: Array<{ slot: Slot; code: string }> = [];
  for (const slot of ['A', 'B'] as const) {
    const code = kv.get(slotKey(slot));
    if (code) found.push({ slot, code });
  }
  if (found.length === 0) return { status: 'empty' };

  const good: Array<{ slot: Slot; state: GameState; savedAt: number }> = [];
  const errors: string[] = [];
  for (const { slot, code } of found) {
    try {
      const r = importSave(code);
      good.push({ slot, state: r.state, savedAt: r.savedAt });
    } catch (err) {
      if (err instanceof NewerSaveError) return { status: 'newer', saveVersion: err.saveVersion };
      errors.push(`Slot ${slot}: ${(err as Error).message}`);
      try {
        kv.set(`${KEYS.corruptPrefix}${now}:${slot}`, code);
      } catch {
        /* storage full: nothing more we can do */
      }
    }
  }
  if (good.length === 0) return { status: 'corrupt', errors };
  good.sort((a, b) => b.savedAt - a.savedAt);
  const best = good[0]!;
  return { status: 'ok', state: best.state, slot: best.slot, savedAt: best.savedAt };
}

export function wipeSlots(kv: KeyValueStore): void {
  kv.remove(KEYS.slotA);
  kv.remove(KEYS.slotB);
  kv.remove(KEYS.latest);
}

export function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: (k) => data.get(k) ?? null,
    set: (k, v) => void data.set(k, v),
    remove: (k) => void data.delete(k),
  };
}
