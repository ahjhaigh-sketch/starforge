import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { BALANCE } from '../content/balance';
import { recommend } from './recommend';
import { ENGINES } from '../content/engines';
import { SYSTEMS, type SystemDef, systemSection } from '../content/systems';
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
  engineAdds,
  engineTotal,
  engineRevealed,
  milestoneSpan,
  nextTierCost,
  owned,
  tapValue,
} from '../engine/systems/stardust';
import { reqProgress, reqText } from '../engine/systems/unlocks';
import { attuneHud } from './extrasReports';
import { keyOnSale, runEssence, singularityGain, singularityReady } from '../engine/systems/singularity';
import { bhOpen, bhStage } from '../engine/systems/blackhole';
import { gameSpeed } from '../engine/tick';
import { LEVIATHANS, SPIRE_BANNERS, TRIAL_BY_ID } from '../content/challenges';
import { goalMet, inTrial, trialGoal } from '../engine/systems/trials';
import { fighting, leviathanHp, leviathansUnlocked } from '../engine/systems/leviathans';
import { antimatterRate, mirrorKey, mirrorOpen } from '../engine/systems/mirror';
import { darkMatterNeeded, galacticGain, galacticReady, galacticReqs, galaxyOf } from '../engine/systems/galactic';
import { crunchGain, crunchReady, crunchSeen, galaxiesExplored, galaxiesNeeded, nextChrononAt, runCores } from '../engine/systems/crunch';
import { crunchesThisUniverse, multiverseGain, multiverseReady, multiverseSeen, sparkFlag } from '../engine/systems/multiverse';
import { automating } from '../engine/systems/eternity';
import { fullyAutomated } from '../engine/layerAuto';
import type { AutoLayer } from '../content/layers';
import { autoSetting, autoUnlocked, AUTO_BUYERS } from '../engine/systems/automation';
import { engineView, menuHidden } from './menus';
import { wyrmSky } from './wyrmReports';
import { nebulaGain, nebulaReady, runShards } from '../engine/systems/nebula';
import { BUFF_KINDS, buffLeft, cometOnScreen } from '../engine/systems/comets';
import { availableUpgrades } from '../engine/systems/upgrades';
import { MEDALS } from '../content/medals';
import { RECIPES } from '../content/alchemy';
import { elixirLeft } from '../engine/systems/alchemy';
import { WEATHER_BY_ID } from '../content/weather';
import { weatherLeft, weatherNow } from '../engine/systems/weather';
import { treeBulkOpen, upgradeBulkOpen } from '../engine/systems/treeShop';
import { whenItApplies } from '../content/upgrades';
import { CONSTANTS } from '../content/constants';
import { MASTERY_RANKS, ORBITALS } from '../content/early';
import { constantOpen, constantPlan } from '../engine/systems/constants';
import { masteryOpen, masteryRank } from '../engine/systems/mastery';
import { orbitalsOpen, planetPrice } from '../engine/systems/orbitals';
import { questProgress } from '../engine/systems/quests';
import { nextShardAt, supernovaGain, supernovaReady, novaNeed } from '../engine/systems/supernova';
import { beltOpen, beltTierNeed, beltUpgradeCost, beltUpgradeMaxed, bitCost, drillOpen, droneCost } from '../engine/systems/belt';
import { BELT_UPGRADES } from '../content/belt';
import { GRADE_BY_ID, RELICS } from '../content/forge';
import { forgeOpen, relicLevel } from '../engine/systems/forge';
import { levelInfo, perksFree, starsmithOpen } from '../engine/systems/starsmith';
import { format, formatCount, formatFifths, formatMult, formatRate, formatTime } from '../ui/format';
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
  /** All of this engine together, a second; and what the next purchase (at the buy amount) adds. */
  total: string;
  adds: string;
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
  /** Elixirs carry their own colour and the flask icon; comet buffs use the comet. */
  color?: string;
  icon?: string;
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
  /** 1.4.0: the layer it belongs to (the rails' sections). */
  section: string;
}

