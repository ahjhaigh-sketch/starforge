import { D, type Decimal } from './decimal';
import { events, type GameEvent } from './events';
import { layer } from './layers';
import type { GameState } from './state';
import { tick } from './tick';
import { plural } from './words';

export interface OfflineReport {
  secondsAway: number;
  secondsCounted: number;
  efficiency: number;
  capped: boolean;
  gains: Record<string, Decimal>;
  /** Notable things automation did while away ("3 Supernovas"). */
  notes: string[];
}

export interface ElapsedOptions {
  /** Most seconds that count. Infinity for a hidden tab during a session. */
  cap: number;
  /** Share of normal gains (0.5 = 50%). Time itself always passes fully. */
  efficiency: number;
  offline: boolean;
  /**
   * Real milliseconds the catch-up may take (the boot catch-up: Tech tab budget, 300 ms). After a
   * few steps it measures its own speed and takes fewer, longer steps if it must, never under
   * MIN_STEPS. Leave it out for the same steps on every machine (tests, the dev panel).
   */
  budgetMs?: number;
}

const TICK = 0.05;
const MAX_STEPS = 2000;
/** The async catch-up hands the page back every CHUNK steps. */
const CHUNK = 100;
/** With a time budget: steps measured before choosing how many more, and the fewest it will take. */
const PROBE = 4;
const MIN_STEPS = 32;

function newReport(seconds: number, opts: ElapsedOptions): OfflineReport {
  const away = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const counted = Math.min(away, opts.cap);
  return { secondsAway: away, secondsCounted: counted, efficiency: opts.efficiency, capped: counted < away, gains: {}, notes: [] };
}

/**
 * Simulates the counted seconds in at most 2,000 steps (fewer within a time budget) with the real tick, so automation and
 * thresholds behave the same as online. One code path for any gap: a closed tab, sleep, a hidden
 * tab. Yields its progress (0 to 1) every CHUNK steps.
 */
function* elapsedSteps(s: GameState, opts: ElapsedOptions, report: OfflineReport): Generator<number> {
  const counted = report.secondsCounted;
  if (counted <= 0) return;

  const before: Record<string, Decimal> = {};
  for (const [k, v] of Object.entries(s.currencies)) before[k] = v;

  const resets: Record<string, number> = {};
  const off = events.on((e: GameEvent) => {
    if (e.t === 'reset') resets[e.layer] = (resets[e.layer] ?? 0) + 1;
  });

  let steps = Math.max(1, Math.min(MAX_STEPS, Math.ceil(counted / TICK)));
  let dt = counted / steps;
  let done = 0;
  const ctx = { gainScale: opts.efficiency, offline: opts.offline, catchUp: true };
  const t0 = performance.now();
  try {
    for (let i = 0; i < steps; i++) {
      tick(s, dt, ctx);
      done += dt;
      // late in the game a step costs milliseconds: fit the rest into the budget with longer steps
      if (opts.budgetMs !== undefined && i + 1 === PROBE && steps > MIN_STEPS) {
        const per = (performance.now() - t0) / PROBE;
        const fits = Math.floor((opts.budgetMs - (performance.now() - t0)) / Math.max(per, 1e-3));
        const rest = Math.max(MIN_STEPS - PROBE, Math.min(steps - PROBE, fits));
        steps = PROBE + rest;
        dt = (counted - done) / rest;
      }
      if ((i + 1) % CHUNK === 0 && i + 1 < steps) yield (i + 1) / steps;
    }
  } finally {
    off();
  }

  for (const [k, v] of Object.entries(s.currencies)) {
    const diff = v.sub(before[k] ?? D(0));
    if (diff.gt(0)) report.gains[k] = diff;
  }
  for (const [id, n] of Object.entries(resets)) {
    report.notes.push(`${n} ${plural(layer(id)?.name ?? id, n)}`);
  }
}

export function simulateElapsed(s: GameState, seconds: number, opts: ElapsedOptions): OfflineReport {
  const report = newReport(seconds, opts);
  for (const _ of elapsedSteps(s, opts, report));
  return report;
}

/** The same simulation, handing the page back between chunks so a progress bar can draw. */
export async function simulateElapsedAsync(
  s: GameState,
  seconds: number,
  opts: ElapsedOptions,
  onProgress: (share: number) => void,
): Promise<OfflineReport> {
  const report = newReport(seconds, opts);
  for (const share of elapsedSteps(s, opts, report)) {
    onProgress(share);
    await new Promise((r) => setTimeout(r, 0));
  }
  onProgress(1);
  return report;
}
