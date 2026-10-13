import { BALANCE } from '../content/balance';
import { AUTO_LAYER_NAMES, AUTO_LAYERS, type AutoLayer, ECHO_ENGINES, ETERNITY_UPGRADES } from '../content/crunch';
import { layerIndex } from '../content/layers';
import { autoLevel, reachedLayer } from '../engine/layerAuto';
import { planPurchase } from '../engine/buy';
import { D, ZERO } from '../engine/decimal';
import { layer, milestoneReached, resetsDone } from '../engine/layers';
import { cur } from '../engine/state';
import { stat } from '../engine/stats';
import { crunchGain, crunchReady, galaxiesExplored, galaxiesNeeded, nextChrononAt, runCores } from '../engine/systems/crunch';
import { ECHO_BOARD, echoAuto, echoesOpen, echoNebulaGain, echoNovaGain } from '../engine/systems/echoes';
import { canBuyEternity, eternityAuto, eternityOpen, hasEternity } from '../engine/systems/eternity';
import { format, formatMult, formatRate } from '../ui/format';
import { game } from './game';

/** Read-outs for the Big Crunch, Eternity and the Echo boards. */
const n = () => game.state.settings.notation;
const C = BALANCE.crunch;
const E = BALANCE.echoes;

export interface CrunchReport {
  chronons: string;
  ready: boolean;
  gain: string;
  next: string;
  explored: number;
  need: number;
  cores: string;
  coresNeed: string;
  coresMet: boolean;
  done: number;
  passive: string;
  milestones: Array<{ at: number; text: string; reached: boolean }>;
}

export function crunchReport(): CrunchReport {
  const s = game.state;
  const def = layer('crunch')!;
  const ready = crunchReady(s);
  return {
    chronons: format(cur(s, 'chronons'), n()),
    ready,
    gain: format(crunchGain(s), n()),
    next: format(nextChrononAt(s), n()),
    explored: galaxiesExplored(s),
    need: galaxiesNeeded(s),
    cores: format(runCores(s), n()),
    coresNeed: format(C.need, n()),
    coresMet: runCores(s).gte(C.need),
    done: resetsDone(s, def),
    passive: formatMult(D(1).add(s.totals.all.chronons ?? ZERO).pow(C.passivePow), n()),
    milestones: def.milestones.map((m) => ({ at: m.at, text: m.text, reached: milestoneReached(s, 'crunch', m.id) })),
  };
}

export interface EternityCard {
  id: string;
  name: string;
  desc: string;
  cost: number;
  owned: boolean;
  can: boolean;
  automation: boolean;
}

export interface AutoRow {
  layer: AutoLayer;
  name: string;
  owned: boolean;
  on: boolean;
  mode: 'double' | 'amount';
  at: string;
  /** Stardust automation has no reset of its own (it buys engines, upgrades, tiers and constants). */
  resets: boolean;
}

export function eternityReport(): { open: boolean; chronons: string; cards: EternityCard[]; auto: AutoRow[] } {
  const s = game.state;
  return {
    open: eternityOpen(s),
    chronons: format(cur(s, 'chronons'), n()),
    cards: ETERNITY_UPGRADES.map((u) => ({ id: u.id, name: u.name, desc: u.desc, cost: u.cost, owned: hasEternity(s, u.id), can: canBuyEternity(s, u), automation: !!u.layer })),
    // 1.4.0: every layer you've passed runs itself (systems/layerAuto); Eternal Galaxy runs the Galactic layer early
    auto: AUTO_LAYERS.filter((l) => layerIndex(l) <= Math.max(4, reachedLayer(s))).map((l) => {
      const a = eternityAuto(s, l);
      return { layer: l, name: AUTO_LAYER_NAMES[l], owned: autoLevel(s, l) > 0, on: a.on, mode: a.mode, at: a.at.gt(0) ? format(a.at, n()) : '', resets: l !== 'stardust' };
    }),
  };
}

