import type { KitEffect, KitNode } from '../engine/treeKit';
import { BALANCE } from './balance';
import type { NodeColor } from './novaTree';

/**
 * The Multiverse's content (Game design: "Galactic Rebirth, Big Crunch and Multiverse"; UUT's Rift).
 * - Spark choices: a branching tree of 114 choices, one arm per earlier layer, each costing 0.2
 *   Sparks. Any choice can be bought at any time, in any order: the tree's lines show where a
 *   choice sits, not what it needs. Each arm's head stops the Multiverse resetting that layer; the
 *   next pair keep its milestones and its Eternity automation; the rest are boosts. Each last
 *   fork ends in an echo that levels up with no cap.
 * - The Universe Forge: rules for the next universe that make it harder and pay more Sparks.
 * - The Last Starsmith's story, told once at the first Multiverse.
 * IDs never change.
 */
const M = BALANCE.multiverse;

// ---------- the Spark tree ----------

export type MultiverseFlag = `keep.${string}` | `keepMilestones.${string}` | `keepEternity.${string}` | 'autoCrunch' | 'sparkBonus';

interface ArmDef {
  key: string;
  name: string;
  color: string;
  /** What the head keeps, in words. */
  keeps: string;
  /** The left node of the first fork: keep this layer's milestones (or the Stardust layer's stand-in). */
  milestones: [name: string, desc: string, effect: KitEffect];
  /** The right node: keep this layer's Eternity automation (or, for the Crunch, auto-Crunch). */
  automation: [name: string, desc: string, effect: KitEffect];
  /** The four second-fork nodes and the eight outer nodes, then the four echoes (repeatable). */
  inner: Array<[name: string, desc: string, effect: KitEffect]>;
  outer: Array<[name: string, desc: string, effect: KitEffect]>;
  echoes: Array<[name: string, desc: string, effect: KitEffect]>;
}

const mul = (stat: string, value: number): KitEffect => ({ stat, op: 'mul', value });
const add = (stat: string, value: number): KitEffect => ({ stat, op: 'add', value });
const flag = (f: MultiverseFlag, value = 1): KitEffect => ({ flag: f, value });

