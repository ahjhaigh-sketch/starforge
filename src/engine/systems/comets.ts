import { BALANCE } from '../../content/balance';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import { nextFloat } from '../rng';
import { cur, gain, type GameState } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';

/**
 * Comets: a random event every 60 to 120 s (divided by the comet rate), never a gate. Catch one
 * for Frenzy (x7 production), Lucky (a chunk of Stardust), Tapstorm (x50 taps) or a rare Wish
 * (engines half price). Buffs store the playtime second they end, so offline catch-up and live
 * play agree. Different buffs multiply; catching the same one again refreshes it.
 */
export type CometKind = 'frenzy' | 'lucky' | 'tapstorm' | 'wish';
export const BUFF_KINDS = ['frenzy', 'tapstorm', 'wish'] as const;
export type BuffKind = (typeof BUFF_KINDS)[number];

export function buffActive(s: GameState, kind: BuffKind): boolean {
  return (s.buffs[kind] ?? 0) > s.playtime;
}

export function buffLeft(s: GameState, kind: BuffKind): number {
  return Math.max(0, (s.buffs[kind] ?? 0) - s.playtime);
}

function nextGap(s: GameState): number {
  const c = BALANCE.comets;
  return (c.minGap + nextFloat(s.rng) * (c.maxGap - c.minGap)) / Math.max(0.01, stat(s, 'cometRate').toNumber());
}

/** True while a comet is on screen and can be caught. */
export function cometOnScreen(s: GameState): boolean {
  return s.comet.until > s.playtime;
}

/** Picks the kind with the seeded generator: Wish has its own chance, the rest share what's left. */
export function rollCometKind(s: GameState): CometKind {
  const o = BALANCE.comets.odds;
  const wish = Math.min(0.5, stat(s, 'wishChance').toNumber());
  const r = nextFloat(s.rng);
  if (r < wish) return 'wish';
  const rest = (r - wish) / (1 - wish);
  const total = o.frenzy + o.lucky + o.tapstorm;
  if (rest < o.frenzy / total) return 'frenzy';
  if (rest < (o.frenzy + o.lucky) / total) return 'lucky';
  return 'tapstorm';
}

/** What a Lucky comet gives right now. */
export function luckyAmount(s: GameState): Decimal {
  const l = BALANCE.comets.lucky;
  const byShare = cur(s, 'stardust').mul(l.share);
  const byTime = stat(s, 'stardustPerSec').mul(l.maxSeconds);
  const floor = stat(s, 'tapPower').mul(l.minTaps);
  return (byShare.lt(byTime) ? byShare : byTime).max(floor).mul(stat(s, 'luckyMult'));
}

export interface CatchResult {
  kind: CometKind;
  amount?: Decimal;
  seconds?: number;
}

export function catchComet(s: GameState): CatchResult | null {
  if (!cometOnScreen(s)) return null;
  s.comet.until = 0;
  s.stats.comets = (s.stats.comets ?? 0) + 1;
  const kind = rollCometKind(s);
  const c = BALANCE.comets;
  const dur = stat(s, 'buffDuration').toNumber();
  let result: CatchResult;
  if (kind === 'lucky') {
    const amount = luckyAmount(s);
    gain(s, 'stardust', amount);
    result = { kind, amount };
  } else {
    const seconds = c[kind].seconds * dur;
    s.buffs[kind] = s.playtime + seconds;
    result = { kind, seconds };
  }
  events.emit({ t: 'comet', kind });
  return result;
}

export function registerComets(): void {
  const c = BALANCE.comets;
  defineStat({ id: 'cometRate', label: 'Comet rate', base: () => D(1) });
  defineStat({ id: 'buffDuration', label: 'Comet buff length', base: () => D(1) });
  defineStat({ id: 'luckyMult', label: 'Lucky comet size', base: () => D(1) });
  defineStat({ id: 'wishChance', label: 'Wish comet chance', base: () => D(0.01) });
  registerSources(
    { id: 'buff.frenzy', stat: 'productionMult', op: 'mul', label: 'Frenzy comet', value: () => D(c.frenzy.mult), active: (s) => buffActive(s, 'frenzy') },
    { id: 'buff.tapstorm', stat: 'tapPower', op: 'mul', label: 'Tapstorm comet', value: () => D(c.tapstorm.mult), active: (s) => buffActive(s, 'tapstorm') },
    { id: 'buff.wish', stat: 'engineCostMult', op: 'mul', label: 'Wish comet', value: () => D(c.wish.costMult), active: (s) => buffActive(s, 'wish') },
  );
  registerSystem({
    id: 'comets',
    order: 50,
    tick: (s: GameState, _dt: number, ctx: TickContext) => {
      // expired buffs are dropped so the save stays small
      for (const k of BUFF_KINDS) if (s.buffs[k] !== undefined && !buffActive(s, k)) delete s.buffs[k];
      if (s.tier < c.tier || s.playtime < s.comet.nextAt) return;
      s.comet.nextAt = s.playtime + nextGap(s);
      // Comets need a click, so none appear during any catch-up; the schedule just moves on.
      if (ctx.catchUp) return;
      s.comet.until = s.playtime + c.flight;
      events.emit({ t: 'comet', kind: 'spawn' });
    },
  });
}
