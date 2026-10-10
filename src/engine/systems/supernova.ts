import { BALANCE } from '../../content/balance';
import { CONSTANTS } from '../../content/constants';
import { TIERS } from '../../content/tiers';
import { D, type Decimal, ZERO } from '../decimal';
import { milestoneReached, registerLayer } from '../layers';
import { gain, type GameState } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { treeFlag } from './novaTree';
import { giveXp } from './starsmith';

/**
 * Supernova: the first reset layer (Game design: "Supernova and the Nova Tree"). Needs a Blue
 * Giant and 10M Stardust gathered this run; gives floor((S / 1e7)^0.5) Nova Shards (softcapped
 * above 10,000). The first Supernova always gives exactly 3. Lifetime shards boost all Stardust.
 */
const B = BALANCE.supernova;

/** Seconds since the last Supernova (or since the game began). */
export const runSeconds = (s: GameState): number => s.playtime - (s.lastResetAt.supernova ?? 0);

/** Quick Burn: the faster the run, the more shards, up to x3. */
function quickBurn(s: GameState): number {
  if (!treeFlag(s, 'quickBurn')) return 1;
  return Math.max(1, Math.min(3, B.quickBurnSeconds / Math.max(1, runSeconds(s))));
}

/** Shards before rounding down (also what passive shard gain pays a share of). */
export function rawShardGain(s: GameState): Decimal {
  const S = s.totals.run.stardust ?? ZERO;
  let raw = S.div(B.runStardust).pow(B.gainPow).mul(stat(s, 'shardGain')).mul(quickBurn(s));
  if (raw.gt(B.softcapAt)) raw = D(B.softcapAt).mul(raw.div(B.softcapAt).pow(B.softcapPow));
  return raw;
}

export function supernovaGain(s: GameState): Decimal {
  if ((s.stats.supernovas ?? 0) === 0) return D(B.firstGain);
  return rawShardGain(s).floor();
}

export function supernovaReady(s: GameState): boolean {
  return s.tier >= B.tier && (s.totals.run.stardust ?? ZERO).gte(B.runStardust) && supernovaGain(s).gte(1);
}

/** Stardust this run needed for one more shard than now ("next shard at X"). */
export function nextShardAt(s: GameState): Decimal {
  const next = supernovaGain(s).add(1);
  const mult = stat(s, 'shardGain').mul(quickBurn(s));
  return D(B.runStardust).mul(next.div(mult).pow(1 / B.gainPow));
}

/** Where the next run starts: Protostar, or higher with milestones and nodes. */
export function startTier(s: GameState): number {
  const best = s.stats.bestTier ?? s.tier;
  let t = 0;
  if (milestoneReached(s, 'supernova', 'keepTier')) t = Math.max(t, best - 2);
  if (treeFlag(s, 'startTier') > 0) t = Math.max(t, 1);
  if (treeFlag(s, 'startTier') < 0) t = Math.max(t, best - 1);
  return Math.max(0, Math.min(t, TIERS.length - 1));
}

const keepConstants = (s: GameState) => Math.min(1, Math.max(0, treeFlag(s, 'keepConstants')));

export function registerSupernova(): void {
  defineStat({ id: 'shardGain', label: 'Shard gain', base: () => D(1) });
  defineStat({ id: 'passiveShards', label: 'Passive shards per second', base: () => D(0) });
  const glow = (s: GameState) => D(1).add(s.totals.all.shards ?? ZERO).pow(B.passivePow);
  registerSources(
    { id: 'shards.prod', stat: 'productionMult', op: 'mul', label: 'Nova Shards (lifetime)', value: glow, active: (s) => (s.totals.all.shards ?? ZERO).gt(0) },
    { id: 'shards.tap', stat: 'tapPower', op: 'mul', label: 'Nova Shards (lifetime)', value: glow, active: (s) => (s.totals.all.shards ?? ZERO).gt(0) },
    { id: 'milestone.passive', stat: 'passiveShards', op: 'add', label: 'Milestone: 20 Supernovas', value: () => D(B.passiveShare), active: (s) => milestoneReached(s, 'supernova', 'passive') },
  );

  registerLayer({
    id: 'supernova',
    name: 'Supernova',
    action: 'Go Supernova',
    currency: 'shards',
    color: '#FF4FC1',
    counter: 'supernovas',
    ready: supernovaReady,
    gain: supernovaGain,
    parts: [
      {
        id: 'stardust',
        label: 'Stardust',
        reset: (s) => {
          s.currencies.stardust = ZERO;
          s.totals.run.stardust = ZERO;
        },
      },
      {
        id: 'engines',
        label: 'Engines',
        reset: (s) => {
          s.engines = {};
          const motes = treeFlag(s, 'startMotes');
          if (motes > 0) s.engines.mote = motes;
        },
      },
      {
        id: 'tier',
        label: 'Star Tier',
        reset: (s) => {
          s.tier = startTier(s);
        },
        keptBy: (s) => (startTier(s) > 0 ? `You start as a ${TIERS[startTier(s)]!.name}` : null),
      },
      { id: 'upgrades', label: 'Upgrades', reset: (s) => void (s.upgrades = []), keptBy: (s) => (treeFlag(s, 'keepUpgrades') ? 'Nova Tree: Keep the Tools' : null) },
      {
        id: 'constants',
        label: 'Stellar Constants',
        reset: (s) => {
          const keep = keepConstants(s);
          for (const c of CONSTANTS) if (c.set === 'stellar' && s.constants[c.id]) s.constants[c.id] = Math.floor(s.constants[c.id]! * keep);
        },
        keptBy: (s) => (keepConstants(s) >= 1 ? 'Nova Tree' : null),
      },
      { id: 'planets', label: 'Planets', reset: (s) => void (s.planets = {}), keptBy: (s) => (treeFlag(s, 'keepPlanets') ? 'Nova Tree: Planetary Forge' : null) },
      {
        id: 'buffs',
        label: 'Comet buffs',
        reset: (s) => {
          s.buffs = {};
          s.comet.until = 0;
        },
      },
    ],
    onReset: (s) => giveXp(s, BALANCE.starsmith.xp.supernova),
    alwaysKept: ['Nova Shards and the Nova Tree', 'Medals and Goals', 'Engine Mastery', 'Star Quests and their bonus', 'The Asteroid Belt, Deep Core and Starsmith Level', 'Everything you have unlocked'],
    milestones: [
      { at: 1, id: 'tree', text: 'The Nova Tree opens' },
      { at: 2, id: 'autoEvolve', text: 'Auto-Evolve: your star evolves by itself' },
      { at: 3, id: 'starforge', text: 'The Starforge opens; Spark Mote auto-buyer' },
      { at: 5, id: 'auto5', text: 'Auto-buyers for engines 2 to 5' },
      { at: 8, id: 'keepTier', text: 'Start each run 2 tiers below your best' },
      { at: 12, id: 'autoAll', text: 'Auto-buyers for every engine and upgrade' },
      { at: 20, id: 'passive', text: 'Gain 1% of your Supernova gain every second' },
      { at: 30, id: 'nebula', text: 'The Nebula appears' },
    ],
  });

  registerSystem({
    id: 'supernova.passive',
    order: 60,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      if (s.tier > (s.stats.bestTier ?? 0)) s.stats.bestTier = s.tier;
      const share = stat(s, 'passiveShards');
      if (share.lte(0) || (s.stats.supernovas ?? 0) === 0) return;
      const g = rawShardGain(s).mul(share).mul(dt * ctx.gainScale);
      if (g.gt(0)) gain(s, 'shards', g);
    },
  });
}
