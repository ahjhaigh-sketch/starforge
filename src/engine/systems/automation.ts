import { BALANCE } from '../../content/balance';
import { autoPlanets } from './orbitals';
import type { Requirement } from '../../content/requirements';
import { buyAllNodes, TREE_SHOP_BY_ID } from './treeShop';
import { reqMet } from './unlocks';
import { ENGINES } from '../../content/engines';
import { maxBuy } from '../cost';
import { D } from '../decimal';
import { events } from '../events';
import { milestoneReached, performReset } from '../layers';
import { autoBelt } from './belt';
import { autoConstants } from './constants';
import { nebulaFlag } from './nebulaTree';
import { supernovaGain, supernovaReady } from './supernova';
import { goalMet, inTrial } from './trials';
import { automatedSpend, type GameState, usable } from '../state';
import { defineStat, stat } from '../stats';
import { registerSystem, upkeepDue } from '../tick';
import { automating } from './eternity';
import { buyEngine, engineCurve, engineRevealed, evolve, nextTierCost, owned } from './stardust';
import { availableUpgrades, buyUpgrade } from './upgrades';

/**
 * The Automation hub's auto-buyers. Each is earned from a Supernova milestone, has an on/off
 * switch and a spending limit, and acts in the normal tick, so it keeps working offline too.
 * Every chore becomes a reward: buy-max, auto-buy, then reset automation in later layers.
 */
export interface AutoBuyerDef {
  id: string;
  name: string;
  /** Supernova milestone that unlocks it (or `req`, for the tree auto-buyers). */
  milestone: string;
  kind: 'engine' | 'evolve' | 'upgrades' | 'tree' | 'planets' | 'supernova' | 'belt' | 'constants';
  /** 1.2.0: what it spends (shown in Automation), or nothing for a reset. */
  spends?: string;
  engine?: string;
  /** 1.2.0: a tree auto-buyer's tree, what earns it, and that it starts switched off. */
  tree?: string;
  req?: Requirement;
  defaultOn?: boolean;
  /** Share of the currency it spends until you change it (1: all). */
  defaultSpend?: number;
}

const U = BALANCE.automation.unlockAt;
const novas = (count: number): Requirement => ({ kind: 'count', stat: 'supernovasAll', count, noun: 'Supernova' });

const ENGINE_MILESTONE = (i: number) => (i === 0 ? 'starforge' : i <= 4 ? 'auto5' : 'autoAll');

/** Catch-up steps since the slow auto-buyers last acted (not saved). */
const slowSkip = new WeakMap<GameState, number>();

/** When each game's auto-buyers last acted, in game seconds (not saved). */
const lastRun = new WeakMap<GameState, number>();

export const AUTO_BUYERS: readonly AutoBuyerDef[] = [
  { id: 'auto.evolve', name: 'Auto-Evolve', milestone: 'autoEvolve', kind: 'evolve' },
  ...ENGINES.map((e, i): AutoBuyerDef => ({ id: `auto.${e.id}`, name: e.name, milestone: ENGINE_MILESTONE(i), kind: 'engine', engine: e.id })),
  { id: 'auto.upgrades', name: 'Upgrades', milestone: 'autoAll', kind: 'upgrades' },
  // 1.2.0: buys planets into empty slots and levels the lowest, from 5 Supernovas
  { id: 'auto.planets', name: 'Planets', milestone: '', kind: 'planets', req: novas(U.planets), defaultSpend: 0.1 },
  // 1.2.0: goes Supernova by itself as soon as it can (switch it off to save up a bigger one)
  { id: 'auto.supernova', name: 'Supernova', milestone: '', kind: 'supernova', req: novas(U.supernova), spends: '' },
  // 1.2.0: Belt upgrades and Belt Tiers
  { id: 'auto.belt', name: 'Belt upgrades', milestone: '', kind: 'belt', req: novas(U.belt), spends: 'ore' },
  // 1.2.0: every constant to its next doubling, a jump a minute
  { id: 'auto.constants', name: 'Constants', milestone: '', kind: 'constants', req: novas(U.constants), spends: 'each constant\'s currency' },
  ...(
    [
      ['novatree', novas(U.novatree)],
      ['nebulatree', { kind: 'count', stat: 'nebulasAll', count: 5, noun: 'Nebula' }],
      ['singularitytree', { kind: 'count', stat: 'singularitiesAll', count: 5, noun: 'Singularity' }],
      ['galactictree', { kind: 'count', stat: 'galacticsAll', count: 3, noun: 'Galactic Rebirth' }],
      ['scaletree', { kind: 'count', stat: 'leviathansBeaten', count: 6, noun: 'Leviathan' }],
      ['starchart', { kind: 'count', stat: 'galacticsAll', count: 5, noun: 'Galactic Rebirth' }],
    ] as const
  ).map(([tree, req]): AutoBuyerDef => ({ id: `auto.${tree}`, name: TREE_SHOP_BY_ID.get(tree)!.name, milestone: '', kind: 'tree', tree, req, defaultOn: false })),
];
const AUTO_BY_ID: ReadonlyMap<string, AutoBuyerDef> = new Map(AUTO_BUYERS.map((a) => [a.id, a]));

/** Unlocked by its Supernova milestone, or by Eternal Forge (Eternity) from the start of every run. */
export const autoUnlocked = (s: GameState, a: AutoBuyerDef) => (a.req ? reqMet(s, a.req) : milestoneReached(s, 'supernova', a.milestone) || automating(s, 'stardust'));

