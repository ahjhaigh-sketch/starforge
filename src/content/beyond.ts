import { BALANCE } from './balance';

/**
 * 1.4.0: beyond the Multiverse, four more resets (layers 7 to 10), each with its own currency and one
 * system nobody has seen before in the game (Game design: "Beyond the Multiverse"). Each reset wipes only
 * the three layers just below it, so everything further down stays as it is, running itself.
 * IDs never change.
 */
const B = BALANCE.beyond;

export type BeyondLayerId = 'hyperverse' | 'omniverse' | 'genesis' | 'apotheosis';

export interface BeyondLayerDef {
  id: BeyondLayerId;
  name: string;
  /** The reset button's verb phrase. */
  action: string;
  currency: string;
  currencyName: string;
  color: string;
  icon: string;
  /** The layer below, and the currency of it this layer's run counts. */
  prev: string;
  prevCurrency: string;
  prevName: string;
  /** The three layers its reset wipes, nearest first. */
  wipes: readonly string[];
  /** The stat that multiplies its gain. */
  gainStat: string;
  /** Its system (and panel), opened by its first reset. */
  feature: { id: string; name: string; icon: string; blurb: string };
  blurb: string;
  /** What its milestones keep or bring, by count. */
  milestones: ReadonlyArray<{ at: number; id: string; text: string }>;
}

const free = (below: string) => `${/^[AEIOU]/.test(below) ? 'An' : 'A'} ${below} resets nothing; 1/50 of its gain trickles in every second`;

