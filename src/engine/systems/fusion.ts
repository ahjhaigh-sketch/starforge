import { BALANCE } from '../../content/balance';
import { planLimited, type PurchasePlan } from '../buy';
import type { CostCurve } from '../cost';
import { D } from '../decimal';
import { events } from '../events';
import { cur, type GameState, spend } from '../state';
import { registerSources } from '../stats';
import { registerSystem, type TickContext } from '../tick';

/**
 * Comet Fusion: a merge board. A comet arrives every few seconds; three of the same level fuse into
 * one of the next level, always exactly three. Your best level ever multiplies Stardust, taps and
 * comet strength. The board, its upgrades and the best level are kept through Supernova.
 */
const F = BALANCE.fusion;

export type FusionUpgradeId = 'speed' | 'start' | 'size';

export const fusionOpen = (s: GameState) => (s.stats.supernovas ?? 0) >= F.supernovas || s.unlocked.includes('fusion');
export const fusionLevel = (s: GameState, id: FusionUpgradeId) => s.fusion.upgrades[id] ?? 0;
export const boardSide = (s: GameState) => Math.min(F.maxSize, F.baseSize + fusionLevel(s, 'size'));
export const spawnLevel = (s: GameState) => 1 + fusionLevel(s, 'start');
export const spawnEvery = (s: GameState) => F.spawnSeconds / F.speedPerLevel ** fusionLevel(s, 'speed');

const curves = new Map<string, CostCurve>();
export function fusionCurve(id: FusionUpgradeId): CostCurve {
  let c = curves.get(id);
  if (!c) {
    const u = F.upgrades[id];
    c = { base: u.base, brackets: [{ from: 0, ratio: u.growth }] };
    curves.set(id, c);
  }
  return c;
}

const fusionLimit = (id: FusionUpgradeId) => (id === 'size' ? F.maxSize - F.baseSize : id === 'start' ? F.maxStart : Infinity);

export function fusionPlan(s: GameState, id: FusionUpgradeId): PurchasePlan {
  return planLimited(fusionCurve(id), fusionLevel(s, id), cur(s, 'shards'), s.settings.buyAmount, s.settings.customBuyAmount, fusionLimit(id));
}

/** Lays the comets onto a board of the current size, in order (a bigger board keeps every comet). */
function resize(s: GameState): void {
  const n = boardSide(s) ** 2;
  if (s.fusion.board.length === n) return;
  const comets = s.fusion.board.filter((x) => x > 0);
  s.fusion.board = Array.from({ length: n }, (_, i) => comets[i] ?? 0);
}

export function buyFusionUpgrade(s: GameState, id: FusionUpgradeId): boolean {
  if (!fusionOpen(s)) return false;
  const plan = fusionPlan(s, id);
  if (plan.count <= 0 || !plan.canAfford || !spend(s, 'shards', plan.cost)) return false;
  s.fusion.upgrades[id] = fusionLevel(s, id) + plan.count;
  resize(s);
  events.emit({ t: 'purchase', kind: 'fusion', id, amount: plan.count });
  return true;
}

export function buyAutoFuse(s: GameState): boolean {
  if (!fusionOpen(s) || s.fusion.autoOwned || !spend(s, 'shards', D(F.autoCost))) return false;
  s.fusion.autoOwned = true;
  s.fusion.autoOn = true;
  events.emit({ t: 'purchase', kind: 'fusion', id: 'auto', amount: 1 });
  return true;
}

function noteBest(s: GameState, level: number): void {
  if (level > s.fusion.best) {
    s.fusion.best = level;
    s.stats.fusionBest = level;
    events.emit({ t: 'milestone', id: `fusion.${level}` });
  }
}

/**
 * Fuses the comet at \`from\` into the one at \`to\`: both must have the same level, and a third comet
 * of that level must be on the board. Exactly those three become one comet of the next level, at \`to\`.
 */
export function fuse(s: GameState, from: number, to: number): boolean {
  const b = s.fusion.board;
  const level = b[to] ?? 0;
  if (from === to || level <= 0 || b[from] !== level) return false;
  const third = b.findIndex((x, i) => x === level && i !== from && i !== to);
  if (third < 0) return false;
  b[from] = 0;
  b[third] = 0;
  b[to] = level + 1;
  s.stats.fusions = (s.stats.fusions ?? 0) + 1;
  noteBest(s, level + 1);
  return true;
}

/** Auto-fuse: lowest levels first, into the earliest cell of that level. */
export function autoFuse(s: GameState): number {
  let n = 0;
  for (let guard = 0; guard < 200; guard++) {
    const counts = new Map<number, number[]>();
    s.fusion.board.forEach((x, i) => x > 0 && counts.set(x, [...(counts.get(x) ?? []), i]));
    const level = [...counts.keys()].sort((a, b) => a - b).find((l) => counts.get(l)!.length >= 3);
    if (level === undefined) break;
    const cells = counts.get(level)!;
    if (!fuse(s, cells[1]!, cells[0]!)) break;
    n++;
  }
  return n;
}

/** Comets arrive in empty cells, spread around the board rather than filling it in order. */
function spawn(s: GameState): boolean {
  const b = s.fusion.board;
  const start = (s.fusion.spawned * 7) % b.length;
  for (let k = 0; k < b.length; k++) {
    const i = (start + k) % b.length;
    if (b[i] === 0) {
      b[i] = spawnLevel(s);
      s.fusion.spawned++;
      noteBest(s, b[i]!);
      return true;
    }
  }
  return false;
}

/** x1.25 a level of the best comet ever fused. */
export const fusionMult = (s: GameState) => D(F.perLevel).pow(s.fusion.best);

export function registerFusion(): void {
  registerSources(
    { id: 'fusion.prod', stat: 'productionMult', op: 'mul', label: 'Comet Fusion (best level)', value: fusionMult, active: (s) => s.fusion.best > 0 },
    { id: 'fusion.tap', stat: 'tapPower', op: 'mul', label: 'Comet Fusion (best level)', value: fusionMult, active: (s) => s.fusion.best > 0 },
    { id: 'fusion.frenzy', stat: 'frenzyMult', op: 'mul', label: 'Comet Fusion', value: (s) => D(1 + F.cometStrength * s.fusion.best), active: (s) => s.fusion.best > 0 },
    { id: 'fusion.lucky', stat: 'luckyMult', op: 'mul', label: 'Comet Fusion', value: (s) => D(1 + F.cometStrength * s.fusion.best), active: (s) => s.fusion.best > 0 },
  );
  registerSystem({
    id: 'fusion',
    order: 34,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      if (!fusionOpen(s)) return;
      resize(s);
      s.fusion.acc += (dt * ctx.gainScale) / spawnEvery(s);
      // (a tolerance: 240 ticks of 0.05 s add up to 0.9999... in floating point)
      while (s.fusion.acc >= 1 - 1e-9) {
        if (!spawn(s)) {
          // a full board doesn't bank comets
          s.fusion.acc = Math.min(s.fusion.acc, 1);
          if (!(s.fusion.autoOwned && s.fusion.autoOn && autoFuse(s) > 0)) break;
          continue;
        }
        s.fusion.acc = Math.max(0, s.fusion.acc - 1);
      }
      if (s.fusion.autoOwned && s.fusion.autoOn) autoFuse(s);
    },
  });
}
