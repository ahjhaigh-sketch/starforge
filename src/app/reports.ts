import { AUTO_LAYERS, LAYER_NAMES } from '../content/layers';
import { CURRENCY_LABEL } from '../content/galaxyBuild';
import { autoLevel } from '../engine/layerAuto';
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
import { GRADES, RELICS } from '../content/forge';

/**
 * Formatted read-outs for the bigger panels (Stats, Medals, Upgrades, Welcome back, import
 * preview). Panels ask for one when they open and refresh it while open, so these never cost
 * anything in the 10 Hz snapshot. Everything is a ready-to-show string.
 */
const n = () => game.state.settings.notation;
const CURRENCY_NAMES: Record<string, string> = { ...CURRENCY_LABEL, chronons: 'Chronons', sparks: 'Multiverse Sparks' };
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

/** A medal's icon carries its milestone ("1K" taps, "T5", "e21" Stardust), so each tier of a medal has its own symbol. */
function shortCount(c: number): string {
  if (c >= 1e12) return `e${Math.floor(Math.log10(c))}`;
  if (c >= 1e9) return `${+(c / 1e9).toFixed(1)}B`;
  if (c >= 1e6) return `${+(c / 1e6).toFixed(1)}M`;
  if (c >= 1e3) return `${+(c / 1e3).toFixed(1)}K`;
  return String(c);
}
function medalIcon(m: (typeof MEDALS)[number]): string {
  const q = m.req;
  if (q.kind === 'tier') return `${m.icon}#T${q.tier + 1}`;
  const c = q.kind === 'count' || q.kind === 'medals' || q.kind === 'upgrades' || q.kind === 'engine' || q.kind === 'systems' ? q.count : q.kind === 'total' || q.kind === 'rate' ? q.amount : 0;
  return c > 1 ? `${m.icon}#${shortCount(c)}` : m.icon;
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
    section('shardGain', 'Shard gain', 'mult'),
    section('oreGain', 'Ore gain', 'mult'),
    section('xpGain', 'Starsmith XP gain', 'mult'),
    section('alloyGain', 'Alloy gain', 'mult'),
    section('forgeSpeed', 'Smelting speed', 'mult'),
    section('drillPower', 'Drilling power', 'mult'),
    section('runeLuck', 'Rune Luck (from Goals)', 'mult'),
    section('runeBulk', 'Rune Bulk (from Goals)', 'mult'),
  ];
  // 1.4.0: every layer's gains, from the layer that brings them (the playtest: "add all of that onto ... the stats menu")
  const has = (counter: string) => (s.stats[counter] ?? 0) > 0;
  const later: Array<[string, string, string, 'num' | 'pct' | 'mult' | 'time']> = [
    ['supernovasAll', 'gameSpeed', 'Game speed', 'mult'],
    ['supernovasAll', 'autoSpeed', 'Auto-buyer speed', 'mult'],
    ['supernovasAll', 'shipSpeed', 'Starship speed', 'mult'],
    ['supernovasAll', 'shipLoot', 'Starship loot', 'mult'],
    ['nebulasAll', 'essenceGain', 'Essence gain', 'mult'],
    ['nebulasAll', 'runeSpeed', 'Rune speed', 'mult'],
    ['nebulasAll', 'auraLuck', 'Aura luck', 'mult'],
    ['nebulasAll', 'mutationLuck', 'Mutation luck', 'mult'],
    ['nebulasAll', 'emberGain', 'Ember gain', 'mult'],
    ['nebulasAll', 'wyrmXp', 'Wyrm XP', 'mult'],
    ['nebulasAll', 'nurseryGrowth', 'Nursery growth', 'mult'],
    ['singularitiesAll', 'darkMatterGain', 'Dark Matter gain', 'mult'],
    ['singularitiesAll', 'massGain', 'Black Hole mass gain', 'mult'],
    ['singularitiesAll', 'antimatterMult', 'Antimatter multiplier', 'mult'],
    ['singularitiesAll', 'leviathanDamage', 'Leviathan damage', 'mult'],
    ['singularitiesAll', 'scaleGain', 'Scale gain', 'mult'],
    ['galacticsAll', 'galaxyCoreGain', 'Galaxy Core gain', 'mult'],
    ['galacticsAll', 'colonyCapacity', 'Colony capacity', 'mult'],
    ['galacticsAll', 'megaRewardPower', 'Megastructure rewards', 'mult'],
    ['crunchesAll', 'chrononGain', 'Chronon gain', 'mult'],
    ['crunchesAll', 'echoMult', 'Echo output', 'mult'],
    ['multiversesAll', 'sparkGain', 'Spark gain', 'mult'],
    ['hyperversesAll', 'tesseractGain', 'Tesseract gain', 'mult'],
    ['omniversesAll', 'aetherGain', 'Aether gain', 'mult'],
    ['genesesAll', 'seedGain', 'Origin Seed gain', 'mult'],
    ['apotheosesAll', 'divinityGain', 'Divinity gain', 'mult'],
  ];
  for (const [counter, id, title, shape] of later) if (has(counter)) sections.push(section(id, title, shape));
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
    { label: 'Asteroids harvested', value: formatCount(c.harvested ?? 0, n()) },
    { label: 'Cores broken', value: formatCount(c.cores ?? 0, n()) },
    { label: 'Batches smelted', value: formatCount(c.smelts ?? 0, n()) },
    { label: 'Relics crafted', value: `${c.relics ?? 0} / ${RELICS.length}` },
    { label: 'Elements found', value: `${c.elements ?? 0} / 118` },
  ];
  // 1.4.0: every reset layer you've reached, its resets over all time and its best currency, and the systems that grew
  const layerRows: Array<[string, string, string]> = [
    ['supernovasAll', 'Supernovas', 'shards'],
    ['nebulasAll', 'Nebulas', 'essence'],
    ['singularitiesAll', 'Singularities', 'darkMatter'],
    ['galacticsAll', 'Galactic Rebirths', 'galaxyCores'],
    ['crunchesAll', 'Big Crunches', 'chronons'],
    ['multiversesAll', 'Multiverses', 'sparks'],
    ['hyperversesAll', 'Hyperverses', 'tesseracts'],
    ['omniversesAll', 'Omniverses', 'aether'],
    ['genesesAll', 'Geneses', 'originSeeds'],
    ['apotheosesAll', 'Apotheoses', 'divinity'],
  ];
  for (const [counter, label, cur] of layerRows) {
    if (!has(counter)) continue;
    counters.push({ label, value: formatCount(c[counter] ?? 0, n()) });
    counters.push({ label: `${CURRENCY_NAMES[cur] ?? cur}, all time`, value: f(s.totals.all[cur] ?? D(0)) });
  }
  if (has('galacticsAll')) {
    counters.push({ label: 'Galaxies explored (this Crunch run)', value: `${s.galactic.cleared.length} / 20` });
    counters.push({ label: 'Galaxies explored, all time', value: formatCount(c.galaxiesClearedAll ?? s.galactic.cleared.length, n()) });
    counters.push({ label: 'Skies charted', value: formatCount(c.skiesCharted ?? 0, n()) });
    counters.push({ label: 'Best Star Score', value: formatCount(c.starScoreBest ?? 0, n()) });
  }
  if (has('singularitiesAll')) {
    counters.push({ label: 'Leviathans beaten', value: `${c.leviathansBeaten ?? 0} / 12` });
    counters.push({ label: 'Leviathan kills', value: formatCount(c.leviathanKills ?? 0, n()) });
    counters.push({ label: 'Highest Spire floor', value: formatCount(c.spireBest ?? 0, n()) });
    counters.push({ label: 'Best Planet Defense wave', value: formatCount(c.defenseBest ?? 0, n()) });
  }
  if (has('omniversesAll')) counters.push({ label: 'Rites found', value: `${c.ritesFound ?? 0} / 28` });
  if (has('apotheosesAll')) {
    counters.push({ label: 'Miracles', value: `${c.miracles ?? 0} / 10` });
    counters.push({ label: 'Best Past Life', value: formatCount(c.bestLife ?? 0, n()) });
  }
  const running = AUTO_LAYERS.filter((l) => autoLevel(s, l) > 0);
  if (running.length) counters.push({ label: 'Layers that run themselves', value: running.map((l) => `${LAYER_NAMES[l]}${autoLevel(s, l) === 2 ? '' : ' (mostly)'}`).join(', ') });
  return { sections, counters };
}

