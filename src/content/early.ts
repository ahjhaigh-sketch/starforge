/**
 * Three more early systems (Game design: "More early systems"): Engine Mastery, Star Quests and
 * Orbitals. Their tunable numbers live in balance.ts; this file names them and holds the planet table.
 */

import { BALANCE } from './balance';

/** Engine Mastery: ranks from how many of an engine you have EVER bought. Kept through every reset. */
export const MASTERY_RANKS = BALANCE.mastery.ranks;
export const MASTERY_MULT = BALANCE.mastery.mult;
export const MASTERY_TIER = BALANCE.mastery.tier;

/**
 * Star Quests: a board of 3 short goals that refill the moment one is claimed. Each is scaled to
 * your progress when it appears and measured from that moment, so it is always within reach.
 */
export type QuestKind = 'taps' | 'engines' | 'comets' | 'stardust' | 'crits' | 'own' | 'upgrades' | 'evolve';

export interface QuestTemplate {
  kind: QuestKind;
  /** How likely this kind is to be drawn. */
  weight: number;
}

export const QUEST_TEMPLATES: readonly QuestTemplate[] = [
  { kind: 'taps', weight: 3 },
  { kind: 'engines', weight: 3 },
  { kind: 'stardust', weight: 3 },
  { kind: 'own', weight: 3 },
  { kind: 'comets', weight: 2 },
  { kind: 'crits', weight: 1 },
  { kind: 'upgrades', weight: 1 },
  { kind: 'evolve', weight: 1 },
];

/** Orbitals: planets in rings around the star. */
export const QUESTS = BALANCE.quests;
export const ORBITALS = BALANCE.orbitals;

export interface PlanetType {
  id: string;
  name: string;
  color: string;
  band: string;
  /** Engines this planet boosts. */
  engines: readonly string[];
}

export const PLANET_TYPES: readonly PlanetType[] = [
  { id: 'rocky', name: 'Rocky', color: '#B07A52', band: '#8A5A3A', engines: ['moonmill', 'drill', 'foundry', 'press', 'wellpump', 'kiln'] },
  { id: 'gas', name: 'Gas giant', color: '#E0A86A', band: '#C0784A', engines: ['siphon', 'sail', 'bellows', 'reef', 'spinner', 'wormtap'] },
  { id: 'ice', name: 'Ice', color: '#9FE7FF', band: '#5FB8E0', engines: ['catcher', 'turbine', 'mote', 'hatchery', 'crystal', 'reservoir'] },
  { id: 'lava', name: 'Lava', color: '#FF6A3D', band: '#B0301E', engines: ['dyson', 'quasar', 'lantern', 'crown', 'novaforge', 'magnetar'] },
  { id: 'crystal', name: 'Crystal', color: '#C9A0FF', band: '#8A5CD8', engines: ['pulsar', 'choir', 'loom', 'harp', 'dmmill', 'infinity'] },
];
