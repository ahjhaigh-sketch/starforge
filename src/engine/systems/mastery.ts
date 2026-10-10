import { ENGINES } from '../../content/engines';
import { MASTERY_MULT, MASTERY_RANKS, MASTERY_TIER } from '../../content/early';
import { D } from '../decimal';
import type { GameState } from '../state';
import { registerSources } from '../stats';

/**
 * Engine Mastery: bronze to cosmic ranks per engine from how many were EVER bought
 * (state.enginesEver, which no reset touches), so old engines stay worth buying.
 */
export function masteryRank(s: GameState, engineId: string): number {
  const ever = s.enginesEver[engineId] ?? 0;
  let r = 0;
  for (const rank of MASTERY_RANKS) if (ever >= rank.at) r++;
  return r;
}

/** Mastery counts once the system is open (it was ever reached: unlocks are permanent). */
export function masteryOpen(s: GameState): boolean {
  return s.tier >= MASTERY_TIER || s.unlocked.includes('mastery');
}

export function registerMastery(): void {
  registerSources(
    ...ENGINES.map((e) => ({
      id: `mastery.${e.id}`,
      stat: `engineMult.${e.id}`,
      op: 'mul' as const,
      label: 'Mastery',
      value: (s: GameState) => D(MASTERY_MULT).pow(masteryRank(s, e.id)),
      active: (s: GameState) => masteryOpen(s) && masteryRank(s, e.id) > 0,
    })),
  );
}
