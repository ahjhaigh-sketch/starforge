import { NOVA_NODE, NOVA_TREE, type NovaNode } from '../../content/novaTree';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import { milestoneReached } from '../layers';
import { cur, type GameState, spend } from '../state';
import { invalidateStats, registerSources, stat, type StatSource } from '../stats';

/**
 * Buying Nova Tree nodes with Nova Shards. A node is buyable once one of its parents is owned
 * (capstones need both). Repeatable nodes have levels with no cap. The first nodes of each arm
 * are an escalating pick: owning one makes the others pricier. Spending never weakens you:
 * lifetime shards, not banked ones, give the passive glow.
 */
export const nodeLevel = (s: GameState, id: string): number => s.novaTree[id] ?? 0;
export const ownsNode = (s: GameState, id: string): boolean => nodeLevel(s, id) > 0;

export function treeOpen(s: GameState): boolean {
  return milestoneReached(s, 'supernova', 'tree');
}

export function nodeReachable(s: GameState, n: NovaNode): boolean {
  if (n.parents.length === 0) return true;
  return n.arm === 'cap' ? n.parents.every((p) => ownsNode(s, p)) : n.parents.some((p) => ownsNode(s, p));
}

export function nodeCost(s: GameState, n: NovaNode): Decimal {
  let c = D(n.cost);
  if (n.repeat) c = c.mul(D(n.repeat.growth).pow(nodeLevel(s, n.id)));
  if (n.pick) {
    const others = NOVA_TREE.filter((m) => m.pick?.group === n.pick!.group && m.id !== n.id && ownsNode(s, m.id)).length;
    c = c.mul(D(n.pick.mult).pow(others));
  }
  return c;
}

export function canBuyNode(s: GameState, n: NovaNode): boolean {
  if (!treeOpen(s) || !nodeReachable(s, n)) return false;
  if (!n.repeat && ownsNode(s, n.id)) return false;
  return cur(s, 'shards').gte(nodeCost(s, n));
}

export function buyNode(s: GameState, id: string): boolean {
  const n = NOVA_NODE.get(id);
  if (!n || !canBuyNode(s, n)) return false;
  if (!spend(s, 'shards', nodeCost(s, n))) return false;
  s.novaTree[id] = nodeLevel(s, id) + 1;
  invalidateStats();
  events.emit({ t: 'purchase', kind: 'node', id, amount: 1 });
  return true;
}

/** Sum of a rule flag over owned nodes (keepConstants 0.1 + 0.15, startTier, quickBurn...). */
export function treeFlag(s: GameState, flag: string): number {
  let v = 0;
  for (const n of NOVA_TREE) if ('flag' in n.effect && n.effect.flag === flag && ownsNode(s, n.id)) v += n.effect.value * nodeLevel(s, n.id);
  return v;
}

function sourceFor(n: NovaNode): StatSource | null {
  const e = n.effect;
  if ('flag' in e) return null;
  const active = (s: GameState) => ownsNode(s, n.id);
  const base = { id: `nova.${n.id}`, stat: e.stat, label: `${n.name} (Nova Tree)`, active };
  if ('spsShare' in e) return { ...base, op: 'add', value: (s) => D(e.spsShare * nodeLevel(s, n.id)) };
  if ('perCount' in e) return { ...base, op: 'mul', value: (s) => D(1 + e.each * (s.stats[e.perCount] ?? 0)) };
  if (e.op === 'add') return { ...base, op: 'add', value: (s) => D(e.value * nodeLevel(s, n.id)) };
  if (e.op === 'pow') return { ...base, op: 'pow', value: () => D(e.value) };
  return { ...base, op: 'mul', value: (s) => D(e.value).pow(nodeLevel(s, n.id)) };
}

export function registerNovaTree(): void {
  registerSources(...NOVA_TREE.map(sourceFor).filter((x): x is StatSource => x !== null));
}
