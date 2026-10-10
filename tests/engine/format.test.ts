import { describe, expect, it } from 'vitest';
import { D } from '../../src/engine/decimal';
import { format, formatCount, formatMult, formatRate, formatTime } from '../../src/ui/format';

describe('format', () => {
  it.each([
    [0, '0'],
    [9.5, '9.5'],
    [9, '9'],
    [999, '999'],
    [999.9, '999'],
    [1000, '1.00K'],
    [1234, '1.23K'],
    [12345, '12.3K'],
    [123456, '123K'],
    [1.23e6, '1.23M'],
    [1e9, '1.00B'],
    [4.5e15, '4.50Qa'],
    [1e36, '1.00UDc'],
  ])('suffix %s -> %s', (n, out) => {
    expect(format(n)).toBe(out);
  });

  it('forgives float error from logarithm-based maths', () => {
    expect(format(239.99999999999994)).toBe('240');
    expect(format(899.9999999999998)).toBe('900');
    expect(format(1999.9999999999)).toBe('2.00K');
    expect(format(9.999999999999)).toBe('10');
  });

  it('switches to scientific past the last suffix and handles huge numbers', () => {
    expect(format(D('1e60'))).toBe('1.00e60');
    expect(format(D('1e1000'))).toBe('1.00e1000');
    expect(format(D('1.5e123456'))).toBe('1.50e123456');
    expect(format(D('ee10'))).toBe('e1.00e10');
  });

  it('supports scientific and engineering everywhere', () => {
    expect(format(1.23e6, 'scientific')).toBe('1.23e6');
    expect(format(1.23e7, 'engineering')).toBe('12.3e6');
    expect(format(500, 'scientific')).toBe('500');
  });

  it('never shows raw long numbers', () => {
    for (let e = 3; e < 400; e += 7) {
      const s = format(D(10).pow(e).mul(1.234));
      expect(s.length).toBeLessThanOrEqual(10);
      expect(s).not.toMatch(/\d{5,}/);
    }
  });

  it('formats negatives, rates, multipliers, counts and times', () => {
    expect(format(-1234)).toBe('-1.23K');
    expect(formatRate(1234)).toBe('+1.23K/s');
    expect(formatMult(1.25)).toBe('x1.25');
    expect(formatMult(12345)).toBe('x12.3K');
    expect(formatCount(42)).toBe('42');
    expect(formatCount(1_230_000)).toBe('1.23M');
    expect(formatTime(45)).toBe('45s');
    expect(formatTime(200)).toBe('3m 20s');
    expect(formatTime(7980)).toBe('2h 13m');
    expect(formatTime(Infinity)).toBe('∞');
  });
});
