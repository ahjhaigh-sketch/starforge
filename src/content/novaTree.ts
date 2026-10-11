import { BALANCE } from './balance';

/**
 * The Nova Tree: 80 nodes on a spiral (Game design: "Supernova and the Nova Tree"). It starts at
 * the centre and winds outwards in three arms:
 * - Forge-heart: engines.
 * - Starstrike: taps and comets.
 * - Dreaming: offline earnings, shards and automation.
 * Capstones sit where the arms meet, and repeatable outer nodes have no level cap.
 *
 * Node colours mean something:
 * - blue unlocks or keeps;
 * - green adds;
 * - orange multiplies;
 * - purple raises an exponent;
 * - red changes another rule;
 * - cyan is an escalating pick (buying one makes its siblings pricier).
 *
 * IDs never change once released.
 */
export type NodeEffect =
  | { stat: string; op: 'add' | 'mul' | 'pow'; value: number }
  /** x(1 + each x a counter in state.stats), e.g. +1% engines per Supernova done. */
  | { stat: string; op: 'mul'; perCount: string; each: number }
  /** Adds a share of Stardust per second to every tap, after all multipliers. */
  | { stat: 'tapSpsShare'; op: 'add'; spsShare: number }
  /** Rules that aren't a stat: what a reset keeps, where a run starts. */
  | { flag: 'keepUpgrades' | 'keepPlanets' | 'keepConstants' | 'startMotes' | 'startTier' | 'quickBurn'; value: number };

export type NodeColor = 'unlock' | 'add' | 'mul' | 'pow' | 'change' | 'pick';

export interface NovaNode {
  id: string;
  name: string;
  desc: string;
  arm: 'root' | 'forge' | 'strike' | 'dream' | 'cap' | 'echo';
  parents: readonly string[];
  cost: number;
  effect: NodeEffect;
  color: NodeColor;
  /** Repeatable with no level cap: each level costs `growth` times the last. */
  repeat?: { growth: number };
  /** Escalating pick group: buying one multiplies the price of the others by `mult`. */
  pick?: { group: string; mult: number };
  x: number;
  y: number;
}

/** Stats whose node changes another rule rather than adding or multiplying: drawn red. */
const CHANGE_STATS = new Set(['milestoneBase', 'masteryMult', 'frenzyMult', 'tapstormMult', 'comboPower', 'comboDrain', 'engineCostMult', 'tierCostMult']);

export function colorOf(e: NodeEffect): NodeColor {
  if ('flag' in e) return 'unlock';
  if ('spsShare' in e) return 'add';
  if (CHANGE_STATS.has(e.stat)) return 'change';
  if (e.op === 'pow') return 'pow';
  return e.op === 'add' ? 'add' : 'mul';
}

type Spec = [name: string, desc: string, effect: NodeEffect];

const mul = (stat: string, value: number): NodeEffect => ({ stat, op: 'mul', value });
const add = (stat: string, value: number): NodeEffect => ({ stat, op: 'add', value });
const pow = (stat: string, value: number): NodeEffect => ({ stat, op: 'pow', value });
const flag = (f: 'keepUpgrades' | 'keepPlanets' | 'keepConstants' | 'startMotes' | 'startTier' | 'quickBurn', value: number): NodeEffect => ({ flag: f, value });

