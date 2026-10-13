import { BALANCE } from '../../content/balance';
import { TURRET_BY_ID, TURRETS } from '../../content/defense';
import { planLimited, type PurchasePlan } from '../buy';
import { type CostCurve, lateRamp } from '../cost';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import { cur, gain, type GameState, spend } from '../state';
import { invalidateStats, registerSources } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { type BattleResult, type BattleSetup, relativeHit, runBattle } from './defenseBattle';

/**
 * Planet Defense (Ideas menu 9). Turrets sit in twelve sockets around your planets; each kind is
 * levelled once for every socket that holds it. Fighting the next wave is instant (the panel then
 * replays the battle the engine scored). Every new best wave boosts planets and Stardust for good.
 * From wave 10, auto-defend fights on its own, online and offline, each wave taking its battle
 * time: it pushes on while it can win, and otherwise farms the best wave for alloy. A battle is a
 * pure function of its setup, so results are kept by setup and farming is closed-form.
 */
const DF = BALANCE.defense;

export const defenseOpen = (s: GameState) => (s.stats.singularitiesAll ?? 0) >= DF.singularities && (Object.keys(s.planets).length > 0 || s.unlocked.includes('defense'));

export const placedOf = (s: GameState, kind: string) => s.defense.sockets.filter((k) => k === kind).length;
export const turretLevel = (s: GameState, kind: string) => s.defense.levels[kind] ?? 0;

/** Placing one more turret of a kind (x4 for each already placed). */
export function placeCost(s: GameState, kind: string): Decimal {
  const t = TURRET_BY_ID.get(kind);
  return t ? D(t.placeCost).mul(D(DF.placeGrowth).pow(placedOf(s, kind))) : D(Infinity);
}

export function placeTurret(s: GameState, socket: number, kind: string): boolean {
  const t = TURRET_BY_ID.get(kind);
  if (!defenseOpen(s) || !t || socket < 0 || socket >= DF.sockets || s.defense.sockets[socket]) return false;
  if (!spend(s, t.alloy, placeCost(s, kind))) return false;
  s.defense.sockets[socket] = kind;
  events.emit({ t: 'purchase', kind: 'turret', id: kind, amount: 1 });
  return true;
}

/** Empties a socket and pays back what that turret cost, so moving turrets around is free. */
export function clearSocket(s: GameState, socket: number): boolean {
  const kind = s.defense.sockets[socket];
  const t = kind ? TURRET_BY_ID.get(kind) : undefined;
  if (!t) return false;
  s.defense.sockets[socket] = '';
  gain(s, t.alloy, placeCost(s, kind!));
  return true;
}

const curves = new Map<string, CostCurve>();
function levelCurve(kind: string): CostCurve {
  let c = curves.get(kind);
  if (!c) {
    c = lateRamp({ base: TURRET_BY_ID.get(kind)!.levelCost, brackets: [{ from: 0, ratio: DF.levelGrowth }] });
    curves.set(kind, c);
  }
  return c;
}

/** Levels at the buy amount (x1 to Max, closed-form). */
export const levelPlan = (s: GameState, kind: string): PurchasePlan =>
  planLimited(levelCurve(kind), turretLevel(s, kind), cur(s, TURRET_BY_ID.get(kind)!.alloy), s.settings.buyAmount, s.settings.customBuyAmount, Infinity);

export function buyTurretLevels(s: GameState, kind: string): boolean {
  const t = TURRET_BY_ID.get(kind);
  if (!defenseOpen(s) || !t) return false;
  const plan = levelPlan(s, kind);
  if (plan.count <= 0 || !plan.canAfford || !spend(s, t.alloy, plan.cost)) return false;
  s.defense.levels[kind] = turretLevel(s, kind) + plan.count;
  events.emit({ t: 'purchase', kind: 'turretLevel', id: kind, amount: plan.count });
  return true;
}

/** The battle a wave would be, with the turrets as they stand. */
export function battleSetup(s: GameState, wave: number): BattleSetup {
  const hit: Record<string, number> = {};
  for (const t of TURRETS) if (s.defense.sockets.includes(t.id)) hit[t.id] = relativeHit(t.damage, turretLevel(s, t.id), wave);
  return { wave, seed: (s.defense.seed ^ Math.imul(wave + 1, 0x9e3779b1)) >>> 0, sockets: s.defense.sockets.slice(), hit };
}

