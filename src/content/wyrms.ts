import { BALANCE } from './balance';

/**
 * Void Wyrms (Game design: "Void Wyrms"; Math and balance: "Belt, Starforge and Wyrm numbers").
 * 20 species, each in three forms (Normal, Golden x3, Rainbow x10): 60 variants. A species' rarity
 * is rolled with the rune odds at the square root of your luck; each boosts one currency and
 * breathes Embers. IDs never change.
 */
export interface WyrmSpecies {
  id: string;
  name: string;
  /** log10 of the base odds "1 in N" (the commonest is the fallback, 1 in 1). */
  log10: number;
  /** Rarity rank, 0 (commonest) to 19. */
  rank: number;
  color: string;
  /** The stat this species boosts. */
  stat: string;
}

export interface WyrmForm {
  id: string;
  name: string;
  mult: number;
}

export const WYRM_FORMS: readonly WyrmForm[] = [
  { id: 'normal', name: 'Normal', mult: BALANCE.wyrms.forms[0]! },
  { id: 'golden', name: 'Golden', mult: BALANCE.wyrms.forms[1]! },
  { id: 'rainbow', name: 'Rainbow', mult: BALANCE.wyrms.forms[2]! },
];

const RAW: Array<[string, string, number, string]> = [
  ['ashling', 'Ashling', 1, '#8C7A9E'],
  ['cinderwisp', 'Cinderwisp', 3, '#FF8A3D'],
  ['gloomfang', 'Gloomfang', 8, '#5B4C9E'],
  ['starscale', 'Starscale', 20, '#FFC83D'],
  ['nebulynx', 'Nebulynx', 50, '#2EE6FF'],
  ['voidcoil', 'Voidcoil', 120, '#6E5CC4'],
  ['pyrewing', 'Pyrewing', 300, '#FF5640'],
  ['frostmaw', 'Frostmaw', 750, '#9FE7FF'],
  ['duskserpent', 'Dusk Serpent', 2000, '#B06BFF'],
  ['auroradrake', 'Aurora Drake', 5000, '#5FD39B'],
  ['ironjaw', 'Ironjaw', 12_000, '#8C97C2'],
  ['glimmertail', 'Glimmertail', 30_000, '#FFE08A'],
  ['thunderhorn', 'Thunderhorn', 80_000, '#4FB6FF'],
  ['cometcrest', 'Cometcrest', 200_000, '#FF4FC1'],
  ['shadewyrm', 'Shadewyrm', 500_000, '#3A2470'],
  ['prismback', 'Prismback', 1.2e6, '#7DFF5A'],
  ['solarwyrm', 'Solar Wyrm', 3e6, '#FFB347'],
  ['eclipsedrake', 'Eclipse Drake', 8e6, '#C2453A'],
  ['quasarleviathan', 'Quasar Leviathan', 2e7, '#E8E0FF'],
  ['sylthaz', 'Sylthaz', 1e8, '#FF7AE0'],
];

/** The currencies Wyrms boost, one per species in turn. */
const STATS = ['productionMult', 'essenceGain', 'shardGain', 'tapPower', 'alloyGain', 'oreGain', 'emberGain', 'xpGain'];

export const WYRM_SPECIES: readonly WyrmSpecies[] = RAW.map(([id, name, odds, color], rank) => ({ id: `wyrm.${id}`, name, log10: Math.log10(odds), rank, color, stat: STATS[rank % STATS.length]! }));

export const WYRM_BY_ID: ReadonlyMap<string, WyrmSpecies> = new Map(WYRM_SPECIES.map((w) => [w.id, w]));

/** A stack of identical Wyrms is keyed "species|form|mutation" (mutation '' for none). */
export const wyrmKey = (species: string, form: number, mut = '') => `${species}|${form}|${mut}`;

export function parseWyrmKey(key: string): { species: string; form: number; mut: string } {
  const [species = '', form = '0', mut = ''] = key.split('|');
  return { species, form: Number(form) || 0, mut };
}
