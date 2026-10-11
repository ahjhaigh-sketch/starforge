import { BALANCE } from '../../content/balance';
import { BIOME_BY_ID, COLONY_NAMES, COLONY_TYPE_BY_ID, COLONY_TYPES, HEXES, planetScore, RESEARCH_BY_ID, type BuildingId } from '../../content/galaxyBuild';
import { D, type Decimal, ZERO } from '../decimal';
import { events } from '../events';
import { type Colony, cur, gain, type GameState, spend } from '../state';
import { defineStat, invalidateStats, registerSources, stat, type StatSource } from '../stats';
import { registerSystem, type TickContext } from '../tick';

/**
 * Colonies and Terraforming (Game design: "Colonies", "Terraforming"). From 2 Galactic Rebirths.
 * - Found colonies with Galaxy Cores (one more slot per galaxy explored, up to 8). Each is a planet
 *   type that boosts one stat by x(1 + log10(1 + people))^power.
 * - People grow logistically towards the colony's capacity. The tick uses the exact solution,
 *   P(t) = K / (1 + (K / P0 - 1) e^(-rt)), so any step size, an hour away in one step or 72,000
 *   steps online, ends at the same population.
 * - Colonies make Supply (0.001 a person a second x factories x trade routes), which buys
 *   buildings, spaceports, research and terraforming.
 * - Terraforming (after the Terraformers research): fill a planet's 19 hexes with biomes;
 *   neighbouring biomes score together; finishing locks the score in as a permanent multiplier.
 * Colonies belong to no reset layer, so nothing resets them.
 */
const B = BALANCE.galaxyBuild;

export const coloniesOpen = (s: GameState) => (s.stats.galacticsAll ?? 0) >= B.colonyGalactics;
export const colonySlots = (s: GameState) => Math.min(B.maxColonies, 1 + s.galactic.cleared.length);
export const hasResearch = (s: GameState, id: string) => s.colonies.research.includes(id);
export const terraOpen = (s: GameState) => hasResearch(s, 'res.terra');

export const foundCost = (s: GameState): Decimal => D(B.foundCost).mul(D(B.foundGrowth).pow(s.colonies.list.length));

export function foundColony(s: GameState, type: string): boolean {
  if (!coloniesOpen(s) || s.colonies.list.length >= colonySlots(s) || !COLONY_TYPE_BY_ID.has(type)) return false;
  if (!spend(s, 'galaxyCores', foundCost(s))) return false;
  const n = s.colonies.list.length;
  s.colonies.list.push({ type, name: COLONY_NAMES[n % COLONY_NAMES.length]!, pop: B.startPop, housing: 0, farms: 0, factories: 0, port: false, grid: new Array<string | null>(HEXES.length).fill(null), finished: null });
  s.stats.coloniesFounded = s.colonies.list.length;
  invalidateStats();
  events.emit({ t: 'toast', title: `${s.colonies.list[n]!.name} founded`, body: `A new ${COLONY_TYPE_BY_ID.get(type)!.name.toLowerCase()}.`, icon: 'colony' });
  return true;
}

// ---------- growth and Supply ----------

export function capacity(s: GameState, c: Colony): number {
  return B.baseCapacity * B.housingMult ** c.housing * stat(s, 'colonyCapacity').toNumber() * (hasResearch(s, 'res.arco') ? 10 : 1);
}

export function growthRate(s: GameState, c: Colony): number {
  return B.baseGrowth * B.farmsMult ** c.farms * (hasResearch(s, 'res.hydro') ? 2 : 1);
}

/** Logistic growth over dt seconds, exactly (the same for one long step or many short ones). */
export function growPop(pop: number, K: number, r: number, dt: number): number {
  if (!(pop > 0) || !(K > 0)) return 0;
  if (!(dt > 0) || !(r > 0)) return pop;
  return K / (1 + (K / pop - 1) * Math.exp(-r * dt));
}

export const routesOf = (s: GameState, i: number) => s.colonies.routes.filter(([a, b]) => a === i || b === i).length;
const routeMult = (s: GameState) => 1 + (B.routeMult - 1) * (hasResearch(s, 'res.customs') ? 2 : 1);

export function supplyRate(s: GameState, i: number): Decimal {
  const c = s.colonies.list[i];
  if (!c) return ZERO;
  return D(c.pop * B.supplyPer * B.factoriesMult ** c.factories).mul(D(routeMult(s)).pow(routesOf(s, i)));
}

export function totalSupplyRate(s: GameState): Decimal {
  let t = ZERO;
  for (let i = 0; i < s.colonies.list.length; i++) t = t.add(supplyRate(s, i));
  return t;
}

/** What a colony's people give its stat: x(1 + log10(1 + people))^power. */
export function colonyBonus(s: GameState, c: Colony): Decimal {
  const t = COLONY_TYPE_BY_ID.get(c.type)!;
  return D(1 + Math.log10(1 + c.pop)).pow(t.power * (hasResearch(s, 'res.genetics') ? 1.25 : 1));
}

