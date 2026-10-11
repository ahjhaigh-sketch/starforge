import { events } from './events';
import { invalidateStats, stat } from './stats';
import type { GameState } from './state';

/** Passed to every system each tick. Offline catch-up scales gains by the offline efficiency. */
export interface TickContext {
  gainScale: number;
  /** The tab was closed (offline cap and efficiency apply). */
  offline: boolean;
  /** Any simulated gap (closed tab, sleep, hidden tab): nothing that needs a click happens. */
  catchUp: boolean;
  /** Real seconds this tick covers (before game speed); set by tick(). */
  realDt?: number;
}

export const ONLINE: TickContext = { gainScale: 1, offline: false, catchUp: false };

export interface System {
  id: string;
  /** Lower runs first. Production before automation before unlock checks. */
  order: number;
  tick: (s: GameState, dt: number, ctx: TickContext) => void;
}

const systems: System[] = [];

export function registerSystem(sys: System): void {
  if (systems.some((x) => x.id === sys.id)) return;
  systems.push(sys);
  systems.sort((a, b) => a.order - b.order);
}

export function registeredSystems(): readonly System[] {
  return systems;
}

/** True when this tick crossed a 1/hz-second boundary of playtime: for checks that needn't run 20 times a second. */
export function every(s: GameState, dt: number, hz: number): boolean {
  return Math.floor(s.playtime * hz) !== Math.floor((s.playtime - dt) * hz);
}

/**
 * The only place simulated time advances. Game speed (the Black Hole, Spin) stretches every step
 * here, so a minute played and a minute away move the game the same amount.
 */
export function tick(s: GameState, dt: number, ctx: TickContext = ONLINE): void {
  if (!(dt > 0)) return;
  const c: TickContext = { ...ctx, realDt: dt };
  // stats are rebuilt at most 5 times a real second (purchases and resets rebuild them at once)
  if (upkeepDue(s, 'stats', c, 0.2)) invalidateStats();
  const g = dt * gameSpeed(s);
  s.playtime += g;
  // everything a tick does is automation: the player's own resets and purchases come through commands
  events.automated(() => {
    for (const sys of systems) sys.tick(s, g, c);
  });
}

const upkeepClock = new WeakMap<GameState, Record<string, number>>();
const savedTime = new WeakMap<GameState, Record<string, number>>();

/**
 * upkeepDue for a system that needs its game time: null on the ticks it skips (the time is saved
 * up), and on the tick it runs, all the game seconds since it last ran. Not saved: a reload loses
 * at most a fifth of a second of it.
 */
export function pacedDt(s: GameState, key: string, ctx: TickContext, dt: number, seconds: number): number | null {
  let m = savedTime.get(s);
  if (!m) savedTime.set(s, (m = {}));
  const total = (m[key] ?? 0) + dt;
  if (!upkeepDue(s, key, ctx, seconds)) {
    m[key] = total;
    return null;
  }
  m[key] = 0;
  return total;
}

/**
 * For upkeep that needn't run every tick (stat rebuilds, automation passes, rune rolls): true once
 * `seconds` of real time have passed since it last ran, and always during a catch-up, whose steps
 * are each a long stretch. Late in the game it runs 40 times as fast, so anything paced in game
 * seconds would otherwise run every tick (found by the speed budgets). Not saved: after a reload
 * everything is due at once.
 */
export function upkeepDue(s: GameState, key: string, ctx: TickContext, seconds: number): boolean {
  if (ctx.catchUp) return true;
  let m = upkeepClock.get(s);
  if (!m) upkeepClock.set(s, (m = {}));
  const t = (m[key] ?? seconds) + (ctx.realDt ?? 0);
  if (t < seconds) {
    m[key] = t;
    return false;
  }
  m[key] = 0;
  return true;
}

/** How much faster than real time the game runs (never slower). */
export function gameSpeed(s: GameState): number {
  const v = stat(s, 'gameSpeed').toNumber();
  return Number.isFinite(v) ? Math.max(1, v) : 1;
}
