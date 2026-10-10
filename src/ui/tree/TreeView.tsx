import { type KeyboardEvent, memo, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from 'react';

/**
 * The one tree view (CLAUDE.md rule 9), built for big trees: pan (drag), zoom (wheel, pinch,
 * + and -), keyboard (arrows move between nodes, Enter buys), a minimap, search by name,
 * "centre on next affordable", reveal-as-you-buy, and colours that mean something.
 * Panning and zooming write the SVG transform directly, so 200+ nodes never re-render per frame.
 */
export type NodeState = 'owned' | 'affordable' | 'available' | 'fog';

export interface TreeNodeView {
  id: string;
  x: number;
  y: number;
  name: string;
  desc: string;
  state: NodeState;
  /** Fill colour for this node's kind (unlock, add, multiply, exponent, change, pick). */
  color: string;
  cost: string;
  level: number;
  repeat: boolean;
  /** Bigger nodes: the root and capstones. */
  big?: boolean;
}

export interface TreeViewProps {
  nodes: TreeNodeView[];
  edges: Array<[string, string]>;
  onBuy: (id: string) => void;
  /** e.g. "Nova Shards": shown on the buy button. */
  currencyLabel: string;
  legend: Array<{ color: string; label: string }>;
}

interface View {
  x: number;
  y: number;
  k: number;
}

const R = 22;
const MIN_K = 0.25;
const MAX_K = 2.2;

const NodeGlyph = memo(function NodeGlyph({ n, selected, match }: { n: TreeNodeView; selected: boolean; match: boolean }) {
  const r = n.big ? R * 1.4 : R;
  if (n.state === 'fog') {
    return (
      <g transform={`translate(${n.x} ${n.y})`} className="tnode fog" data-node={n.id}>
        <circle r={r * 0.8} />
        <text dy="0.35em">?</text>
      </g>
    );
  }
  return (
    <g transform={`translate(${n.x} ${n.y})`} className={`tnode ${n.state}${selected ? ' sel' : ''}${match ? ' match' : ''}`} data-node={n.id}>
      {n.state === 'affordable' && <circle r={r + 7} className="halo" />}
      <circle r={r} style={{ fill: n.color }} className="body" />
      <circle r={r} className="gloss" />
      {n.state === 'owned' && !n.repeat && <path d="M-8 1l5 5 10-11" className="tick" />}
      {n.repeat && n.level > 0 && (
        <text dy="0.35em" className="lvl">
          {n.level}
        </text>
      )}
      <text y={r + 15} className="label">
        {n.name}
      </text>
    </g>
  );
});

export function TreeView({ nodes, edges, onBuy, currencyLabel, legend }: TreeViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const layer = useRef<SVGGElement>(null);
  const view = useRef<View>({ x: 0, y: 0, k: 0.6 });
  // 0 until measured: the first fit must use the real size (phones are far narrower than a guess)
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [vp, setVp] = useState<View>(view.current); // for the minimap rectangle (updated at the end of a gesture)
  const [sel, setSel] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; k: number; dist: number; moved: boolean; node: string | null } | null>(null);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const visibleEdges = useMemo(() => edges.filter(([a, b]) => byId.has(a) && byId.has(b)), [edges, byId]);
  const bounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    }
    return nodes.length ? { minX: minX - 60, minY: minY - 60, maxX: maxX + 60, maxY: maxY + 60 } : { minX: -100, minY: -100, maxX: 100, maxY: 100 };
  }, [nodes]);

  const apply = useCallback((v: View, commit = false) => {
    view.current = v;
    layer.current?.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.k})`);
    if (commit) setVp(v);
  }, []);

  /** Centre the view on a world point. */
  const centre = useCallback(
    (wx: number, wy: number, k = view.current.k) => apply({ k, x: size.w / 2 - wx * k, y: size.h / 2 - wy * k }, true),
    [apply, size],
  );

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // first open: fit the visible part of the tree
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || size.w < 10 || size.h < 10 || nodes.length === 0) return;
    fitted.current = true;
    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;
    const k = Math.max(MIN_K, Math.min(1, Math.min(size.w / w, size.h / h)));
    centre((bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2, k);
  }, [size, nodes.length, bounds, centre]);

  const zoomAt = (px: number, py: number, factor: number, commit = true) => {
    const v = view.current;
    const k = Math.max(MIN_K, Math.min(MAX_K, v.k * factor));
    const wx = (px - v.x) / v.k;
    const wy = (py - v.y) / v.k;
    apply({ k, x: px - wx * k, y: py - wy * k }, commit);
  };

  const local = (e: { clientX: number; clientY: number }) => {
    const r = host.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('.tree-ui')) return;
    // remember the node under the pointer now: once captured, later events target the host
    const node = (e.target as Element).closest('[data-node]')?.getAttribute('data-node') ?? null;
    try {
      host.current?.setPointerCapture(e.pointerId);
    } catch {
      /* the pointer is already gone: nothing to capture */
    }
    pointers.current.set(e.pointerId, local(e));
    const pts = [...pointers.current.values()];
    const v = view.current;
    gesture.current = {
      x: pts[0]!.x - v.x,
      y: pts[0]!.y - v.y,
      k: v.k,
      dist: pts.length > 1 ? Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) : 0,
      moved: pts.length > 1,
      node,
    };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, local(e));
    const pts = [...pointers.current.values()];
    const g = gesture.current;
    if (pts.length >= 2) {
      // pinch: zoom around the midpoint
      const d = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      if (g.dist > 0) {
        const mx = (pts[0]!.x + pts[1]!.x) / 2;
        const my = (pts[0]!.y + pts[1]!.y) / 2;
        zoomAt(mx, my, d / g.dist, false);
        g.dist = d;
      }
      g.moved = true;
      return;
    }
    const p = pts[0]!;
    const v = view.current;
    const nx = p.x - g.x;
    const ny = p.y - g.y;
    if (Math.abs(nx - v.x) + Math.abs(ny - v.y) > 2) g.moved = true;
    apply({ k: v.k, x: nx, y: ny });
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      if (g && !g.moved) {
        // a click: select the node under the pointer
        const n = g.node ? byId.get(g.node) : undefined;
        setSel(n && n.state !== 'fog' ? n.id : null);
      }
      gesture.current = null;
      setVp(view.current);
    } else {
      const pts = [...pointers.current.values()];
      const v = view.current;
      gesture.current = { x: pts[0]!.x - v.x, y: pts[0]!.y - v.y, k: v.k, dist: 0, moved: true, node: null };
    }
  };
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    const p = local(e);
    zoomAt(p.x, p.y, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  };

  const real = useMemo(() => nodes.filter((n) => n.state !== 'fog'), [nodes]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? real.filter((n) => n.name.toLowerCase().includes(q)) : [];
  }, [query, real]);

  /** Arrow keys: the nearest node roughly in that direction. */
  const step = (dx: number, dy: number) => {
    const from = sel ? byId.get(sel) : undefined;
    if (!from) {
      const first = real.find((n) => n.state === 'affordable') ?? real[0];
      if (first) {
        setSel(first.id);
        centre(first.x, first.y);
      }
      return;
    }
    let best: TreeNodeView | null = null;
    let bestScore = Infinity;
    for (const n of real) {
      if (n.id === from.id) continue;
      const vx = n.x - from.x;
      const vy = n.y - from.y;
      const along = vx * dx + vy * dy;
      if (along <= 0) continue;
      const across = Math.abs(vx * dy - vy * dx);
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = n;
      }
    }
    if (best) {
      setSel(best.id);
      const v = view.current;
      const sx = best.x * v.k + v.x;
      const sy = best.y * v.k + v.y;
      if (sx < 40 || sy < 40 || sx > size.w - 40 || sy > size.h - 40) centre(best.x, best.y);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const keys: Record<string, () => void> = {
      ArrowUp: () => step(0, -1),
      ArrowDown: () => step(0, 1),
      ArrowLeft: () => step(-1, 0),
      ArrowRight: () => step(1, 0),
      Enter: () => sel && onBuy(sel),
      ' ': () => sel && onBuy(sel),
      '+': () => zoomAt(size.w / 2, size.h / 2, 1.25),
      '=': () => zoomAt(size.w / 2, size.h / 2, 1.25),
      '-': () => zoomAt(size.w / 2, size.h / 2, 0.8),
    };
    const f = keys[e.key];
    if (f) {
      e.preventDefault();
      e.stopPropagation();
      f();
    }
  };

  const nextAffordable = () => {
    const n = real.find((x) => x.state === 'affordable') ?? real.find((x) => x.state === 'available');
    if (n) {
      setSel(n.id);
      centre(n.x, n.y, Math.max(view.current.k, 0.8));
    }
  };

  const findNext = () => {
    if (matches.length === 0) return;
    const n = matches[matchIndex % matches.length]!;
    setMatchIndex((i) => i + 1);
    setSel(n.id);
    centre(n.x, n.y, Math.max(view.current.k, 0.9));
  };

  const selected = sel ? byId.get(sel) : undefined;
  const matchSet = useMemo(() => new Set(matches.map((m) => m.id)), [matches]);

  // minimap
  const mmW = 150;
  const mmH = 110;
  const bw = bounds.maxX - bounds.minX;
  const bh = bounds.maxY - bounds.minY;
  const mk = Math.min(mmW / bw, mmH / bh);
  const mm = (x: number, y: number) => ({ x: (x - bounds.minX) * mk + (mmW - bw * mk) / 2, y: (y - bounds.minY) * mk + (mmH - bh * mk) / 2 });
  const vpTL = mm(-vp.x / vp.k, -vp.y / vp.k);
  const onMinimap = (e: PointerEvent<SVGSVGElement>) => {
    e.stopPropagation();
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - r.left - (mmW - bw * mk) / 2;
    const py = e.clientY - r.top - (mmH - bh * mk) / 2;
    centre(px / mk + bounds.minX, py / mk + bounds.minY);
  };

  return (
    <div
      ref={host}
      className="tree-view well"
      tabIndex={0}
      role="application"
      aria-label="Skill tree. Drag to pan, scroll or pinch to zoom, arrow keys to move between nodes, Enter to buy."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
    >
      <svg width={size.w} height={size.h} className="tree-svg">
        <g ref={layer} transform={`translate(${view.current.x} ${view.current.y}) scale(${view.current.k})`}>
          {visibleEdges.map(([a, b]) => {
            const na = byId.get(a)!;
            const nb = byId.get(b)!;
            const lit = na.state === 'owned' && nb.state === 'owned';
            return <line key={`${a}-${b}`} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} className={lit ? 'edge lit' : 'edge'} />;
          })}
          {nodes.map((n) => (
            <NodeGlyph key={n.id} n={n} selected={n.id === sel} match={matchSet.has(n.id)} />
          ))}
        </g>
      </svg>

      <div className="tree-ui tree-tools">
        <input
          type="search"
          placeholder="Search nodes"
          aria-label="Search nodes by name"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setMatchIndex(0);
          }}
          onKeyDown={(e) => e.key === 'Enter' && findNext()}
        />
        {query && <span className="tree-count">{matches.length} found</span>}
        <button type="button" className="chunk pop" onClick={nextAffordable}>
          Next to buy
        </button>
        <button type="button" className="chunk pop" onClick={() => zoomAt(size.w / 2, size.h / 2, 1.25)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="chunk pop" onClick={() => zoomAt(size.w / 2, size.h / 2, 0.8)} aria-label="Zoom out">
          −
        </button>
      </div>

      <svg className="tree-ui tree-minimap" width={mmW} height={mmH} onPointerDown={onMinimap} aria-label="Minimap: click to jump there">
        {real.map((n) => {
          const p = mm(n.x, n.y);
          return <circle key={n.id} cx={p.x} cy={p.y} r={n.state === 'owned' ? 2.4 : 1.8} style={{ fill: n.state === 'owned' ? n.color : '#6a5ad8' }} />;
        })}
        <rect x={vpTL.x} y={vpTL.y} width={(size.w / vp.k) * mk} height={(size.h / vp.k) * mk} className="mm-view" />
      </svg>

      <div className="tree-ui tree-legend">
        {legend.map((l) => (
          <span key={l.label}>
            <i style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      {selected && (
        <div className="tree-ui tree-card chunk" data-selected={selected.id}>
          <b>
            {selected.name}
            {selected.repeat && <span className="num"> Lv {selected.level}</span>}
          </b>
          <span>{selected.desc}</span>
          {selected.state === 'owned' && !selected.repeat ? (
            <span className="owned">Owned</span>
          ) : (
            <button
              type="button"
              className={`btn chunk pop sm ${selected.state === 'affordable' ? '' : 'cant'}`}
              style={{ ['--c' as string]: selected.state === 'affordable' ? 'var(--lime)' : '#5A5F8F' }}
              disabled={selected.state !== 'affordable'}
              onClick={() => onBuy(selected.id)}
            >
              Buy · {selected.cost} {currencyLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
