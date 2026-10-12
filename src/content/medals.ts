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
  { id: 'nova.1', name: 'Big Bang Theory', desc: 'Go Supernova.', icon: 'shard', req: { kind: 'count', stat: 'supernovas', count: 1, noun: 'Supernova' } },
  { id: 'nova.5', name: 'Serial Exploder', desc: 'Go Supernova 5 times.', icon: 'shard', req: { kind: 'count', stat: 'supernovas', count: 5, noun: 'Supernova' } },
  { id: 'nova.12', name: 'Hands Off', desc: 'Go Supernova 12 times.', icon: 'shard', req: { kind: 'count', stat: 'supernovas', count: 12, noun: 'Supernova' } },
  { id: 'nova.30', name: 'Nebula Bound', desc: 'Go Supernova 30 times.', icon: 'shard', req: { kind: 'count', stat: 'supernovas', count: 30, noun: 'Supernova' } },
  // Phase 5 and 6: the Belt, Deep Core, Starsmith Level, the Starforge and the Codex
  { id: 'belt.100', name: "Space Sweeper", desc: "Harvest 100 asteroids.", icon: 'belt', req: { kind: 'count', stat: 'harvested', count: 100, noun: 'asteroid' } },
  { id: 'belt.1k', name: "Rock Collector", desc: "Harvest 1,000 asteroids.", icon: 'belt', req: { kind: 'count', stat: 'harvested', count: 1000, noun: 'asteroid' } },
  { id: 'belt.10k', name: "Belt Baron", desc: "Harvest 10,000 asteroids.", icon: 'belt', req: { kind: 'count', stat: 'harvested', count: 10000, noun: 'asteroid' } },
  { id: 'beltTier.1', name: "Tier Up Top", desc: "Reach Belt Tier 1.", icon: 'belt', req: { kind: 'count', stat: 'beltTier', count: 1, noun: 'Belt Tier' } },
  { id: 'beltTier.3', name: "Ore Flow", desc: "Reach Belt Tier 3.", icon: 'belt', req: { kind: 'count', stat: 'beltTier', count: 3, noun: 'Belt Tier' } },
  { id: 'beltTier.6', name: "Drone Fleet", desc: "Reach Belt Tier 6.", icon: 'belt', req: { kind: 'count', stat: 'beltTier', count: 6, noun: 'Belt Tier' } },
  { id: 'cores.5', name: "Into the Mantle", desc: "Break 5 cores in the Deep Core.", icon: 'drill', req: { kind: 'count', stat: 'cores', count: 5, noun: 'core' } },
  { id: 'cores.10', name: "Core Sample", desc: "Break 10 cores in the Deep Core.", icon: 'drill', req: { kind: 'count', stat: 'cores', count: 10, noun: 'core' } },
  { id: 'cores.15', name: "Seam Seeker", desc: "Break 15 cores in the Deep Core.", icon: 'drill', req: { kind: 'count', stat: 'cores', count: 15, noun: 'core' } },
  { id: 'level.5', name: "Apprentice Smith", desc: "Reach Starsmith Level 5.", icon: 'level', req: { kind: 'count', stat: 'level', count: 5, noun: 'Starsmith Level' } },
  { id: 'level.15', name: "Journeyman", desc: "Reach Starsmith Level 15.", icon: 'level', req: { kind: 'count', stat: 'level', count: 15, noun: 'Starsmith Level' } },
  { id: 'level.30', name: "Master Starsmith", desc: "Reach Starsmith Level 30.", icon: 'level', req: { kind: 'count', stat: 'level', count: 30, noun: 'Starsmith Level' } },
  { id: 'smelt.1', name: "First Pour", desc: "Smelt a batch of alloy.", icon: 'ingot', req: { kind: 'count', stat: 'smelts', count: 1, noun: 'smelt' } },
  { id: 'smelt.100', name: "Foundry Floor", desc: "Smelt 100 batches.", icon: 'ingot', req: { kind: 'count', stat: 'smelts', count: 100, noun: 'smelt' } },
  { id: 'smelt.1k', name: "Molten Empire", desc: "Smelt 1,000 batches.", icon: 'ingot', req: { kind: 'count', stat: 'smelts', count: 1000, noun: 'smelt' } },
  { id: 'relic.1', name: "Relic Hunter", desc: "Craft a relic.", icon: 'forge', req: { kind: 'count', stat: 'relics', count: 1, noun: 'relic' } },
  { id: 'relic.10', name: "Collector", desc: "Craft 10 relics.", icon: 'forge', req: { kind: 'count', stat: 'relics', count: 10, noun: 'relic' } },
  { id: 'relic.25', name: "Hoarder", desc: "Craft 25 relics.", icon: 'forge', req: { kind: 'count', stat: 'relics', count: 25, noun: 'relic' } },
  { id: 'relic.50', name: "Full Armoury", desc: "Craft all 50 relics.", icon: 'forge', req: { kind: 'count', stat: 'relics', count: 50, noun: 'relic' } },
  { id: 'element.8', name: "Breath of Stars", desc: "Find 8 elements for the Codex.", icon: 'atom', req: { kind: 'count', stat: 'elements', count: 8, noun: 'element' } },
  { id: 'element.26', name: "Iron Heart", desc: "Find 26 elements, up to iron.", icon: 'atom', req: { kind: 'count', stat: 'elements', count: 26, noun: 'element' } },
  { id: 'element.56', name: "Heavy Metal", desc: "Find 56 elements, up to barium.", icon: 'atom', req: { kind: 'count', stat: 'elements', count: 56, noun: 'element' } },
  { id: 'element.92', name: "Uranium Age", desc: "Find 92 elements, up to uranium.", icon: 'atom', req: { kind: 'count', stat: 'elements', count: 92, noun: 'element' } },
  { id: 'element.118', name: "Every Element", desc: "Find all 118 elements.", icon: 'atom', req: { kind: 'count', stat: 'elements', count: 118, noun: 'element' } },
  // Phase 8: the Nebula and Constellation Runes
  { id: 'nebula.1', name: "Into the Mist", desc: "Go Nebula.", icon: 'nebula', req: { kind: 'count', stat: 'nebulasAll', count: 1, noun: 'Nebula' } },
  { id: 'nebula.5', name: "Cloud Walker", desc: "Go Nebula 5 times.", icon: 'nebula', req: { kind: 'count', stat: 'nebulasAll', count: 5, noun: 'Nebula' } },
  { id: 'nebula.10', name: "Free Star", desc: "Go Nebula 10 times.", icon: 'nebula', req: { kind: 'count', stat: 'nebulasAll', count: 10, noun: 'Nebula' } },
  { id: 'runes.1', name: "First Rune", desc: "Find a rune.", icon: 'rune', req: { kind: 'count', stat: 'runesFound', count: 1, noun: 'rune' } },
  { id: 'runes.25', name: "Rune Reader", desc: "Find 25 different runes.", icon: 'rune', req: { kind: 'count', stat: 'runesFound', count: 25, noun: 'rune' } },
  { id: 'runes.75', name: "Constellation Keeper", desc: "Find 75 different runes.", icon: 'rune', req: { kind: 'count', stat: 'runesFound', count: 75, noun: 'rune' } },
  { id: 'rolls.1m', name: "A Million Throws", desc: "Roll a million runes.", icon: 'rune', req: { kind: 'count', stat: 'runesRolled', count: 1000000, noun: 'rune rolled' } },
  { id: 'rolls.1t', name: "Rune Storm", desc: "Roll a trillion runes.", icon: 'rune', req: { kind: 'count', stat: 'runesRolled', count: 1000000000000, noun: 'rune rolled' } },
  // Phase 9: Rune Starring and Crafting, Celestial Auras, Mutations
  { id: 'stars.1', name: "First Star", desc: "Give a shrine its first star.", icon: 'starrank', req: { kind: 'count', stat: 'starsEarned', count: 1, noun: 'star' } },
  { id: 'stars.10', name: "Constellation Crown", desc: "Earn 10 shrine stars.", icon: 'starrank', req: { kind: 'count', stat: 'starsEarned', count: 10, noun: 'star' } },
  { id: 'craft.1', name: "Runesmith", desc: "Craft a rune from Rune Shards.", icon: 'rune', req: { kind: 'count', stat: 'runesCrafted', count: 1, noun: 'rune crafted' } },
  { id: 'auras.1', name: "Haloed", desc: "Find a Celestial Aura.", icon: 'aura', req: { kind: 'count', stat: 'aurasFound', count: 1, noun: 'aura' } },
  { id: 'auras.15', name: "Aura Collector", desc: "Find 15 different auras.", icon: 'aura', req: { kind: 'count', stat: 'aurasFound', count: 15, noun: 'aura' } },
  { id: 'auras.30', name: "Every Light in the Sky", desc: "Find all 30 auras.", icon: 'aura', req: { kind: 'count', stat: 'aurasFound', count: 30, noun: 'aura' } },
  { id: 'mutations.1', name: "Something Shiny", desc: "Find a mutation.", icon: 'mutation', req: { kind: 'count', stat: 'mutationsFound', count: 1, noun: 'mutation' } },
  { id: 'mutations.50', name: "Strange Matter", desc: "Find 50 kinds of mutation.", icon: 'mutation', req: { kind: 'count', stat: 'mutationsFound', count: 50, noun: 'mutation' } },
  // Phase 10: Void Wyrms and the Star Nursery
  { id: 'wyrms.1', name: "It Hatched!", desc: "Hatch a Void Wyrm.", icon: 'wyrm', req: { kind: 'count', stat: 'wyrmsHatched', count: 1, noun: 'Wyrm hatched' } },
  { id: 'wyrms.100', name: "Brood Mother", desc: "Hatch 100 Void Wyrms.", icon: 'wyrm', req: { kind: 'count', stat: 'wyrmsHatched', count: 100, noun: 'Wyrm hatched' } },
  { id: 'wyrms.fuse', name: "Five Become One", desc: "Fuse five Wyrms.", icon: 'wyrm', req: { kind: 'count', stat: 'wyrmFusions', count: 1, noun: 'fusion' } },
  { id: 'wyrms.catch', name: "Comet Snack", desc: "Let your Wyrms catch 25 comets.", icon: 'comet', req: { kind: 'count', stat: 'wyrmCatches', count: 25, noun: 'comet caught by a Wyrm' } },
  { id: 'nursery.1', name: "Green Thumb", desc: "Harvest a nursery star.", icon: 'nursery', req: { kind: 'count', stat: 'nurseryHarvests', count: 1, noun: 'harvest' } },
  { id: 'nursery.cross', name: "New Breed", desc: "Crossbreed two star seeds.", icon: 'nursery', req: { kind: 'count', stat: 'crossbreeds', count: 1, noun: 'crossbreed' } },
  // Phase 11: Spectral Focus and Tarot of the Void
  { id: 'spectral.10', name: "Ten Orders Deep", desc: "Bring a colour to 10 orders of magnitude of energy.", icon: 'prism', req: { kind: 'count', stat: 'spectralBest', count: 10, noun: 'order of magnitude' } },
  { id: 'spectral.7', name: "Full Spectrum", desc: "Open all seven colours.", icon: 'prism', req: { kind: 'count', stat: 'spectralColors', count: 7, noun: 'colour' } },
  { id: 'cards.1', name: "First Draw", desc: "Draw a tarot card.", icon: 'card', req: { kind: 'count', stat: 'cardsDrawn', count: 1, noun: 'card' } },
  { id: 'cards.30', name: "Half a Deck", desc: "Own 30 tarot cards.", icon: 'card', req: { kind: 'count', stat: 'cardsDrawn', count: 30, noun: 'card' } },
  { id: 'cards.60', name: "The Whole Void", desc: "Own all 60 tarot cards.", icon: 'card', req: { kind: 'count', stat: 'cardsDrawn', count: 60, noun: 'card' } },
  // Phase 12: the Singularity
  { id: 'singularity.1', name: "Event Horizon", desc: "Go Singularity.", icon: 'darkmatter', req: { kind: 'count', stat: 'singularitiesAll', count: 1, noun: 'Singularity' } },
  { id: 'singularity.10', name: "Frequent Faller", desc: "Go Singularity 10 times.", icon: 'darkmatter', req: { kind: 'count', stat: 'singularitiesAll', count: 10, noun: 'Singularity' } },
  { id: 'bh.4', name: "Red Giant Hunger", desc: "Bring the Black Hole to its red stage.", icon: 'blackhole', req: { kind: 'count', stat: 'bhStageBest', count: 4, noun: 'Black Hole stage' } },
  { id: 'bh.8', name: "Rainbow Abyss", desc: "Bring the Black Hole to its rainbow stage.", icon: 'blackhole', req: { kind: 'count', stat: 'bhStageBest', count: 8, noun: 'Black Hole stage' } },
  { id: 'trial.1', name: "Tried and Tested", desc: "Finish a Trial.", icon: 'trial', req: { kind: 'count', stat: 'trialsDone', count: 1, noun: 'Trial finished' } },
  { id: 'trial.20', name: "Trial by Fire", desc: "Earn 20 Trial levels.", icon: 'trial', req: { kind: 'count', stat: 'trialLevels', count: 20, noun: 'Trial level' } },
  { id: 'spire.10', name: "First Pennant", desc: "Reach floor 10 of the Spire.", icon: 'spire', req: { kind: 'count', stat: 'spireBest', count: 10, noun: 'Spire floor' } },
  { id: 'spire.50', name: "Cloud Climber", desc: "Reach floor 50 of the Spire.", icon: 'spire', req: { kind: 'count', stat: 'spireBest', count: 50, noun: 'Spire floor' } },
  { id: 'lev.1', name: "Whale Watcher", desc: "Beat a Void Leviathan.", icon: 'leviathan', req: { kind: 'count', stat: 'leviathansBeaten', count: 1, noun: 'Leviathan' } },
  { id: 'lev.12', name: "Mother of All", desc: "Beat all 12 Void Leviathans.", icon: 'leviathan', req: { kind: 'count', stat: 'leviathansBeaten', count: 12, noun: 'Leviathan' } },
  { id: 'mirror.engines', name: "Through the Looking Glass", desc: "Buy 100 Antimatter engines.", icon: 'antimatter', req: { kind: 'count', stat: 'amEnginesBought', count: 100, noun: 'Antimatter engine' } },
  { id: 'mirror.depth', name: "Inside Out", desc: "Collapse the anti-star all the way to a Protostar.", icon: 'antimatter', req: { kind: 'count', stat: 'mirrorDepth', count: 11, noun: 'collapse' } },
  { id: 'galactic.1', name: "Island Universe", desc: "Go Galactic.", icon: 'galaxy', req: { kind: 'count', stat: 'galacticsAll', count: 1, noun: 'Galactic Rebirth' } },
  { id: 'galactic.galaxies', name: "Galaxy Hopper", desc: "Explore 5 galaxies.", icon: 'galaxy', req: { kind: 'count', stat: 'galaxiesCleared', count: 5, noun: 'galaxy' } },
  { id: 'observatory.100', name: "Stargazer", desc: "Record a Star Score of 100.", icon: 'telescope', req: { kind: 'count', stat: 'starScoreBest', count: 100, noun: 'Star Score' } },
  { id: 'mega.1', name: "Groundbreaking", desc: "Build a megastructure stage.", icon: 'mega', req: { kind: 'count', stat: 'megaStages', count: 1, noun: 'megastructure stage' } },
  { id: 'mega.done', name: "Wonder of the Galaxy", desc: "Finish a megastructure.", icon: 'mega', req: { kind: 'count', stat: 'megaDone', count: 1, noun: 'megastructure' } },
  { id: 'colony.1', name: "First Footprints", desc: "Found a colony.", icon: 'colony', req: { kind: 'count', stat: 'coloniesFounded', count: 1, noun: 'colony' } },
  { id: 'colony.pop', name: "Teeming", desc: "Grow a colony to a million people.", icon: 'colony', req: { kind: 'count', stat: 'colonyPopBest', count: 1e6, noun: 'person' } },
  { id: 'planet.1', name: "Green Thumb", desc: "Finish terraforming a planet.", icon: 'terraform', req: { kind: 'count', stat: 'planetsFinished', count: 1, noun: 'planet' } },
  { id: 'wormhole.1', name: "Shortcut", desc: "Open a wormhole.", icon: 'wormhole', req: { kind: 'count', stat: 'wormholesOpened', count: 1, noun: 'wormhole' } },
  { id: 'nursery.25', name: "Stellar Gardener", desc: "Grow all 25 star species.", icon: 'nursery', req: { kind: 'count', stat: 'speciesGrown', count: 25, noun: 'species' } },
  // Phase 17: the Big Crunch, Eternity and the Echo boards
  { id: 'crunch.1', name: "Heat Death, Reversed", desc: "Go Big Crunch.", icon: 'crunch', req: { kind: 'count', stat: 'crunchesAll', count: 1, noun: 'Big Crunch' } },
  { id: 'crunch.10', name: "Cosmic Accordion", desc: "Go Big Crunch 10 times.", icon: 'crunch', req: { kind: 'count', stat: 'crunchesAll', count: 10, noun: 'Big Crunch' } },
  { id: 'eternity.all', name: "Forever and a Day", desc: "Buy every Eternity upgrade.", icon: 'eternity', req: { kind: 'count', stat: 'eternityUpgrades', count: 10, noun: 'Eternity upgrade' } },
  { id: 'echo.nova', name: "Ringing in the Ears", desc: "Go Echo Supernova.", icon: 'echo', req: { kind: 'count', stat: 'echoNovas', count: 1, noun: 'Echo Supernova' } },
  { id: 'echo.nebula', name: "Reverb", desc: "Go Echo Nebula.", icon: 'echo', req: { kind: 'count', stat: 'echoNebulas', count: 1, noun: 'Echo Nebula' } },
  // Phase 18: the Multiverse
  { id: 'multiverse.1', name: "The Last Starsmith", desc: "Enter the Multiverse.", icon: 'multiverse', req: { kind: 'count', stat: 'multiversesAll', count: 1, noun: 'Multiverse' } },
  { id: 'multiverse.10', name: "Many Worlds", desc: "Enter the Multiverse 10 times.", icon: 'multiverse', req: { kind: 'count', stat: 'multiversesAll', count: 10, noun: 'Multiverse' } },
  { id: 'multiverse.rules', name: "Against the Odds", desc: "Finish a universe played under 4 rules.", icon: 'universe', req: { kind: 'count', stat: 'rulesBest', count: 4, noun: 'rule' } },
  { id: 'alchemy.1', name: "Something Bubbling", desc: "Find a recipe in Starlight Alchemy.", icon: 'alchemy', req: { kind: 'count', stat: 'recipesFound', count: 1, noun: 'recipe' } },
  { id: 'alchemy.all', name: "Master Alchemist", desc: "Find all 12 recipes.", icon: 'alchemy', req: { kind: 'count', stat: 'recipesFound', count: 12, noun: 'recipe' } },
  { id: 'weather.summon', name: "Rain Dance", desc: "Summon weather with the Weather Beacon.", icon: 'weather', req: { kind: 'count', stat: 'weatherSummoned', count: 1, noun: 'summoned weather' } },
  { id: 'weather.50', name: "Storm Chaser", desc: "See 50 weathers roll through the sky.", icon: 'weather', req: { kind: 'count', stat: 'weathers', count: 50, noun: 'weather' } },
  { id: 'defense.10', name: "Holding the Line", desc: "Win wave 10 of Planet Defense.", icon: 'defense', req: { kind: 'count', stat: 'defenseBest', count: 10, noun: 'wave' } },
  { id: 'defense.100', name: "Planetary Shield", desc: "Win wave 100 of Planet Defense.", icon: 'defense', req: { kind: 'count', stat: 'defenseBest', count: 100, noun: 'wave' } },
  { id: 'sparks.all', name: "Every Spark", desc: "Own all 114 Spark choices.", icon: 'spark', req: { kind: 'count', stat: 'sparkChoices', count: 114, noun: 'Spark choice' } },
  { id: 'omni.1m', name: "Omnipresent", desc: "Raise an Omni Constant to level 1,000,000.", icon: 'constants', req: { kind: 'count', stat: 'omniBest', count: 1e6, noun: 'level' } },
  // Phase 7: Comet Fusion, Attunements, the Merchant and starships
  { id: 'fusion.5', name: "Comet Smith", desc: "Fuse a level 5 comet.", icon: 'comet', req: { kind: 'count', stat: 'fusionBest', count: 5, noun: 'fusion level' } },
  { id: 'fusion.10', name: "Starfall Forge", desc: "Fuse a level 10 comet.", icon: 'comet', req: { kind: 'count', stat: 'fusionBest', count: 10, noun: 'fusion level' } },
  { id: 'fusion.15', name: "Comet Emperor", desc: "Fuse a level 15 comet.", icon: 'comet', req: { kind: 'count', stat: 'fusionBest', count: 15, noun: 'fusion level' } },
  { id: 'perfect.10', name: "On the Beat", desc: "Land 10 perfect Pulse taps.", icon: 'pulse', req: { kind: 'count', stat: 'perfects', count: 10, noun: 'perfect tap' } },
  { id: 'perfect.250', name: "Metronome", desc: "Land 250 perfect Pulse taps.", icon: 'pulse', req: { kind: 'count', stat: 'perfects', count: 250, noun: 'perfect tap' } },
  { id: 'chaos.25', name: "Dice Roller", desc: "Roll the Chaos Die 25 times.", icon: 'mystery', req: { kind: 'count', stat: 'chaosRolls', count: 25, noun: 'Chaos roll' } },
  { id: 'deals.1', name: "First Haggle", desc: "Take a deal from the Merchant.", icon: 'merchant', req: { kind: 'count', stat: 'deals', count: 1, noun: 'deal' } },
  { id: 'deals.50', name: "Regular Customer", desc: "Take 50 deals from the Merchant.", icon: 'merchant', req: { kind: 'count', stat: 'deals', count: 50, noun: 'deal' } },
  { id: 'trips.1', name: "Maiden Voyage", desc: "Bring a ship home from an expedition.", icon: 'ship', req: { kind: 'count', stat: 'trips', count: 1, noun: 'trip' } },
  { id: 'trips.50', name: "Fleet Admiral", desc: "Bring ships home 50 times.", icon: 'ship', req: { kind: 'count', stat: 'trips', count: 50, noun: 'trip' } },
  { id: 'trips.500', name: "Charted Space", desc: "Bring ships home 500 times.", icon: 'ship', req: { kind: 'count', stat: 'trips', count: 500, noun: 'trip' } },
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
