import { BALANCE } from '../../content/balance';
import { ATTUNEMENTS, type AttuneId, CHAOS_EFFECTS } from '../../content/extras';
import { D } from '../decimal';
import { events } from '../events';
import { nextInt } from '../rng';
import { gain, type GameState, spend } from '../state';
import { registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { tapRules, type TapRuntime } from './stardust';

/**
 * Star Pulse Attunements: up to three on the Star Core, each changing how tapping works. Pulse and
 * Heartbeat reward skill (timing, pacing) with a bonus you can see in the stat breakdowns; the
 * Chaos Die rolls effects as you tap; the Gravity Lens trades tap speed for tap strength.
 */
const A = BALANCE.attune;

export const attuneOpen = (s: GameState) => (s.stats.supernovas ?? 0) >= A.supernovas || s.unlocked.includes('attune');
export const equipped = (s: GameState, id: AttuneId) => s.attune.equipped.includes(id);

export function unlockAttune(s: GameState, id: AttuneId): boolean {
  if (!attuneOpen(s) || s.attune.unlocked.includes(id) || !ATTUNEMENTS.some((a) => a.id === id)) return false;
  if (!spend(s, 'shards', D(A.unlock[id]))) return false;
  s.attune.unlocked.push(id);
  events.emit({ t: 'purchase', kind: 'attune', id, amount: 1 });
  return true;
}

export function equipAttune(s: GameState, id: AttuneId): boolean {
  if (!attuneOpen(s) || !s.attune.unlocked.includes(id) || equipped(s, id) || s.attune.equipped.length >= A.slots) return false;
  s.attune.equipped.push(id);
  return true;
}

export function unequipAttune(s: GameState, id: AttuneId): boolean {
  const i = s.attune.equipped.indexOf(id);
  if (i < 0) return false;
  s.attune.equipped.splice(i, 1);
  if (id === 'heartbeat') s.attune.heart = 0;
  return true;
}

// ---------- Pulse ----------

const P = A.pulse;

/** Grade of a tap at \`nowMs\`: its distance to the nearest beat. */
export function pulseGrade(nowMs: number): { beat: number; mult: number; name: string } {
  const beat = Math.round(nowMs / P.beatMs);
  const off = Math.abs(nowMs - beat * P.beatMs);
  if (off <= P.perfectMs) return { beat, mult: P.perfect, name: 'Perfect' };
  if (off <= P.greatMs) return { beat, mult: P.great, name: 'Great' };
  if (off <= P.goodMs) return { beat, mult: P.good, name: 'Good' };
  return { beat, mult: 0, name: 'Off beat' };
}

/** The Pulse rating: the average grade of the last 8 graded beats (1 until you have any). */
export function pulseRating(s: GameState): number {
  const m = s.attune.pulse;
  return m.length === 0 ? P.missed : m.reduce((a, b) => a + b, 0) / m.length;
}

/** Heartbeat: production x(1 + 3 x fill^2), up to x4 just below overload. */
export const heartMult = (s: GameState) => 1 + A.heartbeat.bonus * (s.attune.heart / A.heartbeat.max) ** 2;

export const chaosActive = (s: GameState, id: string) => !!s.attune.chaos && s.attune.chaos.id === id && s.playtime < s.attune.chaos.until;

function rollChaos(s: GameState): void {
  const fx = CHAOS_EFFECTS[nextInt(s.attune.rng, 0, CHAOS_EFFECTS.length - 1)]!;
  s.attune.chaos = { id: fx.id, until: s.playtime + A.chaos.seconds };
  s.stats.chaosRolls = (s.stats.chaosRolls ?? 0) + 1;
  if (fx.id === 'comet') s.comet.nextAt = Math.min(s.comet.nextAt, s.playtime);
  if (fx.id === 'burst') gain(s, 'stardust', stat(s, 'stardustPerSec').mul(60));
  events.emit({ t: 'milestone', id: `chaos.${fx.id}` });
}

function onTap(s: GameState, rt: TapRuntime, nowMs: number): { mult: number; grade?: string } {
  if (!attuneOpen(s) || s.attune.equipped.length === 0) return { mult: 1 };
  let mult = 1;
  let grade: string | undefined;
  if (equipped(s, 'pulse')) {
    const g = pulseGrade(nowMs);
    if (g.mult === 0 || rt.pulseBeat === g.beat) {
      // off the beat, or this beat already had its tap: the star doesn't answer
      mult = 0;
      grade = 'Off beat';
    } else {
      rt.pulseBeat = g.beat;
      s.attune.pulse = [...s.attune.pulse, g.mult].slice(-P.memory);
      if (g.mult === P.perfect) s.stats.perfects = (s.stats.perfects ?? 0) + 1;
      grade = g.name;
    }
  }
  if (equipped(s, 'heartbeat') && mult > 0) {
    const h = s.attune.heart + A.heartbeat.perTap;
    s.attune.heart = h >= A.heartbeat.max ? 0 : h; // overload: back to nothing
  }
  if (equipped(s, 'chaos') && mult > 0) {
    s.attune.chaosTaps += 1;
    if (s.attune.chaosTaps >= A.chaos.every) {
      s.attune.chaosTaps = 0;
      rollChaos(s);
    }
  }
  return grade ? { mult, grade } : { mult };
}

export function registerAttune(): void {
  tapRules.cap.push((s) => (attuneOpen(s) && equipped(s, 'lens') ? A.lens.perSecond : Infinity));
  tapRules.hooks.push(onTap);
  const on = (id: AttuneId) => (s: GameState) => attuneOpen(s) && equipped(s, id);
  registerSources(
    { id: 'attune.pulse', stat: 'tapPower', op: 'mul', label: 'Pulse (timing rating)', value: (s) => D(pulseRating(s)), active: on('pulse') },
    { id: 'attune.heart', stat: 'productionMult', op: 'mul', label: 'Heartbeat (meter)', value: (s) => D(heartMult(s)), active: on('heartbeat') },
    { id: 'attune.lens', stat: 'tapPower', op: 'mul', label: 'Gravity Lens', value: () => D(A.lens.mult), active: on('lens') },
    { id: 'chaos.taps', stat: 'tapPower', op: 'mul', label: 'Chaos Die: Heavy Hands', value: () => D(10), active: (s) => chaosActive(s, 'taps') },
    { id: 'chaos.prod', stat: 'productionMult', op: 'mul', label: 'Chaos Die: Overdrive', value: () => D(3), active: (s) => chaosActive(s, 'prod') },
    { id: 'chaos.crit', stat: 'critChance', op: 'add', label: 'Chaos Die: Sharp Eye', value: () => D(0.5), active: (s) => chaosActive(s, 'crit') },
    { id: 'chaos.xp', stat: 'xpGain', op: 'mul', label: 'Chaos Die: Insight', value: () => D(3), active: (s) => chaosActive(s, 'xp') },
  );
  registerSystem({
    id: 'attune',
    order: 6,
    tick: (s: GameState, dt: number, _ctx: TickContext) => {
      if (s.attune.heart > 0) s.attune.heart = Math.max(0, s.attune.heart - A.heartbeat.drain * dt);
      if (s.attune.chaos && s.playtime >= s.attune.chaos.until) s.attune.chaos = null;
    },
  });
}

