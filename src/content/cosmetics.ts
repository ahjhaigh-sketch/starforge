import type { Requirement } from './requirements';

/**
 * The Wardrobe (Ideas menu 4): star skins, cursor trails and backgrounds, every one earned in play
 * (never bought: CLAUDE.md rule 15). Unlocks are worked out from medals and stats each time, never
 * stored, so a reset can't take one away. IDs never change.
 */

export interface SkinDef {
  id: string;
  name: string;
  desc: string;
  req: Requirement;
  /** The star shader's skin mode: 0 colours only, 1 pixel, 2 candy stripes, 3 prism. */
  mode: number;
  /** Colours in place of the tier's (Classic keeps the tier's own). */
  palette?: { hot: string; body: string; corona: string };
}

export const SKINS: readonly SkinDef[] = [
  { id: 'classic', name: 'Classic', desc: 'Your star as it is: it changes with every Star Tier.', req: { kind: 'none' }, mode: 0 },
  { id: 'blacksun', name: 'Black Sun', desc: 'A star that drinks the light, ringed in white fire.', req: { kind: 'count', stat: 'bhStageBest', count: 8, noun: 'Black Hole stage' }, mode: 0, palette: { hot: '#6B4BC8', body: '#120A24', corona: '#FFF6E0' } },
  { id: 'ember', name: 'Ember Star', desc: 'Banked coals from the Starforge.', req: { kind: 'count', stat: 'smelts', count: 1000, noun: 'smelt' }, mode: 0, palette: { hot: '#FFD27A', body: '#C8341A', corona: '#FF7A2E' } },
  { id: 'frost', name: 'Frost Star', desc: 'Cold as the Kuiper Drift.', req: { kind: 'count', stat: 'elements', count: 26, noun: 'element' }, mode: 0, palette: { hot: '#FFFFFF', body: '#5FB8E8', corona: '#BDF6FF' } },
  { id: 'candy', name: 'Candy Star', desc: 'Swirled like a sweet. A treat for finishing quests.', req: { kind: 'count', stat: 'questsDone', count: 50, noun: 'quest' }, mode: 2, palette: { hot: '#FFFFFF', body: '#FF6FB5', corona: '#FFC8E6' } },
  { id: 'pixel', name: 'Pixel Star', desc: 'Eight-bit and proud of it.', req: { kind: 'count', stat: 'taps', count: 1_000_000, noun: 'tap' }, mode: 1, palette: { hot: '#FFF3A0', body: '#FFB020', corona: '#FFE070' } },
  { id: 'prism', name: 'Prism Star', desc: 'Every colour of every universe.', req: { kind: 'count', stat: 'multiversesAll', count: 1, noun: 'Multiverse' }, mode: 3, palette: { hot: '#FFFFFF', body: '#B06BFF', corona: '#FFFFFF' } },
];

export interface TrailDef {
  id: string;
  name: string;
  req: Requirement;
  /** Mote colours, cycled; empty for none. */
  colors: readonly number[];
}

export const TRAILS: readonly TrailDef[] = [
  { id: 'none', name: 'No trail', req: { kind: 'none' }, colors: [] },
  { id: 'stardust', name: 'Stardust', req: { kind: 'medals', count: 5 }, colors: [0xffc83d, 0xffe9a8] },
  { id: 'comet', name: 'Comet', req: { kind: 'count', stat: 'comets', count: 100, noun: 'comet' }, colors: [0x2ee6ff, 0xffffff] },
  { id: 'rainbow', name: 'Rainbow', req: { kind: 'count', stat: 'supernovasAll', count: 30, noun: 'Supernova' }, colors: [0xff4fc1, 0xffc83d, 0x7dff5a, 0x2ee6ff, 0xb06bff] },
  { id: 'void', name: 'Void', req: { kind: 'count', stat: 'singularitiesAll', count: 1, noun: 'Singularity' }, colors: [0x6b4bc8, 0x9b7cff, 0x2a1060] },
];

export interface BackgroundDef {
  id: string;
  name: string;
  req: Requirement;
  /** Nebula cloud tints in the sky. */
  clouds: readonly number[];
  /** A swatch for the Wardrobe card. */
  swatch: string;
}

export const BACKGROUNDS: readonly BackgroundDef[] = [
  { id: 'violet', name: 'Deep Violet', req: { kind: 'none' }, clouds: [0x2ee6ff, 0x1e8fa8, 0x7b3fd6, 0x2ee6ff, 0x5fd3c4, 0x9b7cff], swatch: '#140A3A' },
  { id: 'emerald', name: 'Emerald Nebula', req: { kind: 'count', stat: 'nebulasAll', count: 1, noun: 'Nebula' }, clouds: [0x3ee08a, 0x1e8f6a, 0x7dff5a, 0x2ec4a8], swatch: '#0A2A22' },
  { id: 'crimson', name: 'Crimson Rift', req: { kind: 'count', stat: 'crunchesAll', count: 1, noun: 'Big Crunch' }, clouds: [0xff4f6e, 0xc8341a, 0xff7a2e, 0x9b2a5a], swatch: '#2A0A16' },
  { id: 'midnight', name: 'Midnight Blue', req: { kind: 'count', stat: 'galacticsAll', count: 1, noun: 'Galactic Rebirth' }, clouds: [0x2b7fd0, 0x1a3a8a, 0x5fa8ff, 0x2ee6ff], swatch: '#06122E' },
  { id: 'dawn', name: 'Golden Dawn', req: { kind: 'medals', count: 50 }, clouds: [0xffc83d, 0xff9a3d, 0xffe9a8, 0xff6fb5], swatch: '#2A1A0A' },
];

export const SKIN_BY_ID: ReadonlyMap<string, SkinDef> = new Map(SKINS.map((x) => [x.id, x]));
export const TRAIL_BY_ID: ReadonlyMap<string, TrailDef> = new Map(TRAILS.map((x) => [x.id, x]));
export const BACKGROUND_BY_ID: ReadonlyMap<string, BackgroundDef> = new Map(BACKGROUNDS.map((x) => [x.id, x]));
