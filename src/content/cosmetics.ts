import type { Requirement } from './requirements';

const c = (stat: string, count: number, noun: string): Requirement => ({ kind: 'count', stat, count, noun });

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
  // 1.2.0
  { id: 'mint', name: 'Mint Star', desc: 'Cool and fresh, for a run of errands well done.', req: c('questsDone', 10, 'quest'), mode: 0, palette: { hot: '#F2FFF8', body: '#5FE0B0', corona: '#C8FFE6' } },
  { id: 'rose', name: 'Rose Star', desc: 'Petal pink with a soft glow.', req: { kind: 'medals', count: 75 }, mode: 0, palette: { hot: '#FFF0F6', body: '#FF6FA8', corona: '#FFB3D1' } },
  { id: 'ocean', name: 'Deep Ocean', desc: 'The blue of far water, brought home by your ships.', req: c('trips', 50, 'trip'), mode: 0, palette: { hot: '#DFF8FF', body: '#1E7FD0', corona: '#5FD3FF' } },
  { id: 'solar', name: 'Solar Flare', desc: 'Hot orange, straight from the weather.', req: c('weathers', 25, 'weather'), mode: 0, palette: { hot: '#FFFFFF', body: '#FF9A1E', corona: '#FFE070' } },
  { id: 'aurora', name: 'Aurora Star', desc: 'Green and blue curtains of light.', req: c('nebulasAll', 5, 'Nebula'), mode: 0, palette: { hot: '#E8FFF6', body: '#3EE08A', corona: '#7DE3FF' } },
  { id: 'neon', name: 'Neon Swirl', desc: 'Cyan and pink, spinning like a sign.', req: c('maxCombo', 150, 'combo'), mode: 2, palette: { hot: '#FFFFFF', body: '#2EE6FF', corona: '#FF4FC1' } },
  { id: 'gilded', name: 'Gilded Star', desc: 'Solid gold, for a hoard beyond counting.', req: { kind: 'total', currency: 'stardust', amount: 1e30 }, mode: 0, palette: { hot: '#FFFDF0', body: '#E8B020', corona: '#FFE9A8' } },
  { id: 'toxic', name: 'Toxic Star', desc: 'A strange green from strange matter.', req: c('mutationsFound', 10, 'mutation'), mode: 0, palette: { hot: '#F4FFD0', body: '#8BE02E', corona: '#D8FF5A' } },
  { id: 'ghost', name: 'Ghost Star', desc: 'Pale and quiet, like a Wyrm in the dark.', req: c('wyrmsHatched', 10, 'Wyrm hatched'), mode: 0, palette: { hot: '#FFFFFF', body: '#B8C2E8', corona: '#E8EEFF' } },
  { id: 'lava', name: 'Lava Star', desc: 'Molten rock from the Deep Core.', req: c('cores', 10, 'core'), mode: 0, palette: { hot: '#FFE07A', body: '#E0401A', corona: '#FF7A2E' } },
  { id: 'amethyst', name: 'Amethyst', desc: 'A violet gem, haloed.', req: c('aurasFound', 5, 'aura'), mode: 0, palette: { hot: '#F6EEFF', body: '#8A4FE0', corona: '#C8A8FF' } },
  { id: 'retro', name: 'Retro Pixel', desc: 'Pixel art in arcade blue.', req: c('perfects', 100, 'perfect tap'), mode: 1, palette: { hot: '#E8FFFF', body: '#2EB8FF', corona: '#9AF0FF' } },
  { id: 'galaxy', name: 'Galaxy Star', desc: 'A whole galaxy of colour in one star.', req: c('galacticsAll', 5, 'Galactic Rebirth'), mode: 3, palette: { hot: '#FFFFFF', body: '#4F6BFF', corona: '#FF9BEA' } },
  { id: 'sunset', name: 'Sunset Swirl', desc: 'Orange and peach, stirred like a potion.', req: c('elixirsDrunk', 10, 'elixir'), mode: 2, palette: { hot: '#FFF6D0', body: '#FF6F3D', corona: '#FFB86B' } },
  { id: 'eclipse', name: 'Eclipse', desc: 'A dark disc in a golden ring.', req: c('crunchesAll', 3, 'Big Crunch'), mode: 0, palette: { hot: '#FFF0C8', body: '#1A1030', corona: '#FFC83D' } },
  { id: 'jade', name: 'Jade Star', desc: 'Polished green stone.', req: c('recipesFound', 6, 'recipe'), mode: 0, palette: { hot: '#F0FFF4', body: '#2E9C6A', corona: '#9AF0C0' } },
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
  // 1.2.0
  { id: 'ember', name: 'Embers', req: c('smelts', 100, 'smelt'), colors: [0xff7a2e, 0xffd27a, 0xc8341a] },
  { id: 'frost', name: 'Frost', req: c('elements', 26, 'element'), colors: [0xbdf6ff, 0xffffff, 0x5fb8e8] },
  { id: 'gold', name: 'Gold Dust', req: { kind: 'total', currency: 'stardust', amount: 1e20 }, colors: [0xffe9a8, 0xffc83d, 0xfff6d0] },
  { id: 'leaf', name: 'Leaves', req: c('nurseryHarvests', 10, 'harvest'), colors: [0x7dff5a, 0x3ee08a, 0xc8ffe6] },
  { id: 'candy', name: 'Candy', req: c('questsDone', 25, 'quest'), colors: [0xff6fb5, 0xffffff, 0x9be8ff] },
  { id: 'aurora', name: 'Aurora', req: c('nebulasAll', 3, 'Nebula'), colors: [0x3ee08a, 0x2ee6ff, 0x9b7cff] },
  { id: 'sunset', name: 'Sunset', req: c('weathers', 10, 'weather'), colors: [0xff6f3d, 0xffb86b, 0xff4fc1] },
  { id: 'neon', name: 'Neon', req: c('maxCombo', 100, 'combo'), colors: [0x2ee6ff, 0xff4fc1, 0x7dff5a] },
  { id: 'royal', name: 'Royal', req: { kind: 'medals', count: 100 }, colors: [0x9b7cff, 0xffc83d] },
  { id: 'ocean', name: 'Ocean Spray', req: c('trips', 25, 'trip'), colors: [0x1e7fd0, 0x5fd3ff, 0xffffff] },
  { id: 'ghost', name: 'Ghostly', req: c('wyrmsHatched', 5, 'Wyrm hatched'), colors: [0xe8eeff, 0xb8c2e8] },
  { id: 'galaxy', name: 'Galaxy', req: c('galacticsAll', 3, 'Galactic Rebirth'), colors: [0x4f6bff, 0xff9bea, 0xffffff, 0x9b7cff] },
];

