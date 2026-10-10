import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { BALANCE } from '../content/balance';
import { ENGINES } from '../content/engines';
import { SYSTEMS, type SystemDef } from '../content/systems';
import { TIERS } from '../content/tiers';
import { planPurchase } from '../engine/buy';
import { D } from '../engine/decimal';
import { cur, type BuyAmount, type GameState, type Notation } from '../engine/state';
import { stat } from '../engine/stats';
import {
  comboMult,
  comboNow,
  engineCurve,
  engineEach,
  engineRevealed,
  milestoneSpan,
  nextTierCost,
  owned,
  tapValue,
} from '../engine/systems/stardust';
import { reqProgress, reqText } from '../engine/systems/unlocks';
import { BUFF_KINDS, buffLeft, cometOnScreen } from '../engine/systems/comets';
import { availableUpgrades } from '../engine/systems/upgrades';
import { MEDALS } from '../content/medals';
import { whenItApplies } from '../content/upgrades';
import { CONSTANTS } from '../content/constants';
import { MASTERY_RANKS, ORBITALS } from '../content/early';
import { constantOpen, constantPlan } from '../engine/systems/constants';
import { masteryOpen, masteryRank } from '../engine/systems/mastery';
import { orbitalsOpen, planetPrice } from '../engine/systems/orbitals';
import { questProgress } from '../engine/systems/quests';
import { nextShardAt, supernovaGain, supernovaReady } from '../engine/systems/supernova';
import { format, formatCount, formatMult, formatRate, formatTime } from '../ui/format';
import { game } from './game';

/**
 * A flat object of pre-formatted strings and small values, rebuilt 10 times a second (and right
 * after every command). Components select single fields; rows and rail items keep the same
 * object when nothing in them changed, so only what changed re-renders. The UI never reads
 * GameState directly.
 */
export interface EngineRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  blurb: string;
  owned: string;
  each: string;
  cost: string;
  count: string;
  can: boolean;
  msPct: number;
  msNext: string;
  /** Mastery rank colour, or '' before the first rank. */
  rank: string;
  rankName: string;
}

export interface UpgradeTile {
  id: string;
  name: string;
  icon: string;
  color: string;
  desc: string;
  when: string;
  cost: string;
  can: boolean;
}

export interface BuffChip {
  kind: string;
  label: string;
  secs: string;
}

export type RailState = 'open' | 'new' | 'soon' | 'locked' | 'hidden';

export interface RailItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  blurb: string;
  state: RailState;
  req: string;
  pct: number;
  /** Something here can be bought or claimed right now. */
  alert: boolean;
}

export interface Snapshot {
  notation: Notation;
  dust: string;
  dustRate: string;
  playtime: string;
  saveLabel: string;
  saveBlocked: string | null;
  buyAmount: BuyAmount;
  customBuyAmount: number;
  reducedMotion: boolean;
  reduceFlashing: boolean;
  showToasts: boolean;
  muted: boolean;
  volumeMaster: number;
  volumeSfx: number;
  autosaveSeconds: number;
  confirmResets: boolean;
  hotkeys: boolean;
  tickMs: string;
  upgradeTiles: UpgradeTile[];
  upgradesOwned: string;
  buffChips: BuffChip[];
  /** Non-zero while a comet is on screen; changes for every new comet. */
  cometKey: number;
  medalsLabel: string;
  /** "ring.slot:type:level|..." for the renderer, and how many rings are open. */
  planets: string;
  ringsOpen: number;
  tierIndex: number;
  tierName: string;
  tierColor: string;
  starSize: number;
  nextTierName: string;
  evolveCost: string;
  canEvolve: boolean;
  evolvePct: number;
  tapLabel: string;
  moteCount: number;
  combo: number;
  comboMult: string;
  engineRows: EngineRow[];
  engineMystery: string;
  enginesOwned: string;
  railLeft: RailItem[];
  railRight: RailItem[];
  novaPct: number;
  novaReq: string;
  novaReady: boolean;
  novaGain: string;
  shards: string;
  shardsVisible: boolean;
  supernovas: number;
}

/** Reuses the previous object when every field is the same, so React skips the re-render. */
function stable<T extends object>(prev: T | undefined, next: T): T {
  if (!prev) return next;
  for (const k in next) if (prev[k] !== next[k]) return next;
  return prev;
}

function stableList<T extends object>(prev: T[] | undefined, next: T[]): T[] {
  const out = next.map((item, i) => stable(prev?.[i], item));
  if (prev && prev.length === out.length && out.every((x, i) => x === prev[i])) return prev;
  return out;
}

