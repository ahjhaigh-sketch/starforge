import { BALANCE } from '../content/balance';
import { BIOMES, BUILDINGS, COLONY_TYPE_BY_ID, COLONY_TYPES, CURRENCY_LABEL, HEX_EDGES, HEXES, MEGASTRUCTURES, pairValue, planetScore, RESEARCH } from '../content/galaxyBuild';
import { D } from '../engine/decimal';
import { cur } from '../engine/state';
import { buildingCost, capacity, colonyBonus, colonySlots, coloniesOpen, finishedMult, foundCost, growthRate, hasResearch, maxRoutes, routesOf, supplyRate, terraOpen, totalSupplyRate } from '../engine/systems/colonies';
import { canBuildStage, megaCost, megaOpen, megaReward, megaStage, STAGES } from '../engine/systems/megastructures';
import { format, formatMult, formatRate } from '../ui/format';
import { game } from './game';

/** Read-outs for Megastructures, Colonies and Terraforming. */
const n = () => game.state.settings.notation;
const B = BALANCE.galaxyBuild;

export interface MegaCard {
  id: string;
  name: string;
  color: string;
  desc: string;
  open: boolean;
  needs: number;
  stage: number;
  stages: number;
  reward: string;
  now: string;
  cost: Array<{ label: string; amount: string; have: boolean }>;
  can: boolean;
}

export function megaReport(): MegaCard[] {
  const s = game.state;
  return MEGASTRUCTURES.map((m) => {
    const cost = megaCost(s, m);
    const k = megaStage(s, m.id);
    return {
      id: m.id,
      name: m.name,
      color: m.color,
      desc: m.desc,
      open: megaOpen(s, m),
      needs: m.galactics,
      stage: k,
      stages: STAGES,
      reward: `${m.rewardText} a stage`,
      now: k > 0 ? (m.reward.op === 'add' ? `+${Math.round(megaReward(s, m).toNumber() * 100)}%` : formatMult(megaReward(s, m), n())) : '',
      cost: (cost ?? []).map((c) => ({ label: CURRENCY_LABEL[c.currency] ?? c.currency, amount: format(c.amount, n()), have: cur(s, c.currency).gte(c.amount) })),
      can: canBuildStage(s, m),
    };
  });
}

export interface ColonyCard {
  i: number;
  name: string;
  type: string;
  color: string;
  pop: string;
  cap: string;
  pct: number;
  growth: string;
  supply: string;
  bonus: string;
  what: string;
  routes: number;
  port: boolean;
  portCost: string;
  canPort: boolean;
  buildings: Array<{ id: 'housing' | 'farms' | 'factories'; name: string; desc: string; level: number; cost: string; can: boolean }>;
  finished: string;
}

export interface ColoniesReport {
  open: boolean;
  supply: string;
  supplyRate: string;
  slots: number;
  used: number;
  foundCost: string;
  canFound: boolean;
  types: Array<{ id: string; name: string; color: string; what: string }>;
  colonies: ColonyCard[];
  routes: Array<{ index: number; label: string }>;
  maxRoutes: number;
  research: Array<{ id: string; name: string; desc: string; cost: string; owned: boolean; can: boolean }>;
}

