import { BALANCE } from '../../content/balance';
import { ASPECT_BY_ID, ASPECTS, AXES, BEYOND_BY_ID, BEYOND_LAYERS, type BeyondLayerDef, FOLD_BY_LAYER, FOLDS, LAW_BY_ID, LAWS, MIRACLE_BY_ID, MIRACLES, RITES } from '../../content/beyond';
import { LAYER_COUNTERS, layerIndex } from '../../content/layers';
import { planPurchase, type PurchasePlan } from '../buy';
import type { CostCurve } from '../cost';
import { D, type Decimal, ZERO } from '../decimal';
import { events } from '../events';
import { layer, milestoneReached, onBeforeReset, registerLayer, resetCeiling, type ResetPart, unResetCeiling } from '../layers';
import { cur, gain, type GameState, gainPassive, spend, usable } from '../state';
import { defineStat, invalidateStats, registerSources, stat, type StatSource } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { LAYER_WIPES, multiverseGain, multiverseReady } from './multiverse';

/**
 * 1.4.0: the four resets beyond the Multiverse (content/beyond.ts), on the one reset function.
 * - Each needs `need` of the layer below's currency gained in its own run, and pays
 *   floor((amount / need)^0.8 x its gain stat), under the reset ceiling.
 * - Each wipes only the three layers just below it (the barrier): their currencies, trees and systems
 *   start again, but their counts and milestones stay, so everything further down keeps running itself.
 * - Each has its own system: the Tesseract, the Pantheon, the Laws, and Past Lives with Miracles.
 */
const BY = BALANCE.beyond;

// ---------- the layers ----------

export const beyondNeed = (id: string): Decimal => D(BY.need[id] ?? Infinity);
export const beyondRun = (s: GameState, def: BeyondLayerDef): Decimal => s.totals.run[def.prevCurrency] ?? ZERO;
const resetsOf = (s: GameState, id: string): number => s.stats[LAYER_COUNTERS[id]!.all] ?? 0;
export const beyondOpen = (s: GameState, id: string): boolean => resetsOf(s, id) > 0;

export function beyondGain(s: GameState, id: string): Decimal {
  const def = BEYOND_BY_ID.get(id);
  if (!def) return ZERO;
  const run = beyondRun(s, def);
  const need = beyondNeed(id);
  if (run.lt(need)) return ZERO;
  return resetCeiling(s, id, run.div(need).pow(BY.gainPow).mul(stat(s, def.gainStat))).floor();
}

export const beyondReady = (s: GameState, id: string): boolean => beyondGain(s, id).gte(1);

/** The layer below's currency this run needed for one more. */
export function beyondNextAt(s: GameState, id: string): Decimal {
  const def = BEYOND_BY_ID.get(id)!;
  const next = unResetCeiling(s, id, beyondGain(s, id).add(1));
  return next.div(stat(s, def.gainStat)).pow(1 / BY.gainPow).mul(beyondNeed(id));
}

/** When each layer's reset first shows: its "stirs" milestone one layer down, or once it has been done. */
export function beyondSeen(s: GameState, id: string): boolean {
  const def = BEYOND_BY_ID.get(id)!;
  return resetsOf(s, id) > 0 || milestoneReached(s, def.prev, id);
}

// ---------- the Tesseract (Hyperverse) ----------

const T = BY.tesseract;
const axisCurve: CostCurve = { base: D(T.costBase), brackets: [{ from: 0, ratio: D(T.costGrowth) }] };
export const tesseractOpen = (s: GameState) => beyondOpen(s, 'hyperverse');

export function axisPlan(s: GameState, i: number): PurchasePlan {
  return planPurchase(axisCurve, s.tesseract.levels[i] ?? 0, usable(s, 'tesseracts'), s.settings.buyAmount, s.settings.customBuyAmount);
}

export function buyAxis(s: GameState, i: number): boolean {
  if (!tesseractOpen(s) || i < 0 || i >= AXES.length) return false;
  const plan = axisPlan(s, i);
  if (plan.count <= 0 || !plan.canAfford || !spend(s, 'tesseracts', plan.cost)) return false;
  s.tesseract.levels[i] = (s.tesseract.levels[i] ?? 0) + plan.count;
  invalidateStats();
  events.emit({ t: 'purchase', kind: 'axis', id: AXES[i]!, amount: plan.count });
  return true;
}