const ARMS: ArmDef[] = [
  {
    key: 'stardust',
    name: 'Stardust',
    color: '#FFC83D',
    keeps: 'Stardust, engines, Star Tier, upgrades, Stellar Constants and planets',
    milestones: ['First Light', 'Start every universe as a Blue Giant.', flag('keepMilestones.stardust')],
    automation: ['Undying Forge', 'Eternal Forge stays through the Multiverse.', flag('keepEternity.et.forge')],
    inner: [
      ['Old Light', 'Stardust x1e6.', mul('productionMult', 1e6)],
      ['Heavy Hands', 'Taps x1e6.', mul('tapPower', 1e6)],
      ['Cheap Suns', 'Engines cost a millionth.', mul('engineCostMult', 1e-6)],
      ['Star Seeds', 'Stardust x1e12.', mul('productionMult', 1e12)],
    ],
    outer: [
      ['Long Tails', 'Comets come twice as often.', mul('cometRate', 2)],
      ['Bright Crits', 'Crits x10.', mul('critMult', 10)],
      ['Spark Hoard', '+0.2 Sparks from every Multiverse.', flag('sparkBonus', M.sparkBonus)],
      ['Easy Tiers', 'Star Tiers cost a thousandth.', mul('tierCostMult', 1e-3)],
      ['Starfall', 'Stardust x1e20.', mul('productionMult', 1e20)],
      ['Thunder Taps', 'Taps x1e12.', mul('tapPower', 1e12)],
      ['Wide Orbits', 'Planet bonuses x2.', mul('planetPower', 2)],
      ['Deep Mastery', 'Engine Mastery x3.', mul('masteryMult', 3)],
    ],
    echoes: [
      ['Echo of Light', 'Stardust x1e10 a level.', mul('productionMult', 1e10)],
      ['Echo of Hands', 'Taps x1e10 a level.', mul('tapPower', 1e10)],
      ['Echo of Gold', 'Ore x100 a level.', mul('oreGain', 100)],
      ['Echo of Fire', 'Alloy x10 a level.', mul('alloyGain', 10)],
    ],
  },
  {
    key: 'supernova',
    name: 'Supernova',
    color: '#FF4FC1',
    keeps: 'Nova Shards, ore and alloys, the Nova Tree, the Belt, Deep Core, Starforge upgrades, Comet Fusion, Attunements, the Merchant and starships',
    milestones: ['Remembered Novas', 'Keep your Supernova count and milestones.', flag('keepMilestones.supernova')],
    automation: ['Undying Nova', 'Eternal Nova stays through the Multiverse.', flag('keepEternity.et.nova')],
    inner: [
      ['Shard Rain', 'Nova Shards x1e6.', mul('shardGain', 1e6)],
      ['Rich Seams', 'Ore x1e3.', mul('oreGain', 1e3)],
      ['Afterglow', 'Gain a further 5% of your Supernova gain every second.', add('passiveShards', 0.05)],
      ['Shard Storm', 'Nova Shards x1e12.', mul('shardGain', 1e12)],
    ],
    outer: [
      ['Hot Furnace', 'The Starforge smelts x3 as fast.', mul('forgeSpeed', 3)],
      ['Loud Comets', 'Frenzies x3.', mul('frenzyMult', 3)],
      ['Spark Hoard', '+0.2 Sparks from every Multiverse.', flag('sparkBonus', M.sparkBonus)],
      ['Fast Ships', 'Starships fly x3 as fast.', mul('shipSpeed', 3)],
      ['Shard Flood', 'Nova Shards x1e20.', mul('shardGain', 1e20)],
      ['Bright Belt', 'Belt XP x10.', mul('beltXp', 10)],
      ['Deep Drills', 'Drills x10.', mul('drillPower', 10)],
      ['Starsmith', 'XP x5.', mul('xpGain', 5)],
    ],
    echoes: [
      ['Echo of Shards', 'Nova Shards x1e10 a level.', mul('shardGain', 1e10)],
      ['Echo of Ore', 'Ore x1e3 a level.', mul('oreGain', 1e3)],
      ['Echo of Ships', 'Starship loot x3 a level.', mul('shipLoot', 3)],
      ['Echo of Drills', 'Drills x3 a level.', mul('drillPower', 3)],
    ],
  },
  {
    key: 'nebula',
    name: 'Nebula',
    color: '#2EE6FF',
    keeps: 'Nebula Essence, the Nebula Tree, Nebula Constants and Spectral Focus',
    milestones: ['Remembered Clouds', 'Keep your Nebula count and milestones.', flag('keepMilestones.nebula')],
    automation: ['Undying Mist', 'Eternal Mist stays through the Multiverse.', flag('keepEternity.et.mist')],
    inner: [
      ['Thick Mist', 'Essence x1e6.', mul('essenceGain', 1e6)],
      ['Many Runes', 'Rune bulk x100.', mul('runeBulk', 100)],
      ['Lucky Stars', 'Rune Luck x10.', mul('runeLuck', 10)],
      ['Deep Mist', 'Essence x1e12.', mul('essenceGain', 1e12)],
    ],
    outer: [
      ['Fast Hands', 'Runes roll x3 as fast.', mul('runeSpeed', 3)],
      ['Bright Auras', 'Aura luck x10.', mul('auraLuck', 10)],
      ['Spark Hoard', '+0.2 Sparks from every Multiverse.', flag('sparkBonus', M.sparkBonus)],
      ['Wild Genes', 'Mutation luck x5.', mul('mutationLuck', 5)],
      ['Mist Ocean', 'Essence x1e20.', mul('essenceGain', 1e20)],
      ['Green Nursery', 'Nursery growth x5.', mul('nurseryGrowth', 5)],
      ['Prism Glow', 'Spectral energy x10.', mul('spectralSpeed', 10)],
      ['Wyrm Song', 'Wyrm XP x10.', mul('wyrmXp', 10)],
    ],
    echoes: [
      ['Echo of Mist', 'Essence x1e10 a level.', mul('essenceGain', 1e10)],
      ['Echo of Runes', 'Rune bulk x10 a level.', mul('runeBulk', 10)],
      ['Echo of Luck', 'Rune Luck x3 a level.', mul('runeLuck', 3)],
      ['Echo of Embers', 'Embers x10 a level.', mul('emberGain', 10)],
    ],
  },
  {
    key: 'singularity',
    name: 'Singularity',
    color: '#9B7CFF',
    keeps: 'Dark Matter, the Singularity Tree, Void Constants, the key, the Black Hole, the Prism Wheel, the Reactor, the Antimatter Mirror, the Wormhole Network and Planet Defense',
    milestones: ['Remembered Voids', 'Keep your Singularity count and milestones.', flag('keepMilestones.singularity')],
    automation: ['Undying Void', 'Eternal Void stays through the Multiverse.', flag('keepEternity.et.void')],
    inner: [
      ['Dark Tide', 'Dark Matter x10.', mul('darkMatterGain', 10)],
      ['Heavy Hole', 'Black Hole mass x100.', mul('massGain', 100)],
      ['Anti-Light', 'Antimatter x1e6.', mul('antimatterMult', 1e6)],
      ['Dark Sea', 'Dark Matter x100.', mul('darkMatterGain', 100)],
    ],
    outer: [
      ['Strong Reactor', 'Reactor strength +25%.', mul('reactorPower', 1.25)],
      ['Tall Spire', 'The Spire climbs x3 as fast.', mul('spirePower', 3)],
      ['Spark Hoard', '+0.2 Sparks from every Multiverse.', flag('sparkBonus', M.sparkBonus)],
      ['Whale Bane', 'Leviathan damage x10.', mul('leviathanDamage', 10)],
      ['Dark Ocean', 'Dark Matter x1,000.', mul('darkMatterGain', 1e3)],
      ['Scale Hoard', 'Scales x5.', mul('scaleGain', 5)],
      ['Cheap Mirror', 'Antimatter engines cost a millionth.', mul('amCostMult', 1e-6)],
      ['Fast Time', 'The game runs x1.25 as fast.', mul('gameSpeed', 1.25)],
    ],
    echoes: [
      ['Echo of Night', 'Dark Matter x3 a level.', mul('darkMatterGain', 3)],
      ['Echo of Mass', 'Black Hole mass x10 a level.', mul('massGain', 10)],
      ['Echo of Anti', 'Antimatter x1e3 a level.', mul('antimatterMult', 1e3)],
      ['Echo of Scales', 'Scales x2 a level.', mul('scaleGain', 2)],
    ],
  },
  {
    key: 'galactic',
    name: 'Galactic',
    color: '#B4F04A',
    keeps: 'Galaxy Cores, the Galactic Tree, Galactic Constants, explored galaxies, the Observatory and Star Chart, megastructures and colonies',
    milestones: ['Remembered Galaxies', 'Keep your Galactic Rebirth count and milestones.', flag('keepMilestones.galactic')],
    automation: ['Undying Galaxy', 'Eternal Galaxy stays through the Multiverse.', flag('keepEternity.et.galaxy')],
    inner: [
      ['Core Rain', 'Galaxy Cores x2.', mul('galaxyCoreGain', 2)],
      ['Grand Designs', 'Megastructure rewards x1.5 (as a power).', mul('megaRewardPower', 1.5)],
      ['Crowded Worlds', 'Colony capacity x10.', mul('colonyCapacity', 10)],
      ['Core Storm', 'Galaxy Cores x3.', mul('galaxyCoreGain', 3)],
    ],
    outer: [
      ['Bright Galaxies', 'Explored galaxies give x1.5 (as a power).', mul('galaxyRewardPower', 1.5)],
      ['Strong Arms', 'Galactic Tree multipliers x1.25 (as a power).', mul('galacticTreePower', 1.25)],
      ['Spark Hoard', '+0.2 Sparks from every Multiverse.', flag('sparkBonus', M.sparkBonus)],
      ['Long Nights', 'Offline time x2.', mul('offlineCap', 2)],
      ['Core Flood', 'Galaxy Cores x5.', mul('galaxyCoreGain', 5)],
      ['Busy Ports', 'Colony capacity x100.', mul('colonyCapacity', 100)],
      ['Quick Wishes', 'Wish comets x3 as likely.', mul('wishChance', 3)],
      ['Long Buffs', 'Comet buffs last x2.', mul('buffDuration', 2)],
    ],
    echoes: [
      ['Echo of Cores', 'Galaxy Cores x1.5 a level.', mul('galaxyCoreGain', 1.5)],
      ['Echo of Worlds', 'Colony capacity x3 a level.', mul('colonyCapacity', 3)],
      ['Echo of Quests', 'Star Quest rewards x3 a level.', mul('questRewardMult', 3)],
      ['Echo of Crits', 'Crits x3 a level.', mul('critMult', 3)],
    ],
  },
  {
    key: 'crunch',
    name: 'Big Crunch',
    color: '#FF8A3D',
    keeps: 'Chronons, Eternity upgrades, Eternal Constants and the Echo boards',
    milestones: ['Remembered Crunches', 'Keep your Big Crunch count and milestones.', flag('keepMilestones.crunch')],
    automation: ['Auto-Crunch', 'Big Crunch by itself, on the same rule as Eternity automation.', flag('autoCrunch')],
    inner: [
      ['Time Rain', 'Chronons x2.', mul('chrononGain', 2)],
      ['Loud Echoes', 'Echo output x1e3.', mul('echoMult', 1e3)],
      ['Quick Time', 'The game runs x1.25 as fast.', mul('gameSpeed', 1.25)],
      ['Time Storm', 'Chronons x3.', mul('chrononGain', 3)],
    ],
    outer: [
      ['Cheap Echoes', 'Echo engines cost a thousandth.', mul('echoCostMult', 1e-3)],
      ['Busy Hands', 'Auto-buyers act x3 as often.', mul('autoSpeed', 3)],
      ['Spark Hoard', '+0.2 Sparks from every Multiverse.', flag('sparkBonus', M.sparkBonus)],
      ['Echo Choir', 'Echo output x1e6.', mul('echoMult', 1e6)],
      ['Time Flood', 'Chronons x5.', mul('chrononGain', 5)],
      ['Sharper Milestones', 'Engine milestones give x2.5 instead of x2.', mul('milestoneBase', 1.25)],
      ['Bright Quests', 'Star Quest bonus x2.', mul('questBonus', 2)],
      ['Lucky Strikes', 'Lucky comets x10.', mul('luckyMult', 10)],
    ],
    echoes: [
      ['Echo of Time', 'Chronons x1.5 a level.', mul('chrononGain', 1.5)],
      ['Echo of Echoes', 'Echo output x100 a level.', mul('echoMult', 100)],
      ['Echo of Speed', 'Auto-buyers act x1.5 as often a level.', mul('autoSpeed', 1.5)],
      ['Echo of Storms', 'Tapstorms x3 a level.', mul('tapstormMult', 3)],
    ],
  },
];

