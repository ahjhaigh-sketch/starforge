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
      field: z.array(z.looseObject({ id: finite, r: z.number().int().min(0), m: z.number().int().min(0).optional() })),
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
  nebulaTree: z.record(z.string(), z.number().int().min(0)).optional(),
  nebula: z.looseObject({ autoAt: dec }).optional(),
  runes: z
    .looseObject({
      shrines: z.record(z.string(), z.looseObject({ auto: z.boolean(), rate: finite, luck: finite, keep: z.number().int().min(0), acc: finite, pity: dec, rolled: dec })),
      copies: z.record(z.string(), dec),
      rng: z.tuple([finite, finite, finite, finite]),
      stars: z.record(z.string(), z.number().int().min(0)).optional(),
    })
    .optional(),
  auras: z.looseObject({ copies: decRecord, equipped: z.string().nullable(), auto: z.boolean(), rng: z.tuple([finite, finite, finite, finite]) }).optional(),
  mutations: z.looseObject({ runes: z.record(z.string(), decRecord), asteroids: z.record(z.string(), finite), others: z.record(z.string(), finite).optional(), rng: z.tuple([finite, finite, finite, finite]) }).optional(),
  wyrms: z
    .looseObject({
      stacks: decRecord,
      levels: z.record(z.string(), z.number().int().min(0)),
      team: z.array(z.string()).max(6),
      eggs: z.number().int().min(0),
      found: z.array(z.string()),
      catchAcc: finite,
      rng: z.tuple([finite, finite, finite, finite]),
    })
    .optional(),
  spectral: z.looseObject({ energy: decRecord, focus: z.string().nullable(), upgrades: z.record(z.string(), z.number().int().min(0)) }).optional(),
  singularity: z.looseObject({ key: z.boolean(), autoAt: dec }).optional(),
  singularityTree: z.record(z.string(), z.number().int().min(0)).optional(),
  blackHole: z.looseObject({ mass: dec, dustShare: finite }).optional(),
  wheel: z.looseObject({ on: z.boolean(), shares: z.array(finite.refine((n) => n >= 0, 'shares are never negative')).length(8), banks: decRecord }).optional(),
  reactor: z.looseObject({ charge: dec }).optional(),
  trials: z
    .looseObject({
      levels: z.record(z.string(), z.number().int().min(0)),
      active: z.array(z.string()).max(4),
      start: finite,
      fastBest: z.number().int().min(-1),
      fusionBest: finite,
      auto: z.boolean(),
    })
    .optional(),
  spire: z.looseObject({ floor: z.number().int().min(0), damage: dec, climbing: z.boolean(), banner: z.string().nullable() }).optional(),
  leviathans: z.looseObject({ kills: z.record(z.string(), z.number().int().min(0)), current: z.number().int().min(0), damage: dec, fighting: z.boolean() }).optional(),
  scaleTree: z.record(z.string(), z.number().int().min(0)).optional(),
  mirror: z
    .looseObject({ engines: z.record(z.string(), z.number().int().min(0)), ever: z.record(z.string(), z.number().int().min(0)), depth: z.number().int().min(0), upgrades: z.array(z.string()) })
    .optional(),
  wormholes: z.looseObject({ links: z.array(z.looseObject({ from: z.string(), to: z.string(), share: z.number().min(0).max(1) })) }).optional(),
  galactic: z.looseObject({ galaxy: z.string(), next: z.string(), cleared: z.array(z.string()), autoAt: dec }).optional(),
  galacticTree: z.record(z.string(), z.number().int().min(0)).optional(),
  observatory: z
    .looseObject({ seed: z.number().int().min(0), links: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])), best: z.number().min(0) })
    .optional(),
  starChart: z.record(z.string(), z.number().int().min(0)).optional(),
  megastructures: z.record(z.string(), z.number().int().min(0)).optional(),
  eternity: z
    .looseObject({ upgrades: z.array(z.string()), auto: z.record(z.string(), z.looseObject({ on: z.boolean(), mode: z.enum(['double', 'amount']), at: dec })) })
    .optional(),
  echoes: z.looseObject({ engines: z.record(z.string(), z.number().int().min(0)), ever: z.record(z.string(), z.number().int().min(0)) }).optional(),
  colonies: z
    .looseObject({
      list: z.array(
        z.looseObject({
          type: z.string(),
          name: z.string(),
          pop: z.number().min(0),
          housing: z.number().int().min(0),
          farms: z.number().int().min(0),
          factories: z.number().int().min(0),
          port: z.boolean(),
          grid: z.array(z.string().nullable()),
          finished: z.number().nullable(),
        }),
      ),
      routes: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])),
      research: z.array(z.string()),
    })
    .optional(),
  tarot: z
    .looseObject({
      owned: z.array(z.string()),
      deck: z.array(z.string().nullable()).max(7),
      packs: z.number().int().min(0),
      gamble: finite,
      rng: z.tuple([finite, finite, finite, finite]),
    })
    .optional(),
  nursery: z
    .looseObject({
      plots: z.array(z.looseObject({ species: z.string().nullable(), t: finite })).max(12),
      seeds: z.record(z.string(), z.number().int().min(0)),
      upgrades: z.record(z.string(), z.number().int().min(0)),
      found: z.array(z.string()),
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
