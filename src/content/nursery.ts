/**
 * The Star Nursery (Game design: "More mid systems"): star seeds grow in nebula-cloud plots through
 * five stages and are harvested for Essence and seeds. Five base species; crossbreeding two species
 * makes one of the others, exactly as CROSSBREEDS says: 10 crosses of base pairs, then 10 crosses of
 * those, 25 species in all. IDs never change.
 */
export interface StarSpecies {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  color: string;
  /** Seconds to ripen at x1 growth. */
  grow: number;
  /** Essence per harvest at x1 yield. */
  value: number;
}

const T = { 1: { grow: 30, value: 5 }, 2: { grow: 90, value: 60 }, 3: { grow: 300, value: 800 } } as const;

const RAW: Array<[string, string, 1 | 2 | 3, string]> = [
  // base seeds: bought with Essence, or brought home by starships
  ['ember', 'Ember Dwarf', 1, '#FF5640'],
  ['sol', 'Sol Star', 1, '#FFC83D'],
  ['azure', 'Azure Giant', 1, '#4FB6FF'],
  ['frost', 'Frost Dwarf', 1, '#E8E0FF'],
  ['umber', 'Umber Dwarf', 1, '#A0673A'],
  // crosses of two base species
  ['flare', 'Flare Star', 2, '#FF8A3D'],
  ['violet', 'Violet Giant', 2, '#B06BFF'],
  ['rose', 'Rose Dwarf', 2, '#FF7AE0'],
  ['cinder', 'Cinder Star', 2, '#C2453A'],
  ['jade', 'Jade Sun', 2, '#5FD39B'],
  ['pearl', 'Pearl Star', 2, '#FFF4D6'],
  ['amber', 'Amber Giant', 2, '#FFB347'],
  ['ice', 'Ice Giant', 2, '#9FE7FF'],
  ['storm', 'Storm Star', 2, '#2B7FD0'],
  ['ash', 'Ash Dwarf', 2, '#8C97C2'],
  // crosses of crosses
  ['aurora', 'Aurora Star', 3, '#2EE6FF'],
  ['heart', 'Nebula Heart', 3, '#C23FA0'],
  ['opal', 'Opal Star', 3, '#F2D8FF'],
  ['magma', 'Magma Sun', 3, '#FF4F2E'],
  ['thunder', 'Thunder Star', 3, '#FFE08A'],
  ['bloom', 'Nova Bloom', 3, '#FF4FC1'],
  ['emerald', 'Emerald Crown', 3, '#7DFF5A'],
  ['glacier', 'Glacier Titan', 3, '#B9C4FF'],
  ['obsidian', 'Obsidian Star', 3, '#3A2470'],
  ['ruby', 'Ruby Heart', 3, '#E0245E'],
];

export const STAR_SPECIES: readonly StarSpecies[] = RAW.map(([id, name, tier, color]) => ({ id: `star.${id}`, name, tier, color, grow: T[tier].grow, value: T[tier].value }));

export const STAR_BY_ID: ReadonlyMap<string, StarSpecies> = new Map(STAR_SPECIES.map((x) => [x.id, x]));

export const BASE_SEEDS: readonly string[] = STAR_SPECIES.filter((x) => x.tier === 1).map((x) => x.id);

/** [parent, parent, child]: the order of the parents doesn't matter. */
export const CROSSBREEDS: ReadonlyArray<readonly [string, string, string]> = (
  [
    ['ember', 'sol', 'flare'],
    ['ember', 'azure', 'violet'],
    ['ember', 'frost', 'rose'],
    ['ember', 'umber', 'cinder'],
    ['sol', 'azure', 'jade'],
    ['sol', 'frost', 'pearl'],
    ['sol', 'umber', 'amber'],
    ['azure', 'frost', 'ice'],
    ['azure', 'umber', 'storm'],
    ['frost', 'umber', 'ash'],
    ['flare', 'jade', 'aurora'],
    ['violet', 'ice', 'heart'],
    ['rose', 'pearl', 'opal'],
    ['cinder', 'amber', 'magma'],
    ['storm', 'ash', 'thunder'],
    ['flare', 'violet', 'bloom'],
    ['jade', 'pearl', 'emerald'],
    ['ice', 'storm', 'glacier'],
    ['amber', 'ash', 'obsidian'],
    ['rose', 'cinder', 'ruby'],
  ] as const
).map(([a, b, c]) => [`star.${a}`, `star.${b}`, `star.${c}`] as const);

/** What two species cross into (null if they don't). */
export function crossOf(a: string, b: string): string | null {
  for (const [x, y, c] of CROSSBREEDS) if ((x === a && y === b) || (x === b && y === a)) return c;
  return null;
}

/** The five stages a plot shows as it grows. */
export const STAGES = ['Seed', 'Cloud', 'Protostar', 'Young star', 'Bright star'] as const;

export const NURSERY_UPGRADES: ReadonlyArray<{ id: string; name: string; desc: string; max: number }> = [
  { id: 'plots', name: 'More plots', desc: 'One more nebula plot.', max: 9 },
  // capped: growth and yield bought with the Essence they make would otherwise feed themselves
  { id: 'growth', name: 'Warm clouds', desc: 'Stars grow 25% faster.', max: 20 },
  { id: 'yield', name: 'Rich dust', desc: 'Every harvest gives 50% more Essence.', max: 50 },
  { id: 'tending', name: 'Tending', desc: 'Ripe stars harvest and replant themselves, offline too.', max: 1 },
];
