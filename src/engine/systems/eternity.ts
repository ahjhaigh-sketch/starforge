import { BALANCE } from '../../content/balance';
import { CONSTANTS } from '../../content/constants';
import { type AutoLayer, ETERNITY_BY_ID, ETERNITY_UPGRADES, type EternityUpgrade } from '../../content/crunch';
import { BUILDINGS, MEGASTRUCTURES, RESEARCH } from '../../content/galaxyBuild';
import { GALAXIES } from '../../content/galactic';
import { ANTIMATTER_ENGINES, MIRROR_UPGRADES } from '../../content/mirror';
import { NEBULA_TREE } from '../../content/nebulaTree';
import { NOVA_TREE } from '../../content/novaTree';
import { SHRINES } from '../../content/runes';
import { planPurchase } from '../buy';
import { maxBuy } from '../cost';
import { D, type Decimal, ZERO } from '../decimal';
import { events } from '../events';
import { milestoneReached, onAnyReset, performReset } from '../layers';
import { cur, type GameState, spend } from '../state';
import { invalidateStats, registerSources, stat } from '../stats';
import { registerSystem, type TickContext, upkeepDue } from '../tick';
import type { Tree } from '../treeKit';
import { bhOpen, bhStage, reactorOpen, setDustShare } from './blackhole';
import { buildingCost, buyBuilding, buyPort, buyResearch, coloniesOpen, hasResearch, maxRoutes, openRoute } from './colonies';
import { constantCurve, constantOpen, level, nextDoubling } from './constants';
import { galacticGain, galacticReady, galacticTree, galaxyAvailable, galaxyCleared, galaxyMapOpen, setNextGalaxy } from './galactic';
import { buildStage } from './megastructures';
import { buyMirrorUpgrade, collapse, MIRROR_ENGINES, mirrorOpen } from './mirror';
import { buyNebulaNode, canBuyNebulaNode, nebulaNodeCost } from './nebulaTree';
import { nebulaGain, nebulaReady } from './nebula';
import { buyNode, canBuyNode, nodeCost } from './novaTree';
import { setShrine, shrineOpen, shrineState } from './runes';
import { buyKey, keyOnSale, singularityGain, singularityReady, singularityTree } from './singularity';
import { supernovaGain, supernovaReady } from './supernova';
import { goalMet as trialGoalMet, inTrial } from './trials';

/**
 * Eternity (Game design: "Big Crunch"): upgrades bought with Chronons. Five of them automate a
 * whole earlier layer each (its reset, its tree, its constants and its side systems); the rest are
 * boosts. Every automated layer has a switch and a rule for when it resets:
 * - "double": once the reset would at least double what this run has gathered of its currency, or
 *   once the run's gain per second starts to fall (waiting longer would only slow you down); and
 *   as soon as it is ready once the layer's reset is free (its "resets nothing" milestone one layer
 *   up). Passive income can make a run's total dwarf any one reset, so a free layer must not wait;
 * - "amount": once the reset gives at least a number you set.
 * Automation acts once a game second (at most 4 times a real second) and never cuts an unfinished Trial short. It spends freely on
 * one-off tree nodes and builds, but at most a tenth of a currency on anything that repeats
 * forever (repeating nodes, constants), so your own purchases always have room.
 */
const ET = BALANCE.eternity;

export interface EternityAuto {
  on: boolean;
  mode: 'double' | 'amount';
  at: Decimal;
}

export const eternityOpen = (s: GameState) => (s.stats.crunchesAll ?? 0) >= 1;
export const hasEternity = (s: GameState, id: string) => s.eternity.upgrades.includes(id);

export function canBuyEternity(s: GameState, u: EternityUpgrade): boolean {
  return eternityOpen(s) && !hasEternity(s, u.id) && cur(s, 'chronons').gte(u.cost);
}

export function buyEternity(s: GameState, id: string): boolean {
  const u = ETERNITY_BY_ID.get(id);
  if (!u || !canBuyEternity(s, u) || !spend(s, 'chronons', D(u.cost))) return false;
  s.eternity.upgrades.push(id);
  s.stats.eternityUpgrades = s.eternity.upgrades.length;
  invalidateStats();
  events.emit({ t: 'purchase', kind: 'eternity', id, amount: 1 });
  return true;
}

/** A layer's automation switch and rule (switched on, "double", until you change it). */
export function eternityAuto(s: GameState, layer: AutoLayer): EternityAuto {
  return s.eternity.auto[layer] ?? { on: true, mode: 'double', at: ZERO };
}