export function coloniesReport(): ColoniesReport {
  const s = game.state;
  const money = cur(s, 'supply');
  const fc = foundCost(s);
  const list = s.colonies.list;
  return {
    open: coloniesOpen(s),
    supply: format(money, n()),
    supplyRate: formatRate(totalSupplyRate(s), n()),
    slots: colonySlots(s),
    used: list.length,
    foundCost: format(fc, n()),
    canFound: coloniesOpen(s) && list.length < colonySlots(s) && cur(s, 'galaxyCores').gte(fc),
    types: COLONY_TYPES.map((t) => ({ id: t.id, name: t.name, color: t.color, what: t.what })),
    colonies: list.map((c, i): ColonyCard => {
      const t = COLONY_TYPE_BY_ID.get(c.type)!;
      const K = capacity(s, c);
      const r = growthRate(s, c);
      return {
        i,
        name: c.name,
        type: t.name,
        color: t.color,
        pop: format(c.pop, n()),
        cap: format(K, n()),
        pct: Math.floor(Math.min(1, c.pop / K) * 100),
        growth: formatRate(D(r * c.pop * Math.max(0, 1 - c.pop / K)), n()),
        supply: formatRate(supplyRate(s, i), n()),
        bonus: formatMult(colonyBonus(s, c), n()),
        what: t.what,
        routes: routesOf(s, i),
        port: c.port,
        portCost: format(B.portCost, n()),
        canPort: !c.port && money.gte(B.portCost),
        buildings: BUILDINGS.map((b) => ({ id: b.id, name: b.name, desc: b.desc, level: c[b.id], cost: format(buildingCost(c, b.id), n()), can: money.gte(buildingCost(c, b.id)) })),
        finished: c.finished !== null ? `Terraformed: score ${c.finished}, ${t.what} x${finishedMult(c).toFixed(1)}` : '',
      };
    }),
    routes: s.colonies.routes.map(([a, b], index) => ({ index, label: `${list[a]?.name ?? '?'} and ${list[b]?.name ?? '?'}` })),
    maxRoutes: maxRoutes(s),
    research: RESEARCH.map((r) => ({ id: r.id, name: r.name, desc: r.desc, cost: format(r.cost, n()), owned: hasResearch(s, r.id), can: !hasResearch(s, r.id) && money.gte(r.cost) })),
  };
}

export interface TerraformReport {
  open: boolean;
  colonies: Array<{ i: number; name: string; finished: boolean }>;
  biomes: Array<{ id: string; name: string; color: string }>;
  /** For the planet picked. */
  name: string;
  type: string;
  grid: Array<{ i: number; q: number; r: number; biome: string | null; color: string }>;
  edges: Array<{ a: number; b: number; value: number }>;
  score: number;
  filled: number;
  total: number;
  finished: number | null;
  mult: string;
  what: string;
  cost: string;
  supply: string;
  canFinish: boolean;
  pairs: Array<{ a: string; b: string; value: number }>;
}

export function terraformReport(pick: number): TerraformReport {
  const s = game.state;
  const c = s.colonies.list[pick];
  const t = c ? COLONY_TYPE_BY_ID.get(c.type) : undefined;
  const grid = c?.grid ?? new Array<string | null>(HEXES.length).fill(null);
  const score = planetScore(grid);
  const color = (b: string | null) => BIOMES.find((x) => x.id === b)?.color ?? '';
  return {
    open: terraOpen(s),
    colonies: s.colonies.list.map((x, i) => ({ i, name: x.name, finished: x.finished !== null })),
    biomes: BIOMES.map((b) => ({ id: b.id, name: b.name, color: b.color })),
    name: c?.name ?? '',
    type: t?.name ?? '',
    grid: HEXES.map((h, i) => ({ i, q: h.q, r: h.r, biome: grid[i] ?? null, color: color(grid[i] ?? null) })),
    edges: HEX_EDGES.map(([a, b]) => ({ a, b, value: grid[a] && grid[b] ? pairValue(grid[a]!, grid[b]!) : 0 })),
    score,
    filled: grid.filter(Boolean).length,
    total: HEXES.length,
    finished: c?.finished ?? null,
    mult: `x${(1 + Math.max(0, c?.finished ?? score) * B.finishPer).toFixed(1)}`,
    what: t?.what ?? '',
    cost: format(B.biomeCost, n()),
    supply: format(cur(s, 'supply'), n()),
    canFinish: !!c && c.finished === null && grid.every(Boolean),
    pairs: BIOMES.flatMap((a, i) => BIOMES.slice(i).map((b) => ({ a: a.name, b: b.name, value: pairValue(a.id, b.id) }))).filter((p) => p.value !== 0),
  };
}