export interface BackgroundDef {
  id: string;
  name: string;
  req: Requirement;
  /** Nebula cloud tints in the sky. */
  clouds: readonly number[];
  /** A swatch for the Wardrobe card. */
  swatch: string;
  /** 1.2.0: the page's sky behind the canvas (two glows, then the top and bottom of the gradient). */
  glow?: readonly [string, string, string, string];
}

export const BACKGROUNDS: readonly BackgroundDef[] = [
  { id: 'violet', name: 'Deep Violet', req: { kind: 'none' }, clouds: [0x2ee6ff, 0x1e8fa8, 0x7b3fd6, 0x2ee6ff, 0x5fd3c4, 0x9b7cff], swatch: '#140A3A' },
  { id: 'emerald', name: 'Emerald Nebula', req: { kind: 'count', stat: 'nebulasAll', count: 1, noun: 'Nebula' }, clouds: [0x3ee08a, 0x1e8f6a, 0x7dff5a, 0x2ec4a8], swatch: '#0A2A22' },
  { id: 'crimson', name: 'Crimson Rift', req: { kind: 'count', stat: 'crunchesAll', count: 1, noun: 'Big Crunch' }, clouds: [0xff4f6e, 0xc8341a, 0xff7a2e, 0x9b2a5a], swatch: '#2A0A16' },
  { id: 'midnight', name: 'Midnight Blue', req: { kind: 'count', stat: 'galacticsAll', count: 1, noun: 'Galactic Rebirth' }, clouds: [0x2b7fd0, 0x1a3a8a, 0x5fa8ff, 0x2ee6ff], swatch: '#06122E' },
  { id: 'dawn', name: 'Golden Dawn', req: { kind: 'medals', count: 50 }, clouds: [0xffc83d, 0xff9a3d, 0xffe9a8, 0xff6fb5], swatch: '#2A1A0A' },
  // 1.2.0
  { id: 'aurora', name: 'Aurora Skies', req: c('nebulasAll', 3, 'Nebula'), clouds: [0x3ee08a, 0x2ee6ff, 0x9b7cff, 0x5fd3c4], swatch: '#081E24', glow: ['rgba(62, 224, 138, 0.26)', 'rgba(155, 124, 255, 0.22)', '#081e24', '#030d10'] },
  { id: 'rose', name: 'Rose Nebula', req: { kind: 'medals', count: 75 }, clouds: [0xff6fa8, 0xffb3d1, 0xb23a8e, 0xff4fc1], swatch: '#2A0A1E', glow: ['rgba(255, 111, 168, 0.28)', 'rgba(178, 58, 142, 0.22)', '#2a0a1e', '#12030c'] },
  { id: 'ocean', name: 'Ocean Depths', req: c('trips', 50, 'trip'), clouds: [0x1e7fd0, 0x2ee6ff, 0x1a3a8a, 0x5fd3ff], swatch: '#041A2A', glow: ['rgba(30, 127, 208, 0.3)', 'rgba(46, 230, 255, 0.16)', '#041a2a', '#010a12'] },
  { id: 'amber', name: 'Amber Haze', req: c('smelts', 1000, 'smelt'), clouds: [0xffb020, 0xff7a2e, 0xffe070, 0xc8641a], swatch: '#24160A', glow: ['rgba(255, 176, 32, 0.26)', 'rgba(255, 122, 46, 0.2)', '#24160a', '#0f0903'] },
  { id: 'toxic', name: 'Toxic Cloud', req: c('mutationsFound', 25, 'mutation'), clouds: [0x8be02e, 0xd8ff5a, 0x3ee08a, 0x5a8c1e], swatch: '#14200A', glow: ['rgba(139, 224, 46, 0.24)', 'rgba(216, 255, 90, 0.16)', '#14200a', '#070c03'] },
  { id: 'void', name: 'The Void', req: c('singularitiesAll', 5, 'Singularity'), clouds: [0x6b4bc8, 0x2a1060, 0x9b7cff, 0x120a24], swatch: '#08041A', glow: ['rgba(107, 75, 200, 0.22)', 'rgba(42, 16, 96, 0.3)', '#08041a', '#020108'] },
  { id: 'storm', name: 'Storm Front', req: c('weathers', 100, 'weather'), clouds: [0x8c97c2, 0x2ee6ff, 0x4a4f7a, 0xffffff], swatch: '#141A2A', glow: ['rgba(140, 151, 194, 0.24)', 'rgba(46, 230, 255, 0.14)', '#141a2a', '#070a12'] },
  { id: 'prism', name: 'Prismatic', req: c('multiversesAll', 3, 'Multiverse'), clouds: [0xff4fc1, 0xffc83d, 0x7dff5a, 0x2ee6ff, 0xb06bff], swatch: '#1A0A2A', glow: ['rgba(255, 79, 193, 0.22)', 'rgba(46, 230, 255, 0.2)', '#1a0a2a', '#0a0312'] },
  { id: 'emberfield', name: 'Ember Field', req: c('cores', 20, 'core'), clouds: [0xff4f2e, 0xffd27a, 0xc8341a, 0xff7a2e], swatch: '#2A0C06', glow: ['rgba(255, 79, 46, 0.28)', 'rgba(255, 210, 122, 0.16)', '#2a0c06', '#120402'] },
];