export const MULTIVERSE_ARMS: ReadonlyArray<{ key: string; name: string; color: string; keeps: string }> = ARMS.map(({ key, name, color, keeps }) => ({ key, name, color, keeps }));

export interface SparkNode extends KitNode {
  /** The arm (earlier layer) this choice belongs to. */
  arm: string;
  /** Where it draws a line from (the tree's shape); it is never a requirement. */
  from: string | null;
}

/** Purple: the layer is kept; blue: automation and other unlocks; green adds; orange multiplies (echoes too). */
const colorOf = (e: KitEffect): NodeColor => ('flag' in e ? (e.flag.startsWith('keep.') ? 'pow' : 'unlock') : e.op === 'add' ? 'add' : 'mul');

/**
 * The shape: six arms from the centre; each arm's head forks in two, each of those in two again,
 * and each of those in three (two outer choices and an echo beyond them). 6 x 19 = 114 choices.
 * It is laid out as a radial tree so nothing overlaps: each arm owns a sixth of the circle, each
 * depth is a ring further out, the eight outer choices share the arm's sector evenly, and every
 * fork sits in the middle of its children. Neighbours end up at least 100 units apart (a test checks).
 */
/** 1.4.0: what the barrier layers' head and milestone choices give instead of keeping (text, effect). */
const BARRIER_BOOSTS: Record<string, { head: [string, KitEffect]; milestones: [string, KitEffect] }> = {
  stardust: { head: ['Stardust x1e50', mul('productionMult', 1e50)], milestones: ['Taps x1e30', mul('tapPower', 1e30)] },
  supernova: { head: ['Nova Shards x1e30', mul('shardGain', 1e30)], milestones: ['Ore x1e10', mul('oreGain', 1e10)] },
  nebula: { head: ['Essence x1e30', mul('essenceGain', 1e30)], milestones: ['Rune Luck x100', mul('runeLuck', 100)] },
};

