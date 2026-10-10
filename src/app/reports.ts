import { ENGINES } from '../content/engines';
import { GOALS, MEDALS } from '../content/medals';
import { UPGRADES, whenItApplies } from '../content/upgrades';
import { D, type Decimal } from '../engine/decimal';
import { importSave } from '../engine/save/store';
import { cur } from '../engine/state';
import { breakdown, stat, statLabel } from '../engine/stats';
import { goalValue, hasMedal } from '../engine/systems/medals';
import { hasUpgrade, upgradeAvailable } from '../engine/systems/upgrades';
import { reqProgress, reqText } from '../engine/systems/unlocks';
import { format, formatCount, formatMult, formatTime } from '../ui/format';
import { saveSummary } from './backups';
import { game } from './game';

/**
 * Formatted read-outs for the bigger panels (Stats, Medals, Upgrades, Welcome back, import
 * preview). Panels ask for one when they open and refresh it while open, so these never cost
 * anything in the 10 Hz snapshot. Everything is a ready-to-show string.
 */
const n = () => game.state.settings.notation;
const f = (x: Decimal | number) => format(x, n());

export interface StatLine {
  label: string;
  value: string;
}
export interface StatSection {
  title: string;
  total: string;
  lines: StatLine[];
}

function section(id: string, title?: string, shape: 'num' | 'pct' | 'mult' | 'time' = 'num'): StatSection {
  const s = game.state;
  const show = (v: Decimal, op: string): string => {
    if (op === 'mul') return formatMult(v, n());
    if (op === 'pow') return `^${v.toNumber().toFixed(3)}`;
    if (op === 'softcap') return `slowed above ${f(v)}`;
    if (shape === 'pct') return `${op === 'add' ? '+' : ''}${(v.toNumber() * 100).toFixed(1)}%`;
    if (shape === 'time') return `${op === 'add' ? '+' : ''}${formatTime(v.toNumber())}`;
    if (shape === 'mult') return op === 'add' ? `+${v.toNumber().toFixed(2)}` : formatMult(v, n());
    return `${op === 'add' ? '+' : ''}${f(v)}`;
  };
  return {
    title: title ?? statLabel(id),
    total: show(stat(s, id), 'base'),
    lines: breakdown(s, id).map((l) => ({ label: l.label, value: show(l.value, l.op) })),
  };
}

export function statsReport(): { sections: StatSection[]; counters: StatLine[] } {
  const s = game.state;
  const sections = [
    section('stardustPerSec', 'Stardust per second'),
    section('productionMult', 'Production multiplier', 'mult'),
    section('tapPower', 'Tap power'),
    section('tapSpsShare', 'Share of Stardust/s added to each tap', 'pct'),
    section('critChance', 'Crit chance', 'pct'),
    section('critMult', 'Crit multiplier', 'mult'),
    section('cometRate', 'Comet rate', 'mult'),
    section('buffDuration', 'Comet buff length', 'mult'),
    section('offlineCap', 'Offline cap', 'time'),
    section('offlineEfficiency', 'Offline efficiency', 'pct'),
    section('runeLuck', 'Rune Luck (from Goals)', 'mult'),
    section('runeBulk', 'Rune Bulk (from Goals)', 'mult'),
  ];
  for (const e of ENGINES) if ((s.engines[e.id] ?? 0) > 0) sections.push(section(`engineMult.${e.id}`, `${e.name} multiplier`, 'mult'));
  const c = s.stats;
  const counters: StatLine[] = [
    { label: 'Time played', value: formatTime(s.playtime) },
    { label: 'Stardust gathered, all time', value: f(s.totals.all.stardust ?? D(0)) },
    { label: 'Stardust gathered, this run', value: f(s.totals.run.stardust ?? D(0)) },
    { label: 'Taps', value: formatCount(c.taps ?? 0, n()) },
    { label: 'Crits', value: formatCount(c.crits ?? 0, n()) },
    { label: 'Best combo', value: formatCount(c.maxCombo ?? 0, n()) },
    { label: 'Comets caught', value: formatCount(c.comets ?? 0, n()) },
    { label: 'Engines bought', value: formatCount(c.enginesBought ?? 0, n()) },
    { label: 'Times evolved', value: formatCount(c.evolves ?? 0, n()) },
    { label: 'Upgrades bought', value: `${s.upgrades.length} / ${UPGRADES.length}` },
    { label: 'Medals', value: `${s.achievements.length} / ${MEDALS.length}` },
  ];
  return { sections, counters };
}