export const BEYOND_LAYERS: readonly BeyondLayerDef[] = [
  {
    id: 'hyperverse',
    name: 'Hyperverse',
    action: 'Fold into the Hyperverse',
    currency: 'tesseracts',
    currencyName: 'Tesseracts',
    color: '#5CF2C8',
    icon: 'tesseract',
    prev: 'multiverse',
    prevCurrency: 'sparks',
    prevName: 'Multiverse Sparks',
    wipes: ['multiverse', 'crunch', 'galactic'],
    gainStat: 'tesseractGain',
    feature: { id: 'tesseract', name: 'Tesseract', icon: 'tesseract', blurb: 'Four axes, each folded through an earlier layer. Neighbours in order resonate.' },
    blurb: 'The seventh reset: fold the Multiverse, Big Crunch and Galactic layers into Tesseracts.',
    milestones: [
      { at: 1, id: 'keepMultiverse', text: 'Keep your Multiverse milestones; the Tesseract opens' },
      { at: 2, id: 'keepSparks', text: 'Keep your Spark choices' },
      { at: 3, id: 'keepOmni', text: 'Keep Omni Constants and the Universe Forge rules' },
      { at: B.passiveAt, id: 'passive', text: 'Gain 1% of your Hyperverse gain every second, without folding' },
      { at: 6, id: 'omniverse', text: 'The Omniverse stirs' },
      { at: 10, id: 'multiverseFree', text: free('Multiverse') },
    ],
  },
  {
    id: 'omniverse',
    name: 'Omniverse',
    action: 'Become the Omniverse',
    currency: 'aether',
    currencyName: 'Aether',
    color: '#FFD86B',
    icon: 'aether',
    prev: 'hyperverse',
    prevCurrency: 'tesseracts',
    prevName: 'Tesseracts',
    wipes: ['hyperverse', 'multiverse', 'crunch'],
    gainStat: 'aetherGain',
    feature: { id: 'pantheon', name: 'Pantheon', icon: 'pantheon', blurb: 'Wake eight Aspects; three stand Ascendant, and every pair of them finds a Rite.' },
    blurb: 'The eighth reset: every Hyperverse at once, for Aether.',
    milestones: [
      { at: 1, id: 'keepHyperverse', text: 'Keep your Hyperverse milestones; the Pantheon opens' },
      { at: 2, id: 'keepAxes', text: 'Keep the Tesseract and its axes' },
      { at: 3, id: 'keepSparks', text: 'Keep your Spark choices' },
      { at: B.passiveAt, id: 'passive', text: 'Gain 1% of your Omniverse gain every second' },
      { at: 6, id: 'genesis', text: 'Genesis stirs' },
      { at: 10, id: 'hyperverseFree', text: free('Hyperverse') },
    ],
  },
  {
    id: 'genesis',
    name: 'Genesis',
    action: 'Begin Genesis',
    currency: 'originSeeds',
    currencyName: 'Origin Seeds',
    color: '#9DFF8A',
    icon: 'seed',
    prev: 'omniverse',
    prevCurrency: 'aether',
    prevName: 'Aether',
    wipes: ['omniverse', 'hyperverse', 'multiverse'],
    gainStat: 'seedGain',
    feature: { id: 'laws', name: 'Laws', icon: 'laws', blurb: 'Rewrite five laws of physics: what one law gains, another gives up.' },
    blurb: 'The ninth reset: start creation over from Origin Seeds.',
    milestones: [
      { at: 1, id: 'keepOmniverse', text: 'Keep your Omniverse milestones; the Laws open' },
      { at: 2, id: 'keepPantheon', text: 'Keep the Pantheon: woken Aspects, devotion and Rites' },
      { at: 3, id: 'keepAxes', text: 'Keep the Tesseract and its axes' },
      { at: B.passiveAt, id: 'passive', text: 'Gain 1% of your Genesis gain every second' },
      { at: 6, id: 'apotheosis', text: 'Apotheosis stirs' },
      { at: 10, id: 'omniverseFree', text: free('Omniverse') },
    ],
  },
  {
    id: 'apotheosis',
    name: 'Apotheosis',
    action: 'Ascend to Apotheosis',
    currency: 'divinity',
    currencyName: 'Divinity',
    color: '#FFFFFF',
    icon: 'divinity',
    prev: 'genesis',
    prevCurrency: 'originSeeds',
    prevName: 'Origin Seeds',
    wipes: ['genesis', 'omniverse', 'hyperverse'],
    gainStat: 'divinityGain',
    feature: { id: 'lives', name: 'Past Lives', icon: 'lives', blurb: 'Every Apotheosis becomes a Life that guides the next; Divinity buys Miracles.' },
    blurb: 'The tenth and last reset: the Starsmith becomes a star.',
    milestones: [
      { at: 1, id: 'keepGenesis', text: 'Keep your Genesis milestones; Past Lives and Miracles open' },
      { at: 2, id: 'keepLaws', text: 'Keep your Laws' },
      { at: 3, id: 'keepPantheon', text: 'Keep the Pantheon' },
      { at: B.passiveAt, id: 'passive', text: 'Gain 1% of your Apotheosis gain every second' },
      { at: 10, id: 'genesisFree', text: free('Genesis') },
    ],
  },
];

export const BEYOND_BY_ID: ReadonlyMap<string, BeyondLayerDef> = new Map(BEYOND_LAYERS.map((l) => [l.id, l]));

// ---------- the Tesseract (Hyperverse) ----------

/** The layers an axis can fold through, with the gain it boosts. */
export const FOLDS: ReadonlyArray<{ layer: string; name: string; currency: string; stat: string; color: string }> = [
  { layer: 'stardust', name: 'Stardust', currency: 'stardust', stat: 'productionMult', color: '#FFC83D' },
  { layer: 'supernova', name: 'Supernova', currency: 'shards', stat: 'shardGain', color: '#FF4FC1' },
  { layer: 'nebula', name: 'Nebula', currency: 'essence', stat: 'essenceGain', color: '#2EE6FF' },
  { layer: 'singularity', name: 'Singularity', currency: 'darkMatter', stat: 'darkMatterGain', color: '#9B7CFF' },
  { layer: 'galactic', name: 'Galactic', currency: 'galaxyCores', stat: 'galaxyCoreGain', color: '#B4F04A' },
  { layer: 'crunch', name: 'Big Crunch', currency: 'chronons', stat: 'chrononGain', color: '#FF8A3D' },
  { layer: 'multiverse', name: 'Multiverse', currency: 'sparks', stat: 'sparkGain', color: '#FF6AD5' },
];
export const FOLD_BY_LAYER: ReadonlyMap<string, (typeof FOLDS)[number]> = new Map(FOLDS.map((f) => [f.layer, f]));
export const AXES = ['W', 'X', 'Y', 'Z'] as const;