const RING = { head: 150, fork: 310, inner: 480, outer: 820, echo: 950 };
const OUTER_STEP = 7.5; // degrees between outer choices: 8 per 60-degree arm

function buildSparkTree(): SparkNode[] {
  const nodes: SparkNode[] = [];
  ARMS.forEach((arm, a) => {
    const centre = -90 + a * 60;
    const at = (deg: number, r: number) => ({ x: Math.round(Math.cos((deg * Math.PI) / 180) * r), y: Math.round(Math.sin((deg * Math.PI) / 180) * r) });
    /** The angle of outer slot k (0 to 7), and the middle of slots k to k + n - 1. */
    const slot = (k: number, n = 1) => centre - 30 + (k + n / 2) * OUTER_STEP;
    const push = (id: string, spec: [string, string, KitEffect], p: { x: number; y: number }, from: string | null, opts: { big?: boolean; repeat?: boolean } = {}) => {
      const [name, desc, effect] = spec;
      nodes.push({
        id,
        name,
        desc,
        group: arm.key,
        arm: arm.key,
        from,
        parents: [],
        cost: M.choiceCost,
        ...(opts.repeat ? { repeat: { growth: M.echoGrowth } } : {}),
        effect,
        color: colorOf(effect),
        ...(opts.big ? { big: true } : {}),
        x: p.x,
        y: p.y,
      });
    };
    const headId = `mv.${arm.key}.keep`;
    // 1.4.0: the Multiverse never resets the three layers furthest down (the barrier), so their "keep" choices are boosts
    const barrier = BARRIER_BOOSTS[arm.key];
    push(headId, barrier ? [`${arm.name} Unbound`, `The Multiverse never resets the ${arm.name} layer now, so this is a boost: ${barrier.head[0]}.`, barrier.head[1]] : [`${arm.name} Unbound`, `The Multiverse no longer resets the ${arm.name} layer: ${arm.keeps}.`, flag(`keep.${arm.key}`)], at(centre, RING.head), null, { big: true });
    const milestones: [string, string, KitEffect] = barrier ? [arm.milestones[0], `${barrier.milestones[0]} (its milestones are never reset now).`, barrier.milestones[1]] : arm.milestones;
    [milestones, arm.automation].forEach((spec, i) => {
      const id1 = `mv.${arm.key}.${i === 0 ? 'milestones' : 'auto'}`;
      push(id1, spec, at(slot(i * 4, 4), RING.fork), headId);
      for (const j of [i * 2, i * 2 + 1]) {
        const id2 = `mv.${arm.key}.in.${j}`;
        push(id2, arm.inner[j]!, at(slot(j * 2, 2), RING.inner), id1);
        for (const k of [j * 2, j * 2 + 1]) push(`mv.${arm.key}.out.${k}`, arm.outer[k]!, at(slot(k), RING.outer), id2);
        push(`mv.${arm.key}.echo.${j}`, arm.echoes[j]!, at(slot(j * 2, 2), RING.echo), id2, { repeat: true });
      }
    });
  });
  return nodes;
}

