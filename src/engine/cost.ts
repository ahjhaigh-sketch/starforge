import { D, type Decimal, type DecimalSource, maxAffordable, sumGeometric, ZERO } from './decimal';

/**
 * Bracketed geometric costs: the price of level n is base x ratio^n, and the ratio steps up at
 * level thresholds (engines: x1.15 up to 200 owned, x1.25 after; Cosmic Constants: g, then g^1.1
 * after 1,000, then g^1.2 after 100,000). Bulk cost and Max are closed-form inside each bracket
 * and summed across brackets, so buying a million levels is a handful of calculations.
 */
export interface Bracket {
  /** First level this ratio applies to. The first bracket starts at 0. */
  from: number;
  ratio: DecimalSource;
}

export interface CostCurve {
  base: DecimalSource;
  brackets: readonly Bracket[];
}

/** Price of the item bought at level `n` (0 = the first one). */
export function priceAt(curve: CostCurve, n: number): Decimal {
  let price = D(curve.base);
  const bs = curve.brackets;
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i]!;
    if (n <= b.from) break;
    const end = bs[i + 1]?.from ?? Infinity;
    price = price.mul(D(b.ratio).pow(Math.min(n, end) - b.from));
  }
  return price;
}

/** Walks the brackets that levels [owned, owned + k) touch, as (price of first, ratio, count) runs. */
function* segments(curve: CostCurve, owned: number, k: number): Generator<{ first: Decimal; ratio: DecimalSource; count: number; end: number }> {
  const bs = curve.brackets;
  let n = owned;
  let left = k;
  let first = priceAt(curve, n);
  for (let i = 0; i < bs.length && left > 0; i++) {
    const end = bs[i + 1]?.from ?? Infinity;
    if (n >= end) continue;
    const count = Math.min(left, end - n);
    yield { first, ratio: bs[i]!.ratio, count, end };
    first = first.mul(D(bs[i]!.ratio).pow(count));
    n += count;
    left -= count;
  }
}

/** Exact total cost of buying `k` more when `owned` are already bought. */
export function bulkCost(curve: CostCurve, owned: number, k: number): Decimal {
  if (k <= 0) return ZERO;
  let total = ZERO;
  for (const seg of segments(curve, owned, k)) total = total.add(sumGeometric(seg.first, seg.ratio, 0, seg.count));
  return total;
}

/** The most that `money` buys from `owned` on. Never overspends (property-tested). */
export function maxBuy(curve: CostCurve, owned: number, money: Decimal, limit = Number.MAX_SAFE_INTEGER): number {
  let bought = 0;
  let left = money;
  for (const seg of segments(curve, owned, limit)) {
    const can = Math.min(seg.count, maxAffordable(seg.first, seg.ratio, 0, left));
    bought += can;
    if (can < seg.count) break;
    left = left.sub(sumGeometric(seg.first, seg.ratio, 0, can));
    if (seg.end === Infinity) break;
  }
  // Summing brackets separately can drift by a hair at bracket edges: confirm against the exact total.
  while (bought > 0 && bulkCost(curve, owned, bought).gt(money)) bought--;
  return bought;
}
