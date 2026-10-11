import { BALANCE } from '../../content/balance';
import { RARITIES } from '../../content/belt';
import { MUTATIONS, type MutationDef } from '../../content/runeDepth';
import { D, type Decimal, ZERO } from '../decimal';
import { events } from '../events';
import { drawHits } from '../odds';
import { nextFloat } from '../rng';
import type { GameState } from '../state';
import { defineStat, stat } from '../stats';

/**
 * Mutations (Game design: "More mid systems"). From 3 Nebulas any rune copy or asteroid can roll a
 * mutation: Golden x2, Rainbow x5, Void x20, Prismatic x100. A mutated rune copy counts as that many
 * copies toward the rune's level; a mutated asteroid gives that many times the ore and XP.
 * Mutation Luck divides the odds (never better than 1 in 2). Every roll uses the mutation stream,
 * so mutations never shift rune, Belt or comet rolls.
 */
const RD = BALANCE.runeDepth;

export const mutationsOpen = (s: GameState) => (s.stats.nebulasAll ?? 0) >= RD.opens.mutations;

/** log10 of the effective odds of a mutation. */
export function mutEffLog(s: GameState, m: MutationDef): number {
  const L = Math.max(1, stat(s, 'mutationLuck').toNumber());
  return Math.max(Math.log10(RD.mutationFloor), m.log10 - Math.log10(L));
}

export function runeMutations(s: GameState, runeId: string): Record<string, Decimal> {
  return s.mutations.runes[runeId] ?? {};
}

export function mutatedTotal(s: GameState, runeId: string): Decimal {
  let t = ZERO;
  for (const v of Object.values(runeMutations(s, runeId))) t = t.add(v);
  return t;
}

/** Copies toward a rune's level: each mutated copy counts as its mutation's size. */
export function effectiveCopies(s: GameState, runeId: string, plain: Decimal): Decimal {
  const muts = s.mutations.runes[runeId];
  if (!muts) return plain;
  let c = plain;
  for (const m of MUTATIONS) {
    const k = muts[m.id];
    if (k && k.gt(0)) c = c.add(k.mul(m.mult - 1));
  }
  return c;
}

/**
 * Rolls mutations for `count` new copies of a rune, rarest mutation first, each copy at most once.
 * Big counts use the expectation, small ones a Poisson draw, so this is one step at any scale.
 */
export function mutateRunes(s: GameState, runeId: string, count: Decimal): void {
  if (!mutationsOpen(s) || count.lte(0)) return;
  let left = count;
  for (let i = MUTATIONS.length - 1; i >= 0 && left.gt(0); i--) {
    const m = MUTATIONS[i]!;
    const k = Decimal_min(drawHits(s.mutations.rng, left, -mutEffLog(s, m), BALANCE.runes.poissonBelow), left);
    if (k.lte(0)) continue;
    const firstOfKind = !seenMutation(s, m.id);
    const rec = (s.mutations.runes[runeId] ??= {});
    const first = !rec[m.id] || rec[m.id]!.lte(0);
    rec[m.id] = (rec[m.id] ?? ZERO).add(k);
    left = left.sub(k);
    if (first) {
      s.stats.mutationsFound = (s.stats.mutationsFound ?? 0) + 1;
      events.emit({ t: 'mutation', target: 'rune', id: runeId, mut: m.id, firstOfKind });
    }
  }
}

const Decimal_min = (a: Decimal, b: Decimal) => (a.lt(b) ? a : b);

/** Whether anything has had this mutation yet (for the one toast per kind). */
function seenMutation(s: GameState, mut: string): boolean {
  for (const rec of Object.values(s.mutations.runes)) if (rec[mut]?.gt(0)) return true;
  return RARITIES.some((r) => (s.mutations.asteroids[`${r.id}.${mut}`] ?? 0) > 0);
}

/**
 * Keeps mutated copies within a rune's copies after some are given up (starring, salvage): the
 * plain copies go first, then the commonest mutations.
 */
export function trimMutations(s: GameState, runeId: string, copiesLeft: Decimal): void {
  const rec = s.mutations.runes[runeId];
  if (!rec) return;
  let over = mutatedTotal(s, runeId).sub(copiesLeft);
  for (const m of MUTATIONS) {
    if (over.lte(0)) break;
    const k = rec[m.id] ?? ZERO;
    const cut = Decimal_min(k, over);
    rec[m.id] = k.sub(cut);
    over = over.sub(cut);
  }
}

/** A new asteroid's mutation: 0 for none, else 1 (Golden) to 4 (Prismatic). */
export function rollAsteroidMutation(s: GameState): number {
  if (!mutationsOpen(s)) return 0;
  for (let i = MUTATIONS.length - 1; i >= 0; i--) {
    if (nextFloat(s.mutations.rng) < 10 ** -mutEffLog(s, MUTATIONS[i]!)) return i + 1;
  }
  return 0;
}

/** What an asteroid with this mutation is worth, as a multiple. */
export const asteroidMutMult = (m: number | undefined) => (m ? (MUTATIONS[m - 1]?.mult ?? 1) : 1);

/** Counts a harvested mutated asteroid for the Index and the Mutations panel. */
export function recordAsteroidMutation(s: GameState, rarity: number, m: number | undefined): void {
  if (!m) return;
  const mut = MUTATIONS[m - 1];
  const r = RARITIES[rarity];
  if (!mut || !r) return;
  const key = `${r.id}.${mut.id}`;
  const firstOfKind = !seenMutation(s, mut.id);
  const first = !s.mutations.asteroids[key];
  s.mutations.asteroids[key] = (s.mutations.asteroids[key] ?? 0) + 1;
  if (first) {
    s.stats.mutationsFound = (s.stats.mutationsFound ?? 0) + 1;
    events.emit({ t: 'mutation', target: 'asteroid', id: r.id, mut: mut.id, firstOfKind });
  }
}

/** Distinct (target, mutation) pairs found: what the Index's Mutations page counts. */
export function mutationsFound(s: GameState): number {
  let n = 0;
  for (const rec of Object.values(s.mutations.runes)) for (const v of Object.values(rec)) if (v.gt(0)) n++;
  for (const v of Object.values(s.mutations.asteroids)) if (v > 0) n++;
  return n;
}

export function registerMutations(): void {
  defineStat({ id: 'mutationLuck', label: 'Mutation luck', base: () => D(1) });
}