export function setEternityAuto(s: GameState, layer: AutoLayer, patch: Partial<EternityAuto>): void {
  const next = { ...eternityAuto(s, layer), ...patch };
  if (next.mode !== 'double' && next.mode !== 'amount') next.mode = 'double';
  if (!next.at.gte(0)) next.at = ZERO;
  s.eternity.auto[layer] = next;
}

const UPGRADE_FOR: Record<AutoLayer, string> = { stardust: 'et.forge', supernova: 'et.nova', nebula: 'et.mist', singularity: 'et.void', galactic: 'et.galaxy' };

/** Whether Eternity is automating this layer right now (owned and switched on). */
export const automating = (s: GameState, layer: AutoLayer) => hasEternity(s, UPGRADE_FOR[layer]) && eternityAuto(s, layer).on;

/** The layers whose reset starts a run of each layer (its own and every higher one). */
const RESET_ORDER = ['supernova', 'nebula', 'singularity', 'galactic', 'crunch', 'multiverse'];

/** The best gain a second each layer's current run has shown (not saved: relearned after a reload). */
const bestRates = new WeakMap<GameState, Map<string, { since: number; rate: Decimal }>>();

/**
 * Whether this run's gain per second has started to fall (below 90% of its best, after the first
 * few seconds): waiting longer would only slow you down. Without it, passive income that grows the
 * run total as fast as the gain (passive shards, trickles) could keep "double" waiting for ever.
 */
export function gainPeaked(s: GameState, layer: string, gain: Decimal): boolean {
  const since = Math.max(...RESET_ORDER.slice(Math.max(0, RESET_ORDER.indexOf(layer))).map((l) => s.lastResetAt[l] ?? 0));
  const secs = s.playtime - since;
  let runs = bestRates.get(s);
  if (!runs) bestRates.set(s, (runs = new Map()));
  let best = runs.get(layer);
  if (!best || best.since !== since) runs.set(layer, (best = { since, rate: ZERO }));
  const rate = gain.div(Math.max(1, secs));
  if (rate.gt(best.rate)) best.rate = rate;
  return secs >= ET.peakAfter && rate.lt(best.rate.mul(ET.peakShare));
}

/** A layer whose reset resets nothing (the milestone one layer up): waiting would gain nothing. */
const FREE: Partial<Record<AutoLayer, (s: GameState) => boolean>> = {
  supernova: (s) => milestoneReached(s, 'nebula', 'novaFree'),
  nebula: (s) => milestoneReached(s, 'singularity', 'nebulaFree'),
  singularity: (s) => milestoneReached(s, 'galactic', 'singularityFree'),
  galactic: (s) => milestoneReached(s, 'crunch', 'galacticFree'),
};
export const resetIsFree = (s: GameState, layer: AutoLayer): boolean => FREE[layer]?.(s) ?? false;

/** Whether the layer's rule says to reset now, given the gain and the run total of its currency. */
export function ruleSaysGo(s: GameState, layer: AutoLayer, gain: Decimal, currency: string): boolean {
  if (gain.lt(1)) return false;
  const a = eternityAuto(s, layer);
  if (a.mode === 'amount') return gain.gte(a.at);
  if (resetIsFree(s, layer)) return true;
  const peaked = gainPeaked(s, layer, gain);
  return peaked || gain.gte(s.totals.run[currency] ?? ZERO);
}

// ---------- spending helpers ----------

/** A tenth (by default) of each currency, fixed at the start of a pass so one pass can't drain it. */
type Budget = Map<string, Decimal>;
const budgetOf = (s: GameState, b: Budget, currency: string): Decimal => {
  let v = b.get(currency);
  if (!v) {
    v = cur(s, currency).mul(ET.constantShare);
    b.set(currency, v);
  }
  return v;
};

function buyConstantsOf(s: GameState, set: string, b: Budget): void {
  for (const c of CONSTANTS) {
    if (c.set !== set || !constantOpen(s, c)) continue;
    const money = budgetOf(s, b, c.currency);
    const L = level(s, c.id);
    const plan = planPurchase(constantCurve(c), L, money, 'max', 0, D(1), nextDoubling(L));
    if (!plan.canAfford || !spend(s, c.currency, plan.cost)) continue;
    s.constants[c.id] = L + plan.count;
    b.set(c.currency, money.sub(plan.cost));
    events.emit({ t: 'purchase', kind: 'constant', id: c.id, amount: plan.count });
  }
}

interface TreeOps<N> {
  nodes: readonly N[];
  repeats: (n: N) => boolean;
  canBuy: (n: N) => boolean;
  cost: (n: N) => Decimal;
  buy: (n: N) => boolean;
  currency: string;
}

/** Repeating levels one pass may buy (their prices climb, so a pass rarely needs more). */
const REPEATS_PER_PASS = 40;

