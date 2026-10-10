import { useMemo, useState } from 'react';
import { NODE_COLORS, NODE_LEGEND } from '../app/novaReports';
import { type TreeNodeView, TreeView } from '../ui/tree/TreeView';

/**
 * Dev-only bench for the tree view (open /?dev=1&treebench=200): a spiral of N nodes, all
 * revealed, to check pan, zoom, pinch and keyboard stay smooth at 200+ nodes.
 */
export function TreeBench({ count }: { count: number }) {
  const [owned, setOwned] = useState<Set<string>>(() => new Set(['n0']));
  const nodes = useMemo((): TreeNodeView[] => {
    const kinds = Object.values(NODE_COLORS);
    return Array.from({ length: count }, (_, i) => {
      const a = i * 0.5;
      const r = 40 + i * 9;
      const id = `n${i}`;
      const parent = i === 0 ? null : `n${Math.floor((i - 1) / 2)}`;
      const own = owned.has(id);
      return {
        id,
        x: Math.round(Math.cos(a) * r),
        y: Math.round(Math.sin(a) * r),
        name: `Node ${i}`,
        desc: `Bench node ${i}.`,
        state: own ? 'owned' : parent && owned.has(parent) ? 'affordable' : 'available',
        color: kinds[i % kinds.length]!,
        cost: String(i + 1),
        level: 0,
        repeat: false,
        big: i === 0,
      };
    });
  }, [count, owned]);
  const edges = useMemo(() => nodes.slice(1).map((n, i): [string, string] => [`n${Math.floor(i / 2)}`, n.id]), [nodes]);
  return (
    <div className="tree-bench" data-testid="tree-bench">
      <TreeView nodes={nodes} edges={edges} onBuy={(id) => setOwned((o) => new Set(o).add(id))} currencyLabel="test" legend={NODE_LEGEND} />
      <span className="tree-bench-count" data-owned={owned.size}>
        {owned.size} owned
      </span>
    </div>
  );
}
