import { z } from 'zod';

/** Decimals are stored as "D:<number>" strings. */
const dec = z.string().regex(/^D:/, 'Decimal values must start with D:');
const decRecord = z.record(z.string(), dec);
const finite = z.number().refine(Number.isFinite, 'must be a finite number');

/**
 * Structural check of a plain (Decimal-tagged) save, run before every write and after every load.
 * Loose objects: newer optional fields pass through and get merged onto defaults.
 */
export const plainSaveSchema = z.looseObject({
  version: z.number().int().positive(),
  createdAt: finite,
  lastTick: finite,
  lastSave: finite,
  playtime: finite.refine((n) => n >= 0, 'playtime must not be negative'),
  rng: z.tuple([finite, finite, finite, finite]),
  currencies: decRecord,
  totals: z.looseObject({ run: decRecord, all: decRecord }),
  stats: z.record(z.string(), finite),
  tier: z.number().int().min(0).optional(),
  engines: z.record(z.string(), z.number().int().min(0)).optional(),
  enginesEver: z.record(z.string(), z.number().int().min(0)).optional(),
  unlocked: z.array(z.string()).optional(),
  seen: z.array(z.string()).optional(),
  upgrades: z.array(z.string()).optional(),
  achievements: z.array(z.string()).optional(),
  goals: z.record(z.string(), z.number().int().min(0)).optional(),
  buffs: z.record(z.string(), finite).optional(),
  comet: z.looseObject({ nextAt: finite, until: finite }).optional(),
  lastBackupAt: finite.optional(),
  constants: z.record(z.string(), z.number().min(0).refine(Number.isFinite, 'must be finite')).optional(),
  planets: z.record(z.string(), z.looseObject({ type: z.string(), level: z.number().int().min(1) })).optional(),
  quests: z.array(z.looseObject({ kind: z.string(), start: finite, need: finite })).optional(),
  settings: z.looseObject({
    notation: z.enum(['suffix', 'scientific', 'engineering']),
    autosaveSeconds: finite,
  }),
});

export function validatePlainSave(plain: unknown): string | null {
  const result = plainSaveSchema.safeParse(plain);
  if (result.success) return null;
  const first = result.error.issues[0];
  return first ? `${first.path.join('.') || 'save'}: ${first.message}` : 'Save failed validation.';
}
