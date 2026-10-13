import { BALANCE } from '../../content/balance';
import { CONSTANTS } from '../../content/constants';
import { GALACTIC_TREE, GALAXIES, GALAXY_BY_ID, type GalaxyDef, type GalaxyGoal } from '../../content/galactic';
import { D, type Decimal, softcap, ZERO } from '../decimal';
import { events } from '../events';
import { layer, milestoneReached, performReset, registerLayer } from '../layers';
import { gain, type GameState, gainPassive } from '../state';
import { defineStat, invalidateStats, registerSources, stat, type StatSource } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { makeTree } from '../treeKit';
import { mirrorKey } from './mirror';
import { singularityGain, singularityReady } from './singularity';
import { goalMet as trialGoalMet, inTrial } from './trials';

/**
 * Galactic Rebirth: the fourth reset (Game design: "Galactic Rebirth, Big Crunch and Multiverse").
 * - Needs the anti-star at Protostar (Mirror depth 11; 1.3.0, it was all 8 Black Hole stages), the
 *   Mirror Key and 1e8 Dark Matter gained this Galactic run.
 *   Gives floor((DM / 1e8)^0.5) x Galaxy Core gain. Lifetime Galaxy Cores give Dark Matter
 *   x(1 + GC)^0.3.
 * - Resets the Singularity layer: Dark Matter, the Singularity Tree, Void Constants, the Black
 *   Hole (with its wheel and Reactor), the Antimatter Mirror and everything below. Keeps
 *   collections, Trials, the Spire, the Leviathans and the Wormhole Network.
 * - 20 galaxies: before each Galactic Rebirth you pick where you restart. A galaxy's rule is a set
 *   of stat sources ("Galaxy: <name>") that count only while you're there; its goal is an amount
 *   to reach there; meeting it clears the galaxy and its reward stays for good.
 * - The Galactic Tree: 200 nodes on five spiral arms, one per playstyle, on the shared tree engine.
 */
const G = BALANCE.galactic;

export const galacticTree = makeTree({
  id: 'galacticTree',
  label: 'Galactic Tree',
  currency: 'galaxyCores',
  nodes: GALACTIC_TREE,
  levels: (s) => s.galacticTree,
  open: (s) => (s.stats.galacticsAll ?? 0) >= 1,
  power: (s) => Math.min(G.treePowerCap, stat(s, 'galacticTreePower').toNumber()),
});

/** Dark Matter gained this Galactic run. */
export const runDarkMatter = (s: GameState): Decimal => s.totals.run.darkMatter ?? ZERO;

/** The Dark Matter a Galactic Rebirth needs in its run. */
export const darkMatterNeeded = (_s: GameState): Decimal => D(G.runDarkMatter);

export function galacticGain(s: GameState): Decimal {
  const dm = runDarkMatter(s);
  const need = darkMatterNeeded(s);
  if (dm.lt(need)) return ZERO;
  // 1.3.0: softcapped above 10,000 a Galactic Rebirth
  return softcap(dm.div(need).pow(G.gainPow).mul(stat(s, 'galaxyCoreGain')), G.softcapAt, G.softcapPow).floor();
}

/** Each requirement on its own, for the reset bar and the panel: how far the anti-star has collapsed, the key, the Dark Matter. */
export function galacticReqs(s: GameState): { depth: number; key: boolean; dm: Decimal } {
  return { depth: s.mirror.depth, key: mirrorKey(s), dm: runDarkMatter(s) };
}

export function galacticReady(s: GameState): boolean {
  const r = galacticReqs(s);
  return r.depth >= G.mirrorDepth && r.key && r.dm.gte(darkMatterNeeded(s)) && galacticGain(s).gte(1);
}

/** Dark Matter this run needed for one more Galaxy Core. */
export function nextCoreAt(s: GameState): Decimal {
  let target = galacticGain(s).add(1);
  // undo the softcap first: above it, each Core needs (Cores / start)^(1 / power) times as much
  if (target.gt(G.softcapAt)) target = D(G.softcapAt).mul(target.div(G.softcapAt).pow(1 / G.softcapPow));
  return target.div(stat(s, 'galaxyCoreGain')).pow(1 / G.gainPow).mul(darkMatterNeeded(s));
}

// ---------- galaxies ----------

export const galaxyOf = (s: GameState): GalaxyDef => GALAXY_BY_ID.get(s.galactic.galaxy) ?? GALAXIES[0]!;
export const galaxyCleared = (s: GameState, id: string) => s.galactic.cleared.includes(id);

/** Galaxy k may be chosen once k - 3 have been cleared (Milky Way and the next three at first). */
export function galaxyAvailable(s: GameState, id: string): boolean {
  const k = GALAXIES.findIndex((g) => g.id === id);
  return k >= 0 && k <= s.galactic.cleared.length + G.galaxiesAhead;
}