/** 1.2.0: a big card at the side for a system you just unlocked, or one you're close to. */
export interface FocusCard {
  id: string;
  name: string;
  icon: string;
  color: string;
  blurb: string;
  /** 1.3.0: 'tip' is the Recommended card (its blurb is the advice, req is unused). */
  kind: 'new' | 'next' | 'tip';
  req: string;
  pct: number;
  /** The panel a click opens (the system itself for 'new'). */
  panel?: string;
}

export interface Snapshot {
  notation: Notation;
  /** 1.2.0 interface settings: size, hidden parts ("buffs teasers"), reset animations, compact engines. */
  uiScale: number;
  hiddenHud: string;
  resetFx: boolean;
  shipAlerts: boolean;
  autoHideMenus: boolean;
  engineList: 'auto' | 'full' | 'compact' | 'min';
  engineCompact: boolean;
  /** 1.2.0: the engine list's view ('full', 'compact', 'min'), and the Stardust a second all engines make. */
  engineView: string;
  focus: FocusCard[];
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
  /** Attunements on the Star Core ("pulse,heartbeat"), and their read-outs. */
  attune: string;
  pulseRating: string;
  heartPct: number;
  chaosTaps: number;
  chaosEffect: string;
  chaosLeft: string;
  moteCount: number;
  /** 1.3.0: the engines you own after the Spark Motes, "catcher|moonmill|...", for the machines that orbit the star. */
  orbitEngines: string;
  combo: number;
  comboMult: string;
  engineRows: EngineRow[];
  engineMystery: string;
  enginesOwned: string;
  railLeft: RailItem[];
  railRight: RailItem[];
  novaPct: number;
  novaReq: string;
  /** The Nebula: shown on the reset bar from 30 Supernovas (or after the first Nebula). */
  nebulaVisible: boolean;
  nebulaReady: boolean;
  nebulaGain: string;
  nebulaReq: string;
  nebulaPct: number;
  essence: string;
  essenceVisible: boolean;
  /** Nebulas ever: cyan clouds drift into the sky after the first. */
  nebulasAll: number;
  /** The Singularity on the reset bar, Dark Matter in the top bar, the Black Hole behind the star. */
  singularityVisible: boolean;
  singularityReady: boolean;
  singularityGain: string;
  singularityReq: string;
  singularityPct: number;
  darkMatter: string;
  darkMatterVisible: boolean;
  bhStage: number;
  bhMassLog: number;
  gameSpeed: number;
  /** Galactic Rebirth on the reset bar, Galaxy Cores in the top bar, the galaxy's tint over the sky. */
  galacticVisible: boolean;
  galacticReady: boolean;
  galacticGain: string;
  galacticReq: string;
  galacticPct: number;
  galaxyCores: string;
  galaxyCoresVisible: boolean;
  galaxyColor: string;
  galaxyName: string;
  /** The Big Crunch on the reset bar (from Galactic milestone 7), Chronons in the top bar. */
  crunchVisible: boolean;
  crunchReady: boolean;
  crunchGain: string;
  crunchReq: string;
  crunchPct: number;
  chronons: string;
  chrononsVisible: boolean;
  /** The Multiverse on the reset bar (from Big Crunch milestone 8), Sparks in the top bar. */
  multiverseVisible: boolean;
  multiverseReady: boolean;
  multiverseGain: string;
  multiverseReq: string;
  multiversePct: number;
  sparks: string;
  sparksVisible: boolean;
  /** The ending is waiting to be told (after the first Multiverse, once). */
  storyDue: boolean;
  storySeen: boolean;
  /** The Wardrobe's choices, for the renderer (skin, trail, background ids). */
  /** 1.2.0: Buy all for upgrades (first Supernova) and for the trees (5 Supernovas). */
  upgradeBulk: boolean;
  treeBulk: boolean;
  /** Space Weather in the sky ('' for clear), for the renderer. */
  weatherKind: string;
  skin: string;
  trail: string;
  background: string;
  /** 1.2.0: tap sparks and the menus' colour. */
  burst: string;
  uiTheme: string;
  /** Reset bars of layers Eternity runs by itself ("supernova,nebula"): they shrink to a slim strip. */
  autoBars: string;
  /** 1.4.0: reset bars of layers that run themselves completely (two layers on): they leave the screen. */
  goneBars: string;
  /** Music: the soundtrack, its volume, and how many layers you've reached (each adds an instrument). */
  soundtrack: string;
  volumeMusic: number;
  musicLayers: number;
  /** Megastructure stages built, for the sky ("dyson:3|ringworld:1"). */
  megaStages: string;
  /** The Antimatter pill in the top bar (once the Mirror is open). */
  antimatter: string;
  antimatterRate: string;
  antimatterVisible: boolean;
  /** Fog of the Void hides the numbers; the Trial chip; the Leviathan boss bar; the Spire banner. */
  fog: boolean;
  trialLabel: string;
  trialPct: number;
  trialReady: boolean;
  levVisible: boolean;
  levIndex: number;
  levName: string;
  levColor: string;
  levPct: number;
  levHp: string;
  spireBanner: string;
  spireBannerName: string;
  /** The Wyrm team for the sky ("colour:rank:form|..."). */
  wyrmSky: string;
  novaReady: boolean;
  novaGain: string;
  shards: string;
  shardsVisible: boolean;
  supernovas: number;
  /** The Belt field for the renderer ("id:rarity|..."), the beam radius, and ore. */
  beltField: string;
  beamRadius: number;
  ore: string;
  oreVisible: boolean;
  /** Starsmith Level for the bar under the top bar. */
  level: number;
  levelPct: number;
  levelVisible: boolean;
  perksFree: number;
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
    const span = milestoneSpan(own, s);
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
      total: `${format(engineTotal(s, e.id), n)}/s`,
      adds: `+${format(engineAdds(s, e.id, Math.max(1, plan.count)), n)}/s`,
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
  const sky = weatherNow(s);
  const w = sky ? WEATHER_BY_ID.get(sky) : undefined;
  if (w) chips.push({ kind: 'weather', label: `${w.name}: ${w.chip}`, secs: formatTime(weatherLeft(s)), color: w.color, icon: 'weather' });
  for (const k of BUFF_KINDS) {
    const left = buffLeft(s, k);
    if (left > 0) chips.push({ kind: k, label: BUFF_LABELS[k]!, secs: left < 60 ? `${Math.ceil(left)}s` : formatTime(left) });
  }
  for (const r of RECIPES) {
    const left = elixirLeft(s, r.id);
    if (left > 0) chips.push({ kind: `alchemy.${r.id}`, label: r.chip, secs: formatTime(left), color: r.color, icon: 'alchemy' });
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
    case 'belt':
      return BELT_UPGRADES.some((u) => !beltUpgradeMaxed(s, u.id) && cur(s, 'ore').gte(beltUpgradeCost(s, u.id))) || s.belt.oreThisTier.gte(beltTierNeed(s.belt.tier + 1));
    case 'level':
      return perksFree(s) > 0;
    case 'drill':
      return drillOpen(s) && (cur(s, 'ore').gte(droneCost(s)) || cur(s, 'alloy.iron').gte(bitCost(s)));
    case 'starforge':
      // a relic waiting to be crafted (levelling is always possible, so it doesn't count)
      return forgeOpen(s) && RELICS.some((r) => relicLevel(s, r.id) === 0 && cur(s, GRADE_BY_ID.get(r.grade)!.alloy).gte(BALANCE.relics.costBase));
    default:
      return false;
  }
}