export const SPARK_TREE: readonly SparkNode[] = buildSparkTree();
export const SPARK_NODE: ReadonlyMap<string, SparkNode> = new Map(SPARK_TREE.map((n) => [n.id, n]));
/** The tree's lines, for drawing only. */
export const SPARK_EDGES: ReadonlyArray<[string, string]> = SPARK_TREE.filter((n) => n.from).map((n) => [n.from!, n.id]);

// ---------- the Universe Forge ----------

export interface UniverseRule {
  id: string;
  name: string;
  desc: string;
  /** Extra share of Sparks this universe pays (0.5 = +50%). */
  reward: number;
  effects: ReadonlyArray<{ stat: string; op: 'mul' | 'pow'; value: number }>;
}

const GAINS = ['productionMult', 'shardGain', 'essenceGain', 'darkMatterGain', 'galaxyCoreGain'];

export const UNIVERSE_RULES: readonly UniverseRule[] = [
  { id: 'dim', name: 'Dim Universe', desc: 'Every gain multiplier is raised to the power 0.8.', reward: 0.5, effects: GAINS.map((stat) => ({ stat, op: 'pow' as const, value: 0.8 })) },
  { id: 'dear', name: 'Dear Universe', desc: 'Engines, Star Tiers, Antimatter and echo engines cost x10.', reward: 0.25, effects: ['engineCostMult', 'tierCostMult', 'amCostMult', 'echoCostMult'].map((stat) => ({ stat, op: 'mul' as const, value: 10 })) },
  { id: 'cold', name: 'Cold Universe', desc: 'Comets come a tenth as often, and taps give a hundredth.', reward: 0.2, effects: [{ stat: 'cometRate', op: 'mul', value: 0.1 }, { stat: 'tapPower', op: 'mul', value: 0.01 }] },
  { id: 'heavy', name: 'Heavy Universe', desc: 'The Black Hole grows a tenth as fast, and Dark Matter x0.5.', reward: 0.25, effects: [{ stat: 'massGain', op: 'mul', value: 0.1 }, { stat: 'darkMatterGain', op: 'mul', value: 0.5 }] },
  { id: 'unlucky', name: 'Unlucky Universe', desc: 'Rune, aura and mutation luck are a tenth.', reward: 0.2, effects: ['runeLuck', 'auraLuck', 'mutationLuck'].map((stat) => ({ stat, op: 'mul' as const, value: 0.1 })) },
  { id: 'restless', name: 'Restless Universe', desc: 'No time away counts: offline earnings stop.', reward: 0.15, effects: [{ stat: 'offlineCap', op: 'mul', value: 0 }] },
  { id: 'faint', name: 'Faint Universe', desc: 'Galaxy Cores and Chronons are raised to the power 0.9.', reward: 0.3, effects: ['galaxyCoreGain', 'chrononGain'].map((stat) => ({ stat, op: 'pow' as const, value: 0.9 })) },
];

