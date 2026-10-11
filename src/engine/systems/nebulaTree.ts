import { NEBULA_NODE, NEBULA_TREE, type NebulaFlag, type NebulaNode } from '../../content/nebulaTree';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import { cur, type GameState, spend } from '../state';
import { invalidateStats, registerSources, type StatSource } from '../stats';

/**
 * Buying Nebula Tree nodes with Nebula Essence. A node is buyable once its parent is owned
 * (capstones need both of theirs); echoes level up with no cap. The tree is kept through every
 * Nebula. Same rules as the Nova Tree, its own nodes and currency.
 */
export const nebulaNodeLevel = (s: GameState, id: string): number => s.nebulaTree[id] ?? 0;
export const ownsNebulaNode = (s: GameState, id: string): boolean => nebulaNodeLevel(s, id) > 0;
export const nebulaTreeOpen = (s: GameState) => (s.stats.nebulasAll ?? 0) >= 1;

export function nebulaNodeReachable(s: GameState, n: NebulaNode): boolean {
  if (n.parents.length === 0) return true;
  return n.wisp === 'cap' ? n.parents.every((p) => ownsNebulaNode(s, p)) : n.parents.some((p) => ownsNebulaNode(s, p));
}

export function nebulaNodeCost(s: GameState, n: NebulaNode): Decimal {
  const c = D(n.cost);
  return n.repeat ? c.mul(D(n.repeat.growth).pow(nebulaNodeLevel(s, n.id))) : c;
}

export function canBuyNebulaNode(s: GameState, n: NebulaNode): boolean {
  if (!nebulaTreeOpen(s) || !nebulaNodeReachable(s, n)) return false;
  if (!n.repeat && ownsNebulaNode(s, n.id)) return false;
  return cur(s, 'essence').gte(nebulaNodeCost(s, n));
}

export function buyNebulaNode(s: GameState, id: string): boolean {
  const n = NEBULA_NODE.get(id);
  if (!n || !canBuyNebulaNode(s, n) || !spend(s, 'essence', nebulaNodeCost(s, n))) return false;
  s.nebulaTree[id] = nebulaNodeLevel(s, id) + 1;
  invalidateStats();
  events.emit({ t: 'purchase', kind: 'nebulaNode', id, amount: 1 });
  return true;
}

/** Sum of a rule flag over owned nodes (keepShards 0.1 + 0.15 + 0.25, startNovas 3 + 5 + 7...). */
export function nebulaFlag(s: GameState, flag: NebulaFlag): number {
  let v = 0;
  for (const n of NEBULA_TREE) if ('flag' in n.effect && n.effect.flag === flag && ownsNebulaNode(s, n.id)) v += n.effect.value * nebulaNodeLevel(s, n.id);
  return v;
}

function sourceFor(n: NebulaNode): StatSource | null {
  const e = n.effect;
  if ('flag' in e) return null;
  const base = { id: `nebula.${n.id}`, stat: e.stat, label: `${n.name} (Nebula Tree)`, active: (s: GameState) => ownsNebulaNode(s, n.id) };
  if (e.op === 'add') return { ...base, op: 'add', value: (s) => D(e.value * nebulaNodeLevel(s, n.id)) };
  if (e.op === 'pow') return { ...base, op: 'pow', value: () => D(e.value) };
  return { ...base, op: 'mul', value: (s) => D(e.value).pow(nebulaNodeLevel(s, n.id)) };
}

export function registerNebulaTree(): void {
  registerSources(...NEBULA_TREE.map(sourceFor).filter((x): x is StatSource => x !== null));
}
