import { BALANCE } from '../content/balance';
import { withSigil } from './sigilReports';
import { NEBULA_TREE } from '../content/nebulaTree';
import { RUNE_RARITIES, RUNE_STAT_WORDS, runesOf, SHRINE_BY_ID, SHRINES, type RuneDef } from '../content/runes';
import { D, type Decimal } from '../engine/decimal';
import { layer, milestoneReached, resetPreview, resetsDone } from '../engine/layers';
import { cur } from '../engine/state';
import { stat } from '../engine/stats';
import { nebulaGain, nebulaReady, nextEssenceAt, runShards } from '../engine/systems/nebula';
import { canBuyNebulaNode, nebulaNodeCost, nebulaNodeLevel, nebulaNodeReachable, nebulaTreeOpen, ownsNebulaNode } from '../engine/systems/nebulaTree';
import { copies, rollSpeed, runeBulk, runeEffLog, runeLevel, runePrice, runesPerSecond, shrineOpen, shrineStars, shrineState, worthChasing } from '../engine/systems/runes';
import { runeMutations } from '../engine/systems/mutations';
import { MUTATIONS } from '../content/runeDepth';
import { reqText } from '../engine/systems/unlocks';
import { format, formatCount, formatFifths, formatTime } from '../ui/format';
import type { TreeNodeView } from '../ui/tree/TreeView';
import { NODE_COLORS } from './novaReports';
import { game } from './game';

/** Read-outs for the Nebula panel, its confirm screen and tree, and the rune shrines. */
const n = () => game.state.settings.notation;

export interface NebulaReport {
  essence: string;
  gain: string;
  ready: boolean;
  supernovas: number;
  need: number;
  shards: string;
  shardsNeed: string;
  next: string;
  done: number;
  autoUnlocked: boolean;
  autoAt: number;
  milestones: Array<{ at: number; text: string; reached: boolean }>;
}

export function nebulaReport(): NebulaReport {
  const s = game.state;
  const def = layer('nebula')!;
  const done = resetsDone(s, def);
  return {
    essence: format(cur(s, 'essence'), n()),
    gain: format(nebulaGain(s), n()),
    ready: nebulaReady(s),
    supernovas: s.stats.supernovas ?? 0,
    need: BALANCE.nebula.supernovas,
    shards: format(runShards(s), n()),
    shardsNeed: format(BALANCE.nebula.runShards, n()),
    next: format(nextEssenceAt(s), n()),
    done,
    autoUnlocked: milestoneReached(s, 'nebula', 'autoNova'),
    autoAt: s.nebula.autoAt.toNumber(),
    milestones: def.milestones.map((m) => ({ at: m.at, text: m.text, reached: (s.stats.nebulasAll ?? 0) >= m.at })),
  };
}

export interface LayerConfirm {
  name: string;
  action: string;
  gain: string;
  currency: string;
  ready: boolean;
  resets: string[];
  kept: Array<{ label: string; why: string }>;
}

/** The confirm screen for any layer, straight from the reset function's own preview. */
export function layerConfirm(id: string): LayerConfirm | null {
  const s = game.state;
  const def = layer(id);
  const p = resetPreview(s, id);
  if (!def || !p) return null;
  return { name: def.name, action: def.action, gain: (def.currency === 'sparks' ? formatFifths : format)(p.gain, n()), currency: def.currency === 'essence' ? 'Nebula Essence' : def.currency, ready: def.ready(s), resets: p.resets, kept: p.kept };
}

export function nebulaTreeReport(): { open: boolean; essence: string; nodes: TreeNodeView[]; edges: Array<[string, string]> } {
  const s = game.state;
  const money = cur(s, 'essence');
  const nodes: TreeNodeView[] = [];
  const shown = new Set<string>();
  for (const node of NEBULA_TREE) {
    const owned = ownsNebulaNode(s, node.id);
    if (!owned && !nebulaNodeReachable(s, node)) continue;
    const cost = nebulaNodeCost(s, node);
    nodes.push({
      id: node.id,
      x: node.x,
      y: node.y,
      name: node.name,
      desc: node.desc,
      state: owned && !node.repeat ? 'owned' : canBuyNebulaNode(s, node) ? 'affordable' : owned ? 'owned' : 'available',
      color: NODE_COLORS[node.color],
      cost: format(cost, n()),
      level: nebulaNodeLevel(s, node.id),
      repeat: !!node.repeat,
      big: node.wisp === 'root' || node.wisp === 'cap',
    });
    shown.add(node.id);
  }
  // one step of fog beyond what you can reach
  for (const node of NEBULA_TREE) {
    if (shown.has(node.id) || !node.parents.some((p) => shown.has(p))) continue;
    nodes.push({ id: node.id, x: node.x, y: node.y, name: '???', desc: '', state: 'fog', color: '#2B2558', cost: '', level: 0, repeat: false });
  }
  const ids = new Set(nodes.map((x) => x.id));
  const edges: Array<[string, string]> = [];
  for (const node of NEBULA_TREE) for (const p of node.parents) if (ids.has(node.id) && ids.has(p)) edges.push([p, node.id]);
  withSigil('nebula', nodes, edges);
  return { open: nebulaTreeOpen(s), essence: format(money, n()), nodes, edges };
}

