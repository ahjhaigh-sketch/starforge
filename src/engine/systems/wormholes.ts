import { BALANCE } from '../../content/balance';
import { WORMHOLE_NODE_BY_ID, WORMHOLE_NODES } from '../../content/mirror';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import { type GameState, spend } from '../state';
import { invalidateStats, registerSources, stat, type StatSource } from '../stats';
import { registerSystem, type TickContext, upkeepDue } from '../tick';

/**
 * The Wormhole Network (Game design: "Singularity"). From 6 Singularities.
 * A map of ten systems, each standing for one output multiplier. Spend Dark Matter to open a
 * wormhole from A to B with a share p (5% steps): A's multiplier is raised to the power (1 - p),
 * and B's is multiplied by (1 + p x log10(1 + A))^weight. At most half of a system's orders of
 * magnitude can leave it. Both sides show in the stat breakdowns as "Wormhole: A to B".
 * Inputs (log10 of each system's multiplier) are read 5 times a second and kept, so a loop of links
 * never recurses inside the stat pipeline; through the log it settles within a few reads.
 */
const W = BALANCE.wormholes;

export const wormholesOpen = (s: GameState) => (s.stats.singularitiesAll ?? 0) >= W.singularities;

/** log10(1 + multiplier) of each system, from the last tick (not saved: rebuilt on the first tick). */
const inputs = new WeakMap<GameState, Record<string, number>>();

export function inputOf(s: GameState, node: string): number {
  return inputs.get(s)?.[node] ?? 0;
}

export function refreshInputs(s: GameState): void {
  const next: Record<string, number> = {};
  for (const n of WORMHOLE_NODES) {
    const v = stat(s, n.stat).add(1).log10().toNumber();
    next[n.id] = Number.isFinite(v) ? Math.max(0, v) : 0;
  }
  inputs.set(s, next);
}

export const linkCost = (s: GameState): Decimal => D(W.linkCost).mul(D(W.linkGrowth).pow(s.wormholes.links.length));
export const outShare = (s: GameState, from: string) => s.wormholes.links.filter((l) => l.from === from).reduce((a, l) => a + l.share, 0);

const roundShare = (p: number) => Math.round(p / W.shareStep) * W.shareStep;

/** Opens a wormhole from one system to another. */
export function openLink(s: GameState, from: string, to: string, share: number = W.shareDefault): boolean {
  if (!wormholesOpen(s) || from === to || !WORMHOLE_NODE_BY_ID.has(from) || !WORMHOLE_NODE_BY_ID.has(to)) return false;
  if (s.wormholes.links.length >= W.maxLinks || s.wormholes.links.some((l) => l.from === from && l.to === to)) return false;
  const room = W.maxOut - outShare(s, from);
  const p = Math.min(roundShare(share), roundShare(room + 1e-9));
  if (p < W.shareStep - 1e-9 || !spend(s, 'darkMatter', linkCost(s))) return false;
  s.wormholes.links.push({ from, to, share: p });
  s.stats.wormholesOpened = (s.stats.wormholesOpened ?? 0) + 1;
  invalidateStats();
  events.emit({ t: 'purchase', kind: 'wormhole', id: `${from}>${to}`, amount: 1 });
  return true;
}

/** Changes a wormhole's share (free), within what its source system has left to give. */
export function setLinkShare(s: GameState, index: number, share: number): void {
  const l = s.wormholes.links[index];
  if (!l) return;
  const room = W.maxOut - (outShare(s, l.from) - l.share);
  l.share = Math.max(W.shareStep, Math.min(roundShare(share), roundShare(room + 1e-9)));
  invalidateStats();
}

/** Closes a wormhole. The Dark Matter isn't refunded, but the next one costs less again. */
export function closeLink(s: GameState, index: number): void {
  if (index < 0 || index >= s.wormholes.links.length) return;
  s.wormholes.links.splice(index, 1);
  invalidateStats();
}

const linkOf = (s: GameState, from: string, to: string) => s.wormholes.links.find((l) => l.from === from && l.to === to);

/** What a link gives its target right now. */
export function linkGain(s: GameState, from: string, to: string): Decimal {
  const l = linkOf(s, from, to);
  const node = WORMHOLE_NODE_BY_ID.get(to);
  if (!l || !node) return D(1);
  return D(1 + l.share * inputOf(s, from)).pow(node.weight);
}

export function registerWormholes(): void {
  const sources: StatSource[] = [];
  for (const a of WORMHOLE_NODES) {
    for (const b of WORMHOLE_NODES) {
      if (a.id === b.id) continue;
      const label = `Wormhole: ${a.name} to ${b.name}`;
      const active = (s: GameState) => !!linkOf(s, a.id, b.id);
      sources.push(
        { id: `wormhole.out.${a.id}.${b.id}`, stat: a.stat, op: 'pow', label, value: (s) => D(1 - (linkOf(s, a.id, b.id)?.share ?? 0)), active },
        { id: `wormhole.in.${a.id}.${b.id}`, stat: b.stat, op: 'mul', label, value: (s) => linkGain(s, a.id, b.id), active },
      );
    }
  }
  registerSources(...sources);
  registerSystem({
    id: 'wormholes',
    order: 2,
    tick: (s: GameState, _dt: number, ctx: TickContext) => {
      // as often as stats are rebuilt (5 times a real second): in between the inputs can't change
      if (s.wormholes.links.length > 0 && upkeepDue(s, 'wormholes', ctx, 0.2)) refreshInputs(s);
    },
  });
}
