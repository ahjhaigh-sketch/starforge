import { D, type Decimal } from './decimal';
import { events, type GameEvent } from './events';
import type { GameState } from './state';
import { tick } from './tick';

export interface OfflineReport {
  secondsAway: number;
  secondsCounted: number;
  efficiency: number;
  capped: boolean;
  gains: Record<string, Decimal>;
  /** Notable things automation did while away ("Went Supernova 3 times"). */
  notes: string[];
}

export interface ElapsedOptions {
  /** Most seconds that count. Infinity for a hidden tab during a session. */
  cap: number;
  /** Share of normal gains (0.5 = 50%). Time itself always passes fully. */
  efficiency: number;
  offline: boolean;
}

const TICK = 0.05;
const MAX_STEPS = 2000;

/**
 * Simulates `seconds` of game time in at most 2,000 steps with the real tick, so automation and
 * thresholds behave the same as online. One code path for any gap: a closed tab, sleep, a hidden tab.
 */
export function simulateElapsed(s: GameState, seconds: number, opts: ElapsedOptions): OfflineReport {
  const away = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const counted = Math.min(away, opts.cap);
  const report: OfflineReport = {
    secondsAway: away,
    secondsCounted: counted,
    efficiency: opts.efficiency,
    capped: counted < away,
    gains: {},
    notes: [],
  };
  if (counted <= 0) return report;

  const before: Record<string, Decimal> = {};
  for (const [k, v] of Object.entries(s.currencies)) before[k] = v;

  const resets: Record<string, number> = {};
  const off = events.on((e: GameEvent) => {
    if (e.t === 'reset') resets[e.layer] = (resets[e.layer] ?? 0) + 1;
  });

  const steps = Math.max(1, Math.min(MAX_STEPS, Math.ceil(counted / TICK)));
  const dt = counted / steps;
  const ctx = { gainScale: opts.efficiency, offline: opts.offline };
  try {
    for (let i = 0; i < steps; i++) tick(s, dt, ctx);
  } finally {
    off();
  }

  for (const [k, v] of Object.entries(s.currencies)) {
    const diff = v.sub(before[k] ?? D(0));
    if (diff.gt(0)) report.gains[k] = diff;
  }
  for (const [layer, n] of Object.entries(resets)) {
    report.notes.push(`Went ${layer} ${n} time${n === 1 ? '' : 's'}`);
  }
  return report;
}