// ---------- runes ----------

export const oddsText = (log10: number): string => {
  if (log10 < 3) return `1 in ${formatCount(Math.round(10 ** log10 * 100) / 100, n())}`;
  return `1 in ${format(D(10).pow(log10), n())}`;
};

export const rarityName = (r: RuneDef) => (r.hidden ? 'Hidden' : r.anomaly ? 'Anomaly' : (RUNE_RARITIES[r.tier]?.name ?? ''));

export interface RuneRow {
  id: string;
  name: string;
  rarity: string;
  color: string;
  odds: string;
  base: string;
  copies: string;
  level: number;
  cap: number;
  effects: string;
  found: boolean;
  hidden: boolean;
  anomaly: boolean;
  /** Mutated copies (Golden, Rainbow, Void, Prismatic) the rune has. */
  muts: Array<{ id: string; name: string; color: string; count: string }>;
}

export interface ShrineReport {
  tabs: Array<{ id: string; name: string; color: string; open: boolean; req: string; stars: number }>;
  stars: number;
  id: string;
  name: string;
  color: string;
  open: boolean;
  currency: string;
  have: string;
  price: string;
  rps: string;
  speed: string;
  bulk: string;
  spend: string;
  lasts: string;
  auto: boolean;
  canRoll: boolean;
  rate: number;
  luck: number;
  keep: number;
  rarities: string[];
  worth: string;
  found: number;
  total: number;
  runes: RuneRow[];
}

/** Income per second of a shrine's currency, for "you can roll for". */
function income(id: string): Decimal {
  const s = game.state;
  if (id === 'stardust') return stat(s, 'stardustPerSec');
  if (id === 'shards') return stat(s, 'passiveShards').mul(D(1));
  return D(0);
}

export function shrineReport(id: string): ShrineReport {
  const s = game.state;
  const sh = SHRINE_BY_ID.get(id) ?? SHRINES[0]!;
  const st = shrineState(s, sh.id);
  const rps = runesPerSecond(s, sh.id);
  const price = runePrice(s, sh);
  const spend = rps.mul(price);
  const have = cur(s, sh.currency);
  const net = spend.sub(income(sh.currency));
  const lasts = !st.auto || spend.lte(0) ? '' : net.lte(0) ? '∞' : formatTime(have.div(net).toNumber());
  const worth = worthChasing(s, sh.id);
  const runes = runesOf(sh.id).map((r): RuneRow => {
    const c = copies(s, r.id);
    const found = c.gt(0);
    // from 2 stars the hidden rune shows itself
    const secret = r.hidden && !found && shrineStars(s, sh.id) < BALANCE.runeDepth.revealAt;
    const rec = runeMutations(s, r.id);
    return {
      id: r.id,
      name: secret ? '???' : r.name,
      rarity: rarityName(r),
      color: r.color,
      odds: secret ? 'Beyond reckoning' : oddsText(runeEffLog(s, r)),
      base: oddsText(r.log10),
      copies: format(c, n()),
      level: runeLevel(s, r),
      cap: r.cap,
      effects: secret ? 'A secret' : [...r.effects.map((e) => `${e.op === 'pow' ? '^' : e.op === 'add' ? '+' : 'x'} ${RUNE_STAT_WORDS[e.stat] ?? e.stat}`), ...(r.note ? [r.note] : [])].join(' · '),
      found,
      hidden: r.hidden,
      anomaly: r.anomaly,
      muts: MUTATIONS.filter((m) => rec[m.id]?.gt(0)).map((m) => ({ id: m.id, name: m.name, color: m.color, count: format(rec[m.id]!, n()) })),
    };
  });
  return {
    tabs: SHRINES.map((x) => ({ id: x.id, name: x.name.replace(' Shrine', ''), color: x.color, open: shrineOpen(s, x), req: reqText(x.req), stars: shrineStars(s, x.id) })),
    stars: shrineStars(s, sh.id),
    id: sh.id,
    name: sh.name,
    color: sh.color,
    open: shrineOpen(s, sh),
    currency: sh.currencyName,
    have: format(have, n()),
    price: format(price, n()),
    rps: format(rps, n()),
    speed: `${rollSpeed(s).toFixed(rollSpeed(s) >= 10 ? 0 : 2)} rolls/s`,
    bulk: `${format(runeBulk(s), n())} a roll`,
    spend: format(spend, n()),
    lasts,
    auto: st.auto,
    canRoll: have.gte(price),
    rate: st.rate,
    luck: st.luck,
    keep: st.keep,
    rarities: RUNE_RARITIES.slice(0, 8).map((r) => r.name),
    worth: worth ? `${worth.name} (${oddsText(runeEffLog(s, worth))})` : 'Roll to find out',
    found: runes.filter((r) => r.found).length,
    total: runes.length,
    runes,
  };
}
