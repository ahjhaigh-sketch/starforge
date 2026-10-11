/**
 * The Supernova stage's extras (Game design: "More mid-early systems"): Comet Fusion, Star Pulse
 * Attunements, the Wandering Merchant and Starship Expeditions. Tunable numbers live in balance.ts;
 * this file holds the tables. IDs never change.
 */

export type AttuneId = 'pulse' | 'heartbeat' | 'chaos' | 'lens';

export const ATTUNEMENTS: ReadonlyArray<{ id: AttuneId; name: string; icon: string; desc: string; skill: string }> = [
  { id: 'pulse', name: 'Pulse', icon: 'pulse', desc: 'The star answers only on the beat. Your timing rating (x2 good, x5 great, x25 perfect) becomes tap power; off-beat taps give nothing.', skill: 'Tap once a beat, right on the ring.' },
  { id: 'heartbeat', name: 'Heartbeat', icon: 'level', desc: 'Taps fill a heart meter that drains over time. A fuller meter multiplies production, up to x4, but at 100 it overloads back to zero.', skill: 'Keep the meter high without topping it out.' },
  { id: 'chaos', name: 'Chaos Die', icon: 'mystery', desc: 'Every 20 taps the die rolls one of six effects for 15 seconds.', skill: 'Keep tapping to roll it often.' },
  { id: 'lens', name: 'Gravity Lens', icon: 'quasar', desc: 'Taps are x6 stronger, but the star takes at most 4 taps a second.', skill: 'Tap steadily at four a second.' },
];

export type ChaosId = 'taps' | 'prod' | 'crit' | 'comet' | 'burst' | 'xp';

/** What the Chaos Die can roll (each 1 in 6). */
export const CHAOS_EFFECTS: ReadonlyArray<{ id: ChaosId; name: string; desc: string }> = [
  { id: 'taps', name: 'Heavy Hands', desc: 'Taps x10' },
  { id: 'prod', name: 'Overdrive', desc: 'Production x3' },
  { id: 'crit', name: 'Sharp Eye', desc: 'Crit chance +50%' },
  { id: 'comet', name: 'Comet Call', desc: 'A comet arrives now' },
  { id: 'burst', name: 'Windfall', desc: '60 seconds of production at once' },
  { id: 'xp', name: 'Insight', desc: 'Starsmith XP x3' },
];

/** Merchant deal kinds: what you pay and what you get, sized from your economy when the deal appears. */
export type DealKind = 'shards' | 'ore' | 'alloy' | 'relic' | 'codex' | 'xp' | 'frenzy';

/** Where starships go. Farther sectors take longer and pay more per hour. Requirements are Star Tiers (best ever). */
export interface SectorDef {
  id: string;
  name: string;
  /** Distance units: seconds at speed 1. */
  distance: number;
  /** Best Star Tier needed to chart it. */
  tier: number;
  /** Loot multiplier relative to the first sector. */
  loot: number;
  /** The alloy grade it brings home. */
  grade: 'iron' | 'gold' | 'crystal' | 'prismatic' | 'void';
  color: string;
}

export const SECTORS: readonly SectorDef[] = [
  { id: 'kuiper', name: 'Kuiper Drift', distance: 600, tier: 3, loot: 1, grade: 'iron', color: '#8C97C2' },
  { id: 'ember', name: 'Ember Reach', distance: 1800, tier: 4, loot: 3.6, grade: 'gold', color: '#FF7A2E' },
  { id: 'crystal', name: 'Crystal Verge', distance: 5400, tier: 6, loot: 13, grade: 'crystal', color: '#9FE7FF' },
  { id: 'prism', name: 'Prism Gate', distance: 16_200, tier: 8, loot: 47, grade: 'prismatic', color: '#FF9EF0' },
  { id: 'hollows', name: 'Void Hollows', distance: 48_600, tier: 10, loot: 170, grade: 'void', color: '#9B7CFF' },
  { id: 'rim', name: 'Galactic Rim', distance: 145_800, tier: 11, loot: 610, grade: 'void', color: '#2EE6FF' },
];

export const SECTOR_BY_ID: ReadonlyMap<string, SectorDef> = new Map(SECTORS.map((x) => [x.id, x]));

/** Fusion comet colours by level (cycling past the end). */
export const FUSION_COLORS = ['#8C97C2', '#4FB6FF', '#5FD39B', '#FFC83D', '#FF7A2E', '#FF4FC1', '#B06BFF', '#2EE6FF', '#FFFFFF', '#C2D63A'];