export interface MedalItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
  earned: boolean;
  /** 1.2.0: a secret medal ("???" until earned). */
  secret: boolean;
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
  const medals = MEDALS.map((m) => {
    const earned = hasMedal(s, m.id);
    // 1.2.0: a secret medal shows nothing of itself until you find it
    if (m.secret && !earned) return { id: m.id, name: '???', desc: 'A secret medal. Poke around to find it.', icon: 'mystery', earned, secret: true };
    return { id: m.id, name: m.name, desc: m.desc, icon: medalIcon(m), earned, secret: !!m.secret };
  });
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

/** Names for the currencies a welcome-back report can list. */
const GAIN_LABELS: Record<string, string> = {
  stardust: 'Stardust',
  shards: 'Nova Shards',
  ore: 'Ore',
  xp: 'Starsmith XP',
  // 1.3.0: every other currency a catch-up can bring (the playtest's read "essence")
  essence: 'Nebula Essence',
  darkMatter: 'Dark Matter',
  antimatter: 'Antimatter',
  galaxyCores: 'Galaxy Cores',
  chronons: 'Chronons',
  embers: 'Embers',
  scales: 'Scales',
  runeShards: 'Rune Shards',
  auraDice: 'Aura Dice',
  supply: 'Supply',
  starCharts: 'Star Charts',
  echoDust: 'Echo Dust',
  echoShards: 'Echo Shards',
  echoEssence: 'Echo Essence',
  ...Object.fromEntries(GRADES.flatMap((g) => [[g.alloy, `${g.name} alloy`], ...(g.id === 'iron' ? [] : [[g.ore, `${g.name} ore`]])])),
};

export function welcomeReport(): WelcomeReport | null {
  const r = game.bootReport;
  if (!r) return null;
  const s = game.state;
  return {
    away: formatTime(r.secondsAway),
    counted: `${formatTime(r.secondsCounted)} of ${formatTime(stat(s, 'offlineCap').toNumber())} cap`,
    capped: r.capped,
    efficiency: `${Math.round(r.efficiency * 100)}%`,
    gains: Object.entries(r.gains)
      .sort(([a], [b]) => (b === 'stardust' ? 1 : 0) - (a === 'stardust' ? 1 : 0))
      .map(([k, v]) => ({ label: GAIN_LABELS[k] ?? k, value: `+${f(v)}` })),
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
