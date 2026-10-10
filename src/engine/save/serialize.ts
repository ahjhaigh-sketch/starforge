import { Decimal } from '../decimal';

/**
 * GameState <-> plain JSON values. Decimals become "D:<string>" so they survive JSON
 * (Decimal.toJSON would otherwise turn them into untagged strings we could not tell apart).
 */
export function toPlain(value: unknown): unknown {
  if (value instanceof Decimal) return `D:${value.toString()}`;
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = toPlain(v);
    return out;
  }
  return value;
}

export function fromPlain(value: unknown): unknown {
  if (typeof value === 'string' && value.startsWith('D:')) return new Decimal(value.slice(2));
  if (Array.isArray(value)) return value.map(fromPlain);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = fromPlain(v);
    return out;
  }
  return value;
}

/** Finds the first broken number (NaN, Infinity, or a non-finite Decimal). Returns its path or null. */
export function findBrokenNumber(value: unknown, path = 'state'): string | null {
  if (value instanceof Decimal) return value.isNan() || !value.isFinite() ? path : null;
  if (typeof value === 'number') return Number.isFinite(value) ? null : path;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findBrokenNumber(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const hit = findBrokenNumber(v, `${path}.${k}`);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Lays a loaded save over a fresh default state: fields added in newer versions get their defaults,
 * records (like currencies) keep every key from the save, and wrongly typed values fall back.
 */
export function mergeDefaults<T>(defaults: T, loaded: unknown): T {
  return merge(defaults, loaded) as T;
}

function merge(def: unknown, val: unknown): unknown {
  if (val === undefined || val === null) return def;
  if (def instanceof Decimal) return val instanceof Decimal ? val : def;
  if (Array.isArray(def)) return Array.isArray(val) ? val : def;
  if (def && typeof def === 'object') {
    if (typeof val !== 'object' || Array.isArray(val) || val instanceof Decimal) return def;
    const d = def as Record<string, unknown>;
    const v = val as Record<string, unknown>;
    const out: Record<string, unknown> = { ...d };
    for (const k of Object.keys(v)) out[k] = k in d ? merge(d[k], v[k]) : v[k];
    return out;
  }
  return typeof val === typeof def ? val : def;
}
