import { BALANCE } from '../../content/balance';
import { CONSTANT_BRACKETS as B, CONSTANT_BY_ID, CONSTANT_SETS, CONSTANTS, type ConstantDef } from '../../content/constants';
import { planPurchase, type PurchasePlan } from '../buy';
import type { CostCurve } from '../cost';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import { cur, type BuyAmount, type GameState, spend, usable } from '../state';
import { defineStat, registerSources } from '../stats';
import { reqMet } from './unlocks';

/**
 * The one infinite-upgrade module (CLAUDE.md rule 9). Levels are plain numbers (safe to about
 * 9e15); costs and effects are Decimals. Bulk cost and Max are closed-form per cost bracket, so a
 * million levels is a handful of calculations.
 */
const curves = new Map<string, CostCurve>();

export function constantCurve(c: ConstantDef): CostCurve {
  let curve = curves.get(c.id);
  if (!curve) {
    curve = {
      base: c.base,
      brackets: [
        { from: 0, ratio: D(c.growth).pow(B.growthPow[0]) },
        { from: B.first, ratio: D(c.growth).pow(B.growthPow[1]) },
        { from: B.second, ratio: D(c.growth).pow(B.growthPow[2]) },
      ],
    };
    curves.set(c.id, curve);
  }
  return curve;
}

export const level = (s: GameState, id: string): number => s.constants[id] ?? 0;

/** Doublings earned at a level: every 25 up to 1,000, every 100 up to 100,000, then every 1,000. */
export function doublings(L: number): number {
  const [e0, e1, e2] = B.doubleEvery;
  return Math.floor(Math.min(L, B.first) / e0) + Math.floor(Math.max(0, Math.min(L, B.second) - B.first) / e1) + Math.floor(Math.max(0, L - B.second) / e2);
}

/** The level of the next doubling above L. */
export function nextDoubling(L: number): number {
  const [e0, e1, e2] = B.doubleEvery;
  if (L < B.first) return (Math.floor(L / e0) + 1) * e0;
  if (L < B.second) return B.first + (Math.floor((L - B.first) / e1) + 1) * e1;
  return B.second + (Math.floor((L - B.second) / e2) + 1) * e2;
}

export function effectValue(a: number, doubles: boolean, L: number): Decimal {
  const v = D(1 + a * L);
  return doubles ? v.mul(D(2).pow(doublings(L))) : v;
}

export function constantSetOpen(s: GameState, setId: string): boolean {
  const set = CONSTANT_SETS.find((x) => x.id === setId);
  return !!set && reqMet(s, set.req);
}

export function constantOpen(s: GameState, c: ConstantDef): boolean {
  return constantSetOpen(s, c.set) && (!c.req || reqMet(s, c.req));
}

/** The plan for one click with the current buy amount; "next" buys up to the next doubling. */
export function constantPlan(s: GameState, c: ConstantDef, amount: BuyAmount = s.settings.buyAmount): PurchasePlan {
  const L = level(s, c.id);
  return planPurchase(constantCurve(c), L, cur(s, c.currency), amount, s.settings.customBuyAmount, D(1), nextDoubling(L));
}

export function buyConstant(s: GameState, id: string, amount?: BuyAmount, auto = false): boolean {
  const c = CONSTANT_BY_ID.get(id);
  if (!c || !constantOpen(s, c)) return false;
  const plan = constantPlan(s, c, amount);
  if (!plan.canAfford || !spend(s, c.currency, plan.cost)) return false;
  s.constants[id] = level(s, id) + plan.count;
  // your own purchase: Auto-Constants waits a while before its next step
  if (!auto) s.stats.constantsByHand = s.playtime;
  events.emit({ t: 'purchase', kind: 'constant', id, amount: plan.count });
  return true;
}

/** Seconds of play until Auto-Constants next steps (0: now). With Constant Flow (Nebula Tree) it acts every second. */
export function autoConstantsIn(s: GameState, flow = false): number {
  const every = flow ? 1 : BALANCE.automation.constantsEvery;
  const last = Math.max(s.stats.constantsAuto ?? -every, s.stats.constantsByHand ?? -every);
  return Math.max(0, last + every - s.playtime);
}

/**
 * 1.2.0 Auto-Constants: once a minute of play, steps every open constant up to its next doubling if
 * its share of that constant's currency pays for it. Not instant: a jump a minute, and it waits a
 * minute after you buy one yourself, so your own choices come first.
 */
export function autoConstants(s: GameState, share: number, flow = false): void {
  if (autoConstantsIn(s, flow) > 0) return;
  s.stats.constantsAuto = s.playtime;
  for (const c of CONSTANTS) {
    if (!constantOpen(s, c)) continue;
    const plan = constantPlan(s, c, 'next');
    if (plan.count <= 0 || plan.cost.gt(usable(s, c.currency).mul(share))) continue;
    buyConstant(s, c.id, 'next', true);
  }
}

export function registerConstants(): void {
  defineStat({ id: 'planetPower', label: 'Planet bonuses', base: () => D(1) });
  for (const c of CONSTANTS) {
    registerSources(
      ...c.effects.map((e, i) => ({
        id: `constant.${c.id}.${i}`,
        stat: e.stat,
        op: 'mul' as const,
        label: `${c.name} (constant)`,
        value: (s: GameState) => effectValue(e.a, e.doubles, level(s, c.id)),
        active: (s: GameState) => level(s, c.id) > 0,
      })),
    );
  }
}