/** Folds an axis through a layer ('' to clear it). Each layer can hold one axis. Free: the puzzle is the order. */
export function setAxis(s: GameState, i: number, layerId: string): boolean {
  if (!tesseractOpen(s) || i < 0 || i >= AXES.length || (layerId !== '' && !FOLD_BY_LAYER.has(layerId))) return false;
  s.tesseract.axes = s.tesseract.axes.map((a, k) => (k !== i && a === layerId && layerId !== '' ? '' : a));
  s.tesseract.axes[i] = layerId;
  invalidateStats();
  return true;
}

/** How many neighbours (round the four axes) hold the layer next to this one in order: each multiplies its power x1.5. */
export function resonance(s: GameState, i: number): number {
  const here = s.tesseract.axes[i];
  if (!here) return 0;
  const k = layerIndex(here);
  let n = 0;
  for (const d of [-1, 1]) {
    const other = s.tesseract.axes[(i + d + AXES.length) % AXES.length];
    if (other && Math.abs(layerIndex(other) - k) === 1) n++;
  }
  return n;
}

/** An axis's multiplier on its layer's gain: (1 + log10(1 + lifetime currency))^(level x 1.5^resonance). */
export function axisMult(s: GameState, i: number): Decimal {
  const fold = FOLD_BY_LAYER.get(s.tesseract.axes[i] ?? '');
  const lvl = s.tesseract.levels[i] ?? 0;
  if (!fold || lvl <= 0) return D(1);
  const amount = s.totals.all[fold.currency] ?? ZERO;
  return amount.add(1).log10().add(1).pow(lvl * T.resonance ** resonance(s, i));
}

// ---------- the Pantheon (Omniverse) ----------

const P = BY.pantheon;
const devCurve: CostCurve = { base: D(P.devBase), brackets: [{ from: 0, ratio: D(P.devGrowth) }] };
export const pantheonOpen = (s: GameState) => beyondOpen(s, 'omniverse');
export const wakeCost = (s: GameState): Decimal => D(P.wakeBase).mul(D(P.wakeGrowth).pow(s.pantheon.awake.length));
export const devotionOf = (s: GameState, id: string): number => s.pantheon.devotion[id] ?? 0;

export function wakeAspect(s: GameState, id: string): boolean {
  if (!pantheonOpen(s) || !ASPECT_BY_ID.has(id) || s.pantheon.awake.includes(id) || !spend(s, 'aether', wakeCost(s))) return false;
  s.pantheon.awake.push(id);
  // the first three woken stand Ascendant by themselves
  if (s.pantheon.ascendant.length < P.slots) s.pantheon.ascendant.push(id);
  findRites(s);
  invalidateStats();
  events.emit({ t: 'purchase', kind: 'aspect', id, amount: 1 });
  return true;
}

export function devotionPlan(s: GameState, id: string): PurchasePlan {
  return planPurchase(devCurve, devotionOf(s, id), usable(s, 'aether'), s.settings.buyAmount, s.settings.customBuyAmount);
}

export function buyDevotion(s: GameState, id: string): boolean {
  if (!pantheonOpen(s) || !s.pantheon.awake.includes(id)) return false;
  const plan = devotionPlan(s, id);
  if (plan.count <= 0 || !plan.canAfford || !spend(s, 'aether', plan.cost)) return false;
  s.pantheon.devotion[id] = devotionOf(s, id) + plan.count;
  invalidateStats();
  events.emit({ t: 'purchase', kind: 'devotion', id, amount: plan.count });
  return true;
}

/** Stands an Aspect Ascendant (full strength) or back down (a tenth). Three at most. */
export function setAscendant(s: GameState, id: string, on: boolean): boolean {
  if (!pantheonOpen(s) || !s.pantheon.awake.includes(id)) return false;
  const list = s.pantheon.ascendant.filter((x) => x !== id);
  if (on) {
    if (list.length >= P.slots) return false;
    list.push(id);
  }
  s.pantheon.ascendant = list;
  findRites(s);
  invalidateStats();
  return true;
}

/** Every pair standing Ascendant together finds its Rite, for good. */
function findRites(s: GameState): void {
  const up = s.pantheon.ascendant;
  for (const r of RITES) {
    if (!s.pantheon.rites.includes(r.id) && up.includes(r.a) && up.includes(r.b)) {
      s.pantheon.rites.push(r.id);
      s.stats.ritesFound = s.pantheon.rites.length;
      events.emit({ t: 'toast', title: r.name, body: `A Rite found: every Aspect +${Math.round(P.ritePer * 100)}% stronger, for good.`, icon: 'pantheon' });
    }
  }
}

