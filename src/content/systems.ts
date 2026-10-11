/**
 * Every system the teaser rails (and later the Ascent map) show, in the order the player meets
 * them. A system appears on its rail long before it unlocks, showing what unlocks it and a
 * progress ring. Requirements are always amounts, never timers. IDs never change.
 */
import type { Requirement } from './requirements';

export type { Requirement };

export interface SystemDef {
  id: string;
  name: string;
  icon: string;
  /** Button colour when unlocked. */
  color: string;
  /** Left rail: this stage's systems. Right stack: upcoming shops and layers. */
  rail: 'left' | 'right';
  req: Requirement;
  /** The panel it opens. Systems not built yet show their requirement and "arrives in a later update". */
  panel?: string;
  built: boolean;
  blurb: string;
}

export const SYSTEMS: readonly SystemDef[] = [
  // ---- left rail: the Stardust stage ----
  { id: 'ascent', name: 'Ascent', icon: 'ascent', color: '#4C3BC4', rail: 'left', req: { kind: 'none' }, panel: 'ascent', built: true, blurb: 'Every system in the game on one star map, with what each needs.' },
  { id: 'upgrades', name: 'Upgrades', icon: 'upgrade', color: '#2E9C78', rail: 'left', req: { kind: 'engine', id: 'catcher', count: 1 }, panel: 'upgrades', built: true, blurb: 'One-off boosts for taps and engines.' },
  { id: 'medals', name: 'Medals', icon: 'trophy', color: '#C99A1E', rail: 'left', req: { kind: 'engine', id: 'mote', count: 1 }, panel: 'medals', built: true, blurb: 'Achievements and Goals, each a permanent boost.' },
  { id: 'stats', name: 'Stats', icon: 'stats', color: '#4A6FC4', rail: 'left', req: { kind: 'engine', id: 'mote', count: 5 }, panel: 'stats', built: true, blurb: 'Where every multiplier comes from.' },
  { id: 'belt', name: 'Belt', icon: 'belt', color: '#6E7BAE', rail: 'left', req: { kind: 'tier', tier: 1 }, panel: 'belt', built: true, blurb: 'Sweep a tractor beam through drifting asteroids for ore.' },
  { id: 'level', name: 'Level', icon: 'level', color: '#2E8FD0', rail: 'left', req: { kind: 'tier', tier: 1 }, panel: 'level', built: true, blurb: 'Starsmith Level: XP from everything, perk points to spend.' },
  { id: 'constants', name: 'Constants', icon: 'constants', color: '#7B3FD6', rail: 'left', req: { kind: 'tier', tier: 2 }, panel: 'constants', built: true, blurb: 'Infinite upgrades: Gravity, Light and Heat.' },
  { id: 'quests', name: 'Quests', icon: 'quests', color: '#C2561E', rail: 'left', req: { kind: 'tier', tier: 2 }, panel: 'quests', built: true, blurb: 'Three goals at a time, each with a reward.' },
  { id: 'orbitals', name: 'Orbitals', icon: 'orbit', color: '#1A9DB8', rail: 'left', req: { kind: 'tier', tier: 3 }, panel: 'orbitals', built: true, blurb: 'Planets in rings around your star.' },
  { id: 'mastery', name: 'Mastery', icon: 'mastery', color: '#B23A8E', rail: 'left', req: { kind: 'tier', tier: 4 }, panel: 'mastery', built: true, blurb: 'Ranks for every engine, kept through every reset.' },
  // ---- right stack: upcoming shops and layers ----
  { id: 'novatree', name: 'Nova Tree', icon: 'tree', color: '#C23FA0', rail: 'right', req: { kind: 'count', stat: 'supernovas', count: 1, noun: 'Supernova' }, panel: 'novatree', built: true, blurb: 'Spend Nova Shards on an 80-node spiral.' },
  { id: 'automation', name: 'Automation', icon: 'auto', color: '#4A4F7A', rail: 'right', req: { kind: 'count', stat: 'supernovas', count: 2, noun: 'Supernova' }, panel: 'automation', built: true, blurb: 'Every auto-buyer you earn, in one place.' },
  { id: 'starforge', name: 'Starforge', icon: 'forge', color: '#8A5CD8', rail: 'right', req: { kind: 'count', stat: 'supernovas', count: 3, noun: 'Supernova' }, panel: 'starforge', built: true, blurb: 'Smelt ore into alloy, forge relics, fill the Codex.' },
  { id: 'drill', name: 'Deep Core', icon: 'drill', color: '#C2561E', rail: 'right', req: { kind: 'count', stat: 'supernovas', count: 5, noun: 'Supernova' }, panel: 'drill', built: true, blurb: 'Drill giant asteroids layer by layer.' },
  { id: 'fusion', name: 'Fusion', icon: 'comet', color: '#1A9DB8', rail: 'right', req: { kind: 'count', stat: 'supernovas', count: 6, noun: 'Supernova' }, panel: 'fusion', built: true, blurb: 'Merge three comets into a stronger one.' },
  { id: 'attune', name: 'Attune', icon: 'pulse', color: '#C23F6A', rail: 'right', req: { kind: 'count', stat: 'supernovas', count: 8, noun: 'Supernova' }, panel: 'attune', built: true, blurb: 'Change how tapping works.' },
  { id: 'merchant', name: 'Merchant', icon: 'merchant', color: '#B08A1A', rail: 'right', req: { kind: 'count', stat: 'supernovas', count: 10, noun: 'Supernova' }, panel: 'merchant', built: true, blurb: 'A trader ship with four deals.' },
  { id: 'expeditions', name: 'Ships', icon: 'ship', color: '#2B7FD0', rail: 'right', req: { kind: 'count', stat: 'supernovas', count: 15, noun: 'Supernova' }, panel: 'expeditions', built: true, blurb: 'Send starships to far sectors for loot.' },
  { id: 'nebula', name: 'Nebula', icon: 'nebula', color: '#1E8FA8', rail: 'right', req: { kind: 'count', stat: 'supernovas', count: 30, noun: 'Supernova' }, panel: 'nebula', built: true, blurb: 'The second reset layer.' },
  { id: 'nebulatree', name: 'Nebula Tree', icon: 'tree', color: '#1E8FA8', rail: 'right', req: { kind: 'count', stat: 'nebulasAll', count: 1, noun: 'Nebula' }, panel: 'nebulatree', built: true, blurb: 'Spend Nebula Essence on a 100-node cloud.' },
  { id: 'runes', name: 'Runes', icon: 'rune', color: '#7B3FD6', rail: 'right', req: { kind: 'count', stat: 'nebulasAll', count: 1, noun: 'Nebula' }, panel: 'runes', built: true, blurb: 'Roll Constellation Runes at eight shrines.' },
  { id: 'wyrms', name: 'Wyrms', icon: 'wyrm', color: '#2E9C78', rail: 'right', req: { kind: 'count', stat: 'nebulasAll', count: 3, noun: 'Nebula' }, built: false, blurb: 'Hatch, train and fuse Void Wyrms.' },
];

export const SYSTEM_BY_ID: ReadonlyMap<string, SystemDef> = new Map(SYSTEMS.map((x) => [x.id, x]));
