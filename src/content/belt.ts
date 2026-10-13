/**
 * The Asteroid Belt, Deep Core Drilling and the Starsmith Level (Game design: "Asteroid Belt and
 * Starsmith Level"; Math and balance: "Belt, Starforge and Wyrm numbers"). Tunable numbers live
 * in balance.ts (BALANCE.belt, .drill, .starsmith); this file holds the tables. IDs never change.
 */
export interface RarityDef {
  id: string;
  name: string;
  /** Base odds: 1 in N per spawn (luck divides N; Iron is whatever is left). */
  oneIn: number;
  /** Ore and XP multiplier. */
  mult: number;
  color: string;
  glow: string;
}

export const RARITIES: readonly RarityDef[] = [
  { id: 'iron', name: 'Iron', oneIn: 1, mult: 1, color: '#8C97C2', glow: '' },
  { id: 'gold', name: 'Gold', oneIn: 50, mult: 10, color: '#FFC83D', glow: '#FFE08A' },
  { id: 'crystal', name: 'Crystal', oneIn: 400, mult: 50, color: '#9FE7FF', glow: '#2EE6FF' },
  { id: 'prismatic', name: 'Prismatic', oneIn: 5000, mult: 500, color: '#FF9EF0', glow: '#FF4FC1' },
  { id: 'void', name: 'Void', oneIn: 100_000, mult: 10_000, color: '#3A2470', glow: '#9B7CFF' },
];

export type BeltUpgradeId = 'value' | 'amount' | 'growth' | 'beam' | 'xp' | 'luck';

export interface BeltUpgradeDef {
  id: BeltUpgradeId;
  name: string;
  desc: string;
  icon: string;
}

export const BELT_UPGRADES: readonly BeltUpgradeDef[] = [
  { id: 'value', name: 'Value', desc: 'More ore from every asteroid.', icon: 'stardust' },
  { id: 'amount', name: 'Amount', desc: 'One more asteroid can drift in the field.', icon: 'belt' },
  { id: 'growth', name: 'Growth', desc: 'Asteroids drift in 10% faster.', icon: 'comet' },
  { id: 'beam', name: 'Beam', desc: 'A wider tractor beam (+10 px).', icon: 'orbit' },
  { id: 'xp', name: 'XP', desc: 'More Starsmith XP from every asteroid.', icon: 'level' },
  // 1.3.0: more for the Belt
  { id: 'luck', name: 'Lucky Rocks', desc: 'Rarer asteroids drift in 5% more often (up to 40 levels).', icon: 'dice' },
];

/** What each Belt Tier unlocks on top of x2 ore and XP. */
export const BELT_TIER_REWARDS: readonly string[] = [
  'A harvester drone that sweeps one asteroid a second',
  'Drones work twice as fast',
  'Passive ore: 10% of what the field holds, every second',
  'Belt upgrades no longer cost ore',
  'A second drone',
  'Drones work twice as fast again',
];

/** Deep Core Drilling: depth layers, each with its own ore. */
export interface DepthLayer {
  id: string;
  name: string;
  /** First depth of this layer. */
  from: number;
  ore: string;
  oreName: string;
  color: string;
}

export const DEPTH_LAYERS: readonly DepthLayer[] = [
  { id: 'crust', name: 'Crust', from: 0, ore: 'cobalt', oreName: 'Cobalt', color: '#6E7BAE' },
  { id: 'mantle', name: 'Mantle', from: 5, ore: 'garnet', oreName: 'Garnet', color: '#C2453A' },
  { id: 'core', name: 'Core', from: 10, ore: 'neutronium', oreName: 'Neutronium', color: '#9FE7FF' },
  { id: 'seam', name: 'Singularity Seam', from: 15, ore: 'starmetal', oreName: 'Starmetal', color: '#B06BFF' },
];

/** Starsmith perks: one point per level, reset for free at any time. */
export interface PerkDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  stat: string;
  op: 'add' | 'mul';
  /** A hidden perk: shown and usable only once this rune has been found. */
  needsRune?: string;
  /** Per point. */
  value: number;
}

export const PERKS: readonly PerkDef[] = [
  { id: 'ore', name: 'Prospector', desc: '+10% ore per point.', icon: 'belt', stat: 'oreGain', op: 'add', value: 0.1 },
  { id: 'cap', name: 'Wide Belt', desc: '+2 asteroids in the field per point.', icon: 'orbit', stat: 'beltCap', op: 'add', value: 2 },
  { id: 'growth', name: 'Gravity Lure', desc: 'Asteroids arrive 5% faster per point.', icon: 'comet', stat: 'beltSpawn', op: 'add', value: 0.05 },
  { id: 'xp', name: 'Scholar', desc: '+10% Starsmith XP per point.', icon: 'level', stat: 'xpGain', op: 'add', value: 0.1 },
  { id: 'beam', name: 'Long Beam', desc: '+3 px tractor beam per point.', icon: 'pulse', stat: 'beamRadius', op: 'add', value: 3 },
  { id: 'sylthaz', name: "Sylthaz's Whisper", desc: 'A secret from the hidden Dust rune: Stardust x1.5 per point.', icon: 'rune', stat: 'productionMult', op: 'mul', value: 1.5, needsRune: 'dust.hidden' },
];
