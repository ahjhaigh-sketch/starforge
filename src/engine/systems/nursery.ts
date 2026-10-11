import { BALANCE } from '../../content/balance';
import { BASE_SEEDS, crossOf, NURSERY_UPGRADES, STAGES, STAR_BY_ID, type StarSpecies } from '../../content/nursery';
import { planFlat, planLimited, type FlatPlan, type PurchasePlan } from '../buy';
import type { CostCurve } from '../cost';
import { D, type Decimal } from '../decimal';
import { drawHits } from '../odds';
import { cur, gain, type GameState, spend } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { recordMutation, rollMutations } from './mutations';

/**
 * The Star Nursery (Game design: "More mid systems"). From 4 Nebulas: plant star seeds in nebula
 * plots; they ripen through five stages (seconds to minutes, faster with upgrades) and a harvest
 * gives Essence and the seed back, with a 50% chance of one more. Two seeds cross into a third,
 * exactly as the crossbreed table says. With Tending, ripe stars harvest and replant themselves,
 * offline too, and one long step gives what many short ones would.
 */
const N = BALANCE.nursery;

export const nurseryOpen = (s: GameState) => (s.stats.nebulasAll ?? 0) >= N.nebulas;
export const nurseryLevel = (s: GameState, id: string) => s.nursery.upgrades[id] ?? 0;
export const plotCount = (s: GameState) => Math.min(N.maxPlots, N.plots + nurseryLevel(s, 'plots'));
export const seedsOf = (s: GameState, id: string) => s.nursery.seeds[id] ?? 0;

/** Keeps one entry per plot you own. */
export function ensurePlots(s: GameState): void {
  while (s.nursery.plots.length < plotCount(s)) s.nursery.plots.push({ species: null, t: 0 });
}

export const growSeconds = (s: GameState, sp: StarSpecies) => sp.grow / Math.max(0.01, stat(s, 'nurseryGrowth').toNumber());

/** 0 to 1 for each plot; 1 is ripe. */
export function plotProgress(s: GameState, i: number): number {
  const p = s.nursery.plots[i];
  const sp = p?.species ? STAR_BY_ID.get(p.species) : undefined;
  // t counts growth (seconds at x1), so growth upgrades make it climb faster
  return p && sp ? Math.min(1, p.t / sp.grow) : 0;
}

export const stageOf = (progress: number) => STAGES[Math.min(STAGES.length - 1, Math.floor(progress * (STAGES.length - 1)))]!;

function curveOf(id: string): CostCurve {
  const [base, growth] = N.upgrades[id]!;
  return { base, brackets: [{ from: 0, ratio: growth }] };
}

export function upgradePlan(s: GameState, id: string): PurchasePlan {
  const def = NURSERY_UPGRADES.find((u) => u.id === id)!;
  return planLimited(curveOf(id), nurseryLevel(s, id), cur(s, 'essence'), s.settings.buyAmount, s.settings.customBuyAmount, def.max);
}

export function buyNurseryUpgrade(s: GameState, id: string): boolean {
  if (!nurseryOpen(s) || !NURSERY_UPGRADES.some((u) => u.id === id)) return false;
  const plan = upgradePlan(s, id);
  if (!plan.canAfford || plan.count < 1 || !spend(s, 'essence', plan.cost)) return false;
  s.nursery.upgrades[id] = nurseryLevel(s, id) + plan.count;
  ensurePlots(s);
  return true;
}

export const seedPlan = (s: GameState): FlatPlan => planFlat(D(N.seedPrice), cur(s, 'essence'), s.settings.buyAmount, s.settings.customBuyAmount);

/** Base seeds are for sale; every other species comes from crossbreeding. */
export function buySeeds(s: GameState, id: string): boolean {
  if (!nurseryOpen(s) || !BASE_SEEDS.includes(id)) return false;
  const plan = seedPlan(s);
  if (!plan.canAfford || !spend(s, 'essence', plan.cost)) return false;
  s.nursery.seeds[id] = seedsOf(s, id) + Math.min(1e9, plan.count.toNumber());
  return true;
}

export function plant(s: GameState, plot: number, id: string): boolean {
  ensurePlots(s);
  const p = s.nursery.plots[plot];
  if (!nurseryOpen(s) || !p || p.species || !STAR_BY_ID.has(id) || seedsOf(s, id) < 1) return false;
  s.nursery.seeds[id] = seedsOf(s, id) - 1;
  p.species = id;
  p.t = 0;
  return true;
}

