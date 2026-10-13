import type { KitEffect, KitNode } from '../engine/treeKit';
import { BALANCE } from './balance';
import { ENGINES } from './engines';

/**
 * Challenges and bosses (Game design: "Singularity": Trials, the Spire, Void Leviathans).
 * Trials are optional restricted runs: entering one resets the Supernova run and switches its
 * debuffs on through the stat pipeline; reaching the goal earns a level and a permanent reward.
 * No Trial is ever needed to progress. IDs never change.
 */

export interface TrialEffect {
  stat: string;
  op: 'add' | 'mul' | 'pow';
  value: number;
}

export interface TrialDef {
  id: string;
  name: string;
  /** What it does to you, in words. */
  debuffText: (level: number) => string;
  /** What each level gives for good, in words. */
  rewardText: string;
  levels: number;
  debuffs: (level: number) => TrialEffect[];
  /** Per level completed. */
  rewards: readonly TrialEffect[];
  /** Its factor in a Fusion score. */
  fusion: number;
  /** Hides the numbers while active (Fog of the Void). */
  fog?: boolean;
}

const pow = (stat: string, value: number): TrialEffect => ({ stat, op: 'pow', value });
const mul = (stat: string, value: number): TrialEffect => ({ stat, op: 'mul', value });

/** Lonely Cosmos at level L leaves only the first 4 - L engine types working. */
const lonely = (level: number): TrialEffect[] => ENGINES.slice(Math.max(1, 4 - level)).map((e) => mul(`engineMult.${e.id}`, 0));

export const TRIALS: readonly TrialDef[] = [
  { id: 'dim', name: 'Dimmed Star', debuffText: (l) => `Stardust is raised to the power ${(0.9 - 0.05 * l).toFixed(2)}.`, rewardText: 'Stardust x3 a level.', levels: 5, debuffs: (l) => [pow('productionMult', 0.9 - 0.05 * l)], rewards: [mul('productionMult', 3)], fusion: 1.6 },
  { id: 'silent', name: 'Silent Engines', debuffText: (l) => `Engines cost ${10 ** (l + 1)} times as much.`, rewardText: 'Engines cost 10% less a level.', levels: 5, debuffs: (l) => [mul('engineCostMult', 10 ** (l + 1))], rewards: [mul('engineCostMult', 0.9)], fusion: 1.6 },
  { id: 'notaps', name: 'No Taps', debuffText: () => 'Taps give nothing.', rewardText: 'Taps x5 a level.', levels: 3, debuffs: () => [mul('tapPower', 0), mul('tapSpsShare', 0)], rewards: [mul('tapPower', 5)], fusion: 2 },
  { id: 'lonely', name: 'Lonely Cosmos', debuffText: (l) => `Only your first ${4 - l} engine type${4 - l === 1 ? '' : 's'} produce.`, rewardText: 'Stardust x2 a level.', levels: 3, debuffs: lonely, rewards: [mul('productionMult', 2)], fusion: 2.5 },
  { id: 'fog', name: 'Fog of the Void', debuffText: () => 'Numbers are hidden and Stardust is raised to the power 0.95.', rewardText: 'Shards x2 a level.', levels: 3, debuffs: () => [pow('productionMult', 0.95)], rewards: [mul('shardGain', 2)], fusion: 1.6, fog: true },
  { id: 'drought', name: 'Comet Drought', debuffText: () => 'No comets come.', rewardText: 'Comets 25% more often a level.', levels: 3, debuffs: () => [mul('cometRate', 0)], rewards: [mul('cometRate', 1.25)], fusion: 1.6 },
  { id: 'heavy', name: 'Heavy Tiers', debuffText: (l) => `Evolving costs ${10 ** l} times as much.`, rewardText: 'Evolving costs 20% less a level.', levels: 5, debuffs: (l) => [mul('tierCostMult', 10 ** l)], rewards: [mul('tierCostMult', 0.8)], fusion: 1.6 },
  { id: 'frozen', name: 'Frozen Orbits', debuffText: () => 'Planets give nothing.', rewardText: 'Planet bonuses x1.5 a level.', levels: 3, debuffs: () => [mul('planetPower', 0)], rewards: [mul('planetPower', 1.5)], fusion: 1.6 },
  { id: 'brittle', name: 'Brittle Crits', debuffText: () => 'Crits are a tenth as big.', rewardText: 'Crits x2 a level.', levels: 3, debuffs: () => [mul('critMult', 0.1)], rewards: [mul('critMult', 2)], fusion: 1.6 },
  { id: 'rusted', name: 'Rusted Belt', debuffText: () => 'Ore x0.01.', rewardText: 'Ore x2 a level.', levels: 3, debuffs: () => [mul('oreGain', 0.01)], rewards: [mul('oreGain', 2)], fusion: 1.6 },
  { id: 'cold', name: 'Cold Forge', debuffText: () => 'The furnace makes no alloy.', rewardText: 'Alloy x2 a level.', levels: 3, debuffs: () => [mul('alloyGain', 0)], rewards: [mul('alloyGain', 2)], fusion: 1.6 },
  { id: 'deadrunes', name: 'Dead Runes', debuffText: () => 'Rune multipliers and bonuses do nothing.', rewardText: 'Rune effects +10% a level.', levels: 3, debuffs: () => [mul('runeEffect', 0)], rewards: [mul('runeEffect', 1.1)], fusion: 2 },
  { id: 'blind', name: 'Blind Luck', debuffText: () => 'Rune luck does nothing.', rewardText: 'Rune luck x1.5 a level.', levels: 3, debuffs: () => [pow('runeLuck', 0)], rewards: [mul('runeLuck', 1.5)], fusion: 1.6 },
  { id: 'short', name: 'Short Days', debuffText: () => 'Comet buffs last a tenth as long.', rewardText: 'Comet buffs last 20% longer a level.', levels: 3, debuffs: () => [mul('buffDuration', 0.1)], rewards: [mul('buffDuration', 1.2)], fusion: 1.6 },
  { id: 'inflation', name: 'Inflation', debuffText: (l) => `Engines and evolving cost ${10 ** (2 * l)} times as much.`, rewardText: 'Stardust x10 a level.', levels: 5, debuffs: (l) => [mul('engineCostMult', 10 ** (2 * l)), mul('tierCostMult', 10 ** (2 * l))], rewards: [mul('productionMult', 10)], fusion: 2 },
  { id: 'lowgrav', name: 'Low Gravity', debuffText: (l) => `Stardust x${(10 ** (-2 * l)).toExponential(0)}.`, rewardText: 'Stardust x5 a level.', levels: 5, debuffs: (l) => [mul('productionMult', 10 ** (-2 * l))], rewards: [mul('productionMult', 5)], fusion: 1.6 },
  { id: 'still', name: 'Still Hands', debuffText: () => 'Taps are raised to the power 0.5.', rewardText: 'Taps x3 a level.', levels: 3, debuffs: () => [pow('tapPower', 0.5)], rewards: [mul('tapPower', 3)], fusion: 1.6 },
  { id: 'famine', name: 'Frenzy Famine', debuffText: () => 'Frenzy comets give nothing.', rewardText: 'Frenzies x1.5 a level.', levels: 3, debuffs: () => [pow('frenzyMult', 0)], rewards: [mul('frenzyMult', 1.5)], fusion: 1.6 },
  { id: 'hardcore', name: 'Hardcore', debuffText: () => 'Stardust and taps are raised to the power 0.6.', rewardText: 'Stardust x10 and shards x10 a level.', levels: 3, debuffs: () => [pow('productionMult', 0.6), pow('tapPower', 0.6)], rewards: [mul('productionMult', 10), mul('shardGain', 10)], fusion: 2.5 },
  { id: 'fast', name: 'Fast Nova', debuffText: () => 'Nothing holds you back but the clock: reach the goal as fast as you can.', rewardText: 'Shards x1.5 (rank D) up to x25.62 (rank Q), from your best rank.', levels: 1, debuffs: () => [], rewards: [], fusion: 1 },
];

