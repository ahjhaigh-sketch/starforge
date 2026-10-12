import { SYSTEMS } from '../content/systems';

/**
 * Each menu's own backdrop (1.2.0): a pattern and two colours, themed to what the menu is, and a
 * large faint watermark of its symbol. Drawn once in CSS (panelArt.css); nothing animates.
 */
export type ArtPattern = 'rings' | 'grid' | 'stars' | 'swirl' | 'bubbles' | 'waves' | 'diagonal' | 'hex' | 'rays' | 'dots' | 'clouds' | 'scales' | 'embers' | 'orbits';

export const PANEL_ART: Readonly<Record<string, readonly [ArtPattern, string, string]>> = {
  // the start
  upgrades: ['diagonal', '#2E9C78', '#1B6E55'],
  medals: ['rays', '#C99A1E', '#8A5A12'],
  stats: ['grid', '#3B4370', '#2A2F55'],
  ascent: ['stars', '#7B3FD6', '#2B7FD0'],
  settings: ['dots', '#4A4F80', '#2A2F55'],
  credits: ['stars', '#B06BFF', '#FF4FC1'],
  story: ['clouds', '#7B3FD6', '#1E8FA8'],
  welcome: ['rays', '#FFC83D', '#FF7A2E'],
  supernova: ['rays', '#FF4FC1', '#FF7A2E'],
  // tiers 1 to 5
  belt: ['dots', '#6E7BAE', '#3B4370'],
  level: ['diagonal', '#2B7FD0', '#5B45C2'],
  constants: ['orbits', '#7B3FD6', '#4A6FC4'],
  quests: ['grid', '#C2561E', '#8A3A12'],
  orbitals: ['orbits', '#2E9C78', '#1A9DB8'],
  mastery: ['scales', '#C99A1E', '#7B3FD6'],
  wardrobe: ['diagonal', '#B23A8E', '#FF4FC1'],
  // Supernova
  novatree: ['rays', '#C23FA0', '#5A2A8C'],
  automation: ['grid', '#2E8FD0', '#1E5F8A'],
  starforge: ['embers', '#8A5CD8', '#FF7A2E'],
  drill: ['waves', '#C2561E', '#6E3A1E'],
  fusion: ['hex', '#FF4FC1', '#2EE6FF'],
  attune: ['rings', '#1A9DB8', '#7B3FD6'],
  merchant: ['scales', '#B08A1A', '#5A3A12'],
  alchemy: ['bubbles', '#1E8F7A', '#2EC4A8'],
  weather: ['waves', '#2B7FD0', '#8FD3FF'],
  expeditions: ['stars', '#2B7FD0', '#1E8FA8'],
  // Nebula
  nebula: ['clouds', '#1E8FA8', '#7B3FD6'],
  nebulatree: ['clouds', '#1E6F88', '#2EC4A8'],
  runes: ['hex', '#7B3FD6', '#C23FA0'],
  index: ['grid', '#5B45C2', '#2B1F6E'],
  wyrms: ['scales', '#2E9C78', '#C99A1E'],
  starring: ['rings', '#FFC83D', '#7B3FD6'],
  mutations: ['bubbles', '#C23FA0', '#7DFF5A'],
  auras: ['rings', '#1A9DB8', '#B06BFF'],
  nursery: ['dots', '#3EE08A', '#1E6F55'],
  spectral: ['rays', '#B06BFF', '#2EE6FF'],
  tarot: ['diagonal', '#7A2A8C', '#C99A1E'],
  // Singularity
  singularity: ['swirl', '#3A2470', '#6B4BC8'],
  singularitytree: ['swirl', '#2A1060', '#5B45C2'],
  blackhole: ['swirl', '#120A24', '#FFB347'],
  reactor: ['hex', '#FF4F6E', '#8A1A2E'],
  prismwheel: ['rays', '#FF4FC1', '#FFC83D'],
  defense: ['rings', '#B23A3A', '#3A1020'],
  altar: ['stars', '#6B4BC8', '#2A1060'],
  // Challenges
  trials: ['grid', '#C23F6A', '#5A1A3A'],
  spire: ['diagonal', '#5B45C2', '#C99A1E'],
  leviathans: ['waves', '#1E5F8A', '#2EC4A8'],
  scaletree: ['scales', '#1E8FA8', '#0A3A55'],
  // Mirror and Wormholes
  mirror: ['diagonal', '#2A6F8F', '#9FE7FF'],
  wormholes: ['swirl', '#2B7FD0', '#B06BFF'],
  // Galactic
  galactic: ['swirl', '#3F7A12', '#7DFF5A'],
  galaxymap: ['stars', '#1A3A8A', '#3F7A12'],
  galactictree: ['orbits', '#3F7A12', '#2B7FD0'],
  observatory: ['stars', '#5B45C2', '#2EE6FF'],
  starchart: ['grid', '#7B3FD6', '#2B7FD0'],
  megastructures: ['hex', '#B0701A', '#5A3A12'],
  colonies: ['dots', '#2E9C78', '#B0701A'],
  terraform: ['waves', '#3EE08A', '#B07A52'],
  // Big Crunch
  bigcrunch: ['rings', '#FF5640', '#5A1A2E'],
  eternity: ['orbits', '#B08A1A', '#FFE070'],
  echoes: ['rings', '#B08A1A', '#5B45C2'],
  // Multiverse
  multiverse: ['rays', '#B06BFF', '#2EE6FF'],
  universeforge: ['embers', '#7B3FD6', '#FF4FC1'],
  sparktree: ['stars', '#FF4FC1', '#7DFF5A'],
};

/** The symbol watermarked behind a menu: its system's own, or one that fits. */
const OTHER_MARKS: Record<string, string> = { settings: 'gear', credits: 'stardust', story: 'universe', welcome: 'stardust', supernova: 'shard', stats: 'stats', medals: 'trophy', upgrades: 'upgrade', ascent: 'ascent' };
const BY_PANEL = new Map(SYSTEMS.filter((x) => x.panel).map((x) => [x.panel!, x.icon]));
export const panelMark = (id: string): string | undefined => BY_PANEL.get(id) ?? OTHER_MARKS[id];
