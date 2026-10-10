import { BALANCE } from '../content/balance';
import { ELEMENTS, type Family, FAMILY_COLORS, FAMILY_NAMES, SPECIAL_PERKS } from '../content/elements';
import { FORGE_UPGRADES, GRADE_BY_ID, GRADES, type GradeId, RELICS, type RelicDef } from '../content/forge';
import { TIERS } from '../content/tiers';
import { D } from '../engine/decimal';
import { cur } from '../engine/state';
import { elementLevel, familyLevels, maxZForTier, rowComplete, rowElements, samples, samplesFor } from '../engine/systems/codex';
import {
  batchAlloy,
  batchOre,
  batchSeconds,
  collectorDone,
  crucibles,
  forgeLevel,
  forgeOpen,
  forgePlan,
  relicEffect,
  relicLevel,
  relicPlan,
  relicSlots,
} from '../engine/systems/forge';
import { format, formatCount } from '../ui/format';
import { game } from './game';

/** Read-outs for the Starforge panel: the furnace, relics and the Element Codex. */
const n = () => game.state.settings.notation;

/** 0.25 -> "25%", 0.005 -> "0.5%", 12.5 -> "1.25K%". */
export function pct(x: number): string {
  const v = x * 100;
  if (v >= 1000) return `${format(v, n())}%`;
  if (v >= 10) return `${Math.round(v)}%`;
  return `${Number(v.toFixed(v >= 1 ? 1 : 2))}%`;
}

/** Short durations: "30m", "1h 10m", "45s". */
export function dur(sec: number): string {
  const t = Math.round(sec);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const x = t % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return x > 0 ? `${m}m ${x}s` : `${m}m`;
  return `${x}s`;
}

/** What a relic does at a level, in words: "+25% engine output", "+30m offline cap". */
export function relicEffectText(def: RelicDef, level: number): string {
  const e = relicEffect(def, Math.max(1, level));
  if (def.kind === 'mul') return `+${pct(e)} ${def.what}`;
  if (def.kind === 'reduce') return `${pct(e / (1 + e))} ${def.what}`;
  switch (def.stat) {
    case 'critChance':
    case 'offlineEfficiency':
      return `+${pct(e)} ${def.what}`;
    case 'offlineCap':
      return `+${dur(e)} ${def.what}`;
    case 'masteryMult':
    case 'milestoneBase':
      return `+${e.toFixed(2)}x ${def.what}`;
    default:
      return `+${formatCount(Math.round(e), n())} ${def.what}`;
  }
}

export interface ForgeReport {
  open: boolean;
  on: boolean;
  share: number;
  grade: string;
  gradeColor: string;
  status: string;
  ore: string;
  grades: Array<{ id: string; name: string; color: string; ore: string; alloy: string; selected: boolean }>;
  crucibles: Array<{ pct: number; color: string; busy: boolean }>;
  batch: string;
  perMinute: string;
  /** For the drawing: crucibles busy, how full the hopper looks, seconds per batch. */
  busy: number;
  fill: number;
  seconds: number;
  upgrades: Array<{ id: string; name: string; desc: string; icon: string; level: string; count: number; cost: string; can: boolean; maxed: boolean }>;
}

