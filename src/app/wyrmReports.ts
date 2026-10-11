import { BALANCE } from '../content/balance';
import { CROSSBREEDS, NURSERY_UPGRADES, STAR_BY_ID, STAR_SPECIES, BASE_SEEDS } from '../content/nursery';
import { MUTATION_BY_ID } from '../content/runeDepth';
import { RUNE_STAT_WORDS } from '../content/runes';
import { parseWyrmKey, WYRM_BY_ID, WYRM_FORMS, WYRM_SPECIES } from '../content/wyrms';
import { cur } from '../engine/state';
import { crossCost, growSeconds, nurseryLevel, nurseryOpen, plotCount, plotProgress, seedPlan, seedsOf, stageOf, upgradePlan } from '../engine/systems/nursery';
import { boostOfKey, eggPlan, embersOfKey, embersPerSecond, speciesEffLog, stackLevel, stackOf, teamSlots, trainPlan, wyrmsOpen } from '../engine/systems/wyrms';
import { format, formatCount, formatTime } from '../ui/format';
import { game } from './game';
import { oddsText } from './runeReports';

/** Read-outs for the Void Wyrms and the Star Nursery. */
const n = () => game.state.settings.notation;
const W = BALANCE.wyrms;
const word = (statId: string) => (statId === 'xpGain' ? 'Starsmith XP' : statId === 'emberGain' ? 'Embers' : (RUNE_STAT_WORDS[statId] ?? statId));

// ---------- Void Wyrms ----------

export interface StackRow {
  key: string;
  name: string;
  color: string;
  form: string;
  formId: string;
  mut: string;
  mutColor: string;
  count: string;
  level: number;
  boost: string;
  embers: string;
  canFuse: boolean;
  fuseTo: string;
  onTeam: boolean;
  canWear: boolean;
  trainCount: number;
  trainCost: string;
  canTrain: boolean;
}

export interface WyrmsReport {
  open: boolean;
  req: string;
  essence: string;
  eggCount: number;
  eggCost: string;
  canEgg: boolean;
  hatched: string;
  embers: string;
  emberRate: string;
  slots: number;
  maxSlots: number;
  nextSlot: string;
  team: StackRow[];
  stacks: StackRow[];
  bestiary: Array<{ id: string; name: string; color: string; odds: string; boosts: string; forms: boolean[] }>;
  found: number;
  total: number;
}

function stackRow(key: string): StackRow {
  const s = game.state;
  const { species, form, mut } = parseWyrmKey(key);
  const w = WYRM_BY_ID.get(species)!;
  const f = WYRM_FORMS[form]!;
  const m = mut ? MUTATION_BY_ID.get(mut) : undefined;
  const plan = trainPlan(s, key);
  const onTeam = s.wyrms.team.includes(key);
  return {
    key,
    name: w.name,
    color: w.color,
    form: f.name,
    formId: f.id,
    mut: m?.name ?? '',
    mutColor: m?.color ?? '',
    count: format(stackOf(s, key), n()),
    level: stackLevel(s, key),
    boost: `x${format(boostOfKey(s, key).add(1), n())} ${word(w.stat)}`,
    embers: `${format(embersOfKey(s, key), n())}/s`,
    canFuse: form < WYRM_FORMS.length - 1 && stackOf(s, key).gte(W.fuse),
    fuseTo: WYRM_FORMS[form + 1]?.name ?? '',
    onTeam,
    canWear: !onTeam && s.wyrms.team.length < teamSlots(s),
    trainCount: plan.count,
    trainCost: format(plan.cost, n()),
    canTrain: plan.canAfford,
  };
}

export function wyrmsReport(): WyrmsReport {
  const s = game.state;
  const plan = eggPlan(s);
  const hatched = s.stats.wyrmsHatched ?? 0;
  const next = W.slotHatches.find((x) => hatched < x);
  const keys = Object.keys(s.wyrms.stacks).filter((k) => stackOf(s, k).gt(0));
  // rarest species first, higher forms first
  keys.sort((a, b) => {
    const pa = parseWyrmKey(a);
    const pb = parseWyrmKey(b);
    return (WYRM_BY_ID.get(pb.species)?.rank ?? 0) - (WYRM_BY_ID.get(pa.species)?.rank ?? 0) || pb.form - pa.form || a.localeCompare(b);
  });
  return {
    open: wyrmsOpen(s),
    req: `${W.nebulas} Nebulas`,
    essence: format(cur(s, 'essence'), n()),
    eggCount: plan.count,
    eggCost: format(plan.cost, n()),
    canEgg: plan.canAfford,
    hatched: formatCount(hatched, n()),
    embers: format(cur(s, 'embers'), n()),
    emberRate: format(embersPerSecond(s), n()),
    slots: s.wyrms.team.length,
    maxSlots: teamSlots(s),
    nextSlot: next ? `Slot ${teamSlots(s) + 1} at ${formatCount(next, n())} Wyrms hatched` : 'Every slot open',
    team: s.wyrms.team.map(stackRow),
    stacks: keys.map(stackRow),
    bestiary: WYRM_SPECIES.map((w) => ({
      id: w.id,
      name: s.wyrms.found.some((v) => v.startsWith(`${w.id}|`)) ? w.name : '???',
      color: w.color,
      odds: oddsText(speciesEffLog(s, w)),
      boosts: word(w.stat),
      forms: WYRM_FORMS.map((_, i) => s.wyrms.found.includes(`${w.id}|${i}`)),
    })),
    found: s.wyrms.found.length,
    total: WYRM_SPECIES.length * WYRM_FORMS.length,
  };
}

