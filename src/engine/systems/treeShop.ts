import { NEBULA_TREE } from '../../content/nebulaTree';
import { NOVA_TREE } from '../../content/novaTree';
import { type Decimal, maxAffordable, sumGeometric } from '../decimal';
import { events } from '../events';
import { invalidateStats } from '../stats';
import { cur, type GameState, spend, usable } from '../state';
import { galacticTree } from './galactic';
import { scaleTree } from './leviathans';
import { canBuyNebulaNode, buyNebulaNode, nebulaNodeCost, nebulaNodeReachable, nebulaTreeOpen } from './nebulaTree';
import { buyNode, canBuyNode, nodeCost, nodeReachable, treeOpen } from './novaTree';
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
  /**
   * 1.4.0: the repeating nodes you can reach (price of the next level and growth a level), and a way to add levels
   * after paying for them, so automation buys hundreds of levels in one closed-form step (it bought them one at a
   * time, 2,000 a pass, each rebuilding every stat: 190 ms a second on a late-game Nova Tree).
   */
  repeats?(s: GameState): Array<{ id: string; cost: Decimal; growth: number }>;
  addLevels?(s: GameState, id: string, n: number): void;
}

const kitShop = (panel: string, name: string, t: typeof galacticTree): TreeShop => ({
  id: panel,
  name,
  currency: t.def.currency,
  buyable: (s) => t.def.nodes.filter((n) => t.canBuy(s, n)).map((n) => ({ id: n.id, cost: t.cost(s, n) })),
  buy: (s, id) => t.buy(s, id),
  repeats: (s) => (t.def.open(s) ? t.def.nodes.filter((n) => n.repeat && t.reachable(s, n)).map((n) => ({ id: n.id, cost: t.cost(s, n), growth: n.repeat!.growth })) : []),
  addLevels: (s, id, n) => {
    const levels = t.def.levels(s);
    levels[id] = (levels[id] ?? 0) + n;
  },
});

export const TREE_SHOPS: readonly TreeShop[] = [
  {
    id: 'novatree',
    name: 'Nova Tree',
    currency: 'shards',
    buyable: (s) => NOVA_TREE.filter((n) => canBuyNode(s, n)).map((n) => ({ id: n.id, cost: nodeCost(s, n) })),
    buy: buyNode,
    repeats: (s) => (treeOpen(s) ? NOVA_TREE.filter((n) => n.repeat && nodeReachable(s, n)).map((n) => ({ id: n.id, cost: nodeCost(s, n), growth: n.repeat!.growth })) : []),
    addLevels: (s, id, n) => {
      s.novaTree[id] = (s.novaTree[id] ?? 0) + n;
    },
  },
  {
    id: 'nebulatree',
    name: 'Nebula Tree',
    currency: 'essence',
    buyable: (s) => NEBULA_TREE.filter((n) => canBuyNebulaNode(s, n)).map((n) => ({ id: n.id, cost: nebulaNodeCost(s, n) })),
    buy: buyNebulaNode,
    repeats: (s) => (nebulaTreeOpen(s) ? NEBULA_TREE.filter((n) => n.repeat && nebulaNodeReachable(s, n)).map((n) => ({ id: n.id, cost: nebulaNodeCost(s, n), growth: n.repeat!.growth })) : []),
    addLevels: (s, id, n) => {
      s.nebulaTree[id] = (s.nebulaTree[id] ?? 0) + n;
    },
  },
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
 * started with. Returns how many it bought. 1.4.0: with a shop that offers it, one-off nodes go first
 * and the repeating nodes then climb in closed form, each on an even share of what's left.
 */
export function buyAllNodes(s: GameState, shop: TreeShop, share = 1): number {
  const keep = usable(s, shop.currency).mul(1 - share);
  const repeating = shop.repeats ? new Set(shop.repeats(s).map((r) => r.id)) : null;
  let bought = 0;
  if (repeating) {
    // 1.4.0: in rounds, cheapest first: each round looks at the tree once (buying a node can open its children, so a
    // few rounds); a fresh look after every purchase cost a rebuilt Nova Tree 190 ms (found by the speed budgets)
    for (let round = 0; round < 16 && bought < MAX_PER_PASS; round++) {
      const open = shop.buyable(s).filter((n) => !repeating.has(n.id)).sort((x, y) => x.cost.cmp(y.cost));
      let now = 0;
      for (const n of open) {
        if (n.cost.gt(usable(s, shop.currency).sub(keep))) break;
        if (shop.buy(s, n.id)) now++;
      }
      bought += now;
      if (now === 0) break;
    }
    return bought + buyRepeats(s, shop, keep);
  }
  for (; bought < MAX_PER_PASS; bought++) {
    const left = usable(s, shop.currency).sub(keep);
    let best: { id: string; cost: Decimal } | null = null;
    for (const n of shop.buyable(s)) if (n.cost.lte(left) && (!best || n.cost.lt(best.cost))) best = n;
    if (!best || !shop.buy(s, best.id)) break;
  }
  return bought;
}

function buyRepeats(s: GameState, shop: TreeShop, keep: Decimal): number {
  const list = shop.repeats!(s);
  if (list.length === 0) return 0;
  const each = usable(s, shop.currency).sub(keep).div(list.length);
  if (each.lte(0)) return 0;
  let levels = 0;
  for (const r of list) {
    const n = Math.min(1e9, maxAffordable(r.cost, r.growth, 0, each));
    if (n <= 0 || !spend(s, shop.currency, sumGeometric(r.cost, r.growth, 0, n))) continue;
    shop.addLevels!(s, r.id, n);
    levels += n;
    events.emit({ t: 'purchase', kind: 'node', id: r.id, amount: n });
  }
  if (levels > 0) invalidateStats();
  return levels;
}

/** Buys every Stardust upgrade it can, cheapest first. */
export function buyAllUpgrades(s: GameState, share = 1): number {
  const keep = usable(s, 'stardust').mul(1 - share);
  let bought = 0;
  for (const u of availableUpgrades(s)) {
    if (usable(s, 'stardust').sub(keep).lt(u.cost)) break; // cheapest first: the rest cost more
    if (buyUpgrade(s, u.id)) bought++;
  }
  return bought;
}
