import type { KitEffect, KitNode } from '../engine/treeKit';
import { BALANCE } from './balance';
import type { NodeColor } from './novaTree';

/**
 * Galactic Rebirth content (Game design: "Galactic Rebirth, Big Crunch and Multiverse"):
 * the 20 galaxies, the 200-node Galactic Tree, the Observatory's sky and the Stardust Chart.
 * IDs never change.
 */
const G = BALANCE.galactic;

// ---------- galaxies ----------

export interface GalaxyEffect {
  stat: string;
  op: 'mul' | 'pow' | 'add';
  value: number;
}

export type GalaxyGoal = { kind: 'singularities'; n: number } | { kind: 'darkMatter'; amount: number } | { kind: 'mirrorDepth'; n: number } | { kind: 'essence'; amount: number };

export interface GalaxyDef {
  id: string;
  name: string;
  /** Sky tint while you're there. */
  color: string;
  rule: string;
  effects: readonly GalaxyEffect[];
  goal: GalaxyGoal;
  goalText: string;
  /** For good, once the goal is met. */
  reward: GalaxyEffect;
  rewardText: string;
}

const m = (stat: string, value: number): GalaxyEffect => ({ stat, op: 'mul', value });
const p = (stat: string, value: number): GalaxyEffect => ({ stat, op: 'pow', value });
const a = (stat: string, value: number): GalaxyEffect => ({ stat, op: 'add', value });
const sing = (n: number): GalaxyGoal => ({ kind: 'singularities', n });
const dm = (amount: number): GalaxyGoal => ({ kind: 'darkMatter', amount });

