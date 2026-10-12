import { BALANCE } from '../../content/balance';
import { CONSTANTS } from '../../content/constants';
import { ETERNITY_UPGRADES } from '../../content/crunch';
import { MULTIVERSE_ARMS, SPARK_EDGES, SPARK_TREE, UNIVERSE_RULE_BY_ID, UNIVERSE_RULES } from '../../content/multiverse';
import { D, type Decimal, ZERO } from '../decimal';
import { milestoneReached, performReset, registerLayer, type ResetPart } from '../layers';
import { nextFloat } from '../rng';
import { type GameState } from '../state';
import { defineStat, invalidateStats, registerSources, stat } from '../stats';
import { registerSystem } from '../tick';
import { makeTree } from '../treeKit';
import { crunchGain, crunchReady } from './crunch';
import { gainPeaked } from './eternity';
import { goalMet as trialGoalMet, inTrial } from './trials';

/**
 * The Multiverse: the sixth and last reset (Game design: "Galactic Rebirth, Big Crunch and
 * Multiverse"; UUT's Rift, a true New Game+).
 * - Needs 10 Big Crunches in this universe. Gives 6 Multiverse Sparks (more from Spark Hoards and
 *   milestone 6), times the Universe Forge's reward for the rules this universe was played under.
 * - Resets every earlier layer, each as its own part, and each part is kept by its Spark choice
 *   ("<Layer> Unbound"). Counters (and so milestones) can be kept on their own, and each layer's
 *   Eternity automation too. Always kept: Sparks, Spark choices, Omni Constants, the Universe Forge,
 *   Trials, the Spire, the Leviathans and the Scale Tree (their rewards are for good), every
 *   collection, medals, Engine Mastery and the Starsmith Level.
 * - Spark choices are a branching tree on the shared tree engine whose choices need nothing first.
 * - The Universe Forge: pick the next universe's rules; they apply as stat sources ("Universe:
 *   <name>") while you play it, and multiply the Sparks it pays.
 */
const M = BALANCE.multiverse;
const OMNI_IDS = CONSTANTS.filter((c) => c.set === 'omni').map((c) => c.id);
const PER_SPARK = Math.round(1 / M.choiceCost);

/**
 * Sparks come in fifths. Floating point drifts (0.6 - 0.2 - 0.2 is 0.19999999999999996, which
 * could not buy a 0.2 choice), so every change snaps them back to the nearest fifth: k / 5 as a
 * double is never below the double nearest 0.2 x 2^n for any k >= 2^n, so prices compare exactly.
 */
export function snapSparks(s: GameState): void {
  const v = s.currencies.sparks;
  if (v && v.lt(1e15)) s.currencies.sparks = D(Math.round(v.toNumber() * PER_SPARK) / PER_SPARK);
}

export const sparkTree = makeTree({
  id: 'sparkTree',
  label: 'Spark choices',
  currency: 'sparks',
  nodes: SPARK_TREE,
  links: SPARK_EDGES,
  levels: (s) => s.multiverse.tree,
  afterBuy: (s) => {
    snapSparks(s);
    s.stats.sparkChoices = Object.values(s.multiverse.tree).filter((l) => l > 0).length;
  },
  open: (s) => (s.stats.multiversesAll ?? 0) >= 1 || (s.currencies.sparks ?? ZERO).gt(0),
});

export const sparkFlag = (s: GameState, f: string): boolean => sparkTree.flag(s, f) > 0;
export const keeps = (s: GameState, layer: string): boolean => sparkFlag(s, `keep.${layer}`);
const keepsCount = (s: GameState, layer: string): boolean => keeps(s, layer) || sparkFlag(s, `keepMilestones.${layer}`);

/** Big Crunches this universe (the Multiverse's requirement). */
export const crunchesThisUniverse = (s: GameState): number => s.stats.crunchesCycle ?? 0;
export const multiverseSeen = (s: GameState) => milestoneReached(s, 'crunch', 'multiverse') || (s.stats.multiversesAll ?? 0) > 0;

/** How many rules the Universe Forge takes now. */
export function maxRules(s: GameState): number {
  if (milestoneReached(s, 'multiverse', 'forgeAll')) return UNIVERSE_RULES.length;
  return milestoneReached(s, 'multiverse', 'forge4') ? 4 : 2;
}

/** The Sparks this universe's rules add, as a share (0.75 = +75%). */
export const ruleReward = (s: GameState): number => s.multiverse.rules.reduce((a, id) => a + (UNIVERSE_RULE_BY_ID.get(id)?.reward ?? 0), 0);

