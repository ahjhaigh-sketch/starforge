import { BALANCE } from './balance';
import { colorOf, type NodeColor } from './novaTree';

/**
 * The Nebula Tree: 100 nodes bought with Nebula Essence, drawn as a drifting cloud (Game design:
 * "Nebula and Constellation Runes"). Four wisps meander out from the centre, each with small
 * puffs off its path:
 * - Veil: runes (speed, bulk, luck, cheaper rolls).
 * - Bloom: Essence and shards, and what a Nebula keeps.
 * - Drift: Stardust, taps and time away.
 * - Lattice: the Belt, the Starforge, ships and fusion.
 * Four capstones join neighbouring wisps, and seven repeatable echoes have no level cap. 1.3.0 adds
 * Constant Flow beside the root.
 * IDs never change once released.
 */
export type NebulaFlag = 'keepShards' | 'startNovas' | 'keepNovaCore' | 'constantFlow';

export type NebulaEffect = { stat: string; op: 'add' | 'mul' | 'pow'; value: number } | { flag: NebulaFlag; value: number };

export interface NebulaNode {
  id: string;
  name: string;
  desc: string;
  wisp: 'root' | 'veil' | 'bloom' | 'drift' | 'lattice' | 'cap' | 'echo';
  parents: readonly string[];
  cost: number;
  effect: NebulaEffect;
  color: NodeColor;
  repeat?: { growth: number };
  x: number;
  y: number;
}

const mul = (stat: string, value: number): NebulaEffect => ({ stat, op: 'mul', value });
const add = (stat: string, value: number): NebulaEffect => ({ stat, op: 'add', value });
const pow = (stat: string, value: number): NebulaEffect => ({ stat, op: 'pow', value });
const flag = (f: NebulaFlag, value: number): NebulaEffect => ({ flag: f, value });
const color = (e: NebulaEffect): NodeColor => ('flag' in e ? 'unlock' : colorOf(e as Parameters<typeof colorOf>[0]));

type Spec = [name: string, desc: string, effect: NebulaEffect];

const VEIL: Spec[] = [
  ['First Roll', 'Runes roll 50% faster.', mul('runeSpeed', 1.5)],
  ['Thin Veil', 'Rune Luck x1.25.', mul('runeLuck', 1.25)],
  ['Handful', 'Rune Bulk x2.', mul('runeBulk', 2)],
  ['Bargain Altar', 'Runes cost 20% less.', mul('runePrice', 0.8)],
  ['Quick Hands', 'Runes roll 50% faster.', mul('runeSpeed', 1.5)],
  ['Lucky Mist', 'Rune Luck x1.25.', mul('runeLuck', 1.25)],
  ['Armful', 'Rune Bulk x2.', mul('runeBulk', 2)],
  ['Resonant Stones', 'Rune effects +10%.', mul('runeEffect', 1.1)],
  ['Bargain Altar II', 'Runes cost 25% less.', mul('runePrice', 0.75)],
  ['Rolling Thunder', 'Runes roll twice as fast.', mul('runeSpeed', 2)],
  ['Lucky Stars', 'Rune Luck x1.5.', mul('runeLuck', 1.5)],
  ['Cartload', 'Rune Bulk x3.', mul('runeBulk', 3)],
  ['Resonant Stones II', 'Rune effects +15%.', mul('runeEffect', 1.15)],
  ['Altar of Plenty', 'Runes cost 30% less.', mul('runePrice', 0.7)],
  ['Wheel of Fate', 'Rune Luck x1.5.', mul('runeLuck', 1.5)],
  ['Shipload', 'Rune Bulk x5.', mul('runeBulk', 5)],
  ['Spinning Sky', 'Runes roll twice as fast.', mul('runeSpeed', 2)],
  ['Resonant Stones III', 'Rune effects +20%.', mul('runeEffect', 1.2)],
  ['Fortune Veil', 'Rune Luck x2.', mul('runeLuck', 2)],
  ['Starload', 'Rune Bulk x10.', mul('runeBulk', 10)],
  ['Free Altar', 'Runes cost half as much.', mul('runePrice', 0.5)],
  ['Heart of the Veil', 'Rune Bulk is raised to the power 1.05.', pow('runeBulk', 1.05)],
];

