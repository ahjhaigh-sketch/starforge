import Decimal from 'break_eternity.js';

export { Decimal };
export type DecimalSource = Decimal | number | string;

/** Shorthand constructor. Every currency amount in the game is a Decimal. */
export const D = (x: DecimalSource): Decimal => new Decimal(x);

export const ZERO = D(0);
export const ONE = D(1);

/** True when the Decimal is a real, finite number (no NaN, no Infinity). */
export function isFiniteDecimal(x: Decimal): boolean {
  return !x.isNan() && x.isFinite();
}

/**
 * Total cost of buying `k` items when the n-th item (counting from 0) costs base * ratio^n
 * and `owned` are already bought: base * ratio^owned * (ratio^k - 1) / (ratio - 1).
 */
export function sumGeometric(base: DecimalSource, ratio: DecimalSource, owned: number, k: number): Decimal {
  if (k <= 0) return ZERO;
  const r = D(ratio);
  const first = D(base).mul(r.pow(owned));
  return first.mul(r.pow(k).sub(1)).div(r.sub(1));
}

/**
 * The most items affordable with `money` (closed form, so a million levels is one calculation).
 * Corrected by a couple of exact checks so floating-point error never lets Max overspend.
 */
export function maxAffordable(base: DecimalSource, ratio: DecimalSource, owned: number, money: Decimal): number {
  const r = D(ratio);
  const first = D(base).mul(r.pow(owned));
  if (money.lt(first)) return 0;
  const estimate = money.mul(r.sub(1)).div(first).add(1).log10().div(r.log10()).floor();
  let k = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, estimate.toNumber()));
  if (!Number.isFinite(k)) k = 0;
  for (let i = 0; i < 4 && k > 0 && sumGeometric(base, ratio, owned, k).gt(money); i++) k--;
  for (let i = 0; i < 4 && sumGeometric(base, ratio, owned, k + 1).lte(money); i++) k++;
  return k;
}

/** Above `start`, growth is slowed to the power `power` (0.5 = square-root softcap). */
export function softcap(value: Decimal, start: DecimalSource, power: number): Decimal {
  const s = D(start);
  if (value.lte(s)) return value;
  return s.mul(value.div(s).pow(power));
}

/** The value softcap() turns into `out` (its inverse, for "next one at" read-outs). */
export function unSoftcap(out: Decimal, start: DecimalSource, power: number): Decimal {
  const s = D(start);
  if (out.lte(s)) return out;
  return s.mul(out.div(s).pow(1 / power));
}

/**
 * 1.4.0: above `start`, growth is logarithmic: start x (1 + log10(value / start))^power. For a gain that
 * a runaway currency feeds (Galaxy Cores from Dark Matter that reached e62 in the playtest), so a
 * thousand times more in gives a few times more out, not a thousand.
 */
export function logSoftcap(value: Decimal, start: DecimalSource, power: number): Decimal {
  const s = D(start);
  if (value.lte(s)) return value;
  return s.mul(value.div(s).log10().add(1).pow(power));
}

/** The value logSoftcap() turns into `out` (its inverse). */
export function unLogSoftcap(out: Decimal, start: DecimalSource, power: number): Decimal {
  const s = D(start);
  if (out.lte(s)) return out;
  return s.mul(D(10).pow(out.div(s).pow(1 / power).sub(1)));
}

export function dmax(a: Decimal, b: Decimal): Decimal {
  return a.gte(b) ? a : b;
}

export function dmin(a: Decimal, b: Decimal): Decimal {
  return a.lte(b) ? a : b;
}
