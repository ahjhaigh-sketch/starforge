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
  lastResetAt: z.record(z.string(), finite).optional(),
  novaTree: z.record(z.string(), z.number().int().min(0)).optional(),
  auto: z.record(z.string(), z.looseObject({ on: z.boolean(), spend: finite })).optional(),
  belt: z
    .looseObject({
      upgrades: z.record(z.string(), z.number().int().min(0)),
      tier: z.number().int().min(0),
      field: z.array(z.looseObject({ id: finite, r: z.number().int().min(0) })),
      nextId: finite,
      spawnAcc: finite,
      droneAcc: finite,
      oreThisTier: dec,
      rng: z.tuple([finite, finite, finite, finite]).optional(),
    })
    .optional(),
  drill: z.looseObject({ depth: z.number().int().min(0), damage: dec, drones: z.number().int().min(0), bits: z.number().int().min(0), mastery: z.record(z.string(), finite) }).optional(),
  starsmith: z.looseObject({ perks: z.record(z.string(), z.number().int().min(0)) }).optional(),
  forge: z
    .looseObject({
      grade: z.string(),
      on: z.boolean(),
      upgrades: z.record(z.string(), z.number().int().min(0)),
      lanes: z.array(z.looseObject({ grade: z.string(), ore: dec, alloy: dec, t: finite })),
      share: finite,
      allowance: dec,
      seen: dec,
    })
    .optional(),
  relics: z.looseObject({ levels: z.record(z.string(), z.number().int().min(0)), equipped: z.array(z.string()) }).optional(),
  codex: z.record(z.string(), z.number().int().min(0)).optional(),
  fusion: z
    .looseObject({ board: z.array(z.number().int().min(0)), upgrades: z.record(z.string(), z.number().int().min(0)), acc: finite, best: z.number().int().min(0), autoOwned: z.boolean(), autoOn: z.boolean(), spawned: finite })
    .optional(),
  attune: z
    .looseObject({ unlocked: z.array(z.string()), equipped: z.array(z.string()), pulse: z.array(finite), heart: finite, chaosTaps: finite, chaos: z.looseObject({ id: z.string(), until: finite }).nullable(), rng: z.tuple([finite, finite, finite, finite]) })
    .optional(),
  merchant: z
    .looseObject({
      deals: z.array(z.looseObject({ kind: z.string(), quality: z.string(), pay: z.looseObject({ currency: z.string(), amount: dec }), get: z.looseObject({ currency: z.string().optional(), amount: dec.optional(), id: z.string().optional(), count: finite.optional() }) })),
      luck: z.number().int().min(0),
      rerolls: z.number().int().min(0),
      rng: z.tuple([finite, finite, finite, finite]),
    })
    .optional(),
  ships: z.looseObject({ fleet: z.array(z.looseObject({ sector: z.string().nullable(), t: finite, auto: z.boolean() })), upgrades: z.record(z.string(), z.number().int().min(0)), rng: z.tuple([finite, finite, finite, finite]) }).optional(),
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
