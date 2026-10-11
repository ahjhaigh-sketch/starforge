import { BALANCE } from '../../content/balance';
import { SPIRE_BANNERS, SPIRE_GIMMICKS, type TrialDef, type TrialEffect } from '../../content/challenges';
import { bulkCost, type CostCurve, maxBuy, priceAt } from '../cost';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import type { GameState } from '../state';
import { defineStat, invalidateStats, registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { inTrial } from './trials';

/**
 * The Spire (Game design: "Singularity"; Tower Incremental's climb). From 3 Singularities.
 * - An endless tower: floor f has 10 x 1.15^f hit points, a formula and never a hand-made list.
 * - While you climb, you deal (1 + log10(1 + Stardust a second)) x Spire power damage a second,
 *   offline too. Floors clear in closed form, so a long absence is one calculation.
 * - Each floor is a short restricted run: while you climb it, one Trial's level-1 debuff applies
 *   (the floor number picks which), so climbing costs production. Stop climbing and it's gone.
 *   Climbing pauses during a Trial.
 * - Every floor cleared: Stardust x1.02, shards and Essence x1.01, compounding. Every tenth floor
 *   unlocks a banner to fly.
 */
const P = BALANCE.spire;
const CURVE: CostCurve = { base: P.hpBase, brackets: [{ from: 0, ratio: P.hpGrowth }] };

export const spireOpen = (s: GameState) => (s.stats.singularitiesAll ?? 0) >= P.singularities;
export const floorHp = (floor: number): Decimal => priceAt(CURVE, floor);
export const climbing = (s: GameState) => spireOpen(s) && s.spire.climbing && !inTrial(s);

/** The Trial debuff floor f plays. */
export const gimmickOf = (floor: number): TrialDef => SPIRE_GIMMICKS[floor % SPIRE_GIMMICKS.length]!;

export function spireDps(s: GameState): Decimal {
  const sps = stat(s, 'stardustPerSec');
  return D(1).add(sps.add(1).log10()).mul(stat(s, 'spirePower'));
}

export const bannersUnlocked = (s: GameState) => Math.min(SPIRE_BANNERS.length, Math.floor((s.stats.spireBest ?? 0) / 10));

/** Deals damage to the Spire: clears every floor it pays for at once, keeps the rest. */
export function damageSpire(s: GameState, amount: Decimal): number {
  if (amount.lte(0)) return 0;
  const pool = s.spire.damage.add(amount);
  const n = maxBuy(CURVE, s.spire.floor, pool);
  s.spire.damage = n > 0 ? pool.sub(bulkCost(CURVE, s.spire.floor, n)).max(0) : pool;
  if (n === 0) return 0;
  const was = bannersUnlocked(s);
  s.spire.floor += n;
  s.stats.spireBest = Math.max(s.stats.spireBest ?? 0, s.spire.floor);
  invalidateStats();
  const now = bannersUnlocked(s);
  if (now > was) {
    const b = SPIRE_BANNERS[now - 1]!;
    events.emit({ t: 'toast', title: `Spire floor ${now * 10}`, body: `New banner: ${b.name}.`, icon: 'spire', priority: true });
  }
  return n;
}

export function setClimbing(s: GameState, on: boolean): void {
  if (!spireOpen(s)) return;
  s.spire.climbing = on;
  invalidateStats();
}

export function flyBanner(s: GameState, id: string | null): boolean {
  if (id === null) {
    s.spire.banner = null;
    return true;
  }
  const i = SPIRE_BANNERS.findIndex((b) => b.id === id);
  if (i < 0 || i >= bannersUnlocked(s)) return false;
  s.spire.banner = id;
  return true;
}

export function registerSpire(): void {
  defineStat({ id: 'spirePower', label: 'Spire power', base: () => D(1) });
  for (const [statId, per] of Object.entries(P.perFloor)) {
    registerSources({ id: `spire.floors.${statId}`, stat: statId, op: 'mul', label: 'Spire floors', value: (s) => D(per).pow(s.spire.floor), active: (s) => s.spire.floor > 0 });
  }
  // the floor's debuff, one source per Trial stat and op, live only on that Trial's floors
  for (const t of SPIRE_GIMMICKS) {
    const fx = new Map<string, TrialEffect>();
    for (const e of t.debuffs(1)) fx.set(`${e.stat}|${e.op}`, e);
    for (const e of fx.values()) {
      registerSources({
        id: `spire.gimmick.${t.id}.${e.stat}.${e.op}`,
        stat: e.stat,
        op: e.op,
        label: `Spire floor: ${t.name}`,
        value: () => D(e.value),
        active: (s) => climbing(s) && gimmickOf(s.spire.floor).id === t.id,
      });
    }
  }
  registerSystem({
    id: 'spire',
    order: 64,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      if (climbing(s)) damageSpire(s, spireDps(s).mul(dt * ctx.gainScale));
    },
  });
}

