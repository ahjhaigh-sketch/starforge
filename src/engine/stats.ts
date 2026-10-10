import { D, type Decimal, softcap } from './decimal';
import type { GameState } from './state';

/**
 * The stat pipeline. Every multiplier in the game goes through here, in this order:
 *   ((base + additions) x multipliers) ^ exponents, then softcaps.
 * Content declares its contributions next to itself; results are cached until invalidated
 * (once per tick and after every player action), and breakdown() powers tooltips and Stats.
 */
export type StatOp = 'add' | 'mul' | 'pow';

export interface StatSource {
  id: string;
  stat: string;
  op: StatOp;
  label: string;
  value: (s: GameState) => Decimal;
  active?: (s: GameState) => boolean;
}

export interface StatDef {
  id: string;
  label: string;
  base: (s: GameState) => Decimal;
  softcaps?: Array<{ label: string; start: (s: GameState) => Decimal; power: number }>;
}

export interface BreakdownLine {
  label: string;
  op: StatOp | 'base' | 'softcap';
  value: Decimal;
}

const defs = new Map<string, StatDef>();
const sources = new Map<string, StatSource[]>();
const sourceIds = new Set<string>();
const cache = new Map<string, Decimal>();
let cacheState: GameState | null = null;

export function defineStat(def: StatDef): void {
  defs.set(def.id, def);
}

export function registerSources(...list: StatSource[]): void {
  for (const src of list) {
    if (sourceIds.has(src.id)) continue; // idempotent: hot reload and tests may register twice
    sourceIds.add(src.id);
    const arr = sources.get(src.stat) ?? [];
    arr.push(src);
    sources.set(src.stat, arr);
  }
}

export function invalidateStats(): void {
  cache.clear();
}

function activeSources(s: GameState, id: string): StatSource[] {
  return (sources.get(id) ?? []).filter((src) => !src.active || src.active(s));
}

export function stat(s: GameState, id: string): Decimal {
  if (cacheState !== s) {
    cache.clear();
    cacheState = s;
  }
  const hit = cache.get(id);
  if (hit) return hit;
  const def = defs.get(id);
  let v = def ? def.base(s) : D(0);
  const act = activeSources(s, id);
  for (const src of act) if (src.op === 'add') v = v.add(src.value(s));
  for (const src of act) if (src.op === 'mul') v = v.mul(src.value(s));
  for (const src of act) if (src.op === 'pow') v = v.pow(src.value(s));
  for (const sc of def?.softcaps ?? []) v = softcap(v, sc.start(s), sc.power);
  cache.set(id, v);
  return v;
}

export function breakdown(s: GameState, id: string): BreakdownLine[] {
  const def = defs.get(id);
  const lines: BreakdownLine[] = [];
  if (def) lines.push({ label: 'Base', op: 'base', value: def.base(s) });
  const act = activeSources(s, id);
  for (const op of ['add', 'mul', 'pow'] as const) {
    for (const src of act) if (src.op === op) lines.push({ label: src.label, op, value: src.value(s) });
  }
  for (const sc of def?.softcaps ?? []) {
    const start = sc.start(s);
    if (stat(s, id).gte(start)) lines.push({ label: sc.label, op: 'softcap', value: start });
  }
  return lines;
}

export function statLabel(id: string): string {
  return defs.get(id)?.label ?? id;
}

/** For tests: clear every definition and source. */
export function resetStatRegistry(): void {
  defs.clear();
  sources.clear();
  sourceIds.clear();
  cache.clear();
  cacheState = null;
}
