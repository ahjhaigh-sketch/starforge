import { INGREDIENT_BY_ID, mixKey, RECIPE_BY_ID, RECIPE_BY_MIX, RECIPES } from '../../content/alchemy';
import { BALANCE } from '../../content/balance';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import { cur, type GameState, spend } from '../state';
import { invalidateStats, registerSources } from '../stats';

/**
 * Starlight Alchemy (Ideas menu 6). Three ingredients in the cauldron make an elixir when they
 * match a recipe, and Murky Sludge (with a hint) when they don't. A dose of an ingredient is a share
 * of what you hold, at least its floor, so brewing stays worth doing at any stage. An elixir's boost
 * ends at a play-time moment (like comet buffs) but is kept apart from them, because a Supernova
 * clears comet buffs: a drunk elixir lasts its full time through any reset. The Recipe Book, the
 * tried mixes and the shelf are kept for good. No randomness: a mix always does the same thing.
 */
const A = BALANCE.alchemy;

export const alchemyOpen = (s: GameState) => (s.stats.supernovasAll ?? 0) >= A.supernovas || s.unlocked.includes('alchemy');

/** One dose of an ingredient. */
export function dose(s: GameState, id: string): Decimal {
  const ing = INGREDIENT_BY_ID.get(id);
  if (!ing) return D(Infinity);
  return cur(s, id).mul(A.doseShare).floor().max(ing.floor);
}

/** How many of each ingredient a mix uses (the same one twice is two doses). */
function counts(mix: readonly string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of mix) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

/** What `n` brews of a mix cost, ingredient by ingredient. */
export function mixCost(s: GameState, mix: readonly string[], n = 1): Map<string, Decimal> {
  const cost = new Map<string, Decimal>();
  for (const [id, k] of counts(mix)) cost.set(id, dose(s, id).mul(k * n));
  return cost;
}

const affordable = (s: GameState, cost: Map<string, Decimal>) => [...cost].every(([id, amount]) => cur(s, id).gte(amount));

/** The most brews of a known recipe you can pay for at once (closed-form: doses are fixed for the batch). */
export function maxBrews(s: GameState, recipeId: string): number {
  const r = RECIPE_BY_ID.get(recipeId);
  if (!r) return 0;
  let n = Infinity;
  for (const [id, k] of counts(r.mix)) n = Math.min(n, cur(s, id).div(dose(s, id).mul(k)).floor().toNumber());
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** How many ingredients two mixes share (counting repeats). */
function overlap(a: readonly string[], b: readonly string[]): number {
  const left = counts(b);
  let n = 0;
  for (const id of a) {
    const k = left.get(id) ?? 0;
    if (k > 0) {
      n++;
      left.set(id, k - 1);
    }
  }
  return n;
}

export type BrewResult = { kind: 'elixir'; recipe: string; count: number; first: boolean } | { kind: 'sludge'; hint: number; again: boolean };

/**
 * Brews a mix. A recipe's mix makes `count` elixirs (more than one only once the recipe is known);
 * anything else makes Murky Sludge, and the hint is how many of its ingredients belong to a recipe
 * not found yet. Returns null if the mix isn't three ingredients or you can't pay for it.
 */
export function brew(s: GameState, mix: readonly string[], count = 1): BrewResult | null {
  if (!alchemyOpen(s) || mix.length !== 3 || mix.some((id) => !INGREDIENT_BY_ID.has(id))) return null;
  const key = mixKey(mix);
  const recipe = RECIPE_BY_MIX.get(key);
  const known = !!recipe && s.alchemy.known.includes(recipe.id);
  const n = known ? Math.max(1, Math.floor(count)) : 1;
  const cost = mixCost(s, mix, n);
  if (!affordable(s, cost)) return null;
  for (const [id, amount] of cost) spend(s, id, amount);
  s.stats.brews = (s.stats.brews ?? 0) + n;
  if (recipe) {
    if (!known) s.alchemy.known.push(recipe.id);
    s.stats.recipesFound = s.alchemy.known.length;
    s.alchemy.shelf[recipe.id] = (s.alchemy.shelf[recipe.id] ?? 0) + n;
    events.emit({ t: 'purchase', kind: 'alchemy', id: recipe.id, amount: n });
    return { kind: 'elixir', recipe: recipe.id, count: n, first: !known };
  }
  const again = s.alchemy.tried.includes(key);
  if (!again) s.alchemy.tried.push(key);
  const hint = Math.max(0, ...RECIPES.filter((r) => !s.alchemy.known.includes(r.id)).map((r) => overlap(mix, r.mix)));
  return { kind: 'sludge', hint, again };
}

/** Seconds of boost left on an elixir. */
export const elixirLeft = (s: GameState, id: string) => Math.max(0, (s.alchemy.active[id] ?? 0) - s.playtime);

/** Drinks one from the shelf: its boost starts, or runs that much longer (up to an hour). */
export function drink(s: GameState, id: string): boolean {
  const r = RECIPE_BY_ID.get(id);
  if (!r || (s.alchemy.shelf[id] ?? 0) < 1) return false;
  s.alchemy.shelf[id] = (s.alchemy.shelf[id] ?? 0) - 1;
  const from = Math.max(s.alchemy.active[id] ?? 0, s.playtime);
  s.alchemy.active[id] = Math.min(s.playtime + A.maxSeconds, from + r.seconds);
  s.stats.elixirsDrunk = (s.stats.elixirsDrunk ?? 0) + 1;
  invalidateStats();
  return true;
}

export function registerAlchemy(): void {
  registerSources(
    ...RECIPES.map((r) => ({
      id: `alchemy.${r.id}`,
      stat: r.stat,
      op: 'mul' as const,
      label: `${r.name} (elixir)`,
      value: () => D(r.value),
      active: (s: GameState) => (s.alchemy.active[r.id] ?? 0) > s.playtime,
    })),
  );
}