/** Results by setup: a battle is a pure function of it, so it never needs fighting twice. */
const results = new Map<string, BattleResult>();
const setupKey = (b: BattleSetup) => `${b.seed}|${b.wave}|${b.sockets.join(',')}|${TURRETS.map((t) => b.hit[t.id] ?? 0).join(',')}`;

export function battleResult(setup: BattleSetup): BattleResult {
  const key = setupKey(setup);
  let r = results.get(key);
  if (!r) {
    r = runBattle(setup);
    if (results.size >= 256) results.delete(results.keys().next().value!);
    results.set(key, r);
  }
  return r;
}

/** The turrets and their levels: auto-defend retries a lost wave only once this changes. */
export const loadoutKey = (s: GameState) => `${s.defense.sockets.join(',')}|${TURRETS.map((t) => turretLevel(s, t.id)).join(',')}`;
const armed = (s: GameState) => s.defense.sockets.some((k) => !!k);

function newBest(s: GameState, wave: number): void {
  s.defense.best = wave;
  s.stats.defenseBest = Math.max(s.stats.defenseBest ?? 0, wave);
  s.defense.lost = '';
  invalidateStats();
  events.emit({ t: 'milestone', id: `defense.${wave}` });
}

/** Alloy for one repeat win at a wave: each grade your turrets use. */
export function winAlloy(s: GameState, wave: number): Array<{ alloy: string; amount: Decimal }> {
  const amount = D(DF.alloyBase).mul(D(DF.alloyGrowth).pow(wave)).floor();
  const grades = new Set(s.defense.sockets.filter((k) => !!k).map((k) => TURRET_BY_ID.get(k)!.alloy));
  return [...grades].map((alloy) => ({ alloy, amount }));
}

/**
 * Fights the next wave now. A win is a new best; a loss costs nothing (retry once you're stronger).
 * Returns the setup (for the replay) and the result, or null if there's nothing to fight with.
 */
export function fightWave(s: GameState): { setup: BattleSetup; result: BattleResult } | null {
  if (!defenseOpen(s) || !armed(s)) return null;
  const setup = battleSetup(s, s.defense.best + 1);
  const result = battleResult(setup);
  s.stats.defenseFights = (s.stats.defenseFights ?? 0) + 1;
  if (result.win) newBest(s, setup.wave);
  return { setup, result };
}

export const autoOpen = (s: GameState) => s.defense.best >= DF.autoFrom;

export function setDefenseAuto(s: GameState, on: boolean): void {
  s.defense.auto = on && autoOpen(s);
  if (!s.defense.auto) s.defense.acc = 0;
}

/**
 * Auto-defend: time spent fighting buys waves. While the next wave can be won with this loadout it
 * fights that (each new best one battle at a time); once it can't, it farms the best wave, many wins
 * in one sum, until the turrets change.
 */
export function advanceDefense(s: GameState, dt: number, gainScale: number): void {
  const d = s.defense;
  if (!d.auto || !autoOpen(s) || !armed(s) || !defenseOpen(s)) return;
  d.acc += dt;
  const key = loadoutKey(s);
  // a handful of new waves per tick at most; the time carries over
  for (let guard = 0; guard < 16; guard++) {
    const pushing = d.lost !== key;
    const wave = pushing ? d.best + 1 : d.best;
    const r = battleResult(battleSetup(s, wave));
    if (d.acc < r.seconds) return;
    d.wave = wave;
    if (pushing) {
      d.acc -= r.seconds;
      if (r.win) newBest(s, wave);
      else d.lost = key;
      continue;
    }
    // farming: every whole battle that fits, at once
    const n = Math.floor(d.acc / r.seconds);
    d.acc -= n * r.seconds;
    if (r.win) {
      for (const g of winAlloy(s, wave)) gain(s, g.alloy, g.amount.mul(n).mul(gainScale));
      s.stats.defenseWins = (s.stats.defenseWins ?? 0) + n;
    }
    return;
  }
}

export function registerDefense(): void {
  registerSources(
    { id: 'defense.planets', stat: 'planetPower', op: 'mul', label: 'Planet Defense', value: (s) => D(1 + DF.planetPerBest * s.defense.best), active: (s) => s.defense.best > 0 },
    { id: 'defense.stardust', stat: 'productionMult', op: 'mul', label: 'Planet Defense', value: (s) => D(1 + DF.stardustPerBest * s.defense.best), active: (s) => s.defense.best > 0 },
  );
  registerSystem({
    id: 'defense',
    order: 37,
    tick: (s: GameState, dt: number, ctx: TickContext) => advanceDefense(s, dt, ctx.gainScale),
  });
}
