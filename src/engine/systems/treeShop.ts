import { NEBULA_TREE } from '../../content/nebulaTree';
import { NOVA_TREE } from '../../content/novaTree';
import type { Decimal } from '../decimal';
import { cur, type GameState } from '../state';
import { galacticTree } from './galactic';
import { scaleTree } from './leviathans';
import { canBuyNebulaNode, buyNebulaNode, nebulaNodeCost } from './nebulaTree';
import { buyNode, canBuyNode, nodeCost } from './novaTree';
import { starChart } from './observatory';
import { singularityTree } from './singularity';
import { availableUpgrades, buyUpgrade } from './upgrades';

/**
 * Buying in bulk (1.2.0): "Buy all" for the Stardust upgrades (from the first Supernova) and for
 * every big tree but the Spark choices, which are choices, not a shopping list (from 5
 * Supernovas). Cheapest first, as long as it can pay. The same helpers run the tree auto-buyers.
 */
export const UPGRADE_BULK_AT = 1;
export const TREE_BULK_AT = 5;
export const upgradeBulkOpen = (s: GameState) => (s.stats.supernovasAll ?? 0) >= UPGRADE_BULK_AT;
export const treeBulkOpen = (s: GameState) => (s.stats.supernovasAll ?? 0) >= TREE_BULK_AT;

export interface TreeShop {
  id: string;
  name: string;
  currency: string;
  /** Every node that can be bought now, with its price. */
  buyable(s: GameState): Array<{ id: string; cost: Decimal }>;
  buy(s: GameState, id: string): boolean;
}

const kitShop = (panel: string, name: string, t: typeof galacticTree): TreeShop => ({
  id: panel,
  name,
  currency: t.def.currency,
  buyable: (s) => t.def.nodes.filter((n) => t.canBuy(s, n)).map((n) => ({ id: n.id, cost: t.cost(s, n) })),
  buy: (s, id) => t.buy(s, id),
});

export const TREE_SHOPS: readonly TreeShop[] = [
  { id: 'novatree', name: 'Nova Tree', currency: 'shards', buyable: (s) => NOVA_TREE.filter((n) => canBuyNode(s, n)).map((n) => ({ id: n.id, cost: nodeCost(s, n) })), buy: buyNode },
  { id: 'nebulatree', name: 'Nebula Tree', currency: 'essence', buyable: (s) => NEBULA_TREE.filter((n) => canBuyNebulaNode(s, n)).map((n) => ({ id: n.id, cost: nebulaNodeCost(s, n) })), buy: buyNebulaNode },
  kitShop('singularitytree', 'Singularity Tree', singularityTree),
  kitShop('galactictree', 'Galactic Tree', galacticTree),
  kitShop('scaletree', 'Scale Tree', scaleTree),
  kitShop('starchart', 'Star Chart', starChart),
];
export const TREE_SHOP_BY_ID: ReadonlyMap<string, TreeShop> = new Map(TREE_SHOPS.map((t) => [t.id, t]));

/** Most purchases one click (or one auto-buyer pass) makes, however cheap the nodes. */
const MAX_PER_PASS = 2000;

/**
 * Buys the cheapest node it can, again and again, keeping at least (1 - share) of the currency it
 * started with. Returns how many it bought.
 */
export function buyAllNodes(s: GameState, shop: TreeShop, share = 1): number {
  const keep = cur(s, shop.currency).mul(1 - share);
  let bought = 0;
  for (; bought < MAX_PER_PASS; bought++) {
    const left = cur(s, shop.currency).sub(keep);
    let best: { id: string; cost: Decimal } | null = null;
    for (const n of shop.buyable(s)) if (n.cost.lte(left) && (!best || n.cost.lt(best.cost))) best = n;
    if (!best || !shop.buy(s, best.id)) break;
  }
  return bought;
}

/** Buys every Stardust upgrade it can, cheapest first. */
export function buyAllUpgrades(s: GameState, share = 1): number {
  const keep = cur(s, 'stardust').mul(1 - share);
  let bought = 0;
  for (const u of availableUpgrades(s)) {
    if (cur(s, 'stardust').sub(keep).lt(u.cost)) break; // cheapest first: the rest cost more
    if (buyUpgrade(s, u.id)) bought++;
  }
  return bought;
}
