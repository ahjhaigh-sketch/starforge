import { BALANCE } from '../../content/balance';
import { GOALS, type GoalDef, MEDALS } from '../../content/medals';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import type { GameState } from '../state';
import { defineStat, registerSources } from '../stats';
import { every, registerSystem } from '../tick';
import { reqMet } from './unlocks';

/**
 * Medals and Goals. Each medal unlocks exactly once and is +1% Stardust forever; each Goal tier
 * adds Rune Luck, Rune Bulk and +1% Stardust. Checked four times a second; earned ones are skipped.
 */
const earnedCache = new WeakMap<GameState, { n: number; set: Set<string> }>();

export function hasMedal(s: GameState, id: string): boolean {
  let c = earnedCache.get(s);
  if (!c || c.n !== s.achievements.length) {
    c = { n: s.achievements.length, set: new Set(s.achievements) };
    earnedCache.set(s, c);
  }
  return c.set.has(id);
}

/** The value a Goal tracks. */
export function goalValue(s: GameState, g: GoalDef): Decimal {
  if (g.stat === 'stardustAll') return s.totals.all.stardust ?? D(0);
  return D(s.stats[g.stat] ?? 0);
}

export function goalTiersDone(s: GameState): number {
  let n = 0;
  for (const g of GOALS) n += s.goals[g.id] ?? 0;
  return n;
}

export function checkMedals(s: GameState): void {
  for (const m of MEDALS) {
    if (hasMedal(s, m.id) || !reqMet(s, m.req)) continue;
    s.achievements.push(m.id);
    events.emit({ t: 'achievement', id: m.id });
  }
  for (const g of GOALS) {
    let tier = s.goals[g.id] ?? 0;
    const v = goalValue(s, g);
    while (tier < g.tiers.length && v.gte(g.tiers[tier]!)) {
      tier++;
      events.emit({ t: 'milestone', id: `goal.${g.id}.${tier}` });
    }
    if (tier !== (s.goals[g.id] ?? 0)) s.goals[g.id] = tier;
  }
}

export function registerMedals(): void {
  const m = BALANCE.medals;
  defineStat({ id: 'runeLuck', label: 'Rune Luck', base: () => D(1) });
  defineStat({ id: 'runeBulk', label: 'Rune Bulk', base: () => D(1) });
  const medalMult = (s: GameState) => D(1 + m.bonus * s.achievements.length + m.goalBonus * goalTiersDone(s));
  registerSources(
    { id: 'medals.prod', stat: 'productionMult', op: 'mul', label: 'Medals and Goals', value: medalMult },
    { id: 'medals.tap', stat: 'tapPower', op: 'mul', label: 'Medals and Goals', value: medalMult },
    { id: 'goals.luck', stat: 'runeLuck', op: 'add', label: 'Goals', value: (s) => D(m.goalLuck * goalTiersDone(s)) },
    { id: 'goals.bulk', stat: 'runeBulk', op: 'mul', label: 'Goals', value: (s) => D(m.goalBulk).pow(goalTiersDone(s)) },
  );
  registerSystem({ id: 'medals', order: 80, tick: (s, dt) => every(s, dt, 4) && checkMedals(s) });
}
