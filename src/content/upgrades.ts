import { ENGINES } from './engines';
import type { Requirement } from './requirements';

/**
 * About 175 one-off Stardust upgrades (1.2.0: four doublers for each of 30 engines, and the general lines carried further) (Game design: "Upgrades"). Each appears as an icon tile above
 * the engine shop once its requirement is met, and its tooltip says when the effect applies.
 * IDs never change once released.
 */
export type UpgradeEffect =
  /** A plain number added to, or multiplying, a stat. */
  | { stat: string; op: 'add' | 'mul'; value: number }
  /** Multiplies a stat by (1 + each x owned of another engine): engine synergies. */
  | { stat: string; op: 'mul'; perEngine: string; each: number }
  /** Adds (each x owned of an engine) to a stat: e.g. +0.1 tap power per Spark Mote. */
  | { stat: string; op: 'add'; perEngine: string; each: number }
  /** Adds a share of Stardust per second to every tap, after all multipliers. */
  | { stat: 'tapSpsShare'; op: 'add'; spsShare: number };

export interface UpgradeDef {
  id: string;
  name: string;
  icon: string;
  /** Tile colour. */
  color: string;
  cost: number;
  req: Requirement;
  effect: UpgradeEffect;
  /** What it does, in plain words. */
  desc: string;
}

const ENGINE_NAMES: Record<string, [string, string]> = {
  mote: ['Glimmer Coating', 'Mote Swarming'],
  catcher: ['Wider Nets', 'Gravity Lures'],
  moonmill: ['Sharper Millstones', 'Twin Moons'],
  drill: ['Diamond Bits', 'Deep Bore'],
  siphon: ['Storm Valves', 'Jet Stream Taps'],
  sail: ['Silver Sails', 'Photon Rigging'],
  dyson: ['Mirror Polish', 'Second Shell'],
  pulsar: ['Beam Lenses', 'Tidal Lock'],
  quasar: ['Jet Funnels', 'Event Feeders'],
  choir: ['Perfect Pitch', 'Grand Chorus'],
  loom: ['Finer Thread', 'Golden Weft'],
  turbine: ['Polar Blades', 'Solar Storms'],
  bellows: ['Deeper Breaths', 'Cloud Lungs'],
  foundry: ['Hotter Moulds', 'Ice Cores'],
  lantern: ['Dark Wicks', 'Hollow Flame'],
  magnetar: ['Tighter Coils', 'Field Lines'],
  press: ['Harder Plates', 'Degenerate Matter'],
  reef: ['Coral Plasma', 'Tide Pools'],
  wellpump: ['Deeper Wells', 'Escape Velocity'],
  crown: ['Polished Crown', 'Solar Jewels'],
  hatchery: ['Warm Nests', 'Comet Clutches'],
  reservoir: ['Wider Dams', 'Overflow Channels'],
  novaforge: ['Nova Bellows', 'Chain Reactions'],
  dmmill: ['Unseen Gears', 'Shadow Millstones'],
  wormtap: ['Wider Throats', 'Folded Space'],
  spinner: ['Spiral Bearings', 'Bar Drive'],
  harp: ['Tuned Strings', 'Cosmic Chords'],
  crystal: ['Faceted Time', 'Recursion'],
  kiln: ['Hotter Firing', 'Inflation'],
  infinity: ['Endless Gears', 'Beyond Infinity'],
};

/** Each engine's third and fourth doublers (1.2.0): at 100 and 200 owned. */
const LATE_NAMES = ['Overclocked', 'Perfected'];

/**
 * Four doublers per engine: at 5 owned (12x its base price), 40 owned (600x), 100 owned (5e8x) and
 * 200 owned (5e15x): the first two cost about two of that engine's own price when they unlock, the
 * last two about 400 (1.2.0 balance: so they deepen the late game, not shorten the middle). Each wears
 * its engine's symbol and what that engine's doublers make it once bought (x2, x4, x8, x16).
 */
