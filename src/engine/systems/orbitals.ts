import { ORBITALS, PLANET_TYPES } from '../../content/early';
import { ENGINES } from '../../content/engines';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import { type GameState, spend } from '../state';
import { registerSources, stat } from '../stats';

/**
 * Orbitals: planet slots on rings around the star. A planet boosts the engines of its type; each
 * neighbour on the same ring of a DIFFERENT type makes it stronger, so arranging the ring is a
 * small puzzle. Changing a planet's type is free, so the puzzle never punishes experimenting.
 */
export interface Planet {
  type: string;
  level: number;
}

export const slotId = (ring: number, slot: number) => `${ring}.${slot}`;

export function ringOpen(s: GameState, ring: number): boolean {
  const r = ORBITALS.rings[ring];
  return !!r && s.tier >= r.tier;
}

export function orbitalsOpen(s: GameState): boolean {
  return ringOpen(s, 0);
}

export const planetCount = (s: GameState) => Object.keys(s.planets).length;

export function planetPrice(s: GameState): Decimal {
  return D(ORBITALS.planetBase).mul(D(ORBITALS.planetGrowth).pow(planetCount(s)));
}

export function levelPrice(p: Planet): Decimal {
  return D(ORBITALS.planetBase).mul(2).mul(D(ORBITALS.levelGrowth).pow(p.level));
}

function parse(slot: string): [number, number] | null {
  const [r, i] = slot.split('.').map(Number);
  if (r === undefined || i === undefined || !Number.isInteger(r) || !Number.isInteger(i)) return null;
  const ring = ORBITALS.rings[r];
  return ring && i >= 0 && i < ring.slots ? [r, i] : null;
}

const validType = (t: string) => PLANET_TYPES.some((p) => p.id === t);

export function buyPlanet(s: GameState, slot: string, type: string): boolean {
  const at = parse(slot);
  if (!at || !ringOpen(s, at[0]) || s.planets[slot] || !validType(type)) return false;
  if (!spend(s, 'stardust', planetPrice(s))) return false;
  s.planets[slot] = { type, level: 1 };
  events.emit({ t: 'purchase', kind: 'planet', id: slot, amount: 1 });
  return true;
}

export function setPlanetType(s: GameState, slot: string, type: string): boolean {
  const p = s.planets[slot];
  if (!p || !validType(type) || p.type === type) return false;
  p.type = type;
  return true;
}

export function levelPlanet(s: GameState, slot: string): boolean {
  const p = s.planets[slot];
  if (!p || !spend(s, 'stardust', levelPrice(p))) return false;
  p.level += 1;
  events.emit({ t: 'purchase', kind: 'planet', id: slot, amount: 1 });
  return true;
}

/** Neighbours on the same ring (it's a circle) with a different type than this planet. */
export function differentNeighbours(s: GameState, slot: string): number {
  const at = parse(slot);
  const p = s.planets[slot];
  if (!at || !p) return 0;
  const n = ORBITALS.rings[at[0]]!.slots;
  let count = 0;
  for (const d of [-1, 1]) {
    const other = s.planets[slotId(at[0], (at[1] + d + n) % n)];
    if (other && other.type !== p.type) count++;
  }
  return count;
}

/** One planet's bonus to each engine of its type: +25% per level, more with varied neighbours. */
export function planetBonus(s: GameState, slot: string): number {
  const p = s.planets[slot];
  if (!p) return 0;
  return ORBITALS.perLevel * p.level * (1 + ORBITALS.neighbourBonus * differentNeighbours(s, slot)) * stat(s, 'planetPower').toNumber();
}

/** Everything the planets add to one engine, as a share (0.5 = +50%). */
export function engineOrbitalBonus(s: GameState, engineId: string): number {
  let total = 0;
  for (const slot of Object.keys(s.planets)) {
    const at = parse(slot);
    if (!at || !ringOpen(s, at[0])) continue;
    const type = PLANET_TYPES.find((t) => t.id === s.planets[slot]!.type);
    if (type?.engines.includes(engineId)) total += planetBonus(s, slot);
  }
  return total;
}

export function registerOrbitals(): void {
  registerSources(
    ...ENGINES.map((e) => ({
      id: `orbitals.${e.id}`,
      stat: `engineMult.${e.id}`,
      op: 'mul' as const,
      label: 'Orbitals',
      value: (s: GameState) => D(1 + engineOrbitalBonus(s, e.id)),
      active: (s: GameState) => planetCount(s) > 0,
    })),
  );
}