function engineRows(s: GameState, n: Notation, prev: EngineRow[] | undefined): { rows: EngineRow[]; mystery: string } {
  const rows: EngineRow[] = [];
  let mystery = '';
  const money = cur(s, 'stardust');
  const costMult = stat(s, 'engineCostMult');
  for (let i = 0; i < ENGINES.length; i++) {
    const e = ENGINES[i]!;
    if (!engineRevealed(s, i)) {
      mystery = `Buy a ${ENGINES[i - 1]!.name.replace(/s$/, '')} to reveal`;
      break;
    }
    const own = owned(s, e.id);
    const span = milestoneSpan(own);
    const plan = planPurchase(engineCurve(e.id), own, money, s.settings.buyAmount, s.settings.customBuyAmount, costMult, span?.to);
    const rank = masteryOpen(s) ? masteryRank(s, e.id) : 0;
    rows.push({
      id: e.id,
      name: e.name,
      icon: e.icon,
      color: e.color,
      blurb: e.blurb,
      owned: formatCount(own, n),
      each: `${format(engineEach(s, e.id), n)}/s`,
      cost: format(plan.cost, n),
      count: s.settings.buyAmount === 1 ? '' : `x${formatCount(plan.count, n)}`,
      can: plan.canAfford,
      msPct: span ? Math.round(((own - span.from) / (span.to - span.from)) * 100) : 100,
      msNext: span ? `Output x2 at ${formatCount(span.to, n)} owned` : 'Every milestone reached',
      rank: rank > 0 ? MASTERY_RANKS[rank - 1]!.color : '',
      rankName: rank > 0 ? `${MASTERY_RANKS[rank - 1]!.name} mastery` : '',
    });
  }
  return { rows: stableList(prev, rows), mystery };
}

/** The tiles above the shop: available upgrades, cheapest first. */
function upgradeTiles(s: GameState, n: Notation, prev: UpgradeTile[] | undefined): UpgradeTile[] {
  const money = cur(s, 'stardust');
  const tiles = availableUpgrades(s)
    .slice(0, 24)
    .map((u): UpgradeTile => ({
      id: u.id,
      name: u.name,
      icon: u.icon,
      color: u.color,
      desc: u.desc,
      when: whenItApplies(u.effect),
      cost: format(u.cost, n),
      can: money.gte(u.cost),
    }));
  return stableList(prev, tiles);
}

const BUFF_LABELS: Record<string, string> = {
  frenzy: `Frenzy x${BALANCE.comets.frenzy.mult}`,
  tapstorm: `Tapstorm x${BALANCE.comets.tapstorm.mult} taps`,
  wish: 'Wish: engines half price',
};

function buffChips(s: GameState, prev: BuffChip[] | undefined): BuffChip[] {
  const chips: BuffChip[] = [];
  for (const k of BUFF_KINDS) {
    const left = buffLeft(s, k);
    if (left > 0) chips.push({ kind: k, label: BUFF_LABELS[k]!, secs: `${Math.ceil(left)}s` });
  }
  return stableList(prev, chips);
}

/** "!" on a rail button: something there can be bought or claimed now. */
function railAlert(s: GameState, id: string): boolean {
  const money = cur(s, 'stardust');
  switch (id) {
    case 'upgrades':
      return availableUpgrades(s).some((u) => money.gte(u.cost));
    case 'quests':
      return s.quests.some((q) => questProgress(s, q) >= 1);
    case 'constants':
      return CONSTANTS.some((c) => constantOpen(s, c) && constantPlan(s, c, 1).canAfford);
    case 'orbitals':
      return orbitalsOpen(s) && money.gte(planetPrice(s)) && Object.keys(s.planets).length < totalSlots(s);
    default:
      return false;
  }
}

function totalSlots(s: GameState): number {
  return ORBITALS.rings.reduce((a, r) => a + (s.tier >= r.tier ? r.slots : 0), 0);
}

const RAIL_DETAILS = { left: 3, right: 2 } as const;

function railItems(s: GameState, rail: 'left' | 'right', prev: RailItem[] | undefined): RailItem[] {
  let details: number = RAIL_DETAILS[rail];
  const items = SYSTEMS.filter((x: SystemDef) => x.rail === rail).map((x): RailItem => {
    const met = s.unlocked.includes(x.id);
    let state: RailState;
    if (met && x.built) state = s.seen.includes(x.id) ? 'open' : 'new';
    else if (met) state = 'soon';
    else if (details > 0) {
      state = 'locked';
      details--;
    } else state = 'hidden';
    return {
      id: x.id,
      name: x.name,
      icon: x.icon,
      color: x.color,
      blurb: x.blurb,
      state,
      req: state === 'soon' ? 'Arrives in a later update' : reqText(x.req),
      pct: Math.floor(reqProgress(s, x.req) * 100),
      alert: (state === 'open' || state === 'new') && railAlert(s, x.id),
    };
  });
  return stableList(prev, items);
}

