import { NOVA_TREE, type NodeColor } from '../content/novaTree';
import { menuHidden } from './menus';
import { withSigil } from './sigilReports';
import { SYSTEMS } from '../content/systems';
import { layer, resetPreview, resetsDone } from '../engine/layers';
import { cur } from '../engine/state';
import { AUTO_BUYERS, autoSetting, autoUnlocked } from '../engine/systems/automation';
import { canBuyNode, nodeCost, nodeLevel, nodeReachable, ownsNode, treeOpen } from '../engine/systems/novaTree';
import { runSeconds, supernovaReady } from '../engine/systems/supernova';
import { reqProgress, reqText } from '../engine/systems/unlocks';
import type { TreeNodeView } from '../ui/tree/TreeView';
import { format, formatTime } from '../ui/format';
import { game } from './game';
import { codexPreviewText } from './forgeReports';
import { forgeOpen } from '../engine/systems/forge';

/** Read-outs for the Supernova confirm screen, the Nova Tree, Automation and the Ascent map. */
const n = () => game.state.settings.notation;

export const NODE_COLORS: Record<NodeColor, string> = {
  unlock: '#4FB6FF',
  add: '#7DFF5A',
  mul: '#FF9E3D',
  pow: '#B06BFF',
  change: '#FF4F6E',
  pick: '#2EE6FF',
};

export const NODE_LEGEND = [
  { color: NODE_COLORS.unlock, label: 'Unlocks or keeps' },
  { color: NODE_COLORS.add, label: 'Adds' },
  { color: NODE_COLORS.mul, label: 'Multiplies' },
  { color: NODE_COLORS.pow, label: 'Exponent' },
  { color: NODE_COLORS.change, label: 'Changes a rule' },
  { color: NODE_COLORS.pick, label: 'Pick one: the others get pricier' },
];

export interface SupernovaReport {
  ready: boolean;
  gain: string;
  resets: string[];
  kept: Array<{ label: string; why: string }>;
  done: number;
  run: string;
  milestones: Array<{ at: number; text: string; reached: boolean }>;
  /** What the Codex would get, once the Starforge is open. */
  codex: string;
}

export function supernovaReport(): SupernovaReport | null {
  const s = game.state;
  const def = layer('supernova');
  const p = resetPreview(s, 'supernova');
  if (!def || !p) return null;
  const done = resetsDone(s, def);
  return {
    ready: supernovaReady(s),
    gain: format(p.gain, n()),
    resets: p.resets,
    kept: p.kept,
    done,
    run: formatTime(runSeconds(s)),
    milestones: def.milestones.map((m) => ({ at: m.at, text: m.text, reached: done >= m.at })),
    codex: forgeOpen(s) ? codexPreviewText() : '',
  };
}

/** The Nova Tree, revealed as you buy: owned and buyable nodes show, their children are "?" fog. */
export function treeReport(): { open: boolean; shards: string; nodes: TreeNodeView[]; edges: Array<[string, string]> } {
  const s = game.state;
  const money = cur(s, 'shards');
  const nodes: TreeNodeView[] = [];
  const shown = new Set<string>();
  for (const node of NOVA_TREE) {
    const owned = ownsNode(s, node.id);
    const reach = nodeReachable(s, node);
    if (!owned && !reach) continue;
    shown.add(node.id);
    const cost = nodeCost(s, node);
    nodes.push({
      id: node.id,
      x: node.x,
      y: node.y,
      name: node.name,
      desc: node.desc,
      state: owned && !node.repeat ? 'owned' : canBuyNode(s, node) ? 'affordable' : owned ? 'owned' : 'available',
      color: NODE_COLORS[node.color],
      cost: format(cost, n()),
      level: nodeLevel(s, node.id),
      repeat: !!node.repeat,
      big: node.arm === 'root' || node.arm === 'cap',
    });
    if (owned && node.repeat && money.gte(cost)) nodes[nodes.length - 1]!.state = 'affordable';
  }
  // one step of fog beyond what you can reach
  for (const node of NOVA_TREE) {
    if (shown.has(node.id)) continue;
    if (node.parents.some((p) => shown.has(p))) {
      nodes.push({ id: node.id, x: node.x, y: node.y, name: '???', desc: '', state: 'fog', color: '#2B2558', cost: '', level: 0, repeat: false });
    }
  }
  const ids = new Set(nodes.map((x) => x.id));
  const edges: Array<[string, string]> = [];
  for (const node of NOVA_TREE) for (const p of node.parents) if (ids.has(node.id) && ids.has(p)) edges.push([p, node.id]);
  withSigil('nova', nodes, edges);
  return { open: treeOpen(s), shards: format(money, n()), nodes, edges };
}

export interface AutoRow {
  id: string;
  name: string;
  unlocked: boolean;
  on: boolean;
  spend: number;
  req: string;
  /** What it spends ('' for a reset, which spends nothing). */
  spends: string;
}

