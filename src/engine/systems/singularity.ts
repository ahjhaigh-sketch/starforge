import { BALANCE } from '../../content/balance';
import { CONSTANTS } from '../../content/constants';
import { SINGULARITY_TREE } from '../../content/singularityTree';
import { D, type Decimal, ZERO } from '../decimal';
import { events } from '../events';
import { layer, milestoneReached, performReset, registerLayer } from '../layers';
import { cur, gain, type GameState, spend } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { makeTree } from '../treeKit';
import { nebulaGain, nebulaReady } from './nebula';

/**
 * The Singularity: the third reset (Game design: "Singularity"). It needs the Event Horizon key
 * (bought once with Embers, from Nebula milestone 8) and NE, the Essence gathered this
 * Singularity run, of at least 1e6. It gives floor(1.05^(log10(NE) - 6)) x Dark Matter gain (a
 * log-scale gain: Essence passes e90 by Nebula 8). It resets the Nebula layer (Essence, the
 * Nebula Tree, Nebula Constants, the Nebula count, Spectral energy) and everything below; it
 * keeps collections (runes, auras, Wyrms, cards, the Nursery, relics, the Codex). Lifetime Dark
 * Matter boosts Essence. Milestones take Nebula chores away one by one.
 */
const S = BALANCE.singularity;

export const singularityTree = makeTree({
  id: 'singularityTree',
  label: 'Singularity Tree',
  currency: 'darkMatter',
  nodes: SINGULARITY_TREE,
  levels: (s) => s.singularityTree,
  open: (s) => (s.stats.singularitiesAll ?? 0) >= 1,
});

/** Essence gathered this Singularity run. */
export const runEssence = (s: GameState): Decimal => s.totals.run.essence ?? ZERO;

/** The Event Horizon key is on sale from Nebula milestone 8. */
export const keyOnSale = (s: GameState) => milestoneReached(s, 'nebula', 'singularity') || (s.stats.singularitiesAll ?? 0) > 0;

export function buyKey(s: GameState): boolean {
  if (s.singularity.key || !keyOnSale(s) || !spend(s, 'embers', D(S.keyEmbers))) return false;
  s.singularity.key = true;
  events.emit({ t: 'milestone', id: 'singularity.key' });
  return true;
}

export function singularityGain(s: GameState): Decimal {
  const ne = runEssence(s);
  if (ne.lt(S.runEssence)) return ZERO;
  return D(S.gainBase).pow(ne.log10().toNumber() - 6).mul(stat(s, 'darkMatterGain')).floor();
}

export function singularityReady(s: GameState): boolean {
  return s.singularity.key && runEssence(s).gte(S.runEssence) && singularityGain(s).gte(1);
}

/** Essence this run needed for one more Dark Matter. */
export function nextDarkMatterAt(s: GameState): Decimal {
  const next = singularityGain(s).add(1).div(stat(s, 'darkMatterGain'));
  return D(10).pow(6 + Math.log(Math.max(1, next.toNumber())) / Math.log(S.gainBase));
}

export const nebulaFree = (s: GameState) => milestoneReached(s, 'singularity', 'nebulaFree');

export function registerSingularity(): void {
  defineStat({ id: 'massGain', label: 'Black Hole mass gain', base: () => D(1) });
  defineStat({ id: 'gameSpeed', label: 'Game speed', base: () => D(1) });
  defineStat({ id: 'reactorPower', label: 'Reactor strength', base: () => D(1) });
  const glow = (s: GameState) => D(1).add(s.totals.all.darkMatter ?? ZERO).pow(S.passivePow);
  registerSources({ id: 'darkMatter.essence', stat: 'essenceGain', op: 'mul', label: 'Dark Matter (lifetime)', value: glow, active: (s) => (s.totals.all.darkMatter ?? ZERO).gt(0) });
  singularityTree.register();

  registerLayer({
    id: 'singularity',
    name: 'Singularity',
    action: 'Go Singularity',
    currency: 'darkMatter',
    color: '#6E5CC4',
    counter: 'singularities',
    ready: singularityReady,
    gain: singularityGain,
    parts: [
      {
        id: 'nebulaLayer',
        label: 'Everything a Nebula resets, Nebula Essence and Nebula Constants',
        reset: (s) => {
          for (const p of layer('nebula')?.parts ?? []) p.reset(s);
          for (const c of CONSTANTS) if (c.set === 'nebula') s.constants[c.id] = 0;
          const keep = Math.min(0.9, singularityTree.flag(s, 'keepEssence'));
          s.currencies.essence = (s.currencies.essence ?? ZERO).mul(keep).floor();
          s.totals.run.essence = ZERO;
        },
      },
      {
        id: 'nebulaTree',
        label: 'The Nebula Tree',
        reset: (s) => {
          s.nebulaTree = {};
        },
        keptBy: (s) => (milestoneReached(s, 'singularity', 'keepTree') ? 'Milestone: 3 Singularities' : null),
      },
      {
        id: 'spectral',
        label: 'Spectral energy',
        reset: (s) => {
          s.spectral.energy = {};
        },
        keptBy: (s) => (singularityTree.flag(s, 'keepSpectral') > 0 ? 'Colour Memory (Singularity Tree)' : null),
      },
      {
        id: 'nebulas',
        label: 'Your Nebula count (milestones are kept from the first Singularity)',
        reset: (s) => {
          s.stats.nebulas = Math.min(9, Math.floor(singularityTree.flag(s, 'startNebulas')));
        },
      },
    ],
    alwaysKept: [
      'Dark Matter, the Singularity Tree and Void Constants',
      'The Black Hole, the Prism Wheel and the Reactor',
      'Runes, auras, mutations, the Index and your star stars',
      'Void Wyrms, the Star Nursery and your tarot cards',
      'Relics, the Codex, the Belt and the Starforge',
      'The Event Horizon key, medals and everything you have unlocked',
    ],
    milestones: [
      { at: 1, id: 'keepNebula', text: 'Keep your Nebula milestones; the Black Hole wakes' },
      { at: 2, id: 'autoNebula', text: 'Auto-Nebula when its gain reaches a number you set' },
      { at: 3, id: 'keepTree', text: 'Keep the Nebula Tree' },
      { at: 5, id: 'reactor', text: 'The Dark Matter Reactor opens' },
      { at: 8, id: 'mirror', text: 'The Antimatter Mirror appears' },
      { at: 10, id: 'nebulaFree', text: 'A Nebula resets nothing; 1/50 of its gain trickles in every second' },
    ],
    onReset: (s) => {
      s.stats.singularitiesAll = (s.stats.singularitiesAll ?? 0) + 1;
      s.stats.singularitiesBest = Math.max(s.stats.singularitiesBest ?? 0, s.stats.singularities ?? 0);
    },
  });

  registerSystem({
    id: 'singularity.auto',
    order: 62,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      // Milestone 2: a Nebula by itself once its gain reaches your number
      if (milestoneReached(s, 'singularity', 'autoNebula') && s.singularity.autoAt.gt(0) && nebulaReady(s) && nebulaGain(s).gte(s.singularity.autoAt)) performReset(s, 'nebula');
      // Milestone 10: 1/50 of the Nebula gain trickles in every second, nothing reset
      if (nebulaFree(s) && nebulaReady(s)) gain(s, 'essence', nebulaGain(s).mul(S.trickle * dt * ctx.gainScale));
    },
  });
}

export const darkMatter = (s: GameState) => cur(s, 'darkMatter');
