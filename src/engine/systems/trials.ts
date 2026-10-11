import { BALANCE } from '../../content/balance';
import { FAST_RANKS, TRIAL_BY_ID, TRIALS, type TrialDef, type TrialEffect } from '../../content/challenges';
import { D, type Decimal, ZERO } from '../decimal';
import { events } from '../events';
import { layer, onBeforeReset } from '../layers';
import type { GameState } from '../state';
import { invalidateStats, registerSources } from '../stats';
import { registerSystem } from '../tick';

/**
 * Trials (Game design: "Singularity"; EUT's Challenges, Upgradex's Pyramid). From 2 Singularities.
 * - Entering one resets the Supernova run (no shards) and switches its debuffs on. They live in the
 *   stat pipeline and count only while the Trial runs: leave, finish or reset and they're gone.
 * - The goal at level L: Blue Giant and 1e200 x 1e100^(L - 1) Stardust in the Trial run (Fast Nova:
 *   1e300). Finishing earns
 *   the level and its permanent reward. A Supernova during a Trial finishes it if the goal was met,
 *   and otherwise ends it.
 * - Fast Nova is ranked by the run's game time, D (under 5 min) to Q (under 5 s); the best rank
 *   multiplies shards.
 * - Fusion runs 2 to 4 Trials at once (their first-level debuffs together); its score is the
 *   product of their factors x (1 + log10(1 + 100 / (t + 1)^0.75)); the best score boosts
 *   Stardust, shards and Essence.
 * - From 10 Trial levels in all, Trials can finish themselves the moment the goal is met.
 * No Trial is ever needed to progress.
 */
const T = BALANCE.trials;

export const trialsOpen = (s: GameState) => (s.stats.singularitiesAll ?? 0) >= T.singularities;
export const trialLevel = (s: GameState, id: string) => s.trials.levels[id] ?? 0;
export const inTrial = (s: GameState) => s.trials.active.length > 0;
export const inFusion = (s: GameState) => s.trials.active.length > 1;
export const totalTrialLevels = (s: GameState) => Object.values(s.trials.levels).reduce((a, b) => a + b, 0);
export const autoTrialsOpen = (s: GameState) => totalTrialLevels(s) >= T.autoAt;

/** The level a Trial is played at right now (Fusion plays every Trial at level 1). */
export function attemptLevel(s: GameState, t: TrialDef): number {
  return inFusion(s) ? 1 : Math.min(t.levels, trialLevel(s, t.id) + 1);
}

export function trialGoal(s: GameState): Decimal {
  if (inFusion(s)) return D(T.goal);
  const t = TRIAL_BY_ID.get(s.trials.active[0] ?? '');
  if (t?.id === 'fast') return D(T.fastGoal);
  return t ? D(T.goal).mul(D(T.goalGrowth).pow(attemptLevel(s, t) - 1)) : D(T.goal);
}

export function goalMet(s: GameState): boolean {
  return inTrial(s) && s.tier >= BALANCE.supernova.tier && (s.totals.run.stardust ?? ZERO).gte(trialGoal(s));
}

/** Starts a Trial (one id) or a Fusion (2 to 4 ids). */
export function enterTrial(s: GameState, ids: readonly string[]): boolean {
  if (!trialsOpen(s) || inTrial(s) || ids.length < 1 || ids.length > T.fusionMax) return false;
  if (new Set(ids).size !== ids.length) return false;
  const defs = ids.map((id) => TRIAL_BY_ID.get(id));
  if (defs.some((t) => !t)) return false;
  if (ids.length > 1 && ids.includes('fast')) return false;
  if (ids.length === 1 && ids[0] !== 'fast' && trialLevel(s, ids[0]!) >= defs[0]!.levels) return false;
  // a Trial is a fresh Supernova run: reset it (keeping what a Supernova keeps) without a Supernova
  const parts = layer('supernova')?.parts ?? [];
  const keep = parts.map((p) => !!p.keptBy?.(s));
  parts.forEach((p, i) => {
    if (!keep[i]) p.reset(s);
  });
  s.totals.run.stardust = ZERO;
  s.trials.active = [...ids];
  s.trials.start = s.playtime;
  invalidateStats();
  return true;
}

/** Leaves the Trial: its debuffs end at once, and nothing is earned. */
export function exitTrial(s: GameState): void {
  s.trials.active = [];
  invalidateStats();
}

export function fusionScore(s: GameState, seconds: number): number {
  const product = s.trials.active.reduce((p, id) => p * (TRIAL_BY_ID.get(id)?.fusion ?? 1), 1);
  return product * (1 + Math.log10(1 + 100 / (Math.max(0, seconds) + 1) ** 0.75));
}