/** How strongly an Aspect counts: full when Ascendant, a tenth otherwise, more for every Rite found. */
export function aspectShare(s: GameState, id: string): number {
  if (!s.pantheon.awake.includes(id)) return 0;
  return (s.pantheon.ascendant.includes(id) ? 1 : P.restShare) * (1 + P.ritePer * s.pantheon.rites.length);
}

// ---------- the Laws (Genesis) ----------

const LW = BY.laws;
export const lawsOpen = (s: GameState) => beyondOpen(s, 'genesis');
export const lawOf = (s: GameState, id: string): number => s.laws[id] ?? 0;
/** One point per doubling of lifetime Origin Seeds, plus one. */
export const lawPoints = (s: GameState): number => 1 + Math.floor(Math.log2(1 + (s.totals.all.originSeeds ?? ZERO).min(1e300).toNumber()));
export const lawPointsUsed = (s: GameState): number => LAWS.reduce((a, l) => a + Math.abs(lawOf(s, l.id)), 0);
export const harmony = (s: GameState): boolean => LAWS.every((l) => lawOf(s, l.id) !== 0);

/** Turns a law to a setting (-5 to 5), if the points allow. */
export function setLaw(s: GameState, id: string, value: number): boolean {
  if (!lawsOpen(s) || !LAW_BY_ID.has(id) || !Number.isInteger(value) || Math.abs(value) > LW.maxStep) return false;
  const used = lawPointsUsed(s) - Math.abs(lawOf(s, id)) + Math.abs(value);
  if (used > lawPoints(s)) return false;
  s.laws[id] = value;
  invalidateStats();
  return true;
}

// ---------- Past Lives and Miracles (Apotheosis) ----------

const LV = BY.lives;
export const livesOpen = (s: GameState) => beyondOpen(s, 'apotheosis');
export const livesKept = (s: GameState): number => LV.keep + (s.lives.miracles.includes('mir.lives') ? 1 : 0);
/** Every remembered Life's score counts; the guiding one three times. */
export function livesScore(s: GameState): number {
  return s.lives.list.reduce((a, l, i) => a + l.score * (i === s.lives.guide ? LV.guide : 1), 0);
}

export function setGuide(s: GameState, i: number): boolean {
  if (!livesOpen(s) || i < -1 || i >= s.lives.list.length) return false;
  s.lives.guide = i;
  invalidateStats();
  return true;
}

export function buyMiracle(s: GameState, id: string): boolean {
  const m = MIRACLE_BY_ID.get(id);
  if (!m || !livesOpen(s) || s.lives.miracles.includes(id) || !spend(s, 'divinity', D(m.cost))) return false;
  s.lives.miracles.push(id);
  s.stats.miracles = s.lives.miracles.length;
  invalidateStats();
  events.emit({ t: 'purchase', kind: 'miracle', id, amount: 1 });
  return true;
}

/** At each Apotheosis: this run becomes a Life (scored on its Origin Seeds); the best few are remembered. */
function recordLife(s: GameState, seeds: Decimal): void {
  const score = Math.round(LV.scorePer * seeds.add(1).log10().toNumber());
  const guide = s.lives.list[s.lives.guide];
  const list = [...s.lives.list, { n: s.stats.apotheosesAll ?? 1, score }].sort((a, b) => b.score - a.score || a.n - b.n).slice(0, livesKept(s));
  s.lives.list = list;
  s.lives.guide = guide ? list.indexOf(guide) : list.length > 0 ? 0 : -1;
  s.stats.bestLife = Math.max(s.stats.bestLife ?? 0, score);
}

// ---------- what each reset wipes ----------

const zero = (s: GameState, c: string) => {
  s.currencies[c] = ZERO;
  s.totals.run[c] = ZERO;
  s.totals.all[c] = ZERO;
};

const WIPES: Record<string, (s: GameState) => void> = {
  ...LAYER_WIPES,
  hyperverse: (s) => {
    zero(s, 'tesseracts');
    if (!milestoneReached(s, 'omniverse', 'keepAxes') && !milestoneReached(s, 'genesis', 'keepAxes')) s.tesseract = { axes: ['', '', '', ''], levels: [0, 0, 0, 0] };
  },
  omniverse: (s) => {
    zero(s, 'aether');
    if (!milestoneReached(s, 'genesis', 'keepPantheon') && !milestoneReached(s, 'apotheosis', 'keepPantheon')) s.pantheon = { awake: [], devotion: {}, ascendant: [], rites: s.pantheon.rites };
  },
  genesis: (s) => {
    zero(s, 'originSeeds');
    if (!milestoneReached(s, 'apotheosis', 'keepLaws')) s.laws = {};
  },
};

