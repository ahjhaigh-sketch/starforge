import { ENGINE_BY_ID } from '../../content/engines';
import type { Requirement } from '../../content/requirements';
import { SYSTEMS } from '../../content/systems';
import { TIERS, tierCost } from '../../content/tiers';
import { D } from '../decimal';
import { events } from '../events';
import { cur, type GameState } from '../state';
import { stat } from '../stats';
import { every, registerSystem } from '../tick';
import { plural } from '../words';

/** Amounts that span many orders of magnitude fill their ring on a log scale. */
function logShare(have: number, need: number): number {
  if (have >= need) return 1;
  if (have <= 0) return 0;
  return Math.min(0.999, Math.log10(1 + have) / Math.log10(1 + need));
}

/** How far along a requirement is, 0 to 1. Always an amount the player earns, never a clock. */
export function reqProgress(s: GameState, req: Requirement): number {
  switch (req.kind) {
    case 'none':
      return 1;
    case 'tier': {
      if (s.tier >= req.tier) return 1;
      // Whole tiers done plus the share of the next tier's price already in the bank.
      const next = Math.min(1, cur(s, 'stardust').div(tierCost(s.tier + 1)).toNumber());
      return Math.min(0.999, (s.tier + next) / req.tier);
    }
    case 'engine':
      return Math.min(1, (s.engines[req.id] ?? 0) / req.count);
    case 'count':
      return Math.min(1, (s.stats[req.stat] ?? 0) / req.count);
    case 'total': {
      const have = s.totals.all[req.currency] ?? D(0);
      return have.gte(req.amount) ? 1 : logShare(have.toNumber(), req.amount);
    }
    case 'rate': {
      const have = stat(s, 'stardustPerSec');
      return have.gte(req.amount) ? 1 : logShare(have.toNumber(), req.amount);
    }
    case 'upgrades':
      return Math.min(1, s.upgrades.length / req.count);
    case 'medals':
      return Math.min(1, s.achievements.length / req.count);
    case 'all':
      return req.of.reduce((m, r) => Math.min(m, reqProgress(s, r)), 1);
    case 'system':
      return s.unlocked.includes(req.id) ? 1 : 0;
    case 'systems':
      return Math.min(1, SYSTEMS.reduce((k, x) => k + (s.unlocked.includes(x.id) ? 1 : 0), 0) / req.count);
  }
}

export function reqMet(s: GameState, req: Requirement): boolean {
  return reqProgress(s, req) >= 1;
}

const big = (n: number) => (n >= 1000 ? D(n).toStringWithDecimalPlaces(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : String(n));

/** Short plain text: "Reach Red Dwarf", "Own 10 Spark Motes", "3 Supernovas". */
export function reqText(req: Requirement, fmt: (n: number) => string = big): string {
  switch (req.kind) {
    case 'none':
      return 'Available now';
    case 'tier':
      return `Reach ${TIERS[req.tier]?.name ?? 'a higher tier'}`;
    case 'engine': {
      const name = ENGINE_BY_ID.get(req.id)?.name ?? req.id;
      return req.count === 1 ? `Own a ${name.replace(/s$/, '')}` : `Own ${fmt(req.count)} ${name}`;
    }
    case 'count':
      return `${fmt(req.count)} ${plural(req.noun, req.count)}`;
    case 'total':
      return `Gather ${fmt(req.amount)} ${req.currency === 'stardust' ? 'Stardust' : req.currency} in total`;
    case 'rate':
      return `Make ${fmt(req.amount)} Stardust a second`;
    case 'upgrades':
      return `Buy ${fmt(req.count)} upgrade${req.count === 1 ? '' : 's'}`;
    case 'medals':
      return `Earn ${fmt(req.count)} medal${req.count === 1 ? '' : 's'}`;
    case 'all':
      return req.of.map((r) => reqText(r, fmt)).join(', ');
    case 'system':
      return `Unlock ${req.name}`;
    case 'systems':
      return `Unlock ${fmt(req.count)} systems`;
  }
}

/** Records unlocks the moment their requirement is first met; they stay unlocked through resets. */
export function checkUnlocks(s: GameState): void {
  for (const sys of SYSTEMS) {
    if (s.unlocked.includes(sys.id) || !reqMet(s, sys.req)) continue;
    s.unlocked.push(sys.id);
    if (sys.built) events.emit({ t: 'unlock', feature: sys.id });
  }
}

export function registerUnlocks(): void {
  registerSystem({ id: 'unlocks', order: 90, tick: (s, dt) => every(s, dt, 4) && checkUnlocks(s) });
}