const BLOOM: Spec[] = [
  ['Essence Bloom', 'Nebulas give 50% more Essence.', mul('essenceGain', 1.5)],
  ['Shard Bloom', 'Shards x2.', mul('shardGain', 2)],
  ['Kept Embers', 'Keep 10% of your Nova Shards through a Nebula.', flag('keepShards', 0.1)],
  ['Head Start', 'Each Nebula run starts with 3 Supernovas done.', flag('startNovas', 3)],
  ['Essence Bloom II', 'Nebulas give twice as much Essence.', mul('essenceGain', 2)],
  ['Shard Bloom II', 'Shards x2.', mul('shardGain', 2)],
  ['Remembered Spiral', 'The Nova Tree root and the first node of each arm stay through a Nebula.', flag('keepNovaCore', 1)],
  ['Shard Rain', 'Gain another 1% of your Supernova gain every second.', add('passiveShards', 0.01)],
  ['Kept Embers II', 'Keep another 15% of your Nova Shards.', flag('keepShards', 0.15)],
  ['Essence Bloom III', 'Nebulas give twice as much Essence.', mul('essenceGain', 2)],
  ['Head Start II', 'Each Nebula run starts with another 5 Supernovas done.', flag('startNovas', 5)],
  ['Shard Bloom III', 'Shards x3.', mul('shardGain', 3)],
  ['Rich Cloud', 'Nebulas give 50% more Essence.', mul('essenceGain', 1.5)],
  ['Shard Storm', 'Gain another 2% of your Supernova gain every second.', add('passiveShards', 0.02)],
  ['Shard Bloom IV', 'Shards x3.', mul('shardGain', 3)],
  ['Kept Embers III', 'Keep another 25% of your Nova Shards.', flag('keepShards', 0.25)],
  ['Essence Flood', 'Nebulas give three times as much Essence.', mul('essenceGain', 3)],
  ['Head Start III', 'Each Nebula run starts with another 7 Supernovas done.', flag('startNovas', 7)],
  ['Shard Bloom V', 'Shards x5.', mul('shardGain', 5)],
  ['Nebula Heart', 'Nebulas give twice as much Essence.', mul('essenceGain', 2)],
  ['Endless Bloom', 'Shards x5.', mul('shardGain', 5)],
  ['Heart of the Bloom', 'Shard gain is raised to the power 1.05.', pow('shardGain', 1.05)],
];

const DRIFT: Spec[] = [
  ['Drifting Dust', 'Stardust x3.', mul('productionMult', 3)],
  ['Drifting Hands', 'Taps x3.', mul('tapPower', 3)],
  ['Long Drift', 'Away time counts up to 4 hours longer.', add('offlineCap', 14_400)],
  ['Soft Landing', 'Earn 10% more while away.', add('offlineEfficiency', 0.1)],
  ['Drifting Dust II', 'Stardust x5.', mul('productionMult', 5)],
  ['Starlit Hands', 'Taps x5.', mul('tapPower', 5)],
  ['Comet Drift', 'Comets come 50% more often.', mul('cometRate', 1.5)],
  ['Drifting Dust III', 'Stardust x5.', mul('productionMult', 5)],
  ['Deep Drift', 'Away time counts up to 8 hours longer.', add('offlineCap', 28_800)],
  ['Still Waters', 'Earn 15% more while away.', add('offlineEfficiency', 0.15)],
  ['Engine Cloud', 'Engines cost 30% less.', mul('engineCostMult', 0.7)],
  ['Drifting Dust IV', 'Stardust x10.', mul('productionMult', 10)],
  ['Frenzy Drift', 'Frenzy comets x1.5 stronger.', mul('frenzyMult', 1.5)],
  ['Golden Hands', 'Taps x10.', mul('tapPower', 10)],
  ['Evolving Mist', 'Evolving your star costs 70% less.', mul('tierCostMult', 0.3)],
  ['Drifting Dust V', 'Stardust x10.', mul('productionMult', 10)],
  ['Endless Night', 'Away time counts up to 12 hours longer.', add('offlineCap', 43_200)],
  ['Dream Drift', 'Earn 25% more while away.', add('offlineEfficiency', 0.25)],
  ['Milestone Mist', 'Engine milestones give another +0.3.', add('milestoneBase', 0.3)],
  ['Drifting Dust VI', 'Stardust x25.', mul('productionMult', 25)],
  ['Drifting Hands VI', 'Taps x25.', mul('tapPower', 25)],
  ['Heart of the Drift', 'Stardust production is raised to the power 1.03.', pow('productionMult', 1.03)],
];