export const TRIAL_BY_ID: ReadonlyMap<string, TrialDef> = new Map(TRIALS.map((t) => [t.id, t]));

export const FAST_RANKS = BALANCE.trials.fastRanks.map(([name, seconds, mult]) => ({ name, seconds, mult }));

// ---------- the Void Leviathans ----------

export const LEVIATHANS: ReadonlyArray<{ id: string; name: string; color: string }> = [
  { id: 'calf', name: 'Drift Calf', color: '#8C97C2' },
  { id: 'humpback', name: 'Nebula Humpback', color: '#2EE6FF' },
  { id: 'orca', name: 'Void Orca', color: '#3A2470' },
  { id: 'narwhal', name: 'Comet Narwhal', color: '#9FE7FF' },
  { id: 'manta', name: 'Aurora Manta', color: '#5FD39B' },
  { id: 'sperm', name: 'Abyss Sperm Whale', color: '#6E5CC4' },
  { id: 'beluga', name: 'Frost Beluga', color: '#E8E0FF' },
  { id: 'blue', name: 'Star-Eater Blue', color: '#4FB6FF' },
  { id: 'kraken', name: 'Ember Kraken', color: '#FF5640' },
  { id: 'shark', name: 'Prism Shark', color: '#FF7AE0' },
  { id: 'serpent', name: 'Leviathan of Ash', color: '#FFB347' },
  { id: 'mother', name: 'The Deep Mother', color: '#FF4FC1' },
];

// ---------- the Scale Tree (bought with Leviathan scales) ----------

const kmul = (stat: string, value: number): KitEffect => ({ stat, op: 'mul', value });
const L = BALANCE.leviathans;
const price = (step: number) => Math.round(L.treeBase * L.treeGrowth ** step);

