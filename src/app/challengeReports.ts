import { BALANCE } from '../content/balance';
import { FAST_RANKS, LEVIATHANS, SPIRE_BANNERS, TRIALS } from '../content/challenges';
import { D } from '../engine/decimal';
import { cur } from '../engine/state';
import { stat } from '../engine/stats';
import { fighting, killsOf, leviathanDps, leviathanHp, leviathansOpen, leviathansUnlocked, scalesFor, tapDamage } from '../engine/systems/leviathans';
import { bannersUnlocked, floorHp, gimmickOf, spireDps, spireOpen, climbing } from '../engine/systems/spire';
import { attemptLevel, autoTrialsOpen, fusionScore, goalMet, inFusion, inTrial, totalTrialLevels, trialGoal, trialLevel, trialsOpen } from '../engine/systems/trials';
import { format, formatMult, formatRate, formatTime } from '../ui/format';
import { game } from './game';

/** Read-outs for Trials, the Spire and the Void Leviathans. */
const n = () => game.state.settings.notation;
const T = BALANCE.trials;
const P = BALANCE.spire;

export interface TrialCard {
  id: string;
  name: string;
  level: number;
  levels: number;
  /** The debuff at the level you'd play next. */
  debuff: string;
  reward: string;
  /** The reward it gives now. */
  now: string;
  maxed: boolean;
  active: boolean;
  fog: boolean;
}

export interface TrialsReport {
  open: boolean;
  cards: TrialCard[];
  active: string[];
  activeNames: string;
  inFusion: boolean;
  goal: string;
  run: string;
  pct: number;
  ready: boolean;
  elapsed: string;
  total: number;
  autoOpen: boolean;
  autoAt: number;
  auto: boolean;
  fastBest: string;
  fastMult: string;
  ranks: Array<{ name: string; time: string; mult: string; got: boolean }>;
  fusionBest: string;
  fusionNow: string;
  fusionRewards: string;
  fusionMax: number;
}

export function trialsReport(): TrialsReport {
  const s = game.state;
  const run = s.totals.run.stardust ?? D(0);
  const goal = trialGoal(s);
  const elapsed = inTrial(s) ? s.playtime - s.trials.start : 0;
  const fb = s.trials.fusionBest;
  const [pd, ps, pe] = T.fusionPows;
  const cards = TRIALS.map((t): TrialCard => {
    const level = trialLevel(s, t.id);
    const maxed = t.id !== 'fast' && level >= t.levels;
    const playAt = s.trials.active.includes(t.id) ? attemptLevel(s, t) : Math.min(t.levels, level + 1);
    const nowMult = t.rewards.map((r) => formatMult(D(r.value).pow(level), n())).join(' and ');
    return { id: t.id, name: t.name, level, levels: t.levels, debuff: t.debuffText(playAt), reward: t.rewardText, now: level > 0 ? nowMult : '', maxed, active: s.trials.active.includes(t.id), fog: !!t.fog };
  });
  return {
    open: trialsOpen(s),
    cards,
    active: [...s.trials.active],
    activeNames: s.trials.active.map((id) => TRIALS.find((t) => t.id === id)?.name ?? id).join(' + '),
    inFusion: inFusion(s),
    goal: format(goal, n()),
    run: format(run, n()),
    pct: inTrial(s) ? Math.floor(Math.min(1, run.add(1).log10().toNumber() / Math.max(1, goal.log10().toNumber())) * 100) : 0,
    ready: goalMet(s),
    elapsed: formatTime(elapsed),
    total: totalTrialLevels(s),
    autoOpen: autoTrialsOpen(s),
    autoAt: T.autoAt,
    auto: s.trials.auto,
    fastBest: FAST_RANKS[s.trials.fastBest]?.name ?? 'none',
    fastMult: formatMult(FAST_RANKS[s.trials.fastBest]?.mult ?? 1, n()),
    ranks: FAST_RANKS.map((r, i) => ({ name: r.name, time: formatTime(r.seconds), mult: formatMult(r.mult, n()), got: s.trials.fastBest >= i })),
    fusionBest: fb > 0 ? fb.toFixed(2) : 'none',
    fusionNow: inFusion(s) ? fusionScore(s, elapsed).toFixed(2) : '',
    fusionRewards: fb > 0 ? `Stardust ${formatMult(1 + fb ** pd, n())}, shards ${formatMult(1 + fb ** ps, n())}, Essence ${formatMult(1 + fb ** pe, n())}` : 'none yet',
    fusionMax: T.fusionMax,
  };
}

