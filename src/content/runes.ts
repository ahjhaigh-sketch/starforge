import type { Requirement } from './requirements';

/**
 * Constellation Runes (Game design: "Nebula and Constellation Runes"; Math and balance: "Rune
 * maths"). Eight shrines, each with its own currency and about 20 runes from 1 in 2 to 1 in e36,
 * plus a hidden "???" rune and an Anomaly that ignores luck. Odds are stored as log10(N) so huge
 * ones never overflow. Every rune boosts 1 to 8 stats by (1 + a x level); level = min(cap,
 * floor(sqrt(copies))). The Dust shrine is the table on the Math and balance tab; the others
 * follow the same ladder. IDs never change.
 */
export interface RarityDef {
  id: string;
  name: string;
  color: string;
  /** log10 of the base odds for the visible ladder. */
  log10: number;
  cap: number;
}

export const RUNE_RARITIES: readonly RarityDef[] = [
  { id: 'common', name: 'Common', color: '#C9C2F2', log10: Math.log10(2), cap: 500 },
  { id: 'uncommon', name: 'Uncommon', color: '#5FD39B', log10: Math.log10(6), cap: 400 },
  { id: 'rare', name: 'Rare', color: '#4FB6FF', log10: Math.log10(30), cap: 300 },
  { id: 'epic', name: 'Epic', color: '#B06BFF', log10: Math.log10(200), cap: 200 },
  { id: 'legendary', name: 'Legendary', color: '#FFC83D', log10: Math.log10(1500), cap: 150 },
  { id: 'mythic', name: 'Mythic', color: '#FF4FC1', log10: Math.log10(12_000), cap: 100 },
  { id: 'celestial', name: 'Celestial', color: '#2EE6FF', log10: Math.log10(150_000), cap: 75 },
  { id: 'cosmic', name: 'Cosmic', color: '#FF7A2E', log10: Math.log10(5e6), cap: 50 },
  { id: 'eternal', name: 'Eternal', color: '#FFFFFF', log10: 8, cap: 20 },
  { id: 'divine', name: 'Divine', color: '#FFE08A', log10: 10, cap: 18 },
  { id: 'primordial', name: 'Primordial', color: '#C2453A', log10: 12, cap: 16 },
  { id: 'transcendent', name: 'Transcendent', color: '#9FE7FF', log10: 15, cap: 15 },
  { id: 'absolute', name: 'Absolute', color: '#7DFF5A', log10: 18, cap: 14 },
  { id: 'omega', name: 'Omega', color: '#FF9EF0', log10: 21, cap: 13 },
  { id: 'infinite', name: 'Infinite', color: '#B98CFF', log10: 24, cap: 12 },
  { id: 'apex', name: 'Apex', color: '#FFB347', log10: 27, cap: 12 },
  { id: 'singular', name: 'Singular', color: '#8C97C2', log10: 30, cap: 11 },
  { id: 'eschaton', name: 'Eschaton', color: '#FF5640', log10: 33, cap: 11 },
  { id: 'zenith', name: 'Zenith', color: '#FFFFFF', log10: 36, cap: 10 },
];

export const HIDDEN = { id: 'hidden', name: 'Hidden', color: '#6E5CC4', cap: 10 };
export const ANOMALY = { id: 'anomaly', name: 'Anomaly', color: '#FF4F6E', cap: 40 };

export interface RuneEffect {
  stat: string;
  op: 'mul' | 'add' | 'pow';
  /** Per level: mul is (1 + a x level), add is a x level, pow is (1 + a x level). */
  a: number;
}

export interface RuneDef {
  id: string;
  shrine: string;
  name: string;
  /** Index into RUNE_RARITIES, or -1 hidden, -2 anomaly. */
  tier: number;
  rarity: string;
  color: string;
  log10: number;
  cap: number;
  /** Anomaly runes ignore luck. */
  anomaly: boolean;
  /** Shown as "???" until found. */
  hidden: boolean;
  effects: readonly RuneEffect[];
  /** Something a stat can't say (the hidden Dust rune opens a secret Starsmith perk). */
  note?: string;
}