/**
 * One-off nodes first, cheapest first, with everything; then repeating nodes from the budget,
 * cheapest level first. Each round looks at the tree once (buying a node can open its children,
 * so there are a few rounds), and repeats only look at the repeating nodes: picking one node at a
 * time from the whole tree cost the late game 8 ms a tick (found by the speed budgets).
 */
function buyTree<N>(s: GameState, t: TreeOps<N>, b: Budget): void {
  for (let round = 0; round < 8; round++) {
    const open = t.nodes
      .filter((n) => !t.repeats(n) && t.canBuy(n))
      .map((n) => ({ n, c: t.cost(n) }))
      .sort((x, y) => x.c.cmp(y.c));
    let bought = 0;
    for (const { n } of open) if (t.canBuy(n) && t.buy(n)) bought++;
    if (bought === 0) break;
  }
  const repeats = t.nodes.filter((n) => t.repeats(n));
  for (let i = 0; i < REPEATS_PER_PASS; i++) {
    const budget = budgetOf(s, b, t.currency);
    let pick: N | undefined;
    let pickCost: Decimal | undefined;
    for (const n of repeats) {
      if (!t.canBuy(n)) continue;
      const c = t.cost(n);
      if (c.lte(budget) && (!pickCost || c.lt(pickCost))) {
        pick = n;
        pickCost = c;
      }
    }
    if (!pick || !t.buy(pick)) return;
    b.set(t.currency, budget.sub(pickCost!));
  }
}

const kitTree = (s: GameState, tree: Tree): TreeOps<Tree['def']['nodes'][number]> => ({
  nodes: tree.def.nodes,
  repeats: (n) => !!n.repeat,
  canBuy: (n) => tree.canBuy(s, n),
  cost: (n) => tree.cost(s, n),
  buy: (n) => tree.buy(s, n.id),
  currency: tree.def.currency,
});

const blocked = (s: GameState) => inTrial(s) && !trialGoalMet(s);

// ---------- one layer at a time ----------

function autoGalactic(s: GameState, b: Budget): void {
  // the next galaxy: yours if you haven't explored it yet, otherwise the first one you haven't
  if (galaxyMapOpen(s) && galaxyCleared(s, s.galactic.next)) {
    const next = GALAXIES.find((g) => !galaxyCleared(s, g.id) && galaxyAvailable(s, g.id));
    if (next) setNextGalaxy(s, next.id);
  }
  // go once the galaxy you're in is explored (a Galactic Rebirth would lose its goal's progress), or once you've picked
  // somewhere else to go next (a goal out of reach for now); before the first one you aren't in a galaxy yet, and with
  // nothing left to explore there's nothing to wait for
  const leaving = s.galactic.next !== s.galactic.galaxy;
  const explored =
    (s.stats.galacticsAll ?? 0) === 0 || leaving || galaxyCleared(s, s.galactic.galaxy) || GALAXIES.every((g) => galaxyCleared(s, g.id) || !galaxyAvailable(s, g.id));
  if (explored && galacticReady(s) && !blocked(s) && ruleSaysGo(s, 'galactic', galacticGain(s), 'galaxyCores')) performReset(s, 'galactic');
  buyConstantsOf(s, 'galactic', b);
  buyTree(s, kitTree(s, galacticTree), b);
  for (const m of MEGASTRUCTURES) while (buildStage(s, m.id));
  if (coloniesOpen(s)) {
    const supply = cur(s, 'supply');
    for (const r of RESEARCH) if (!hasResearch(s, r.id) && D(r.cost).lte(supply.mul(0.5))) buyResearch(s, r.id);
    s.colonies.list.forEach((c, i) => {
      for (const { id } of BUILDINGS) for (let k = 0; k < 10 && buildingCost(c, id).lte(cur(s, 'supply').mul(0.25)); k++) buyBuilding(s, i, id);
      if (!c.port && cur(s, 'supply').gte(BALANCE.galaxyBuild.portCost * 2)) buyPort(s, i);
    });
    for (let a = 0; a < s.colonies.list.length && s.colonies.routes.length < maxRoutes(s); a++) {
      for (let c = a + 1; c < s.colonies.list.length; c++) openRoute(s, a, c);
    }
  }
}

