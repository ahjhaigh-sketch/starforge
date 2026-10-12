import { BALANCE } from './balance';

/**
 * Starlight Alchemy (Ideas menu 6): elixirs brewed from what the Belt and the Starforge make.
 * Recipes are fixed mixes of three ingredients (order doesn't matter, repeats allowed), the same
 * for everyone, so friends can trade them. IDs never change.
 */
export interface IngredientDef {
  /** The currency it's made from (also its id). */
  id: string;
  name: string;
  color: string;
  /** The least one dose takes. */
  floor: number;
}

export const INGREDIENTS: readonly IngredientDef[] = [
  { id: 'ore', name: 'Ore', color: '#8C97C2', floor: 1000 },
  { id: 'ore.gold', name: 'Gold Ore', color: '#FFC83D', floor: 50 },
  { id: 'ore.crystal', name: 'Crystal Ore', color: '#9FE7FF', floor: 10 },
  { id: 'ore.prismatic', name: 'Prismatic Ore', color: '#FF9EF0', floor: 3 },
  { id: 'ore.void', name: 'Void Ore', color: '#9B7CFF', floor: 1 },
  { id: 'alloy.iron', name: 'Iron Alloy', color: '#B8C0DA', floor: 10 },
  { id: 'alloy.gold', name: 'Gold Alloy', color: '#E8A800', floor: 3 },
  { id: 'alloy.crystal', name: 'Crystal Alloy', color: '#5FC8E8', floor: 1 },
];

export interface RecipeDef {
  id: string;
  name: string;
  /** Three ingredient ids (order doesn't matter). */
  mix: readonly [string, string, string];
  /** What the elixir does while it lasts. */
  stat: string;
  value: number;
  seconds: number;
  desc: string;
  /** A short label for the HUD chip while it lasts. */
  chip: string;
  color: string;
}

/** Strengths and durations live in balance.ts. */
const R = BALANCE.alchemy.recipes;

export const RECIPES: readonly RecipeDef[] = [
  { id: 'minersAle', name: "Miner's Ale", mix: ['ore', 'ore', 'ore'], stat: 'oreGain', value: R.minersAle!.value, seconds: R.minersAle!.seconds, desc: `Ore x${R.minersAle!.value}.`, chip: `Ore x${R.minersAle!.value}`, color: '#C8A26A' },
  { id: 'liquidLight', name: 'Liquid Light', mix: ['ore', 'ore', 'alloy.iron'], stat: 'productionMult', value: R.liquidLight!.value, seconds: R.liquidLight!.seconds, desc: `Stardust x${R.liquidLight!.value}.`, chip: `Stardust x${R.liquidLight!.value}`, color: '#FFE070' },
  { id: 'shardSyrup', name: 'Shard Syrup', mix: ['ore', 'ore.gold', 'alloy.gold'], stat: 'shardGain', value: R.shardSyrup!.value, seconds: R.shardSyrup!.seconds, desc: `Nova Shards x${R.shardSyrup!.value}.`, chip: `Shards x${R.shardSyrup!.value}`, color: '#FF4FC1' },
  { id: 'starsmithTea', name: "Starsmith's Tea", mix: ['ore.gold', 'ore.gold', 'alloy.iron'], stat: 'xpGain', value: R.starsmithTea!.value, seconds: R.starsmithTea!.seconds, desc: `Starsmith XP x${R.starsmithTea!.value}.`, chip: `XP x${R.starsmithTea!.value}`, color: '#2E8FD0' },
  { id: 'cometBrew', name: 'Comet Brew', mix: ['ore', 'ore.crystal', 'ore.crystal'], stat: 'cometRate', value: R.cometBrew!.value, seconds: R.cometBrew!.seconds, desc: `Comets come ${R.cometBrew!.value} times as often.`, chip: `Comets x${R.cometBrew!.value}`, color: '#2EE6FF' },
  { id: 'essenceInfusion', name: 'Essence Infusion', mix: ['ore.gold', 'ore.crystal', 'alloy.crystal'], stat: 'essenceGain', value: R.essenceInfusion!.value, seconds: R.essenceInfusion!.seconds, desc: `Nebula Essence x${R.essenceInfusion!.value}.`, chip: `Essence x${R.essenceInfusion!.value}`, color: '#1E8FA8' },
  { id: 'forgeTonic', name: 'Forge Tonic', mix: ['alloy.iron', 'alloy.gold', 'alloy.crystal'], stat: 'forgeSpeed', value: R.forgeTonic!.value, seconds: R.forgeTonic!.seconds, desc: `The Starforge smelts x${R.forgeTonic!.value} as fast.`, chip: `Smelting x${R.forgeTonic!.value}`, color: '#FF7A2E' },
  { id: 'critCordial', name: 'Crit Cordial', mix: ['ore', 'ore.prismatic', 'alloy.gold'], stat: 'critMult', value: R.critCordial!.value, seconds: R.critCordial!.seconds, desc: `Crits x${R.critCordial!.value}.`, chip: `Crits x${R.critCordial!.value}`, color: '#FF4F6E' },
  { id: 'fortune', name: 'Draught of Fortune', mix: ['ore.crystal', 'ore.prismatic', 'ore.prismatic'], stat: 'runeLuck', value: R.fortune!.value, seconds: R.fortune!.seconds, desc: `Rune Luck x${R.fortune!.value}.`, chip: `Luck x${R.fortune!.value}`, color: '#B06BFF' },
  { id: 'voidPhilter', name: 'Void Philter', mix: ['ore.prismatic', 'ore.void', 'alloy.crystal'], stat: 'darkMatterGain', value: R.voidPhilter!.value, seconds: R.voidPhilter!.seconds, desc: `Dark Matter x${R.voidPhilter!.value}.`, chip: `Dark Matter x${R.voidPhilter!.value}`, color: '#6B4BC8' },
  { id: 'echoElixir', name: 'Echo Elixir', mix: ['ore.void', 'ore.void', 'alloy.iron'], stat: 'echoMult', value: R.echoElixir!.value, seconds: R.echoElixir!.seconds, desc: `Echo output x${R.echoElixir!.value}.`, chip: `Echoes x${R.echoElixir!.value}`, color: '#B08A1A' },
  { id: 'haste', name: 'Elixir of Haste', mix: ['ore.prismatic', 'ore.void', 'alloy.gold'], stat: 'gameSpeed', value: R.haste!.value, seconds: R.haste!.seconds, desc: `The game runs x${R.haste!.value} as fast.`, chip: `Speed x${R.haste!.value}`, color: '#7DFF5A' },
];

/** A mix as a key: its ingredients sorted, so order never matters. */
export const mixKey = (mix: readonly string[]): string => [...mix].sort().join('+');

export const RECIPE_BY_ID: ReadonlyMap<string, RecipeDef> = new Map(RECIPES.map((r) => [r.id, r]));
export const RECIPE_BY_MIX: ReadonlyMap<string, RecipeDef> = new Map(RECIPES.map((r) => [mixKey(r.mix), r]));
export const INGREDIENT_BY_ID: ReadonlyMap<string, IngredientDef> = new Map(INGREDIENTS.map((i) => [i.id, i]));