/** The Galaxy Map opens with the Mirror Key (to pick your first destination) or the first Galactic Rebirth. */
export const galaxyMapOpen = (s: GameState) => (s.stats.galacticsAll ?? 0) >= 1 || mirrorKey(s);

export function setNextGalaxy(s: GameState, id: string): boolean {
  if (!galaxyMapOpen(s) || !galaxyAvailable(s, id)) return false;
  s.galactic.next = id;
  return true;
}

/** Progress towards the goal of the galaxy you're in: [now, target] in the goal's own units. */
export function goalProgress(s: GameState, goal: GalaxyGoal): { now: Decimal; target: Decimal } {
  switch (goal.kind) {
    case 'singularities':
      return { now: D(s.stats.singularities ?? 0), target: D(goal.n) };
    case 'darkMatter':
      return { now: runDarkMatter(s), target: D(goal.amount) };
    case 'mirrorDepth':
      return { now: D(s.mirror.depth), target: D(goal.n) };
    case 'essence':
      return { now: s.totals.run.essence ?? ZERO, target: D(goal.amount) };
  }
}

export function galaxyGoalMet(s: GameState): boolean {
  const { now, target } = goalProgress(s, galaxyOf(s).goal);
  return now.gte(target);
}

const rewardPower = (s: GameState) => Math.min(G.rewardPowerCap, stat(s, 'galaxyRewardPower').toNumber());

function galaxySources(): StatSource[] {
  const out: StatSource[] = [];
  for (const g of GALAXIES) {
    g.effects.forEach((e, i) => {
      out.push({ id: `galaxy.${g.id}.${i}`, stat: e.stat, op: e.op, label: `Galaxy: ${g.name}`, value: () => D(e.value), active: (s) => s.galactic.galaxy === g.id });
    });
    const r = g.reward;
    out.push({
      id: `galaxy.${g.id}.reward`,
      stat: r.stat,
      op: r.op,
      label: `${g.name} (cleared)`,
      value: (s) => (r.op === 'add' ? D(r.value * rewardPower(s)) : r.op === 'mul' ? D(r.value).pow(rewardPower(s)) : D(r.value)),
      active: (s) => galaxyCleared(s, g.id),
    });
  }
  return out;
}

// ---------- the layer ----------

export const singularityFree = (s: GameState) => milestoneReached(s, 'galactic', 'singularityFree');

/** Big Crunch milestone 10: a Galactic Rebirth resets nothing (checked here so this layer needn't import the Crunch). */
const galacticFree = (s: GameState) => milestoneReached(s, 'crunch', 'galacticFree');
const FREE = 'Milestone: 10 Big Crunches';

