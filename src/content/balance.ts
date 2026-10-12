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
    /** Level-up price: planet price x levelGrowth^level up to level 20. */
    levelGrowth: 1.9,
    /** 1.2.0: steeper from level 20 and 40, so bulk levelling (Max, auto-planets) can't run away mid-game. */
    levelBrackets: [
      { from: 20, ratio: 3.5 },
      { from: 40, ratio: 8 },
    ],
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
    /**
     * Crafting costs 10 alloy; level L to L+1 costs 10 x 1.6^L of its alloy. Effect = base x 1.25^(level - 1) up to
     * level 300, then x1.02 a level. Uncapped, the ore and alloy relics fed the alloy that levels them, and with two or
     * three equipped that loop ran away in long Galactic runs (shards e263 to e3430 in one run, sim, Phase 15).
     */
    costBase: 10,
    costGrowth: 1.6,
    effectGrowth: 1.25,
    effectKnee: 300,
    effectGrowthLate: 1.02,
    /** No relic goes past 1,000 levels: Merchant deals restock as you buy, and cost almost nothing late on. */
    maxLevel: 1000,
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
    /**
     * 1.2.0: and at least this many seconds of the Stardust per second you had at your last
     * Supernova, so each one takes a real run whatever your economy.
     */
    needSeconds: 30,
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
  constants: { gravity: 1.3, light: 1.3, heat: 1.35, orbit: 1.35, runeSpeed: 1.8, runeBulk: 1.6, resonance: 2, drift: 1.9, bloom: 1.7, mass: 1.5, spin: 1.8, horizon: 1.6, charge: 1.7, expansion: 1.6, arms: 1.8, halo: 1.7, lattice: 1.9, entropy: 2, recursion: 1.8 },
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
    /** 1.2.0: lifetime Supernovas that earn each new auto-buyer. */
    unlockAt: { novatree: 5, planets: 5, supernova: 10, belt: 15, constants: 20 },
    /** Auto-Constants steps every constant to its next doubling once this many seconds of play, and waits this long after you buy one yourself. */
    constantsEvery: 60,
  },
  fusion: {
    /** Comet Fusion opens at 6 Supernovas: a 3x3 board growing to 5x5, a comet every 12 s. */
    supernovas: 6,
    baseSize: 3,
    maxSize: 5,
    spawnSeconds: 12,
    /** Spawn speed: x1.12 a level, up to 60 levels (a comet every 0.013 s, faster than any board fills). Upgrades cost Nova Shards. */
    speedPerLevel: 1.12,
    maxSpeed: 60,
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
    /** The Wandering Merchant arrives at 10 Supernovas. Each ship brings 3 deals; one you take stays sold. */
    supernovas: 10,
    deals: 3,
    /** 1.2.0: a new ship docks every 15 minutes of play time (it was every Supernova: far too much stock). */
    restockSeconds: 900,
    /** Rerolling the deals still for sale costs shards: 5 x 2^n, back to 5 when a new ship docks. */
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
    /** The second reset: 30 Supernovas and 10M shards gathered in one Nebula run (1.2.0: was 100,000). */
    supernovas: 30,
    runShards: 1e7,
    /** Essence = floor((NS / 1e7)^0.35); the first Nebula gives at least 2 (1.2.0: it follows the formula too). */
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
    /**
     * A shrine's runes multiply together, which reaches e29 when they're all levelled. That suits Stardust-sized stats
     * but not the late currencies that come in tens to billions. In the late shrines (paid in those currencies), each
     * shrine's product for these is raised to this power (at e29: Dark Matter x800, Galaxy Cores x28, Chronons x4).
     * Undamped, the Void and Galactic shrines fed themselves: the Big Crunch simulator reached e78 Galaxy Cores in one
     * run. The early shrines keep their full strength (the Dust Shrine's Dark Matter bonus is part of the Galactic pacing).
     */
    smallStatPow: { darkMatterGain: 0.1, galaxyCoreGain: 0.05, chrononGain: 0.02 } as Record<string, number>,
    lateShrines: ['void', 'galactic', 'eternal'],
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
  /** Phase 12: the Singularity, the third reset (Math and balance: "Reset layers"). */
  singularity: {
    /**
     * It needs the Event Horizon key and NE (Essence gathered this Singularity run) of at least 1e6.
     * Dark Matter = floor(1.05^(log10(NE) - 6)) x Dark Matter gain. Essence runs past e90 by
     * Nebula 8 here, so the plan's (NE / 1e6)^0.3 would hand out e26 at once; this gives about 70
     * at the first Singularity and about x3.6 for every 26 more orders of magnitude of Essence.
     */
    runEssence: 1e6,
    gainBase: 1.05,
    /** Lifetime Dark Matter boosts Essence: x(1 + DM)^0.35. */
    passivePow: 0.35,
    /** The Event Horizon key costs Embers; it shows from Nebula milestone 8. */
    keyEmbers: 1e8,
    /** Milestone 10: a Nebula resets nothing and 1/50 of its gain trickles in every second. */
    trickle: 1 / 50,
    /** Singularity Tree prices in Dark Matter: base x growth^ring step. */
    treeBase: 1,
    treeGrowth: 3,
  },
  /** Phase 12: the Black Hole, the Prism Wheel and the Dark Matter Reactor. */
  blackHole: {
    /** Mass for each of the 8 stages (amber, blue, violet, red, green, pink, black, rainbow): 10^(stage - 1). */
    stageBase: 10,
    /** Feeding Dark Matter: mass per DM fed. Feeding Stardust: mass a second = share x log10(1 + Stardust a second). */
    massPerDM: 10,
    dustPow: 1,
    maxDustShare: 0.5,
    /** Game speed = 1 + 0.04 x log10(1 + mass), plus Spin. */
    speedPerOoM: 0.04,
    /** The Prism Wheel (stage 8): its shares always add up to this share of Dark Matter income. */
    wheelLimit: 0.8,
    /** Each colour's bank of Dark Matter boosts its currency: x(1 + bank)^0.5. */
    wheelPow: 0.5,
    /**
     * The Reactor: Dark Matter gain x(1 + charge)^(0.15 x Reactor power), with Reactor power counted up to x2.
     * Uncapped, Reactor Charge levels (bought with Dark Matter) raised the exponent without end and the
     * Dark Matter loop ran away past 10 Singularities (sim, Phase 14).
     */
    reactorPow: 0.15,
    reactorPowerCap: 2,
  },
  /** Phase 13: Trials, the Spire and the Void Leviathans (Game design: "Singularity"). */
  trials: {
    singularities: 2,
    /**
     * A Trial's goal at level L: Blue Giant and 1e200 x 1e100^(L - 1) Stardust in the Trial run (e200 to e600).
     * Trials open at 2 Singularities, when Stardust a second is about e220 to e320 and grows about e15 a
     * Singularity (sim, Phase 13): the first levels fall in the Singularity era, the top ones under their
     * debuffs wait for later layers. Fast Nova races to e300.
     */
    goal: 1e200,
    goalGrowth: 1e100,
    fastGoal: 1e300,
    /** Auto-complete opens once you have this many Trial levels in all. */
    autoAt: 10,
    /** Fast Nova: the Trial's run time under each limit (seconds) earns that rank's shard multiplier. */
    fastRanks: [
      ['D', 300, 1.5],
      ['C', 240, 2.25],
      ['B', 180, 3.75],
      ['A', 120, 5.06],
      ['AA', 60, 7.59],
      ['S', 30, 11.39],
      ['SS', 15, 17.09],
      ['Q', 5, 25.62],
    ] as Array<[string, number, number]>,
    /** Fusion: 2 to 4 Trials at once; score = product of their factors x (1 + log10(1 + 100 / (t + 1)^0.75)). */
    fusionMax: 4,
    /** Fusion rewards: Stardust x(1 + score^0.6), shards x(1 + score^0.2), Essence x(1 + score^0.1). */
    fusionPows: [0.6, 0.2, 0.1] as [number, number, number],
  },
  spire: {
    singularities: 3,
    /** Floor f has 10 x 1.15^f hit points (a formula, never a hand-made list). */
    hpBase: 10,
    hpGrowth: 1.15,
    /** Damage a second = (1 + log10(1 + Stardust a second)) x Spire power. */
    /** Every floor: Stardust x1.02, shards and Essence x1.01; every tenth floor a banner. */
    perFloor: { productionMult: 1.02, shardGain: 1.01, essenceGain: 1.01 } as Record<string, number>,
  },
  leviathans: {
    singularities: 4,
    /** Leviathan k's hit points: 1,000 x 6^k, x2.5 for each time you've beaten it. */
    hpBase: 1000,
    hpPerBoss: 6,
    hpPerKill: 2.5,
    /** Damage: (1 + log10(1 + Stardust a second))^2 a second from output, 25 a second per Wyrm on the team, (1 + log10(1 + tap value))^2 a tap. */
    outputPow: 2,
    perWyrm: 25,
    tapPow: 2,
    /** Scales for beating Leviathan k: 5 x 2^k. */
    scalesBase: 5,
    scalesGrowth: 2,
    /** Scale Tree prices: 10 x 2.5^step. */
    treeBase: 10,
    treeGrowth: 2.5,
  },
  /** Phase 18: the Multiverse, the sixth and last reset (Math and balance: reset layers; UUT's Rift). */
  multiverse: {
    /** Needs this many Big Crunches in this universe. */
    crunches: 10,
    /** Sparks a Multiverse pays (Spark Hoards add 0.2 each, milestone 6 adds 1), times 1 + the Universe Forge's reward. */
    sparks: 6,
    sparkBonus: 0.2,
    /** Every Spark choice costs 0.2; the echoes at the fork centres level up with no cap, x2 the price a level. */
    choiceCost: 0.2,
    echoGrowth: 2,
    /**
     * Omni Constants: prices rise by a hair a level (10^0.0001 to 10^0.0002), so one universe's Stardust, Essence or
     * shards buys millions of levels. Effects are linear (no doublings): an Omni level can never pay for the next.
     */
    omniGrowth: { gain: 10 ** 0.0002, luck: 10 ** 0.0001, speed: 10 ** 0.0002 } as Record<string, number>,
  },
  /** Phase 17: the Big Crunch, the fifth reset (Math and balance: reset layers). */
  crunch: {
    /**
     * Needs this many galaxies explored in the Crunch run, and this many more for each Big Crunch already in this
     * universe (up to all 20). Crunch runs keep megastructures, colonies and lifetime glows, and Eternity automates the
     * rest, so with 7 every time the simulator's later Crunches came minutes apart; with the step, the tenth comes at
     * about 3 times the first (26 h against 8.5 h) and the whole Galaxy Map gets used.
     */
    galaxies: 7,
    galaxiesStep: 2,
    /**
     * Chronons = floor((log10(GC / 10) + 1)^1.5 x Chronon gain), GC = Galaxy Cores gained this Crunch run (at least 10).
     * The plan divided by 1e6, which gives nothing: the simulator's first Crunch run gathers about 750 Cores (4 Chronons
     * here; dividing by 100 gave 2, enough for one upgrade), and later runs thousands.
     */
    gainDiv: 10,
    gainPow: 1.5,
    /** Galaxy Cores x(1 + lifetime Chronons)^0.5. */
    passivePow: 0.5,
    /** Milestone 10: a Galactic Rebirth resets nothing, and this share of its gain trickles in each second. */
    trickle: 1 / 50,
  },
  /** Phase 17: the Echo boards, the first three layers replayed small (Crunch milestone 1 opens them). */
  echoes: {
    /** Echo engine k: price 10 x 18^k, output 1 x 9^k a second, x1.15 a purchase; output doubles at 10, 25, 50, 100, 200 owned. */
    engineCostBase: 10,
    engineCostGrowth: 18,
    engineProdBase: 1,
    engineProdGrowth: 9,
    ratio: 1.15,
    milestones: [10, 25, 50, 100, 200],
    /** A tap on the echo star gives 1 + 10% of a second's Echo Dust. */
    tapShare: 0.1,
    /** Echo Supernova: 1e6 Echo Dust this echo run gives floor((dust / 1e6)^0.5 x (1 + log10(1 + lifetime Echo Essence))) Echo Shards. */
    novaAt: 1e6,
    novaPow: 0.5,
    /** Echo Nebula: 100 Echo Shards this echo run gives floor((shards / 100)^0.5) Echo Essence. */
    nebulaAt: 100,
    nebulaPow: 0.5,
    /**
     * Echo output x(1 + log10(1 + lifetime Echo Shards))^2 x (1 + log10(1 + lifetime Echo Essence))^3. The first draft
     * multiplied by (1 + shards) and (1 + Essence)^2, and with Essence also multiplying shards, each echo cycle's output
     * grew in proportion to the last cycle's dust: the simulator reached e235,000 Echo Dust within minutes.
     */
    shardBoardPow: 2,
    essenceBoardPow: 3,
    /** What the echoes give the real game, from lifetime amounts: Stardust x(1 + ED)^0.05, shards x(1 + ES)^0.2, Essence x(1 + EE)^0.5, Chronons x(1 + EE)^0.25. */
    dustPow: 0.05,
    shardPow: 0.2,
    essencePow: 0.5,
    chrononPow: 0.25,
  },
  /** Phase 17: Eternity upgrades, bought with Chronons. */
  eternity: {
    /** One automation upgrade per earlier layer, then boosts. */
    costs: { forge: 1, nova: 2, mist: 3, void: 5, galaxy: 8, arrow: 4, echoes: 3, longnow: 6, cores: 10, dawn: 12 } as Record<string, number>,
    /** Automation spends at most this share of a currency on constants each pass, and acts this often (game seconds). */
    constantShare: 0.1,
    every: 1,
    /** "Double" also resets once the run's gain per second falls below this share of its best, after this many seconds. */
    peakShare: 0.9,
    peakAfter: 10,
  },
  /** Phase 16: Megastructures, Colonies and Terraforming. */
  galaxyBuild: {
    /** Colonies open at 2 Galactic Rebirths; you may hold 1 + galaxies explored, up to 8. */
    colonyGalactics: 2,
    maxColonies: 8,
    /** Founding colony n costs 5 x 3^n Galaxy Cores; it starts with 10 people. */
    foundCost: 5,
    foundGrowth: 3,
    startPop: 10,
    /** Logistic growth: rate 0.002 a second x farms, towards capacity 10,000 x housing x everything else. */
    baseGrowth: 0.002,
    baseCapacity: 1e4,
    /** Supply a second: 0.001 per person x factories x trade. */
    supplyPer: 1e-3,
    /** Buildings: housing x2 capacity, farms x1.3 growth, factories x1.5 Supply a level; price base x growth^level Supply. */
    housingMult: 2,
    farmsMult: 1.3,
    factoriesMult: 1.5,
    buildingCosts: { housing: [50, 4], farms: [30, 3], factories: [80, 4] } as Record<string, [number, number]>,
    /** A spaceport (one-off) lets a colony trade; each route gives both ends x1.5 Supply. Routes: 1 + 1 per 2 colonies. */
    portCost: 500,
    routeMult: 1.5,
    researchCosts: [500, 2000, 5000, 2e4, 1e5, 5e5],
    /** Terraforming: each biome placed costs 200 Supply; a finished planet gives its colony's stat x(1 + score / 10) for good. */
    biomeCost: 200,
    finishPer: 0.1,
    /** Galactic Constants: Halo +10% colony capacity a level; Lattice +5% megastructure rewards (as a power) a level. */
    haloPer: 0.1,
    latticePer: 0.05,
    /** Megastructure rewards grow to this power at most (Lattice), like the other "as a power" stats. */
    megaPowerCap: 2,
  },
  /** Phase 15: Galactic Rebirth, the fourth reset (Math and balance: reset layers). */
  galactic: {
    /** Needs all 8 Black Hole stages, the Mirror Key and this much Dark Matter gained in the Galactic run. */
    runDarkMatter: 1e8,
    /**
     * Galaxy Cores = floor((DM / 1e8)^0.5) x Galaxy Core gain. The plan's ^0.25 gave 3 to 6 a run: 18 of 200 tree nodes
     * after four Galactic Rebirths (sim, Phase 15).
     */
    gainPow: 0.5,
    /** Dark Matter x(1 + lifetime Galaxy Cores)^0.3. */
    passivePow: 0.3,
    /** Galactic Tree: five arms of 38 nodes; node i on an arm costs 1 x 1.2^i Galaxy Cores; echoes x3 a level. */
    treeArmNodes: 38,
    treeBase: 1,
    treeGrowth: 1.2,
    echoGrowth: 3,
    /** Galaxy k can be chosen once you've cleared k - 3 galaxies (four choices ahead). */
    galaxiesAhead: 3,
    /** The Observatory: stars in each run's sky, links you may draw, and how closed shapes score. */
    skyStars: 24,
    links: 8,
    loopBonus: 0.25,
    /** Stardust Chart node prices in Star Charts, by ring. */
    chartCosts: [20, 60, 150, 400, 1000, 2500],
    /** Galactic Constants: Expansion makes cleared galaxies' rewards stronger, Arms makes the Galactic Tree's multipliers stronger. */
    expansionPer: 0.1,
    /**
     * The "as a power" stats stop here, like Reactor strength: Expansion raises cleared galaxy rewards (x3 at most) and
     * Arms the Galactic Tree's multipliers (x2 at most). Both are bought with Galaxy Cores and raise Core multipliers,
     * so uncapped the exponent grew with log(Cores) twice over: the Big Crunch simulator reached e213 Cores in a run.
     */
    rewardPowerCap: 3,
    treePowerCap: 2,
    armsPer: 0.02,
  },
  /** Phase 14: the Antimatter Mirror (Singularity milestone 8). */
  mirror: {
    /** The anti-star makes this much Antimatter a second by itself, so the first engine is ten seconds away. */
    anchorProd: 1,
    /** Antimatter engine k: price 10 x 16^k, output 0.05 x 6^k a second. */
    engineCostBase: 10,
    engineCostGrowth: 16,
    engineProdBase: 0.05,
    engineProdGrowth: 6,
    /** Inverted: milestones slow price growth (x1.3 a purchase at first, x1.06 past 1,000 owned). */
    brackets: [
      { from: 0, ratio: 1.3 },
      { from: 10, ratio: 1.25 },
      { from: 25, ratio: 1.2 },
      { from: 50, ratio: 1.16 },
      { from: 100, ratio: 1.13 },
      { from: 200, ratio: 1.1 },
      { from: 400, ratio: 1.08 },
      { from: 1000, ratio: 1.06 },
    ],
    /** Each Mastery rank of an engine's Stardust twin: +10% on it (+20% with Twin Bond). */
    twinBoost: 0.1,
    /**
     * Collapse d (1 to 11) costs 1,000 x 16^(d - 1) Antimatter, scraps the Antimatter engines and gives Antimatter
     * x3 for good (x4 with Deep Reflection). Without the scrapping, collapses chained: a pacing model put all
     * eleven within three minutes of each other. With it, the key comes about 45 minutes after the Mirror opens.
     */
    depthCost: 1000,
    depthGrowth: 16,
    depthMult: 3,
    deepMult: 4,
    /** Mirror upgrades in order; the last is the Mirror Key. */
    upgradeCosts: [50, 2e3, 5e4, 1e6, 1e8, 1e10, 1e12, 1e14, 1.2e15],
  },
  /** Phase 14: the Wormhole Network (6 Singularities). */
  wormholes: {
    singularities: 6,
    /** A link from A to B with share p: A x(1 - p), B x(1 + p x log10(1 + A's multiplier)). */
    shareStep: 0.05,
    shareDefault: 0.2,
    /** At most this much of one system's output can leave through its wormholes. */
    maxOut: 0.5,
    /** Opening link n costs 1,000 x 10^n Dark Matter; at most 8 links. */
    linkCost: 1000,
    linkGrowth: 10,
    maxLinks: 8,
  },
  /** Phase 11: Spectral Focus (Upgradex's Wavelengths). */
  spectral: {
    nebulas: 5,
    /** Energy a second for the focused colour: (1 + lifetime Essence)^0.25 x 2^Prism Lens. */
    essencePow: 0.25,
    /** A colour opens when the one before it reaches this much energy. */
    unlockAt: 1000,
    /** Prism Lens: x2 energy a level, 100 x 20^n Essence (so the rate grows like Essence^0.23, not ^0.39). Afterglow: unfocused colours build at 5% a level, up to 10 levels, 1,000 x 10^n. */
    lens: [100, 20, 2] as [number, number, number],
    afterglow: [1000, 10, 0.05] as [number, number, number],
    afterglowMax: 10,
    /** Violet: every 3 orders of magnitude add one effective order of magnitude to the Supernova and Nebula formula inputs. */
    violetEvery: 3,
  },
  /** Phase 11: Tarot of the Void (EUT's Cards). */
  tarot: {
    nebulas: 6,
    /** Packs cost Essence: 50 x 1.6^(packs opened). */
    packBase: 50,
    packGrowth: 1.6,
    /** Deck slots: 5, plus one at 30 and at 50 cards owned. */
    slots: 5,
    slotCards: [30, 50],
    /** The Gambler: this chance of x4 Essence each Nebula, else x0.44. */
    gambleChance: 0.44,
    gambleWin: 4,
    gambleLose: 0.44,
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
  /** Phase 20.4: the Ship Customizer. A matched hull's bonus in its sectors, the Freighter, and each part's one-off price in alloy. */
  shipParts: {
    fitSpeed: 1.5,
    fitLoot: 2,
    freighterLoot: 1.5,
    freighterSpeed: 0.8,
    fusionSpeed: 1.5,
    warpSpeed: 3,
    warpLoot: 0.8,
    sailSpeed: 1.25,
    sailLoot: 1.25,
    expandedLoot: 2,
    expandedSpeed: 0.8,
    vaultRares: 2,
    seedPodSeeds: 4,
    deepChance: 0.1,
    prices: {
      'hull.freighter': ['alloy.gold', 2000],
      'hull.icebreaker': ['alloy.crystal', 500],
      'hull.heatshield': ['alloy.prismatic', 300],
      'hull.voidplating': ['alloy.void', 200],
      'engine.fusion': ['alloy.iron', 5000],
      'engine.warp': ['alloy.prismatic', 500],
      'engine.sail': ['alloy.gold', 3000],
      'cargo.expanded': ['alloy.gold', 2500],
      'cargo.vault': ['alloy.crystal', 800],
      'cargo.seedpod': ['alloy.crystal', 600],
      'scanner.deep': ['alloy.crystal', 1000],
      'scanner.relic': ['alloy.prismatic', 250],
      'scanner.codex': ['alloy.prismatic', 250],
    } as Record<string, readonly [string, number]>,
  },
  /** Phase 20.6: the Hidden Sigils. Price: x10 the two nodes beside it, x100 for each sigil owned. */
  sigils: {
    priceMult: 10,
    priceGrowth: 100,
    /** How far from the line between its two nodes a sigil sits (tree units). */
    offset: 42,
    greedCrit: 10,
    greedDust: 0.5,
    hasteSpeed: 1.5,
    hasteOffline: 0.5,
    hungerDm: 10,
    hungerMass: 0.1,
    prideCores: 5,
    prideDust: 0.95,
    envyLuck: 10,
    envyBulk: 0.1,
    slothCap: 4,
    slothTaps: 0.1,
    wrathDamage: 100,
    wrathComets: 0.5,
  },
  /** Phase 20.5: Planet Defense. Opens at 3 Singularities (lifetime) with a planet in orbit. */
  defense: {
    singularities: 3,
    sockets: 12,
    /** Wave N: 8 + N/2 swarmers (at most 60), each with 20 x 1.13^N health. */
    baseCount: 8,
    countPerWave: 0.5,
    maxCount: 60,
    baseHealth: 20,
    healthGrowth: 1.13,
    /** Every 5th wave: a quarter of the swarm armoured (3x health, half damage taken). Every 10th: a boss. */
    armourEvery: 5,
    armourHealth: 3,
    armourTaken: 0.5,
    bossEvery: 10,
    bossHealth: 25,
    /** Three swarmers reaching your planets lose the wave. */
    leaks: 3,
    /** Damage x1.25 a turret level. */
    damagePerLevel: 1.25,
    /** Auto-defend runs waves on its own from this best wave. */
    autoFrom: 10,
    /** Rewards for each new best wave, and alloy per repeat win (each grade your turrets use). */
    planetPerBest: 0.03,
    stardustPerBest: 0.02,
    alloyBase: 5,
    alloyGrowth: 1.08,
    /** Placing a turret: its price x this for each of that kind already placed. Levels: base x growth^level. */
    placeGrowth: 4,
    levelGrowth: 1.4,
    /** Swarmer speeds (field units a second; the field's radius is 1) and the gap between spawns (seconds). */
    speed: { swarmer: 0.12, armoured: 0.09, boss: 0.06 },
    spawnGap: 0.6,
    /**
     * Each turret: price to place the first and to buy the first level (its alloy), damage a hit at
     * level 0 (wave 1 has 22.6 health a swarmer), seconds between shots, reach, and its trick.
     */
    turrets: {
      laser: { placeCost: 200, levelCost: 50, damage: 12, every: 0.25, range: 0.62 },
      flak: { placeCost: 200, levelCost: 50, damage: 10, every: 0.9, range: 0.5, splash: 0.12 },
      frost: { placeCost: 100, levelCost: 30, damage: 4, every: 0.5, range: 0.45, splash: 0.1, slow: 0.5, slowFor: 1.5 },
      prism: { placeCost: 50, levelCost: 20, damage: 8, every: 0.6, range: 0.55, chain: 3, jump: 0.2 },
      lance: { placeCost: 30, levelCost: 10, damage: 30, every: 1.4, range: 0.75, pierce: 0.045 },
    } as Record<string, { placeCost: number; levelCost: number; damage: number; every: number; range: number; splash?: number; slow?: number; slowFor?: number; chain?: number; jump?: number; pierce?: number }>,
  },
  /** Phase 20.2: Starlight Alchemy. Opens at 12 Supernovas (lifetime). */
  alchemy: {
    supernovas: 12,
    /** A brew takes this share of what you hold of each ingredient in it, and at least its floor. */
    doseShare: 0.05,
    /** An elixir's boost stacks its time up to this many seconds. */
    maxSeconds: 3600,
    /** Each elixir: its boost (a multiplier) and how long one lasts (play-time seconds). */
    recipes: {
      minersAle: { value: 10, seconds: 900 },
      liquidLight: { value: 10, seconds: 600 },
      shardSyrup: { value: 5, seconds: 600 },
      starsmithTea: { value: 5, seconds: 600 },
      cometBrew: { value: 3, seconds: 600 },
      essenceInfusion: { value: 5, seconds: 600 },
      forgeTonic: { value: 5, seconds: 600 },
      critCordial: { value: 5, seconds: 600 },
      fortune: { value: 5, seconds: 600 },
      voidPhilter: { value: 3, seconds: 600 },
      echoElixir: { value: 10, seconds: 600 },
      haste: { value: 1.5, seconds: 300 },
    } as Record<string, { value: number; seconds: number }>,
  },
  /** Phase 20.3: Space Weather. Opens at the first Supernova (lifetime). Times are play-time seconds. */
  weather: {
    supernovas: 1,
    /** Clear sky between one weather and the next, and how long a weather lasts. */
    gapMin: 360,
    gapMax: 720,
    lastMin: 90,
    lastMax: 180,
    /** A beacon-summoned weather lasts the longest a natural one can. */
    summonSeconds: 180,
    /** A beacon charge for every this many comets caught, and the most that can be stored. */
    cometsPerCharge: 25,
    maxCharges: 5,
    /** A Meteor Shower (or a Comet Brew) brings the next comet within this many seconds. */
    hurryComet: 5,
    meteor: 4,
    flare: 10,
    eclipseLuck: 3,
    eclipseEssence: 2,
    aurora: 3,
    windShips: 2,
    windBelt: 2,
    storm: 3,
  },
} as const;