export interface ShrineDef {
  id: string;
  name: string;
  currency: string;
  /** What the currency is called in sentences. */
  currencyName: string;
  /** Price per rune, in the shrine's currency. */
  price: number;
  color: string;
  req: Requirement;
}

export const SHRINES: readonly ShrineDef[] = [
  { id: 'dust', name: 'Dust Shrine', currency: 'stardust', currencyName: 'Stardust', price: 1e6, color: '#FFC83D', req: { kind: 'count', stat: 'nebulasAll', count: 1, noun: 'Nebula' } },
  { id: 'nova', name: 'Nova Shrine', currency: 'shards', currencyName: 'Nova Shards', price: 10, color: '#FF4FC1', req: { kind: 'count', stat: 'nebulasAll', count: 1, noun: 'Nebula' } },
  { id: 'nebula', name: 'Nebula Shrine', currency: 'essence', currencyName: 'Essence', price: 1, color: '#2EE6FF', req: { kind: 'count', stat: 'nebulasAll', count: 2, noun: 'Nebula' } },
  { id: 'forge', name: 'Forge Shrine', currency: 'alloy.iron', currencyName: 'Iron alloy', price: 100, color: '#8A5CD8', req: { kind: 'count', stat: 'nebulasAll', count: 2, noun: 'Nebula' } },
  { id: 'wyrm', name: 'Wyrm Shrine', currency: 'embers', currencyName: 'Embers', price: 1000, color: '#2E9C78', req: { kind: 'count', stat: 'wyrmsHatched', count: 1, noun: 'Void Wyrm hatched' } },
  { id: 'void', name: 'Void Shrine', currency: 'darkMatter', currencyName: 'Dark Matter', price: 1, color: '#3A2470', req: { kind: 'count', stat: 'singularitiesAll', count: 1, noun: 'Singularity' } },
  { id: 'galactic', name: 'Galactic Shrine', currency: 'galaxyCores', currencyName: 'Galaxy Cores', price: 1, color: '#4C3BC4', req: { kind: 'count', stat: 'galacticsAll', count: 1, noun: 'Galactic Rebirth' } },
  { id: 'eternal', name: 'Eternal Shrine', currency: 'chronons', currencyName: 'Chronons', price: 1, color: '#E8E0FF', req: { kind: 'count', stat: 'crunchesAll', count: 1, noun: 'Big Crunch' } },
];

export const SHRINE_BY_ID: ReadonlyMap<string, ShrineDef> = new Map(SHRINES.map((x) => [x.id, x]));

const m = (stat: string, a: number): RuneEffect => ({ stat, op: 'mul', a });

/** The Dust shrine, as on the Math and balance tab (then the ladder continues to e36). */
const DUST_TABLE: Array<[string, RuneEffect[]]> = [
  ['Dust Sigil', [m('productionMult', 0.02)]],
  ['Comet Sigil', [m('cometRate', 0.01), m('productionMult', 0.03)]],
  ['Tide Sigil', [{ stat: 'offlineEfficiency', op: 'add', a: 0.002 }, m('oreGain', 0.05)]],
  ['Hunter Sigil', [m('shardGain', 0.05), m('tapPower', 0.1)]],
  ['Crown Sigil', [m('critMult', 0.05), m('productionMult', 0.2), m('runeSpeed', 0.002)]],
  ['Wyrm Sigil', [m('wyrmXp', 0.1), m('essenceGain', 0.05), m('runeBulk', 0.02)]],
  ['First Light', [m('productionMult', 0.05), m('shardGain', 0.05), m('essenceGain', 0.05), m('oreGain', 0.05), m('alloyGain', 0.05), m('runeLuck', 0.01)]],
  ['Heart of the Void', [m('runeLuck', 0.04), m('runeBulk', 0.05), m('darkMatterGain', 0.1)]],
  ['The Eternal Flame', [{ stat: 'productionMult', op: 'pow', a: 0.0005 }, { stat: 'luckRoot', op: 'add', a: 0.01 }]],
];