const NAMES: Record<string, string> = { galactic: 'Galactic', crunch: 'Big Crunch', multiverse: 'Multiverse', hyperverse: 'Hyperverse', omniverse: 'Omniverse', genesis: 'Genesis' };
const WHAT: Record<string, string> = {
  galactic: 'Galaxy Cores, the Galactic Tree, galaxies, the Observatory, megastructures and colonies',
  crunch: 'Chronons, Eternity upgrades, Eternal Constants and the Echo boards',
  multiverse: 'Sparks, Spark choices, Omni Constants and the Universe Forge',
  hyperverse: 'Tesseracts and the Tesseract',
  omniverse: 'Aether and the Pantheon (Rites stay)',
  genesis: 'Origin Seeds and the Laws',
};

/** The next layer up whose "resets nothing" milestone covers this one. */
const freeBy = (id: string): { layer: string; milestone: string } | null => {
  const up = BEYOND_LAYERS.find((d) => d.prev === id);
  return up ? { layer: up.id, milestone: `${id}Free` } : null;
};

function partsOf(def: BeyondLayerDef): ResetPart[] {
  const free = freeBy(def.id);
  return def.wipes.map((w) => ({
    id: w,
    label: `The ${NAMES[w]} layer: ${WHAT[w]}`,
    reset: (s: GameState) => WIPES[w]!(s),
    keptBy: (s: GameState) => (free && milestoneReached(s, free.layer, free.milestone) ? `Milestone: 10 ${BEYOND_BY_ID.get(free.layer)!.name}s` : null),
  }));
}

// ---------- stat sources ----------

function sources(): StatSource[] {
  const out: StatSource[] = [];
  // lifetime glows: each beyond currency boosts the layer below's gain
  for (const def of BEYOND_LAYERS) {
    const below = def.prev === 'multiverse' ? 'sparkGain' : BEYOND_BY_ID.get(def.prev)!.gainStat;
    out.push({ id: `beyond.glow.${def.id}`, stat: below, op: 'mul', label: `${def.currencyName} (lifetime)`, value: (s) => (s.totals.all[def.currency] ?? ZERO).add(1).pow(BY.glowPow), active: (s) => (s.totals.all[def.currency] ?? ZERO).gt(0) });
  }
  // the Tesseract: one source per layer an axis can fold through
  for (const f of FOLDS)
    out.push({
      id: `tesseract.${f.layer}`,
      stat: f.stat,
      op: 'mul',
      label: `Tesseract: ${f.name} axis`,
      value: (s) => s.tesseract.axes.reduce((m, a, i) => (a === f.layer ? m.mul(axisMult(s, i)) : m), D(1)),
      active: (s) => s.tesseract.axes.includes(f.layer),
    });
  // the Pantheon: each Aspect's boosts, x per^(devotion x share)
  for (const a of ASPECTS)
    a.boosts.forEach((b, k) =>
      out.push({ id: `aspect.${a.id}.${k}`, stat: b.stat, op: 'mul', label: `${a.name} (Pantheon)`, value: (s) => D(b.per).pow(devotionOf(s, a.id) * aspectShare(s, a.id)), active: (s) => s.pantheon.awake.includes(a.id) && devotionOf(s, a.id) > 0 }),
    );
  // the Laws: turned up, its stat x per^step and the other side gives back sidePow of a step; turned down, the reverse
  for (const l of LAWS) {
    out.push({ id: `law.${l.id}.up`, stat: l.up.stat, op: 'mul', label: `Law: ${l.name}`, value: (s) => { const v = lawOf(s, l.id); return D(l.up.per).pow(v > 0 ? v : v * BY.laws.sidePow); }, active: (s) => lawOf(s, l.id) !== 0 });
    out.push({ id: `law.${l.id}.down`, stat: l.down.stat, op: 'mul', label: `Law: ${l.name}`, value: (s) => { const v = lawOf(s, l.id); return D(l.down.per).pow(v < 0 ? -v : -v * BY.laws.sidePow); }, active: (s) => lawOf(s, l.id) !== 0 });
  }
  out.push({ id: 'law.harmony', stat: 'seedGain', op: 'mul', label: 'Harmony (every law turned)', value: () => D(BY.laws.harmony), active: harmony });
  // Past Lives: +1% to the four beyond gains a point of score
  for (const g of ['tesseractGain', 'aetherGain', 'seedGain', 'divinityGain'])
    out.push({ id: `lives.${g}`, stat: g, op: 'mul', label: 'Past Lives', value: (s) => D(1 + livesScore(s) * BY.lives.perScore), active: (s) => s.lives.list.length > 0 });
  // Miracles
  for (const m of MIRACLES) if (m.effect) out.push({ id: `miracle.${m.id}`, stat: m.effect.stat, op: m.effect.op, label: `${m.name} (Miracle)`, value: () => D(m.effect!.value), active: (s) => s.lives.miracles.includes(m.id) });
  for (const g of ['productionMult', 'shardGain', 'essenceGain', 'darkMatterGain', 'galaxyCoreGain', 'chrononGain', 'sparkGain', 'tesseractGain', 'aetherGain', 'seedGain', 'divinityGain'])
    out.push({ id: `miracle.last.${g}`, stat: g, op: 'mul', label: 'The Last Star (Miracle)', value: () => D(10), active: (s) => s.lives.miracles.includes('mir.last') });
  return out;
}

