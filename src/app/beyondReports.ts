import { BALANCE } from '../content/balance';
import { LAYER_COUNTERS } from '../content/layers';
import { ASPECTS, AXES, BEYOND_BY_ID, EPILOGUE, FOLD_BY_LAYER, FOLDS, LAWS, LIFE_TITLES, MIRACLES, RITES } from '../content/beyond';
import { layer, milestoneReached, resetPreview, resetsDone } from '../engine/layers';
import { cur } from '../engine/state';
import {
  aspectShare,
  axisMult,
  axisPlan,
  beyondGain,
  beyondNeed,
  beyondNextAt,
  beyondReady,
  beyondRun,
  beyondSeen,
  devotionOf,
  devotionPlan,
  harmony,
  lawOf,
  lawPoints,
  lawPointsUsed,
  lawsOpen,
  livesKept,
  livesOpen,
  livesScore,
  pantheonOpen,
  resonance,
  tesseractOpen,
  wakeCost,
} from '../engine/systems/beyond';
import { format, formatMult } from '../ui/format';
import { game } from './game';

/** 1.4.0: read-outs for the four resets beyond the Multiverse and their systems. */
const n = () => game.state.settings.notation;

export interface BeyondLayerReport {
  id: string;
  seen: boolean;
  name: string;
  color: string;
  icon: string;
  action: string;
  currencyName: string;
  held: string;
  ready: boolean;
  gain: string;
  prevName: string;
  run: string;
  need: string;
  pct: number;
  next: string;
  done: number;
  blurb: string;
  milestones: Array<{ at: number; text: string; reached: boolean }>;
  resets: string[];
  kept: Array<{ label: string; why: string }>;
  feature: { id: string; name: string; open: boolean };
}

export function beyondLayerReport(id: string): BeyondLayerReport | null {
  const s = game.state;
  const def = BEYOND_BY_ID.get(id);
  const L = layer(id);
  if (!def || !L) return null;
  const p = resetPreview(s, id)!;
  const run = beyondRun(s, def);
  const need = beyondNeed(id);
  const done = resetsDone(s, L);
  return {
    id,
    seen: beyondSeen(s, id),
    name: def.name,
    color: def.color,
    icon: def.icon,
    action: def.action,
    currencyName: def.currencyName,
    held: format(cur(s, def.currency), n()),
    ready: beyondReady(s, id),
    gain: format(beyondGain(s, id), n()),
    prevName: def.prevName,
    run: format(run, n()),
    need: format(need, n()),
    pct: Math.floor(Math.min(1, run.div(need).toNumber()) * 100),
    next: format(beyondNextAt(s, id), n()),
    done,
    blurb: def.blurb,
    milestones: def.milestones.map((m) => ({ at: m.at, text: m.text, reached: milestoneReached(s, id, m.id) })),
    resets: p.resets,
    kept: p.kept,
    feature: { id: def.feature.id, name: def.feature.name, open: (s.stats[LAYER_COUNTERS[id]!.all] ?? 0) > 0 },
  };
}

// ---------- the Tesseract ----------

export interface AxisRow {
  axis: string;
  layer: string;
  name: string;
  color: string;
  level: number;
  cost: string;
  count: number;
  can: boolean;
  mult: string;
  resonance: number;
}

export function tesseractReport(): { open: boolean; tesseracts: string; axes: AxisRow[]; folds: Array<{ layer: string; name: string; color: string; used: boolean }> } {
  const s = game.state;
  return {
    open: tesseractOpen(s),
    tesseracts: format(cur(s, 'tesseracts'), n()),
    axes: AXES.map((axis, i) => {
      const fold = FOLD_BY_LAYER.get(s.tesseract.axes[i] ?? '');
      const plan = axisPlan(s, i);
      return {
        axis,
        layer: fold?.layer ?? '',
        name: fold?.name ?? 'Unfolded',
        color: fold?.color ?? '#5A5F8F',
        level: s.tesseract.levels[i] ?? 0,
        cost: format(plan.cost, n()),
        count: plan.count,
        can: plan.canAfford && plan.count > 0,
        mult: formatMult(axisMult(s, i), n()),
        resonance: resonance(s, i),
      };
    }),
    folds: FOLDS.map((f) => ({ layer: f.layer, name: f.name, color: f.color, used: s.tesseract.axes.includes(f.layer) })),
  };
}