/** Unlocked auto-buyers start switched on, spending everything. */
export function autoSetting(s: GameState, id: string): { on: boolean; spend: number } {
  const def = AUTO_BY_ID.get(id);
  return s.auto[id] ?? { on: def?.defaultOn ?? true, spend: def?.defaultSpend ?? 1 };
}

export function setAuto(s: GameState, id: string, change: Partial<{ on: boolean; spend: number }>): void {
  const next = { ...autoSetting(s, id), ...change };
  if (!BALANCE.automation.spendChoices.includes(next.spend as 1)) next.spend = 1;
  s.auto[id] = next;
}

/**
 * Auto-buyers whose work is big (a planet or tree climb invalidates the stats) or that needn't be
 * quick: they act once a real second, not on every pass (found by the speed budgets).
 */
const SLOW_KINDS: ReadonlySet<AutoBuyerDef['kind']> = new Set(['planets', 'belt', 'tree', 'constants', 'supernova']);

/** What each auto-buyer is called where automated spending is listed. */
const sinkName = (a: AutoBuyerDef) => (a.kind === 'engine' ? `Auto-buyer: ${a.name}` : a.kind === 'tree' ? `${a.name} auto-buyer` : `Auto-${a.name.toLowerCase()}`);

/** One pass of every switched-on auto-buyer (with `slow`, the once-a-second ones too). */
export function runAutomation(s: GameState, slow = true): void {
  for (const a of AUTO_BUYERS) {
    if (!slow && SLOW_KINDS.has(a.kind)) continue;
    if (!autoUnlocked(s, a)) continue;
    const { on, spend } = autoSetting(s, a.id);
    if (!on) continue;
    // 1.3.0: automation never spends the safe tenth (see automatedSpend)
    automatedSpend(sinkName(a), () => runOne(s, a, spend));
  }
}

function runOne(s: GameState, a: AutoBuyerDef, spend: number): void {
  {
    const budget = usable(s, 'stardust').mul(spend);
    if (a.kind === 'evolve') {
      const cost = nextTierCost(s);
      if (cost && budget.gte(cost)) evolve(s);
    } else if (a.kind === 'engine' && a.engine) {
      const index = ENGINES.findIndex((e) => e.id === a.engine);
      if (!engineRevealed(s, index)) return;
      const n = maxBuy(engineCurve(a.engine), owned(s, a.engine), budget.div(stat(s, 'engineCostMult')));
      if (n > 0) buyEngine(s, a.engine, n);
    } else if (a.kind === 'planets') {
      autoPlanets(s, spend);
    } else if (a.kind === 'supernova') {
      // never cut a Trial short: wait until its goal is met (the Supernova then finishes it)
      // with the Nebula's own auto-Supernova earned, your "go at this many shards" number counts too
      const atLeast = milestoneReached(s, 'nebula', 'autoNova') && s.nebula.autoAt.gt(0) ? s.nebula.autoAt : null;
      if (supernovaReady(s) && !(inTrial(s) && !goalMet(s)) && (!atLeast || supernovaGain(s).gte(atLeast))) performReset(s, 'supernova');
    } else if (a.kind === 'belt') {
      autoBelt(s, spend);
    } else if (a.kind === 'constants') {
      autoConstants(s, spend, nebulaFlag(s, 'constantFlow') > 0);
    } else if (a.kind === 'tree' && a.tree) {
      const shop = TREE_SHOP_BY_ID.get(a.tree);
      if (shop) buyAllNodes(s, shop, spend);
    } else if (a.kind === 'upgrades') {
      for (const u of availableUpgrades(s)) {
        if (D(u.cost).gt(usable(s, 'stardust').mul(spend))) break; // cheapest first
        buyUpgrade(s, u.id);
      }
    }
  }
}

export function registerAutomation(): void {
  defineStat({ id: 'autoSpeed', label: 'Auto-buyer speed', base: () => D(1) });
  registerSystem({
    id: 'automation',
    order: 40,
    tick: (s, dt, ctx) => {
      // at most 4 times a real second; each time covers the game time since the last
      if (!upkeepDue(s, 'automation', ctx, 0.25)) return;
      const since = lastRun.get(s) ?? s.playtime - dt;
      lastRun.set(s, s.playtime);
      const hz = BALANCE.automation.perSecond * stat(s, 'autoSpeed').toNumber();
      // one pass, online and in each catch-up step: a pass buys all it can, so more in the same moment
      // buy almost nothing new but rebuild the stats again (found by the 1.2.0 speed budgets)
      const passes = Math.min(1, Math.floor(s.playtime * hz) - Math.floor(since * hz));
      // the slow auto-buyers join the pass once a real second online, and every other step of a
      // catch-up (each step is a long stretch, and they buy all they can when they act)
      let slow = false;
      if (passes > 0 && ctx.catchUp) {
        const n = (slowSkip.get(s) ?? 0) + 1;
        slow = n >= 2;
        slowSkip.set(s, slow ? 0 : n);
      } else if (passes > 0) slow = upkeepDue(s, 'automation.slow', ctx, 1);
      // automated purchases make no sound (only the player's own clicks do)
      if (passes > 0) events.automated(() => {
        for (let i = 0; i < passes; i++) runAutomation(s, slow && i === 0);
      });
    },
  });
}
