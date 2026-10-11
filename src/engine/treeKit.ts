import type { NodeColor } from '../content/novaTree';
import { D, type Decimal } from './decimal';
import { events } from './events';
import { cur, type GameState, spend } from './state';
import { invalidateStats, registerSources, type StatSource } from './stats';

/**
 * One engine for the big trees from the Singularity on (the Singularity Tree now, the Galactic
 * Tree later), so each new tree is data: its nodes, its currency and where its levels are saved.
 * Rules, the same as the Nova and Nebula Trees: a node is buyable once a parent is owned (all of
 * them when `needsAll`); repeatable nodes level up with no cap at growth^level; stat effects go
 * through the stat pipeline, labelled "<node> (<tree>)"; flags are rule switches summed over owned
 * nodes.
 */
export type KitEffect = { stat: string; op: 'add' | 'mul' | 'pow'; value: number } | { flag: string; value: number };

export interface KitNode {
  id: string;
  name: string;
  desc: string;
  /** Which part of the tree it belongs to (arm, ring sector). */
  group: string;
  parents: readonly string[];
  /** Needs every parent (capstones), not just one. */
  needsAll?: boolean;
  cost: number;
  effect: KitEffect;
  color: NodeColor;
  repeat?: { growth: number };
  /** Drawn larger: roots and capstones. */
  big?: boolean;
  x: number;
  y: number;
}

export interface TreeDef {
  id: string;
  /** "Singularity Tree": the label stat breakdowns show. */
  label: string;
  currency: string;
  nodes: readonly KitNode[];
  levels: (s: GameState) => Record<string, number>;
  open: (s: GameState) => boolean;
  /** Raises every multiplier node's effect to this power (the Galactic Tree's Arms constant). */
  power?: (s: GameState) => number;
}

export interface Tree {
  def: TreeDef;
  byId: ReadonlyMap<string, KitNode>;
  level(s: GameState, id: string): number;
  owns(s: GameState, id: string): boolean;
  reachable(s: GameState, n: KitNode): boolean;
  cost(s: GameState, n: KitNode): Decimal;
  canBuy(s: GameState, n: KitNode): boolean;
  buy(s: GameState, id: string): boolean;
  flag(s: GameState, flag: string): number;
  register(): void;
}

export function makeTree(def: TreeDef): Tree {
  const byId = new Map(def.nodes.map((n) => [n.id, n]));
  const level = (s: GameState, id: string) => def.levels(s)[id] ?? 0;
  const owns = (s: GameState, id: string) => level(s, id) > 0;
  const reachable = (s: GameState, n: KitNode) => n.parents.length === 0 || (n.needsAll ? n.parents.every((p) => owns(s, p)) : n.parents.some((p) => owns(s, p)));
  const cost = (s: GameState, n: KitNode) => (n.repeat ? D(n.cost).mul(D(n.repeat.growth).pow(level(s, n.id))) : D(n.cost));
  const canBuy = (s: GameState, n: KitNode) => def.open(s) && reachable(s, n) && (!!n.repeat || !owns(s, n.id)) && cur(s, def.currency).gte(cost(s, n));
  const tree: Tree = {
    def,
    byId,
    level,
    owns,
    reachable,
    cost,
    canBuy,
    buy(s, id) {
      const n = byId.get(id);
      if (!n || !canBuy(s, n) || !spend(s, def.currency, cost(s, n))) return false;
      def.levels(s)[id] = level(s, id) + 1;
      invalidateStats();
      events.emit({ t: 'purchase', kind: def.id, id, amount: 1 });
      return true;
    },
    flag(s, f) {
      let v = 0;
      for (const n of def.nodes) if ('flag' in n.effect && n.effect.flag === f && owns(s, n.id)) v += n.effect.value * level(s, n.id);
      return v;
    },
    register() {
      const sources: StatSource[] = [];
      for (const n of def.nodes) {
        const e = n.effect;
        if ('flag' in e) continue;
        const base = { id: `${def.id}.${n.id}`, stat: e.stat, label: `${n.name} (${def.label})`, active: (s: GameState) => owns(s, n.id) };
        if (e.op === 'add') sources.push({ ...base, op: 'add', value: (s) => D(e.value * level(s, n.id)) });
        else if (e.op === 'pow') sources.push({ ...base, op: 'pow', value: () => D(e.value) });
        else sources.push({ ...base, op: 'mul', value: (s) => D(e.value).pow(level(s, n.id) * (def.power?.(s) ?? 1)) });
      }
      registerSources(...sources);
    },
  };
  return tree;
}