const NAMES: Record<string, string[]> = {
  dust: ['Sunforge Rune', 'Dawnbreaker', 'Starseed', 'Lightfall', 'Corona Prime', 'Solar Chorus', 'Helios Engine', 'Daybreak Sea', 'Radiant Throne', 'Zenith of Dust'],
  nova: ['Nova Spark', 'Nova Glyph', 'Shard Mark', 'Remnant Seal', 'Pulse Crest', 'Collapse Crown', 'Shock Halo', 'Nova Heart', 'Supernova Soul', 'Neutron Spark', 'Kilonova Choir', 'Magnetar Throne', 'Hypernova Gate', 'Quasar Engine', 'Remnant Sea', 'Collapse Dream', 'Event Edge', 'Last Light', 'Nova Infinity'],
  nebula: ['Mist Sigil', 'Veil Glyph', 'Drift Mark', 'Bloom Seal', 'Cloud Crest', 'Pillar Crown', 'Nursery Halo', 'Nebula Heart', 'Aurora Soul', 'Ion Spark', 'Dust Lane Choir', 'Orion Throne', 'Pillars Gate', 'Cradle Engine', 'Mist Sea', 'Dreaming Cloud', 'Veil Edge', "Creation's Breath", 'Nebula Infinity'],
  forge: ['Ember Sigil', 'Anvil Glyph', 'Ingot Mark', 'Bellows Seal', 'Hammer Crest', 'Crucible Crown', 'Slag Halo', 'Forge Heart', 'Smith Soul', 'Alloy Spark', 'Foundry Choir', 'Iron Throne', 'Furnace Gate', 'Ore Engine', 'Molten Sea', 'Starmetal Dream', 'Quench Edge', 'The First Anvil', 'Forge Infinity'],
  wyrm: ['Scale Sigil', 'Fang Glyph', 'Coil Mark', 'Egg Seal', 'Wing Crest', 'Ember Crown', 'Hatchling Halo', 'Wyrm Heart', 'Elder Soul', 'Roost Spark', 'Brood Choir', 'Serpent Throne', 'Lair Gate', 'Dragonfire Engine', 'Scale Sea', 'Hatching Dream', 'Tail Edge', 'The Great Wyrm', 'Wyrm Infinity'],
  void: ['Dark Sigil', 'Null Glyph', 'Hollow Mark', 'Abyss Seal', 'Shadow Crest', 'Eclipse Crown', 'Rift Halo', 'Void Heart', 'Silent Soul', 'Dark Spark', 'Choir of Nothing', 'Throne of Night', 'Horizon Gate', 'Gravity Engine', 'Dark Sea', 'Unlit Dream', 'Horizon Edge', 'The Final Dark', 'Void Infinity'],
  galactic: ['Arm Sigil', 'Spiral Glyph', 'Halo Mark', 'Bulge Seal', 'Bar Crest', 'Galaxy Crown', 'Cluster Halo', 'Galactic Heart', 'Andromeda Soul', 'Core Spark', 'Choir of Suns', 'Throne of Arms', 'Local Group Gate', 'Galaxy Engine', 'Star Sea', 'Milky Dream', 'Rim Edge', 'The Great Attractor', 'Galactic Infinity'],
  eternal: ['Hour Sigil', 'Epoch Glyph', 'Aeon Mark', 'Chronon Seal', 'Era Crest', 'Eternity Crown', 'Loop Halo', 'Eternal Heart', 'Timeless Soul', 'Moment Spark', 'Choir of Ages', 'Throne of Time', 'Big Bang Gate', 'Entropy Engine', 'Time Sea', 'Endless Dream', 'Edge of Time', 'The Last Moment', 'Eternal Infinity'],
};