const plain = (name: string) => name.replace(/s$/, '').replace(/ Array$/, ' Arrays');
const engineDoublers: UpgradeDef[] = ENGINES.flatMap((e) => {
  const [a, b] = ENGINE_NAMES[e.id]!;
  return [
    { id: `${e.id}.x2a`, name: a, icon: `${e.icon}#x2`, color: e.color, cost: e.baseCost * 12, req: { kind: 'engine', id: e.id, count: 5 }, effect: { stat: `engineMult.${e.id}`, op: 'mul', value: 2 }, desc: `${e.name} produce twice as much.` },
    { id: `${e.id}.x2b`, name: b, icon: `${e.icon}#x4`, color: e.color, cost: e.baseCost * 600, req: { kind: 'engine', id: e.id, count: 40 }, effect: { stat: `engineMult.${e.id}`, op: 'mul', value: 2 }, desc: `${e.name} produce twice as much again.` },
    { id: `${e.id}.x2c`, name: `${LATE_NAMES[0]} ${plain(e.name)}`, icon: `${e.icon}#x8`, color: e.color, cost: e.baseCost * 5e8, req: { kind: 'engine', id: e.id, count: 100 }, effect: { stat: `engineMult.${e.id}`, op: 'mul', value: 2 }, desc: `${e.name} produce twice as much: a third time.` },
    { id: `${e.id}.x2d`, name: `${LATE_NAMES[1]} ${plain(e.name)}`, icon: `${e.icon}#x16`, color: e.color, cost: e.baseCost * 5e15, req: { kind: 'engine', id: e.id, count: 200 }, effect: { stat: `engineMult.${e.id}`, op: 'mul', value: 2 }, desc: `${e.name} produce twice as much: a fourth time.` },
  ] satisfies UpgradeDef[];
});

const tap: UpgradeDef[] = [
  { id: 'tap.warm', name: 'Warm Fingers', icon: 'stardust+hand', color: '#C99A1E', cost: 100, req: { kind: 'count', stat: 'taps', count: 25, noun: 'tap' }, effect: { stat: 'tapPower', op: 'add', value: 1 }, desc: 'Taps give +1 Stardust before multipliers.' },
  { id: 'tap.motes', name: 'Mote Tapping', icon: 'mote+hand', color: '#C99A1E', cost: 5000, req: { kind: 'engine', id: 'mote', count: 25 }, effect: { stat: 'tapPower', op: 'add', perEngine: 'mote', each: 0.1 }, desc: 'Taps give +0.1 Stardust for every Spark Mote you own.' },
  { id: 'tap.touch', name: 'Stellar Touch', icon: 'stardust+arrowup', color: '#FF9E5E', cost: 2000, req: { kind: 'count', stat: 'taps', count: 250, noun: 'tap' }, effect: { stat: 'tapPower', op: 'mul', value: 2 }, desc: 'Taps are twice as strong.' },
  { id: 'tap.strike1', name: 'Starstrike', icon: 'stardust+bolt', color: '#FF7A2E', cost: 10_000, req: { kind: 'tier', tier: 1 }, effect: { stat: 'tapSpsShare', op: 'add', spsShare: 0.01 }, desc: 'Each tap also gives 1% of your Stardust per second.' },
  { id: 'tap.strike2', name: 'Solar Strike', icon: 'giant+bolt', color: '#FF7A2E', cost: 500_000, req: { kind: 'tier', tier: 2 }, effect: { stat: 'tapSpsShare', op: 'add', spsShare: 0.02 }, desc: 'Each tap gives another 2% of your Stardust per second.' },
  { id: 'tap.strike3', name: 'Nova Strike', icon: 'shard+bolt', color: '#FF4FC1', cost: 1e9, req: { kind: 'tier', tier: 4 }, effect: { stat: 'tapSpsShare', op: 'add', spsShare: 0.05 }, desc: 'Each tap gives another 5% of your Stardust per second.' },
  { id: 'tap.crit1', name: 'Lucky Strikes', icon: 'stardust+crosshair', color: '#2E9C78', cost: 250_000, req: { kind: 'count', stat: 'crits', count: 25, noun: 'crit' }, effect: { stat: 'critChance', op: 'add', value: 0.02 }, desc: '+2% crit chance.' },
  { id: 'tap.crit2', name: 'Supercritical', icon: 'pulse+crosshair', color: '#2E9C78', cost: 50e6, req: { kind: 'count', stat: 'crits', count: 400, noun: 'crit' }, effect: { stat: 'critMult', op: 'add', value: 5 }, desc: 'Crits give x15 instead of x10.' },
  { id: 'tap.combo1', name: 'Burning Combo', icon: 'pulse+flame', color: '#C23F6A', cost: 20_000, req: { kind: 'count', stat: 'taps', count: 1000, noun: 'tap' }, effect: { stat: 'comboDrain', op: 'mul', value: 0.5 }, desc: 'The combo meter drains half as fast.' },
  { id: 'tap.combo2', name: 'Fever Pitch', icon: 'pulse+arrowup', color: '#C23F6A', cost: 5e6, req: { kind: 'count', stat: 'maxCombo', count: 50, noun: 'combo' }, effect: { stat: 'comboPower', op: 'mul', value: 1.5 }, desc: 'Combo bonuses are 50% bigger (x1.75, x2.5, x4).' },
];

