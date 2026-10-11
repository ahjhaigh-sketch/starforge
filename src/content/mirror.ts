import { BALANCE } from './balance';
import type { KitEngine } from '../engine/engineKit';
import { ENGINE_BY_ID } from './engines';
import { TIERS } from './tiers';

/**
 * The Antimatter Mirror and the Wormhole Network (Game design: "Singularity"; UUT's Anti-World).
 * The Mirror is the Stardust layer again, run by the same engine kit with this data, under
 * inverted rules:
 * - its 10 engines are the Stardust layer's top ten in reverse order (the Anti-Lantern first);
 * - milestones slow price growth instead of doubling output (x1.3 a purchase at first, x1.06
 *   past 1,000 owned), so the more you own the cheaper the next one is by comparison;
 * - each Antimatter engine is boosted by its Stardust twin's Mastery rank;
 * - the anti-star collapses down the Star Tiers (White Hole to Protostar) instead of evolving up,
 *   and each collapse scraps the Antimatter engines (evolving keeps your engines; collapsing loses them).
 * IDs never change.
 */
const M = BALANCE.mirror;

export interface AntimatterEngine extends KitEngine {
  /** The Stardust engine it mirrors. */
  twin: string;
  color: string;
  icon: string;
}

const TWINS = ['lantern', 'foundry', 'bellows', 'turbine', 'loom', 'choir', 'quasar', 'pulsar', 'dyson', 'sail'];

export const ANTIMATTER_ENGINES: readonly AntimatterEngine[] = TWINS.map((twin, k) => {
  const t = ENGINE_BY_ID.get(twin)!;
  return {
    id: `am.${twin}`,
    name: `Anti-${t.name.split(' ').slice(-1)[0]}`,
    twin,
    baseCost: M.engineCostBase * M.engineCostGrowth ** k,
    baseProd: M.engineProdBase * M.engineProdGrowth ** k,
    color: t.color,
    icon: t.icon,
  };
});

export const AM_ENGINE_BY_ID: ReadonlyMap<string, AntimatterEngine> = new Map(ANTIMATTER_ENGINES.map((e) => [e.id, e]));

/** Collapse steps: depth d takes the anti-star from tier 11 - d down to tier 10 - d. */
export const MIRROR_DEPTHS = TIERS.slice(0, TIERS.length - 1)
  .map((_, i) => TIERS[TIERS.length - 2 - i]!)
  .map((t, d) => ({ depth: d + 1, name: t.name, color: t.color, cost: M.depthCost * M.depthGrowth ** d }));

export type MirrorEffect =
  | { kind: 'mult'; stat: string; value: number }
  | { kind: 'add'; stat: string; value: number }
  | { kind: 'logStardust'; stat: string; pow: number }
  | { kind: 'logAntimatter'; stat: string; per: number }
  | { kind: 'powAntimatter'; stat: string; pow: number }
  | { kind: 'flag'; flag: string };

export interface MirrorUpgrade {
  id: string;
  name: string;
  desc: string;
  cost: number;
  /** Collapse depth needed first. */
  depth: number;
  effect: MirrorEffect;
}