/** 1.2.0: the sparks when you tap the star (none: your star's own colour). */
export interface BurstDef {
  id: string;
  name: string;
  req: Requirement;
  colors: readonly number[];
}

export const BURSTS: readonly BurstDef[] = [
  { id: 'tier', name: "Your star's colour", req: { kind: 'none' }, colors: [] },
  { id: 'gold', name: 'Golden', req: { kind: 'medals', count: 15 }, colors: [0xffc83d, 0xffe9a8] },
  { id: 'ice', name: 'Icy', req: c('elements', 8, 'element'), colors: [0xbdf6ff, 0xffffff, 0x5fb8e8] },
  { id: 'ember', name: 'Ember', req: c('smelts', 50, 'smelt'), colors: [0xff7a2e, 0xffd27a, 0xc8341a] },
  { id: 'neon', name: 'Neon', req: c('maxCombo', 75, 'combo'), colors: [0x2ee6ff, 0xff4fc1, 0x7dff5a] },
  { id: 'comet', name: 'Comet Blue', req: c('comets', 250, 'comet'), colors: [0x2ee6ff, 0xffffff] },
  { id: 'rainbow', name: 'Rainbow', req: c('supernovasAll', 20, 'Supernova'), colors: [0xff4fc1, 0xffc83d, 0x7dff5a, 0x2ee6ff, 0xb06bff] },
  { id: 'leaf', name: 'Leafy', req: c('nurseryHarvests', 5, 'harvest'), colors: [0x7dff5a, 0x3ee08a] },
  { id: 'rose', name: 'Rose', req: { kind: 'medals', count: 60 }, colors: [0xff6fa8, 0xffb3d1, 0xffffff] },
  { id: 'void', name: 'Void', req: c('singularitiesAll', 1, 'Singularity'), colors: [0x9b7cff, 0x6b4bc8, 0xffffff] },
  { id: 'prism', name: 'Prism', req: c('multiversesAll', 1, 'Multiverse'), colors: [0xffffff, 0xff9bea, 0x9af0ff, 0xfff3a0] },
];

