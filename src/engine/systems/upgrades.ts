import { UPGRADE_BY_ID, UPGRADES, type UpgradeDef } from '../../content/upgrades';
import { D } from '../decimal';
import { events } from '../events';
import { type GameState, spend } from '../state';
import { registerSources, stat, type StatSource } from '../stats';
import { reqMet } from './unlocks';

/**
 * One-off upgrades. Each declares its effect as data; this turns it into a stat-pipeline source
 * that is active once bought, so every effect shows up in the Stats breakdown by name.
 */
const bought = new WeakMap<GameState, { n: number; set: Set<string> }>();

/** A Set view of state.upgrades, rebuilt only when the list grows or the state object changes. */
export function hasUpgrade(s: GameState, id: string): boolean {
  let c = bought.get(s);
  if (!c || c.n !== s.upgrades.length) {
    c = { n: s.upgrades.length, set: new Set(s.upgrades) };
    bought.set(s, c);
  }
  return c.set.has(id);
}

/** Shown as a tile when its requirement is met and it isn't bought yet. */
export function upgradeAvailable(s: GameState, u: UpgradeDef): boolean {
  return !hasUpgrade(s, u.id) && reqMet(s, u.req);
}

export function availableUpgrades(s: GameState): UpgradeDef[] {
  return UPGRADES.filter((u) => upgradeAvailable(s, u)).sort((a, b) => a.cost - b.cost);
}

export function buyUpgrade(s: GameState, id: string): boolean {
  const u = UPGRADE_BY_ID.get(id);
  if (!u || !upgradeAvailable(s, u)) return false;
  if (!spend(s, 'stardust', D(u.cost))) return false;
  s.upgrades.push(id);
  events.emit({ t: 'purchase', kind: 'upgrade', id, amount: 1 });
  return true;
}

function sourceFor(u: UpgradeDef): StatSource {
  const e = u.effect;
  const active = (s: GameState) => hasUpgrade(s, u.id);
  const base = { id: `upgrade.${u.id}`, stat: e.stat, label: u.name, active };
  if ('spsShare' in e) return { ...base, op: 'add', value: (s) => stat(s, 'stardustPerSec').mul(e.spsShare) };
  if ('perEngine' in e) {
    return e.op === 'add'
      ? { ...base, op: 'add', value: (s) => D(e.each * (s.engines[e.perEngine] ?? 0)) }
      : { ...base, op: 'mul', value: (s) => D(1 + e.each * (s.engines[e.perEngine] ?? 0)) };
  }
  return { ...base, op: e.op, value: () => D(e.value) };
}

export function registerUpgrades(): void {
  registerSources(...UPGRADES.map(sourceFor));
}