export interface MedalItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
  earned: boolean;
}
export interface GoalItem {
  id: string;
  name: string;
  icon: string;
  tier: number;
  tiers: number;
  value: string;
  next: string;
  pct: number;
}

export function medalsReport(): { medals: MedalItem[]; goals: GoalItem[]; summary: string } {
  const s = game.state;
  const medals = MEDALS.map((m) => ({ id: m.id, name: m.name, desc: m.desc, icon: m.icon, earned: hasMedal(s, m.id) }));
  const goals = GOALS.map((g): GoalItem => {
    const tier = s.goals[g.id] ?? 0;
    const v = goalValue(s, g);
    const target = g.tiers[tier];
    const prev = tier === 0 ? 0 : g.tiers[tier - 1]!;
    const pct = target === undefined ? 100 : Math.floor(Math.max(0, Math.min(1, v.sub(prev).div(target - prev).toNumber())) * 100);
    return {
      id: g.id,
      name: g.name,
      icon: g.icon,
      tier,
      tiers: g.tiers.length,
      value: `${f(v)} ${g.noun}`,
      next: target === undefined ? 'Every tier done' : `Next tier at ${f(target)}`,
      pct,
    };
  });
  const earned = medals.filter((m) => m.earned).length;
  const goalTiers = goals.reduce((a, g) => a + g.tier, 0);
  return {
    medals,
    goals,
    summary: `${earned} of ${MEDALS.length} medals and ${goalTiers} Goal tiers: +${earned + goalTiers}% Stardust`,
  };
}

export interface UpgradeItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  desc: string;
  when: string;
  cost: string;
  state: 'bought' | 'available' | 'locked';
  req: string;
  pct: number;
  can: boolean;
}

export function upgradesReport(): UpgradeItem[] {
  const s = game.state;
  const money = cur(s, 'stardust');
  const order = { available: 0, locked: 1, bought: 2 } as const;
  return UPGRADES.map((u): UpgradeItem => {
    const state = hasUpgrade(s, u.id) ? 'bought' : upgradeAvailable(s, u) ? 'available' : 'locked';
    return {
      id: u.id,
      name: u.name,
      icon: u.icon,
      color: u.color,
      desc: u.desc,
      when: whenItApplies(u.effect),
      cost: f(u.cost),
      state,
      req: reqText(u.req, (x) => f(x)),
      pct: Math.floor(reqProgress(s, u.req) * 100),
      can: money.gte(u.cost),
    };
  }).sort((a, b) => order[a.state] - order[b.state]);
}

export interface WelcomeReport {
  away: string;
  counted: string;
  capped: boolean;
  efficiency: string;
  gains: StatLine[];
  notes: string[];
}

export function welcomeReport(): WelcomeReport | null {
  const r = game.bootReport;
  if (!r) return null;
  const s = game.state;
  return {
    away: formatTime(r.secondsAway),
    counted: `${formatTime(r.secondsCounted)} of ${formatTime(stat(s, 'offlineCap').toNumber())} cap`,
    capped: r.capped,
    efficiency: `${Math.round(r.efficiency * 100)}%`,
    gains: Object.entries(r.gains).map(([k, v]) => ({ label: k === 'stardust' ? 'Stardust' : k, value: `+${f(v)}` })),
    notes: r.notes,
  };
}

/** Reads a save code without loading it, for the import preview. */
export function previewImport(code: string): { ok: true; summary: string; savedAt: string } | { ok: false; error: string } {
  try {
    const r = importSave(code.trim());
    return { ok: true, summary: saveSummary(r.state), savedAt: new Date(r.savedAt).toLocaleString() };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