export interface EchoRow {
  id: string;
  name: string;
  color: string;
  icon: string;
  revealed: boolean;
  hidden: boolean;
  owned: number;
  each: string;
  /** All of them together a second, and what the next purchase adds. */
  total: string;
  adds: string;
  count: number;
  cost: string;
  can: boolean;
  /** Progress to the next output doubling, 0 to 100, and its owned count. */
  pct: number;
  nextAt: number;
}

export interface EchoReport {
  open: boolean;
  dust: string;
  rate: string;
  shards: string;
  essence: string;
  mult: string;
  /** What one tap on the echo star gives. */
  perTap: string;
  rows: EchoRow[];
  novaReady: boolean;
  novaGain: string;
  novaReq: string;
  nebulaReady: boolean;
  nebulaGain: string;
  nebulaReq: string;
  auto: boolean;
  /** What the echoes give the real game, from lifetime amounts. */
  boosts: Array<{ label: string; value: string }>;
}

export function echoReport(): EchoReport {
  const s = game.state;
  const money = cur(s, 'echoDust');
  const rows = ECHO_ENGINES.map((e, i): EchoRow => {
    const own = ECHO_BOARD.owned(s, e.id);
    const span = ECHO_BOARD.milestoneSpan(own, s);
    const plan = planPurchase(ECHO_BOARD.curve(e.id), own, money, s.settings.buyAmount, s.settings.customBuyAmount, stat(s, 'echoCostMult'), span?.to);
    return {
      id: e.id,
      name: e.name,
      color: e.color,
      icon: e.icon,
      revealed: ECHO_BOARD.revealed(s, i),
      hidden: i > 0 && !ECHO_BOARD.revealed(s, i - 1),
      owned: own,
      each: formatRate(ECHO_BOARD.each(s, e.id), n()),
      total: formatRate(ECHO_BOARD.total(s, e.id), n()).slice(1),
      adds: formatRate(ECHO_BOARD.adds(s, e.id, Math.max(1, plan.count)), n()),
      count: plan.count,
      cost: format(plan.cost, n()),
      can: plan.canAfford && plan.count > 0,
      pct: span ? Math.floor(((own - span.from) / (span.to - span.from)) * 100) : 100,
      nextAt: span?.to ?? 0,
    };
  });
  const all = (c: string) => s.totals.all[c] ?? ZERO;
  const runDust = s.totals.run.echoDust ?? ZERO;
  const runShards = s.totals.run.echoShards ?? ZERO;
  const novaGain = echoNovaGain(s);
  const nebulaGain = echoNebulaGain(s);
  return {
    open: echoesOpen(s),
    dust: format(money, n()),
    rate: formatRate(stat(s, 'echoDustPerSec'), n()),
    shards: format(cur(s, 'echoShards'), n()),
    essence: format(cur(s, 'echoEssence'), n()),
    mult: formatMult(stat(s, 'echoMult'), n()),
    perTap: format(stat(s, 'echoMult').add(stat(s, 'echoDustPerSec').mul(E.tapShare)), n()),
    rows,
    novaReady: novaGain.gte(1),
    novaGain: format(novaGain, n()),
    novaReq: novaGain.gte(1) ? 'Ready' : `${format(runDust, n())} / ${format(E.novaAt, n())} Echo Dust this echo run`,
    nebulaReady: nebulaGain.gte(1),
    nebulaGain: format(nebulaGain, n()),
    nebulaReq: nebulaGain.gte(1) ? 'Ready' : `${format(runShards, n())} / ${format(E.nebulaAt, n())} Echo Shards this echo run`,
    auto: echoAuto(s),
    boosts: [
      { label: 'Stardust', value: formatMult(D(1).add(all('echoDust')).pow(E.dustPow), n()) },
      { label: 'Nova Shards', value: formatMult(D(1).add(all('echoShards')).pow(E.shardPow), n()) },
      { label: 'Nebula Essence', value: formatMult(D(1).add(all('echoEssence')).pow(E.essencePow), n()) },
      { label: 'Chronons', value: formatMult(D(1).add(all('echoEssence')).pow(E.chrononPow), n()) },
    ],
  };
}
