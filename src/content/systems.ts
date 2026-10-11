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
  { id: 'index', name: 'Index', icon: 'book', color: '#B08A1A', rail: 'right', req: { kind: 'count', stat: 'nebulasAll', count: 1, noun: 'Nebula' }, panel: 'index', built: true, blurb: 'A collection book of everything you find, with a bonus for each page.' },
  { id: 'starring', name: 'Stars', icon: 'starrank', color: '#C99A1E', rail: 'right', req: { kind: 'count', stat: 'nebulasAll', count: 2, noun: 'Nebula' }, panel: 'starring', built: true, blurb: 'Sacrifice runes to give a shrine stars; craft the rune you want.' },
  { id: 'mutations', name: 'Mutations', icon: 'mutation', color: '#C23FA0', rail: 'right', req: { kind: 'count', stat: 'nebulasAll', count: 3, noun: 'Nebula' }, panel: 'mutations', built: true, blurb: 'Golden, Rainbow, Void and Prismatic runes and asteroids.' },
  { id: 'auras', name: 'Auras', icon: 'aura', color: '#1A9DB8', rail: 'right', req: { kind: 'count', stat: 'nebulasAll', count: 4, noun: 'Nebula' }, panel: 'auras', built: true, blurb: 'Roll Aura Dice and wear one Celestial Aura.' },
  { id: 'wyrms', name: 'Wyrms', icon: 'wyrm', color: '#2E9C78', rail: 'right', req: { kind: 'count', stat: 'nebulasAll', count: 3, noun: 'Nebula' }, panel: 'wyrms', built: true, blurb: 'Hatch, train and fuse Void Wyrms.' },
  { id: 'nursery', name: 'Nursery', icon: 'nursery', color: '#C23FA0', rail: 'right', req: { kind: 'count', stat: 'nebulasAll', count: 4, noun: 'Nebula' }, panel: 'nursery', built: true, blurb: 'Grow and crossbreed 25 kinds of star.' },
  { id: 'spectral', name: 'Spectral', icon: 'prism', color: '#B06BFF', rail: 'right', req: { kind: 'count', stat: 'nebulasAll', count: 5, noun: 'Nebula' }, panel: 'spectral', built: true, blurb: "Focus the nebula's seven colours for a bonus at every order of magnitude." },
  { id: 'tarot', name: 'Tarot', icon: 'card', color: '#FF4F6E', rail: 'right', req: { kind: 'count', stat: 'nebulasAll', count: 6, noun: 'Nebula' }, panel: 'tarot', built: true, blurb: 'Collect 60 cards; where they sit in your deck matters.' },
  { id: 'singularity', name: 'Singularity', icon: 'darkmatter', color: '#6E5CC4', rail: 'right', req: { kind: 'count', stat: 'nebulasAll', count: 8, noun: 'Nebula' }, panel: 'singularity', built: true, blurb: 'The third reset layer: fall in for Dark Matter.' },
  { id: 'singularitytree', name: 'Sing. Tree', icon: 'tree', color: '#6E5CC4', rail: 'right', req: { kind: 'count', stat: 'singularitiesAll', count: 1, noun: 'Singularity' }, panel: 'singularitytree', built: true, blurb: 'Spend Dark Matter on 100 nodes in rings round the disk.' },
  { id: 'blackhole', name: 'Black Hole', icon: 'blackhole', color: '#3A2470', rail: 'right', req: { kind: 'count', stat: 'singularitiesAll', count: 1, noun: 'Singularity' }, panel: 'blackhole', built: true, blurb: 'Feed it; its mass passes 8 colour stages and speeds up the game.' },
  { id: 'reactor', name: 'Reactor', icon: 'reactor', color: '#FF4F6E', rail: 'right', req: { kind: 'count', stat: 'singularitiesAll', count: 5, noun: 'Singularity' }, panel: 'reactor', built: true, blurb: 'Feed Dark Matter in for more Dark Matter later.' },
  { id: 'prismwheel', name: 'Prism Wheel', icon: 'wheel', color: '#FF4FC1', rail: 'right', req: { kind: 'count', stat: 'bhStageBest', count: 8, noun: 'Black Hole stage' }, panel: 'prismwheel', built: true, blurb: 'Split Dark Matter into eight boosts on a wheel you drag.' },
  { id: 'trials', name: 'Trials', icon: 'trial', color: '#C23F6A', rail: 'right', req: { kind: 'count', stat: 'singularitiesAll', count: 2, noun: 'Singularity' }, panel: 'trials', built: true, blurb: '20 optional restricted runs, each with levels and a reward for good.' },
  { id: 'spire', name: 'Spire', icon: 'spire', color: '#8C97C2', rail: 'right', req: { kind: 'count', stat: 'singularitiesAll', count: 3, noun: 'Singularity' }, panel: 'spire', built: true, blurb: 'Climb an endless tower; every floor is a little harder and pays for good.' },
  { id: 'leviathans', name: 'Leviathans', icon: 'leviathan', color: '#2B7FD0', rail: 'right', req: { kind: 'count', stat: 'singularitiesAll', count: 4, noun: 'Singularity' }, panel: 'leviathans', built: true, blurb: 'Wear down 12 Void Leviathans with taps, Wyrms and output.' },
  { id: 'scaletree', name: 'Scale Tree', icon: 'scale', color: '#1A9DB8', rail: 'right', req: { kind: 'count', stat: 'leviathanKills', count: 1, noun: 'Leviathan kill' }, panel: 'scaletree', built: true, blurb: 'Spend Leviathan scales on a small tree of big boosts.' },
  { id: 'wormholes', name: 'Wormholes', icon: 'wormhole', color: '#5B45C2', rail: 'right', req: { kind: 'count', stat: 'singularitiesAll', count: 6, noun: 'Singularity' }, panel: 'wormholes', built: true, blurb: 'Link systems on a map so one feeds another.' },
  { id: 'mirror', name: 'Mirror', icon: 'antimatter', color: '#2A6F8F', rail: 'right', req: { kind: 'count', stat: 'singularitiesAll', count: 8, noun: 'Singularity' }, panel: 'mirror', built: true, blurb: 'An inverted Stardust layer with 10 Antimatter engines; its last upgrade is the key to the Galaxy.' },
  { id: 'galactic', name: 'Galactic', icon: 'galaxy', color: '#3F7A12', rail: 'right', req: { kind: 'count', stat: 'mirrorKey', count: 1, noun: 'Mirror Key' }, panel: 'galactic', built: true, blurb: 'The fourth reset: trade the Singularity layer for Galaxy Cores.' },
  { id: 'galaxymap', name: 'Galaxies', icon: 'galaxy', color: '#2B7FD0', rail: 'right', req: { kind: 'count', stat: 'mirrorKey', count: 1, noun: 'Mirror Key' }, panel: 'galaxymap', built: true, blurb: '20 galaxies, each with a rule, a goal and a reward for good.' },
  { id: 'galactictree', name: 'Galactic Tree', icon: 'tree', color: '#3F7A12', rail: 'right', req: { kind: 'count', stat: 'galacticsAll', count: 1, noun: 'Galactic Rebirth' }, panel: 'galactictree', built: true, blurb: '200 nodes on five spiral arms, one per way to play.' },
  { id: 'observatory', name: 'Observatory', icon: 'telescope', color: '#5B45C2', rail: 'right', req: { kind: 'count', stat: 'galacticsAll', count: 1, noun: 'Galactic Rebirth' }, panel: 'observatory', built: true, blurb: 'Draw constellations across a new sky each run.' },
  { id: 'megastructures', name: 'Megastructures', icon: 'mega', color: '#B08A1A', rail: 'right', req: { kind: 'count', stat: 'galacticsAll', count: 1, noun: 'Galactic Rebirth' }, panel: 'megastructures', built: true, blurb: 'Six huge builds fed by every currency; every stage is yours for good.' },
  { id: 'colonies', name: 'Colonies', icon: 'colony', color: '#2B7FD0', rail: 'right', req: { kind: 'count', stat: 'galacticsAll', count: 2, noun: 'Galactic Rebirth' }, panel: 'colonies', built: true, blurb: 'Settle planets: people grow, build, trade and research.' },
  { id: 'terraform', name: 'Terraform', icon: 'terraform', color: '#3E9E2A', rail: 'right', req: { kind: 'count', stat: 'coloniesFounded', count: 1, noun: 'colony' }, panel: 'terraform', built: true, blurb: 'Lay out biomes on a hex planet; a finished planet is a multiplier for good.' },
  { id: 'starchart', name: 'Star Chart', icon: 'telescope', color: '#7B3FD6', rail: 'right', req: { kind: 'count', stat: 'galacticsAll', count: 1, noun: 'Galactic Rebirth' }, panel: 'starchart', built: true, blurb: 'Spend Star Charts from the Observatory on a small tree.' },
  { id: 'bigcrunch', name: 'Big Crunch', icon: 'crunch', color: '#C2561A', rail: 'right', req: { kind: 'count', stat: 'galacticsAll', count: 7, noun: 'Galactic Rebirth' }, panel: 'bigcrunch', built: true, blurb: 'The fifth reset: explore 7 galaxies, then collapse the universe for Chronons.' },
  { id: 'eternity', name: 'Eternity', icon: 'eternity', color: '#B85A1A', rail: 'right', req: { kind: 'count', stat: 'crunchesAll', count: 1, noun: 'Big Crunch' }, panel: 'eternity', built: true, blurb: 'Spend Chronons on upgrades that run whole layers for you.' },
  { id: 'echoes', name: 'Echo Boards', icon: 'echo', color: '#B08A1A', rail: 'right', req: { kind: 'count', stat: 'crunchesAll', count: 1, noun: 'Big Crunch' }, panel: 'echoes', built: true, blurb: 'The first three layers replayed small; their echoes boost the real game.' },
  { id: 'multiverse', name: 'Multiverse', icon: 'multiverse', color: '#7B3FD6', rail: 'right', req: { kind: 'count', stat: 'crunchesAll', count: 8, noun: 'Big Crunch' }, panel: 'multiverse', built: true, blurb: 'The sixth and last reset: 10 Big Crunches for 6 Sparks, then Omni Constants.' },
  { id: 'universeforge', name: 'Universe Forge', icon: 'universe', color: '#B23A8E', rail: 'right', req: { kind: 'count', stat: 'crunchesAll', count: 8, noun: 'Big Crunch' }, panel: 'universeforge', built: true, blurb: 'Pick the rules of the next universe: each makes it harder and pays more Sparks.' },
  { id: 'sparktree', name: 'Spark Choices', icon: 'spark', color: '#5A2A8C', rail: 'right', req: { kind: 'count', stat: 'multiversesAll', count: 1, noun: 'Multiverse' }, panel: 'sparktree', built: true, blurb: '114 choices at 0.2 Sparks each, in any order: keep layers, automate them, boost them.' },
];

export const SYSTEM_BY_ID: ReadonlyMap<string, SystemDef> = new Map(SYSTEMS.map((x) => [x.id, x]));
