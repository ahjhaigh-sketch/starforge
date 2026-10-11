import { BALANCE } from './balance';
import type { Requirement } from './requirements';

/**
 * Cosmic Constants: infinite upgrades with no level cap (Math and balance tab, "Infinite
 * upgrades"). Every set uses the one module in engine/systems/constants.ts; later layers add
 * their own sets (Nova, Nebula, Void, Galactic, Eternal, Omni) as more data here.
 *
 * Cost of level L = base x g^L, with g stepping up to g^1.1 after level 1,000 and g^1.2 after
 * 100,000. Each effect is (1 + a x L), doubled every 25 levels up to 1,000, then every 100 up to
 * 100,000, then every 1,000.
 */
export interface ConstantEffect {
  stat: string;
  /** Strength per level. */
  a: number;
  /** Whether the milestone doublings apply to this effect. */
  doubles: boolean;
  /** Plain words for the tooltip: "Engine output". */
  what: string;
}

export interface ConstantDef {
  id: string;
  set: string;
  name: string;
  icon: string;
  color: string;
  currency: string;
  base: number;
  growth: number;
  effects: readonly ConstantEffect[];
  /** Extra requirement on top of the set's (Orbit needs the Orbitals). */
  req?: Requirement;
  desc: string;
}

export interface ConstantSetDef {
  id: string;
  name: string;
  layer: string;
  req: Requirement;
}

export const CONSTANT_SETS: readonly ConstantSetDef[] = [
  { id: 'stellar', name: 'Stellar Constants', layer: 'stardust', req: { kind: 'tier', tier: 2 } },
  { id: 'nebula', name: 'Nebula Constants', layer: 'nebula', req: { kind: 'count', stat: 'nebulasAll', count: 1, noun: 'Nebula' } },
];

export const CONSTANTS: readonly ConstantDef[] = [
  {
    id: 'stellar.gravity',
    set: 'stellar',
    name: 'Gravity',
    icon: 'constants',
    color: '#7B3FD6',
    currency: 'stardust',
    base: 50_000,
    growth: BALANCE.constants.gravity,
    effects: [{ stat: 'productionMult', a: 0.05, doubles: true, what: 'Engine output' }],
    desc: 'Pulls more stardust into every engine.',
  },
  {
    id: 'stellar.light',
    set: 'stellar',
    name: 'Light',
    icon: 'stardust',
    color: '#C99A1E',
    currency: 'stardust',
    base: 20_000,
    growth: BALANCE.constants.light,
    effects: [{ stat: 'tapPower', a: 0.1, doubles: true, what: 'Tap power' }],
    desc: 'Every tap shines brighter.',
  },
  {
    id: 'stellar.heat',
    set: 'stellar',
    name: 'Heat',
    icon: 'comet',
    color: '#C2561E',
    currency: 'stardust',
    base: 100_000,
    growth: BALANCE.constants.heat,
    effects: [
      { stat: 'luckyMult', a: 0.1, doubles: true, what: 'Lucky comets' },
      { stat: 'buffDuration', a: 0.01, doubles: false, what: 'Comet buff length' },
    ],
    desc: 'Comets burn longer and brighter.',
  },
  {
    id: 'stellar.orbit',
    set: 'stellar',
    name: 'Orbit',
    icon: 'orbit',
    color: '#1A9DB8',
    currency: 'stardust',
    base: 5e6,
    growth: BALANCE.constants.orbit,
    effects: [{ stat: 'planetPower', a: 0.05, doubles: true, what: 'Planet bonuses' }],
    req: { kind: 'tier', tier: 3 },
    desc: 'Tightens every orbit: planets give more.',
  },
  // Nebula Constants: bought with Essence, kept through every Nebula. Rune speed and bulk live here,
  // so runes per second can climb from 1 to quintillions over the game.
  {
    id: 'nebula.speed',
    set: 'nebula',
    name: 'Rune Speed',
    icon: 'rune',
    color: '#2EE6FF',
    currency: 'essence',
    base: 2,
    growth: BALANCE.constants.runeSpeed,
    effects: [{ stat: 'runeSpeed', a: 0.05, doubles: true, what: 'Rolls a second' }],
    desc: 'Rolls runes faster (at most 20 rolls a second).',
  },
  {
    id: 'nebula.bulk',
    set: 'nebula',
    name: 'Rune Bulk',
    icon: 'rune',
    color: '#B06BFF',
    currency: 'essence',
    base: 3,
    growth: BALANCE.constants.runeBulk,
    effects: [{ stat: 'runeBulk', a: 0.1, doubles: true, what: 'Runes a roll' }],
    desc: 'More runes in every roll.',
  },
  {
    id: 'nebula.resonance',
    set: 'nebula',
    name: 'Resonance',
    icon: 'pulse',
    color: '#FF4FC1',
    currency: 'essence',
    base: 10,
    growth: BALANCE.constants.resonance,
    effects: [{ stat: 'runeEffect', a: 0.02, doubles: false, what: 'Rune effects' }],
    desc: "Every rune's boost is stronger.",
  },
  {
    id: 'nebula.drift',
    set: 'nebula',
    name: 'Drift',
    icon: 'nebula',
    color: '#1E8FA8',
    currency: 'essence',
    base: 5,
    growth: BALANCE.constants.drift,
    effects: [{ stat: 'essenceGain', a: 0.05, doubles: true, what: 'Essence' }],
    desc: 'More Essence from every Nebula.',
  },
];

export const CONSTANT_BY_ID: ReadonlyMap<string, ConstantDef> = new Map(CONSTANTS.map((c) => [c.id, c]));

/** Level thresholds where the doubling interval widens. */
export const CONSTANT_BRACKETS = { first: 1000, second: 100_000, growthPow: [1, 1.1, 1.2], doubleEvery: [25, 100, 1000] } as const;