/** 1.2.0: the menus' colour (the panels and their deep wells). Dark enough that white text keeps its contrast. */
export interface ThemeDef {
  id: string;
  name: string;
  req: Requirement;
  panel: string;
  deep: string;
}

export const THEMES: readonly ThemeDef[] = [
  { id: 'violet', name: 'Violet', req: { kind: 'none' }, panel: '#3B2A8C', deep: '#24185E' },
  { id: 'midnight', name: 'Midnight', req: { kind: 'medals', count: 20 }, panel: '#24407A', deep: '#162A55' },
  { id: 'forest', name: 'Forest', req: c('questsDone', 15, 'quest'), panel: '#1F5E4A', deep: '#123A2E' },
  { id: 'slate', name: 'Slate', req: { kind: 'medals', count: 40 }, panel: '#3A4566', deep: '#252C44' },
  { id: 'ocean', name: 'Ocean', req: c('trips', 10, 'trip'), panel: '#1E4F7A', deep: '#12324E' },
  { id: 'ember', name: 'Ember', req: c('smelts', 100, 'smelt'), panel: '#7A2E2A', deep: '#4C1A18' },
  { id: 'plum', name: 'Plum', req: c('nebulasAll', 1, 'Nebula'), panel: '#6A2A7A', deep: '#40184C' },
  { id: 'rose', name: 'Rose', req: { kind: 'medals', count: 75 }, panel: '#7A2A55', deep: '#4C1834' },
  { id: 'graphite', name: 'Graphite', req: c('singularitiesAll', 1, 'Singularity'), panel: '#3A3A4A', deep: '#24242E' },
  { id: 'gold', name: 'Royal Gold', req: c('crunchesAll', 1, 'Big Crunch'), panel: '#6A5220', deep: '#423212' },
];

export const SKIN_BY_ID: ReadonlyMap<string, SkinDef> = new Map(SKINS.map((x) => [x.id, x]));
export const TRAIL_BY_ID: ReadonlyMap<string, TrailDef> = new Map(TRAILS.map((x) => [x.id, x]));
export const BACKGROUND_BY_ID: ReadonlyMap<string, BackgroundDef> = new Map(BACKGROUNDS.map((x) => [x.id, x]));
export const BURST_BY_ID: ReadonlyMap<string, BurstDef> = new Map(BURSTS.map((x) => [x.id, x]));
export const THEME_BY_ID: ReadonlyMap<string, ThemeDef> = new Map(THEMES.map((x) => [x.id, x]));