/** The best Fast Nova rank for a time (an index into FAST_RANKS, or -1 if too slow). */
export function fastRankFor(seconds: number): number {
  let best = -1;
  FAST_RANKS.forEach((r, i) => {
    if (seconds < r.seconds) best = i;
  });
  return best;
}

/** Finishes the Trial if its goal is met. Returns what was earned in words, or null. */
export function completeTrial(s: GameState): string | null {
  if (!goalMet(s)) return null;
  const seconds = s.playtime - s.trials.start;
  let what: string;
  if (inFusion(s)) {
    const score = fusionScore(s, seconds);
    s.trials.fusionBest = Math.max(s.trials.fusionBest, score);
    what = `Fusion score ${score.toFixed(2)}`;
  } else if (s.trials.active[0] === 'fast') {
    const rank = fastRankFor(seconds);
    s.trials.fastBest = Math.max(s.trials.fastBest, rank);
    what = rank >= 0 ? `Fast Nova rank ${FAST_RANKS[rank]!.name}` : 'Too slow for a rank';
  } else {
    const t = TRIAL_BY_ID.get(s.trials.active[0]!)!;
    s.trials.levels[t.id] = Math.min(t.levels, trialLevel(s, t.id) + 1);
    what = `${t.name} level ${s.trials.levels[t.id]}`;
  }
  s.stats.trialsDone = (s.stats.trialsDone ?? 0) + 1;
  s.stats.trialLevels = totalTrialLevels(s);
  s.trials.active = [];
  invalidateStats();
  events.emit({ t: 'toast', title: 'Trial complete', body: `${what}.`, icon: 'trial', priority: true });
  return what;
}

const debuffSource = (t: TrialDef, statId: string, op: TrialEffect['op'], pick: (fx: TrialEffect[]) => TrialEffect | undefined) => ({
  id: `trial.${t.id}.${statId}.${op}`,
  stat: statId,
  op,
  label: `Trial: ${t.name}`,
  value: (s: GameState) => D(pick(t.debuffs(attemptLevel(s, t)))?.value ?? (op === 'add' ? 0 : 1)),
  active: (s: GameState) => s.trials.active.includes(t.id),
});

export function registerTrials(): void {
  for (const t of TRIALS) {
    // every stat and op the Trial's debuffs touch at any level, each one source
    const keys = new Map<string, TrialEffect['op']>();
    for (let l = 1; l <= t.levels; l++) for (const e of t.debuffs(l)) keys.set(`${e.stat}|${e.op}`, e.op);
    for (const [key, op] of keys) {
      const statId = key.split('|')[0]!;
      registerSources(debuffSource(t, statId, op, (fx) => fx.find((e) => e.stat === statId && e.op === op)));
    }
    for (const r of t.rewards) {
      registerSources({ id: `trial.${t.id}.reward.${r.stat}`, stat: r.stat, op: 'mul', label: `Trial: ${t.name}`, value: (s) => D(r.value).pow(trialLevel(s, t.id)), active: (s) => trialLevel(s, t.id) > 0 });
    }
  }
  const [pd, ps, pe] = T.fusionPows;
  registerSources(
    { id: 'trial.fast.reward', stat: 'shardGain', op: 'mul', label: 'Fast Nova (best rank)', value: (s) => D(FAST_RANKS[s.trials.fastBest]?.mult ?? 1), active: (s) => s.trials.fastBest >= 0 },
    { id: 'trial.fusion.dust', stat: 'productionMult', op: 'mul', label: 'Trial Fusion (best score)', value: (s) => D(1 + s.trials.fusionBest ** pd), active: (s) => s.trials.fusionBest > 0 },
    { id: 'trial.fusion.shards', stat: 'shardGain', op: 'mul', label: 'Trial Fusion (best score)', value: (s) => D(1 + s.trials.fusionBest ** ps), active: (s) => s.trials.fusionBest > 0 },
    { id: 'trial.fusion.essence', stat: 'essenceGain', op: 'mul', label: 'Trial Fusion (best score)', value: (s) => D(1 + s.trials.fusionBest ** pe), active: (s) => s.trials.fusionBest > 0 },
  );
  // a reset during a Trial finishes it if the goal was met, and otherwise ends it
  onBeforeReset((s) => {
    if (!inTrial(s)) return;
    if (!completeTrial(s)) exitTrial(s);
  });
  registerSystem({
    id: 'trials',
    order: 63,
    tick: (s: GameState) => {
      if (s.trials.auto && autoTrialsOpen(s) && goalMet(s)) completeTrial(s);
    },
  });
}