// ---------- the Pantheon (Omniverse) ----------

export interface AspectDef {
  id: string;
  name: string;
  title: string;
  color: string;
  /** What it boosts: each stat x value^(devotion x power). */
  boosts: ReadonlyArray<{ stat: string; per: number }>;
  desc: string;
}

export const ASPECTS: readonly AspectDef[] = [
  { id: 'smith', name: 'The Smith', title: 'who first lit the forge', color: '#FFB347', boosts: [{ stat: 'productionMult', per: 1e10 }, { stat: 'alloyGain', per: 100 }], desc: 'Stardust x1e10 and alloy x100 a devotion' },
  { id: 'weaver', name: 'The Weaver', title: 'who ties the threads', color: '#B06BFF', boosts: [{ stat: 'runeBulk', per: 10 }, { stat: 'runeLuck', per: 3 }], desc: 'Rune bulk x10 and Rune Luck x3 a devotion' },
  { id: 'hunger', name: 'The Hunger', title: 'who eats the light', color: '#6E5CC4', boosts: [{ stat: 'darkMatterGain', per: 1e3 }, { stat: 'massGain', per: 10 }], desc: 'Dark Matter x1,000 and Black Hole mass x10 a devotion' },
  { id: 'tide', name: 'The Tide', title: 'who moves the clouds', color: '#2EE6FF', boosts: [{ stat: 'essenceGain', per: 1e6 }, { stat: 'shardGain', per: 1e6 }], desc: 'Essence and Nova Shards x1e6 a devotion' },
  { id: 'lantern', name: 'The Lantern', title: 'who walks between galaxies', color: '#B4F04A', boosts: [{ stat: 'galaxyCoreGain', per: 3 }, { stat: 'colonyCapacity', per: 10 }], desc: 'Galaxy Cores x3 and colony capacity x10 a devotion' },
  { id: 'choir', name: 'The Choir', title: 'who sings the echoes', color: '#FF8A3D', boosts: [{ stat: 'chrononGain', per: 1.5 }, { stat: 'echoMult', per: 100 }], desc: 'Chronons x1.5 and echo output x100 a devotion' },
  { id: 'seed', name: 'The Seed', title: 'who remembers every universe', color: '#FF6AD5', boosts: [{ stat: 'sparkGain', per: 1.1 }, { stat: 'tesseractGain', per: 1.25 }], desc: 'Sparks x1.1 and Tesseracts x1.25 a devotion' },
  { id: 'end', name: 'The End', title: 'who waits at the last star', color: '#E8E0FF', boosts: [{ stat: 'aetherGain', per: 1.2 }, { stat: 'leviathanDamage', per: 100 }], desc: 'Aether x1.2 and Leviathan damage x100 a devotion' },
];
export const ASPECT_BY_ID: ReadonlyMap<string, AspectDef> = new Map(ASPECTS.map((a) => [a.id, a]));

/** Every pair of Aspects is a Rite, found the first time both stand Ascendant together. */
export const RITES: ReadonlyArray<{ id: string; a: string; b: string; name: string }> = ASPECTS.flatMap((x, i) =>
  ASPECTS.slice(i + 1).map((y) => ({ id: `${x.id}+${y.id}`, a: x.id, b: y.id, name: `Rite of ${x.name.slice(4)} and ${y.name.slice(4)}` })),
);

// ---------- the Laws (Genesis) ----------

export interface LawDef {
  id: string;
  name: string;
  color: string;
  /** Turned up (+1 a step): what grows, and what it costs; turned down: the other way round. */
  up: { stat: string; per: number; text: string };
  down: { stat: string; per: number; text: string };
}