const FORGE: Spec[] = [
  ['Engine Hymn', 'Engines produce twice as much.', mul('productionMult', 2)],
  ['Cheap Parts', 'Engines cost 10% less.', mul('engineCostMult', 0.9)],
  ['Mote Kindling', 'Start every run with 10 Spark Motes.', flag('startMotes', 10)],
  ['Assembly Lines', 'Engines produce twice as much.', mul('productionMult', 2)],
  ['Milestone Polish', 'Engine milestones give x2.2 instead of x2.', add('milestoneBase', 0.2)],
  ['Gravity Well', 'Engines produce 50% more.', mul('productionMult', 1.5)],
  ['Remnant Heat', 'Keep 10% of your Stellar Constant levels when you go Supernova.', flag('keepConstants', 0.1)],
  ['Engine Choir', 'Engines produce 2.5 times as much.', mul('productionMult', 2.5)],
  ['Cheaper Still', 'Engines cost 15% less.', mul('engineCostMult', 0.85)],
  ['Compound Forge', 'Engines +2% for every Supernova you have done.', { stat: 'productionMult', op: 'mul', perCount: 'supernovasAll', each: 0.02 }],
  ['Foundry Core', 'Evolving your star costs half as much.', mul('tierCostMult', 0.5)],
  ['Overclock', 'Engines produce three times as much.', mul('productionMult', 3)],
  ['Echo Mastery', 'Each Mastery rank is x1.6 instead of x1.5.', add('masteryMult', 0.1)],
  ['Planetary Forge', 'Keep your planets when you go Supernova.', flag('keepPlanets', 1)],
  ['Nova Furnace', 'Engine output is raised to the power 1.02.', pow('productionMult', 1.02)],
  ['Iron Will', 'Start every run as a Red Dwarf.', flag('startTier', 1)],
  ['Engine Legion', 'Engines produce three times as much.', mul('productionMult', 3)],
  ['Lattice of Stars', 'Engine milestones give another +0.2.', add('milestoneBase', 0.2)],
  ['Price Collapse', 'Engines cost 30% less.', mul('engineCostMult', 0.7)],
  ['Hypercore', 'Engines produce four times as much.', mul('productionMult', 4)],
  ['Deep Remnant', 'Keep another 15% of your Stellar Constant levels.', flag('keepConstants', 0.15)],
  ['Golden Forge', 'Engines produce five times as much.', mul('productionMult', 5)],
  ['Heart of the Forge', 'Engine output is raised to the power 1.03.', pow('productionMult', 1.03)],
];

const STRIKE: Spec[] = [
  ['Rekindled Touch', 'Taps are three times as strong.', mul('tapPower', 3)],
  ['Comet Bait', 'Comets come 25% more often.', mul('cometRate', 1.25)],
  ['Sharp Eyes', '+3% crit chance.', add('critChance', 0.03)],
  ['Long Tails', 'Comet buffs last 30% longer.', mul('buffDuration', 1.3)],
  ['Starstrike Echo', 'Taps also give 2% of your Stardust per second.', { stat: 'tapSpsShare', op: 'add', spsShare: 0.02 }],
  ['Frenzied', 'Frenzy comets give x10 instead of x7.', add('frenzyMult', 3)],
  ['Combo Fuel', 'The combo meter drains half as fast.', mul('comboDrain', 0.5)],
  ['Five-Finger Star', 'Taps are three times as strong.', mul('tapPower', 3)],
  ['Golden Showers', 'Lucky comets give twice as much.', mul('luckyMult', 2)],
  ['Crit Craft', 'Crits give +5x more.', add('critMult', 5)],
  ['Comet Magnet', 'Comets come 50% more often.', mul('cometRate', 1.5)],
  ['Eight-Point Star', 'Taps are four times as strong.', mul('tapPower', 4)],
  ['Wish Upon', 'Wish comets are twice as likely.', mul('wishChance', 2)],
  ['Fever Dream', 'Combo bonuses are 50% bigger.', mul('comboPower', 1.5)],
  ['Storm Caller', 'Tapstorm comets give x100 taps instead of x50.', add('tapstormMult', 50)],
  ['Starstrike Echo II', 'Taps also give another 5% of your Stardust per second.', { stat: 'tapSpsShare', op: 'add', spsShare: 0.05 }],
  ['Crit Storm', '+5% crit chance.', add('critChance', 0.05)],
  ['Comet Lord', 'Comet buffs last 50% longer.', mul('buffDuration', 1.5)],
  ['Twelve-Point Star', 'Taps are five times as strong.', mul('tapPower', 5)],
  ['Twin Comets', 'Comets come twice as often.', mul('cometRate', 2)],
  ['Golden Age', 'Lucky comets give three times as much.', mul('luckyMult', 3)],
  ['Supernova Fist', 'Taps also give another 10% of your Stardust per second.', { stat: 'tapSpsShare', op: 'add', spsShare: 0.1 }],
  ['Heart of the Strike', 'Tap power is raised to the power 1.05.', pow('tapPower', 1.05)],
];

