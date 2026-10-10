import { ENGINE_BY_ID } from '../../content/engines';
import { type Requirement, SYSTEMS } from '../../content/systems';
import { TIERS, tierCost } from '../../content/tiers';
import { events } from '../events';
import { cur, type GameState } from '../state';
import { registerSystem } from '../tick';

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
  }
}

export function reqMet(s: GameState, req: Requirement): boolean {
  return reqProgress(s, req) >= 1;
}

/** Short plain text: "Reach Red Dwarf", "Own 10 Spark Motes", "3 Supernovas". */
export function reqText(req: Requirement): string {
  switch (req.kind) {
    case 'none':
      return 'Available now';
    case 'tier':
      return `Reach ${TIERS[req.tier]?.name ?? 'a higher tier'}`;
    case 'engine': {
      const name = ENGINE_BY_ID.get(req.id)?.name ?? req.id;
      return req.count === 1 ? `Own a ${name.replace(/s$/, '')}` : `Own ${req.count} ${name}`;
    }
    case 'count':
      return `${req.count} ${req.noun}${req.count === 1 ? '' : 's'}`;
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
  registerSystem({ id: 'unlocks', order: 90, tick: (s) => checkUnlocks(s) });
}