export const MIRROR_UPGRADES: readonly MirrorUpgrade[] = [
  { id: 'mu.spark', name: 'Mirror Spark', desc: 'Antimatter x2.', cost: M.upgradeCosts[0]!, depth: 0, effect: { kind: 'mult', stat: 'antimatterMult', value: 2 } },
  { id: 'mu.twins', name: 'Twin Bond', desc: 'Each Mastery rank of a Stardust twin boosts its Antimatter engine twice as much.', cost: M.upgradeCosts[1]!, depth: 1, effect: { kind: 'flag', flag: 'twins' } },
  { id: 'mu.annihilate', name: 'Annihilation', desc: 'Antimatter x(1 + log10(1 + Stardust))^0.25.', cost: M.upgradeCosts[2]!, depth: 2, effect: { kind: 'logStardust', stat: 'antimatterMult', pow: 0.25 } },
  { id: 'mu.dark', name: 'Dark Mirror', desc: 'Dark Matter x(1 + log10(1 + Antimatter) / 10).', cost: M.upgradeCosts[3]!, depth: 3, effect: { kind: 'logAntimatter', stat: 'darkMatterGain', per: 0.1 } },
  { id: 'mu.glass', name: 'Thin Glass', desc: 'Antimatter engines cost a tenth.', cost: M.upgradeCosts[4]!, depth: 4, effect: { kind: 'mult', stat: 'amCostMult', value: 0.1 } },
  { id: 'mu.mist', name: 'Reflected Mist', desc: 'Essence x(1 + Antimatter)^0.1.', cost: M.upgradeCosts[5]!, depth: 6, effect: { kind: 'powAntimatter', stat: 'essenceGain', pow: 0.1 } },
  { id: 'mu.deep', name: 'Deep Reflection', desc: 'Each collapse gives x4 Antimatter instead of x3.', cost: M.upgradeCosts[6]!, depth: 8, effect: { kind: 'flag', flag: 'deep' } },
  { id: 'mu.clock', name: 'Backwards Clock', desc: 'The game runs 10% faster.', cost: M.upgradeCosts[7]!, depth: 10, effect: { kind: 'add', stat: 'gameSpeed', value: 0.1 } },
  { id: 'mu.key', name: 'The Mirror Key', desc: 'Opens the way to Galactic Rebirth.', cost: M.upgradeCosts[8]!, depth: 11, effect: { kind: 'flag', flag: 'key' } },
];

export const MIRROR_UPGRADE_BY_ID: ReadonlyMap<string, MirrorUpgrade> = new Map(MIRROR_UPGRADES.map((u) => [u.id, u]));

// ---------- the Wormhole Network ----------

/**
 * The systems on the map: each node's output is one multiplier stat. A link A to B with share p raises
 * A's multiplier to the power (1 - p) (A gives up that share of its orders of magnitude) and gives
 * B x(1 + p x log10(1 + A))^weight: Dark Matter (the Galactic gate) takes a quarter; Essence,
 * Antimatter and rune bulk half.
 */
export const WORMHOLE_NODES: ReadonlyArray<{ id: string; name: string; stat: string; color: string; icon: string; weight: number; x: number; y: number }> = [
  { id: 'stardust', name: 'Stardust', stat: 'productionMult', color: '#FFC83D', icon: 'stardust', weight: 1, x: 0, y: -170 },
  { id: 'taps', name: 'Taps', stat: 'tapPower', color: '#FF7AE0', icon: 'pulse', weight: 1, x: 100, y: -138 },
  { id: 'shards', name: 'Shards', stat: 'shardGain', color: '#FF4FC1', icon: 'shard', weight: 1, x: 162, y: -53 },
  { id: 'darkmatter', name: 'Dark Matter', stat: 'darkMatterGain', color: '#6E5CC4', icon: 'darkmatter', weight: 0.25, x: 162, y: 53 },
  { id: 'ore', name: 'Ore', stat: 'oreGain', color: '#5FD39B', icon: 'belt', weight: 1, x: 100, y: 138 },
  { id: 'alloy', name: 'Alloy', stat: 'alloyGain', color: '#2EE6FF', icon: 'ingot', weight: 1, x: 0, y: 170 },
  { id: 'essence', name: 'Essence', stat: 'essenceGain', color: '#1E8FA8', icon: 'nebula', weight: 0.5, x: -100, y: 138 },
  { id: 'antimatter', name: 'Antimatter', stat: 'antimatterMult', color: '#9FE7FF', icon: 'antimatter', weight: 0.5, x: -162, y: 53 },
  { id: 'embers', name: 'Embers', stat: 'emberGain', color: '#FF8A3D', icon: 'ember', weight: 1, x: -162, y: -53 },
  { id: 'runes', name: 'Rune bulk', stat: 'runeBulk', color: '#B06BFF', icon: 'rune', weight: 0.5, x: -100, y: -138 },
];

export const WORMHOLE_NODE_BY_ID = new Map(WORMHOLE_NODES.map((n) => [n.id, n]));