// ---------- buildings, ports, routes, research ----------

export function buildingCost(c: Colony, id: BuildingId): Decimal {
  const [base, growth] = B.buildingCosts[id]!;
  return D(base).mul(D(growth).pow(c[id]));
}

export function buyBuilding(s: GameState, i: number, id: BuildingId): boolean {
  const c = s.colonies.list[i];
  if (!c || !spend(s, 'supply', buildingCost(c, id))) return false;
  c[id] += 1;
  invalidateStats();
  return true;
}

export function buyPort(s: GameState, i: number): boolean {
  const c = s.colonies.list[i];
  if (!c || c.port || !spend(s, 'supply', D(B.portCost))) return false;
  c.port = true;
  return true;
}

export const maxRoutes = (s: GameState) => 1 + Math.floor(s.colonies.list.length / 2) + (hasResearch(s, 'res.warp') ? 2 : 0);

export function openRoute(s: GameState, a: number, b: number): boolean {
  const ca = s.colonies.list[a];
  const cb = s.colonies.list[b];
  if (!ca || !cb || a === b || !ca.port || !cb.port || s.colonies.routes.length >= maxRoutes(s)) return false;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  if (s.colonies.routes.some(([x, y]) => x === lo && y === hi)) return false;
  s.colonies.routes.push([lo, hi]);
  s.stats.tradeRoutes = s.colonies.routes.length;
  return true;
}

export function closeRoute(s: GameState, index: number): void {
  if (index >= 0 && index < s.colonies.routes.length) s.colonies.routes.splice(index, 1);
}

export function buyResearch(s: GameState, id: string): boolean {
  const r = RESEARCH_BY_ID.get(id);
  if (!r || !coloniesOpen(s) || hasResearch(s, id) || !spend(s, 'supply', D(r.cost))) return false;
  s.colonies.research.push(id);
  invalidateStats();
  events.emit({ t: 'toast', title: `Research: ${r.name}`, body: r.desc, icon: 'colony' });
  return true;
}

// ---------- terraforming ----------

export function placeBiome(s: GameState, i: number, hex: number, biome: string): boolean {
  const c = s.colonies.list[i];
  if (!c || !terraOpen(s) || c.finished !== null || hex < 0 || hex >= HEXES.length || !BIOME_BY_ID.has(biome) || c.grid[hex] === biome) return false;
  if (!spend(s, 'supply', D(B.biomeCost))) return false;
  c.grid[hex] = biome;
  return true;
}

export function finishPlanet(s: GameState, i: number): boolean {
  const c = s.colonies.list[i];
  if (!c || !terraOpen(s) || c.finished !== null || c.grid.some((x) => !x)) return false;
  c.finished = planetScore(c.grid);
  s.stats.planetsFinished = s.colonies.list.filter((x) => x.finished !== null).length;
  invalidateStats();
  events.emit({ t: 'toast', title: `${c.name} terraformed`, body: `Score ${c.finished}: x${(1 + Math.max(0, c.finished) * B.finishPer).toFixed(1)} ${COLONY_TYPE_BY_ID.get(c.type)!.what}, for good.`, icon: 'colony', priority: true });
  return true;
}

export const finishedMult = (c: Colony): number => 1 + Math.max(0, c.finished ?? 0) * B.finishPer;

export function registerColonies(): void {
  defineStat({ id: 'colonyCapacity', label: 'Colony capacity', base: () => D(1) });
  // a source per colony slot and planet type (a source's stat is fixed, a colony's type is not)
  const sources: StatSource[] = [];
  for (let i = 0; i < B.maxColonies; i++) {
    for (const t of COLONY_TYPES) {
      const here = (s: GameState) => s.colonies.list[i]?.type === t.id;
      sources.push(
        { id: `colony.${i}.${t.id}`, stat: t.stat, op: 'mul', label: `Colony ${i + 1} (${t.name})`, value: (s) => colonyBonus(s, s.colonies.list[i]!), active: here },
        { id: `planet.${i}.${t.id}`, stat: t.stat, op: 'mul', label: `Terraformed planet ${i + 1} (${t.name})`, value: (s) => D(finishedMult(s.colonies.list[i]!)), active: (s) => here(s) && s.colonies.list[i]!.finished !== null },
      );
    }
  }
  registerSources(...sources);
  registerSystem({
    id: 'colonies',
    order: 67,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      if (s.colonies.list.length === 0) return;
      // Supply from the people as they were at the start of the step, then they grow (time passes fully offline)
      const supply = totalSupplyRate(s);
      if (supply.gt(0)) gain(s, 'supply', supply.mul(dt * ctx.gainScale));
      let best = s.stats.colonyPopBest ?? 0;
      for (const c of s.colonies.list) {
        c.pop = growPop(c.pop, capacity(s, c), growthRate(s, c), dt);
        if (c.pop > best) best = Math.floor(c.pop);
      }
      s.stats.colonyPopBest = best;
    },
  });
}

export const supply = (s: GameState) => cur(s, 'supply');
