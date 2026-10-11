import { BALANCE } from './balance';
import type { Requirement } from './requirements';

/**
 * Rune depth (Game design: "More mid systems"): Rune Starring and Crafting, Celestial Auras,
 * Mutations and the Index. Odds are stored as log10(N) like the runes. IDs never change.
 */

// ---------- Rune Starring ----------

export interface StarRank {
  /** The rune ladder tier this rank asks for (Legendary is tier 4). */
  tier: number;
  /** Copies of it to sacrifice. */
  count: number;
}

export const STAR_RANKS: readonly StarRank[] = BALANCE.runeDepth.stars.map(([tier, count]) => ({ tier, count }));

// ---------- Celestial Auras ----------

export interface AuraEffect {
  stat: string;
  /** Multiplier while equipped. */
  mul: number;
}

export interface AuraDef {
  id: string;
  name: string;
  /** log10 of the base odds "1 in N". */
  log10: number;
  color: string;
  effects: readonly AuraEffect[];
}

const AURA_NAMES: Array<[string, string, string]> = [
  ['haze', 'Comet Haze', '#C9C2F2'],
  ['veil', 'Dust Veil', '#D8C08A'],
  ['ember', 'Ember Glow', '#FF8A3D'],
  ['frost', 'Frost Halo', '#9FE7FF'],
  ['wind', 'Solar Wind', '#FFC83D'],
  ['mist', 'Moonlit Mist', '#B9C4FF'],
  ['ribbon', 'Aurora Ribbon', '#5FD39B'],
  ['ion', 'Ion Storm', '#4FB6FF'],
  ['bloom', 'Nebula Bloom', '#2EE6FF'],
  ['beat', 'Pulsar Beat', '#B06BFF'],
  ['starfall', 'Starfall', '#FFE08A'],
  ['ring', 'Ringlight', '#E8E0FF'],
  ['flare', 'Crimson Flare', '#FF5640'],
  ['well', 'Gravity Well', '#7B3FD6'],
  ['tide', 'Cosmic Tide', '#1E8FA8'],
  ['eclipse', 'Eclipse', '#3A2470'],
  ['glare', 'Quasar Glare', '#FFB347'],
  ['whisper', 'Void Whisper', '#6E5CC4'],
  ['ash', 'Supernova Ash', '#FF4FC1'],
  ['prism', 'Prism Storm', '#7DFF5A'],
  ['magnetar', 'Magnetar Pulse', '#FF9EF0'],
  ['dark', 'Dark Nebula', '#4C3BC4'],
  ['choir', 'Celestial Choir', '#2EE6FF'],
  ['horizon', 'Horizon Ring', '#8C97C2'],
  ['spiral', 'Galaxy Spiral', '#B98CFF'],
  ['starborn', 'Starborn', '#FFFFFF'],
  ['dawn', 'Eternal Dawn', '#FFC83D'],
  ['chronos', 'Chronos Halo', '#E8E0FF'],
  ['throne', 'Astral Throne', '#FF7A2E'],
  ['crown', 'Stellar Crown', '#FFE08A'],
];

const AURA_STATS = ['productionMult', 'tapPower', 'shardGain', 'essenceGain', 'oreGain', 'alloyGain'];
const AURA_SPECIALS = ['runeBulk', 'runeLuck', 'mutationLuck', 'auraLuck'];

function auraEffects(i: number): AuraEffect[] {
  const A = BALANCE.runeDepth.auras;
  // +5% for the commonest to +500% for the rarest, evenly spaced on a log scale
  const b = A.minBoost * (A.maxBoost / A.minBoost) ** (i / (AURA_NAMES.length - 1));
  if (i === AURA_NAMES.length - 1) {
    // Stellar Crown: +500% to the main stats and rune bulk, +300% rune luck
    return [...['productionMult', 'tapPower', 'shardGain', 'essenceGain', 'runeBulk'].map((stat) => ({ stat, mul: 1 + b })), { stat: 'runeLuck', mul: 4 }];
  }
  const count = 1 + Math.floor(i / 8);
  const out: AuraEffect[] = [];
  for (let k = 0; k < count; k++) out.push({ stat: AURA_STATS[(i + k) % AURA_STATS.length]!, mul: 1 + b });
  if (i % 3 === 2) out.push({ stat: AURA_SPECIALS[Math.floor(i / 3) % AURA_SPECIALS.length]!, mul: 1 + b / 2 });
  return out;
}