// ---------- registration ----------

/** The Origin Seeds of the run an Apotheosis ends, read just before the reset wipes them (not saved). */
const runSeeds = new WeakMap<GameState, Decimal>();

export function registerBeyond(): void {
  onBeforeReset((s, id) => {
    if (id === 'apotheosis') runSeeds.set(s, s.totals.run.originSeeds ?? ZERO);
  });
  for (const def of BEYOND_LAYERS) defineStat({ id: def.gainStat, label: `${def.currencyName} gain`, base: () => D(1) });
  registerSources(...sources());
  for (const def of BEYOND_LAYERS) {
    const counter = LAYER_COUNTERS[def.id]!;
    const below = LAYER_COUNTERS[def.prev]!;
    // the layer below's milestones stay from this layer's first reset (milestone 1)
    const keepBelow = def.milestones[0]!.id;
    registerLayer({
      id: def.id,
      name: def.name,
      action: def.action,
      currency: def.currency,
      color: def.color,
      counter: counter.run,
      ready: (s) => beyondReady(s, def.id),
      gain: (s) => beyondGain(s, def.id),
      parts: partsOf(def),
      alwaysKept: [
        `${def.currencyName} and ${def.feature.name}`,
        'Every layer more than three below: the Stardust layer up to the Singularity, running themselves',
        'Counts and milestones of every layer, Trials, the Spire, the Leviathans and every collection',
        'Medals and everything you have unlocked',
      ],
      milestones: def.milestones,
      onReset: (s) => {
        s.stats[counter.all] = (s.stats[counter.all] ?? 0) + 1;
        s.stats[`${counter.run}Best`] = Math.max(s.stats[`${counter.run}Best`] ?? 0, s.stats[counter.run] ?? 0);
        // the layer below counts again from this run (its milestones stay through this layer's milestone 1)
        s.stats[`${below.run}Best`] = Math.max(s.stats[`${below.run}Best`] ?? 0, s.stats[below.run] ?? 0);
        s.stats[below.run] = 0;
        if (def.id === 'apotheosis') recordLife(s, runSeeds.get(s) ?? ZERO);
        invalidateStats();
      },
    });
    // a layer below a beyond layer keeps its milestones from that layer's first reset
    const lower = layer(def.prev);
    if (lower && !lower.milestoneFloor && BEYOND_BY_ID.has(def.prev)) {
      (lower as { milestoneFloor?: (s: GameState) => number }).milestoneFloor = (s) => (milestoneReached(s, def.id, keepBelow) ? (s.stats[`${below.run}Best`] ?? 0) : 0);
    }
  }

  registerSystem({
    id: 'beyond',
    order: 71,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      if ((s.stats.multiversesAll ?? 0) === 0) return;
      for (const def of BEYOND_LAYERS) {
        if (!beyondOpen(s, def.id)) continue;
        // milestone 4: 1% of the gain a second, without resetting
        if (milestoneReached(s, def.id, 'passive') && beyondReady(s, def.id)) gainPassive(s, def.currency, beyondGain(s, def.id).mul(BALANCE.passive.share * dt * ctx.gainScale));
        // milestone 10: the layer below resets nothing and 1/50 of its gain trickles in
        if (milestoneReached(s, def.id, `${def.prev}Free`)) {
          const g = def.prev === 'multiverse' ? (multiverseReady(s) ? multiverseGain(s) : ZERO) : beyondReady(s, def.prev) ? beyondGain(s, def.prev) : ZERO;
          if (g.gt(0)) gain(s, def.prevCurrency, g.mul(BY.trickle * dt * ctx.gainScale));
        }
      }
    },
  });
}

/** For read-outs: a beyond currency held. */
export const beyondHeld = (s: GameState, id: string): Decimal => cur(s, BEYOND_BY_ID.get(id)?.currency ?? '');