export function automationReport(): AutoRow[] {
  const s = game.state;
  const def = layer('supernova');
  return AUTO_BUYERS.map((a) => {
    const m = def?.milestones.find((x) => x.id === a.milestone);
    const st = autoSetting(s, a.id);
    return { id: a.id, name: a.name, unlocked: autoUnlocked(s, a), on: st.on, spend: st.spend, req: a.req ? reqText(a.req) : m ? `${m.at} Supernova${m.at === 1 ? '' : 's'}` : '', spends: a.spends ?? (a.kind === 'tree' ? 'that tree\'s currency' : 'Stardust') };
  });
}

/** The Ascent: every system as a deck on a vertical star map, grouped by stage. */
export interface AscentDeck {
  id: string;
  name: string;
  icon: string;
  color: string;
  state: 'lit' | 'soon' | 'next' | 'dim';
  req: string;
  pct: number;
  panel?: string;
  /** 1.2.0: what it is, and whether it's off the rails (hidden by you, or running itself). */
  blurb: string;
  tucked: boolean;
}

export interface AscentStage {
  stage: string;
  decks: AscentDeck[];
  /** Systems open in this stage, of how many. */
  lit: number;
  total: number;
  /** The furthest stage you've reached. */
  here: boolean;
}

const STAGES: Array<{ name: string; ids: string[] }> = [
  { name: 'Protostar', ids: ['ascent', 'upgrades', 'medals', 'stats'] },
  { name: 'Red Dwarf to Golden Sun', ids: ['belt', 'level', 'constants', 'quests'] },
  { name: 'Blue Giant and beyond', ids: ['orbitals', 'mastery', 'wardrobe'] },
  { name: 'Supernova', ids: ['novatree', 'automation', 'starforge', 'drill', 'weather'] },
  { name: 'Supernova extras', ids: ['fusion', 'attune', 'merchant', 'alchemy', 'expeditions'] },
  { name: 'Nebula', ids: ['nebula', 'nebulatree', 'runes', 'index', 'wyrms'] },
  { name: 'Nebula depths', ids: ['starring', 'mutations', 'auras', 'nursery', 'spectral', 'tarot'] },
  { name: 'Singularity', ids: ['singularity', 'singularitytree', 'blackhole', 'reactor', 'prismwheel', 'defense'] },
  { name: 'Challenges', ids: ['trials', 'spire', 'leviathans', 'scaletree'] },
  { name: 'Mirror and Wormholes', ids: ['wormholes', 'mirror'] },
  { name: 'Galactic', ids: ['galactic', 'galaxymap', 'galactictree', 'observatory', 'starchart'] },
  { name: 'Building the galaxy', ids: ['megastructures', 'colonies', 'terraform'] },
  { name: 'Big Crunch', ids: ['bigcrunch', 'eternity', 'echoes'] },
  { name: 'Multiverse', ids: ['multiverse', 'universeforge', 'sparktree'] },
  { name: 'Secrets', ids: ['altar'] },
];

/** Every system id on the Ascent map (a test checks that each built system is on it). */
export const ASCENT_IDS: readonly string[] = STAGES.flatMap((st) => st.ids);

export function ascentReport(): AscentStage[] {
  const s = game.state;
  let nextShown = 0;
  const stages = STAGES.map((st) => ({
    stage: st.name,
    lit: 0,
    total: 0,
    here: false,
    decks: st.ids.flatMap((id): AscentDeck[] => {
      const x = SYSTEMS.find((y) => y.id === id);
      if (!x) return [];
      const met = s.unlocked.includes(x.id) || x.req.kind === 'none';
      let state: AscentDeck['state'];
      if (met && x.built) state = 'lit';
      else if (met) state = 'soon';
      else if (nextShown++ < 4) state = 'next';
      else state = 'dim';
      return [{ id: x.id, name: x.name, icon: x.icon, color: x.color, state, req: x.built ? reqText(x.req) : 'Arrives in a later update', pct: Math.floor(reqProgress(s, x.req) * 100), panel: met && x.built ? x.panel : undefined, blurb: x.blurb, tucked: state === 'lit' && menuHidden(s, x.id) }];
    }),
  }));
  for (const st of stages) {
    st.total = st.decks.length;
    st.lit = st.decks.filter((d) => d.state === 'lit').length;
  }
  const furthest = stages.reduce((at, st, i) => (st.lit > 0 && st.stage !== 'Secrets' ? i : at), 0);
  stages[furthest]!.here = true;
  return stages.reverse(); // Protostar at the bottom, the furthest stage at the top
}

/** The top of the Ascent: how much of the map is lit, and the nearest thing to unlock. */
export function ascentOverview(): { lit: number; total: number; next: string; nextReq: string; nextPct: number } {
  const s = game.state;
  const all = SYSTEMS.filter((x) => x.built && ASCENT_IDS.includes(x.id));
  const lit = all.filter((x) => s.unlocked.includes(x.id) || x.req.kind === 'none').length;
  const locked = all.filter((x) => !(s.unlocked.includes(x.id) || x.req.kind === 'none')).map((x) => ({ x, p: reqProgress(s, x.req) }));
  locked.sort((a, b) => b.p - a.p);
  const near = locked[0];
  return { lit, total: all.length, next: near?.x.name ?? '', nextReq: near ? reqText(near.x.req) : '', nextPct: near ? Math.floor(near.p * 100) : 100 };
}
