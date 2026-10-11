import { BALANCE } from './balance';

/**
 * Building the galaxy (Game design: "Galactic Rebirth, Big Crunch and Multiverse"): Megastructures,
 * Colonies and Terraforming. IDs never change.
 */
const B = BALANCE.galaxyBuild;

// ---------- Megastructures ----------

export interface MegaReward {
  stat: string;
  op: 'mul' | 'add';
  /** Per stage built. */
  value: number;
}

export interface MegastructureDef {
  id: string;
  name: string;
  color: string;
  desc: string;
  /** Galactic Rebirths needed before it can be started. */
  galactics: number;
  /** Each stage costs these currencies: 10^(base + step x stage). */
  cost: Record<string, readonly [base: number, step: number]>;
  reward: MegaReward;
  rewardText: string;
}

export const MEGASTRUCTURES: readonly MegastructureDef[] = [
  {
    id: 'dyson',
    name: 'Dyson Swarm',
    color: '#FFC83D',
    desc: 'A cloud of mirrors round your star, drinking every photon.',
    galactics: 1,
    cost: { stardust: [380, 20], 'alloy.iron': [50, 4], darkMatter: [7, 1] },
    reward: { stat: 'productionMult', op: 'mul', value: 1e10 },
    rewardText: 'Stardust x1e10',
  },
  {
    id: 'ringworld',
    name: 'Ringworld',
    color: '#5FD39B',
    desc: 'A habitable band all the way round the star.',
    galactics: 1,
    cost: { ore: [90, 1.5], 'alloy.gold': [52, 2.5], galaxyCores: [0.7, 0.4] },
    reward: { stat: 'colonyCapacity', op: 'mul', value: 3 },
    rewardText: 'Colony capacity x3',
  },
  {
    id: 'matrioshka',
    name: 'Matrioshka Brain',
    color: '#B06BFF',
    desc: 'Nested shells of thought, each fed by the waste heat of the last.',
    galactics: 2,
    cost: { essence: [150, 25], embers: [16, 1], antimatter: [12, 4] },
    reward: { stat: 'essenceGain', op: 'mul', value: 1e10 },
    rewardText: 'Essence x1e10',
  },
  {
    id: 'starlifter',
    name: 'Star Lifter',
    color: '#FF5640',
    desc: 'Magnetic funnels that pull matter from the poles.',
    galactics: 3,
    cost: { shards: [270, 25], darkMatter: [10, 1.5], scales: [3, 0.5] },
    reward: { stat: 'darkMatterGain', op: 'mul', value: 1.25 },
    rewardText: 'Dark Matter x1.25',
  },
  {
    id: 'stellarengine',
    name: 'Stellar Engine',
    color: '#2EE6FF',
    desc: 'A mirror the size of a world: it steers the whole star.',
    galactics: 4,
    cost: { antimatter: [18, 3], 'alloy.iron': [60, 2], galaxyCores: [1, 0.5] },
    reward: { stat: 'gameSpeed', op: 'add', value: 0.1 },
    rewardText: 'The game runs 10% faster',
  },
  {
    id: 'birch',
    name: 'Birch Planet',
    color: '#FF4FC1',
    desc: 'A shell round a black hole, wider than a solar system.',
    galactics: 5,
    cost: { essence: [250, 10], darkMatter: [13, 1], galaxyCores: [1.5, 0.5] },
    reward: { stat: 'galaxyCoreGain', op: 'mul', value: 1.2 },
    rewardText: 'Galaxy Cores x1.2',
  },
];

export const MEGA_BY_ID: ReadonlyMap<string, MegastructureDef> = new Map(MEGASTRUCTURES.map((m) => [m.id, m]));

/** What each currency is called on a price tag. */
export const CURRENCY_LABEL: Record<string, string> = {
  stardust: 'Stardust',
  shards: 'Nova Shards',
  essence: 'Essence',
  darkMatter: 'Dark Matter',
  galaxyCores: 'Galaxy Cores',
  antimatter: 'Antimatter',
  embers: 'Embers',
  ore: 'Ore',
  scales: 'Scales',
  'alloy.iron': 'Iron alloy',
  'alloy.gold': 'Gold alloy',
  supply: 'Supply',
};

// ---------- Colonies ----------

export interface ColonyType {
  id: string;
  name: string;
  color: string;
  /** The stat its colonies boost: x(1 + log10(1 + population))^power. */
  stat: string;
  power: number;
  what: string;
}

