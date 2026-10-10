import { bulkCost, type CostCurve, maxBuy } from './cost';
import { type Decimal, ONE } from './decimal';
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
export function planPurchase(
  curve: CostCurve,
  owned: number,
  money: Decimal,
  amount: BuyAmount,
  custom: number,
  /** Discounts (a Wish comet halves engine prices) scale every price the same way. */
  costMult: Decimal = ONE,
  /** The next milestone level, for the 'next' amount (buys up to it). */
  nextAt?: number,
): PurchasePlan {
  if (amount === 'next') {
    const count = Math.max(1, (nextAt ?? owned + 1) - owned);
    const cost = bulkCost(curve, owned, count).mul(costMult);
    return { count, cost, canAfford: cost.lte(money) };
  }
  if (amount === 'max') {
    let n = maxBuy(curve, owned, money.div(costMult));
    // dividing by the discount can round by a hair: never let Max claim more than the money covers
    while (n > 0 && bulkCost(curve, owned, n).mul(costMult).gt(money)) n--;
    if (n === 0) return { count: 1, cost: bulkCost(curve, owned, 1).mul(costMult), canAfford: false };
    return { count: n, cost: bulkCost(curve, owned, n).mul(costMult), canAfford: true };
  }
  const count = amount === 'custom' ? Math.max(1, Math.floor(custom) || 1) : amount;
  const cost = bulkCost(curve, owned, count).mul(costMult);
  return { count, cost, canAfford: cost.lte(money) };
}

/**
 * The same plan for a purchase with a level cap (a beam that stops at 8 levels, six crucibles).
 * Fixed amounts shrink to what's left; at the cap the plan is for nothing (count 0).
 */
export function planLimited(curve: CostCurve, owned: number, money: Decimal, amount: BuyAmount, custom: number, limit: number, nextAt?: number): PurchasePlan {
  const left = Math.max(0, Math.floor(limit - owned));
  if (left === 0) return { count: 0, cost: bulkCost(curve, owned, 1), canAfford: false };
  if (amount === 'max') {
    let n = maxBuy(curve, owned, money, left);
    while (n > 0 && bulkCost(curve, owned, n).gt(money)) n--;
    if (n === 0) return { count: 1, cost: bulkCost(curve, owned, 1), canAfford: false };
    return { count: n, cost: bulkCost(curve, owned, n), canAfford: true };
  }
  const want = amount === 'next' ? Math.max(1, (nextAt ?? owned + 1) - owned) : amount === 'custom' ? Math.max(1, Math.floor(custom) || 1) : amount;
  const count = Math.min(want, left);
  const cost = bulkCost(curve, owned, count);
  return { count, cost, canAfford: cost.lte(money) };
}