export function buildSnapshot(prev?: Snapshot): Snapshot {
  const s = game.state;
  const n = s.settings.notation;
  const since = s.lastSave ? (Date.now() - s.lastSave) / 1000 : -1;
  const tier = TIERS[s.tier] ?? TIERS[0]!;
  const nextCost = nextTierCost(s);
  const money = cur(s, 'stardust');
  const combo = comboNow(game.tapRuntime, performance.now(), stat(s, 'comboDrain').toNumber());
  const comboX = comboMult(combo, stat(s, 'comboPower').toNumber());
  const { rows, mystery } = engineRows(s, n, prev?.engineRows);
  const nova = BALANCE.supernova;
  const novaReady = supernovaReady(s);
  const novaTier = reqProgress(s, { kind: 'tier', tier: nova.tier });
  const run = (s.totals.run.stardust ?? D(0)).toNumber();
  const novaDust = Math.min(1, Math.log10(1 + run) / Math.log10(1 + nova.runStardust));
  let enginesOwned = 0;
  for (const e of ENGINES) enginesOwned += owned(s, e.id);
  return {
    notation: n,
    dust: format(money, n),
    dustRate: formatRate(stat(s, 'stardustPerSec'), n),
    playtime: formatTime(s.playtime),
    saveLabel: game.saveBlocked
      ? 'Saving paused'
      : game.lastSaveError
        ? 'Save failed'
        : since < 0
          ? 'Not saved yet'
          : since < 2
            ? 'Saved'
            : `Saved ${formatTime(since)} ago`,
    saveBlocked: game.saveBlocked,
    buyAmount: s.settings.buyAmount,
    customBuyAmount: s.settings.customBuyAmount,
    reducedMotion: s.settings.reducedMotion,
    reduceFlashing: s.settings.reduceFlashing,
    showToasts: s.settings.showToasts,
    muted: s.settings.muted,
    volumeMaster: s.settings.volumeMaster,
    volumeSfx: s.settings.volumeSfx,
    autosaveSeconds: s.settings.autosaveSeconds,
    confirmResets: s.settings.confirmResets,
    hotkeys: s.settings.hotkeys,
    tickMs: game.tickMs.toFixed(2),
    upgradeTiles: upgradeTiles(s, n, prev?.upgradeTiles),
    upgradesOwned: formatCount(s.upgrades.length, n),
    buffChips: buffChips(s, prev?.buffChips),
    cometKey: cometOnScreen(s) ? s.comet.until : 0,
    medalsLabel: `${s.achievements.length} / ${MEDALS.length}`,
    planets: Object.entries(s.planets)
      .map(([slot, p]) => `${slot}:${p.type}:${p.level}`)
      .join('|'),
    ringsOpen: ORBITALS.rings.filter((r) => s.tier >= r.tier).length,
    tierIndex: s.tier,
    tierName: tier.name,
    tierColor: tier.color,
    starSize: tier.size,
    nextTierName: TIERS[s.tier + 1]?.name ?? '',
    evolveCost: nextCost ? format(nextCost, n) : '',
    canEvolve: !!nextCost && money.gte(nextCost),
    evolvePct: nextCost ? Math.floor(Math.min(1, money.div(nextCost).toNumber()) * 100) : 100,
    tapLabel: `+${format(tapValue(s), n)} stardust per tap`,
    moteCount: owned(s, 'mote'),
    combo: Math.floor(combo),
    comboMult: comboX > 1 ? formatMult(comboX, n) : '',
    engineRows: rows,
    engineMystery: mystery,
    enginesOwned: formatCount(enginesOwned, n),
    railLeft: railItems(s, 'left', prev?.railLeft),
    railRight: railItems(s, 'right', prev?.railRight),
    novaPct: novaReady ? 100 : Math.floor((s.tier >= nova.tier ? 0.5 + novaDust * 0.5 : novaTier * 0.5) * 100),
    novaReq: novaReady
      ? `Next shard at ${format(nextShardAt(s), n)} Stardust`
      : `Reach ${TIERS[nova.tier]!.name} and gather ${format(nova.runStardust, n)} Stardust this run`,
    novaReady,
    novaGain: novaReady ? `+${format(supernovaGain(s), n)}` : '',
    shards: format(cur(s, 'shards'), n),
    shardsVisible: (s.stats.supernovas ?? 0) > 0 || novaReady,
    supernovas: s.stats.supernovas ?? 0,
  };
}

export const snapshotStore = createStore<Snapshot>(() => buildSnapshot());

export function publish(): void {
  snapshotStore.setState(buildSnapshot(snapshotStore.getState()));
}

/** Select ONE primitive field (or a stable row/list): a new object per call loops forever. */
export function useSnap<T>(selector: (s: Snapshot) => T): T {
  return useStore(snapshotStore, selector);
}
