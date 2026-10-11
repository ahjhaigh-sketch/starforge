import { BALANCE } from '../../content/balance';
import { ECHO_ENGINES } from '../../content/crunch';
import { D, type Decimal, ZERO } from '../decimal';
import { makeEngineLayer } from '../engineKit';
import { milestoneReached, performReset, registerLayer, type ResetPart } from '../layers';
import { cur, gain, type GameState } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { registerSystem } from '../tick';

/**
 * The Echo boards (Game design: "Big Crunch": the first three layers replayed as compact
 * mini-boards with new numbers). From the first Big Crunch; no reset outside them touches them.
 * - Echo Stardust: five engines on the shared engine kit (output doubles at 10, 25, 50, 100, 200
 *   owned) and a small star to tap.
 * - Echo Supernova: 1e6 Echo Dust in an echo run resets the board for Echo Shards.
 * - Echo Nebula: 100 Echo Shards in an echo run resets both for Echo Essence.
 * Both resets go through the one reset function. Lifetime echo currencies boost the real game:
 * Stardust, shards, Essence and Chronons.
 */
const E = BALANCE.echoes;

export const echoesOpen = (s: GameState) => (s.stats.crunchesAll ?? 0) >= 1;

export const ECHO_BOARD = makeEngineLayer({
  id: 'echo',
  label: 'Echo Dust',
  currency: 'echoDust',
  engines: ECHO_ENGINES,
  brackets: [{ from: 0, ratio: E.ratio }],
  owned: (s) => s.echoes.engines,
  ever: (s) => s.echoes.ever,
  stats: { engineMult: 'echoEngineMult.', layerMult: 'echoMult', perSec: 'echoDustPerSec', costMult: 'echoCostMult', milestoneBase: 'echoMilestoneBase' },
  milestones: () => E.milestones,
  open: echoesOpen,
  order: 12,
});

/** A tap on the echo star: 1 x echo output, plus a tenth of a second's Echo Dust. */
export function echoTap(s: GameState): Decimal {
  if (!echoesOpen(s)) return ZERO;
  const amount = stat(s, 'echoMult').add(stat(s, 'echoDustPerSec').mul(E.tapShare));
  gain(s, 'echoDust', amount);
  return amount;
}

const run = (s: GameState, c: string): Decimal => s.totals.run[c] ?? ZERO;
const all = (s: GameState, c: string): Decimal => s.totals.all[c] ?? ZERO;
/** 1 + log10(1 + x): what lifetime echoes multiply by inside the boards (log-scale, so they can never run away). */
const logBoost = (x: Decimal): Decimal => D(1).add(D(1).add(x).log10());

export function echoNovaGain(s: GameState): Decimal {
  const dust = run(s, 'echoDust');
  if (dust.lt(E.novaAt)) return ZERO;
  return dust.div(E.novaAt).pow(E.novaPow).mul(logBoost(all(s, 'echoEssence'))).floor();
}

export function echoNebulaGain(s: GameState): Decimal {
  const shards = run(s, 'echoShards');
  if (shards.lt(E.nebulaAt)) return ZERO;
  return shards.div(E.nebulaAt).pow(E.nebulaPow).floor();
}

const boardPart: ResetPart = {
  id: 'echoBoard',
  label: 'Echo engines and Echo Dust',
  reset: (s) => {
    s.echoes.engines = {};
    s.currencies.echoDust = ZERO;
    s.totals.run.echoDust = ZERO;
  },
};

/** Crunch milestone 2: each echo reset goes off by itself once it would at least double what you hold. */
export const echoAuto = (s: GameState) => milestoneReached(s, 'crunch', 'echoAuto');

export function registerEchoes(): void {
  defineStat({ id: 'echoMult', label: 'Echo output', base: () => D(1) });
  defineStat({ id: 'echoCostMult', label: 'Echo engine prices', base: () => D(1) });
  defineStat({ id: 'echoDustPerSec', label: 'Echo Dust per second', base: () => ZERO });
  defineStat({ id: 'echoMilestoneBase', label: 'Echo milestone multiplier', base: () => D(2) });
  ECHO_BOARD.register();
  registerSources(
    { id: 'echo.shards.board', stat: 'echoMult', op: 'mul', label: 'Echo Shards (lifetime)', value: (s) => logBoost(all(s, 'echoShards')).pow(E.shardBoardPow), active: (s) => all(s, 'echoShards').gt(0) },
    { id: 'echo.essence.board', stat: 'echoMult', op: 'mul', label: 'Echo Essence (lifetime)', value: (s) => logBoost(all(s, 'echoEssence')).pow(E.essenceBoardPow), active: (s) => all(s, 'echoEssence').gt(0) },
    // what the echoes give the real game
    { id: 'echo.dust.real', stat: 'productionMult', op: 'mul', label: 'Echo Dust (lifetime)', value: (s) => D(1).add(all(s, 'echoDust')).pow(E.dustPow), active: (s) => all(s, 'echoDust').gt(0) },
    { id: 'echo.shards.real', stat: 'shardGain', op: 'mul', label: 'Echo Shards (lifetime)', value: (s) => D(1).add(all(s, 'echoShards')).pow(E.shardPow), active: (s) => all(s, 'echoShards').gt(0) },
    { id: 'echo.essence.real', stat: 'essenceGain', op: 'mul', label: 'Echo Essence (lifetime)', value: (s) => D(1).add(all(s, 'echoEssence')).pow(E.essencePow), active: (s) => all(s, 'echoEssence').gt(0) },
    { id: 'echo.essence.chronons', stat: 'chrononGain', op: 'mul', label: 'Echo Essence (lifetime)', value: (s) => D(1).add(all(s, 'echoEssence')).pow(E.chrononPow), active: (s) => all(s, 'echoEssence').gt(0) },
    // the anchor: the echo star makes a little by itself, so a fresh board can start
    { id: 'echo.anchor', stat: 'echoDustPerSec', op: 'add', label: 'The echo star', value: () => D(1), active: echoesOpen },
  );
  registerLayer({
    id: 'echoNova',
    name: 'Echo Supernova',
    action: 'Echo Supernova',
    currency: 'echoShards',
    color: '#FF4FC1',
    counter: 'echoNovas',
    ready: (s) => echoesOpen(s) && echoNovaGain(s).gte(1),
    gain: echoNovaGain,
    parts: [boardPart],
    alwaysKept: ['Echo Shards, Echo Essence and everything outside the Echo boards'],
    milestones: [],
  });
  registerLayer({
    id: 'echoNebula',
    name: 'Echo Nebula',
    action: 'Echo Nebula',
    currency: 'echoEssence',
    color: '#2EE6FF',
    counter: 'echoNebulas',
    ready: (s) => echoesOpen(s) && echoNebulaGain(s).gte(1),
    gain: echoNebulaGain,
    parts: [
      boardPart,
      {
        id: 'echoShards',
        label: 'Echo Shards',
        reset: (s) => {
          s.currencies.echoShards = ZERO;
          s.totals.run.echoShards = ZERO;
        },
      },
    ],
    alwaysKept: ['Echo Essence and everything outside the Echo boards'],
    milestones: [],
  });
  registerSystem({
    id: 'echoes.auto',
    order: 13,
    tick: (s: GameState) => {
      if (!echoesOpen(s) || !echoAuto(s)) return;
      const g2 = echoNebulaGain(s);
      if (g2.gte(1) && g2.gte(cur(s, 'echoEssence'))) performReset(s, 'echoNebula');
      const g1 = echoNovaGain(s);
      if (g1.gte(1) && g1.gte(cur(s, 'echoShards'))) performReset(s, 'echoNova');
    },
  });
}
