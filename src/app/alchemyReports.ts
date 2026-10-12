import { INGREDIENT_BY_ID, INGREDIENTS, mixKey, RECIPE_BY_MIX, RECIPES } from '../content/alchemy';
import { BALANCE } from '../content/balance';
import { cur } from '../engine/state';
import { alchemyOpen, dose, elixirLeft, maxBrews, mixCost } from '../engine/systems/alchemy';
import { format, formatTime } from '../ui/format';
import { game } from './game';

/** Read-outs for Starlight Alchemy. */
const n = () => game.state.settings.notation;

export interface IngredientRow {
  id: string;
  name: string;
  color: string;
  held: string;
  dose: string;
  /** Holds at least one dose. */
  can: boolean;
}

export interface RecipeRow {
  id: string;
  known: boolean;
  name: string;
  desc: string;
  color: string;
  mix: string[];
  shelf: number;
  /** Boost time left ("4m 12s"), or empty. */
  left: string;
  max: number;
  /** The buy amount's batch: how many, what it costs, and whether you can pay. */
  batch: number;
  batchCost: string;
  canBatch: boolean;
}

/** The buy amount as a number of brews (Max: as many as you can pay for; Next: one). */
function batchSize(max: number): number {
  const a = game.state.settings.buyAmount;
  if (a === 'max') return Math.max(1, max);
  if (a === 'custom') return Math.max(1, Math.floor(game.state.settings.customBuyAmount));
  return a === 'next' ? 1 : a;
}

export function alchemyReport(slots: readonly string[]): {
  open: boolean;
  req: string;
  ingredients: IngredientRow[];
  recipes: RecipeRow[];
  found: number;
  /** The mix in the cauldron: what it costs, whether you can pay, and what it's known to make. */
  cost: string;
  canBrew: boolean;
  knownMix: string;
  tried: boolean;
  triedCount: number;
} {
  const s = game.state;
  const full = slots.length === 3;
  const cost = full ? mixCost(s, slots) : new Map();
  const recipe = full ? RECIPE_BY_MIX.get(mixKey(slots)) : undefined;
  return {
    open: alchemyOpen(s),
    req: `${BALANCE.alchemy.supernovas} Supernovas`,
    ingredients: INGREDIENTS.map((i) => ({ id: i.id, name: i.name, color: i.color, held: format(cur(s, i.id), n()), dose: format(dose(s, i.id), n()), can: cur(s, i.id).gte(dose(s, i.id)) })),
    recipes: RECIPES.map((r) => {
      const known = s.alchemy.known.includes(r.id);
      const left = elixirLeft(s, r.id);
      const max = known ? maxBrews(s, r.id) : 0;
      const batch = batchSize(max);
      return {
        id: r.id,
        known,
        name: known ? r.name : '???',
        desc: known ? r.desc : 'Not found yet',
        color: r.color,
        mix: known ? r.mix.map((id) => INGREDIENT_BY_ID.get(id)!.name) : [],
        shelf: s.alchemy.shelf[r.id] ?? 0,
        left: left > 0 ? formatTime(left) : '',
        max,
        batch,
        batchCost: known ? [...mixCost(s, r.mix, batch)].map(([id, amount]) => `${format(amount, n())} ${INGREDIENT_BY_ID.get(id)!.name}`).join(', ') : '',
        canBatch: known && batch <= max,
      };
    }),
    found: s.alchemy.known.length,
    cost: [...cost].map(([id, amount]) => `${format(amount, n())} ${INGREDIENT_BY_ID.get(id)!.name}`).join(', '),
    canBrew: full && [...cost].every(([id, amount]) => cur(s, id).gte(amount)),
    knownMix: recipe && s.alchemy.known.includes(recipe.id) ? recipe.name : '',
    tried: full && s.alchemy.tried.includes(mixKey(slots)),
    triedCount: s.alchemy.tried.length,
  };
}
