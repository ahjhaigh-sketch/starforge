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
  { id: 'void', name: 'Void Constants', layer: 'singularity', req: { kind: 'count', stat: 'singularitiesAll', count: 1, noun: 'Singularity' } },
  { id: 'galactic', name: 'Galactic Constants', layer: 'galactic', req: { kind: 'count', stat: 'galacticsAll', count: 1, noun: 'Galactic Rebirth' } },
  { id: 'eternal', name: 'Eternal Constants', layer: 'crunch', req: { kind: 'count', stat: 'crunchesAll', count: 1, noun: 'Big Crunch' } },
  { id: 'omni', name: 'Omni Constants', layer: 'multiverse', req: { kind: 'count', stat: 'multiversesAll', count: 1, noun: 'Multiverse' } },
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
  // 1.3.0: more for the Starforge and Deep Core (Stellar) and the Belt (Nebula)
  {
    id: 'stellar.forge',
    set: 'stellar',
    name: 'Forge Heat',
    icon: 'forge',
    color: '#FF7A2E',
    currency: 'stardust',
    base: 1e9,
    growth: BALANCE.constants.forge,
    effects: [
      { stat: 'oreGain', a: 0.05, doubles: true, what: 'Ore' },
      { stat: 'alloyGain', a: 0.05, doubles: true, what: 'Alloy' },
    ],
    req: { kind: 'count', stat: 'supernovasAll', count: 3, noun: 'Supernova' },
    desc: 'The Starforge burns hotter: more ore and alloy.',
  },
  {
    id: 'stellar.core',
    set: 'stellar',
    name: 'Core Pressure',
    icon: 'drill',
    color: '#C2561E',
    currency: 'stardust',
    base: 1e12,
    growth: BALANCE.constants.core,
    effects: [{ stat: 'drillPower', a: 0.05, doubles: true, what: 'Drilling power' }],
    req: { kind: 'count', stat: 'supernovasAll', count: 5, noun: 'Supernova' },
    desc: 'Deep Core drills bite harder.',
  },
  {
    id: 'nebula.current',
    set: 'nebula',
    name: 'Belt Current',
    icon: 'belt',
    color: '#3B8FD0',
    currency: 'essence',
    base: 30,
    growth: BALANCE.constants.current,
    effects: [
      { stat: 'oreGain', a: 0.05, doubles: true, what: 'Ore' },
      { stat: 'beltLuck', a: 0.02, doubles: false, what: 'Asteroid luck' },
    ],
    desc: 'The tide of the nebula carries richer rocks into the Belt.',
  },
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
  {
    id: 'nebula.bloom',
    set: 'nebula',
    name: 'Bloom',
    icon: 'nursery',
    color: '#FF7AE0',
    currency: 'essence',
    base: 20,
    growth: BALANCE.constants.bloom,
    effects: [{ stat: 'nurseryYield', a: 0.1, doubles: true, what: 'Nursery harvests' }],
    req: { kind: 'count', stat: 'nebulasAll', count: BALANCE.nursery.nebulas, noun: 'Nebula' },
    desc: 'More Essence from every Star Nursery harvest.',
  },
  // Void Constants: bought with Dark Matter, kept through every Singularity.
  {
    id: 'void.mass',
    set: 'void',
    name: 'Mass',
    icon: 'blackhole',
    color: '#FFB347',
    currency: 'darkMatter',
    base: 2,
    growth: BALANCE.constants.mass,
    effects: [{ stat: 'massGain', a: 0.1, doubles: true, what: 'Black Hole mass' }],
    desc: 'The Black Hole grows faster from everything you feed it.',
  },
  {
    id: 'void.spin',
    set: 'void',
    name: 'Spin',
    icon: 'blackhole',
    color: '#2EE6FF',
    currency: 'darkMatter',
    base: 5,
    growth: BALANCE.constants.spin,
    effects: [{ stat: 'gameSpeed', a: 0.01, doubles: false, what: 'Game speed' }],
    desc: 'The whole game runs 1% faster a level, offline too.',
  },
  {
    id: 'void.horizon',
    set: 'void',
    name: 'Horizon',
    icon: 'blackhole',
    color: '#6E5CC4',
    currency: 'darkMatter',
    base: 3,
    growth: BALANCE.constants.horizon,
    effects: [{ stat: 'darkMatterGain', a: 0.1, doubles: false, what: 'Dark Matter' }],
    desc: 'More Dark Matter from every Singularity.',
  },
  {
    id: 'void.charge',
    set: 'void',
    name: 'Reactor Charge',
    icon: 'reactor',
    color: '#FF4F6E',
    currency: 'darkMatter',
    base: 10,
    growth: BALANCE.constants.charge,
    effects: [{ stat: 'reactorPower', a: 0.05, doubles: false, what: 'Reactor strength' }],
    desc: "The Reactor's charge counts for more, up to twice as much.",
  },
  // Galactic Constants: bought with Galaxy Cores, kept through every Galactic Rebirth.
  {
    id: 'gal.expansion',
    set: 'galactic',
    name: 'Expansion',
    icon: 'galaxy',
    color: '#B4F04A',
    currency: 'galaxyCores',
    base: 3,
    growth: BALANCE.constants.expansion,
    effects: [{ stat: 'galaxyRewardPower', a: BALANCE.galactic.expansionPer, doubles: false, what: 'Cleared galaxy rewards' }],
    desc: "Every cleared galaxy's reward grows stronger, up to three times as strong.",
  },
  {
    id: 'gal.arms',
    set: 'galactic',
    name: 'Arms',
    icon: 'tree',
    color: '#5FD39B',
    currency: 'galaxyCores',
    base: 5,
    growth: BALANCE.constants.arms,
    effects: [{ stat: 'galacticTreePower', a: BALANCE.galactic.armsPer, doubles: false, what: 'Galactic Tree multipliers' }],
    desc: "The Galactic Tree's multipliers grow stronger, up to twice as strong.",
  },
  {
    id: 'gal.halo',
    set: 'galactic',
    name: 'Halo',
    icon: 'colony',
    color: '#2B7FD0',
    currency: 'galaxyCores',
    base: 8,
    growth: BALANCE.constants.halo,
    effects: [{ stat: 'colonyCapacity', a: BALANCE.galaxyBuild.haloPer, doubles: false, what: 'Colony capacity' }],
    desc: 'Every colony has room for more people.',
  },
  {
    id: 'gal.lattice',
    set: 'galactic',
    name: 'Lattice',
    icon: 'mega',
    color: '#FFC83D',
    currency: 'galaxyCores',
    base: 12,
    growth: BALANCE.constants.lattice,
    effects: [{ stat: 'megaRewardPower', a: BALANCE.galaxyBuild.latticePer, doubles: false, what: 'Megastructure rewards' }],
    desc: 'Every megastructure stage gives more, up to twice as much.',
  },
  // Eternal Constants: bought with Chronons, kept through every Big Crunch.
  {
    id: 'et.entropy',
    set: 'eternal',
    name: 'Entropy',
    icon: 'chronon',
    color: '#FF8A3D',
    currency: 'chronons',
    base: 2,
    growth: BALANCE.constants.entropy,
    effects: [{ stat: 'chrononGain', a: 0.1, doubles: false, what: 'Chronons' }],
    desc: 'More Chronons from every Big Crunch.',
  },
  {
    id: 'et.recursion',
    set: 'eternal',
    name: 'Recursion',
    icon: 'echo',
    color: '#FFC83D',
    currency: 'chronons',
    base: 1,
    growth: BALANCE.constants.recursion,
    effects: [{ stat: 'echoMult', a: 0.25, doubles: true, what: 'Echo board output' }],
    desc: 'The Echo boards make more.',
  },
  // Omni Constants: the last infinite upgrades, never reset. Prices rise by a hair a level, so a universe buys
  // millions of levels; effects are linear, so no level ever pays for the next.
  {
    id: 'omni.gain',
    set: 'omni',
    name: 'Omni Gain',
    icon: 'multiverse',
    color: '#FF6AD5',
    currency: 'stardust',
    base: 1e100,
    growth: BALANCE.multiverse.omniGrowth.gain!,
    effects: [
      { stat: 'productionMult', a: 1e-3, doubles: false, what: 'Stardust' },
      { stat: 'shardGain', a: 1e-3, doubles: false, what: 'Nova Shards' },
      { stat: 'essenceGain', a: 1e-3, doubles: false, what: 'Essence' },
      { stat: 'darkMatterGain', a: 1e-5, doubles: false, what: 'Dark Matter' },
      { stat: 'galaxyCoreGain', a: 1e-6, doubles: false, what: 'Galaxy Cores' },
      { stat: 'chrononGain', a: 1e-6, doubles: false, what: 'Chronons' },
    ],
    desc: 'Every layer gains more, from Stardust to Chronons.',
  },
  {
    id: 'omni.luck',
    set: 'omni',
    name: 'Omni Luck',
    icon: 'dice',
    color: '#B06BFF',
    currency: 'essence',
    base: 1e50,
    growth: BALANCE.multiverse.omniGrowth.luck!,
    effects: [
      { stat: 'runeLuck', a: 1e-5, doubles: false, what: 'Rune Luck' },
      { stat: 'auraLuck', a: 1e-5, doubles: false, what: 'Aura luck' },
      { stat: 'mutationLuck', a: 1e-6, doubles: false, what: 'Mutation luck' },
    ],
    desc: 'Every roll in every shrine is luckier.',
  },
  {
    id: 'omni.speed',
    set: 'omni',
    name: 'Omni Speed',
    icon: 'auto',
    color: '#2EE6FF',
    currency: 'shards',
    base: 1e80,
    growth: BALANCE.multiverse.omniGrowth.speed!,
    effects: [
      { stat: 'gameSpeed', a: 2e-7, doubles: false, what: 'Game speed' },
      { stat: 'runeSpeed', a: 1e-6, doubles: false, what: 'Rune speed' },
      { stat: 'autoSpeed', a: 1e-6, doubles: false, what: 'Auto-buyers' },
    ],
    desc: 'Time itself runs faster, and so does every machine.',
  },
];

export const CONSTANT_BY_ID: ReadonlyMap<string, ConstantDef> = new Map(CONSTANTS.map((c) => [c.id, c]));

/** Level thresholds where the doubling interval widens. */
export const CONSTANT_BRACKETS = { first: 1000, second: 100_000, growthPow: [1, 1.1, 1.2], doubleEvery: [25, 100, 1000] } as const;
