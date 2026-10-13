import { BALANCE } from '../../content/balance';
import { WEATHER_BY_ID, WEATHERS } from '../../content/weather';
import { D } from '../decimal';
import { events } from '../events';
import { nextFloat, nextRange } from '../rng';
import type { GameState } from '../state';
import { invalidateStats, registerSources } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { hurryComet } from './comets';
import { reqMet } from './unlocks';

/**
 * Space Weather (Ideas menu 7). After the first Supernova, weather rolls in every 6 to 12 minutes of
 * play time and lasts 90 to 180 seconds, one at a time. Each change happens at the play-time moment
 * it is due, not at the tick that notices it, and the weather has its own random stream, so a long
 * catch-up step and a minute of live play roll exactly the same skies. Comets caught fill the
 * Weather Beacon, which summons the weather you choose when the sky is clear.
 */
const W = BALANCE.weather;

export const weatherOpen = (s: GameState) => (s.stats.supernovasAll ?? 0) >= W.supernovas;
export const weatherKindOpen = (s: GameState, id: string) => {
  const def = WEATHER_BY_ID.get(id);
  return !!def && reqMet(s, def.req);
};

/** The weather in the sky right now, or null. */
export function weatherNow(s: GameState): string | null {
  const w = s.weather;
  return w.kind && w.until > s.playtime ? w.kind : null;
}

export const weatherLeft = (s: GameState) => (weatherNow(s) ? s.weather.until - s.playtime : 0);

const gap = (s: GameState) => nextRange(s.weather.rng, W.gapMin, W.gapMax);

/** Comets caught since they were last counted become charges (bulk-safe: counts whole 25s). */
function chargeFromComets(s: GameState): void {
  const w = s.weather;
  const comets = s.stats.comets ?? 0;
  const due = Math.floor(comets / W.cometsPerCharge) - Math.floor(w.counted / W.cometsPerCharge);
  if (due > 0) w.charges = Math.min(W.maxCharges, w.charges + due);
  w.counted = comets;
}

/** Comets caught toward the next charge (0 to 24). */
export const beaconProgress = (s: GameState) => (s.stats.comets ?? 0) % W.cometsPerCharge;

function begin(s: GameState, kind: string, at: number, seconds: number, summoned: boolean, live: boolean): void {
  const w = s.weather;
  w.kind = kind;
  w.until = at + seconds;
  w.summoned = summoned;
  s.stats.weathers = (s.stats.weathers ?? 0) + 1;
  // 1.3.0: the Almanac counts each kind
  s.stats[`weatherSeen.${kind}`] = (s.stats[`weatherSeen.${kind}`] ?? 0) + 1;
  invalidateStats();
  // still in the sky now (a long catch-up step can pass a whole weather)
  if (w.until > s.playtime) {
    if (kind === 'meteor') hurryComet(s, W.hurryComet);
    if (live) events.emit({ t: 'weather', kind, summoned });
  }
}

/** Brings the sky up to the present: ends weather that is over and starts weather that is due. */
export function advanceWeather(s: GameState, live: boolean): void {
  if (!weatherOpen(s)) return;
  chargeFromComets(s);
  const w = s.weather;
  if (w.next <= 0) w.next = s.playtime + gap(s);
  // a step of a week still holds only a few hundred weathers; the guard is never reached in play
  for (let guard = 0; guard < 4096; guard++) {
    if (w.kind) {
      if (w.until > s.playtime) return;
      const ended = w.until;
      // a natural weather sets the next one going; a summoned one leaves the natural schedule be,
      // and a natural weather that came due under it follows straight after
      w.next = w.summoned ? Math.max(w.next, ended) : ended + gap(s);
      w.kind = null;
      w.summoned = false;
      invalidateStats();
    }
    if (s.playtime < w.next) return;
    const kinds = WEATHERS.filter((k) => weatherKindOpen(s, k.id));
    const kind = kinds[Math.min(kinds.length - 1, Math.floor(nextFloat(w.rng) * kinds.length))]!;
    begin(s, kind.id, w.next, nextRange(w.rng, W.lastMin, W.lastMax), false, live);
  }
}

/** Spends a beacon charge on the weather you choose, while the sky is clear. */
export function summonWeather(s: GameState, kind: string): boolean {
  if (!weatherOpen(s)) return false;
  chargeFromComets(s);
  if (weatherNow(s) || s.weather.charges < 1 || !weatherKindOpen(s, kind)) return false;
  // a weather that ended since the last tick is cleared first, so the schedule stays right
  advanceWeather(s, true);
  if (weatherNow(s)) return false;
  s.weather.charges--;
  s.weather.spent++;
  s.stats.weatherSummoned = (s.stats.weatherSummoned ?? 0) + 1;
  begin(s, kind, s.playtime, W.summonSeconds, true, true);
  return true;
}

/** 1.3.0: times a kind of weather has rolled in, and how much stronger the Almanac makes it (0 to 0.5). */
export const weatherSeen = (s: GameState, id: string) => s.stats[`weatherSeen.${id}`] ?? 0;
export const almanacBonus = (s: GameState, id: string) => Math.min(W.almanacCap, Math.floor(weatherSeen(s, id) / W.almanacEvery) * W.almanacStep);

/** 1.3.0: the weather the beacon summons by itself (null: off). */
export function setAutoWeather(s: GameState, kind: string | null): boolean {
  if (kind !== null && !WEATHER_BY_ID.has(kind)) return false;
  s.weather.auto = kind;
  return true;
}

export function registerWeather(): void {
  registerSources(
    ...WEATHERS.flatMap((k) =>
      k.effects.map((e) => ({
        id: `weather.${k.id}.${e.stat}`,
        stat: e.stat,
        op: 'mul' as const,
        label: `${k.name} (weather)`,
        // a boost below 1 (a cost cut) shrinks further; above 1 it grows (the Almanac)
        value: (s: GameState) => D(e.value >= 1 ? 1 + (e.value - 1) * (1 + almanacBonus(s, k.id)) : e.value ** (1 + almanacBonus(s, k.id))),
        active: (s: GameState) => weatherNow(s) === k.id,
      })),
    ),
  );
  registerSystem({
    id: 'weather',
    // before the comets, so a Meteor Shower's first comet is scheduled on the tick it starts
    order: 45,
    tick: (s: GameState, _dt: number, ctx: TickContext) => {
      advanceWeather(s, !ctx.catchUp);
      // 1.3.0 auto-summon: a ready charge brings your favourite weather (not during a catch-up: it's your choice live)
      const fav = s.weather.auto;
      if (fav && !ctx.catchUp && !weatherNow(s) && s.weather.charges >= 1 && weatherKindOpen(s, fav)) summonWeather(s, fav);
    },
  });
}