export const GALAXIES: readonly GalaxyDef[] = [
  { id: 'milkyway', name: 'Milky Way', color: '#6E5CC4', rule: 'Home: no special rules.', effects: [], goal: sing(10), goalText: 'Go Singularity 10 times here', reward: m('productionMult', 1e10), rewardText: 'Stardust x1e10' },
  { id: 'spiral', name: 'Spiral', color: '#2EE6FF', rule: 'Comets come three times as often and Frenzies are twice as strong.', effects: [m('cometRate', 3), m('frenzyMult', 2)], goal: dm(1e15), goalText: 'Gain 1e15 Dark Matter here', reward: m('cometRate', 2), rewardText: 'Comets x2 as often' },
  { id: 'elliptical', name: 'Elliptical', color: '#FFB347', rule: 'Engines make x10; taps give a tenth.', effects: [m('productionMult', 10), m('tapPower', 0.1)], goal: sing(25), goalText: 'Go Singularity 25 times here', reward: m('productionMult', 1e15), rewardText: 'Stardust x1e15' },
  { id: 'ring', name: 'Ring', color: '#5FD39B', rule: 'The Belt is everywhere: ore x100, asteroids three times as often.', effects: [m('oreGain', 100), m('beltSpawn', 3)], goal: dm(1e20), goalText: 'Gain 1e20 Dark Matter here', reward: m('oreGain', 1e6), rewardText: 'Ore x1e6' },
  { id: 'dwarf', name: 'Dwarf', color: '#8C97C2', rule: 'Everything costs a hundredth; engines make a fiftieth.', effects: [m('engineCostMult', 0.01), m('tierCostMult', 0.01), m('productionMult', 0.02)], goal: { kind: 'mirrorDepth', n: 6 }, goalText: 'Collapse the anti-star 6 times here', reward: m('engineCostMult', 1e-6), rewardText: 'Engines cost a millionth' },
  { id: 'quasar', name: 'Quasar Host', color: '#FF4FC1', rule: 'Supernovas give x1e6 shards; Essence x0.1.', effects: [m('shardGain', 1e6), m('essenceGain', 0.1)], goal: dm(1e25), goalText: 'Gain 1e25 Dark Matter here', reward: m('shardGain', 1e9), rewardText: 'Shards x1e9' },
  { id: 'lenticular', name: 'Lenticular', color: '#9FE7FF', rule: 'Rune bulk x10, but runes cost x10.', effects: [m('runeBulk', 10), m('runePrice', 10)], goal: sing(40), goalText: 'Go Singularity 40 times here', reward: m('runeBulk', 100), rewardText: 'Rune bulk x100' },
  { id: 'starburst', name: 'Starburst', color: '#FF8A3D', rule: 'Essence x1,000; Stardust to the power 0.95.', effects: [m('essenceGain', 1000), p('productionMult', 0.95)], goal: { kind: 'essence', amount: 1e300 }, goalText: 'Gather 1e300 Essence in one Singularity run here', reward: m('essenceGain', 1e10), rewardText: 'Essence x1e10' },
  { id: 'barred', name: 'Barred Spiral', color: '#4FB6FF', rule: 'Dark Matter x2; the Black Hole gains a tenth of its mass.', effects: [m('darkMatterGain', 2), m('massGain', 0.1)], goal: dm(1e30), goalText: 'Gain 1e30 Dark Matter here', reward: m('darkMatterGain', 1.5), rewardText: 'Dark Matter x1.5' },
  { id: 'irregular', name: 'Irregular', color: '#C2561E', rule: 'Alloy x100; ore x0.1.', effects: [m('alloyGain', 100), m('oreGain', 0.1)], goal: { kind: 'mirrorDepth', n: 9 }, goalText: 'Collapse the anti-star 9 times here', reward: m('alloyGain', 1e6), rewardText: 'Alloy x1e6' },
  { id: 'andromeda', name: 'Andromeda', color: '#B06BFF', rule: 'Wyrm XP x100 and Embers x10; nursery stars grow at half speed.', effects: [m('wyrmXp', 100), m('emberGain', 10), m('nurseryGrowth', 0.5)], goal: sing(60), goalText: 'Go Singularity 60 times here', reward: m('emberGain', 1e6), rewardText: 'Embers x1e6' },
  { id: 'whirlpool', name: 'Whirlpool', color: '#1A9DB8', rule: 'Runes roll five times as fast; Rune Luck is halved.', effects: [m('runeSpeed', 5), m('runeLuck', 0.5)], goal: dm(1e35), goalText: 'Gain 1e35 Dark Matter here', reward: m('runeSpeed', 10), rewardText: 'Rune speed x10' },
  { id: 'sombrero', name: 'Sombrero', color: '#FFC83D', rule: 'Crits x10 and taps x2; comets come half as often.', effects: [m('critMult', 10), m('tapPower', 2), m('cometRate', 0.5)], goal: sing(80), goalText: 'Go Singularity 80 times here', reward: m('tapPower', 1e20), rewardText: 'Taps x1e20' },
  { id: 'pinwheel', name: 'Pinwheel', color: '#FF7AE0', rule: 'Comet buffs last three times as long; comets come half as often.', effects: [m('buffDuration', 3), m('cometRate', 0.5)], goal: dm(1e40), goalText: 'Gain 1e40 Dark Matter here', reward: m('buffDuration', 2), rewardText: 'Comet buffs last twice as long' },
  { id: 'cartwheel', name: 'Cartwheel', color: '#E8E0FF', rule: 'Starships fly five times as fast and bring back three times the loot.', effects: [m('shipSpeed', 5), m('shipLoot', 3)], goal: { kind: 'mirrorDepth', n: 11 }, goalText: 'Collapse the anti-star all the way here', reward: m('shipLoot', 10), rewardText: 'Ship loot x10' },
  { id: 'magellanic', name: 'Magellanic Cloud', color: '#5B45C2', rule: 'Spire power and Leviathan damage x10; Stardust x0.01.', effects: [m('spirePower', 10), m('leviathanDamage', 10), m('productionMult', 0.01)], goal: dm(1e45), goalText: 'Gain 1e45 Dark Matter here', reward: m('leviathanDamage', 100), rewardText: 'Leviathan damage x100' },
  { id: 'triangulum', name: 'Triangulum', color: '#2B7FD0', rule: 'Antimatter x10; Dark Matter x0.5.', effects: [m('antimatterMult', 10), m('darkMatterGain', 0.5)], goal: sing(100), goalText: 'Go Singularity 100 times here', reward: m('antimatterMult', 1000), rewardText: 'Antimatter x1,000' },
  { id: 'blackeye', name: 'Black Eye', color: '#140B2E', rule: 'Black Hole mass x10; Essence x0.1.', effects: [m('massGain', 10), m('essenceGain', 0.1)], goal: dm(1e50), goalText: 'Gain 1e50 Dark Matter here', reward: a('gameSpeed', 0.25), rewardText: 'The game runs 25% faster' },
  { id: 'tadpole', name: 'Tadpole', color: '#3E9E2A', rule: 'Planets x5 and Mastery x2; engines cost x1,000.', effects: [m('planetPower', 5), m('masteryMult', 2), m('engineCostMult', 1000)], goal: sing(150), goalText: 'Go Singularity 150 times here', reward: m('planetPower', 10), rewardText: 'Planets x10' },
  { id: 'hoag', name: "Hoag's Object", color: '#FF5640', rule: 'Stardust x1e10, shards and Essence x1,000, Dark Matter x1.5; Galaxy Cores x0.5.', effects: [m('productionMult', 1e10), m('shardGain', 1000), m('essenceGain', 1000), m('darkMatterGain', 1.5), m('galaxyCoreGain', 0.5)], goal: dm(1e60), goalText: 'Gain 1e60 Dark Matter here', reward: m('galaxyCoreGain', 2), rewardText: 'Galaxy Cores x2' },
];

