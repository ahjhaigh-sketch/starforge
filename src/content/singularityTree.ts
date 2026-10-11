import type { KitEffect, KitNode } from '../engine/treeKit';
import { BALANCE } from './balance';
import type { NodeColor } from './novaTree';

/**
 * The Singularity Tree: 100 nodes bought with Dark Matter, laid out as four rings around an
 * accretion disk (Game design: "Singularity"). Each ring is split into four sectors:
 * - Mass: the Black Hole (mass gain, game speed).
 * - Matter: Dark Matter and Essence.
 * - Fate: runes, with the Luck Root nodes (+0.1 each, to about 1.5 with the Black Hole's violet stage).
 * - Memory: what a Singularity keeps, Stardust and shards.
 * A ring node hangs off the nearest node of the ring inside it; four capstones each join two
 * outer-ring sectors; three echoes level up with no cap. IDs never change.
 */
export type SingularityFlag = 'keepEssence' | 'startNebulas' | 'keepSpectral';

const mul = (stat: string, value: number): KitEffect => ({ stat, op: 'mul', value });
const add = (stat: string, value: number): KitEffect => ({ stat, op: 'add', value });
const flag = (f: SingularityFlag, value: number): KitEffect => ({ flag: f, value });
const colorOf = (e: KitEffect): NodeColor => ('flag' in e ? 'unlock' : e.op === 'add' ? 'add' : e.op === 'pow' ? 'pow' : 'mul');

type Spec = [name: string, desc: string, effect: KitEffect];

/** Effects by sector, inner ring first; each ring takes its share in order and wraps. */
const SECTORS: Array<{ key: string; specs: Spec[] }> = [
  {
    key: 'mass',
    specs: [
      ['Heavy Seed', 'Black Hole mass x2.', mul('massGain', 2)],
      ['Event Spark', 'Black Hole mass x1.5.', mul('massGain', 1.5)],
      ['Frame Drag', 'The game runs 5% faster.', add('gameSpeed', 0.05)],
      ['Deep Well', 'Black Hole mass x2.', mul('massGain', 2)],
      ['Tidal Pull', 'Black Hole mass x3.', mul('massGain', 3)],
      ['Time Dilation', 'The game runs 10% faster.', add('gameSpeed', 0.1)],
      ['Accretion', 'Black Hole mass x3.', mul('massGain', 3)],
      ['Spaghettify', 'Black Hole mass x5.', mul('massGain', 5)],
      ['Ergosphere', 'The game runs 10% faster.', add('gameSpeed', 0.1)],
      ['Mass Bloom', 'Black Hole mass x5.', mul('massGain', 5)],
    ],
  },
  {
    key: 'matter',
    specs: [
      ['Dark Seed', 'Dark Matter x1.1.', mul('darkMatterGain', 1.1)],
      ['Thick Fog', 'Essence x3.', mul('essenceGain', 3)],
      ['Shadow Mass', 'Dark Matter x1.15.', mul('darkMatterGain', 1.15)],
      ['Cold Cloud', 'Essence x10.', mul('essenceGain', 10)],
      ['Unseen Weight', 'Dark Matter x1.15.', mul('darkMatterGain', 1.15)],
      ['Nebula Engine', 'Essence x100.', mul('essenceGain', 100)],
      ['Halo of Night', 'Dark Matter x1.2.', mul('darkMatterGain', 1.2)],
      ['Essence Storm', 'Essence x1,000.', mul('essenceGain', 1000)],
      ['Matter Tide', 'Dark Matter x1.25.', mul('darkMatterGain', 1.25)],
      ['Void Reservoir', 'Dark Matter x1.3.', mul('darkMatterGain', 1.3)],
    ],
  },
  {
    key: 'fate',
    specs: [
      ['Root of Luck', 'Luck Root +0.1: huge odds shrink.', add('luckRoot', 0.1)],
      ['Fate Dust', 'Rune Luck x2.', mul('runeLuck', 2)],
      ['Heavy Hands', 'Rune Bulk x3.', mul('runeBulk', 3)],
      ['Root of Chance', 'Luck Root +0.1.', add('luckRoot', 0.1)],
      ['Fate Weave', 'Rune Luck x3.', mul('runeLuck', 3)],
      ['Avalanche', 'Rune Bulk x10.', mul('runeBulk', 10)],
      ['Root of Fortune', 'Luck Root +0.1.', add('luckRoot', 0.1)],
      ['Aura Gravity', 'Aura Luck x3.', mul('auraLuck', 3)],
      ['Root of Destiny', 'Luck Root +0.1.', add('luckRoot', 0.1)],
      ['Strange Luck', 'Mutation Luck x3.', mul('mutationLuck', 3)],
    ],
  },
  {
    key: 'memory',
    specs: [
      ['Afterimage', 'Keep 10% of your Essence through a Singularity.', flag('keepEssence', 0.1)],
      ['Starlight Memory', 'Stardust x1,000.', mul('productionMult', 1000)],
      ['Head Start', 'Start each Singularity with 2 Nebulas toward its milestones.', flag('startNebulas', 2)],
      ['Shard Memory', 'Shards x100.', mul('shardGain', 100)],
      ['Afterimage II', 'Keep another 15% of your Essence.', flag('keepEssence', 0.15)],
      ['Colour Memory', 'Spectral energy is kept through a Singularity.', flag('keepSpectral', 1)],
      ['Head Start II', 'Start with 3 more Nebulas.', flag('startNebulas', 3)],
      ['Starlight Memory II', 'Stardust x1e6.', mul('productionMult', 1e6)],
      ['Shard Memory II', 'Shards x1e4.', mul('shardGain', 1e4)],
      ['Afterimage III', 'Keep another 25% of your Essence.', flag('keepEssence', 0.25)],
    ],
  },
];

