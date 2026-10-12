import { BALANCE } from '../content/balance';
import { WEATHERS } from '../content/weather';
import { reqText } from '../engine/systems/unlocks';
import { beaconProgress, weatherKindOpen, weatherLeft, weatherNow, weatherOpen } from '../engine/systems/weather';
import { formatTime } from '../ui/format';
import { game } from './game';

/** Read-outs for Space Weather. */
const W = BALANCE.weather;

export interface WeatherKindRow {
  id: string;
  name: string;
  desc: string;
  color: string;
  open: boolean;
  req: string;
  canSummon: boolean;
}

export function weatherReport(): {
  open: boolean;
  req: string;
  now: { name: string; desc: string; color: string; left: string; summoned: boolean } | null;
  /** Time until the next natural weather ('' while one is in the sky or none is scheduled). */
  next: string;
  charges: number;
  maxCharges: number;
  /** Comets caught toward the next charge, and how many a charge takes. */
  progress: number;
  perCharge: number;
  summonFor: string;
  kinds: WeatherKindRow[];
} {
  const s = game.state;
  const sky = weatherNow(s);
  const def = sky ? WEATHERS.find((k) => k.id === sky) : undefined;
  const clear = !sky;
  return {
    open: weatherOpen(s),
    req: `the first Supernova`,
    now: def ? { name: def.name, desc: def.desc, color: def.color, left: formatTime(weatherLeft(s)), summoned: s.weather.summoned } : null,
    next: clear && s.weather.next > s.playtime ? formatTime(s.weather.next - s.playtime) : '',
    charges: s.weather.charges,
    maxCharges: W.maxCharges,
    progress: beaconProgress(s),
    perCharge: W.cometsPerCharge,
    summonFor: formatTime(W.summonSeconds),
    kinds: WEATHERS.map((k) => {
      const open = weatherKindOpen(s, k.id);
      return { id: k.id, name: k.name, desc: k.desc, color: k.color, open, req: reqText(k.req), canSummon: open && clear && s.weather.charges >= 1 };
    }),
  };
}