export const COLONY_TYPES: readonly ColonyType[] = [
  { id: 'rocky', name: 'Rocky world', color: '#C2561E', stat: 'productionMult', power: 4, what: 'Stardust' },
  { id: 'ocean', name: 'Ocean world', color: '#2B7FD0', stat: 'essenceGain', power: 3, what: 'Essence' },
  { id: 'desert', name: 'Desert world', color: '#FFB347', stat: 'shardGain', power: 3, what: 'shards' },
  { id: 'ice', name: 'Ice world', color: '#9FE7FF', stat: 'darkMatterGain', power: 0.4, what: 'Dark Matter' },
  { id: 'gasmoon', name: 'Gas-giant moon', color: '#B06BFF', stat: 'antimatterMult', power: 2, what: 'Antimatter' },
];

export const COLONY_TYPE_BY_ID: ReadonlyMap<string, ColonyType> = new Map(COLONY_TYPES.map((t) => [t.id, t]));

export type BuildingId = 'housing' | 'farms' | 'factories';

export const BUILDINGS: ReadonlyArray<{ id: BuildingId; name: string; desc: string }> = [
  { id: 'housing', name: 'Housing', desc: `Room for x${B.housingMult} more people.` },
  { id: 'farms', name: 'Farms', desc: `The population grows x${B.farmsMult} as fast.` },
  { id: 'factories', name: 'Factories', desc: `x${B.factoriesMult} Supply.` },
];

export interface ResearchDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
}

export const RESEARCH: readonly ResearchDef[] = [
  { id: 'res.hydro', name: 'Hydroponics', desc: 'Every colony grows twice as fast.', cost: B.researchCosts[0]! },
  { id: 'res.terra', name: 'Terraformers', desc: 'Terraforming opens: give each colony planet its biomes.', cost: B.researchCosts[1]! },
  { id: 'res.arco', name: 'Arcologies', desc: 'Colony capacity x10.', cost: B.researchCosts[2]! },
  { id: 'res.customs', name: 'Customs', desc: 'Trade routes give twice as much.', cost: B.researchCosts[3]! },
  { id: 'res.genetics', name: 'Genetics', desc: "Colonies' bonuses are 25% stronger.", cost: B.researchCosts[4]! },
  { id: 'res.warp', name: 'Warp Lanes', desc: 'Two more trade routes.', cost: B.researchCosts[5]! },
];

export const RESEARCH_BY_ID: ReadonlyMap<string, ResearchDef> = new Map(RESEARCH.map((r) => [r.id, r]));

/** Colony names, given in order. */
export const COLONY_NAMES = ['New Dawn', 'Ember Reach', 'Tidewell', 'Frostgate', 'Dune Haven', 'Halo Point', 'Cinder Bay', 'Aurora Rest', 'Far Shore', 'Last Light'];

// ---------- Terraforming ----------

export interface Biome {
  id: string;
  name: string;
  color: string;
}

export const BIOMES: readonly Biome[] = [
  { id: 'ocean', name: 'Ocean', color: '#2B7FD0' },
  { id: 'forest', name: 'Crystal forest', color: '#5FD39B' },
  { id: 'lava', name: 'Lava field', color: '#FF5640' },
  { id: 'tundra', name: 'Aurora tundra', color: '#B8D4FF' },
];

export const BIOME_BY_ID: ReadonlyMap<string, Biome> = new Map(BIOMES.map((b) => [b.id, b]));

/** What two neighbouring biomes are worth together (the same pair either way round). */
const PAIRS: Record<string, number> = {
  'ocean|forest': 3,
  'forest|tundra': 2,
  'ocean|tundra': 1,
  'lava|tundra': 3,
  'lava|ocean': -2,
  'lava|forest': -1,
  'ocean|ocean': 1,
  'forest|forest': 1,
  'tundra|tundra': 1,
  'lava|lava': 0,
};

export function pairValue(a: string, b: string): number {
  return PAIRS[`${a}|${b}`] ?? PAIRS[`${b}|${a}`] ?? 0;
}

/** The 19 hexes of a planet (axial coordinates, radius 2), and which ones touch. */
export const HEXES: ReadonlyArray<{ q: number; r: number }> = (() => {
  const out: Array<{ q: number; r: number }> = [];
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) out.push({ q, r });
  return out;
})();

export const HEX_EDGES: ReadonlyArray<readonly [number, number]> = (() => {
  const edges: Array<[number, number]> = [];
  const dirs = [
    [1, 0],
    [0, 1],
    [-1, 1],
  ];
  HEXES.forEach((h, i) => {
    for (const [dq, dr] of dirs) {
      const j = HEXES.findIndex((o) => o.q === h.q + dq! && o.r === h.r + dr!);
      if (j >= 0) edges.push([i, j]);
    }
  });
  return edges;
})();

/** A planet's score: every touching pair of biomes, counted once. Empty hexes count nothing. */
export function planetScore(grid: ReadonlyArray<string | null>): number {
  let score = 0;
  for (const [a, b] of HEX_EDGES) {
    const x = grid[a];
    const y = grid[b];
    if (x && y) score += pairValue(x, y);
  }
  return score;
}