const DREAM: Spec[] = [
  ['Light Sleeper', 'Earn 10% more while away.', add('offlineEfficiency', 0.1)],
  ['Long Dreams', 'Away time counts up to 2 hours longer.', add('offlineCap', 7200)],
  ['Quick Hands', 'Auto-buyers work twice as fast.', mul('autoSpeed', 2)],
  ['Shard Dreams', 'Go Supernova for 25% more shards.', mul('shardGain', 1.25)],
  ['Deeper Sleep', 'Earn 10% more while away.', add('offlineEfficiency', 0.1)],
  ['Night Shift', 'Away time counts up to 4 hours longer.', add('offlineCap', 14_400)],
  ['Keep the Tools', 'Keep your upgrades when you go Supernova.', flag('keepUpgrades', 1)],
  ['Shard Dreams II', 'Go Supernova for 50% more shards.', mul('shardGain', 1.5)],
  ['Lucid Hands', 'Auto-buyers work twice as fast again.', mul('autoSpeed', 2)],
  ['Quick Burn', 'The faster your last Supernova run, the more shards: up to x3 for a run under 5 minutes.', flag('quickBurn', 1)],
  ['Dream Catcher', 'Earn 15% more while away.', add('offlineEfficiency', 0.15)],
  ['Moon Watch', 'Away time counts up to 6 hours longer.', add('offlineCap', 21_600)],
  ['Quest Dreams', 'Star Quests pay twice as much.', mul('questRewardMult', 2)],
  ['Shard Dreams III', 'Go Supernova for 50% more shards.', mul('shardGain', 1.5)],
  ['Questing Heart', 'Each quest done is +2% production instead of +1%.', mul('questBonus', 2)],
  ['Eternal Sleeper', 'Earn 15% more while away.', add('offlineEfficiency', 0.15)],
  ['Endless Night', 'Away time counts up to 12 hours longer.', add('offlineCap', 43_200)],
  ['Dream Engine', 'Go Supernova for twice as many shards.', mul('shardGain', 2)],
  ['Restless Hands', 'Auto-buyers work four times as fast.', mul('autoSpeed', 4)],
  ['Remembered Stars', 'Start every run one tier below your best.', flag('startTier', -1)],
  ['Shard Rain', 'Gain another 1% of your Supernova gain every second, without resetting.', add('passiveShards', 0.01)],
  ['Starlit Sleep', 'Go Supernova for twice as many shards.', mul('shardGain', 2)],
  ['Heart of the Dream', 'Shard gain is raised to the power 1.05.', pow('shardGain', 1.05)],
];

const ARMS: Array<{ key: 'forge' | 'strike' | 'dream'; specs: Spec[]; angle: number }> = [
  { key: 'forge', specs: FORGE, angle: -Math.PI / 2 },
  { key: 'strike', specs: STRIKE, angle: -Math.PI / 2 + (2 * Math.PI) / 3 },
  { key: 'dream', specs: DREAM, angle: -Math.PI / 2 + (4 * Math.PI) / 3 },
];

/** Price of the node at depth i along an arm. */
const armCost = (i: number) => Math.max(1, Math.round(BALANCE.novaTree.armBase * BALANCE.novaTree.armGrowth ** i));

/** Polar spiral: each arm turns as it goes out. Side nodes (every third) hang beside the main path. */
function place(angle: number, i: number, side: boolean): { x: number; y: number } {
  const theta = angle + i * 0.16;
  const r = 130 + i * 56 - (side ? 20 : 0);
  // side nodes hang beside the path (against the turn), clear of the next node along it
  const dTheta = side ? -0.42 + 40 / (130 + i * 56) : 0;
  return { x: Math.round(Math.cos(theta + dTheta) * r), y: Math.round(Math.sin(theta + dTheta) * r) };
}

function buildArms(): NovaNode[] {
  const nodes: NovaNode[] = [];
  for (const arm of ARMS) {
    let lastMain = 'root';
    arm.specs.forEach(([name, desc, effect], i) => {
      const id = `${arm.key}.${i + 1}`;
      const side = i % 3 === 2;
      const parent = side ? lastMain : lastMain;
      const pos = place(arm.angle, i, side);
      nodes.push({
        id,
        name,
        desc,
        arm: arm.key,
        parents: [parent],
        cost: armCost(i),
        effect,
        color: i === 0 ? 'pick' : colorOf(effect),
        pick: i === 0 ? { group: 'first', mult: 3 } : undefined,
        ...pos,
      });
      if (!side) lastMain = id;
    });
  }
  return nodes;
}