export function multiverseGain(s: GameState): Decimal {
  if (crunchesThisUniverse(s) < M.crunches) return ZERO;
  const base = M.sparks + sparkTree.flag(s, 'sparkBonus') + (milestoneReached(s, 'multiverse', 'sparkPlus') ? 1 : 0);
  const raw = stat(s, 'sparkGain').mul(base * (1 + ruleReward(s)));
  // Sparks come in fifths: every Spark choice costs 0.2
  // in floating point 6 x 1.4 is 8.399999999999999: a hair of slack keeps a whole fifth from flooring away
  return raw.mul(5).mul(1 + 1e-9).floor().div(5);
}

export const multiverseReady = (s: GameState) => multiverseGain(s).gte(M.choiceCost);

export function setNextRule(s: GameState, id: string, on: boolean): boolean {
  if (!UNIVERSE_RULE_BY_ID.has(id) || !multiverseSeen(s)) return false;
  const next = s.multiverse.next.filter((x) => x !== id);
  if (on) {
    if (next.length >= maxRules(s)) return false;
    next.push(id);
  }
  s.multiverse.next = next;
  return true;
}

// ---------- what each layer's part resets ----------

const zero = (s: GameState, ...currencies: string[]) => {
  for (const c of currencies) {
    s.currencies[c] = ZERO;
    s.totals.run[c] = ZERO;
    s.totals.all[c] = ZERO;
  }
};
const zeroConstants = (s: GameState, set: string) => {
  for (const c of CONSTANTS) if (c.set === set) s.constants[c.id] = 0;
};
const counter = (s: GameState, layer: string, name: string) => {
  if (keepsCount(s, layer)) return;
  s.stats[name] = 0;
  s.stats[`${name}Best`] = 0;
};

const PARTS: Record<string, (s: GameState) => void> = {
  stardust: (s) => {
    zero(s, 'stardust');
    s.engines = {};
    s.tier = sparkFlag(s, 'keepMilestones.stardust') ? BALANCE.supernova.tier : 0;
    s.upgrades = [];
    zeroConstants(s, 'stellar');
    s.planets = {};
    s.buffs = {};
    s.comet.until = 0;
  },
  supernova: (s) => {
    zero(s, 'shards', 'ore', ...Object.keys(s.currencies).filter((c) => c.startsWith('alloy.')));
    s.novaTree = {};
    s.belt.upgrades = {};
    s.belt.tier = 0;
    s.belt.oreThisTier = ZERO;
    s.drill.depth = 0;
    s.drill.damage = ZERO;
    s.drill.drones = 0;
    s.drill.bits = 0;
    s.forge.upgrades = {};
    s.forge.lanes = [];
    s.fusion.board = s.fusion.board.map(() => 0);
    s.fusion.upgrades = {};
    s.fusion.best = 0;
    s.fusion.autoOwned = false;
    s.attune.unlocked = [];
    s.attune.equipped = [];
    s.merchant.deals = [];
    s.merchant.nextShip = 0;
    s.merchant.luck = 0;
    s.merchant.rerolls = 0;
    s.ships.fleet = [{ sector: null, t: 0, auto: true }];
    s.ships.upgrades = {};
    s.ships.parts = [];
  },
  nebula: (s) => {
    zero(s, 'essence');
    s.nebulaTree = {};
    zeroConstants(s, 'nebula');
    s.spectral.energy = {};
    s.spectral.upgrades = {};
  },
  singularity: (s) => {
    zero(s, 'darkMatter', 'antimatter');
    s.singularityTree = {};
    zeroConstants(s, 'void');
    s.singularity.key = false;
    s.blackHole.mass = ZERO;
    s.wheel.banks = {};
    s.reactor.charge = ZERO;
    s.mirror = { engines: {}, ever: {}, depth: 0, upgrades: [] };
    s.wormholes.links = [];
    // Planet Defense starts again in each universe (its battles keep their seed)
    s.defense = { sockets: s.defense.sockets.map(() => ''), levels: {}, best: 0, wave: 0, auto: false, seed: s.defense.seed, acc: 0, lost: '' };
  },
  galactic: (s) => {
    zero(s, 'galaxyCores', 'starCharts', 'supply');
    s.galacticTree = {};
    zeroConstants(s, 'galactic');
    s.galactic.galaxy = 'milkyway';
    s.galactic.next = 'milkyway';
    s.galactic.cleared = [];
    s.stats.galaxiesCleared = 0;
    s.observatory = { seed: Math.floor(nextFloat(s.rng) * 2 ** 31), links: [], best: 0 };
    s.starChart = {};
    s.megastructures = {};
    s.colonies = { list: [], routes: [], research: [] };
  },
  crunch: (s) => {
    zero(s, 'chronons', 'echoDust', 'echoShards', 'echoEssence');
    s.eternity.upgrades = s.eternity.upgrades.filter((id) => sparkFlag(s, `keepEternity.${id}`));
    zeroConstants(s, 'eternal');
    s.echoes = { engines: {}, ever: {} };
  },
};