/** Auto-Supernova earned and switched on: the Supernova bar runs itself. */
function autoNovaOn(s: GameState): boolean {
  const a = AUTO_BUYERS.find((x) => x.id === 'auto.supernova');
  return !!a && autoUnlocked(s, a) && autoSetting(s, a.id).on;
}

function totalSlots(s: GameState): number {
  return ORBITALS.rings.reduce((a, r) => a + (s.tier >= r.tier ? r.slots : 0), 0);
}

const RAIL_DETAILS = { left: 3, right: 2 } as const;

function railItems(s: GameState, rail: 'left' | 'right', prev: RailItem[] | undefined): RailItem[] {
  let details: number = RAIL_DETAILS[rail];
  const list = SYSTEMS.filter((x: SystemDef) => x.rail === rail);
  // 1.4.0: on the side's layer sections, everything in a layer you've reached shows what it needs; the first few of
  // the next layer do too, and the rest are silhouettes
  const reached = new Set(rail === 'right' ? list.filter((x) => s.unlocked.includes(x.id)).map(systemSection) : []);
  const items = list.map((x): RailItem => {
    const met = s.unlocked.includes(x.id);
    let state: RailState;
    if (met && x.built) state = s.seen.includes(x.id) ? 'open' : 'new';
    else if (met) state = 'soon';
    else if (reached.has(systemSection(x))) state = 'locked';
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
      section: systemSection(x),
    };
  });
  // off the rails: hidden by you (even before you've opened it), or open and running itself
  const off = (x: RailItem) => (x.state === 'open' && menuHidden(s, x.id)) || (x.state === 'new' && s.settings.hiddenMenus.includes(x.id));
  return stableList(prev, items.filter((x) => !off(x)));
}