function autoSingularity(s: GameState, b: Budget): void {
  if (keyOnSale(s) && !s.singularity.key) buyKey(s);
  if (singularityReady(s) && !blocked(s) && ruleSaysGo(s, 'singularity', singularityGain(s), 'darkMatter')) performReset(s, 'singularity');
  buyConstantsOf(s, 'void', b);
  buyTree(s, kitTree(s, singularityTree), b);
  // the Black Hole needs all 8 stages for a Galactic Rebirth: feed it a fifth of Stardust if you left it at none
  if (bhOpen(s) && bhStage(s) < 8 && s.blackHole.dustShare <= 0) setDustShare(s, 0.2);
  // the Mirror: collapse and buy upgrades first, then the costliest engines Antimatter covers
  if (mirrorOpen(s)) {
    while (collapse(s));
    for (const u of MIRROR_UPGRADES) buyMirrorUpgrade(s, u.id);
    for (let k = ANTIMATTER_ENGINES.length - 1; k >= 0; k--) {
      const e = ANTIMATTER_ENGINES[k]!;
      if (!MIRROR_ENGINES.revealed(s, k)) continue;
      const n = maxBuy(MIRROR_ENGINES.curve(e.id), MIRROR_ENGINES.owned(s, e.id), cur(s, 'antimatter').div(stat(s, 'amCostMult')));
      if (n > 0) MIRROR_ENGINES.buy(s, e.id, n);
    }
  }
}

function autoNebula(s: GameState, b: Budget): void {
  if (nebulaReady(s) && !blocked(s) && ruleSaysGo(s, 'nebula', nebulaGain(s), 'essence')) performReset(s, 'nebula');
  buyConstantsOf(s, 'nebula', b);
  buyTree(s, { nodes: NEBULA_TREE, repeats: (n) => !!n.repeat, canBuy: (n) => canBuyNebulaNode(s, n), cost: (n) => nebulaNodeCost(s, n), buy: (n) => buyNebulaNode(s, n.id), currency: 'essence' }, b);
  // a shrine you've never rolled at starts auto-rolling (never the Eternal Shrine: Chronons buy Eternity)
  for (const sh of SHRINES) {
    if (sh.id === 'eternal' || !shrineOpen(s, sh)) continue;
    const st = shrineState(s, sh.id);
    if (!st.auto && st.rolled.lte(0)) setShrine(s, sh.id, { auto: true });
  }
}

function autoSupernova(s: GameState, b: Budget): void {
  if (supernovaReady(s) && !blocked(s) && ruleSaysGo(s, 'supernova', supernovaGain(s), 'shards')) performReset(s, 'supernova');
  buyConstantsOf(s, 'nova', b);
  buyTree(s, { nodes: NOVA_TREE, repeats: (n) => !!n.repeat, canBuy: (n) => canBuyNode(s, n), cost: (n) => nodeCost(s, n), buy: (n) => buyNode(s, n.id), currency: 'shards' }, b);
}

/** One pass of every automated layer, highest first (a higher reset makes lower ones moot). */
export function runEternity(s: GameState): void {
  const b: Budget = new Map();
  events.automated(() => {
    if (automating(s, 'galactic')) autoGalactic(s, b);
    if (automating(s, 'singularity')) autoSingularity(s, b);
    if (automating(s, 'nebula')) autoNebula(s, b);
    if (automating(s, 'supernova')) autoSupernova(s, b);
    if (automating(s, 'stardust')) buyConstantsOf(s, 'stellar', b);
  });
}

/** When each game last had an automation pass, in game seconds (not saved). */
const lastPass = new WeakMap<GameState, number>();

export function registerEternity(): void {
  registerSources(
    ...ETERNITY_UPGRADES.filter((u) => u.effect).map((u) => ({
      id: `eternity.${u.id}`,
      stat: u.effect!.stat,
      op: u.effect!.op,
      label: `${u.name} (Eternity)`,
      value: () => D(u.effect!.value),
      active: (s: GameState) => hasEternity(s, u.id),
    })),
  );
  // Eternal Void: a tenth of each Singularity's Dark Matter charges the Reactor
  onAnyReset((s, layerId, before) => {
    if (layerId !== 'singularity' || !automating(s, 'singularity') || !reactorOpen(s) || before.gained.lte(0)) return;
    const feed = before.gained.mul(0.1).floor().min(cur(s, 'darkMatter'));
    if (feed.gte(1) && spend(s, 'darkMatter', feed)) s.reactor.charge = s.reactor.charge.add(feed);
  });
  registerSystem({
    id: 'eternity',
    order: 69,
    tick: (s: GameState, _dt: number, ctx: TickContext) => {
      // the real-time check first, so it counts every tick (behind the game-second check it fell behind)
      if (s.eternity.upgrades.length === 0 || !upkeepDue(s, 'eternity', ctx, 0.25) || s.playtime - (lastPass.get(s) ?? -Infinity) < ET.every) return;
      lastPass.set(s, s.playtime);
      runEternity(s);
    },
  });
}