const LATTICE: Spec[] = [
  ['Ore Lattice', 'Ore x2.', mul('oreGain', 2)],
  ['Alloy Lattice', 'Alloy x1.5.', mul('alloyGain', 1.5)],
  ['Swift Hulls', 'Starships 25% faster.', mul('shipSpeed', 1.25)],
  ['Hot Crucibles', 'Smelting 25% faster.', mul('forgeSpeed', 1.25)],
  ['Scholar Cloud', 'Starsmith XP x2.', mul('xpGain', 2)],
  ['Deep Drills', 'Drilling x3.', mul('drillPower', 3)],
  ['Ore Lattice II', 'Ore x2.', mul('oreGain', 2)],
  ['Wide Belt', '+20 asteroids in the field.', add('beltCap', 20)],
  ['Full Holds', 'Starship loot x1.5.', mul('shipLoot', 1.5)],
  ['Alloy Lattice II', 'Alloy x2.', mul('alloyGain', 2)],
  ['Lucky Belt', 'Asteroid luck x1.5.', mul('beltLuck', 1.5)],
  ['Swift Hulls II', 'Starships 50% faster.', mul('shipSpeed', 1.5)],
  ['Seventh Slot', 'One more relic slot.', add('relicSlots', 1)],
  ['Hot Crucibles II', 'Smelting 50% faster.', mul('forgeSpeed', 1.5)],
  ['Ore Lattice III', 'Ore x3.', mul('oreGain', 3)],
  ['Scholar Cloud II', 'Starsmith XP x3.', mul('xpGain', 3)],
  ['Full Holds II', 'Starship loot x2.', mul('shipLoot', 2)],
  ['Alloy Lattice III', 'Alloy x3.', mul('alloyGain', 3)],
  ['Eighth Slot', 'One more relic slot.', add('relicSlots', 1)],
  ['Deep Drills II', 'Drilling x5.', mul('drillPower', 5)],
  ['Lucky Belt II', 'Asteroid luck x2.', mul('beltLuck', 2)],
  ['Heart of the Lattice', 'Alloy gain is raised to the power 1.05.', pow('alloyGain', 1.05)],
];

const WISPS: Array<{ key: 'veil' | 'bloom' | 'drift' | 'lattice'; angle: number; specs: Spec[] }> = [
  { key: 'veil', angle: -Math.PI / 4, specs: VEIL },
  { key: 'bloom', angle: Math.PI / 4, specs: BLOOM },
  { key: 'drift', angle: (3 * Math.PI) / 4, specs: DRIFT },
  { key: 'lattice', angle: (-3 * Math.PI) / 4, specs: LATTICE },
];

/** Main path nodes cost 1 x 2.6^step; puffs cost a little more than the node they hang off. */
const stepCost = (step: number) => BALANCE.nebula.treeBase * BALANCE.nebula.treeGrowth ** step;

function buildWisps(): NebulaNode[] {
  const nodes: NebulaNode[] = [];
  for (const w of WISPS) {
    let lastMain = 'nroot';
    let step = 0;
    let lastPos = { x: 0, y: 0 };
    w.specs.forEach(([name, desc, effect], i) => {
      const id = `${w.key}.${i + 1}`;
      // every third node is a puff off the path; the rest walk outwards, meandering
      const puff = i % 3 === 2;
      let x: number;
      let y: number;
      if (puff) {
        const perp = w.angle + Math.PI / 2 * (i % 2 === 0 ? 1 : -1);
        x = lastPos.x + Math.cos(perp) * 95;
        y = lastPos.y + Math.sin(perp) * 95;
      } else {
        step++;
        const r = 120 + step * 82;
        const a = w.angle + 0.32 * Math.sin(step * 0.8);
        x = Math.cos(a) * r;
        y = Math.sin(a) * r;
      }
      nodes.push({
        id,
        name,
        desc,
        wisp: w.key,
        parents: [lastMain],
        cost: Math.round(stepCost(puff ? step + 0.5 : step - 1) * 100) / 100,
        effect,
        color: color(effect),
        x: Math.round(x),
        y: Math.round(y),
      });
      if (!puff) {
        lastMain = id;
        lastPos = { x, y };
      }
    });
  }
  return nodes;
}

