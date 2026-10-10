import { bulkCost, type CostCurve, maxBuy } from './cost';
import type { Decimal } from './decimal';
import type { BuyAmount } from './state';

/** What one click of a buy button would do with the current buy amount. */
export interface PurchasePlan {
  count: number;
  cost: Decimal;
  canAfford: boolean;
}

/**
 * Fixed amounts (x1, x10, x100, x1,000, typed) buy exactly that many or nothing, and show the
 * exact total. Max buys as many as the money covers; when that's none it shows the price of one.
 */
export function planPurchase(curve: CostCurve, owned: number, money: Decimal, amount: BuyAmount, custom: number): PurchasePlan {
  if (amount === 'max') {
    const n = maxBuy(curve, owned, money);
    if (n === 0) return { count: 1, cost: bulkCost(curve, owned, 1), canAfford: false };
    return { count: n, cost: bulkCost(curve, owned, n), canAfford: true };
  }
  const count = amount === 'custom' ? Math.max(1, Math.floor(custom) || 1) : amount;
  const cost = bulkCost(curve, owned, count);
  return { count, cost, canAfford: cost.lte(money) };
}
