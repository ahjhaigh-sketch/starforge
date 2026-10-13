import { D, Decimal, type DecimalSource } from '../engine/decimal';
import type { Notation } from '../engine/state';

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc'];
const SUFFIX_LIMIT = SUFFIXES.length * 3; // suffixes run up to (but not including) 1e51

/** Floor that forgives tiny float error (break_eternity works through logarithms: 240 may arrive as 239.99999999). */
const fl = (x: number): number => Math.floor(x * (1 + 1e-9));

/** 3 significant figures: 1.23, 12.3, 123. */
function sig3(v: number): string {
  if (v >= 100) return fl(v).toString();
  if (v >= 10) return (fl(v * 10) / 10).toFixed(1);
  return (fl(v * 100) / 100).toFixed(2);
}

function scientific(x: Decimal, engineering: boolean): string {
  const e = x.log10();
  if (e.lt(1e6)) {
    let exp = fl(e.toNumber());
    if (engineering) exp -= ((exp % 3) + 3) % 3;
    const mantissa = Math.pow(10, e.toNumber() - exp);
    // floating error can give 9.9999 -> keep it under 10 (or 1000 for engineering)
    return `${sig3(Math.min(mantissa, engineering ? 999.99 : 9.999))}e${exp}`;
  }
  // e >= 1e6: show the exponent itself formatted
  if (x.layer <= 2 && e.log10().lt(1e6)) return `e${scientific(e, false)}`;
  if (x.layer <= 3) return `ee${scientific(e.log10(), false)}`;
  return `F${x.slog().toNumber().toFixed(2)}`;
}

/**
 * Every number shown in the game goes through here.
 * Under 1,000: whole numbers (one decimal under 10). Then 1.23K, 12.3M, 123B ... to QiDc,
 * then scientific (1.23e456), then e1.23e10, ee12.3 and F-notation for power towers.
 */
export function format(value: DecimalSource, notation: Notation = 'suffix'): string {
  const x = value instanceof Decimal ? value : D(value);
  if (x.isNan()) return 'NaN';
  if (!x.isFinite()) return x.lt(0) ? '-∞' : '∞';
  if (x.lt(0)) return `-${format(x.neg(), notation)}`;
  if (x.lt(1000)) {
    const n = x.toNumber();
    const whole = fl(n);
    if (n < 10 && Math.abs(n - whole) > 1e-9 * Math.max(1, n)) return (fl(n * 10) / 10).toFixed(1).replace(/\.0$/, '');
    return whole.toString();
  }
  if (notation === 'scientific') return scientific(x, false);
  if (notation === 'engineering') return scientific(x, true);
  const e = fl(x.log10().toNumber());
  if (e >= SUFFIX_LIMIT) return scientific(x, false);
  let group = Math.floor(e / 3);
  let v = x.div(D(10).pow(group * 3)).toNumber();
  // guard floating error at exact powers of 1,000
  if (v >= 1000 && group + 1 < SUFFIXES.length) {
    v /= 1000;
    group += 1;
  } else if (v < 1 && group > 1) {
    v *= 1000;
    group -= 1;
  }
  return `${sig3(v)}${SUFFIXES[group]}`;
}

/** A per-second rate: "+1.23K/s". */
export function formatRate(value: DecimalSource, notation: Notation = 'suffix'): string {
  return `+${format(value, notation)}/s`;
}

/** A multiplier: "x1.25", "x12.3K". */
export function formatMult(value: DecimalSource, notation: Notation = 'suffix'): string {
  const x = value instanceof Decimal ? value : D(value);
  if (x.lt(1000)) {
    const n = x.toNumber();
    // x3 not x3.00, x1.5 not x1.50
    const txt = n >= 100 ? String(Math.floor(n)) : n >= 10 ? n.toFixed(1) : n.toFixed(2);
    return `x${txt.includes('.') ? txt.replace(/\.?0+$/, '') : txt}`;
  }
  return `x${format(x, notation)}`;
}

/** Whole counts such as levels and owned engines: 999, 1.23K, 12.3M. */
export function formatCount(n: number, notation: Notation = 'suffix'): string {
  return n < 1000 ? Math.floor(n).toString() : format(n, notation);
}

/** Durations: "45s", "3m 20s", "2h 13m", "4d 6h". */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '∞';
  // 1.3.0: past a thousand years, days as a number (the playtest read "1.38e+41d 23h")
  if (seconds >= 1000 * 365 * 86400) return `${format(seconds / 86400)} days`;
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** Multiverse Sparks come in fifths: 10.4 Sparks reads "10.4", not "10". From 1,000 up, as format(). */
export function formatFifths(value: DecimalSource, notation: Notation = 'suffix'): string {
  const x = value instanceof Decimal ? value : D(value);
  if (!x.isFinite() || x.lt(0) || x.gte(1000)) return format(x, notation);
  return (Math.round(x.toNumber() * 5) / 5).toFixed(1).replace(/\.0$/, '');
}