export const LAWS: readonly LawDef[] = [
  { id: 'gravity', name: 'Gravity', color: '#9B7CFF', up: { stat: 'darkMatterGain', per: 1e4, text: 'Dark Matter' }, down: { stat: 'shipSpeed', per: 3, text: 'starship speed' } },
  { id: 'light', name: 'Light', color: '#FFC83D', up: { stat: 'productionMult', per: 1e20, text: 'Stardust' }, down: { stat: 'essenceGain', per: 1e8, text: 'Essence' } },
  { id: 'entropy', name: 'Entropy', color: '#FF8A3D', up: { stat: 'chrononGain', per: 2, text: 'Chronons' }, down: { stat: 'galaxyCoreGain', per: 10, text: 'Galaxy Cores' } },
  { id: 'charge', name: 'Charge', color: '#2EE6FF', up: { stat: 'antimatterMult', per: 1e3, text: 'Antimatter' }, down: { stat: 'oreGain', per: 1e6, text: 'ore' } },
  { id: 'time', name: 'Time', color: '#5CF2C8', up: { stat: 'tesseractGain', per: 1.5, text: 'Tesseracts' }, down: { stat: 'aetherGain', per: 1.25, text: 'Aether' } },
];
export const LAW_BY_ID: ReadonlyMap<string, LawDef> = new Map(LAWS.map((l) => [l.id, l]));

// ---------- Past Lives and Miracles (Apotheosis) ----------

export interface MiracleDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  effect?: { stat: string; op: 'mul' | 'add'; value: number };
}

export const MIRACLES: readonly MiracleDef[] = [
  { id: 'mir.dawn', name: 'First Dawn', desc: 'Origin Seeds x2.', cost: 1, effect: { stat: 'seedGain', op: 'mul', value: 2 } },
  { id: 'mir.hands', name: 'Steady Hands', desc: 'The game runs 50% faster.', cost: 2, effect: { stat: 'gameSpeed', op: 'add', value: 0.5 } },
  { id: 'mir.ether', name: 'Breath of Aether', desc: 'Aether x3.', cost: 3, effect: { stat: 'aetherGain', op: 'mul', value: 3 } },
  { id: 'mir.fold', name: 'Folded Sky', desc: 'Tesseracts x5.', cost: 4, effect: { stat: 'tesseractGain', op: 'mul', value: 5 } },
  { id: 'mir.sparks', name: 'Spark Rain', desc: 'Sparks x2.', cost: 5, effect: { stat: 'sparkGain', op: 'mul', value: 2 } },
  { id: 'mir.time', name: 'Endless Afternoon', desc: 'Chronons x10.', cost: 6, effect: { stat: 'chrononGain', op: 'mul', value: 10 } },
  { id: 'mir.cores', name: 'Heart of Galaxies', desc: 'Galaxy Cores x100.', cost: 8, effect: { stat: 'galaxyCoreGain', op: 'mul', value: 100 } },
  { id: 'mir.divine', name: 'Divine Spark', desc: 'Divinity x2.', cost: 10, effect: { stat: 'divinityGain', op: 'mul', value: 2 } },
  { id: 'mir.lives', name: 'Long Memory', desc: 'Keep six Past Lives, not five.', cost: 12 },
  { id: 'mir.last', name: 'The Last Star', desc: 'Everything you earn x10: Stardust to Divinity.', cost: 25 },
];
export const MIRACLE_BY_ID: ReadonlyMap<string, MiracleDef> = new Map(MIRACLES.map((m) => [m.id, m]));

/** The titles a Life takes from its score. */
export const LIFE_TITLES: readonly string[] = ['Ember', 'Spark', 'Flame', 'Beacon', 'Sun', 'Nova', 'Pulsar', 'Quasar', 'Galaxy', 'Cosmos', 'Eternity'];

/** Told once, at the first Apotheosis: where the Last Starsmith's story ends. */
export const EPILOGUE: readonly string[] = [
  'Universes beyond counting have burned and folded and begun again in your hands. The many became one, and the one began again from a seed.',
  'Now there is nothing left to forge but yourself. You step into the last star, and it does not go out.',
  'Somewhere, a new Starsmith taps a dying ember and feels it answer. You are the light it answers with.',
];