/** Gives `times` harvests of a species: Essence, seeds and maybe mutations. Returns the Essence. */
function reap(s: GameState, sp: StarSpecies, times: number, scale: number): Decimal {
  const n = D(times);
  let essence = n.mul(sp.value);
  // mutated harvests are worth their mutation's size
  for (const { mut, k } of rollMutations(s, n)) {
    essence = essence.add(k.mul(sp.value * (mut.mult - 1)));
    recordMutation(s, 'nursery', sp.id, mut.id, k.toNumber());
  }
  essence = essence.mul(stat(s, 'nurseryYield')).mul(scale);
  gain(s, 'essence', essence);
  const extra = drawHits(s.nursery.rng, n, Math.log10(N.extraSeed), BALANCE.runes.poissonBelow).toNumber();
  s.nursery.seeds[sp.id] = seedsOf(s, sp.id) + times + extra;
  if (!s.nursery.found.includes(sp.id)) {
    s.nursery.found.push(sp.id);
    s.stats.speciesGrown = s.nursery.found.length;
  }
  s.stats.nurseryHarvests = (s.stats.nurseryHarvests ?? 0) + times;
  return essence;
}

/** Pulls up a growing star to plant something else: the seed comes back, the growth doesn't. */
export function uprootPlot(s: GameState, plot: number): boolean {
  const p = s.nursery.plots[plot];
  if (!p || !p.species) return false;
  s.nursery.seeds[p.species] = seedsOf(s, p.species) + 1;
  p.species = null;
  p.t = 0;
  return true;
}

/** Harvests a ripe plot by hand: Essence, the seed back and maybe one more. */
export function harvestPlot(s: GameState, plot: number): Decimal | null {
  const p = s.nursery.plots[plot];
  const sp = p?.species ? STAR_BY_ID.get(p.species) : undefined;
  if (!p || !sp || plotProgress(s, plot) < 1) return null;
  p.species = null;
  p.t = 0;
  return reap(s, sp, 1, 1);
}

export function crossCost(child: string): Decimal {
  return D(N.crossBase).mul(D(10).pow(STAR_BY_ID.get(child)?.tier ?? 1));
}

/** Two different seeds cross into the species the table names; the table is the only rule. */
export function crossbreed(s: GameState, a: string, b: string): string | null {
  const child = crossOf(a, b);
  if (!nurseryOpen(s) || !child || a === b || seedsOf(s, a) < 1 || seedsOf(s, b) < 1) return null;
  if (!spend(s, 'essence', crossCost(child))) return null;
  s.nursery.seeds[a] = seedsOf(s, a) - 1;
  s.nursery.seeds[b] = seedsOf(s, b) - 1;
  s.nursery.seeds[child] = seedsOf(s, child) + 1;
  s.stats.crossbreeds = (s.stats.crossbreeds ?? 0) + 1;
  return child;
}

export function registerNursery(): void {
  defineStat({ id: 'nurseryGrowth', label: 'Nursery growth speed', base: () => D(1) });
  defineStat({ id: 'nurseryYield', label: 'Nursery yield', base: () => D(1) });
  const [, , growthEach] = N.upgrades.growth!;
  const [, , yieldEach] = N.upgrades.yield!;
  registerSources(
    { id: 'nursery.growth', stat: 'nurseryGrowth', op: 'mul', label: 'Warm clouds', value: (s) => D(growthEach).pow(nurseryLevel(s, 'growth')), active: (s) => nurseryLevel(s, 'growth') > 0 },
    { id: 'nursery.yield', stat: 'nurseryYield', op: 'mul', label: 'Rich dust', value: (s) => D(yieldEach).pow(nurseryLevel(s, 'yield')), active: (s) => nurseryLevel(s, 'yield') > 0 },
  );
  registerSystem({
    id: 'nursery',
    order: 43,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      if (!nurseryOpen(s)) return;
      ensurePlots(s);
      const speed = stat(s, 'nurseryGrowth').toNumber();
      const tending = nurseryLevel(s, 'tending') > 0;
      for (const p of s.nursery.plots) {
        const sp = p.species ? STAR_BY_ID.get(p.species) : undefined;
        if (!sp) continue;
        p.t += dt * speed;
        if (p.t < sp.grow) continue;
        if (!tending) {
          p.t = sp.grow;
          continue;
        }
        // every ripening in this step at once: harvest, replant with the seed it gave back
        const times = Math.floor(p.t / sp.grow);
        p.t -= times * sp.grow;
        reap(s, sp, times, ctx.gainScale);
        s.nursery.seeds[sp.id] = seedsOf(s, sp.id) - times;
      }
    },
  });
}
