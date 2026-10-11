import { invalidateStats, stat } from './stats';
import type { GameState } from './state';

/** Passed to every system each tick. Offline catch-up scales gains by the offline efficiency. */
export interface TickContext {
  gainScale: number;
  /** The tab was closed (offline cap and efficiency apply). */
  offline: boolean;
  /** Any simulated gap (closed tab, sleep, hidden tab): nothing that needs a click happens. */
  catchUp: boolean;
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
  invalidateStats();
  const g = dt * gameSpeed(s);
  s.playtime += g;
  for (const sys of systems) sys.tick(s, g, ctx);
}

/** How much faster than real time the game runs (never slower). */
export function gameSpeed(s: GameState): number {
  const v = stat(s, 'gameSpeed').toNumber();
  return Number.isFinite(v) ? Math.max(1, v) : 1;
}
