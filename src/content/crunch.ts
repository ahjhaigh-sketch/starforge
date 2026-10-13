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

/** The layers that run themselves, lowest first (1.4.0: all ten below the top, content/layers). */
export { AUTO_LAYERS, type AutoLayer } from './layers';
import type { AutoLayer } from './layers';

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
  // 1.4.0: a layer runs itself once you're two layers past it, so these four are boosts now (the Big Crunch is
  // layer five: the four below the Galactic layer already run themselves when Eternity opens)
  { id: 'et.forge', name: 'Eternal Forge', desc: 'Stardust x1e30.', cost: ET.costs.forge!, effect: { stat: 'productionMult', op: 'mul', value: 1e30 } },
  { id: 'et.nova', name: 'Eternal Nova', desc: 'Nova Shards x1e10.', cost: ET.costs.nova!, effect: { stat: 'shardGain', op: 'mul', value: 1e10 } },
  { id: 'et.mist', name: 'Eternal Mist', desc: 'Essence x1e10.', cost: ET.costs.mist!, effect: { stat: 'essenceGain', op: 'mul', value: 1e10 } },
  { id: 'et.void', name: 'Eternal Void', desc: 'Dark Matter x1e6.', cost: ET.costs.void!, effect: { stat: 'darkMatterGain', op: 'mul', value: 1e6 } },
  { id: 'et.galaxy', name: 'Eternal Galaxy', desc: 'All of the Galactic layer runs itself now, Observatory, Star Chart and terraforming too (it would from the first Multiverse).', cost: ET.costs.galaxy!, layer: 'galactic' },
  { id: 'et.arrow', name: 'Arrow of Time', desc: 'Chronons x2.', cost: ET.costs.arrow!, effect: { stat: 'chrononGain', op: 'mul', value: 2 } },
  { id: 'et.echoes', name: 'Loud Echoes', desc: 'The Echo boards make x10.', cost: ET.costs.echoes!, effect: { stat: 'echoMult', op: 'mul', value: 10 } },
  { id: 'et.longnow', name: 'The Long Now', desc: 'The game runs 25% faster.', cost: ET.costs.longnow!, effect: { stat: 'gameSpeed', op: 'add', value: 0.25 } },
  { id: 'et.cores', name: 'Core Memory', desc: 'Galaxy Cores x2.', cost: ET.costs.cores!, effect: { stat: 'galaxyCoreGain', op: 'mul', value: 2 } },
  { id: 'et.dawn', name: 'False Dawn', desc: 'Each Crunch run starts with the Milky Way, Spiral and Elliptical already explored.', cost: ET.costs.dawn!, flag: 'dawn' },
];

export const ETERNITY_BY_ID: ReadonlyMap<string, EternityUpgrade> = new Map(ETERNITY_UPGRADES.map((u) => [u.id, u]));

/** What each layer's automation resets on, in words. */
export { LAYER_NAMES as AUTO_LAYER_NAMES } from './layers';