/** For the sky: each team Wyrm as "colour:rank:form". */
export function wyrmSky(): string {
  const s = game.state;
  if (!wyrmsOpen(s)) return '';
  return s.wyrms.team
    .map((key) => {
      const { species, form } = parseWyrmKey(key);
      const w = WYRM_BY_ID.get(species);
      return w ? `${w.color}:${w.rank}:${form}` : '';
    })
    .filter(Boolean)
    .join('|');
}


// ---------- the Star Nursery ----------

export interface PlotRow {
  i: number;
  empty: boolean;
  name: string;
  color: string;
  stage: string;
  progress: number;
  ripe: boolean;
  eta: string;
}

export interface NurseryReport {
  open: boolean;
  req: string;
  essence: string;
  plots: PlotRow[];
  maxPlots: number;
  seeds: Array<{ id: string; name: string; color: string; tier: number; count: number; base: boolean }>;
  seedCount: string;
  seedCost: string;
  canSeed: boolean;
  upgrades: Array<{ id: string; name: string; desc: string; level: number; max: number; count: number; cost: string; can: boolean }>;
  recipes: Array<{ child: string; name: string; color: string; parents: string; known: boolean; grown: boolean; cost: string }>;
  found: number;
  total: number;
  tending: boolean;
}

export function nurseryReport(): NurseryReport {
  const s = game.state;
  const known = (id: string) => seedsOf(s, id) > 0 || s.nursery.found.includes(id) || BASE_SEEDS.includes(id);
  const sp = seedPlan(s);
  return {
    open: nurseryOpen(s),
    req: `${BALANCE.nursery.nebulas} Nebulas`,
    essence: format(cur(s, 'essence'), n()),
    plots: Array.from({ length: plotCount(s) }, (_, i): PlotRow => {
      const p = s.nursery.plots[i];
      const sp2 = p?.species ? STAR_BY_ID.get(p.species) : undefined;
      if (!p || !sp2) return { i, empty: true, name: 'Empty plot', color: '#3A3466', stage: '', progress: 0, ripe: false, eta: '' };
      const prog = plotProgress(s, i);
      const left = Math.max(0, growSeconds(s, sp2) * (1 - prog));
      return { i, empty: false, name: sp2.name, color: sp2.color, stage: stageOf(prog), progress: prog, ripe: prog >= 1, eta: prog >= 1 ? 'Ripe' : formatTime(left) };
    }),
    maxPlots: BALANCE.nursery.maxPlots,
    seeds: STAR_SPECIES.filter((x) => seedsOf(s, x.id) > 0 || BASE_SEEDS.includes(x.id)).map((x) => ({ id: x.id, name: x.name, color: x.color, tier: x.tier, count: seedsOf(s, x.id), base: BASE_SEEDS.includes(x.id) })),
    seedCount: format(sp.count, n()),
    seedCost: format(sp.cost, n()),
    canSeed: sp.canAfford,
    upgrades: NURSERY_UPGRADES.map((u) => {
      const plan = upgradePlan(s, u.id);
      return { id: u.id, name: u.name, desc: u.desc, level: nurseryLevel(s, u.id), max: u.max, count: plan.count, cost: format(plan.cost, n()), can: plan.canAfford };
    }),
    recipes: CROSSBREEDS.map(([a, b, c]) => {
      const sc = STAR_BY_ID.get(c)!;
      const seen = known(a) && known(b);
      return {
        child: c,
        name: known(c) ? sc.name : '???',
        color: sc.color,
        parents: seen ? `${STAR_BY_ID.get(a)!.name} + ${STAR_BY_ID.get(b)!.name}` : 'Grow more species to learn this cross',
        known: seen,
        grown: s.nursery.found.includes(c),
        cost: format(crossCost(c), n()),
      };
    }),
    found: s.nursery.found.length,
    total: STAR_SPECIES.length,
    tending: nurseryLevel(s, 'tending') > 0,
  };
}

