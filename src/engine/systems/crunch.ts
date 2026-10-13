import { BALANCE } from '../../content/balance';
import { CONSTANTS } from '../../content/constants';
import { GALAXIES } from '../../content/galactic';
import { D, type Decimal, ZERO } from '../decimal';
import { layer, milestoneReached, registerLayer, resetCeiling, unResetCeiling } from '../layers';
import { cur, gain, type GameState, gainPassive } from '../state';
import { registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { hasEternity } from './eternity';
import { arriveIn, galacticGain, galacticReady } from './galactic';

/**
 * The Big Crunch: the fifth reset (Game design: "Galactic Rebirth, Big Crunch and Multiverse").
 * - Needs 7 galaxies explored in the Crunch run and 1e11 Galaxy Cores gained in it (1.4.0). Gives
 *   floor((log10(GC / 1e11) + 1)^1.5) x Chronon gain, GC = Galaxy Cores gained this Crunch run. Lifetime Chronons give Galaxy Cores
 *   x(1 + Chronons)^0.5.
 * - Resets the Galactic layer and everything below: Galaxy Cores, explored galaxies, the Galactic
 *   Tree and Galactic Constants (until milestones keep them). Keeps megastructures, colonies, the
 *   Stardust Chart, Trials, the Spire, the Leviathans, the Wormhole Network and every collection.
 * - Opens the Echo boards and Eternity (systems/echoes.ts, systems/eternity.ts).
 */
const C = BALANCE.crunch;

/** Galaxy Cores gained this Crunch run (no Galactic Rebirth resets this). */
export const runCores = (s: GameState): Decimal => s.totals.run.galaxyCores ?? ZERO;
export const galaxiesExplored = (s: GameState): number => s.galactic.cleared.length;

/** Galaxies this Crunch needs explored: 7, then two more for each Big Crunch already in this universe, up to all 20. */
export const galaxiesNeeded = (s: GameState): number => Math.min(GALAXIES.length, C.galaxies + C.galaxiesStep * (s.stats.crunchesCycle ?? 0));

export function crunchGain(s: GameState): Decimal {
  const gc = runCores(s);
  if (gc.lt(C.need)) return ZERO;
  return resetCeiling(s, 'crunch', gc.div(C.need).log10().add(1).pow(C.gainPow).mul(stat(s, 'chrononGain'))).floor();
}

export function crunchReady(s: GameState): boolean {
  return galaxiesExplored(s) >= galaxiesNeeded(s) && crunchGain(s).gte(1);
}

/** Galaxy Cores this run needed for one more Chronon. */
export function nextChrononAt(s: GameState): Decimal {
  const next = unResetCeiling(s, 'crunch', crunchGain(s).add(1)).div(stat(s, 'chrononGain'));
  return D(10).pow(next.pow(1 / C.gainPow).sub(1)).mul(C.need);
}

/** The Crunch appears with Galactic milestone 7 (and stays once you've crunched). */
export const crunchSeen = (s: GameState) => milestoneReached(s, 'galactic', 'crunch') || (s.stats.crunchesAll ?? 0) > 0;

/** Milestone 10: a Galactic Rebirth resets nothing (its gain trickles in instead). */
export const galacticFree = (s: GameState) => milestoneReached(s, 'crunch', 'galacticFree');

/** The galaxies False Dawn (Eternity) explores at the start of every Crunch run. */
const DAWN = ['milkyway', 'spiral', 'elliptical'];

export function registerCrunch(): void {
  const glow = (s: GameState) => D(1).add(s.totals.all.chronons ?? ZERO).pow(C.passivePow);
  registerSources({ id: 'chronons.cores', stat: 'galaxyCoreGain', op: 'mul', label: 'Chronons (lifetime)', value: glow, active: (s) => (s.totals.all.chronons ?? ZERO).gt(0) });

  registerLayer({
    id: 'crunch',
    name: 'Big Crunch',
    action: 'Big Crunch',
    currency: 'chronons',
    color: '#FF8A3D',
    counter: 'crunches',
    ready: crunchReady,
    gain: crunchGain,
    // the trees go first, so the Galactic reset below reads no "keep" or "start with" nodes from them
    parts: [
      {
        id: 'galacticTree',
        label: 'The Galactic Tree',
        reset: (s) => {
          s.galacticTree = {};
        },
        keptBy: (s) => (milestoneReached(s, 'crunch', 'keepGalacticTree') ? 'Milestone: 3 Big Crunches' : null),
      },
      {
        id: 'galacticConstants',
        label: 'Galactic Constants',
        reset: (s) => {
          for (const c of CONSTANTS) if (c.set === 'galactic') s.constants[c.id] = 0;
        },
        keptBy: (s) => (milestoneReached(s, 'crunch', 'keepGalacticConstants') ? 'Milestone: 5 Big Crunches' : null),
      },
      {
        id: 'galacticLayer',
        label: 'Everything a Galactic Rebirth resets, Galaxy Cores and explored galaxies',
        reset: (s) => {
          for (const p of layer('galactic')?.parts ?? []) p.reset(s);
          // every currency below starts again (a kept tree's "keep some" nodes are for Galactic Rebirths)
          for (const c of ['galaxyCores', 'darkMatter', 'essence', 'shards', 'stardust']) {
            s.currencies[c] = ZERO;
            s.totals.run[c] = ZERO;
          }
          s.galactic.cleared = hasEternity(s, 'et.dawn') ? [...DAWN] : [];
          s.galactic.next = 'milkyway';
          arriveIn(s, 'milkyway');
          s.stats.galaxiesCleared = s.galactic.cleared.length;
        },
      },
      {
        id: 'galactics',
        label: 'Your Galactic Rebirth count (milestones are kept from the first Big Crunch)',
        reset: (s) => {
          s.stats.galactics = 0;
        },
      },
    ],
    alwaysKept: [
      'Chronons, Eternity upgrades, Eternal Constants and the Echo boards',
      'Megastructures, colonies and the Stardust Chart',
      'Trials, the Spire, the Void Leviathans, the Scale Tree and the Wormhole Network',
      'Runes, auras, mutations, the Index, Wyrms, the Nursery and your tarot cards',
      'Relics, the Codex, the Belt and the Starforge',
      'Medals and everything you have unlocked',
    ],
    milestones: [
      { at: 1, id: 'keepGalactic', text: 'Keep your Galactic milestones; the Echo boards and Eternity open' },
      { at: 2, id: 'echoAuto', text: 'Echo Supernovas and Echo Nebulas go off by themselves' },
      { at: 3, id: 'keepGalacticTree', text: 'Keep the Galactic Tree' },
      { at: BALANCE.passive.at.crunch!, id: 'passive', text: 'Gain 1% of your Big Crunch gain every second, without a Big Crunch' },
      { at: 5, id: 'keepGalacticConstants', text: 'Keep Galactic Constants' },
      { at: 8, id: 'multiverse', text: 'The Multiverse stirs (10 Big Crunches)' },
      { at: 10, id: 'galacticFree', text: 'A Galactic Rebirth resets nothing; 1/50 of its gain trickles in every second' },
    ],
    onReset: (s) => {
      s.stats.crunchesAll = (s.stats.crunchesAll ?? 0) + 1;
      // Big Crunches in this universe (the Multiverse starts a new count): each needs two more galaxies explored
      s.stats.crunchesCycle = (s.stats.crunchesCycle ?? 0) + 1;
      s.stats.crunchesBest = Math.max(s.stats.crunchesBest ?? 0, s.stats.crunches ?? 0);
    },
  });

  registerSystem({
    id: 'crunch',
    order: 68,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      // Milestone 10: 1/50 of the Galactic gain trickles in every second, nothing reset
      if (galacticFree(s) && galacticReady(s)) gain(s, 'galaxyCores', galacticGain(s).mul(C.trickle * dt * ctx.gainScale));
      // 1.3.0, Galactic milestone 4: 1% of the Galactic gain a second
      else if (milestoneReached(s, 'galactic', 'passive') && galacticReady(s)) gainPassive(s, 'galaxyCores', galacticGain(s).mul(BALANCE.passive.share * dt * ctx.gainScale));
      // 1.3.0, Big Crunch milestone 4: 1% of the Big Crunch gain a second
      if (milestoneReached(s, 'crunch', 'passive') && crunchReady(s)) gainPassive(s, 'chronons', crunchGain(s).mul(BALANCE.passive.share * dt * ctx.gainScale));
    },
  });
}

export const chronons = (s: GameState) => cur(s, 'chronons');