const production: UpgradeDef[] = [
  { id: 'prod.wind', name: 'Stellar Wind', icon: 'sail+swirl', color: '#4A6FC4', cost: 5000, req: { kind: 'total', currency: 'stardust', amount: 10_000 }, effect: { stat: 'productionMult', op: 'mul', value: 1.5 }, desc: 'All engines produce 50% more.' },
  { id: 'prod.flare', name: 'Solar Flare', icon: 'giant+flame', color: '#4A6FC4', cost: 500_000, req: { kind: 'total', currency: 'stardust', amount: 1e6 }, effect: { stat: 'productionMult', op: 'mul', value: 1.5 }, desc: 'All engines produce 50% more.' },
  { id: 'prod.core', name: 'Hot Core', icon: 'atom+flame', color: '#B0701A', cost: 5e7, req: { kind: 'total', currency: 'stardust', amount: 1e8 }, effect: { stat: 'productionMult', op: 'mul', value: 2 }, desc: 'All engines produce twice as much.' },
  { id: 'prod.ignite', name: 'Fusion Ignition', icon: 'atom+bolt', color: '#B0701A', cost: 5e10, req: { kind: 'total', currency: 'stardust', amount: 1e11 }, effect: { stat: 'productionMult', op: 'mul', value: 2 }, desc: 'All engines produce twice as much.' },
  { id: 'prod.torrent', name: 'Plasma Torrent', icon: 'quasar+drop', color: '#B23A8E', cost: 5e13, req: { kind: 'total', currency: 'stardust', amount: 1e14 }, effect: { stat: 'productionMult', op: 'mul', value: 2 }, desc: 'All engines produce twice as much.' },
  { id: 'prod.furnace', name: 'Stellar Furnace', icon: 'foundry+flame', color: '#B23A8E', cost: 5e16, req: { kind: 'total', currency: 'stardust', amount: 1e17 }, effect: { stat: 'productionMult', op: 'mul', value: 3 }, desc: 'All engines produce three times as much.' },
];

const synergy: UpgradeDef[] = [
  { id: 'syn.moonmotes', name: 'Moonlit Motes', icon: 'mote+moon', color: '#6E5CC8', cost: 30_000, req: { kind: 'engine', id: 'moonmill', count: 10 }, effect: { stat: 'engineMult.mote', op: 'mul', perEngine: 'moonmill', each: 0.05 }, desc: 'Spark Motes +5% for every Moon Mill.' },
  { id: 'syn.cometdrill', name: 'Comet-Tipped Drills', icon: 'drill+comet', color: '#C2561E', cost: 400_000, req: { kind: 'engine', id: 'drill', count: 10 }, effect: { stat: 'engineMult.drill', op: 'mul', perEngine: 'catcher', each: 0.02 }, desc: 'Asteroid Drills +2% for every Comet Catcher.' },
  { id: 'syn.siphonsail', name: 'Siphoned Sails', icon: 'sail+drop', color: '#B08A1A', cost: 60e6, req: { kind: 'engine', id: 'sail', count: 10 }, effect: { stat: 'engineMult.sail', op: 'mul', perEngine: 'siphon', each: 0.02 }, desc: 'Solar Sail Arrays +2% for every Gas Giant Siphon.' },
  { id: 'syn.lattice', name: 'Lattice Lighthouses', icon: 'pulsar+chain', color: '#5B45C2', cost: 1e11, req: { kind: 'engine', id: 'pulsar', count: 10 }, effect: { stat: 'engineMult.pulsar', op: 'mul', perEngine: 'dyson', each: 0.01 }, desc: 'Pulsar Lighthouses +1% for every Dyson Lattice.' },
  { id: 'syn.choir', name: 'Quasar Hymns', icon: 'choir+note', color: '#1E8FA8', cost: 2.5e13, req: { kind: 'engine', id: 'choir', count: 10 }, effect: { stat: 'engineMult.choir', op: 'mul', perEngine: 'quasar', each: 0.01 }, desc: 'Celestial Choirs +1% for every Quasar Engine.' },
  { id: 'syn.lantern', name: 'Woven Lanterns', icon: 'lantern+swirl', color: '#6A3FC4', cost: 4e18, req: { kind: 'engine', id: 'lantern', count: 10 }, effect: { stat: 'engineMult.lantern', op: 'mul', perEngine: 'loom', each: 0.01 }, desc: 'Void Lanterns +1% for every Starlight Loom.' },
];