const RINGS = [8, 16, 28, 40];
const RADII = [260, 520, 800, 1080];
const G = BALANCE.singularity.treeGrowth;
const price = (step: number) => Math.round(BALANCE.singularity.treeBase * G ** step * 100) / 100;

function buildRings(): KitNode[] {
  const nodes: KitNode[] = [];
  const used = SECTORS.map(() => 0);
  let inner: KitNode[] = [];
  RINGS.forEach((count, r) => {
    const ring: KitNode[] = [];
    for (let j = 0; j < count; j++) {
      const a = (j / count) * Math.PI * 2 - Math.PI / 2 + (r % 2) * (Math.PI / count);
      const sector = Math.floor((j / count) * 4);
      const sec = SECTORS[sector]!;
      const spec = sec.specs[used[sector]! % sec.specs.length]!;
      used[sector]!++;
      const x = Math.cos(a) * RADII[r]!;
      const y = Math.sin(a) * RADII[r]!;
      // the nearest node of the ring inside (the core for the first ring)
      const parent = r === 0 ? 'score' : inner.reduce((best, n) => (Math.hypot(n.x - x, n.y - y) < Math.hypot(best.x - x, best.y - y) ? n : best)).id;
      const lap = Math.floor((used[sector]! - 1) / sec.specs.length);
      // Luck Root only on the first lap round the ring sectors (four nodes, +0.4); later laps give rune luck
      const rootAgain = lap > 0 && 'stat' in spec[2] && spec[2].stat === 'luckRoot';
      const [name, desc, effect]: Spec = rootAgain ? [spec[0].replace('Root of', 'Thread of'), 'Rune Luck x2.', mul('runeLuck', 2)] : spec;
      ring.push({
        id: `sing.${r + 1}.${j + 1}`,
        name: lap > 0 ? `${name} ${['', 'II', 'III', 'IV', 'V'][Math.min(4, lap)] ?? ''}`.trim() : name,
        desc,
        group: sec.key,
        parents: [parent],
        cost: price(r * 6 + Math.floor((j * 6) / count)),
        effect,
        color: colorOf(effect),
        x: Math.round(x),
        y: Math.round(y),
      });
    }
    nodes.push(...ring);
    inner = ring;
  });
  return nodes;
}

const rings = buildRings();
const outer = rings.filter((n) => n.id.startsWith('sing.4.'));

function cap(id: string, name: string, desc: string, a: number, b: number, effect: KitEffect): KitNode {
  const na = outer[a]!;
  const nb = outer[b]!;
  const mx = (na.x + nb.x) / 2;
  const my = (na.y + nb.y) / 2;
  const k = 1360 / Math.hypot(mx, my);
  return { id, name, desc, group: 'cap', parents: [na.id, nb.id], needsAll: true, cost: price(25), effect, color: colorOf(effect), big: true, x: Math.round(mx * k), y: Math.round(my * k) };
}

const CAPS: KitNode[] = [
  cap('scap.horizon', 'Event Horizon', 'Dark Matter x3.', 4, 5, mul('darkMatterGain', 3)),
  cap('scap.photon', 'Photon Sphere', 'Black Hole mass x100.', 14, 15, mul('massGain', 100)),
  cap('scap.fate', 'Loom of Fate', 'Luck Root +0.1.', 24, 25, add('luckRoot', 0.1)),
  cap('scap.memory', 'Eternal Memory', 'Essence x1e6.', 34, 35, mul('essenceGain', 1e6)),
];

function echo(id: string, name: string, desc: string, parent: string, effect: KitEffect, growth: number): KitNode {
  const p = CAPS.find((n) => n.id === parent)!;
  return { id, name, desc, group: 'echo', parents: [parent], cost: price(22), effect, color: colorOf(effect), repeat: { growth }, x: Math.round(p.x * 1.18), y: Math.round(p.y * 1.18) };
}

const ECHOES: KitNode[] = [
  echo('secho.matter', 'Matter Echo', 'Dark Matter +20% per level.', 'scap.horizon', mul('darkMatterGain', 1.2), 12),
  echo('secho.mass', 'Mass Echo', 'Black Hole mass x2 per level.', 'scap.photon', mul('massGain', 2), 10),
  echo('secho.essence', 'Essence Echo', 'Essence x3 per level.', 'scap.memory', mul('essenceGain', 3), 12),
];

const ROOT: KitNode = { id: 'score', name: 'Singular Point', desc: 'Where everything falls: Dark Matter x1.2.', group: 'root', parents: [], cost: 1, effect: mul('darkMatterGain', 1.2), color: 'mul', big: true, x: 0, y: 0 };

export const SINGULARITY_TREE: readonly KitNode[] = [ROOT, ...rings, ...CAPS, ...ECHOES];
