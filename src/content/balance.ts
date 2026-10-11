/**
 * Every tunable number lives here (Math and balance tab of the plan doc).
 * Tune with the balance simulator, never by scattering constants in systems.
 */
export const BALANCE = {
  offline: {
    baseCapSeconds: 2 * 3600,
    baseEfficiency: 0.5,
    /** Relics and the tree can't push time away past full value. */
    maxEfficiency: 1,
  },
  tap: {
    base: 1,
    /** Crits arrive with Golden Sun (tier index 2). */
    critTier: 2,
    critChance: 0.05,
    critMult: 10,
    /** Taps in a row needed for each combo step, and the multiplier it gives. */
    combo: [
      { taps: 10, mult: 1.5 },
      { taps: 25, mult: 2 },
      { taps: 50, mult: 3 },
    ],
    /** The combo starts draining after this pause, then loses this many taps per second. */
    comboGraceSeconds: 0.7,
    comboDrainPerSecond: 12,
    /** Macros can't beat this: extra taps inside one second are ignored. */
    maxPerSecond: 30,
  },
  engines: {
    ratio: 1.15,
    /** Past this many owned, each purchase costs x1.25 more instead. */
    steepFrom: 200,
    steepRatio: 1.25,
    /** Output doubles at each of these owned counts. */
    milestones: [10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000],
  },
  tiers: {
    /** Cost of tier k (1-based, k >= 2) = firstCost x ratio^(k - 2). */
    firstCost: 1000,
    ratio: 50,
    /** Every tier multiplies production and taps by this. */
    mult: 2,
  },
  comets: {
    /** From Red Dwarf (tier index 1). One every 60 to 120 s, divided by the comet rate. */
    tier: 1,
    minGap: 60,
    maxGap: 120,
    /** The first comet of a game comes sooner. */
    firstAt: 90,
    /** Seconds a comet stays on screen to be caught. */
    flight: 9,
    /** Chances of each kind (Wish uses the wishChance stat; the rest share what's left). */
    odds: { frenzy: 0.6, lucky: 0.3, tapstorm: 0.09 },
    frenzy: { mult: 7, seconds: 30 },
    tapstorm: { mult: 50, seconds: 10 },
    wish: { costMult: 0.5, seconds: 30 },
    /** Lucky: this share of your Stardust, but at most this many seconds of production. */
    lucky: { share: 0.15, maxSeconds: 900, minTaps: 25 },
  },
  medals: {
    /** Each medal: +1% Stardust (production and taps). */
    bonus: 0.01,
    /** Each Goal tier: +2% Rune Luck, x1.05 Rune Bulk, +1% Stardust. */
    goalLuck: 0.02,
    goalBulk: 1.05,
    goalBonus: 0.01,
  },
  backups: {
    /** A rolling backup every 5 minutes of play, and on returning after 10 minutes away. */
    everySeconds: 300,
    afterAwaySeconds: 600,
    keep: 10,
  },
  mastery: {
    /** Ranks from engines EVER bought; each is x1.5 output for that engine. Opens at Red Supergiant. */
    tier: 4,
    mult: 1.5,
    ranks: [
      { id: 'bronze', name: 'Bronze', at: 25, color: '#C2783A' },
      { id: 'silver', name: 'Silver', at: 100, color: '#B8C1D9' },
      { id: 'gold', name: 'Gold', at: 250, color: '#FFC83D' },
      { id: 'platinum', name: 'Platinum', at: 600, color: '#9FE7FF' },
      { id: 'cosmic', name: 'Cosmic', at: 1500, color: '#FF4FC1' },
    ],
  },
  quests: {
    /** Quests open at Golden Sun (tier index 2). */
    tier: 2,
    slots: 3,
    /** Reward: this many seconds of production (at least `minTaps` taps' worth), capped by maxRunShare. */
    rewardSeconds: 30,
    minTaps: 20,
    /** A reward never exceeds this share of the Stardust gathered this run (no chain-claiming a new run up). */
    maxRunShare: 0.5,
    /** Each completed quest: +1% production, forever. */
    bonusPerQuest: 0.01,
  },
  orbitals: {
    /** Rings and the tier (index) each opens at: Blue Giant, Red Supergiant, Magnetar, Blazar. */
    rings: [
      { tier: 3, slots: 4 },
      { tier: 4, slots: 6 },
      { tier: 7, slots: 8 },
      { tier: 10, slots: 10 },
    ],
    /** Price of the n-th planet (0-based): base x growth^n. */
    planetBase: 2e6,
    planetGrowth: 4,
    /** Level-up price: planet price x levelGrowth^level. */
    levelGrowth: 1.9,
    /** Each level: +25% to the engines this planet boosts. */
    perLevel: 0.25,
    /** Each neighbour of a DIFFERENT type adds this share to the planet's bonus. */
    neighbourBonus: 0.2,
  },
  belt: {
    /** Opens at Red Dwarf (tier index 1). Formulas from the Grass Cutting Incremental remake. */
    tier: 1,
    baseCap: 10,
    maxCap: 400,
    /** One asteroid every 2.5 s at base; Growth adds 10% speed a level. */
    spawnSeconds: 2.5,
    growthPerLevel: 0.1,
    beamBase: 48,
    beamPerLevel: 10,
    beamMaxLevel: 8,
    oreBase: 1,
    xpBase: 1,
    /** Each asteroid also gives this many seconds of production x sqrt(rarity multiplier): a little Stardust. */
    stardustSeconds: 0.25,
    /** Belt Tier T needs 100 x 3^(T^1.2) ore gathered since the last tier. */
    tierBase: 100,
    tierRatio: 3,
    tierPow: 1.2,
    /** Asteroids a drone sweeps per second. */
    droneRate: 1,
    /** Belt Tier 3: this share of the field's ore every second. */
    passiveShare: 0.1,
    upgrades: {
      value: { base: 10, growth: 1.2 },
      amount: { base: 25, growth: 1.4 },
      growth: { base: 100, growth: 1.75 },
      beam: { base: 1e4, growth: 4 },
      xp: { base: 1000, growth: 1.3 },
    },
  },
  drill: {
    /** Deep Core Drilling opens at 5 Supernovas. Core HP = 100 x 8^depth. */
    supernovas: 5,
    hpBase: 100,
    hpGrowth: 8,
    baseDps: 1,
    droneDps: 2,
    droneBase: 500,
    droneGrowth: 1.6,
    /** Drill bits are crafted at the Starforge from Iron alloy. */
    bitBase: 5,
    bitGrowth: 2.2,
    /** Each drill bit: x1.5 drilling. Each ore mastery level: +10%. */
    bitMult: 1.5,
    masteryPerLevel: 0.1,
    /** A broken core pays 50 x 6^depth ore. */
    rewardBase: 50,
    rewardGrowth: 6,
    /** A click on the core is this many seconds of drilling. */
    tapSeconds: 2,
  },
  forge: {
    /** The Starforge opens at 3 Supernovas (the rail's requirement). 100 ore smelts into 1 alloy. */
    supernovas: 3,
    orePerBatch: 100,
    alloyPerBatch: 1,
    batchSeconds: 10,
    /** Mag-Belt speed: each level smelts 10% faster. */
    speedPerLevel: 1.1,
    /** Upgrades cost common ore. */
    upgrades: {
      speed: { base: 200, growth: 1.45 },
      bulk: { base: 500, growth: 1.6 },
      crucibles: { base: 2500, growth: 4 },
    },
    /** One crucible to start, up to six. */
    maxCrucibles: 6,
    /** How much newly mined common ore the hopper may take: all, half (the default) or a tenth. */
    shareChoices: [1, 0.5, 0.1],
  },
  relics: {
    /** Crafting costs 10 alloy; level L to L+1 costs 10 x 1.6^L of its alloy. Effect = base x 1.25^(level - 1). */
    costBase: 10,
    costGrowth: 1.6,
    effectGrowth: 1.25,
    slots: 6,
    /** Crafting every relic of a grade multiplies that alloy. */
    collectorMult: 2,
  },
  codex: {
    /** The heaviest element (atomic number) each Star Tier can fuse: Blue Giant to oxygen, Neutron Star to iron. */
    tierMaxZ: [2, 2, 6, 8, 14, 20, 26, 38, 47, 56, 92, 118],
    /** Samples of each element per Supernova = floor(1 + log10(S / 1e7)), S = Stardust this run. */
    samplesAt: 1e7,
    /** Each family's perk per element level (a level is floor(log2(samples)) + 1). */
    families: {
      nonmetal: { stat: 'productionMult', kind: 'mul', per: 0.04 },
      noble: { stat: 'offlineCap', kind: 'add', per: 600 },
      alkali: { stat: 'tapPower', kind: 'mul', per: 0.05 },
      alkaline: { stat: 'engineCostMult', kind: 'reduce', per: 0.02 },
      transition: { stat: 'alloyGain', kind: 'mul', per: 0.02 },
      post: { stat: 'cometRate', kind: 'mul', per: 0.01 },
      metalloid: { stat: 'xpGain', kind: 'mul', per: 0.05 },
      halogen: { stat: 'critMult', kind: 'mul', per: 0.03 },
      lanthanide: { stat: 'oreGain', kind: 'mul', per: 0.03 },
      actinide: { stat: 'shardGain', kind: 'mul', per: 0.02 },
    },
    /** A completed row of the table: x1.5 to these stats. */
    rowMult: 1.5,
    rowStats: [['productionMult'], ['tapPower'], ['oreGain'], ['alloyGain'], ['xpGain'], ['shardGain'], ['productionMult', 'tapPower']],
    /** Helium: an extra engine milestone at this many owned (past the last regular one). */
    heliumMilestone: 1250,
    /** Uranium: shard gain + this much per level. */
    uraniumPerLevel: 0.1,
    goldAlloyMult: 2,
  },
  starsmith: {
    /** Opens at Red Dwarf. Level L needs 50 x 2.7^(L^0.75) more XP. */
    tier: 1,
    base: 50,
    ratio: 2.7,
    pow: 0.75,
    /** XP for things the player does (asteroids give XP by their own formula). */
    xp: { tap: 0.2, engine: 0.5, evolve: 5, quest: 10, supernova: 100 },
  },
  supernova: {
    /** Blue Giant (tier index 3) and this much Stardust gathered in the run. */
    tier: 3,
    runStardust: 1e7,
    /** Shards = floor((S / 1e7)^0.4), softcapped above 10,000 to 1e4 x (raw / 1e4)^0.6. (Plan: 0.5; the simulator chose 0.4.) */
    gainPow: 0.4,
    softcapAt: 1e4,
    softcapPow: 0.6,
    /** The first Supernova always gives exactly this many. */
    firstGain: 3,
    /** Every Stardust gain is x(1 + lifetime shards)^0.3. (Plan: 0.5; the simulator chose 0.3.) */
    passivePow: 0.3,
    /** Milestone 20: this share of the Supernova gain every second, without resetting. */
    passiveShare: 0.01,
    /** Quick Burn: x(this / run seconds), between x1 and x3. */
    quickBurnSeconds: 900,
  },
  /** Cost growth per level of each Stellar Constant (between 1.05 and 2, Math and balance tab). */
  constants: { gravity: 1.3, light: 1.3, heat: 1.35, orbit: 1.35, runeSpeed: 1.8, runeBulk: 1.6, resonance: 2, drift: 1.9, bloom: 1.7 },
  novaTree: {
    /** Node price along an arm: armBase x armGrowth^depth (depth 0 to 22). */
    armBase: 3,
    armGrowth: 7,
    capCost: 1e15,
    echoCost: 1e14,
  },
  automation: {
    /** Auto-buyers act once a second, faster with Nova Tree nodes. */
    perSecond: 1,
    /** The share of your Stardust an auto-buyer may spend: all, half, a tenth. */
    spendChoices: [1, 0.5, 0.1],
  },
  fusion: {
    /** Comet Fusion opens at 6 Supernovas: a 3x3 board growing to 5x5, a comet every 12 s. */
    supernovas: 6,
    baseSize: 3,
    maxSize: 5,
    spawnSeconds: 12,
    /** Spawn speed: x1.12 a level. Upgrades cost Nova Shards. */
    speedPerLevel: 1.12,
    upgrades: {
      speed: { base: 5, growth: 1.7 },
      start: { base: 200, growth: 12 },
      size: { base: 60, growth: 25 },
    },
    /** Starting level stops here (each level is worth 3 of the one below). */
    maxStart: 5,
    autoCost: 400,
    /** Your best comet level: x1.25 Stardust and taps per level, +10% comet strength per level. */
    perLevel: 1.25,
    cometStrength: 0.1,
  },
  attune: {
    /** Attunements open at 8 Supernovas; up to 3 equipped. Unlocking costs Nova Shards. */
    supernovas: 8,
    slots: 3,
    unlock: { pulse: 0, heartbeat: 25, chaos: 100, lens: 400 },
    /** Pulse: one beat a second. The first tap in a beat's window is graded; off-beat taps give nothing. */
    pulse: { beatMs: 1000, perfectMs: 60, greatMs: 140, goodMs: 240, perfect: 25, great: 5, good: 2, missed: 1, memory: 8 },
    /** Heartbeat: each tap adds 8, it drains 18 a second, and at 100 it overloads back to 0. */
    heartbeat: { perTap: 8, drain: 18, max: 100, bonus: 3 },
    /** Chaos Die: a random effect every 20 taps, for 15 seconds. */
    chaos: { every: 20, seconds: 15 },
    /** Gravity Lens: taps x6, but at most 4 a second. */
    lens: { mult: 6, perSecond: 4 },
  },
  merchant: {
    /** The Wandering Merchant arrives at 10 Supernovas with 4 deals. */
    supernovas: 10,
    deals: 4,
    /** Rerolling the deals costs shards: 5 x 2^n, back to 5 after each Supernova (a new ship docks free). */
    rerollBase: 5,
    rerollGrowth: 2,
    /** Merchant Luck: deals +10% a level and Mythical chance 1% + 0.2% a level, up to level 25 (x3.5, 6%). */
    luck: { base: 20, growth: 1.8, value: 0.1, max: 25 },
    /** Levels a relic deal gives: common, rare, Mythical (never scaled by luck). */
    relicLevels: [1, 2, 5],
    rareChance: 0.1,
    rareMult: 3,
    mythicalChance: 0.01,
    mythicalPerLevel: 0.002,
    mythicalMult: 100,
  },
  nebula: {
    /** The second reset: 30 Supernovas and 100,000 shards gathered in one Nebula run. */
    supernovas: 30,
    runShards: 1e5,
    /** Essence = floor((NS / 1e5)^0.35); the first Nebula gives 2. */
    gainPow: 0.35,
    firstGain: 2,
    /** Lifetime Essence boosts shard gain: x(1 + E)^0.4. */
    passivePow: 0.4,
    /** Milestone 10: Supernova resets nothing and 1/50 of its gain trickles in every second. */
    trickle: 1 / 50,
    /** Nebula Tree nodes cost Essence: 1 x 2.6^depth along each wisp. */
    treeBase: 1,
    treeGrowth: 2.6,
  },
  runes: {
    /** Rolls a second (Rune Speed) stop at 20; bulk (runes a roll) has no cap. */
    speedCap: 20,
    /** Every 10th roll gets x2 luck; the rarest visible rune in a shrine is guaranteed after 3 x its odds in rolls. */
    pityEvery: 10,
    pityLuck: 2,
    hardPity: 3,
    /** Nothing gets better than 1 in 10 (runes at 1 in 10 or better never change). */
    floor: 10,
    /** Below this many expected hits a tick, draw a Poisson count; above it, use the expectation. */
    poissonBelow: 1000,
  },
  /** Phase 9: Rune Starring and Crafting, Celestial Auras, Mutations and the Index. */
  runeDepth: {
    /** Lifetime Nebulas that open each system. */
    opens: { index: 1, starring: 2, mutations: 3, auras: 4 },
    /** Star ranks: [ladder tier, copies to sacrifice]. Legendary x250, Celestial x2,500, Eternal x500K, Primordial x1B, Absolute x1 quadrillion. */
    stars: [
      [4, 250],
      [6, 2500],
      [8, 5e5],
      [10, 1e9],
      [12, 1e15],
    ] as Array<[number, number]>,
    /** Each star: +20% to that shrine's rune effects (never its powers). */
    starEffect: 0.2,
    /** From this many stars the shrine's hidden rune shows, and it comes 10 times as often. */
    revealAt: 2,
    hiddenBoost: 10,
    /** Salvaging a copy of a 1-in-N rune gives N / 10 Rune Shards; crafting one costs N. */
    salvageRatio: 10,
    auras: {
      /** One Aura Die for every 1,000 runes rolled at any shrine. */
      diceEvery: 1000,
      /** Odds from Comet Haze (1 in 5) to Stellar Crown (1 in 1.75M), evenly spaced on a log scale. */
      firstOdds: 5,
      lastOdds: 1.75e6,
      /** Boosts from +5% to +500%. */
      minBoost: 0.05,
      maxBoost: 5,
    },
    /** [id, name, what it counts as, base odds 1 in N, colour]. Mutation Luck divides the odds, never better than 1 in 2. */
    mutations: [
      ['golden', 'Golden', 2, 50, '#FFC83D'],
      ['rainbow', 'Rainbow', 5, 500, '#FF7AE0'],
      ['void', 'Void', 20, 10_000, '#6E5CC4'],
      ['prismatic', 'Prismatic', 100, 250_000, '#9FE7FF'],
    ] as Array<[string, string, number, number, string]>,
    mutationFloor: 2,
    /** Index pages: each of these completion shares multiplies the page's stat once more. */
    indexMilestones: [0.1, 0.25, 0.5, 0.75, 1],
  },
  /** Phase 10: Void Wyrms (Math and balance: "Belt, Starforge and Wyrm numbers"). */
  wyrms: {
    /** They arrive with the third Nebula (Nebula milestone 3). */
    nebulas: 3,
    /** Eggs cost Essence: 10 x 1.5^(eggs hatched so far), so a first team of 3 to 5 by the first Singularity. */
    eggBase: 10,
    eggGrowth: 1.5,
    /** Team slots: 3, plus one at each of these lifetime hatches (up to 6). */
    slots: 3,
    slotHatches: [25, 100, 400],
    /** Training: level L to L+1 costs 20 x 1.35^L Iron alloy (Wyrm XP makes it cheaper). Boost = base x (1 + 0.1 x level). */
    trainBase: 20,
    trainGrowth: 1.35,
    perLevel: 0.1,
    /** Fusion: exactly 5 identical make one of the next form. Forms: Normal x1, Golden x3, Rainbow x10. */
    fuse: 5,
    forms: [1, 3, 10],
    /** Each species' boost is base x growth^rarity (from +10% for the commonest). */
    boostBase: 0.1,
    boostGrowth: 1.5,
    /** Embers a second from each Wyrm on the team: base x growth^rarity, scaled like its boost. */
    emberBase: 1,
    emberGrowth: 1.6,
    /** A Wyrm on the team catches a comet this long after it appears. */
    catchSeconds: 2.5,
  },
  /** Phase 10: the Star Nursery. */
  nursery: {
    nebulas: 4,
    /** Plots: 3, plus one a level of the Plots upgrade (up to 12). */
    plots: 3,
    maxPlots: 12,
    /** A base seed costs this much Essence. */
    seedPrice: 5,
    /** Each harvest gives its own seed back, and this chance of one more. */
    extraSeed: 0.5,
    /** Upgrades: [base Essence price, price growth, effect per level]. */
    upgrades: {
      plots: [25, 4, 1],
      growth: [10, 2.5, 1.25],
      yield: [15, 3, 1.5],
      tending: [1000, 2, 1],
    } as Record<string, [number, number, number]>,
    /** Crossbreeding costs Essence: this times 10^(tier of the result). */
    crossBase: 1,
  },
  ships: {
    /** Starship Expeditions open at 15 Supernovas. Ships cost Iron alloy; up to 5. */
    supernovas: 15,
    shipBase: 40,
    shipGrowth: 5,
    maxShips: 5,
    /** Trip time = distance / speed; speed 1 a second, x1.25 per Engines level. */
    baseSpeed: 1,
    enginePerLevel: 1.25,
    /** Cargo: loot x1.3 a level. Crew: rare finds +5% a level. */
    cargoPerLevel: 1.3,
    crewPerLevel: 0.05,
    upgrades: {
      engines: { base: 30, growth: 1.9 },
      cargo: { base: 20, growth: 2.1 },
      crew: { base: 10, growth: 2.4 },
    },
  },
} as const;