export const GALAXY_BY_ID: ReadonlyMap<string, GalaxyDef> = new Map(GALAXIES.map((g) => [g.id, g]));

// ---------- the Galactic Tree ----------

export type GalacticFlag = 'startSingularities' | 'keepDarkMatter' | 'autoConstants';

const mul = (stat: string, value: number): KitEffect => ({ stat, op: 'mul', value });
const add = (stat: string, value: number): KitEffect => ({ stat, op: 'add', value });
const flag = (f: GalacticFlag, value: number): KitEffect => ({ flag: f, value });
const colorOf = (e: KitEffect): NodeColor => ('flag' in e ? 'unlock' : e.op === 'add' ? 'add' : e.op === 'pow' ? 'pow' : 'mul');

type Spec = [name: string, desc: string, effect: KitEffect];

/** One arm per playstyle; each arm cycles its list outwards, adding II, III... on later laps. */
export const ARMS: ReadonlyArray<{ key: string; name: string; specs: Spec[] }> = [
  {
    key: 'active',
    name: 'Active',
    specs: [
      ['Quick Fingers', 'Taps x10.', mul('tapPower', 10)],
      ['Bright Crits', 'Crits x2.', mul('critMult', 2)],
      ['Comet Lure', 'Comets 20% more often.', mul('cometRate', 1.2)],
      ['Hot Streak', 'Combo bonus x1.25.', mul('comboPower', 1.25)],
      ['Frenzy Core', 'Frenzies x1.5.', mul('frenzyMult', 1.5)],
      ['Long Flare', 'Comet buffs last 20% longer.', mul('buffDuration', 1.2)],
      ['Starstrike', 'Taps x100.', mul('tapPower', 100)],
    ],
  },
  {
    key: 'idle',
    name: 'Idle',
    specs: [
      ['Slow Burn', 'Stardust x100.', mul('productionMult', 100)],
      ['Long Night', 'Offline time counts x1.25.', mul('offlineCap', 1.25)],
      ['Steady Clock', 'The game runs 2% faster.', add('gameSpeed', 0.02)],
      ['Deep Sleep', 'Stardust x1,000.', mul('productionMult', 1000)],
      ['Head Start', 'Start each Galactic run with a Singularity done.', flag('startSingularities', 1)],
      ['Still Waters', 'Shards x100.', mul('shardGain', 100)],
      ['Dark Reserve', 'Keep 5% of your Dark Matter through a Galactic Rebirth.', flag('keepDarkMatter', 0.05)],
    ],
  },
  {
    key: 'runes',
    name: 'Runes',
    specs: [
      ['Star Dice', 'Rune speed x2.', mul('runeSpeed', 2)],
      ['Root of Worlds', 'Luck Root +0.15: huge odds shrink.', add('luckRoot', 0.15)],
      ['Wide Hands', 'Rune bulk x3.', mul('runeBulk', 3)],
      ['Fortune', 'Rune Luck x3.', mul('runeLuck', 3)],
      ['Aura Glass', 'Aura luck x2.', mul('auraLuck', 2)],
      ['Strange Charm', 'Mutation luck x1.5.', mul('mutationLuck', 1.5)],
    ],
  },
  {
    key: 'wyrms',
    name: 'Wyrms',
    specs: [
      ['Wyrm Song', 'Wyrm XP x5.', mul('wyrmXp', 5)],
      ['Ember Heart', 'Embers x10.', mul('emberGain', 10)],
      ['Green Hands', 'Nursery stars grow 50% faster.', mul('nurseryGrowth', 1.5)],
      ['Rich Soil', 'Nursery harvests x3.', mul('nurseryYield', 3)],
      ['Old Scales', 'Leviathan damage x5.', mul('leviathanDamage', 5)],
    ],
  },
  {
    key: 'production',
    name: 'Production',
    specs: [
      ['Core Pull', 'Galaxy Cores x1.15.', mul('galaxyCoreGain', 1.15)],
      ['Mist Engine', 'Essence x1e4.', mul('essenceGain', 1e4)],
      ['Shadow Well', 'Dark Matter x1.15.', mul('darkMatterGain', 1.15)],
      ['Nova Press', 'Shards x1e3.', mul('shardGain', 1000)],
      ['Mirror Fuel', 'Antimatter x10.', mul('antimatterMult', 10)],
      ['Heavy Light', 'Stardust x1e5.', mul('productionMult', 1e5)],
    ],
  },
];