/** Each shrine's themed stats; the ladder walks through them, adding more stats as rarity rises. */
const POOLS: Record<string, string[]> = {
  dust: ['productionMult', 'tapPower', 'cometRate', 'critMult', 'oreGain', 'buffDuration'],
  nova: ['shardGain', 'productionMult', 'buffDuration', 'frenzyMult', 'autoSpeed', 'tapPower'],
  nebula: ['essenceGain', 'shardGain', 'productionMult', 'offlineCap', 'xpGain', 'tapPower'],
  forge: ['alloyGain', 'oreGain', 'forgeSpeed', 'xpGain', 'drillPower', 'shipLoot'],
  wyrm: ['wyrmXp', 'emberGain', 'essenceGain', 'productionMult', 'cometRate', 'shardGain'],
  void: ['darkMatterGain', 'essenceGain', 'shardGain', 'productionMult', 'tapPower', 'alloyGain'],
  galactic: ['galaxyCoreGain', 'darkMatterGain', 'essenceGain', 'productionMult', 'shardGain', 'oreGain'],
  eternal: ['chrononGain', 'galaxyCoreGain', 'darkMatterGain', 'essenceGain', 'shardGain', 'productionMult'],
};

/** Strength per level by rarity: rarer runes boost more, and more stats at once. */
const A = [0.02, 0.03, 0.05, 0.08, 0.12, 0.18, 0.25, 0.4, 0.6, 0.8, 1, 1.5, 2, 3, 4, 6, 8, 12, 16];
const RUNE_STATS = ['runeSpeed', 'runeBulk', 'runeLuck'];
const RUNE_A: Record<string, number> = { runeSpeed: 0.02, runeBulk: 0.1, runeLuck: 0.05 };

function ladderEffects(shrine: string, tier: number): RuneEffect[] {
  const pool = POOLS[shrine]!;
  const count = Math.min(8, 1 + Math.floor(tier / 2.5));
  const out: RuneEffect[] = [];
  const special = tier >= 4 ? RUNE_STATS[tier % 3]! : null;
  for (let i = 0; out.length < count - (special ? 1 : 0) && i < pool.length; i++) out.push(m(pool[(tier + i) % pool.length]!, A[tier]!));
  if (special) out.push(m(special, A[tier]! * RUNE_A[special]!));
  return out;
}

const HIDDEN_RUNES: Record<string, { name: string; log10: number; effects: RuneEffect[]; note?: string }> = {
  dust: { name: 'Whisper of Sylthaz', log10: 12, effects: [m('productionMult', 1)], note: 'Unlocks a secret Starsmith perk.' },
  nova: { name: 'Echo of the First Star', log10: 120, effects: [m('shardGain', 5), m('runeLuck', 0.5)] },
  nebula: { name: 'The Cradle Unseen', log10: 150, effects: [m('essenceGain', 5), m('runeBulk', 1)] },
  forge: { name: 'Hammer of the Last Starsmith', log10: 200, effects: [m('alloyGain', 5), m('runeSpeed', 0.1)] },
  wyrm: { name: 'Sylthaz Unbound', log10: 300, effects: [m('wyrmXp', 5), m('emberGain', 5)] },
  void: { name: 'What Lies Beneath', log10: 400, effects: [m('darkMatterGain', 5)] },
  galactic: { name: "Laniakea's Whisper", log10: 500, effects: [m('galaxyCoreGain', 5)] },
  eternal: { name: 'Before the Beginning', log10: 1000, effects: [m('chrononGain', 5)] },
};

