import { BALANCE } from './balance';

/**
 * The Hidden Sigils (Ideas menu 17): one secret in each big tree, hiding between two of its nodes.
 * Each bends a rule: a big boost with a real cost, switched on and off freely at the Sigil Altar.
 * Strengths live in balance.ts. IDs never change.
 */
const G = BALANCE.sigils;

export type SigilTree = 'nova' | 'nebula' | 'singularityTree' | 'galacticTree' | 'scaleTree' | 'starChart' | 'sparkTree';

export interface SigilDef {
  id: string;
  name: string;
  tree: SigilTree;
  treeName: string;
  /** The two nodes beside its hiding place: own both and it shows. */
  between: readonly [string, string];
  currency: string;
  boon: string;
  bane: string;
  effects: ReadonlyArray<{ stat: string; op: 'mul' | 'pow'; value: number }>;
}

export const SIGILS: readonly SigilDef[] = [
  { id: 'sigil.greed', name: 'Sigil of Greed', tree: 'nova', treeName: 'Nova Tree', between: ['strike.11', 'strike.12'], currency: 'shards', boon: `Crits x${G.greedCrit}`, bane: `Stardust x${G.greedDust}`, effects: [{ stat: 'critMult', op: 'mul', value: G.greedCrit }, { stat: 'productionMult', op: 'mul', value: G.greedDust }] },
  { id: 'sigil.haste', name: 'Sigil of Haste', tree: 'nebula', treeName: 'Nebula Tree', between: ['drift.6', 'drift.7'], currency: 'essence', boon: `Game speed x${G.hasteSpeed}`, bane: `Offline earnings x${G.hasteOffline}`, effects: [{ stat: 'gameSpeed', op: 'mul', value: G.hasteSpeed }, { stat: 'offlineEfficiency', op: 'mul', value: G.hasteOffline }] },
  { id: 'sigil.hunger', name: 'Sigil of Hunger', tree: 'singularityTree', treeName: 'Singularity Tree', between: ['sing.2.12', 'sing.3.21'], currency: 'darkMatter', boon: `Dark Matter x${G.hungerDm}`, bane: `Black Hole growth x${G.hungerMass}`, effects: [{ stat: 'darkMatterGain', op: 'mul', value: G.hungerDm }, { stat: 'massGain', op: 'mul', value: G.hungerMass }] },
  { id: 'sigil.pride', name: 'Sigil of Pride', tree: 'galacticTree', treeName: 'Galactic Tree', between: ['gal.runes.12', 'gal.runes.13'], currency: 'galaxyCores', boon: `Galaxy Cores x${G.prideCores}`, bane: `Stardust multiplier ^${G.prideDust}`, effects: [{ stat: 'galaxyCoreGain', op: 'mul', value: G.prideCores }, { stat: 'productionMult', op: 'pow', value: G.prideDust }] },
  { id: 'sigil.envy', name: 'Sigil of Envy', tree: 'scaleTree', treeName: 'Scale Tree', between: ['scale.3', 'scale.6'], currency: 'scales', boon: `Rune Luck x${G.envyLuck}`, bane: `Rune Bulk x${G.envyBulk}`, effects: [{ stat: 'runeLuck', op: 'mul', value: G.envyLuck }, { stat: 'runeBulk', op: 'mul', value: G.envyBulk }] },
  { id: 'sigil.sloth', name: 'Sigil of Sloth', tree: 'starChart', treeName: 'Star Chart', between: ['chart.2', 'chart.5'], currency: 'starCharts', boon: `Offline cap x${G.slothCap}`, bane: `Taps x${G.slothTaps}`, effects: [{ stat: 'offlineCap', op: 'mul', value: G.slothCap }, { stat: 'tapPower', op: 'mul', value: G.slothTaps }] },
  { id: 'sigil.wrath', name: 'Sigil of Wrath', tree: 'sparkTree', treeName: 'Spark choices', between: ['mv.nebula.in.2', 'mv.nebula.out.5'], currency: 'sparks', boon: `Leviathan damage x${G.wrathDamage}`, bane: `Comets x${G.wrathComets} as often`, effects: [{ stat: 'leviathanDamage', op: 'mul', value: G.wrathDamage }, { stat: 'cometRate', op: 'mul', value: G.wrathComets }] },
];

export const SIGIL_BY_ID: ReadonlyMap<string, SigilDef> = new Map(SIGILS.map((x) => [x.id, x]));
