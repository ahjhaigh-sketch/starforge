import { BALANCE } from '../../content/balance';
import { rollSky, STAR_CHART, type SkyStar } from '../../content/galactic';
import { D } from '../decimal';
import { events } from '../events';
import { onAnyReset } from '../layers';
import { nextFloat } from '../rng';
import { gain, type GameState } from '../state';
import { makeTree } from '../treeKit';

/**
 * The Observatory (Game design: "Galactic Rebirth"; EUT's Astronomy). From the first Galactic Rebirth.
 * - Each Galactic run brings a new sky: 24 stars rolled from a seed saved with the game, each with
 *   a mass, a temperature (its colour) and a distance.
 * - Link stars into a constellation (8 links, more from the Stardust Chart). A link scores its
 *   length x the square root of both masses x how near the pair is; every closed loop in the shape
 *   adds 25% to the total. The score depends only on which pairs are linked, never on the order.
 * - Recording a better constellation on this sky pays the improvement in Star Charts, which buy
 *   the Stardust Chart (a small tree on the shared tree engine).
 */
const G = BALANCE.galactic;

export const observatoryOpen = (s: GameState) => (s.stats.galacticsAll ?? 0) >= 1;

export const starChart = makeTree({
  id: 'starChart',
  label: 'Stardust Chart',
  currency: 'starCharts',
  nodes: STAR_CHART,
  levels: (s) => s.starChart,
  open: observatoryOpen,
});

let skyCache: { seed: number; stars: SkyStar[] } | null = null;
export function skyOf(s: GameState): SkyStar[] {
  if (!skyCache || skyCache.seed !== s.observatory.seed) skyCache = { seed: s.observatory.seed, stars: rollSky(s.observatory.seed) };
  return skyCache.stars;
}

export const maxLinks = (s: GameState) => G.links + Math.floor(starChart.flag(s, 'moreLinks'));

/** One link's worth: length (in tenths of the sky) x sqrt(both masses) x nearness (10 / mean distance in light years). */
export function linkScore(a: SkyStar, b: SkyStar): number {
  const len = Math.hypot(a.x - b.x, a.y - b.y) * 10;
  const near = 10 / ((a.dist + b.dist) / 2);
  return len * Math.sqrt(a.mass * b.mass) * near;
}

/** Closed loops in the drawn shape: links - stars used + separate pieces. */
export function loopsOf(links: ReadonlyArray<readonly [number, number]>): number {
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    return r;
  };
  for (const [a, b] of links) {
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
  }
  let pieces = parent.size;
  for (const [a, b] of links) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      parent.set(ra, rb);
      pieces--;
    }
  }
  return links.length - parent.size + pieces;
}

/** The constellation's score: identical links (in any order, either way round) give identical scores. */
export function constellationScore(stars: readonly SkyStar[], links: ReadonlyArray<readonly [number, number]>): number {
  // sort the links first so floating-point sums run in one order whatever order they were drawn in
  const norm = links.map(([a, b]): [number, number] => (a < b ? [a, b] : [b, a])).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  let sum = 0;
  for (const [a, b] of norm) {
    const sa = stars[a];
    const sb = stars[b];
    if (sa && sb) sum += linkScore(sa, sb);
  }
  return Math.round(sum * (1 + G.loopBonus * loopsOf(norm)) * 100) / 100;
}

export const currentScore = (s: GameState) => constellationScore(skyOf(s), s.observatory.links);

/** Draws a link between two stars, or erases it if it's already there. */
export function toggleLink(s: GameState, a: number, b: number): boolean {
  const n = skyOf(s).length;
  if (!observatoryOpen(s) || a === b || a < 0 || b < 0 || a >= n || b >= n) return false;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  const i = s.observatory.links.findIndex(([x, y]) => x === lo && y === hi);
  if (i >= 0) {
    s.observatory.links.splice(i, 1);
    return true;
  }
  if (s.observatory.links.length >= maxLinks(s)) return false;
  s.observatory.links.push([lo, hi]);
  return true;
}

export function clearLinks(s: GameState): void {
  s.observatory.links = [];
}

/** Records the constellation: a better score than this sky's best pays the difference in Star Charts. */
export function recordConstellation(s: GameState): number {
  if (!observatoryOpen(s)) return 0;
  const score = currentScore(s);
  const paid = Math.floor(score) - Math.floor(s.observatory.best);
  if (paid <= 0) return 0;
  s.observatory.best = score;
  gain(s, 'starCharts', D(paid));
  s.stats.starScoreBest = Math.max(s.stats.starScoreBest ?? 0, Math.floor(score));
  events.emit({ t: 'toast', title: 'Constellation recorded', body: `Star Score ${Math.floor(score)}: +${paid} Star Charts.`, icon: 'telescope' });
  return paid;
}

export function registerObservatory(): void {
  starChart.register();
  // every Galactic run brings a new sky, from the seeded generator saved with the game
  onAnyReset((s, layerId) => {
    if (layerId !== 'galactic') return;
    s.observatory.seed = Math.floor(nextFloat(s.rng) * 2 ** 31);
    s.observatory.links = [];
    s.observatory.best = 0;
  });
}
