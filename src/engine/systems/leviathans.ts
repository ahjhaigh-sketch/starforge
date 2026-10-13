import { BALANCE } from '../../content/balance';
import { LEVIATHANS, SCALE_TREE } from '../../content/challenges';
import { bulkCost, type CostCurve, maxBuy, priceAt } from '../cost';
import { D, type Decimal, ZERO } from '../decimal';
import { events } from '../events';
import { gain, type GameState } from '../state';
import { defineStat, invalidateStats, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { makeTree } from '../treeKit';
import { tapRules, tapValue } from './stardust';

/**
 * The Void Leviathans (Game design: "Singularity"; Clicker Heroes' bosses). From 4 Singularities.
 * - 12 Leviathans in order. Leviathan k has 1,000 x 6^k hit points, x2.5 for each time you've
 *   beaten it, so farming one gets slower and the next one is the better hunt.
 * - While you fight, damage comes from three places, all x Leviathan damage:
 *   output (1 + log10(1 + Stardust a second))^2 a second, every Wyrm on the team 25 a second,
 *   and each tap (1 + log10(1 + tap value))^2.
 * - A kill pays 5 x 2^k scales x scale gain (x10 for the first kill, 1.3.0); the first kill of each one opens the next. Kills are
 *   counted in closed form, so a long absence is one calculation.
 * - Scales buy the Scale Tree (made with the one tree engine, like the Singularity Tree).
 */
const L = BALANCE.leviathans;

export const leviathansOpen = (s: GameState) => (s.stats.singularitiesAll ?? 0) >= L.singularities;
export const killsOf = (s: GameState, k: number): number => s.leviathans.kills[LEVIATHANS[k]?.id ?? ''] ?? 0;
/** Leviathans you may fight: every one you've beaten, and the next. */
export function leviathansUnlocked(s: GameState): number {
  const next = LEVIATHANS.findIndex((_, k) => killsOf(s, k) === 0);
  return next < 0 ? LEVIATHANS.length : next + 1;
}

const curveOf = (k: number): CostCurve => ({ base: D(L.hpBase).mul(D(L.hpPerBoss).pow(k)), brackets: [{ from: 0, ratio: L.hpPerKill }] });
export const leviathanHp = (s: GameState, k: number): Decimal => priceAt(curveOf(k), killsOf(s, k));
export const scalesFor = (s: GameState, k: number): Decimal => D(L.scalesBase).mul(D(L.scalesGrowth).pow(k)).mul(stat(s, 'scaleGain'));

export const scaleTree = makeTree({
  id: 'scaleTree',
  label: 'Scale Tree',
  currency: 'scales',
  nodes: SCALE_TREE,
  levels: (s) => s.scaleTree,
  open: leviathansOpen,
});

export const fighting = (s: GameState) => leviathansOpen(s) && s.leviathans.fighting;

/** Damage a second from output and the Wyrm team. */
export function leviathanDps(s: GameState): Decimal {
  const out = D(1).add(stat(s, 'stardustPerSec').add(1).log10()).pow(L.outputPow);
  const wyrms = D(L.perWyrm * s.wyrms.team.length);
  return out.add(wyrms).mul(stat(s, 'leviathanDamage'));
}

export function tapDamage(s: GameState): Decimal {
  return D(1).add(tapValue(s).add(1).log10()).pow(L.tapPow).mul(stat(s, 'leviathanDamage'));
}

/** Deals damage to the current Leviathan: every kill it pays for at once. Returns the kills. */
export function damageLeviathan(s: GameState, amount: Decimal): number {
  if (!leviathansOpen(s) || amount.lte(0)) return 0;
  const k = Math.min(s.leviathans.current, leviathansUnlocked(s) - 1);
  const curve = curveOf(k);
  const pool = s.leviathans.damage.add(amount);
  const owned = killsOf(s, k);
  const n = maxBuy(curve, owned, pool);
  if (n === 0) {
    s.leviathans.damage = pool;
    return 0;
  }
  const L0 = LEVIATHANS[k]!;
  const first = owned === 0;
  s.leviathans.kills[L0.id] = owned + n;
  s.leviathans.damage = first ? ZERO : pool.sub(bulkCost(curve, owned, n)).max(0);
  // 1.3.0: the first kill of each pays x10 scales, so the Scale Tree gets going
  gain(s, 'scales', scalesFor(s, k).mul(first ? n - 1 + L.firstKillMult : n));
  s.stats.leviathanKills = (s.stats.leviathanKills ?? 0) + n;
  s.stats.leviathansBeaten = Math.max(s.stats.leviathansBeaten ?? 0, k + 1);
  invalidateStats();
  if (first) {
    // the first kill opens the next Leviathan, and the hunt moves on to it
    if (k + 1 < LEVIATHANS.length) s.leviathans.current = k + 1;
    events.emit({ t: 'toast', title: `${L0.name} beaten`, body: k + 1 < LEVIATHANS.length ? `${LEVIATHANS[k + 1]!.name} rises from the deep.` : 'Every Leviathan has fallen.', icon: 'leviathan', priority: true });
  }
  return n;
}

export function setFighting(s: GameState, on: boolean): void {
  if (leviathansOpen(s)) s.leviathans.fighting = on;
}

export function chooseLeviathan(s: GameState, k: number): boolean {
  if (!leviathansOpen(s) || k < 0 || k >= leviathansUnlocked(s) || k === s.leviathans.current) return false;
  s.leviathans.current = k;
  s.leviathans.damage = ZERO;
  return true;
}

export function registerLeviathans(): void {
  defineStat({ id: 'leviathanDamage', label: 'Leviathan damage', base: () => D(1) });
  defineStat({ id: 'scaleGain', label: 'Scale gain', base: () => D(1) });
  scaleTree.register();
  // a tap strikes the Leviathan too, and changes nothing about the tap itself
  tapRules.hooks.push((s) => {
    if (fighting(s)) damageLeviathan(s, tapDamage(s));
    return { mult: 1 };
  });
  registerSystem({
    id: 'leviathans',
    order: 65,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      if (fighting(s)) damageLeviathan(s, leviathanDps(s).mul(dt * ctx.gainScale));
    },
  });
}