export function forgeReport(): ForgeReport {
  const s = game.state;
  const g = GRADE_BY_ID.get(s.forge.grade) ?? GRADES[0]!;
  const T = batchSeconds(s);
  const ore = batchOre(s);
  const have = cur(s, g.ore);
  const busy = s.forge.lanes.length;
  const status = !s.forge.on
    ? busy > 0
      ? 'Switched off: finishing what is in the crucibles'
      : 'Switched off'
    : busy === 0 && have.lt(ore)
      ? g.id === 'iron' && s.forge.share < 1
        ? `Waiting for ore: a batch needs ${format(ore, n())}, and the hopper takes ${s.forge.share === 0.5 ? 'half' : 'a tenth'} of what you mine`
        : `Waiting for ${g.name} ore: a batch needs ${format(ore, n())}`
      : `Smelting ${g.name} ore`;
  return {
    open: forgeOpen(s),
    on: s.forge.on,
    share: s.forge.share,
    grade: g.id,
    gradeColor: g.color,
    status,
    ore: format(cur(s, 'ore'), n()),
    grades: GRADES.map((x) => ({ id: x.id, name: x.name, color: x.color, ore: format(cur(s, x.ore), n()), alloy: format(cur(s, x.alloy), n()), selected: x.id === g.id })),
    crucibles: Array.from({ length: crucibles(s) }, (_, i) => {
      const lane = s.forge.lanes[i];
      return { pct: lane ? Math.min(100, Math.floor((lane.t / T) * 100)) : 0, color: lane ? (GRADE_BY_ID.get(lane.grade)?.color ?? g.color) : '#3A3466', busy: !!lane };
    }),
    batch: `${format(ore, n())} ${g.name} ore into ${format(batchAlloy(s, g.id as GradeId), n())} alloy every ${T >= 10 ? Math.round(T) : T.toFixed(1)}s`,
    perMinute: format(batchAlloy(s, g.id as GradeId).mul((crucibles(s) * 60) / T), n()),
    busy,
    fill: Math.min(1, have.div(ore.mul(5)).toNumber()),
    seconds: T,
    upgrades: FORGE_UPGRADES.map((u) => {
      const plan = forgePlan(s, u.id);
      return {
        id: u.id,
        name: u.name,
        desc: u.desc,
        icon: u.icon,
        level: u.id === 'crucibles' ? `${crucibles(s)} / ${BALANCE.forge.maxCrucibles}` : `Lv ${forgeLevel(s, u.id)}`,
        count: plan.count,
        cost: format(plan.cost, n()),
        can: plan.canAfford,
        maxed: plan.count === 0,
      };
    }),
  };
}

export interface RelicView {
  id: string;
  name: string;
  icon: string;
  level: number;
  maxLevel: string;
  now: string;
  next: string;
  count: number;
  cost: string;
  can: boolean;
  maxed: boolean;
  equipped: boolean;
  canEquip: boolean;
}

export interface RelicsReport {
  slots: number;
  equipped: Array<{ id: string; name: string; icon: string; color: string } | null>;
  grades: Array<{ id: string; name: string; color: string; alloy: string; crafted: number; collector: boolean; relics: RelicView[] }>;
}

export function relicsReport(): RelicsReport {
  const s = game.state;
  const slots = relicSlots(s);
  const full = s.relics.equipped.length >= slots;
  return {
    slots,
    equipped: Array.from({ length: slots }, (_, i) => {
      const id = s.relics.equipped[i];
      const def = id ? RELICS.find((r) => r.id === id) : undefined;
      return def ? { id: def.id, name: def.name, icon: def.icon, color: GRADE_BY_ID.get(def.grade)!.color } : null;
    }),
    grades: GRADES.map((g) => {
      const relics = RELICS.filter((r) => r.grade === g.id).map((def): RelicView => {
        const level = relicLevel(s, def.id);
        const plan = relicPlan(s, def.id);
        const equipped = s.relics.equipped.includes(def.id);
        return {
          id: def.id,
          name: def.name,
          icon: def.icon,
          level,
          maxLevel: def.maxLevel ? ` / ${def.maxLevel}` : '',
          now: level > 0 ? relicEffectText(def, level) : 'Not crafted yet',
          next: plan.count > 0 ? relicEffectText(def, level + plan.count) : 'Max level',
          count: plan.count,
          cost: format(plan.cost, n()),
          can: plan.canAfford,
          maxed: plan.count === 0,
          equipped,
          canEquip: level > 0 && !equipped && !full,
        };
      });
      return {
        id: g.id,
        name: g.name,
        color: g.color,
        alloy: format(cur(s, g.alloy), n()),
        crafted: relics.filter((r) => r.level > 0).length,
        collector: collectorDone(s, g.id),
        relics,
      };
    }),
  };
}

