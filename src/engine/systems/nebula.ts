import { BALANCE } from '../../content/balance';
import { CONSTANTS } from '../../content/constants';
import { D, type Decimal, ZERO } from '../decimal';
import { layer, milestoneReached, performReset, registerLayer } from '../layers';
import type { GameState } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { registerSystem } from '../tick';
import { nebulaFlag } from './nebulaTree';
import { supernovaGain, supernovaReady } from './supernova';
import { goalMet, inTrial } from './trials';

/**
 * The Nebula: the second reset (Game design: "Nebula and Constellation Runes"). It needs 30
 * Supernovas and 100,000 Nova Shards gathered in one Nebula run, and gives
 * floor((NS / 1e5)^0.35) Nebula Essence (the first gives 2). It resets the Stardust layer, Nova
 * Shards, the Nova Tree and the Supernova count, and keeps relics, the Codex and runes. Lifetime
 * Essence boosts shard gain. Its milestones take Supernova chores away one by one.
 */
const N = BALANCE.nebula;

/** Nova Shards gathered this Nebula run. */
export const runShards = (s: GameState): Decimal => s.totals.run.shards ?? ZERO;

export function nebulaGain(s: GameState): Decimal {
  if ((s.stats.nebulasAll ?? 0) === 0) return D(N.firstGain);
  return runShards(s).div(N.runShards).pow(N.gainPow).mul(stat(s, 'essenceGain')).floor();
}

export function nebulaReady(s: GameState): boolean {
  return (s.stats.supernovas ?? 0) >= N.supernovas && runShards(s).gte(N.runShards) && nebulaGain(s).gte(1);
}

/** Shards this run needed for one more Essence. */
export function nextEssenceAt(s: GameState): Decimal {
  const next = nebulaGain(s).add(1);
  return D(N.runShards).mul(next.div(stat(s, 'essenceGain')).pow(1 / N.gainPow));
}

export const novaFree = (s: GameState) => milestoneReached(s, 'nebula', 'novaFree');

/** Singularity milestone 10: a Nebula resets nothing (checked here so the Nebula layer needn't import the Singularity). */
const singularityNebulaFree = (s: GameState) => milestoneReached(s, 'singularity', 'nebulaFree');

/** The Nova Tree's root and the first node of each arm (kept with Remembered Spiral). */
const NOVA_CORE = ['root', 'forge.1', 'strike.1', 'dream.1'];

export function registerNebula(): void {
  defineStat({ id: 'essenceGain', label: 'Essence gain', base: () => D(1) });
  const glow = (s: GameState) => D(1).add(s.totals.all.essence ?? ZERO).pow(N.passivePow);
  registerSources(
    { id: 'essence.shards', stat: 'shardGain', op: 'mul', label: 'Nebula Essence (lifetime)', value: glow, active: (s) => (s.totals.all.essence ?? ZERO).gt(0) },
    { id: 'nebula.trickle', stat: 'passiveShards', op: 'add', label: 'Milestone: 10 Nebulas', value: () => D(N.trickle), active: novaFree },
  );

  registerLayer({
    id: 'nebula',
    name: 'Nebula',
    action: 'Go Nebula',
    currency: 'essence',
    color: '#1E8FA8',
    counter: 'nebulas',
    ready: nebulaReady,
    gain: nebulaGain,
    parts: [
      {
        id: 'stardustLayer',
        label: 'Everything a Supernova resets, and your Stellar Constants',
        keptBy: (s) => (singularityNebulaFree(s) ? 'Milestone: 10 Singularities' : null),
        reset: (s) => {
          for (const p of layer('supernova')?.parts ?? []) p.reset(s);
          for (const c of CONSTANTS) if (c.set === 'stellar') s.constants[c.id] = 0;
          s.totals.run.stardust = ZERO;
        },
      },
      {
        id: 'shards',
        label: 'Nova Shards',
        keptBy: (s) => (singularityNebulaFree(s) ? 'Milestone: 10 Singularities' : null),
        reset: (s) => {
          const keep = Math.min(0.9, nebulaFlag(s, 'keepShards'));
          s.currencies.shards = (s.currencies.shards ?? ZERO).mul(keep).floor();
          s.totals.run.shards = ZERO;
        },
      },
      {
        id: 'novaTree',
        label: 'The Nova Tree',
        reset: (s) => {
          const keep = nebulaFlag(s, 'keepNovaCore') > 0 ? NOVA_CORE : [];
          const kept: Record<string, number> = {};
          for (const id of keep) if (s.novaTree[id]) kept[id] = s.novaTree[id]!;
          s.novaTree = kept;
        },
        keptBy: (s) => (singularityNebulaFree(s) ? 'Milestone: 10 Singularities' : milestoneReached(s, 'nebula', 'keepTree') ? 'Milestone: 5 Nebulas' : null),
      },
      {
        id: 'supernovas',
        label: 'Your Supernova count (milestones are kept from the first Nebula)',
        keptBy: (s) => (singularityNebulaFree(s) ? 'Milestone: 10 Singularities' : null),
        reset: (s) => {
          s.stats.supernovas = Math.floor(nebulaFlag(s, 'startNovas'));
        },
      },
    ],
    alwaysKept: [
      'Nebula Essence, the Nebula Tree and Nebula Constants',
      'Relics, the Codex and runes',
      'The Belt, Deep Core, the Starforge and its alloys',
      'Comet Fusion, Attunements, the Merchant and starships',
      'Medals, Engine Mastery and your Starsmith Level',
      'Everything you have unlocked',
    ],
    milestones: [
      { at: 1, id: 'keepNova', text: 'Keep your Supernova milestones; the rune shrines open' },
      { at: 2, id: 'autoNova', text: 'Auto-Supernova when the gain reaches a number you set' },
      { at: 3, id: 'wyrms', text: 'Void Wyrms arrive' },
      { at: 5, id: 'keepTree', text: 'Keep the Nova Tree' },
      { at: 8, id: 'singularity', text: 'The Singularity appears: buy the Event Horizon key with Embers' },
      { at: 10, id: 'novaFree', text: 'Supernova resets nothing; 1/50 of its gain trickles in every second' },
    ],
    // a Singularity keeps Nebula milestones from its first one (Singularity milestone 1)
    milestoneFloor: (s) => (milestoneReached(s, 'singularity', 'keepNebula') ? (s.stats.nebulasBest ?? 0) : 0),
    onReset: (s) => {
      // from 10 Singularities a Nebula keeps everything, but this run's shards still start over
      // (or an auto-Nebula would pay again for the same shards every tick)
      s.totals.run.shards = ZERO;
      s.stats.nebulasAll = (s.stats.nebulasAll ?? 0) + 1;
      s.stats.nebulasBest = Math.max(s.stats.nebulasBest ?? 0, s.stats.nebulas ?? 0);
    },
  });

  // Milestone 2: Supernova by itself once the gain reaches your number
  registerSystem({
    id: 'nebula.autoNova',
    order: 61,
    tick: (s: GameState) => {
      if (!milestoneReached(s, 'nebula', 'autoNova') || s.nebula.autoAt.lte(0)) return;
      // never cut a Trial short: wait until its goal is met (the Supernova then finishes it)
      if (inTrial(s) && !goalMet(s)) return;
      if (supernovaReady(s) && supernovaGain(s).gte(s.nebula.autoAt)) performReset(s, 'supernova');
    },
  });
}