export const AURAS: readonly AuraDef[] = AURA_NAMES.map(([id, name, color], i) => {
  const A = BALANCE.runeDepth.auras;
  const lo = Math.log10(A.firstOdds);
  const hi = Math.log10(A.lastOdds);
  return { id: `aura.${id}`, name, color, log10: lo + ((hi - lo) * i) / (AURA_NAMES.length - 1), effects: auraEffects(i) };
});

export const AURA_BY_ID: ReadonlyMap<string, AuraDef> = new Map(AURAS.map((a) => [a.id, a]));

// ---------- Mutations ----------

export interface MutationDef {
  id: string;
  name: string;
  /** What a mutated copy or asteroid counts as. */
  mult: number;
  log10: number;
  color: string;
}

export const MUTATIONS: readonly MutationDef[] = BALANCE.runeDepth.mutations.map(([id, name, mult, odds, color]) => ({ id, name, mult, log10: Math.log10(odds), color }));

export const MUTATION_BY_ID: ReadonlyMap<string, MutationDef> = new Map(MUTATIONS.map((m) => [m.id, m]));

/** Things that can mutate. Wyrms and nursery stars join when they arrive. */
export const MUTATION_TARGETS: ReadonlyArray<{ id: string; name: string; built: boolean }> = [
  { id: 'rune', name: 'Runes', built: true },
  { id: 'asteroid', name: 'Asteroids', built: true },
  { id: 'wyrm', name: 'Void Wyrms', built: true },
  { id: 'nursery', name: 'Nursery stars', built: true },
];

// ---------- The Index ----------

export interface IndexPage {
  id: string;
  name: string;
  icon: string;
  /** The stat each completion milestone multiplies, and by how much. */
  stat: string;
  per: number;
  /** Pages for systems that arrive later show as locked. */
  built: boolean;
  req: Requirement;
}

export const INDEX_PAGES: readonly IndexPage[] = [
  { id: 'runes', name: 'Runes', icon: 'rune', stat: 'runeLuck', per: 1.25, built: true, req: { kind: 'count', stat: 'nebulasAll', count: 1, noun: 'Nebula' } },
  { id: 'auras', name: 'Auras', icon: 'aura', stat: 'runeBulk', per: 1.5, built: true, req: { kind: 'count', stat: 'nebulasAll', count: BALANCE.runeDepth.opens.auras, noun: 'Nebula' } },
  { id: 'elements', name: 'Elements', icon: 'atom', stat: 'productionMult', per: 2, built: true, req: { kind: 'count', stat: 'nebulasAll', count: 1, noun: 'Nebula' } },
  { id: 'relics', name: 'Relics', icon: 'ingot', stat: 'alloyGain', per: 1.5, built: true, req: { kind: 'count', stat: 'nebulasAll', count: 1, noun: 'Nebula' } },
  { id: 'mutations', name: 'Mutations', icon: 'mutation', stat: 'mutationLuck', per: 1.25, built: true, req: { kind: 'count', stat: 'nebulasAll', count: BALANCE.runeDepth.opens.mutations, noun: 'Nebula' } },
  { id: 'wyrms', name: 'Void Wyrms', icon: 'wyrm', stat: 'wyrmXp', per: 1.5, built: true, req: { kind: 'count', stat: 'wyrmsHatched', count: 1, noun: 'Void Wyrm hatched' } },
  { id: 'species', name: 'Star species', icon: 'nursery', stat: 'essenceGain', per: 1.5, built: true, req: { kind: 'count', stat: 'nurseryHarvests', count: 1, noun: 'nursery harvest' } },
  { id: 'cards', name: 'Tarot cards', icon: 'card', stat: 'shardGain', per: 1.5, built: true, req: { kind: 'count', stat: 'cardsDrawn', count: 1, noun: 'Tarot card' } },
  { id: 'galaxies', name: 'Galaxies', icon: 'mystery', stat: 'productionMult', per: 2, built: false, req: { kind: 'count', stat: 'galactics', count: 1, noun: 'Galactic Rebirth' } },
];

export const INDEX_PAGE_BY_ID: ReadonlyMap<string, IndexPage> = new Map(INDEX_PAGES.map((p) => [p.id, p]));