export function registerGalactic(): void {
  defineStat({ id: 'galaxyRewardPower', label: 'Cleared galaxy rewards', base: () => D(1) });
  defineStat({ id: 'galacticTreePower', label: 'Galactic Tree strength', base: () => D(1) });
  const glow = (s: GameState) => D(1).add(s.totals.all.galaxyCores ?? ZERO).pow(G.passivePow);
  registerSources({ id: 'galaxyCores.darkMatter', stat: 'darkMatterGain', op: 'mul', label: 'Galaxy Cores (lifetime)', value: glow, active: (s) => (s.totals.all.galaxyCores ?? ZERO).gt(0) });
  registerSources(...galaxySources());
  galacticTree.register();

  registerLayer({
    id: 'galactic',
    name: 'Galactic Rebirth',
    action: 'Go Galactic',
    currency: 'galaxyCores',
    color: '#B4F04A',
    counter: 'galactics',
    ready: galacticReady,
    gain: galacticGain,
    parts: [
      {
        id: 'singularityLayer',
        label: 'Everything a Singularity resets, Dark Matter and Void Constants',
        keptBy: (s) => (galacticFree(s) ? FREE : null),
        reset: (s) => {
          for (const p of layer('singularity')?.parts ?? []) p.reset(s);
          for (const c of CONSTANTS) if (c.set === 'void') s.constants[c.id] = 0;
          const keep = Math.min(0.9, galacticTree.flag(s, 'keepDarkMatter'));
          s.currencies.darkMatter = (s.currencies.darkMatter ?? ZERO).mul(keep).floor();
          s.totals.run.darkMatter = ZERO;
          s.totals.run.essence = ZERO;
          s.stats.singularities = Math.min(9, Math.floor(galacticTree.flag(s, 'startSingularities')));
        },
      },
      {
        id: 'singularityTree',
        label: 'The Singularity Tree',
        reset: (s) => {
          s.singularityTree = {};
        },
        keptBy: (s) => (galacticFree(s) ? FREE : milestoneReached(s, 'galactic', 'keepTree') ? 'Milestone: 3 Galactic Rebirths' : null),
      },
      {
        id: 'blackHole',
        label: 'The Black Hole, the Prism Wheel banks and the Reactor',
        reset: (s) => {
          s.blackHole.mass = ZERO;
          s.wheel.banks = {};
          s.reactor.charge = ZERO;
        },
        keptBy: (s) => (galacticFree(s) ? FREE : milestoneReached(s, 'galactic', 'keepHole') ? 'Milestone: 5 Galactic Rebirths' : null),
      },
      {
        id: 'mirror',
        label: 'The Antimatter Mirror (its key stays)',
        keptBy: (s) => (galacticFree(s) ? FREE : null),
        reset: (s) => {
          const key = mirrorKey(s);
          s.mirror.engines = {};
          s.mirror.depth = 0;
          s.mirror.upgrades = key ? ['mu.key'] : [];
          s.currencies.antimatter = ZERO;
          s.totals.run.antimatter = ZERO;
        },
      },
    ],
    alwaysKept: [
      'Galaxy Cores, the Galactic Tree, Galactic Constants and cleared galaxies',
      'Trials, the Spire, the Void Leviathans and the Scale Tree',
      'The Wormhole Network',
      'Runes, auras, mutations, the Index, Wyrms, the Nursery and your tarot cards',
      'Relics, the Codex, the Belt and the Starforge',
      'The Event Horizon key, medals and everything you have unlocked',
    ],
    // a Big Crunch keeps Galactic milestones from its first one (Big Crunch milestone 1)
    milestoneFloor: (s) => (milestoneReached(s, 'crunch', 'keepGalactic') ? (s.stats.galacticsBest ?? 0) : 0),
    milestones: [
      { at: 1, id: 'keepSingularity', text: 'Keep your Singularity milestones' },
      { at: 2, id: 'autoSingularity', text: 'Auto-Singularity when its gain reaches a number you set' },
      { at: 3, id: 'keepTree', text: 'Keep the Singularity Tree' },
      { at: BALANCE.passive.at.galactic!, id: 'passive', text: 'Gain 1% of your Galactic gain every second, without a Galactic Rebirth' },
      { at: 5, id: 'keepHole', text: 'Keep the Black Hole, the Prism Wheel banks and the Reactor' },
      { at: 7, id: 'crunch', text: 'The Big Crunch stirs (explore 7 galaxies)' },
      { at: 10, id: 'singularityFree', text: 'A Singularity resets nothing; 1/50 of its gain trickles in every second' },
    ],
    onReset: (s) => {
      // from 10 Big Crunches a Galactic Rebirth keeps everything, but this run's Dark Matter still starts over
      s.totals.run.darkMatter = ZERO;
      s.stats.galacticsAll = (s.stats.galacticsAll ?? 0) + 1;
      s.stats.galacticsBest = Math.max(s.stats.galacticsBest ?? 0, s.stats.galactics ?? 0);
      if (galaxyAvailable(s, s.galactic.next)) s.galactic.galaxy = s.galactic.next;
    },
  });

  registerSystem({
    id: 'galactic',
    order: 66,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      // the galaxy's goal: met once, cleared for good
      const g = galaxyOf(s);
      if (!galaxyCleared(s, g.id) && (s.stats.galacticsAll ?? 0) > 0 && galaxyGoalMet(s)) {
        s.galactic.cleared.push(g.id);
        s.stats.galaxiesCleared = s.galactic.cleared.length;
        invalidateStats();
        events.emit({ t: 'toast', title: `${g.name} explored`, body: `${g.rewardText}, for good.`, icon: 'galaxy', priority: true });
      }
      // Milestone 2: a Singularity by itself once its gain reaches your number
      if (milestoneReached(s, 'galactic', 'autoSingularity') && s.galactic.autoAt.gt(0) && singularityReady(s) && singularityGain(s).gte(s.galactic.autoAt) && !(inTrial(s) && !trialGoalMet(s))) performReset(s, 'singularity');
      // Milestone 10: 1/50 of the Singularity gain trickles in every second, nothing reset
      if (singularityFree(s) && singularityReady(s)) gain(s, 'darkMatter', singularityGain(s).mul(BALANCE.singularity.trickle * dt * ctx.gainScale));
      // 1.3.0, Singularity milestone 15: 1% of the Singularity gain a second
      else if (milestoneReached(s, 'singularity', 'passive') && singularityReady(s)) gainPassive(s, 'darkMatter', singularityGain(s).mul(BALANCE.passive.share * dt * ctx.gainScale));
    },
  });
}

export const galaxyCores = (s: GameState) => s.currencies.galaxyCores ?? ZERO;