const comets: UpgradeDef[] = [
  { id: 'comet.bait', name: 'Comet Bait', icon: 'comet+hook', color: '#1A9DB8', cost: 5000, req: { kind: 'count', stat: 'comets', count: 1, noun: 'comet' }, effect: { stat: 'cometRate', op: 'mul', value: 1.25 }, desc: 'Comets come 25% more often.' },
  { id: 'comet.tails', name: 'Long Tails', icon: 'comet+clock', color: '#1A9DB8', cost: 200_000, req: { kind: 'count', stat: 'comets', count: 5, noun: 'comet' }, effect: { stat: 'buffDuration', op: 'mul', value: 1.5 }, desc: 'Comet buffs last 50% longer.' },
  { id: 'comet.lure', name: 'Comet Lure', icon: 'comet+magnet', color: '#1A9DB8', cost: 2e6, req: { kind: 'count', stat: 'comets', count: 10, noun: 'comet' }, effect: { stat: 'cometRate', op: 'mul', value: 1.25 }, desc: 'Comets come another 25% more often.' },
  { id: 'comet.gold', name: 'Golden Ice', icon: 'comet+coin', color: '#C99A1E', cost: 50e6, req: { kind: 'count', stat: 'comets', count: 15, noun: 'comet' }, effect: { stat: 'luckyMult', op: 'mul', value: 2 }, desc: 'Lucky comets give twice as much.' },
  { id: 'comet.wish', name: 'Wishing Well', icon: 'comet+clover', color: '#B06BFF', cost: 1e10, req: { kind: 'count', stat: 'comets', count: 25, noun: 'comet' }, effect: { stat: 'wishChance', op: 'mul', value: 3 }, desc: 'Wish comets are three times as likely.' },
];

const offline: UpgradeDef[] = [
  { id: 'off.dream', name: 'Dream Engine', icon: 'moon+gear', color: '#2B7FD0', cost: 1e6, req: { kind: 'tier', tier: 2 }, effect: { stat: 'offlineEfficiency', op: 'add', value: 0.1 }, desc: 'Earn 10% more while away (60% in all).' },
  { id: 'off.night', name: 'Long Night', icon: 'moon+clock', color: '#2B7FD0', cost: 50e6, req: { kind: 'tier', tier: 3 }, effect: { stat: 'offlineCap', op: 'add', value: 7200 }, desc: 'Away time counts up to 2 hours longer.' },
  { id: 'off.lucid', name: 'Lucid Dreams', icon: 'moon+eye', color: '#2B7FD0', cost: 1e12, req: { kind: 'tier', tier: 5 }, effect: { stat: 'offlineEfficiency', op: 'add', value: 0.15 }, desc: 'Earn 15% more while away.' },
];