const arms = buildArms();
const last = (key: string) => arms.filter((n) => n.arm === key && Number(n.id.split('.')[1]) % 3 !== 0).at(-1)!.id;

/** Capstones sit between two arms' outer ends and need both. */
function cap(id: string, name: string, desc: string, a: string, b: string, effect: NodeEffect, cost: number): NovaNode {
  const na = arms.find((n) => n.id === last(a))!;
  const nb = arms.find((n) => n.id === last(b))!;
  const mx = (na.x + nb.x) / 2;
  const my = (na.y + nb.y) / 2;
  const k = 1520 / Math.hypot(mx, my);
  return { id, name, desc, arm: 'cap', parents: [na.id, nb.id], cost, effect, color: colorOf(effect), x: Math.round(mx * k), y: Math.round(my * k) };
}

const CAPS: NovaNode[] = [
  cap('cap.blaze', 'Blazing Forge', 'Engines are five times as strong.', 'forge', 'strike', mul('productionMult', 5), BALANCE.novaTree.capCost),
  cap('cap.comets', 'Comet Dreams', 'Go Supernova for three times as many shards.', 'strike', 'dream', mul('shardGain', 3), BALANCE.novaTree.capCost),
  cap('cap.self', 'Self-Building Stars', 'Engines cost half as much.', 'dream', 'forge', mul('engineCostMult', 0.5), BALANCE.novaTree.capCost),
];

/** Repeatable outer nodes: no level cap, each level pricier. */
function echo(id: string, name: string, desc: string, parent: string, effect: NodeEffect, cost: number, growth: number): NovaNode {
  const p = CAPS.find((n) => n.id === parent)!;
  const k = 1.22;
  const spread = id.endsWith('b') ? 0.16 : -0.16;
  const a = Math.atan2(p.y, p.x) + spread;
  const r = Math.hypot(p.x, p.y) * k;
  return { id, name, desc, arm: 'echo', parents: [parent], cost, effect, color: colorOf(effect), repeat: { growth }, x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) };
}

const ECHOES: NovaNode[] = [
  echo('echo.stellar.a', 'Stellar Echo', 'Engines +25% per level.', 'cap.blaze', mul('productionMult', 1.25), BALANCE.novaTree.echoCost, 2.2),
  echo('echo.tap.b', 'Tap Echo', 'Taps +30% per level.', 'cap.blaze', mul('tapPower', 1.3), BALANCE.novaTree.echoCost, 2.2),
  echo('echo.shard.a', 'Shard Echo', 'Shards +10% per level.', 'cap.comets', mul('shardGain', 1.1), BALANCE.novaTree.echoCost * 1.5, 2.5),
  echo('echo.comet.b', 'Comet Echo', 'Comets 5% more often per level.', 'cap.comets', mul('cometRate', 1.05), BALANCE.novaTree.echoCost, 2),
  echo('echo.dream.a', 'Dream Echo', 'Away time counts 1 hour longer per level.', 'cap.self', add('offlineCap', 3600), BALANCE.novaTree.echoCost, 2),
  echo('echo.forge.b', 'Forge Echo', 'Engines cost 3% less per level.', 'cap.self', mul('engineCostMult', 0.97), BALANCE.novaTree.echoCost, 2.2),
];

const ROOT: NovaNode = {
  id: 'root',
  name: 'Rekindle',
  desc: 'The first spark after the blast: engines and taps x2.',
  arm: 'root',
  parents: [],
  cost: 1,
  effect: mul('productionMult', 2),
  color: 'mul',
  x: 0,
  y: 0,
};

export const NOVA_TREE: readonly NovaNode[] = [ROOT, ...arms, ...CAPS, ...ECHOES];
export const NOVA_NODE: ReadonlyMap<string, NovaNode> = new Map(NOVA_TREE.map((n) => [n.id, n]));
