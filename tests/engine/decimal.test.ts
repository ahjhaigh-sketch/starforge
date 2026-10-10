import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { D, maxAffordable, softcap, sumGeometric } from '../../src/engine/decimal';

describe('cost maths', () => {
  it('sums a geometric series exactly', () => {
    // 15, 17.25, 19.8375 -> 52.0875
    expect(sumGeometric(15, 1.15, 0, 3).toNumber()).toBeCloseTo(52.0875, 6);
    expect(sumGeometric(15, 1.15, 0, 0).toNumber()).toBe(0);
    expect(sumGeometric(10, 2, 3, 2).toNumber()).toBeCloseTo(240, 9);
  });

  it('max affordable buys as many as possible and never overspends', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1e6, noNaN: true }),
        fc.double({ min: 1.01, max: 3, noNaN: true }),
        fc.integer({ min: 0, max: 500 }),
        fc.double({ min: 0, max: 1e30, noNaN: true }),
        (base, ratio, owned, money) => {
          const m = D(money);
          const k = maxAffordable(base, ratio, owned, m);
          expect(sumGeometric(base, ratio, owned, k).lte(m.mul(1 + 1e-9))).toBe(true);
          expect(sumGeometric(base, ratio, owned, k + 1).gt(m)).toBe(true);
        },
      ),
      { numRuns: 400 },
    );
  });

  it('handles a million levels in one calculation', () => {
    const money = sumGeometric(10, 1.05, 0, 1_000_000);
    const t0 = performance.now();
    const k = maxAffordable(10, 1.05, 0, money);
    expect(performance.now() - t0).toBeLessThan(50);
    expect(Math.abs(k - 1_000_000)).toBeLessThanOrEqual(1);
  });

  it('softcaps only above the start', () => {
    expect(softcap(D(100), 1000, 0.5).toNumber()).toBe(100);
    expect(softcap(D(1e6), 1e4, 0.5).toNumber()).toBeCloseTo(1e5, 6);
  });
});
