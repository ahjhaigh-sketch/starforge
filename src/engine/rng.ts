/**
 * Seeded random numbers (sfc32). The four-number state lives in the save, so results are
 * reproducible: reloading never re-rolls an outcome (no save-scumming offline rune rolls).
 */
export type RngState = [number, number, number, number];

function splitmix32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x9e3779b9) >>> 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    t ^= t >>> 15;
    return t >>> 0;
  };
}

export function seedRng(seed: number): RngState {
  const next = splitmix32(seed);
  return [next(), next(), next(), next()];
}

/** Advances the state in place and returns a float in [0, 1). */
export function nextFloat(st: RngState): number {
  let [a, b, c, d] = st;
  const t = (((a + b) >>> 0) + d) >>> 0;
  d = (d + 1) >>> 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) >>> 0;
  c = ((c << 21) | (c >>> 11)) >>> 0;
  c = (c + t) >>> 0;
  st[0] = a >>> 0;
  st[1] = b >>> 0;
  st[2] = c;
  st[3] = d;
  return t / 4294967296;
}

/** Integer in [min, max] inclusive. */
export function nextInt(st: RngState, min: number, max: number): number {
  return min + Math.floor(nextFloat(st) * (max - min + 1));
}

/** Uniform float in [min, max). */
export function nextRange(st: RngState, min: number, max: number): number {
  return min + nextFloat(st) * (max - min);
}

/**
 * A Poisson-distributed count with mean `lambda`, from the seeded stream: exact (Knuth) for small
 * means, the normal approximation above 30. Rune rolls use it so the work per tick stays the same
 * however many runes are rolled.
 */
export function nextPoisson(st: RngState, lambda: number): number {
  if (!(lambda > 0)) return 0;
  if (lambda < 30) {
    const limit = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= nextFloat(st);
    } while (p > limit);
    return k - 1;
  }
  // Box-Muller: one standard normal from two uniforms
  const u1 = Math.max(1e-12, nextFloat(st));
  const u2 = nextFloat(st);
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z));
}