/** The Recommended card, worked out at most once a real second (it looks at every tree). */
let tipCache: { at: number; card: FocusCard | null } = { at: -Infinity, card: null };
function tipCard(s: GameState): FocusCard | null {
  const now = performance.now();
  if (now - tipCache.at < BALANCE.recommend.every * 1000) return tipCache.card;
  const r = recommend(s);
  tipCache = { at: now, card: r ? { id: `tip.${r.id}`, name: r.title, icon: r.icon, color: r.color, blurb: r.text, kind: 'tip', req: '', pct: 0, panel: r.panel } : null };
  return tipCache.card;
}

/**
 * A just-unlocked system you haven't opened, then (1.3.0) the Recommended card, then the next one or
 * two systems you're closest to (one fewer for each card above).
 */
function focusCards(s: GameState, right: RailItem[], prev: FocusCard[] | undefined): FocusCard[] {
  const card = (x: RailItem, kind: FocusCard['kind']): FocusCard => ({ id: x.id, name: x.name, icon: x.icon, color: x.color, blurb: x.blurb, kind, req: x.req, pct: x.pct });
  const fresh = right.filter((x) => x.state === 'new').slice(-1).map((x) => card(x, 'new'));
  const tip = tipCard(s);
  const next = right
    .filter((x) => x.state === 'locked')
    .sort((a, b) => b.pct - a.pct)
    .slice(0, Math.max(0, 2 - fresh.length - (tip ? 1 : 0)) || 1)
    .map((x) => card(x, 'next'));
  return stableList(prev, [...fresh, ...(tip ? [tip] : []), ...next]);
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
  const view = engineView(s);
  // minimized, the list shows no rows: don't build them (30 rows, ten times a second, late in the game)
  const { rows, mystery } = view === 'min' ? { rows: prev?.engineRows ?? [], mystery: prev?.engineMystery ?? '' } : engineRows(s, n, prev?.engineRows);
  const nova = BALANCE.supernova;
  const railRight = railItems(s, 'right', prev?.railRight);
  const novaReady = supernovaReady(s);
  const hud = attuneHud();
  const neb = nebulaBar(s, n);
  const lvl = levelInfo(s);
  const novaTier = reqProgress(s, { kind: 'tier', tier: nova.tier });
  const run = (s.totals.run.stardust ?? D(0)).toNumber();
  const novaDust = Math.min(1, Math.log10(1 + run) / novaNeed(s).add(1).log10().toNumber());
  let enginesOwned = 0;
  for (const e of ENGINES) enginesOwned += owned(s, e.id);
  const fog = s.trials.active.some((id) => TRIAL_BY_ID.get(id)?.fog);
  return {
    notation: n,
    dust: fog ? '???' : format(money, n),
    dustRate: fog ? '??? /s' : formatRate(stat(s, 'stardustPerSec'), n),
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
    soundtrack: s.settings.soundtrack,
    volumeMusic: s.settings.volumeMusic,
    musicLayers: ['supernovasAll', 'nebulasAll', 'singularitiesAll', 'galacticsAll', 'crunchesAll', 'multiversesAll'].filter((k) => (s.stats[k] ?? 0) > 0).length,
    autoBars: [...(['supernova', 'nebula', 'singularity', 'galactic', 'crunch'] as const).filter((l) => automating(s, l) || (l === 'supernova' && autoNovaOn(s))), ...(sparkFlag(s, 'autoCrunch') ? ['crunch'] : [])].join(','),
    goneBars: s.settings.autoHideMenus ? ['stardust', 'supernova', 'nebula', 'singularity', 'galactic', 'crunch', 'multiverse'].filter((l) => fullyAutomated(s, l as AutoLayer)).join(',') : '',
    uiScale: s.settings.uiScale,
    hiddenHud: s.settings.hiddenHud.join(' '),
    resetFx: s.settings.resetFx,
    shipAlerts: s.settings.shipAlerts,
    autoHideMenus: s.settings.autoHideMenus,
    engineList: s.settings.engineList,
    engineCompact: view !== 'full',
    engineView: view,
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
    tapLabel: fog ? 'The fog hides your taps' : `+${format(tapValue(s), n)} stardust per tap`,
    attune: hud.list,
    pulseRating: hud.rating,
    heartPct: hud.heart,
    chaosTaps: hud.chaosTaps,
    chaosEffect: hud.chaos,
    chaosLeft: hud.chaosLeft,
    moteCount: owned(s, 'mote'),
    orbitEngines: ENGINES.filter((e) => e.id !== 'mote' && owned(s, e.id) > 0)
      .map((e) => e.id)
      .join('|'),
    combo: Math.floor(combo),
    comboMult: comboX > 1 ? formatMult(comboX, n) : '',
    engineRows: rows,
    engineMystery: mystery,
    enginesOwned: formatCount(enginesOwned, n),
    railLeft: railItems(s, 'left', prev?.railLeft),
    railRight,
    focus: focusCards(s, railRight, prev?.focus),
    nebulaVisible: neb.visible,
    nebulaReady: neb.ready,
    nebulaGain: neb.gain,
    nebulaReq: neb.req,
    nebulaPct: neb.pct,
    essence: format(cur(s, 'essence'), n),
    essenceVisible: (s.stats.nebulasAll ?? 0) > 0 || cur(s, 'essence').gt(0),
    nebulasAll: s.stats.nebulasAll ?? 0,
    ...singularityBar(s, n),
    ...galacticBar(s, n),
    ...crunchBar(s, n),
    ...multiverseBar(s, n),
    megaStages: Object.entries(s.megastructures)
      .filter(([, k]) => k > 0)
      .map(([id, k]) => `${id}:${k}`)
      .join('|'),
    darkMatter: format(cur(s, 'darkMatter'), n),
    darkMatterVisible: (s.stats.singularitiesAll ?? 0) > 0 || cur(s, 'darkMatter').gt(0),
    bhStage: bhOpen(s) ? Math.max(1, bhStage(s)) : 0,
    bhMassLog: Math.floor(s.blackHole.mass.add(1).log10().toNumber() * 10) / 10,
    gameSpeed: Math.round(gameSpeed(s) * 100) / 100,
    wyrmSky: wyrmSky(),
    fog,
    ...challengeHud(s, n),
    antimatter: format(cur(s, 'antimatter'), n),
    antimatterRate: formatRate(antimatterRate(s), n),
    antimatterVisible: mirrorOpen(s),
    novaPct: novaReady ? 100 : Math.floor((s.tier >= nova.tier ? 0.5 + novaDust * 0.5 : novaTier * 0.5) * 100),
    novaReq: novaReady
      ? `Next shard at ${format(nextShardAt(s), n)} Stardust`
      : `Reach ${TIERS[nova.tier]!.name} and gather ${format(novaNeed(s), n)} Stardust this run`,
    novaReady,
    novaGain: novaReady ? `+${format(supernovaGain(s), n)}` : '',
    shards: format(cur(s, 'shards'), n),
    shardsVisible: (s.stats.supernovas ?? 0) > 0 || novaReady,
    supernovas: s.stats.supernovas ?? 0,
    beltField: beltOpen(s) ? s.belt.field.map((a) => `${a.id}:${a.r}${a.m ? `:${a.m}` : ''}`).join('|') : '',
    beamRadius: Math.round(stat(s, 'beamRadius').toNumber()),
    ore: format(cur(s, 'ore'), n),
    oreVisible: beltOpen(s),
    level: lvl.level,
    levelPct: Math.floor(Math.min(1, lvl.into.div(lvl.need).toNumber()) * 100),
    levelVisible: starsmithOpen(s),
    perksFree: starsmithOpen(s) ? perksFree(s) : 0,
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

/** Galactic Rebirth on the reset bar: visible with the Mirror Key or after the first one. */
function galacticBar(s: GameState, n: Notation) {
  const all = s.stats.galacticsAll ?? 0;
  const ready = galacticReady(s);
  const r = galacticReqs(s);
  const need = darkMatterNeeded(s);
  const depthNeed = BALANCE.galactic.mirrorDepth;
  const steps = [Math.min(1, r.depth / depthNeed), r.key ? 1 : 0, Math.min(1, r.dm.add(1).log10().toNumber() / need.log10().toNumber())];
  const req = ready
    ? 'Ready'
    : r.depth < depthNeed
      ? `Collapse the anti-star to a Protostar in the Mirror (${r.depth}/${depthNeed})`
      : !r.key
        ? 'Find the Mirror Key in the Antimatter Mirror'
        : `Gain ${format(need, n)} Dark Matter this Galactic run (${format(r.dm, n)})`;
  const g = galaxyOf(s);
  return {
    galacticVisible: all > 0 || mirrorKey(s),
    galacticReady: ready,
    galacticGain: ready ? `+${format(galacticGain(s), n)}` : '',
    galacticReq: req,
    galacticPct: ready ? 100 : Math.floor((steps.reduce((a, b) => a + b, 0) / 3) * 100),
    galaxyCores: format(cur(s, 'galaxyCores'), n),
    galaxyCoresVisible: all > 0 || cur(s, 'galaxyCores').gt(0),
    galaxyColor: all > 0 && g.id !== 'milkyway' ? g.color : '',
    galaxyName: g.name,
  };
}

/** The Big Crunch on the reset bar: visible from Galactic milestone 7 (or after the first one). */
function crunchBar(s: GameState, n: Notation) {
  const C = BALANCE.crunch;
  const ready = crunchReady(s);
  const explored = galaxiesExplored(s);
  const need = galaxiesNeeded(s);
  const cores = runCores(s);
  const req = ready
    ? `Next Chronon at ${format(nextChrononAt(s), n)} Galaxy Cores this Crunch run`
    : explored < need
      ? `Explore ${need} galaxies this Crunch run (${explored}/${need})`
      : `Gain ${format(C.need, n)} Galaxy Cores this Crunch run (${format(cores, n)})`;
  return {
    crunchVisible: crunchSeen(s),
    crunchReady: ready,
    crunchGain: ready ? `+${format(crunchGain(s), n)}` : '',
    crunchReq: req,
    crunchPct: ready ? 100 : Math.floor(Math.min(1, explored / need) * 100),
    chronons: format(cur(s, 'chronons'), n),
    chrononsVisible: (s.stats.crunchesAll ?? 0) > 0 || cur(s, 'chronons').gt(0),
  };
}

/** The Multiverse on the reset bar: visible from Big Crunch milestone 8 (or after the first one). */
function multiverseBar(s: GameState, n: Notation) {
  const need = BALANCE.multiverse.crunches;
  const done = crunchesThisUniverse(s);
  const ready = multiverseReady(s);
  return {
    multiverseVisible: multiverseSeen(s),
    multiverseReady: ready,
    multiverseGain: ready ? `+${formatFifths(multiverseGain(s), n)}` : '',
    multiverseReq: ready ? 'Every universe after this one can have its own rules' : `Big Crunch ${need} times in this universe (${Math.min(done, need)}/${need})`,
    multiversePct: ready ? 100 : Math.floor(Math.min(1, done / need) * 100),
    sparks: formatFifths(cur(s, 'sparks'), n),
    sparksVisible: (s.stats.multiversesAll ?? 0) > 0 || cur(s, 'sparks').gt(0),
    storyDue: (s.stats.multiversesAll ?? 0) > 0 && !s.multiverse.storySeen,
    storySeen: s.multiverse.storySeen,
    weatherKind: weatherNow(s) ?? '',
    upgradeBulk: upgradeBulkOpen(s),
    treeBulk: treeBulkOpen(s),
    skin: s.cosmetics.skin,
    trail: s.cosmetics.trail,
    background: s.cosmetics.background,
    burst: s.cosmetics.burst,
    uiTheme: s.cosmetics.theme,
  };
}

/** The Trial chip, the Leviathan boss bar and the Spire banner. */
function challengeHud(s: GameState, n: Notation) {
  const goal = trialGoal(s);
  const run = s.totals.run.stardust ?? D(0);
  const trialLabel = inTrial(s) ? s.trials.active.map((id) => TRIAL_BY_ID.get(id)?.name ?? id).join(' + ') : '';
  const k = Math.min(s.leviathans.current, leviathansUnlocked(s) - 1);
  const lev = LEVIATHANS[k]!;
  const hp = leviathanHp(s, k);
  const banner = SPIRE_BANNERS.find((b) => b.id === s.spire.banner);
  return {
    trialLabel,
    trialPct: inTrial(s) ? Math.floor(Math.min(1, run.add(1).log10().toNumber() / Math.max(1, goal.log10().toNumber())) * 100) : 0,
    trialReady: goalMet(s),
    levVisible: fighting(s),
    levIndex: k,
    levName: lev.name,
    levColor: lev.color,
    levPct: Math.max(0, 100 - Math.floor(Math.min(1, s.leviathans.damage.div(hp).toNumber()) * 100)),
    levHp: `${format(hp.sub(s.leviathans.damage).max(0), n)} / ${format(hp, n)}`,
    spireBanner: banner?.color ?? '',
    spireBannerName: banner?.name ?? '',
  };
}

/** The Singularity on the reset bar: visible from Nebula milestone 8 (or after the first Singularity). */
function singularityBar(s: GameState, n: Notation): { singularityVisible: boolean; singularityReady: boolean; singularityGain: string; singularityReq: string; singularityPct: number } {
  const visible = keyOnSale(s);
  const ready = singularityReady(s);
  const ne = runEssence(s);
  const pct = ready ? 100 : !s.singularity.key ? Math.floor(Math.min(1, cur(s, 'embers').div(BALANCE.singularity.keyEmbers).toNumber()) * 100) : Math.floor(Math.min(1, ne.add(1).log10().toNumber() / Math.log10(BALANCE.singularity.need)) * 100);
  const req = ready
    ? 'Dark Matter buys the Singularity Tree and boosts all Essence'
    : !s.singularity.key
      ? `Buy the Event Horizon key: ${format(BALANCE.singularity.keyEmbers, n)} Embers (${format(cur(s, 'embers'), n)})`
      : `Gather ${format(BALANCE.singularity.need, n)} Essence this Singularity run (${format(ne, n)})`;
  return { singularityVisible: visible, singularityReady: ready, singularityGain: ready ? `+${format(singularityGain(s), n)}` : '', singularityReq: req, singularityPct: pct };
}

/** The Nebula on the reset bar: visible once a run reaches 30 Supernovas, or after the first Nebula. */
function nebulaBar(s: GameState, n: Notation): { visible: boolean; ready: boolean; gain: string; req: string; pct: number } {
  const B = BALANCE.nebula;
  const novas = s.stats.supernovas ?? 0;
  const visible = (s.stats.nebulasAll ?? 0) > 0 || (s.stats.supernovasBest ?? 0) >= B.supernovas || novas >= B.supernovas;
  const ready = nebulaReady(s);
  const shardShare = Math.min(1, runShards(s).div(B.runShards).toNumber());
  const pct = ready ? 100 : Math.floor((Math.min(1, novas / B.supernovas) * 0.5 + shardShare * 0.5) * 100);
  const req = ready
    ? 'Nebula Essence buys the Nebula Tree and boosts all shards'
    : novas < B.supernovas
      ? `${novas} / ${B.supernovas} Supernovas this Nebula run`
      : `Gather ${format(B.runShards, n)} Nova Shards this Nebula run (${format(runShards(s), n)})`;
  return { visible, ready, gain: ready ? `+${format(nebulaGain(s), n)}` : '', req, pct };
}