const wisps = buildWisps();
const lastMain = (key: string) => wisps.filter((n) => n.wisp === key && Number(n.id.split('.')[1]) % 3 !== 0).at(-1)!;

function cap(id: string, name: string, desc: string, a: string, b: string, effect: NebulaEffect): NebulaNode {
  const na = lastMain(a);
  const nb = lastMain(b);
  const mx = (na.x + nb.x) / 2;
  const my = (na.y + nb.y) / 2;
  const k = 1400 / Math.hypot(mx, my);
  return { id, name, desc, wisp: 'cap', parents: [na.id, nb.id], cost: stepCost(17), effect, color: color(effect), x: Math.round(mx * k), y: Math.round(my * k) };
}

const CAPS: NebulaNode[] = [
  cap('ncap.storm', 'Rune Storm', 'Runes roll three times as fast.', 'veil', 'bloom', mul('runeSpeed', 3)),
  cap('ncap.flood', 'Essence Flood', 'Nebulas give five times as much Essence.', 'bloom', 'drift', mul('essenceGain', 5)),
  cap('ncap.tide', 'Star Tide', 'Stardust x100.', 'drift', 'lattice', mul('productionMult', 100)),
  cap('ncap.anvil', 'Cloud Anvil', 'Alloy x5.', 'lattice', 'veil', mul('alloyGain', 5)),
];

function echo(id: string, name: string, desc: string, parent: string, effect: NebulaEffect, growth: number, side: number): NebulaNode {
  const p = CAPS.find((n) => n.id === parent)!;
  const a = Math.atan2(p.y, p.x) + side * 0.14;
  const r = Math.hypot(p.x, p.y) * 1.2;
  return { id, name, desc, wisp: 'echo', parents: [parent], cost: stepCost(15), effect, color: color(effect), repeat: { growth }, x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) };
}

const ECHOES: NebulaNode[] = [
  echo('necho.bulk', 'Bulk Echo', 'Rune Bulk +50% per level.', 'ncap.storm', mul('runeBulk', 1.5), 6, -1),
  echo('necho.luck', 'Luck Echo', 'Rune Luck +10% per level.', 'ncap.storm', mul('runeLuck', 1.1), 4, 1),
  echo('necho.essence', 'Essence Echo', 'Essence +20% per level.', 'ncap.flood', mul('essenceGain', 1.2), 8, -1),
  echo('necho.shard', 'Shard Echo', 'Shards +50% per level.', 'ncap.flood', mul('shardGain', 1.5), 8, 1),
  echo('necho.dust', 'Dust Echo', 'Stardust x2 per level.', 'ncap.tide', mul('productionMult', 2), 10, -1),
  echo('necho.tap', 'Tap Echo', 'Taps x2 per level.', 'ncap.tide', mul('tapPower', 2), 10, 1),
  echo('necho.alloy', 'Alloy Echo', 'Alloy +50% per level.', 'ncap.anvil', mul('alloyGain', 1.5), 8, 0),
];

const ROOT: NebulaNode = { id: 'nroot', name: 'First Mist', desc: 'The cloud remembers: Stardust x2.', wisp: 'root', parents: [], cost: 1, effect: mul('productionMult', 2), color: 'mul', x: 0, y: 0 };

/**
 * 1.3.0: Constant Flow, straight off the root between the Veil and the Lattice (the playtest asked for constant
 * automation in the Nebula Tree). Auto-Constants then steps every constant to its next doubling every second instead
 * of once a minute (which a run of Supernovas a minute apart held at level 50). Still a step at a time: buying the
 * most it could afford turned e546 Essence into 1,300 Drift levels in one second.
 */
const FLOW: NebulaNode = { id: 'nflow.constants', name: 'Constant Flow', desc: 'Auto-Constants spends everything it may on constants, whatever its spending limit.', wisp: 'root', parents: ['nroot'], cost: Math.round(stepCost(BALANCE.nebula.flowStep) * 100) / 100, effect: flag('constantFlow', 1), color: 'unlock', x: 0, y: -175 };

export const NEBULA_TREE: readonly NebulaNode[] = [ROOT, ...wisps, ...CAPS, ...ECHOES, FLOW];
export const NEBULA_NODE: ReadonlyMap<string, NebulaNode> = new Map(NEBULA_TREE.map((n) => [n.id, n]));