/** The spiral: arms start this far out and step this much (radius, and turn in radians) per node. */
const SPIRAL = { r0: 200, step: 70, turn: 0.045 };

const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];
const PER_ARM = G.treeArmNodes;
const price = (step: number) => Math.max(1, Math.round(G.treeBase * G.treeGrowth ** step));

function buildTree(): KitNode[] {
  const nodes: KitNode[] = [{ id: 'gal.core', name: 'Galactic Core', desc: 'Galaxy Cores x1.5.', group: 'core', parents: [], cost: 1, effect: mul('galaxyCoreGain', 1.5), color: 'mul', big: true, x: 0, y: 0 }];
  ARMS.forEach((arm, k) => {
    const start = (k / ARMS.length) * Math.PI * 2 - Math.PI / 2;
    for (let i = 0; i < PER_ARM; i++) {
      const [name, desc, effect] = arm.specs[i % arm.specs.length]!;
      // a logarithmic-looking spiral: the arm swings round as it reaches out
      const r = SPIRAL.r0 + i * SPIRAL.step;
      const t = start + i * SPIRAL.turn;
      // only the first lap of a flag node is a flag; later laps strengthen the arm instead
      const lap = Math.floor(i / arm.specs.length);
      const eff: KitEffect = 'flag' in effect && lap > 0 ? (arm.key === 'idle' ? mul('productionMult', 1e3) : mul('galaxyCoreGain', 1.05)) : effect;
      nodes.push({
        id: `gal.${arm.key}.${i}`,
        name: `${name}${ROMAN[lap] ?? ` ${lap + 1}`}`,
        desc: 'flag' in effect && lap > 0 ? (arm.key === 'idle' ? 'Stardust x1,000.' : 'Galaxy Cores x1.05.') : desc,
        group: arm.key,
        parents: [i === 0 ? 'gal.core' : `gal.${arm.key}.${i - 1}`],
        cost: price(i),
        effect: eff,
        color: colorOf(eff),
        x: Math.round(Math.cos(t) * r),
        y: Math.round(Math.sin(t) * r),
      });
    }
  });
  // capstones where neighbouring arms end: need both
  const CAPS: Array<[string, string, KitEffect]> = [
    ['Twin Tide', 'Taps and Stardust x1e6.', mul('productionMult', 1e6)],
    ['Dreaming Dice', 'Rune speed x10 while you sleep.', mul('runeSpeed', 10)],
    ['Wyrm Constellation', 'Wyrm XP x100.', mul('wyrmXp', 100)],
    ['Galactic Heart', 'Galaxy Cores x2.', mul('galaxyCoreGain', 2)],
    ['Spiral Crown', 'Dark Matter x1.5.', mul('darkMatterGain', 1.5)],
  ];
  ARMS.forEach((arm, k) => {
    const next = ARMS[(k + 1) % ARMS.length]!;
    const [name, desc, effect] = CAPS[k]!;
    const ta = (k / ARMS.length) * Math.PI * 2 - Math.PI / 2 + (PER_ARM - 1) * SPIRAL.turn;
    const tb = ((k + 1) / ARMS.length) * Math.PI * 2 - Math.PI / 2 + (PER_ARM - 1) * SPIRAL.turn;
    const t = (ta + (tb < ta ? tb + Math.PI * 2 : tb)) / 2;
    const r = SPIRAL.r0 + PER_ARM * SPIRAL.step + 60;
    nodes.push({ id: `gal.cap.${k}`, name, desc, group: 'cap', parents: [`gal.${arm.key}.${PER_ARM - 1}`, `gal.${next.key}.${PER_ARM - 1}`], needsAll: true, cost: price(PER_ARM + 4), effect, color: colorOf(effect), big: true, x: Math.round(Math.cos(t) * r), y: Math.round(Math.sin(t) * r) });
  });
  // echoes: repeatable, off the middle of four arms
  const ECHOES: Array<[string, string, KitEffect]> = [
    ['Echo of Light', 'Stardust x10 a level, no cap.', mul('productionMult', 10)],
    ['Echo of Fate', 'Rune bulk x1.5 a level, no cap.', mul('runeBulk', 1.5)],
    ['Echo of Wings', 'Embers x2 a level, no cap.', mul('emberGain', 2)],
    ['Echo of Cores', 'Galaxy Cores x1.05 a level, no cap.', mul('galaxyCoreGain', 1.05)],
  ];
  ECHOES.forEach(([name, desc, effect], k) => {
    const arm = ARMS[k]!;
    const mid = nodes.find((n) => n.id === `gal.${arm.key}.${Math.floor(PER_ARM / 2)}`)!;
    // beside the arm (a quarter turn off it), clear of the nodes along it
    const len = Math.hypot(mid.x, mid.y);
    const px = -mid.y / len;
    const py = mid.x / len;
    nodes.push({ id: `gal.echo.${k}`, name, desc, group: 'echo', parents: [mid.id], cost: price(Math.floor(PER_ARM / 2)), repeat: { growth: G.echoGrowth }, effect, color: 'mul', x: Math.round(mid.x + px * 110), y: Math.round(mid.y + py * 110) });
  });
  // 1.4.5: every constant set buys itself, beside the fifth arm (the four echoes sit beside the other four)
  {
    const arm = ARMS[4]!;
    const mid = nodes.find((n) => n.id === `gal.${arm.key}.${Math.floor(PER_ARM / 2)}`)!;
    const len = Math.hypot(mid.x, mid.y);
    const effect = flag('autoConstants', 1);
    nodes.push({ id: 'gal.constantEngine', name: 'Constant Engine', desc: 'Every constant buys itself: Stellar, Nova, Nebula, Void and Galactic Constants, every level they can pay for, every second.', group: arm.key, parents: [mid.id], cost: price(Math.floor(PER_ARM / 2)), effect, color: colorOf(effect), big: true, x: Math.round(mid.x - (mid.y / len) * 110), y: Math.round(mid.y + (mid.x / len) * 110) });
  }
  return nodes;
}