export interface SpireReport {
  open: boolean;
  floor: number;
  best: number;
  climbing: boolean;
  paused: boolean;
  hp: string;
  dealt: string;
  pct: number;
  dps: string;
  eta: string;
  gimmick: string;
  gimmickText: string;
  next: string;
  rewards: string;
  banners: Array<{ id: string; name: string; color: string; at: number; unlocked: boolean; flown: boolean }>;
}

export function spireReport(): SpireReport {
  const s = game.state;
  const f = s.spire.floor;
  const hp = floorHp(f);
  const dps = spireDps(s);
  const left = hp.sub(s.spire.damage).max(0);
  const g = gimmickOf(f);
  const got = bannersUnlocked(s);
  const per = P.perFloor;
  return {
    open: spireOpen(s),
    floor: f,
    best: s.stats.spireBest ?? 0,
    climbing: s.spire.climbing,
    paused: s.spire.climbing && !climbing(s),
    hp: format(hp, n()),
    dealt: format(s.spire.damage, n()),
    pct: Math.floor(Math.min(1, s.spire.damage.div(hp).toNumber()) * 100),
    dps: formatRate(dps, n()),
    eta: dps.gt(0) ? formatTime(left.div(dps).toNumber()) : 'never',
    gimmick: g.name,
    gimmickText: g.debuffText(1),
    next: gimmickOf(f + 1).name,
    rewards: `Stardust ${formatMult(D(per.productionMult ?? 1).pow(f), n())}, shards ${formatMult(D(per.shardGain ?? 1).pow(f), n())}, Essence ${formatMult(D(per.essenceGain ?? 1).pow(f), n())}`,
    banners: SPIRE_BANNERS.map((b, i) => ({ ...b, at: (i + 1) * 10, unlocked: i < got, flown: s.spire.banner === b.id })),
  };
}

export interface LeviathanRow {
  k: number;
  id: string;
  name: string;
  color: string;
  hp: string;
  kills: number;
  scales: string;
  unlocked: boolean;
  current: boolean;
}

export interface LeviathansReport {
  open: boolean;
  fighting: boolean;
  rows: LeviathanRow[];
  name: string;
  color: string;
  hp: string;
  dealt: string;
  pct: number;
  dps: string;
  tap: string;
  eta: string;
  scales: string;
  damageMult: string;
  team: number;
}

export function leviathansReport(): LeviathansReport {
  const s = game.state;
  const unlocked = leviathansUnlocked(s);
  const k = Math.min(s.leviathans.current, unlocked - 1);
  const hp = leviathanHp(s, k);
  const dps = leviathanDps(s);
  const left = hp.sub(s.leviathans.damage).max(0);
  const L = LEVIATHANS[k]!;
  return {
    open: leviathansOpen(s),
    fighting: fighting(s),
    rows: LEVIATHANS.map((l, i) => ({ k: i, id: l.id, name: l.name, color: l.color, hp: format(leviathanHp(s, i), n()), kills: killsOf(s, i), scales: format(scalesFor(s, i), n()), unlocked: i < unlocked, current: i === k })),
    name: L.name,
    color: L.color,
    hp: format(hp, n()),
    dealt: format(s.leviathans.damage, n()),
    pct: Math.floor(Math.min(1, s.leviathans.damage.div(hp).toNumber()) * 100),
    dps: formatRate(dps, n()),
    tap: format(tapDamage(s), n()),
    eta: dps.gt(0) ? formatTime(left.div(dps).toNumber()) : 'never',
    scales: format(cur(s, 'scales'), n()),
    damageMult: formatMult(stat(s, 'leviathanDamage'), n()),
    team: s.wyrms.team.length,
  };
}