const STAT_WORDS: Record<string, string> = {
  productionMult: 'production',
  offlineCap: 'offline cap',
  tapPower: 'tap power',
  engineCostMult: 'cheaper engines',
  alloyGain: 'alloy gain',
  cometRate: 'comet rate',
  xpGain: 'Starsmith XP',
  critMult: 'crit size',
  oreGain: 'ore gain',
  shardGain: 'shard gain',
};

/** "+4% production per level" for a family. */
export function familyPerk(f: Family): string {
  const p = (BALANCE.codex.families as Record<Family, { stat: string; kind: string; per: number }>)[f];
  const words = STAT_WORDS[p.stat] ?? p.stat;
  if (p.stat === 'offlineCap') return `+${dur(p.per)} ${words} per level`;
  return `${p.kind === 'reduce' ? '' : '+'}${pct(p.per)} ${words} per level`;
}

export interface CodexReport {
  found: number;
  reach: string;
  each: number;
  elements: Array<{ id: string; symbol: string; name: string; z: number; row: number; col: number; color: string; family: string; samples: string; level: number; reachable: boolean }>;
  families: Array<{ id: string; name: string; color: string; levels: number; perk: string; now: string }>;
  rows: Array<{ row: number; done: boolean; found: number; total: number; bonus: string }>;
  special: Record<string, string>;
}

export function codexReport(): CodexReport {
  const s = game.state;
  const z = maxZForTier(s.tier);
  const upTo = ELEMENTS[z - 1]!;
  const each = samplesFor(s.totals.run.stardust ?? D(0));
  const fams = Object.keys(FAMILY_NAMES) as Family[];
  return {
    found: ELEMENTS.filter((e) => samples(s, e.id) > 0).length,
    reach: `A Supernova as a ${TIERS[s.tier]?.name ?? 'star'} gives samples up to ${upTo.name} (${z} elements)`,
    each,
    elements: ELEMENTS.map((e) => ({
      id: e.id,
      symbol: e.symbol,
      name: e.name,
      z: e.z,
      row: e.row,
      col: e.col,
      color: FAMILY_COLORS[e.family],
      family: FAMILY_NAMES[e.family],
      samples: formatCount(samples(s, e.id), n()),
      level: elementLevel(s, e.id),
      reachable: e.z <= z,
    })),
    families: fams.map((f) => {
      const levels = familyLevels(s, f);
      const p = (BALANCE.codex.families as Record<Family, { stat: string; per: number }>)[f];
      return { id: f, name: FAMILY_NAMES[f], color: FAMILY_COLORS[f], levels, perk: familyPerk(f), now: levels > 0 ? (p.stat === 'offlineCap' ? `+${dur(p.per * levels)}` : pct(p.per * levels)) : '' };
    }),
    rows: BALANCE.codex.rowStats.map((st, i) => {
      const els = rowElements(i + 1);
      return {
        row: i + 1,
        done: rowComplete(s, i + 1),
        found: els.filter((e) => samples(s, e.id) > 0).length,
        total: els.length,
        bonus: `x${BALANCE.codex.rowMult} ${st.map((x) => STAT_WORDS[x] ?? x).join(' and ')}`,
      };
    }),
    special: SPECIAL_PERKS,
  };
}

/** One line for the Supernova confirm screen. */
export function codexPreviewText(): string {
  const s = game.state;
  const z = maxZForTier(s.tier);
  const each = samplesFor(s.totals.run.stardust ?? D(0));
  if (each <= 0) return '';
  const upTo = ELEMENTS[z - 1]!;
  const next = ELEMENTS[z];
  const heavier = next ? ` A bigger star reaches ${next.name} and beyond.` : '';
  return `Codex: +${formatCount(each, n())} sample${each === 1 ? '' : 's'} each of ${z} elements, Hydrogen to ${upTo.name}.${heavier}`;
}