export const GALACTIC_TREE: readonly KitNode[] = buildTree();

// ---------- the Observatory ----------

export interface SkyStar {
  x: number;
  y: number;
  /** Solar masses, 0.5 to 5 (log-uniform). */
  mass: number;
  /** Kelvin, 3,000 to 30,000. */
  temp: number;
  /** Light years, 4 to 40: nearer stars shine brighter. */
  dist: number;
}

/** A small, fast, seeded generator for the sky (the same seed always draws the same stars). */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollSky(seed: number): SkyStar[] {
  const r = mulberry(seed);
  const stars: SkyStar[] = [];
  let guard = 0;
  while (stars.length < G.skyStars && guard++ < 2000) {
    const x = 0.06 + r() * 0.88;
    const y = 0.08 + r() * 0.84;
    const mass = 0.5 * 10 ** r();
    const temp = Math.round(3000 * 10 ** r());
    const dist = Math.round((4 + r() * 36) * 10) / 10;
    // keep stars apart so every one can be clicked
    if (stars.some((s2) => Math.hypot(s2.x - x, s2.y - y) < 0.07)) continue;
    stars.push({ x, y, mass, temp, dist });
  }
  return stars;
}

/** A star's colour from its temperature (red dwarfs to blue giants). */
export function starColor(temp: number): string {
  if (temp < 4000) return '#FF7A5A';
  if (temp < 5500) return '#FFB347';
  if (temp < 7000) return '#FFE7A0';
  if (temp < 10000) return '#F4F1FF';
  if (temp < 18000) return '#B8D4FF';
  return '#7FB0FF';
}