/** 1.2.0: the general lines carried further into the game (each Stardust one costs the whole total that unlocks it). */
const later: UpgradeDef[] = [
  { id: 'prod.corona', name: 'Corona Harvest', icon: 'giant+swirl', color: '#B23A8E', cost: 1e20, req: { kind: 'total', currency: 'stardust', amount: 1e20 }, effect: { stat: 'productionMult', op: 'mul', value: 2 }, desc: 'Stardust x2.' },
  { id: 'prod.fusion2', name: 'Triple Alpha', icon: 'atom+plus', color: '#B0701A', cost: 1e23, req: { kind: 'total', currency: 'stardust', amount: 1e23 }, effect: { stat: 'productionMult', op: 'mul', value: 2 }, desc: 'Stardust x2.' },
  { id: 'prod.hyper', name: 'Hypernova Seeds', icon: 'shard+swirl', color: '#FF4FC1', cost: 1e26, req: { kind: 'total', currency: 'stardust', amount: 1e26 }, effect: { stat: 'productionMult', op: 'mul', value: 2 }, desc: 'Stardust x2.' },
  { id: 'prod.lens', name: 'Gravity Lens', icon: 'telescope+eye', color: '#5B45C2', cost: 1e30, req: { kind: 'total', currency: 'stardust', amount: 1e30 }, effect: { stat: 'productionMult', op: 'mul', value: 2 }, desc: 'Stardust x2.' },
  { id: 'prod.vacuum', name: 'Vacuum Energy', icon: 'darkmatter+bolt', color: '#3A2470', cost: 1e35, req: { kind: 'total', currency: 'stardust', amount: 1e35 }, effect: { stat: 'productionMult', op: 'mul', value: 2 }, desc: 'Stardust x2.' },
  { id: 'prod.genesis', name: 'Genesis Spark', icon: 'universe+flame', color: '#7B3FD6', cost: 1e40, req: { kind: 'total', currency: 'stardust', amount: 1e40 }, effect: { stat: 'productionMult', op: 'mul', value: 2 }, desc: 'Stardust x2.' },
  { id: 'tap.strike4', name: 'Pulsar Strike', icon: 'pulsar+bolt', color: '#5B45C2', cost: 1e13, req: { kind: 'tier', tier: 6 }, effect: { stat: 'tapSpsShare', op: 'add', spsShare: 0.05 }, desc: 'Each tap also gives another 5% of your Stardust per second.' },
  { id: 'tap.crit3', name: 'Killer Instinct', icon: 'comet+crosshair', color: '#2E9C78', cost: 1e10, req: { kind: 'count', stat: 'crits', count: 2500, noun: 'crit' }, effect: { stat: 'critMult', op: 'add', value: 5 }, desc: 'Crits hit 5 times harder (added to the crit multiplier).' },
  { id: 'tap.combo3', name: 'White Heat', icon: 'giant+arrowup', color: '#C23F6A', cost: 1e11, req: { kind: 'count', stat: 'taps', count: 25_000, noun: 'tap' }, effect: { stat: 'comboPower', op: 'mul', value: 1.5 }, desc: 'Combos build a stronger bonus (x1.5).' },
  { id: 'comet.storm', name: 'Comet Storm', icon: 'comet+swirl', color: '#1A9DB8', cost: 5e12, req: { kind: 'count', stat: 'comets', count: 50, noun: 'comet' }, effect: { stat: 'cometRate', op: 'mul', value: 1.25 }, desc: 'Comets come 25% more often.' },
  { id: 'comet.ages', name: 'Ages of Ice', icon: 'comet+bell', color: '#1A9DB8', cost: 1e16, req: { kind: 'count', stat: 'comets', count: 100, noun: 'comet' }, effect: { stat: 'buffDuration', op: 'mul', value: 1.5 }, desc: 'Comet buffs last 50% longer.' },
  { id: 'comet.jackpot', name: 'Jackpot Ice', icon: 'comet+drop', color: '#C99A1E', cost: 1e20, req: { kind: 'count', stat: 'comets', count: 200, noun: 'comet' }, effect: { stat: 'luckyMult', op: 'mul', value: 3 }, desc: 'Lucky comets give 3 times as much.' },
  { id: 'off.deep', name: 'Deep Sleep', icon: 'moon+bell', color: '#2B7FD0', cost: 1e15, req: { kind: 'tier', tier: 7 }, effect: { stat: 'offlineCap', op: 'add', value: 14_400 }, desc: 'Away time counts for 4 more hours.' },
  { id: 'off.dreamer', name: 'Star Dreamer', icon: 'moon+stardust', color: '#2B7FD0', cost: 1e20, req: { kind: 'tier', tier: 9 }, effect: { stat: 'offlineEfficiency', op: 'add', value: 0.1 }, desc: 'Earn 10% more while away.' },
];

export const UPGRADES: readonly UpgradeDef[] = [...tap, ...production, ...engineDoublers, ...synergy, ...comets, ...offline, ...later];

export const UPGRADE_BY_ID: ReadonlyMap<string, UpgradeDef> = new Map(UPGRADES.map((u) => [u.id, u]));

/** Plain words for when an effect applies, as Upgradex's tooltips do. */
export function whenItApplies(e: UpgradeEffect): string {
  if ('spsShare' in e) return 'Added to each tap after all multipliers';
  if ('perEngine' in e) return e.op === 'add' ? 'Added to tap power before multipliers' : 'Multiplies that engine after its milestones';
  return e.op === 'add' ? 'Added before multipliers' : 'Multiplies after additions';
}