// ---------- the Pantheon ----------

export interface AspectRow {
  id: string;
  name: string;
  title: string;
  color: string;
  desc: string;
  awake: boolean;
  ascendant: boolean;
  devotion: number;
  cost: string;
  count: number;
  can: boolean;
  share: number;
}

export function pantheonReport(): { open: boolean; aether: string; wakeCost: string; canWake: boolean; slots: number; ascendant: number; aspects: AspectRow[]; rites: Array<{ id: string; name: string; found: boolean }>; found: number } {
  const s = game.state;
  const wc = wakeCost(s);
  return {
    open: pantheonOpen(s),
    aether: format(cur(s, 'aether'), n()),
    wakeCost: format(wc, n()),
    canWake: cur(s, 'aether').gte(wc),
    slots: BALANCE.beyond.pantheon.slots,
    ascendant: s.pantheon.ascendant.length,
    aspects: ASPECTS.map((a) => {
      const plan = devotionPlan(s, a.id);
      return {
        id: a.id,
        name: a.name,
        title: a.title,
        color: a.color,
        desc: a.desc,
        awake: s.pantheon.awake.includes(a.id),
        ascendant: s.pantheon.ascendant.includes(a.id),
        devotion: devotionOf(s, a.id),
        cost: format(plan.cost, n()),
        count: plan.count,
        can: plan.canAfford && plan.count > 0 && s.pantheon.awake.includes(a.id),
        share: Math.round(aspectShare(s, a.id) * 100),
      };
    }),
    rites: RITES.map((r) => ({ id: r.id, name: r.name, found: s.pantheon.rites.includes(r.id) })),
    found: s.pantheon.rites.length,
  };
}

// ---------- the Laws ----------

export interface LawRow {
  id: string;
  name: string;
  color: string;
  value: number;
  up: string;
  down: string;
}

export function lawsReport(): { open: boolean; points: number; used: number; harmony: boolean; max: number; laws: LawRow[] } {
  const s = game.state;
  const side = BALANCE.beyond.laws.sidePow;
  return {
    open: lawsOpen(s),
    points: lawPoints(s),
    used: lawPointsUsed(s),
    harmony: harmony(s),
    max: BALANCE.beyond.laws.maxStep,
    laws: LAWS.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      value: lawOf(s, l.id),
      up: `Up: ${l.up.text} x${format(l.up.per, n())} a step, ${l.down.text} x${format(Math.pow(l.down.per, -side), n())} a step`,
      down: `Down: ${l.down.text} x${format(l.down.per, n())} a step, ${l.up.text} x${format(Math.pow(l.up.per, -side), n())} a step`,
    })),
  };
}

// ---------- Past Lives and Miracles ----------

export function lifeTitle(score: number): string {
  return LIFE_TITLES[Math.min(LIFE_TITLES.length - 1, Math.floor(score / 25))]!;
}

export function livesReport(): {
  open: boolean;
  divinity: string;
  kept: number;
  bonus: string;
  lives: Array<{ n: number; score: number; title: string; guide: boolean }>;
  miracles: Array<{ id: string; name: string; desc: string; cost: number; owned: boolean; can: boolean }>;
  story: readonly string[];
  storySeen: boolean;
} {
  const s = game.state;
  return {
    open: livesOpen(s),
    divinity: format(cur(s, 'divinity'), n()),
    kept: livesKept(s),
    bonus: formatMult(1 + livesScore(s) * BALANCE.beyond.lives.perScore, n()),
    lives: s.lives.list.map((l, i) => ({ n: l.n, score: l.score, title: lifeTitle(l.score), guide: i === s.lives.guide })),
    miracles: MIRACLES.map((m) => ({ id: m.id, name: m.name, desc: m.desc, cost: m.cost, owned: s.lives.miracles.includes(m.id), can: !s.lives.miracles.includes(m.id) && cur(s, 'divinity').gte(m.cost) })),
    story: EPILOGUE,
    storySeen: s.lives.storySeen,
  };
}
