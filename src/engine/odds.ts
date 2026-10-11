import { D, type Decimal } from './decimal';
import { nextPoisson, type RngState } from './rng';

/**
 * Shared odds maths for runes, auras and mutations (Math and balance: "Rune maths").
 * log10 of the effective odds "1 in eff": N if N <= 10, else max(10, (N / L)^(1 / R)).
 * Anomalies ignore luck.
 */
export function effLog10(log10N: number, luck: number, root: number, anomaly = false): number {
  if (anomaly || log10N <= 1) return log10N;
  return Math.max(1, (log10N - Math.log10(Math.max(1, luck))) / Math.max(1, root));
}

/**
 * How many of `tries` independent tries hit at chance p (given as log10 p): a Poisson draw from
 * the stream below `poissonBelow` expected hits, the expectation above. The work is the same for
 * 10 tries or e30.
 */
export function drawHits(rng: RngState, tries: Decimal, log10p: number, poissonBelow: number): Decimal {
  const lambda = tries.mul(D(10).pow(log10p));
  return lambda.lt(poissonBelow) ? D(nextPoisson(rng, lambda.toNumber())) : lambda.floor();
}
