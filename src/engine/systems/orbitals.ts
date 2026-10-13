import { ORBITALS, PLANET_TYPES } from '../../content/early';
import { ENGINES } from '../../content/engines';
import { planLimited, type PurchasePlan } from '../buy';
import { bulkCost, type CostCurve } from '../cost';
import { D, type Decimal, ZERO } from '../decimal';
import { events } from '../events';
import { cur, type GameState, spend, usable } from '../state';
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

/** The price of a planet's next level (the level curve, steeper from level 20 and 40). */
export function levelPrice(p: Planet): Decimal {
  return bulkCost(planetLevelCurve(), p.level, 1);
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

/**
 * Planet levels as a cost curve: planetBase x 2 x levelGrowth^n up to level 20, steeper after (1.2.0);
 * levelPrice() reads the same curve, so bulk totals and Max are closed-form (a thousand levels is one sum).
 */
let levelCurve: CostCurve | null = null;
export function planetLevelCurve(): CostCurve {
  levelCurve ??= { base: D(ORBITALS.planetBase).mul(2), brackets: [{ from: 0, ratio: ORBITALS.levelGrowth }, ...ORBITALS.levelBrackets] };
  return levelCurve;
}

/** "Next" levels a planet up to its next round ten (Lv 7 to 10, Lv 10 to 20). */
export const nextPlanetStep = (level: number) => (Math.floor(level / 10) + 1) * 10;

/** What one press of a planet's level button does at the buy amount (x1 to Max, Next, typed). */
export function levelPlanetPlan(s: GameState, slot: string): PurchasePlan {
  const p = s.planets[slot];
  if (!p) return { count: 0, cost: ZERO, canAfford: false };
  const money = cur(s, 'stardust');
  const plan = planLimited(planetLevelCurve(), p.level, money, s.settings.buyAmount, s.settings.customBuyAmount, Infinity, nextPlanetStep(p.level));
  // one level is priced exactly as it always was (no rounding from the series sum)
  if (plan.count === 1) {
    const one = levelPrice(p);
    return { count: 1, cost: one, canAfford: one.lte(money) };
  }
  return plan;
}

/** Levels a planet by the buy amount, paying the whole total at once. */
export function levelPlanet(s: GameState, slot: string): boolean {
  const p = s.planets[slot];
  if (!p) return false;
  const plan = levelPlanetPlan(s, slot);
  if (plan.count <= 0 || !plan.canAfford || !spend(s, 'stardust', plan.cost)) return false;
  p.level += plan.count;
  events.emit({ t: 'purchase', kind: 'planet', id: slot, amount: plan.count });
  return true;
}

/**
 * The type a new planet in this slot should be: one that differs from both neighbours (their bonus)
 * and boosts the engines you own most.
 */
export function bestPlanetType(s: GameState, ring: number, index: number): string {
  const n = ORBITALS.rings[ring]!.slots;
  const near = [s.planets[slotId(ring, (index + n - 1) % n)]?.type, s.planets[slotId(ring, (index + 1) % n)]?.type];
  const weight = (t: (typeof PLANET_TYPES)[number]) => t.engines.reduce((a, id) => a + (s.engines[id] ?? 0), 0);
  const fits = PLANET_TYPES.filter((t) => !near.includes(t.id));
  return [...(fits.length ? fits : PLANET_TYPES)].sort((a, b) => weight(b) - weight(a))[0]!.id;
}

/** Most planet levels one auto-planets pass buys, in at most this many bulk steps (it runs 4 times a second). */
const AUTO_LEVELS_PER_PASS = 200;
const AUTO_STEPS_PER_PASS = 4;

/**
 * Auto-planets (1.2.0): fills every open empty slot it can pay for, then levels the lowest planet
 * one level at a time, spending at most `share` of the Stardust it started with.
 */
export function autoPlanets(s: GameState, share: number): void {
  if (!orbitalsOpen(s)) return;
  const keep = usable(s, 'stardust').mul(1 - share);
  const left = () => usable(s, 'stardust').sub(keep);
  for (let r = 0; r < ORBITALS.rings.length; r++) {
    if (!ringOpen(s, r)) continue;
    for (let i = 0; i < ORBITALS.rings[r]!.slots; i++) {
      const id = slotId(r, i);
      if (s.planets[id]) continue;
      if (planetPrice(s).gt(left())) break;
      buyPlanet(s, id, bestPlanetType(s, r, i));
    }
  }
  // level the lowest planet up to the next lowest (closed-form, all it can pay for in one go), and
  // again, so the planets climb together
  let levels = 0;
  const planets = Object.values(s.planets);
  for (let step = 0; step < AUTO_STEPS_PER_PASS && levels < AUTO_LEVELS_PER_PASS; step++) {
    planets.sort((a, b) => a.level - b.level);
    const low = planets[0];
    if (!low) break;
    const target = Math.min(low.level + AUTO_LEVELS_PER_PASS - levels, Math.max(low.level + 1, planets[1]?.level ?? low.level + AUTO_LEVELS_PER_PASS));
    const plan = planLimited(planetLevelCurve(), low.level, left(), 'max', 0, target);
    if (plan.count <= 0 || !plan.canAfford || !spend(s, 'stardust', plan.cost)) break;
    low.level += plan.count;
    levels += plan.count;
  }
  if (levels > 0) events.emit({ t: 'purchase', kind: 'planet', id: 'auto', amount: levels });
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