const SCALE_SPECS: Array<[string, string, string, KitEffect]> = [
  ['scale.root', 'First Scale', 'Leviathan damage x2.', kmul('leviathanDamage', 2)],
  ['scale.1', 'Hard Hide', 'Scales x1.5.', kmul('scaleGain', 1.5)],
  ['scale.2', 'Whale Song', 'Stardust x100.', kmul('productionMult', 100)],
  ['scale.3', 'Harpoon', 'Leviathan damage x3.', kmul('leviathanDamage', 3)],
  ['scale.4', 'Deep Echo', 'Shards x10.', kmul('shardGain', 10)],
  ['scale.5', 'Baleen', 'Essence x10.', kmul('essenceGain', 10)],
  ['scale.6', 'Ambergris', 'Dark Matter x1.25.', kmul('darkMatterGain', 1.25)],
  ['scale.7', 'Pod Hunt', 'Leviathan damage x5.', kmul('leviathanDamage', 5)],
  ['scale.8', 'Sea of Stars', 'Spire power x2.', kmul('spirePower', 2)],
  ['scale.9', 'Wyrm Riders', 'Wyrm XP x5.', kmul('wyrmXp', 5)],
  ['scale.10', 'Golden Scales', 'Scales x2.', kmul('scaleGain', 2)],
  ['scale.11', 'Tidal Fury', 'Leviathan damage x10.', kmul('leviathanDamage', 10)],
  ['scale.12', 'Abyssal Gift', 'Stardust x1e5.', kmul('productionMult', 1e5)],
  ['scale.13', 'Deep Mother’s Blessing', 'Dark Matter x1.5.', kmul('darkMatterGain', 1.5)],
];

/** A small tree in a fan: the root, then three branches of four and a crown. */
export const SCALE_TREE: readonly KitNode[] = SCALE_SPECS.map(([id, name, desc, effect], i) => {
  if (i === 0) return { id, name, desc, group: 'root', parents: [], cost: price(0), effect, color: 'mul', big: true, x: 0, y: 0 };
  if (i === SCALE_SPECS.length - 1) return { id, name, desc, group: 'crown', parents: ['scale.4', 'scale.8', 'scale.12'], needsAll: true, cost: price(10), effect, color: 'mul', big: true, x: 0, y: -900 };
  const branch = (i - 1) % 3;
  const depth = Math.floor((i - 1) / 3);
  const parent = depth === 0 ? 'scale.root' : `scale.${i - 3}`;
  const a = -Math.PI / 2 + (branch - 1) * 0.7;
  const r = 200 + depth * 170;
  return { id, name, desc, group: ['hunt', 'hoard', 'sea'][branch]!, parents: [parent], cost: price(1 + depth * 2 + branch * 0.5), effect, color: 'mul', x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) };
});

// ---------- the Spire ----------

/** A banner for every tenth floor (cosmetic: it flies over the Spire and your star). */
/**
 * The Spire's banners, one every tenth floor. 1.3.0: a flown banner boosts something, by 1 + its rate x your best
 * floor (they were only pennants; the playtest couldn't tell what the Spire gave). One flies at a time. The rates
 * live in BALANCE.spire.bannerRates by banner ID.
 */
export const SPIRE_BANNERS: ReadonlyArray<{ id: string; name: string; color: string; stats: readonly string[]; what: string }> = [
  { id: 'ember', name: 'Ember Pennant', color: '#FF8A3D', stats: ['productionMult'], what: 'Stardust' },
  { id: 'tide', name: 'Tide Pennant', color: '#2EE6FF', stats: ['shardGain'], what: 'Nova Shards' },
  { id: 'moss', name: 'Moss Pennant', color: '#5FD39B', stats: ['oreGain', 'alloyGain'], what: 'ore and alloy' },
  { id: 'dusk', name: 'Dusk Pennant', color: '#B06BFF', stats: ['runeLuck'], what: 'rune luck' },
  { id: 'gold', name: 'Gold Pennant', color: '#FFC83D', stats: ['tapPower'], what: 'taps' },
  { id: 'rose', name: 'Rose Pennant', color: '#FF7AE0', stats: ['essenceGain'], what: 'Essence' },
  { id: 'frost', name: 'Frost Pennant', color: '#E8E0FF', stats: ['cometRate'], what: 'comet rate' },
  { id: 'blood', name: 'Blood Pennant', color: '#FF5640', stats: ['leviathanDamage'], what: 'Leviathan damage' },
  { id: 'deep', name: 'Deep Pennant', color: '#4FB6FF', stats: ['darkMatterGain'], what: 'Dark Matter' },
  { id: 'void', name: 'Void Pennant', color: '#3A2470', stats: ['antimatterMult'], what: 'Antimatter' },
  { id: 'aurora', name: 'Aurora Pennant', color: '#9FE7FF', stats: ['galaxyCoreGain'], what: 'Galaxy Cores' },
  { id: 'crown', name: 'Crown of the Spire', color: '#FF4FC1', stats: ['productionMult', 'shardGain', 'essenceGain'], what: 'Stardust, shards and Essence' },
];

/** Each Spire floor plays one Trial's level-1 debuff while you climb it (never Fast Nova). */
export const SPIRE_GIMMICKS: readonly TrialDef[] = TRIALS.filter((t) => t.id !== 'fast');