const ANOMALIES: Record<string, { name: string; log10: number; effects: RuneEffect[] }> = {
  dust: { name: 'Rogue Comet', log10: 5, effects: [m('runeSpeed', 0.01), m('cometRate', 0.02)] },
  nova: { name: 'Stray Pulsar', log10: 7, effects: [m('runeSpeed', 0.01), m('shardGain', 0.1)] },
  nebula: { name: 'Wandering Wisp', log10: 6, effects: [m('runeBulk', 0.05), m('essenceGain', 0.1)] },
  forge: { name: 'Cracked Mould', log10: 8, effects: [m('runeLuck', 0.02), m('alloyGain', 0.1)] },
  wyrm: { name: 'Two-Headed Hatchling', log10: 9, effects: [m('runeBulk', 0.05), m('wyrmXp', 0.1)] },
  void: { name: 'Lost Photon', log10: 10, effects: [m('runeLuck', 0.02), m('darkMatterGain', 0.1)] },
  galactic: { name: 'Runaway Star', log10: 11, effects: [m('runeSpeed', 0.01), m('galaxyCoreGain', 0.1)] },
  eternal: { name: 'Paradox', log10: 12, effects: [m('runeLuck', 0.03), m('chrononGain', 0.1)] },
};

function buildShrine(shrine: string): RuneDef[] {
  const visible = RUNE_RARITIES.map((r, tier): RuneDef => {
    const isDust = shrine === 'dust';
    const name = isDust ? (DUST_TABLE[tier]?.[0] ?? NAMES.dust![tier - DUST_TABLE.length]!) : NAMES[shrine]![tier]!;
    const effects = isDust && DUST_TABLE[tier] ? DUST_TABLE[tier]![1] : ladderEffects(shrine, tier);
    return { id: `${shrine}.${tier}`, shrine, name, tier, rarity: r.id, color: r.color, log10: r.log10, cap: r.cap, anomaly: false, hidden: false, effects };
  });
  const h = HIDDEN_RUNES[shrine]!;
  const a = ANOMALIES[shrine]!;
  return [
    ...visible,
    { id: `${shrine}.hidden`, shrine, name: h.name, tier: -1, rarity: HIDDEN.id, color: HIDDEN.color, log10: h.log10, cap: HIDDEN.cap, anomaly: false, hidden: true, effects: h.effects, ...(h.note ? { note: h.note } : {}) },
    { id: `${shrine}.anomaly`, shrine, name: a.name, tier: -2, rarity: ANOMALY.id, color: ANOMALY.color, log10: a.log10, cap: ANOMALY.cap, anomaly: true, hidden: false, effects: a.effects },
  ];
}

export const RUNES: readonly RuneDef[] = SHRINES.flatMap((s) => buildShrine(s.id));
export const RUNE_BY_ID: ReadonlyMap<string, RuneDef> = new Map(RUNES.map((r) => [r.id, r]));
export const runesOf = (shrine: string) => RUNES.filter((r) => r.shrine === shrine);

/** Display names for the stats runes boost. */
export const RUNE_STAT_WORDS: Record<string, string> = {
  productionMult: 'Stardust',
  tapPower: 'taps',
  cometRate: 'comet rate',
  critMult: 'crit size',
  oreGain: 'ore',
  buffDuration: 'comet buffs',
  shardGain: 'shards',
  frenzyMult: 'Frenzy',
  autoSpeed: 'auto-buyers',
  essenceGain: 'Essence',
  offlineCap: 'offline cap',
  offlineEfficiency: 'offline efficiency',
  xpGain: 'Starsmith XP',
  alloyGain: 'alloy',
  forgeSpeed: 'smelting',
  drillPower: 'drilling',
  shipLoot: 'ship loot',
  wyrmXp: 'Wyrm XP',
  emberGain: 'Embers',
  darkMatterGain: 'Dark Matter',
  galaxyCoreGain: 'Galaxy Cores',
  chrononGain: 'Chronons',
  runeSpeed: 'rune speed',
  runeBulk: 'rune bulk',
  runeLuck: 'rune luck',
  luckRoot: 'Luck Root',
};