// ---------- the Stardust Chart (bought with Star Charts from the Observatory) ----------

const C = (id: string, name: string, desc: string, effect: KitEffect, parents: string[], cost: number, x: number, y: number, big = false): KitNode => ({ id, name, desc, group: 'chart', parents, cost, effect, color: colorOf(effect), big, x, y });

export const STAR_CHART: readonly KitNode[] = [
  C('chart.root', 'First Light', 'Stardust x1e6.', mul('productionMult', 1e6), [], G.chartCosts[0]!, 0, 0, true),
  C('chart.1', 'Pole Star', 'Galaxy Cores x1.1.', mul('galaxyCoreGain', 1.1), ['chart.root'], G.chartCosts[1]!, -160, -120),
  C('chart.2', 'Plough', 'Shards x1e4.', mul('shardGain', 1e4), ['chart.root'], G.chartCosts[1]!, 0, -170),
  C('chart.3', 'Hunter', 'Taps x1e4.', mul('tapPower', 1e4), ['chart.root'], G.chartCosts[1]!, 160, -120),
  C('chart.4', 'Swan', 'Essence x1e4.', mul('essenceGain', 1e4), ['chart.1'], G.chartCosts[2]!, -260, -260),
  C('chart.5', 'Lyre', 'Rune bulk x10.', mul('runeBulk', 10), ['chart.2'], G.chartCosts[2]!, 0, -330),
  C('chart.6', 'Scorpion', 'Leviathan damage x10.', mul('leviathanDamage', 10), ['chart.3'], G.chartCosts[2]!, 260, -260),
  C('chart.7', 'Dragon', 'Wyrm XP x10.', mul('wyrmXp', 10), ['chart.4'], G.chartCosts[3]!, -340, -420),
  C('chart.8', 'Crown', 'Dark Matter x1.25.', mul('darkMatterGain', 1.25), ['chart.5'], G.chartCosts[3]!, 0, -490),
  C('chart.9', 'Archer', 'Antimatter x100.', mul('antimatterMult', 100), ['chart.6'], G.chartCosts[3]!, 340, -420),
  C('chart.10', 'Long Lens', 'The Observatory takes 2 more links.', { flag: 'moreLinks', value: 2 }, ['chart.7', 'chart.9'], G.chartCosts[4]!, -150, -600),
  C('chart.11', 'Star Atlas', 'Galaxy Cores x1.5.', mul('galaxyCoreGain', 1.5), ['chart.8', 'chart.10'], G.chartCosts[5]!, 150, -640, true),
  // 1.4.0: three charts that level up for ever, so Star Charts always have a use once the chart is complete
  { ...C('chart.echo.cores', 'Chart of Cores', 'Galaxy Cores x1.15 a level.', mul('galaxyCoreGain', 1.15), ['chart.11'], G.chartEchoCost, 0, -790), repeat: { growth: G.chartEchoGrowth } },
  { ...C('chart.echo.shadow', 'Chart of Shadows', 'Dark Matter x2 a level.', mul('darkMatterGain', 2), ['chart.11'], G.chartEchoCost, -200, -760), repeat: { growth: G.chartEchoGrowth } },
  { ...C('chart.echo.light', 'Chart of Light', 'Stardust x1e10 a level.', mul('productionMult', 1e10), ['chart.11'], G.chartEchoCost, 200, -760), repeat: { growth: G.chartEchoGrowth } },
];
