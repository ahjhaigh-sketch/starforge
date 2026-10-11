import type { KitEngine } from '../engine/engineKit';
import { BALANCE } from './balance';

/**
 * The Big Crunch's content (Game design: "Big Crunch"): the Echo boards' engines, Eternity
 * upgrades and what each automates. IDs never change.
 */
const E = BALANCE.echoes;
const ET = BALANCE.eternity;

// ---------- the Echo boards ----------

const ECHO_NAMES: Array<[id: string, name: string, color: string, icon: string]> = [
  ['echo.mote', 'Echo Motes', '#FFC83D', 'mote'],
  ['echo.mill', 'Echo Mill', '#6E5CC8', 'moon'],
  ['echo.siphon', 'Echo Siphon', '#3E9E2A', 'giant'],
  ['echo.loom', 'Echo Loom', '#C23F6A', 'loom'],
  ['echo.choir', 'Echo Choir', '#1E8FA8', 'choir'],
];

export interface EchoEngine extends KitEngine {
  color: string;
  icon: string;
}

export const ECHO_ENGINES: readonly EchoEngine[] = ECHO_NAMES.map(([id, name, color, icon], k) => ({
  id,
  name,
  color,
  icon,
  baseCost: E.engineCostBase * E.engineCostGrowth ** k,
  baseProd: E.engineProdBase * E.engineProdGrowth ** k,
}));

// ---------- Eternity upgrades ----------

/** The layers Eternity automates, lowest first. */
export const AUTO_LAYERS = ['stardust', 'supernova', 'nebula', 'singularity', 'galactic'] as const;
export type AutoLayer = (typeof AUTO_LAYERS)[number];

export interface EternityUpgrade {
  id: string;
  name: string;
  desc: string;
  cost: number;
  /** The layer it automates, if it's an automation upgrade. */
  layer?: AutoLayer;
  effect?: { stat: string; op: 'mul' | 'add'; value: number };
  flag?: string;
}

export const ETERNITY_UPGRADES: readonly EternityUpgrade[] = [
  { id: 'et.forge', name: 'Eternal Forge', desc: 'Automates the Stardust layer: every engine, upgrade and Star Tier, and Stellar Constants, from the start of every run.', cost: ET.costs.forge!, layer: 'stardust' },
  { id: 'et.nova', name: 'Eternal Nova', desc: 'Automates the Supernova layer: Supernovas by themselves, the Nova Tree and Nova Constants.', cost: ET.costs.nova!, layer: 'supernova' },
  { id: 'et.mist', name: 'Eternal Mist', desc: 'Automates the Nebula layer: Nebulas by themselves, the Nebula Tree, Nebula Constants and auto-roll on every shrine.', cost: ET.costs.mist!, layer: 'nebula' },
  { id: 'et.void', name: 'Eternal Void', desc: 'Automates the Singularity layer: Singularities by themselves, the Singularity Tree, Void Constants, the Black Hole, the Reactor and the Antimatter Mirror.', cost: ET.costs.void!, layer: 'singularity' },
  { id: 'et.galaxy', name: 'Eternal Galaxy', desc: 'Automates the Galactic layer: Galactic Rebirths by themselves, the Galactic Tree, Galactic Constants, megastructures and colony buildings.', cost: ET.costs.galaxy!, layer: 'galactic' },
  { id: 'et.arrow', name: 'Arrow of Time', desc: 'Chronons x2.', cost: ET.costs.arrow!, effect: { stat: 'chrononGain', op: 'mul', value: 2 } },
  { id: 'et.echoes', name: 'Loud Echoes', desc: 'The Echo boards make x10.', cost: ET.costs.echoes!, effect: { stat: 'echoMult', op: 'mul', value: 10 } },
  { id: 'et.longnow', name: 'The Long Now', desc: 'The game runs 25% faster.', cost: ET.costs.longnow!, effect: { stat: 'gameSpeed', op: 'add', value: 0.25 } },
  { id: 'et.cores', name: 'Core Memory', desc: 'Galaxy Cores x2.', cost: ET.costs.cores!, effect: { stat: 'galaxyCoreGain', op: 'mul', value: 2 } },
  { id: 'et.dawn', name: 'False Dawn', desc: 'Each Crunch run starts with the Milky Way, Spiral and Elliptical already explored.', cost: ET.costs.dawn!, flag: 'dawn' },
];

export const ETERNITY_BY_ID: ReadonlyMap<string, EternityUpgrade> = new Map(ETERNITY_UPGRADES.map((u) => [u.id, u]));

/** What each layer's automation resets on, in words. */
export const AUTO_LAYER_NAMES: Record<AutoLayer, string> = {
  stardust: 'Stardust',
  supernova: 'Supernova',
  nebula: 'Nebula',
  singularity: 'Singularity',
  galactic: 'Galactic Rebirth',
};
