import { ENGINES } from './engines';
import type { Requirement } from './requirements';
import { TIERS } from './tiers';

/**
 * Medals (achievements) and Goals for the Stardust layer. Every medal is +1% Stardust, forever.
 * Goals are tiered tracks: each tier reached adds Rune Luck and Rune Bulk (they power the rune
 * shrines from the Nebula on) and +1% Stardust. IDs never change once released.
 */
export interface MedalDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  req: Requirement;
}

const totalNames = ['Spark', 'Glow', 'Shine', 'Radiance', 'A Million Lights', 'Brilliance', 'Blaze', 'Billion Suns', 'Starfall', 'Lightstorm', 'Trillion Gleams', 'Solar Tide', 'Stellar Ocean', 'Quadrillion Sparks', 'A Galaxy’s Worth', 'Cosmic Hoard', 'Quintillion Glimmers', 'Light Beyond Light', 'Endless Dawn', 'Sextillion Stars'];
const rateNames = ['Trickle', 'Stream', 'Brook', 'River', 'Torrent', 'Cascade', 'Flood', 'Deluge', 'Monsoon', 'Maelstrom', 'Starstream', 'Sunflow', 'Galactic Current', 'Cosmic Flow', 'Light Engine', 'Endless River'];
const tierNames = ['Little Red', 'Golden Hour', 'Feeling Blue', 'Red Giant Energy', 'Hyperdrive', 'Dense Thoughts', 'Magnetic Personality', 'Pulse Check', 'Quasi Legend', 'Blazing Trail', 'White Out'];

const single = (name: string) => name.replace(/s$/, '');

export const MEDALS: readonly MedalDef[] = [
  { id: 'tap.first', name: 'First Touch', desc: 'Tap the Star Core.', icon: 'stardust', req: { kind: 'count', stat: 'taps', count: 1, noun: 'tap' } },
  { id: 'tap.1k', name: 'Tap Dancer', desc: 'Tap the star 1,000 times.', icon: 'stardust', req: { kind: 'count', stat: 'taps', count: 1000, noun: 'tap' } },
  { id: 'crit.first', name: 'Critical!', desc: 'Land a critical tap.', icon: 'stardust', req: { kind: 'count', stat: 'crits', count: 1, noun: 'crit' } },
  { id: 'combo.max', name: 'Fever', desc: 'Reach a combo of 50 taps in a row.', icon: 'pulse', req: { kind: 'count', stat: 'maxCombo', count: 50, noun: 'combo' } },
  { id: 'comet.first', name: 'Wish Upon a Comet', desc: 'Catch a comet.', icon: 'comet', req: { kind: 'count', stat: 'comets', count: 1, noun: 'comet' } },
  { id: 'comet.50', name: 'Comet Chaser', desc: 'Catch 50 comets.', icon: 'comet', req: { kind: 'count', stat: 'comets', count: 50, noun: 'comet' } },
  ...totalNames.map((name, i): MedalDef => ({ id: `total.${i}`, name, desc: `Gather ${(10 ** (i + 2)).toLocaleString('en-US')} Stardust in total.`, icon: 'stardust', req: { kind: 'total', currency: 'stardust', amount: 10 ** (i + 2) } })),
  ...rateNames.map((name, i): MedalDef => ({ id: `rate.${i}`, name, desc: `Make ${(10 ** i).toLocaleString('en-US')} Stardust a second.`, icon: 'stats', req: { kind: 'rate', amount: 10 ** i } })),
  ...tierNames.map((name, i): MedalDef => ({ id: `tier.${i + 1}`, name, desc: `Evolve your star to ${TIERS[i + 1]!.name}.`, icon: 'level', req: { kind: 'tier', tier: i + 1 } })),
  ...ENGINES.flatMap((e): MedalDef[] => [
    { id: `own.${e.id}.1`, name: `First ${single(e.name)}`, desc: `Own a ${single(e.name)}.`, icon: e.icon, req: { kind: 'engine', id: e.id, count: 1 } },
    { id: `own.${e.id}.50`, name: `${single(e.name)} Fleet`, desc: `Own 50 ${e.name}.`, icon: e.icon, req: { kind: 'engine', id: e.id, count: 50 } },
    { id: `own.${e.id}.100`, name: `${single(e.name)} Empire`, desc: `Own 100 ${e.name}.`, icon: e.icon, req: { kind: 'engine', id: e.id, count: 100 } },
  ]),
  { id: 'upg.1', name: 'Tinkerer', desc: 'Buy an upgrade.', icon: 'upgrade', req: { kind: 'upgrades', count: 1 } },
  { id: 'upg.10', name: 'Engineer', desc: 'Buy 10 upgrades.', icon: 'upgrade', req: { kind: 'upgrades', count: 10 } },
  { id: 'upg.25', name: 'Architect', desc: 'Buy 25 upgrades.', icon: 'upgrade', req: { kind: 'upgrades', count: 25 } },
  { id: 'upg.50', name: 'Starwright', desc: 'Buy 50 upgrades.', icon: 'upgrade', req: { kind: 'upgrades', count: 50 } },
];

export const MEDAL_BY_ID: ReadonlyMap<string, MedalDef> = new Map(MEDALS.map((m) => [m.id, m]));

export interface GoalDef {
  id: string;
  name: string;
  icon: string;
  /** A counter in state.stats, or 'stardustAll' for the all-time Stardust total. */
  stat: string;
  noun: string;
  tiers: readonly number[];
}

export const GOALS: readonly GoalDef[] = [
  { id: 'taps', name: 'Tapper', icon: 'stardust', stat: 'taps', noun: 'taps', tiers: [100, 1000, 10_000, 50_000, 250_000, 1e6, 5e6, 25e6, 1e8, 1e9] },
  { id: 'comets', name: 'Comet Catcher', icon: 'comet', stat: 'comets', noun: 'comets caught', tiers: [1, 5, 15, 40, 100, 250, 600, 1500, 4000, 10_000] },
  { id: 'engines', name: 'Builder', icon: 'drill', stat: 'enginesBought', noun: 'engines bought', tiers: [50, 250, 1000, 5000, 25_000, 100_000, 500_000, 2.5e6, 1e7, 5e7] },
  { id: 'crits', name: 'Sharpshooter', icon: 'pulse', stat: 'crits', noun: 'crits', tiers: [10, 100, 1000, 5000, 25_000, 100_000, 500_000, 2.5e6, 1e7, 1e8] },
  { id: 'stardust', name: 'Gatherer', icon: 'stardust', stat: 'stardustAll', noun: 'Stardust gathered', tiers: [1e4, 1e6, 1e9, 1e12, 1e15, 1e18, 1e21, 1e25, 1e30, 1e40] },
];

export const GOAL_BY_ID: ReadonlyMap<string, GoalDef> = new Map(GOALS.map((g) => [g.id, g]));