const COUNTERS: Record<string, string> = { supernova: 'supernovas', nebula: 'nebulas', singularity: 'singularities', galactic: 'galactics', crunch: 'crunches' };

function layerPart(key: string, name: string, keepsWhat: string): ResetPart {
  return {
    id: key,
    label: `The ${name} layer: ${keepsWhat}`,
    reset: (s) => {
      PARTS[key]!(s);
      if (COUNTERS[key]) counter(s, key, COUNTERS[key]!);
    },
    keptBy: (s) => (keeps(s, key) ? `${name} Unbound (Spark choice)` : null),
  };
}

export function registerMultiverse(): void {
  defineStat({ id: 'sparkGain', label: 'Spark gain', base: () => D(1) });
  sparkTree.register();
  // the Universe Forge: each active rule is a set of stat sources while you play that universe
  for (const r of UNIVERSE_RULES) {
    registerSources(
      ...r.effects.map((e, i) => ({
        id: `universe.${r.id}.${i}`,
        stat: e.stat,
        op: e.op,
        label: `Universe: ${r.name}`,
        value: () => D(e.value),
        active: (s: GameState) => s.multiverse.rules.includes(r.id),
      })),
    );
  }
  registerLayer({
    id: 'multiverse',
    name: 'Multiverse',
    action: 'Enter the Multiverse',
    currency: 'sparks',
    color: '#FF6AD5',
    counter: 'multiverses',
    ready: multiverseReady,
    gain: multiverseGain,
    parts: MULTIVERSE_ARMS.map((a) => layerPart(a.key, a.name, a.keeps)),
    alwaysKept: [
      'Multiverse Sparks, your Spark choices, Omni Constants and the Universe Forge',
      'Trials, the Spire, the Void Leviathans and the Scale Tree',
      'Runes, auras, mutations, the Index, Wyrms, the Nursery and your tarot cards',
      'Relics, the Codex, Engine Mastery and your Starsmith Level',
      'Medals and everything you have unlocked',
    ],
    milestones: [
      { at: 1, id: 'omni', text: "Omni Constants open, and the Last Starsmith's story ends" },
      { at: 2, id: 'forge4', text: 'The Universe Forge takes up to 4 rules' },
      { at: 4, id: 'forgeAll', text: 'The Universe Forge takes every rule at once' },
      { at: 6, id: 'sparkPlus', text: '+1 Spark from every Multiverse' },
      { at: 10, id: 'eternal', text: 'Start every universe with all ten Eternity upgrades' },
    ],
    onReset: (s) => {
      snapSparks(s);
      s.stats.multiversesAll = (s.stats.multiversesAll ?? 0) + 1;
      s.stats.multiversesBest = Math.max(s.stats.multiversesBest ?? 0, s.stats.multiverses ?? 0);
      s.stats.crunchesCycle = 0;
      s.stats.rulesBest = Math.max(s.stats.rulesBest ?? 0, s.multiverse.rules.length);
      // the next universe's rules take effect now
      s.multiverse.rules = s.multiverse.next.filter((id) => UNIVERSE_RULE_BY_ID.has(id));
      if (milestoneReached(s, 'multiverse', 'eternal')) s.eternity.upgrades = ETERNITY_UPGRADES.map((u) => u.id);
      invalidateStats();
    },
  });
  registerSystem({
    id: 'multiverse',
    order: 70,
    tick: (s: GameState) => {
      // the highest Omni Constant, for its medal
      let omni = s.stats.omniBest ?? 0;
      for (const id of OMNI_IDS) omni = Math.max(omni, s.constants[id] ?? 0);
      s.stats.omniBest = omni;
      // Auto-Crunch (a Spark choice): on Eternity's rule, so passive gains can never stall it
      if (!sparkFlag(s, 'autoCrunch') || !crunchReady(s) || (inTrial(s) && !trialGoalMet(s))) return;
      const g = crunchGain(s);
      const peaked = gainPeaked(s, 'crunch', g);
      if (peaked || g.gte(s.totals.run.chronons ?? ZERO)) performReset(s, 'crunch');
    },
  });
}