export const UNIVERSE_RULE_BY_ID: ReadonlyMap<string, UniverseRule> = new Map(UNIVERSE_RULES.map((r) => [r.id, r]));

// ---------- the Last Starsmith ----------

/** Told once, after the first Multiverse; it can be read again from Settings. */
export const STORY: readonly string[] = [
  'Long after the last star should have gone out, one was still burning. You kept it alive: a Starsmith, the last of them, tapping light out of a dying ember.',
  'You fed it until it was a giant, and let it burst. From the shards you built a forge, and from the forge a nebula, and from the nebula a hole in the dark that ate everything you gave it.',
  'Galaxies turned around you. You built shells around suns and planted people on cold worlds. Then the universe drew in its breath and fell back into a single point, and you fell with it.',
  'Each time it collapsed you remembered a little more: echoes of the first star, the first shard, the first cloud. Each time you were faster.',
  'Now the point has split. There is not one universe any more but many, and each of them has a small dying star, and each star is waiting for a Starsmith.',
  'So this is the work, and it never has to end. Pick a universe. Pick its rules. Tap the star.',
];

export const CREDITS: ReadonlyArray<{ heading: string; lines: readonly string[] }> = [
  { heading: 'Starforge', lines: ['Designed by ahjhaigh-sketch, built with Claude Code.'] },
  { heading: 'Learned from', lines: ['Everything Upgrade Tree, Upgradex, Untitled Upgrade Tree, Grass Incremental Simulator, Noob Incremental, Button Eternal 2, Tower Incremental and Ascender Incremental on Roblox, and Cookie Clicker.'] },
  { heading: 'Made with', lines: ['Vite, React, TypeScript, PixiJS, break_eternity.js, Zustand, zod and fflate.'] },
  { heading: 'Type', lines: ['Fredoka, Lilita One and Baloo 2, under the SIL Open Font License.'] },
  { heading: 'Art and sound', lines: ['Every icon was written as SVG for Starforge; every sound and the music are synthesised as you play.'] },
  { heading: 'And you', lines: ['Thank you for keeping the star alive.'] },
];
