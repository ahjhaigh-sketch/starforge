/**
 * The Starforge (Game design: "Furnace to Alloys to Relics"; Math and balance: "Starforge numbers").
 * Ore of each grade is smelted into that grade's Star Alloy; alloy crafts and levels relics.
 * Tunable numbers live in balance.ts (BALANCE.forge, BALANCE.relics); this file holds the tables.
 * IDs never change.
 */
export interface GradeDef {
  /** Same ids as the asteroid rarities. */
  id: 'iron' | 'gold' | 'crystal' | 'prismatic' | 'void';
  name: string;
  /** The ore it smelts: Iron uses the common ore every asteroid gives. */
  ore: string;
  alloy: string;
  color: string;
}

export const GRADES: readonly GradeDef[] = [
  { id: 'iron', name: 'Iron', ore: 'ore', alloy: 'alloy.iron', color: '#8C97C2' },
  { id: 'gold', name: 'Gold', ore: 'ore.gold', alloy: 'alloy.gold', color: '#FFC83D' },
  { id: 'crystal', name: 'Crystal', ore: 'ore.crystal', alloy: 'alloy.crystal', color: '#9FE7FF' },
  { id: 'prismatic', name: 'Prismatic', ore: 'ore.prismatic', alloy: 'alloy.prismatic', color: '#FF9EF0' },
  { id: 'void', name: 'Void', ore: 'ore.void', alloy: 'alloy.void', color: '#9B7CFF' },
];

export type GradeId = GradeDef['id'];
export const GRADE_BY_ID: ReadonlyMap<string, GradeDef> = new Map(GRADES.map((g) => [g.id, g]));

export type ForgeUpgradeId = 'speed' | 'bulk' | 'crucibles';

export const FORGE_UPGRADES: ReadonlyArray<{ id: ForgeUpgradeId; name: string; desc: string; icon: string }> = [
  { id: 'speed', name: 'Mag-Belt speed', desc: 'Batches smelt 10% faster.', icon: 'turbine' },
  { id: 'bulk', name: 'Bulk smelting', desc: 'One more batch of ore (and alloy) per smelt.', icon: 'bellows' },
  { id: 'crucibles', name: 'Crucibles', desc: 'Capacity: smelt one more batch at the same time.', icon: 'foundry' },
];

/**
 * How a relic's effect reaches its stat. Effect = base x 1.25^(level - 1):
 * 'mul' multiplies by (1 + effect), 'add' adds the effect, 'reduce' divides by (1 + effect).
 */
export type RelicKind = 'mul' | 'add' | 'reduce';

export interface RelicDef {
  id: string;
  name: string;
  grade: GradeId;
  stat: string;
  kind: RelicKind;
  base: number;
  /** For stats with a natural ceiling (beam size, crit chance, offline cap). */
  maxLevel?: number;
  icon: string;
  /** What the effect does, for "+X% <what>". */
  what: string;
}

const r = (id: string, name: string, grade: GradeId, stat: string, kind: RelicKind, base: number, icon: string, what: string, maxLevel?: number): RelicDef => ({
  id,
  name,
  grade,
  stat,
  kind,
  base,
  icon,
  what,
  ...(maxLevel ? { maxLevel } : {}),
});

