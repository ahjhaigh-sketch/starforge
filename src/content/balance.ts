/**
 * Every tunable number lives here (Math and balance tab of the plan doc).
 * Tune with the balance simulator, never by scattering constants in systems.
 */
export const BALANCE = {
  offline: {
    baseCapSeconds: 2 * 3600,
    baseEfficiency: 0.5,
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
    bitBase: 1000,
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
  constants: { gravity: 1.3, light: 1.3, heat: 1.35, orbit: 1.35 },
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
} as const;
