import { seedRng } from '../rng';
import { SAVE_VERSION } from '../state';

export class NewerSaveError extends Error {
  constructor(public readonly saveVersion: number) {
    super('A newer version of Starforge saved this. Reload the page to update.');
    this.name = 'NewerSaveError';
  }
}

type PlainSave = Record<string, unknown>;

/**
 * Forward-only migrations, keyed by the version they produce. Never edit one after release;
 * never rename or reuse a content ID. Fields that are only ADDED need no migration: loading
 * merges the save onto a fresh default state.
 */
const migrations: Record<number, (d: PlainSave) => void> = {
  // 2 (Phase 1): star tier, engines and unlocks. Every new field has a default, so nothing moves;
  // this entry records the change and repairs a missing stats object.
  2: (d) => {
    if (typeof d.stats !== 'object' || d.stats === null) d.stats = {};
  },
  // 3 (Phase 2): upgrades, medals, goals, buffs and comets, all with defaults. Medals earned
  // before medals existed are granted by the first achievement check after loading.
  3: () => {},
  // 4 (Phase 3): Cosmic Constants, planets and the quest board, all with defaults.
  4: () => {},
  // 5 (Phase 4): Supernova, the Nova Tree and auto-buyers, all with defaults.
  5: () => {},
  // 6 (Phase 5): the Asteroid Belt, Deep Core Drilling and Starsmith perks, all with defaults.
  6: () => {},
  // 7 (Phase 6): the Starforge furnace, relics and the Element Codex, all with defaults.
  7: () => {},
  // 8 (Phase 7): Comet Fusion, Attunements, the Merchant and starships, all with defaults.
  8: () => {},
  // 9 (Phase 8): the Nebula, its tree and the rune shrines. The Supernova count now restarts each
  // Nebula run, so the count so far also becomes the lifetime count and the best run.
  9: (d) => {
    const stats = (d.stats ?? {}) as Record<string, number>;
    stats.supernovasAll = stats.supernovas ?? 0;
    stats.supernovasBest = stats.supernovas ?? 0;
    d.stats = stats;
  },
  // 10 (Phase 9): star ranks, Celestial Auras and Mutations. Their random streams start from the
  // save's own stream, so an old save still rolls the same way on every device.
  10: (d) => {
    const runes = d.runes as { stars?: Record<string, number> } | undefined;
    if (runes && !runes.stars) runes.stars = {};
    const base = (d.rng as number[] | undefined) ?? [1, 2, 3, 4];
    const derive = (k: number) => seedRng(((base[0] ?? 1) ^ k) >>> 0);
    d.auras ??= { copies: {}, equipped: null, auto: false, rng: derive(0x0a4a_51d3) };
    d.mutations ??= { runes: {}, asteroids: {}, rng: derive(0x3d7a_7e05) };
  },
};

export function migrate(version: number, data: PlainSave): PlainSave {
  if (version > SAVE_VERSION) throw new NewerSaveError(version);
  for (let v = version + 1; v <= SAVE_VERSION; v++) migrations[v]?.(data);
  data.version = SAVE_VERSION;
  return data;
}