export const RELICS: readonly RelicDef[] = [
  // Iron
  r('anvil', 'Anvil of Dawn', 'iron', 'productionMult', 'mul', 0.25, 'foundry', 'engine output'),
  r('hammer', 'Starforge Hammer', 'iron', 'tapPower', 'mul', 0.25, 'stardust', 'tap power'),
  r('hook', 'Comet Hook', 'iron', 'cometRate', 'mul', 0.1, 'comet', 'comet rate', 10),
  r('lodestone', 'Lodestone', 'iron', 'beamRadius', 'add', 3, 'orbit', 'px tractor beam', 10),
  r('ladle', 'Ore Ladle', 'iron', 'oreGain', 'mul', 0.1, 'belt', 'ore gain'),
  r('bellows', 'Great Bellows', 'iron', 'forgeSpeed', 'mul', 0.1, 'bellows', 'smelting speed'),
  r('tongs', 'Ember Tongs', 'iron', 'critMult', 'mul', 0.1, 'pulse', 'crit size'),
  r('lantern', "Miner's Lantern", 'iron', 'beltLuck', 'mul', 0.05, 'lantern', 'asteroid luck', 10),
  r('whetstone', 'Whetstone', 'iron', 'drillPower', 'mul', 0.25, 'drill', 'drilling'),
  r('ingot', 'Lucky Ingot', 'iron', 'xpGain', 'mul', 0.1, 'level', 'Starsmith XP'),
  // Gold
  r('crown', 'Crown of Nova', 'gold', 'shardGain', 'mul', 0.05, 'shard', 'shard gain'),
  r('hourglass', 'Hourglass of Embers', 'gold', 'offlineCap', 'add', 1800, 'moon', 'offline cap', 10),
  r('scales', 'Golden Scales', 'gold', 'engineCostMult', 'reduce', 0.05, 'upgrade', 'cheaper engines'),
  r('chalice', 'Sun Chalice', 'gold', 'frenzyMult', 'mul', 0.1, 'comet', 'Frenzy size'),
  r('sextant', 'Star Sextant', 'gold', 'planetPower', 'mul', 0.1, 'orbit', 'planet bonuses'),
  r('medallion', 'Mastery Medallion', 'gold', 'masteryMult', 'add', 0.02, 'mastery', 'mastery per rank', 10),
  r('compass', 'Quest Compass', 'gold', 'questRewardMult', 'mul', 0.1, 'quests', 'quest rewards'),
  r('censer', 'Combo Censer', 'gold', 'comboPower', 'mul', 0.1, 'pulse', 'combo bonus'),
  r('pick', 'Golden Pick', 'gold', 'drillPower', 'mul', 0.3, 'drill', 'drilling'),
  r('horn', 'Herald Horn', 'gold', 'buffDuration', 'mul', 0.05, 'choir', 'comet buff length', 10),
  // Crystal
  r('prism', 'Prism Lens', 'crystal', 'productionMult', 'mul', 0.3, 'quasar', 'engine output'),
  r('resonator', 'Crystal Resonator', 'crystal', 'tapstormMult', 'mul', 0.1, 'pulse', 'Tapstorm size'),
  r('geode', 'Geode Heart', 'crystal', 'beltCap', 'add', 2, 'belt', 'asteroids in the field', 10),
  r('focus', 'Focusing Crystal', 'crystal', 'critChance', 'add', 0.005, 'pulsar', 'crit chance', 10),
  r('echo', 'Echo Shard', 'crystal', 'autoSpeed', 'mul', 0.1, 'auto', 'auto-buyer speed', 10),
  r('clock', 'Crystal Clock', 'crystal', 'offlineEfficiency', 'add', 0.02, 'moon', 'offline efficiency', 10),
  r('lens', "Seer's Lens", 'crystal', 'wishChance', 'mul', 0.1, 'comet', 'Wish comet chance', 10),
  r('spire', 'Crystal Spire', 'crystal', 'milestoneBase', 'add', 0.01, 'upgrade', 'engine milestone size', 10),
  r('orb', 'Lucky Orb', 'crystal', 'luckyMult', 'mul', 0.1, 'comet', 'Lucky comet size'),
  r('spindle', 'Growth Spindle', 'crystal', 'beltSpawn', 'mul', 0.05, 'turbine', 'asteroid arrivals', 10),
  // Prismatic
  r('rainbow', 'Rainbow Core', 'prismatic', 'productionMult', 'mul', 0.4, 'dyson', 'engine output'),
  r('aurora', 'Aurora Band', 'prismatic', 'tapPower', 'mul', 0.4, 'stardust', 'tap power'),
  r('kaleido', 'Kaleidoscope', 'prismatic', 'beltLuck', 'mul', 0.05, 'lantern', 'asteroid luck', 10),
  r('halo', 'Prism Halo', 'prismatic', 'shardGain', 'mul', 0.08, 'shard', 'shard gain'),
  r('veil', 'Spectral Veil', 'prismatic', 'oreGain', 'mul', 0.2, 'belt', 'ore gain'),
  r('splitter', 'Beam Splitter', 'prismatic', 'alloyGain', 'mul', 0.1, 'forge', 'alloy gain'),
  r('flare', 'Solar Flare', 'prismatic', 'critMult', 'mul', 0.2, 'pulse', 'crit size'),
  r('loom', 'Starloom', 'prismatic', 'forgeSpeed', 'mul', 0.15, 'loom', 'smelting speed'),
  r('crucible', 'Prismatic Crucible', 'prismatic', 'tierCostMult', 'reduce', 0.05, 'upgrade', 'cheaper evolving'),
  r('mirror', 'Twin Mirror', 'prismatic', 'xpGain', 'mul', 0.2, 'level', 'Starsmith XP'),
  // Void
  r('singularity', 'Pocket Singularity', 'void', 'productionMult', 'mul', 0.5, 'nebula', 'engine output'),
  r('abyss', 'Abyssal Hammer', 'void', 'tapPower', 'mul', 0.5, 'stardust', 'tap power'),
  r('eventide', 'Eventide Crown', 'void', 'shardGain', 'mul', 0.1, 'shard', 'shard gain'),
  r('hollow', 'Hollow Star', 'void', 'engineCostMult', 'reduce', 0.1, 'giant', 'cheaper engines'),
  r('maw', 'Void Maw', 'void', 'oreGain', 'mul', 0.3, 'belt', 'ore gain'),
  r('nullforge', 'Null Forge', 'void', 'alloyGain', 'mul', 0.15, 'forge', 'alloy gain'),
  r('dusk', 'Dusk Lantern', 'void', 'offlineEfficiency', 'add', 0.03, 'lantern', 'offline efficiency', 10),
  r('rift', 'Rift Compass', 'void', 'drillPower', 'mul', 0.4, 'drill', 'drilling'),
  r('omen', 'Black Omen', 'void', 'frenzyMult', 'mul', 0.2, 'comet', 'Frenzy size'),
  r('tome', 'Tome of Night', 'void', 'xpGain', 'mul', 0.3, 'level', 'Starsmith XP'),
];

export const RELIC_BY_ID: ReadonlyMap<string, RelicDef> = new Map(RELICS.map((x) => [x.id, x]));
