import { cur } from '../engine/state';
import type { Tree } from '../engine/treeKit';
import { format } from '../ui/format';
import type { TreeNodeView } from '../ui/tree/TreeView';
import { game } from './game';
import { NODE_COLORS } from './novaReports';

/**
 * The read-out for any tree built on the tree kit (the Singularity Tree, the Galactic Tree): the
 * nodes you own or can reach, one step of fog beyond, and the links between them.
 */
export function kitTreeReport(tree: Tree): { open: boolean; money: string; nodes: TreeNodeView[]; edges: Array<[string, string]> } {
  const s = game.state;
  const n = s.settings.notation;
  const nodes: TreeNodeView[] = [];
  const shown = new Set<string>();
  for (const node of tree.def.nodes) {
    const owned = tree.owns(s, node.id);
    if (!owned && !tree.reachable(s, node)) continue;
    nodes.push({
      id: node.id,
      x: node.x,
      y: node.y,
      name: node.name,
      desc: node.desc,
      state: owned && !node.repeat ? 'owned' : tree.canBuy(s, node) ? 'affordable' : owned ? 'owned' : 'available',
      color: NODE_COLORS[node.color],
      cost: format(tree.cost(s, node), n),
      level: tree.level(s, node.id),
      repeat: !!node.repeat,
      big: !!node.big,
    });
    shown.add(node.id);
  }
  for (const node of tree.def.nodes) {
    if (shown.has(node.id) || !node.parents.some((p) => shown.has(p))) continue;
    nodes.push({ id: node.id, x: node.x, y: node.y, name: '???', desc: '', state: 'fog', color: '#2B2558', cost: '', level: 0, repeat: false });
  }
  const ids = new Set(nodes.map((x) => x.id));
  const edges: Array<[string, string]> = [];
  for (const node of tree.def.nodes) for (const p of node.parents) if (ids.has(node.id) && ids.has(p)) edges.push([p, node.id]);
  return { open: tree.def.open(s), money: format(cur(s, tree.def.currency), n), nodes, edges };
}
