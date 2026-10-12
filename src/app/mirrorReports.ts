import { BALANCE } from '../content/balance';
import { ANTIMATTER_ENGINES, MIRROR_DEPTHS, MIRROR_UPGRADES, WORMHOLE_NODE_BY_ID, WORMHOLE_NODES } from '../content/mirror';
import { TIERS } from '../content/tiers';
import { planPurchase } from '../engine/buy';
import { D } from '../engine/decimal';
import { cur } from '../engine/state';
import { stat } from '../engine/stats';
import { antimatterRate, canBuyMirrorUpgrade, collapsePrice, depthMult, hasMirrorUpgrade, MIRROR_ENGINES, mirrorKey, mirrorOpen, nextPriceStep, twinMult } from '../engine/systems/mirror';
import { inputOf, linkCost, linkGain, outShare, wormholesOpen } from '../engine/systems/wormholes';
import { format, formatMult, formatRate } from '../ui/format';
import { game } from './game';

/** Read-outs for the Antimatter Mirror and the Wormhole Network. */
const n = () => game.state.settings.notation;
const M = BALANCE.mirror;
const W = BALANCE.wormholes;

export interface AmEngineRow {
  id: string;
  name: string;
  color: string;
  icon: string;
  revealed: boolean;
  /** Only the first hidden engine shows as "???"; the rest stay out of sight. */
  hidden: boolean;
  owned: number;
  each: string;
  /** All of them together a second, and what the next purchase adds. */
  total: string;
  adds: string;
  count: number;
  cost: string;
  can: boolean;
  /** Price growth now, and where it next slows. */
  ratio: string;
  nextStep: string;
  twin: string;
}

export interface MirrorReport {
  open: boolean;
  antimatter: string;
  rate: string;
  mult: string;
  depth: number;
  starName: string;
  starColor: string;
  nextName: string;
  collapseCost: string;
  canCollapse: boolean;
  depthMult: number;
  rows: AmEngineRow[];
  upgrades: Array<{ id: string; name: string; desc: string; cost: string; depth: number; owned: boolean; can: boolean; locked: boolean }>;
  key: boolean;
}

export function mirrorReport(): MirrorReport {
  const s = game.state;
  const money = cur(s, 'antimatter');
  const costMult = stat(s, 'amCostMult');
  const rows = ANTIMATTER_ENGINES.map((e, i): AmEngineRow => {
    const own = MIRROR_ENGINES.owned(s, e.id);
    const step = nextPriceStep(own);
    const plan = planPurchase(MIRROR_ENGINES.curve(e.id), own, money, s.settings.buyAmount, s.settings.customBuyAmount, costMult, step);
    const bracket = [...M.brackets].reverse().find((b) => own >= b.from)!;
    return {
      id: e.id,
      name: e.name,
      color: e.color,
      icon: e.icon,
      revealed: MIRROR_ENGINES.revealed(s, i),
      hidden: i > 0 && !MIRROR_ENGINES.revealed(s, i - 1),
      owned: own,
      each: formatRate(MIRROR_ENGINES.each(s, e.id), n()),
      total: formatRate(MIRROR_ENGINES.total(s, e.id), n()).slice(1),
      adds: formatRate(MIRROR_ENGINES.adds(s, e.id, Math.max(1, plan.count)), n()),
      count: plan.count,
      cost: format(plan.cost, n()),
      can: plan.canAfford && plan.count > 0,
      ratio: `x${bracket.ratio}`,
      nextStep: step ? `slows at ${step}` : 'slowest',
      twin: formatMult(twinMult(s, e.twin), n()),
    };
  });
  const price = collapsePrice(s);
  const star = TIERS[TIERS.length - 1 - s.mirror.depth] ?? TIERS[0]!;
  return {
    open: mirrorOpen(s),
    antimatter: format(money, n()),
    rate: formatRate(antimatterRate(s), n()),
    mult: formatMult(stat(s, 'antimatterMult'), n()),
    depth: s.mirror.depth,
    starName: star.name,
    starColor: star.color,
    nextName: MIRROR_DEPTHS[s.mirror.depth]?.name ?? '',
    collapseCost: price ? format(price, n()) : '',
    canCollapse: !!price && money.gte(price),
    depthMult: depthMult(s),
    rows,
    upgrades: MIRROR_UPGRADES.map((u) => ({ id: u.id, name: u.name, desc: u.desc, cost: format(u.cost, n()), depth: u.depth, owned: hasMirrorUpgrade(s, u.id), can: canBuyMirrorUpgrade(s, u), locked: s.mirror.depth < u.depth })),
    key: mirrorKey(s),
  };
}

export interface WormholeReport {
  open: boolean;
  darkMatter: string;
  cost: string;
  canOpen: boolean;
  full: boolean;
  maxLinks: number;
  nodes: Array<{ id: string; name: string; color: string; icon: string; x: number; y: number; mult: string; out: number; weight: number }>;
  links: Array<{ index: number; from: string; to: string; label: string; share: number; gain: string; loss: string; max: number }>;
  step: number;
}

export function wormholeReport(): WormholeReport {
  const s = game.state;
  const cost = linkCost(s);
  return {
    open: wormholesOpen(s),
    darkMatter: format(cur(s, 'darkMatter'), n()),
    cost: format(cost, n()),
    canOpen: cur(s, 'darkMatter').gte(cost) && s.wormholes.links.length < W.maxLinks,
    full: s.wormholes.links.length >= W.maxLinks,
    maxLinks: W.maxLinks,
    nodes: WORMHOLE_NODES.map((x) => ({ id: x.id, name: x.name, color: x.color, icon: x.icon, x: x.x, y: x.y, mult: formatMult(stat(s, x.stat), n()), out: Math.round(outShare(s, x.id) * 100), weight: x.weight })),
    links: s.wormholes.links.map((l, index) => {
      const a = WORMHOLE_NODE_BY_ID.get(l.from)!;
      const b = WORMHOLE_NODE_BY_ID.get(l.to)!;
      return {
        index,
        from: l.from,
        to: l.to,
        label: `${a.name} to ${b.name}`,
        share: Math.round(l.share * 100),
        gain: formatMult(linkGain(s, l.from, l.to), n()),
        loss: `^${(1 - l.share).toFixed(2)}`,
        max: Math.round((W.maxOut - (outShare(s, l.from) - l.share)) * 100),
      };
    }),
    step: Math.round(W.shareStep * 100),
  };
}

/** What a new link would give, for the preview while picking. */
export function previewGain(from: string, to: string): string {
  const s = game.state;
  const b = WORMHOLE_NODE_BY_ID.get(to);
  if (!b) return '';
  const room = Math.min(W.shareDefault, W.maxOut - outShare(s, from));
  return formatMult(D(1 + Math.max(0, room) * inputOf(s, from)).pow(b.weight), n());
}
