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
  // 2: (d) => { ... },
};

export function migrate(version: number, data: PlainSave): PlainSave {
  if (version > SAVE_VERSION) throw new NewerSaveError(version);
  for (let v = version + 1; v <= SAVE_VERSION; v++) migrations[v]?.(data);
  data.version = SAVE_VERSION;
  return data;
}
