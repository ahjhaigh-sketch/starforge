/**
 * The balance simulator (npm run sim). A bot plays Starforge the way an engaged player would:
 * taps a few times a second, catches every comet, claims quests, buys the best-value engine,
 * evolves when it can, buys upgrades, constants and planets, and goes Supernova when the gain is
 * worth it, then spends shards on the cheapest Nova Tree node. Every few seconds it also sweeps the
 * Asteroid Belt, buys Belt upgrades and tiers, spends perk points, runs the furnace on the grade it
 * has most of, and crafts or levels the cheapest relic. It reports purchases and resets
 * per milestone (amounts, not minutes) to compare with the Math and balance tab's targets.
 */
import { it } from 'vitest';
import { BALANCE } from '../src/content/balance';
import type { Decimal } from '../src/engine/decimal';
import type { GameState } from '../src/engine/state';

// Game modules are imported after SIM_BALANCE is applied (some content bakes numbers in at import).
let registerContent: (typeof import('../src/content'))['registerContent'];
let CONSTANTS: (typeof import('../src/content/constants'))['CONSTANTS'];
let ENGINES: (typeof import('../src/content/engines'))['ENGINES'];
let NOVA_TREE: (typeof import('../src/content/novaTree'))['NOVA_TREE'];
let D: (typeof import('../src/engine/decimal'))['D'];
let performReset: (typeof import('../src/engine/layers'))['performReset'];
let createInitialState: (typeof import('../src/engine/state'))['createInitialState'];
let cur: (typeof import('../src/engine/state'))['cur'];
let invalidateStats: (typeof import('../src/engine/stats'))['invalidateStats'];
let stat: (typeof import('../src/engine/stats'))['stat'];
let catchComet: (typeof import('../src/engine/systems/comets'))['catchComet'];
let cometOnScreen: (typeof import('../src/engine/systems/comets'))['cometOnScreen'];
let buyConstant: (typeof import('../src/engine/systems/constants'))['buyConstant'];
let constantOpen: (typeof import('../src/engine/systems/constants'))['constantOpen'];
let constantPlan: (typeof import('../src/engine/systems/constants'))['constantPlan'];
let buyNode: (typeof import('../src/engine/systems/novaTree'))['buyNode'];
let canBuyNode: (typeof import('../src/engine/systems/novaTree'))['canBuyNode'];
let nodeCost: (typeof import('../src/engine/systems/novaTree'))['nodeCost'];
let ownsNode: (typeof import('../src/engine/systems/novaTree'))['ownsNode'];
let buyPlanet: (typeof import('../src/engine/systems/orbitals'))['buyPlanet'];
let levelPlanet: (typeof import('../src/engine/systems/orbitals'))['levelPlanet'];
let planetPrice: (typeof import('../src/engine/systems/orbitals'))['planetPrice'];
let ringOpen: (typeof import('../src/engine/systems/orbitals'))['ringOpen'];
let claimQuest: (typeof import('../src/engine/systems/quests'))['claimQuest'];
let questProgress: (typeof import('../src/engine/systems/quests'))['questProgress'];
let buyEngine: (typeof import('../src/engine/systems/stardust'))['buyEngine'];
let createTapRuntime: (typeof import('../src/engine/systems/stardust'))['createTapRuntime'];
let engineCurve: (typeof import('../src/engine/systems/stardust'))['engineCurve'];
let engineEach: (typeof import('../src/engine/systems/stardust'))['engineEach'];
let engineRevealed: (typeof import('../src/engine/systems/stardust'))['engineRevealed'];
let evolve: (typeof import('../src/engine/systems/stardust'))['evolve'];
let nextTierCost: (typeof import('../src/engine/systems/stardust'))['nextTierCost'];
let owned: (typeof import('../src/engine/systems/stardust'))['owned'];
let tapStar: (typeof import('../src/engine/systems/stardust'))['tapStar'];
let rawShardGain: (typeof import('../src/engine/systems/supernova'))['rawShardGain'];
let supernovaGain: (typeof import('../src/engine/systems/supernova'))['supernovaGain'];
let supernovaReady: (typeof import('../src/engine/systems/supernova'))['supernovaReady'];
let availableUpgrades: (typeof import('../src/engine/systems/upgrades'))['availableUpgrades'];
let buyUpgrade: (typeof import('../src/engine/systems/upgrades'))['buyUpgrade'];
let tick: (typeof import('../src/engine/tick'))['tick'];
let bulkCost: (typeof import('../src/engine/cost'))['bulkCost'];
let ORBITALS: (typeof import('../src/content/early'))['ORBITALS'];
let BELT_UPGRADES: (typeof import('../src/content/belt'))['BELT_UPGRADES'];
let PERKS: (typeof import('../src/content/belt'))['PERKS'];
let GRADES: (typeof import('../src/content/forge'))['GRADES'];
let RELICS: (typeof import('../src/content/forge'))['RELICS'];
let FORGE_UPGRADES: (typeof import('../src/content/forge'))['FORGE_UPGRADES'];
let harvest: (typeof import('../src/engine/systems/belt'))['harvest'];
let beltPlan: (typeof import('../src/engine/systems/belt'))['beltPlan'];
let buyBeltUpgrade: (typeof import('../src/engine/systems/belt'))['buyBeltUpgrade'];
let beltTierUp: (typeof import('../src/engine/systems/belt'))['beltTierUp'];
let beltOpen: (typeof import('../src/engine/systems/belt'))['beltOpen'];
let dronePlan: (typeof import('../src/engine/systems/belt'))['dronePlan'];
let bitPlan: (typeof import('../src/engine/systems/belt'))['bitPlan'];
let buyDrillDrone: (typeof import('../src/engine/systems/belt'))['buyDrillDrone'];
let buyDrillBit: (typeof import('../src/engine/systems/belt'))['buyDrillBit'];
let addPerk: (typeof import('../src/engine/systems/starsmith'))['addPerk'];
let perksFree: (typeof import('../src/engine/systems/starsmith'))['perksFree'];
let forgeOpen: (typeof import('../src/engine/systems/forge'))['forgeOpen'];
let forgePlan: (typeof import('../src/engine/systems/forge'))['forgePlan'];
let buyForgeUpgrade: (typeof import('../src/engine/systems/forge'))['buyForgeUpgrade'];
let setForgeGrade: (typeof import('../src/engine/systems/forge'))['setForgeGrade'];
let batchOre: (typeof import('../src/engine/systems/forge'))['batchOre'];
let relicPlan: (typeof import('../src/engine/systems/forge'))['relicPlan'];
let buyRelic: (typeof import('../src/engine/systems/forge'))['buyRelic'];
let SECTORS: (typeof import('../src/content/extras'))['SECTORS'];
let fusionOpen: (typeof import('../src/engine/systems/fusion'))['fusionOpen'];
let autoFuse: (typeof import('../src/engine/systems/fusion'))['autoFuse'];
let buyAutoFuse: (typeof import('../src/engine/systems/fusion'))['buyAutoFuse'];
let buyFusionUpgrade: (typeof import('../src/engine/systems/fusion'))['buyFusionUpgrade'];
let fusionPlan: (typeof import('../src/engine/systems/fusion'))['fusionPlan'];
let attuneOpen: (typeof import('../src/engine/systems/attune'))['attuneOpen'];
let unlockAttune: (typeof import('../src/engine/systems/attune'))['unlockAttune'];
let equipAttune: (typeof import('../src/engine/systems/attune'))['equipAttune'];
let merchantOpen: (typeof import('../src/engine/systems/merchant'))['merchantOpen'];
let buyDeal: (typeof import('../src/engine/systems/merchant'))['buyDeal'];
let shipsOpen: (typeof import('../src/engine/systems/ships'))['shipsOpen'];
let launch: (typeof import('../src/engine/systems/ships'))['launch'];
let sectorOpen: (typeof import('../src/engine/systems/ships'))['sectorOpen'];
let buyShip: (typeof import('../src/engine/systems/ships'))['buyShip'];
let shipCost: (typeof import('../src/engine/systems/ships'))['shipCost'];
let buyShipUpgrade: (typeof import('../src/engine/systems/ships'))['buyShipUpgrade'];
let shipUpgradePlan: (typeof import('../src/engine/systems/ships'))['shipUpgradePlan'];
let milestoneReached: (typeof import('../src/engine/layers'))['milestoneReached'];
let nebulaReady: (typeof import('../src/engine/systems/nebula'))['nebulaReady'];
let nebulaGain: (typeof import('../src/engine/systems/nebula'))['nebulaGain'];
let NEBULA_TREE: (typeof import('../src/content/nebulaTree'))['NEBULA_TREE'];
let buyNebulaNode: (typeof import('../src/engine/systems/nebulaTree'))['buyNebulaNode'];
let canBuyNebulaNode: (typeof import('../src/engine/systems/nebulaTree'))['canBuyNebulaNode'];
let nebulaNodeCost: (typeof import('../src/engine/systems/nebulaTree'))['nebulaNodeCost'];
let ownsNebulaNode: (typeof import('../src/engine/systems/nebulaTree'))['ownsNebulaNode'];
let runesOpen: (typeof import('../src/engine/systems/runes'))['runesOpen'];
let setShrine: (typeof import('../src/engine/systems/runes'))['setShrine'];
let aurasOpen: (typeof import('../src/engine/systems/auras'))['aurasOpen'];
let auraCopies: (typeof import('../src/engine/systems/auras'))['auraCopies'];
let equipAura: (typeof import('../src/engine/systems/auras'))['equipAura'];
let AURAS: (typeof import('../src/content/runeDepth'))['AURAS'];
let SHRINES: (typeof import('../src/content/runes'))['SHRINES'];
let starUp: (typeof import('../src/engine/systems/starring'))['starUp'];
let W: typeof import('../src/engine/systems/wyrms');
let NS: typeof import('../src/engine/systems/nursery');
let NC: typeof import('../src/content/nursery');
let SPX: typeof import('../src/engine/systems/spectral');
let TAR: typeof import('../src/engine/systems/tarot');
let NX: typeof import('../src/content/nebulaExtras');
let SG: typeof import('../src/engine/systems/singularity');
let BH: typeof import('../src/engine/systems/blackhole');
let TR: typeof import('../src/engine/systems/trials');
let SP: typeof import('../src/engine/systems/spire');
let LV: typeof import('../src/engine/systems/leviathans');
let CH: typeof import('../src/content/challenges');
let PLANET_TYPES: (typeof import('../src/content/early'))['PLANET_TYPES'];

async function loadGame(): Promise<void> {
  ({ registerContent } = await import('../src/content'));
  ({ CONSTANTS } = await import('../src/content/constants'));
  ({ ENGINES } = await import('../src/content/engines'));
  ({ NOVA_TREE } = await import('../src/content/novaTree'));
  ({ D } = await import('../src/engine/decimal'));
  ({ performReset } = await import('../src/engine/layers'));
  ({ createInitialState, cur } = await import('../src/engine/state'));
  ({ invalidateStats, stat } = await import('../src/engine/stats'));
  ({ catchComet, cometOnScreen } = await import('../src/engine/systems/comets'));
  ({ buyConstant, constantOpen, constantPlan } = await import('../src/engine/systems/constants'));
  ({ buyNode, canBuyNode, nodeCost, ownsNode } = await import('../src/engine/systems/novaTree'));
  ({ buyPlanet, levelPlanet, planetPrice, ringOpen } = await import('../src/engine/systems/orbitals'));
  ({ claimQuest, questProgress } = await import('../src/engine/systems/quests'));
  ({ buyEngine, createTapRuntime, engineCurve, engineEach, engineRevealed, evolve, nextTierCost, owned, tapStar } = await import('../src/engine/systems/stardust'));
  ({ rawShardGain, supernovaGain, supernovaReady } = await import('../src/engine/systems/supernova'));
  ({ availableUpgrades, buyUpgrade } = await import('../src/engine/systems/upgrades'));
  ({ tick } = await import('../src/engine/tick'));
  ({ bulkCost } = await import('../src/engine/cost'));
  ({ ORBITALS, PLANET_TYPES } = await import('../src/content/early'));
  ({ BELT_UPGRADES, PERKS } = await import('../src/content/belt'));
  ({ GRADES, RELICS, FORGE_UPGRADES } = await import('../src/content/forge'));
  ({ harvest, beltPlan, buyBeltUpgrade, beltTierUp, beltOpen, dronePlan, bitPlan, buyDrillDrone, buyDrillBit } = await import('../src/engine/systems/belt'));
  ({ addPerk, perksFree } = await import('../src/engine/systems/starsmith'));
  ({ forgeOpen, forgePlan, buyForgeUpgrade, setForgeGrade, batchOre, relicPlan, buyRelic } = await import('../src/engine/systems/forge'));
  ({ SECTORS } = await import('../src/content/extras'));
  ({ fusionOpen, autoFuse, buyAutoFuse, buyFusionUpgrade, fusionPlan } = await import('../src/engine/systems/fusion'));
  ({ attuneOpen, unlockAttune, equipAttune } = await import('../src/engine/systems/attune'));
  ({ merchantOpen, buyDeal } = await import('../src/engine/systems/merchant'));
  ({ shipsOpen, launch, sectorOpen, buyShip, shipCost, buyShipUpgrade, shipUpgradePlan } = await import('../src/engine/systems/ships'));
  ({ milestoneReached } = await import('../src/engine/layers'));
  ({ nebulaReady, nebulaGain } = await import('../src/engine/systems/nebula'));
  ({ NEBULA_TREE } = await import('../src/content/nebulaTree'));
  ({ buyNebulaNode, canBuyNebulaNode, nebulaNodeCost, ownsNebulaNode } = await import('../src/engine/systems/nebulaTree'));
  ({ runesOpen, setShrine } = await import('../src/engine/systems/runes'));
  ({ aurasOpen, auraCopies, equipAura } = await import('../src/engine/systems/auras'));
  ({ AURAS } = await import('../src/content/runeDepth'));
  ({ SHRINES } = await import('../src/content/runes'));
  ({ starUp } = await import('../src/engine/systems/starring'));
  W = await import('../src/engine/systems/wyrms');
  NS = await import('../src/engine/systems/nursery');
  NC = await import('../src/content/nursery');
  SPX = await import('../src/engine/systems/spectral');
  TAR = await import('../src/engine/systems/tarot');
  NX = await import('../src/content/nebulaExtras');
  SG = await import('../src/engine/systems/singularity');
  BH = await import('../src/engine/systems/blackhole');
  TR = await import('../src/engine/systems/trials');
  SP = await import('../src/engine/systems/spire');
  LV = await import('../src/engine/systems/leviathans');
  CH = await import('../src/content/challenges');
}

const TAPS_PER_SECOND = 4;
const MAX_HOURS = 120;
/** The bot plays until this many Nebulas (the plan's first Singularity comes at about 8). */
const STOP_AT_NEBULAS = Number(process.env.SIM_NEBULAS ?? 8);
/** With SIM_SINGULARITIES the bot plays on through that many Singularities (the plan's first Galactic Rebirth comes at about 10). */
const STOP_AT_SINGULARITIES = Number(process.env.SIM_SINGULARITIES ?? 0);
/** How often (game seconds) the bot looks after the Belt and the Starforge. */
const SIDE_EVERY = 5;

interface Row {
  milestone: string;
  supernovas: number;
  nebulas: number;
  enginesBought: number;
  upgrades: number;
  tier: string;
  treeShare: string;
  shards: string;
  gameTime: string;
}

const hms = (s: number) => `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m ${String(Math.floor(s % 60)).padStart(2, '0')}s`;
const fmt = (d: Decimal) => (d.lt(1e6) ? d.toNumber().toFixed(0) : d.toExponential(2).replace('+', ''));

function bestEngine(s: GameState): string | null {
  let best: string | null = null;
  let bestScore = 0;
  const mult = stat(s, 'engineCostMult');
  ENGINES.forEach((e, i) => {
    if (!engineRevealed(s, i)) return;
    const cost = bulkCost(engineCurve(e.id), owned(s, e.id), 1).mul(mult);
    if (cost.gt(cur(s, 'stardust'))) return;
    const score = engineEach(s, e.id).div(cost).toNumber();
    if (score > bestScore) {
      bestScore = score;
      best = e.id;
    }
  });
  return best;
}

function shop(s: GameState): void {
  invalidateStats();
  // tiers double everything: always worth it
  while (nextTierCost(s) && cur(s, 'stardust').gte(nextTierCost(s)!)) evolve(s);
  for (const u of availableUpgrades(s)) if (cur(s, 'stardust').gte(u.cost)) buyUpgrade(s, u.id);
  for (let i = 0; i < 60; i++) {
    const id = bestEngine(s);
    if (!id || !buyEngine(s, id, 1)) break;
  }
  invalidateStats();
  // constants and planets when they are a small share of the bank
  const bank = cur(s, 'stardust');
  for (const c of CONSTANTS) {
    if (!constantOpen(s, c)) continue;
    const plan = constantPlan(s, c, 1);
    if (plan.cost.lt(bank.mul(0.1))) buyConstant(s, c.id, 1);
  }
  ORBITALS.rings.forEach((r, ring) => {
    if (!ringOpen(s, ring)) return;
    for (let slot = 0; slot < r.slots; slot++) {
      const id = `${ring}.${slot}`;
      if (!s.planets[id] && planetPrice(s).lt(cur(s, 'stardust').mul(0.2))) buyPlanet(s, id, PLANET_TYPES[slot % PLANET_TYPES.length]!.id);
      else if (s.planets[id]) levelPlanet(s, id) && undefined;
    }
  });
}

/** The Belt, the furnace and relics: what a player does when they check those panels. */
function sideSystems(s: GameState): void {
  if (!beltOpen(s) || process.env.SIM_NO_SIDE) return;
  invalidateStats();
  if (s.belt.field.length > 0) harvest(s, s.belt.field.map((a) => a.id));
  beltTierUp(s);
  for (let i = 0; i < 100; i++) {
    const next = BELT_UPGRADES.map((u) => ({ id: u.id, p: beltPlan(s, u.id) }))
      .filter((x) => x.p.count > 0 && x.p.canAfford)
      .sort((a, b) => a.p.cost.cmp(b.p.cost))[0];
    if (!next || !buyBeltUpgrade(s, next.id)) break;
  }
  for (let i = 0; perksFree(s) > 0 && i < 1000; i++) addPerk(s, PERKS[(s.stats.level ?? i) % PERKS.length]!.id);
  if (forgeOpen(s)) {
    // the rarest grade with a few batches waiting, else iron
    const grade = [...GRADES].reverse().find((g) => cur(s, g.ore).gte(batchOre(s).mul(3))) ?? GRADES[0]!;
    setForgeGrade(s, grade.id);
    for (const u of FORGE_UPGRADES) {
      const p = forgePlan(s, u.id);
      if (p.count > 0 && p.cost.lt(cur(s, 'ore').mul(0.3))) buyForgeUpgrade(s, u.id);
    }
    for (let i = 0; i < 200; i++) {
      const next = RELICS.map((r) => ({ id: r.id, p: relicPlan(s, r.id) }))
        .filter((x) => x.p.count > 0 && x.p.canAfford)
        .sort((a, b) => a.p.cost.cmp(b.p.cost))[0];
      if (!next || !buyRelic(s, next.id)) break;
    }
  }
  // Phase 8: roll at the Dust shrine (cheap) and a little at the Nova shrine
  if (runesOpen(s)) {
    setShrine(s, 'dust', { auto: true, rate: 1 });
    setShrine(s, 'nova', { auto: true, rate: 0.25 });
  }
  // Phase 9: throw every Aura Die, wear the rarest aura, and star a shrine up whenever it can
  if (aurasOpen(s)) {
    s.auras.auto = true;
    const best = AURAS.filter((a) => auraCopies(s, a.id).gt(0)).sort((a, b) => b.log10 - a.log10)[0];
    if (best && s.auras.equipped !== best.id) equipAura(s, best.id);
  }
  for (const sh of SHRINES) starUp(s, sh.id);
  // Phase 10: hatch eggs with a little Essence, fuse fives, wear the strongest Wyrms, train them a bit
  const keepAmount = s.settings.buyAmount;
  s.settings.buyAmount = 1;
  if (W.wyrmsOpen(s)) {
    for (let i = 0; i < 50 && W.eggPlan(s).cost.lt(cur(s, 'essence').mul(0.05)); i++) W.buyEggs(s);
    for (const key of Object.keys(s.wyrms.stacks)) while (W.fuseWyrms(s, key));
    const best = Object.keys(s.wyrms.stacks)
      .filter((k) => W.stackOf(s, k).gte(1))
      .sort((a, b) => W.boostOfKey(s, b).cmp(W.boostOfKey(s, a)))
      .slice(0, W.teamSlots(s));
    s.wyrms.team = best;
    for (const key of best) for (let i = 0; i < 20 && W.trainPlan(s, key).cost.lt(cur(s, 'alloy.iron').mul(0.02)); i++) W.trainWyrm(s, key);
  }
  // the Nursery: Tending and plots when cheap, cross every new species, plant the best seeds
  if (NS.nurseryOpen(s)) {
    for (const id of ['tending', 'plots', 'yield', 'growth']) if (NS.upgradePlan(s, id).cost.lt(cur(s, 'essence').mul(0.05))) NS.buyNurseryUpgrade(s, id);
    for (const [a, b, c] of NC.CROSSBREEDS) if ((s.nursery.seeds[c] ?? 0) === 0 && (s.nursery.seeds[a] ?? 0) >= 2 && (s.nursery.seeds[b] ?? 0) >= 2) NS.crossbreed(s, a, b);
    NS.ensurePlots(s);
    s.nursery.plots.forEach((plot, i) => {
      if (NS.plotProgress(s, i) >= 1 && !s.nursery.upgrades.tending) NS.harvestPlot(s, i);
      // the seed to grow: one never grown before first, then the highest tier
      const want = NC.STAR_SPECIES.filter((x) => (s.nursery.seeds[x.id] ?? 0) >= 1).sort((x, y) => Number(s.nursery.found.includes(x.id)) - Number(s.nursery.found.includes(y.id)) || y.tier - x.tier)[0];
      const here = plot.species ? NC.STAR_BY_ID.get(plot.species) : undefined;
      if (here && want && (here.tier < want.tier || (!s.nursery.found.includes(want.id) && s.nursery.found.includes(here.id)))) NS.uprootPlot(s, i);
      if (plot.species) return;
      if (want) NS.plant(s, i, want.id);
      else {
        const base = NC.BASE_SEEDS[i % NC.BASE_SEEDS.length]!;
        NS.buySeeds(s, base);
        NS.plant(s, i, base);
      }
    });
  }
  // Phase 13: always climb the Spire and hunt Leviathans; scales go on the cheapest Scale Tree node
  if (SP.spireOpen(s)) SP.setClimbing(s, true);
  if (LV.leviathansOpen(s)) {
    LV.setFighting(s, true);
    for (let i = 0; i < 20; i++) {
      const pick = LV.scaleTree.def.nodes.filter((n) => LV.scaleTree.canBuy(s, n)).sort((a, b) => LV.scaleTree.cost(s, a).cmp(LV.scaleTree.cost(s, b)))[0];
      if (!pick || !LV.scaleTree.buy(s, pick.id)) break;
    }
  }
  // Phase 12: feed the Black Hole a fifth of Stardust, turn the wheel on once it opens
  if (BH.bhOpen(s)) {
    BH.setDustShare(s, 0.2);
    if (BH.wheelOpen(s)) s.wheel.on = true;
  }
  // Phase 11: focus the weakest open colour, buy Prism Lens and Afterglow, packs, and deal the strongest plain cards
  if (SPX.spectralOpen(s)) {
    const open = NX.SPECTRAL.filter((c) => SPX.colorOpen(s, c.id));
    const weakest = open.sort((a, b) => SPX.oom(SPX.energyOf(s, a.id)) - SPX.oom(SPX.energyOf(s, b.id)))[0];
    if (weakest) SPX.setFocus(s, weakest.id);
    for (const id of ['lens', 'afterglow'] as const) for (let i = 0; i < 20 && SPX.spectralPlan(s, id).count > 0 && SPX.spectralPlan(s, id).cost.lt(cur(s, 'essence').mul(0.05)); i++) SPX.buySpectral(s, id);
  }
  if (TAR.tarotOpen(s)) {
    for (let i = 0; i < 60 && TAR.packPlan(s).count > 0 && TAR.packPlan(s).cost.lt(cur(s, 'essence').mul(0.05)); i++) TAR.openPacks(s);
    const plain = s.tarot.owned.map((id) => NX.CARD_BY_ID.get(id)!).filter((c) => !c.rule && c.rarity < 5).sort((a, b) => b.rarity - a.rarity);
    s.tarot.deck = plain.slice(0, TAR.deckSlots(s)).map((c) => c.id);
  }
  s.settings.buyAmount = keepAmount;
  // Phase 7: fuse the board, the Gravity Lens (the bot taps a steady 4 a second), good deals, ships
  if (fusionOpen(s)) autoFuse(s);
  const merchantDeals = merchantOpen(s) ? s.merchant.deals : [];
  for (let i = 0; i < merchantDeals.length; i++) {
    const d = merchantDeals[i]!;
    if ((d.kind === 'shards' || d.kind === 'relic' || d.quality !== 'common') && d.pay.amount.lt(cur(s, d.pay.currency).mul(0.2))) buyDeal(s, i);
  }
  if (shipsOpen(s)) {
    const best = [...SECTORS].reverse().find((x) => sectorOpen(s, x));
    if (best) s.ships.fleet.forEach((sh, i) => !sh.sector && launch(s, i, best.id));
    if (shipCost(s).lt(cur(s, 'alloy.iron').mul(0.3))) buyShip(s);
    for (const id of ['engines', 'cargo', 'crew'] as const) {
      const p = shipUpgradePlan(s, id);
      if (p.canAfford && p.cost.lt(cur(s, id === 'engines' ? 'alloy.iron' : id === 'cargo' ? 'alloy.gold' : 'alloy.crystal').mul(0.3))) buyShipUpgrade(s, id);
    }
  }
  const drone = dronePlan(s);
  if (drone.canAfford && drone.cost.lt(cur(s, 'ore').mul(0.3))) buyDrillDrone(s);
  if (bitPlan(s).canAfford) buyDrillBit(s);
  invalidateStats();
}

/** Dark Matter: Void Constants under 15%, the cheapest Singularity Tree nodes, then a tenth into the Reactor. */
function spendDarkMatter(s: GameState): void {
  for (const id of ['void.horizon', 'void.mass', 'void.spin', 'void.charge']) {
    const c = CONSTANTS.find((x) => x.id === id)!;
    if (constantOpen(s, c) && constantPlan(s, c, 1).cost.lt(cur(s, 'darkMatter').mul(0.15))) buyConstant(s, id, 1);
  }
  const tree = SG.singularityTree;
  for (let i = 0; i < 200; i++) {
    const pick = tree.def.nodes.filter((n) => tree.canBuy(s, n)).sort((a, b) => Number(!!a.repeat) - Number(!!b.repeat) || tree.cost(s, a).cmp(tree.cost(s, b)))[0];
    if (!pick || !tree.buy(s, pick.id)) break;
  }
  if (BH.reactorOpen(s)) {
    const keep = s.settings.buyAmount;
    s.settings.buyAmount = 'custom';
    s.settings.customBuyAmount = Math.floor(cur(s, 'darkMatter').mul(0.1).min(1e15).toNumber());
    if (s.settings.customBuyAmount >= 1) BH.feedReactor(s);
    s.settings.buyAmount = keep;
  }
}

/** Essence: Nebula Constants first (rune speed and bulk, Drift), then the cheapest Nebula Tree node. */
function spendEssence(s: GameState): void {
  for (const id of ['nebula.drift', 'nebula.speed', 'nebula.bulk', 'nebula.resonance']) {
    const c = CONSTANTS.find((x) => x.id === id)!;
    const plan = constantPlan(s, c, 1);
    if (constantOpen(s, c) && plan.cost.lt(cur(s, 'essence').mul(0.15))) buyConstant(s, id, 1);
  }
  for (let i = 0; i < 200; i++) {
    const pick = NEBULA_TREE.filter((n) => canBuyNebulaNode(s, n)).sort((a, b) => Number(!!a.repeat) - Number(!!b.repeat) || nebulaNodeCost(s, a).cmp(nebulaNodeCost(s, b)))[0];
    if (!pick || !buyNebulaNode(s, pick.id)) break;
  }
}

function nebulaShare(s: GameState): string {
  return `${Math.round((NEBULA_TREE.filter((n) => !n.repeat && ownsNebulaNode(s, n.id)).length / NEBULA_TREE.filter((n) => !n.repeat).length) * 100)}%`;
}

function spendShards(s: GameState): void {
  // a fifth of the shards go to the stage's side systems first
  const budget = cur(s, 'shards').mul(0.2);
  if (attuneOpen(s)) {
    if (!s.attune.unlocked.includes('lens') && budget.gte(BALANCE.attune.unlock.lens)) unlockAttune(s, 'lens');
    if (s.attune.unlocked.includes('lens') && !s.attune.equipped.includes('lens')) equipAttune(s, 'lens');
  }
  if (fusionOpen(s)) {
    if (!s.fusion.autoOwned && budget.gte(BALANCE.fusion.autoCost)) buyAutoFuse(s);
    for (const id of ['speed', 'size', 'start'] as const) {
      const p = fusionPlan(s, id);
      if (p.count > 0 && p.cost.lt(cur(s, 'shards').mul(0.05))) buyFusionUpgrade(s, id);
    }
  }
  for (let i = 0; i < 200; i++) {
    const options = NOVA_TREE.filter((n) => canBuyNode(s, n)).sort((a, b) => Number(!!a.repeat) - Number(!!b.repeat) || nodeCost(s, a).cmp(nodeCost(s, b)));
    const pick = options[0];
    if (!pick || !buyNode(s, pick.id)) break;
  }
}

function treeShare(s: GameState): string {
  const fixed = NOVA_TREE.filter((n) => !n.repeat);
  return `${Math.round((fixed.filter((n) => ownsNode(s, n.id)).length / fixed.length) * 100)}%`;
}

/** SIM_BALANCE='{"supernova":{"gainPow":0.4}}' tries values without editing balance.ts. */
function applyOverrides(target: Record<string, unknown>, patch: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) applyOverrides(target[k] as Record<string, unknown>, v as Record<string, unknown>);
    else target[k] = v;
  }
}

it('balance simulation', async () => {
  if (process.env.SIM_BALANCE) applyOverrides(BALANCE as unknown as Record<string, unknown>, JSON.parse(process.env.SIM_BALANCE));
  await loadGame();
  registerContent();
  const s = createInitialState(0, Number(process.env.SIM_SEED ?? 2026));
  const rt = createTapRuntime();
  const rows: Row[] = [];
  const record = (milestone: string) =>
    rows.push({
      milestone,
      supernovas: s.stats.supernovasAll ?? 0,
      nebulas: s.stats.nebulasAll ?? 0,
      enginesBought: s.stats.enginesBought ?? 0,
      upgrades: s.upgrades.length,
      tier: String(s.tier),
      treeShare: treeShare(s),
      shards: fmt(s.totals.all.shards ?? D(0)),
      gameTime: hms(s.playtime),
    });
  const want = new Map([
    [1, 'First Supernova'],
    [3, 'Starforge opens (3)'],
    [5, 'Auto-buyers 2-5 (5)'],
    [12, 'Full automation (12)'],
    [20, 'Passive shards (20)'],
    [30, 'Nebula appears (30)'],
  ]);
  let runStart = 0;
  let lastSide = 0;
  /** Best shards-per-second this run: with passive shards, a player resets once that peaks. */
  let bestRate = D(0);
  const runLengths: number[] = [];
  let firstSnPurchases = 0;
  let firstSnTiers = 0;
  let ms = 0;
  let nebulaStart = 0;
  let traceAt = 0;
  const nebulaLengths: number[] = [];
  const wantNebula = new Map([
    [1, 'First Nebula'],
    [2, 'Nebula 2'],
    [3, 'Nebula 3 (Wyrms)'],
    [5, 'Nebula 5 (keep the tree)'],
    [8, 'Nebula 8 (Singularity)'],
  ]);
  let singularityStart = 0;
  let nanSeen = false;
  /** Trials the bot failed, and the Singularity count when it did (it tries again after the next one). */
  const trialFailed = new Map<string, number>();
  const singularityLengths: number[] = [];
  const playing = () => (STOP_AT_SINGULARITIES > 0 ? (s.stats.singularitiesAll ?? 0) < STOP_AT_SINGULARITIES : (s.stats.nebulasAll ?? 0) < STOP_AT_NEBULAS);
  while (s.playtime < MAX_HOURS * 3600 && playing()) {
    // Phase 12: buy the key, then fall in when it at least doubles lifetime Dark Matter (or the run drags past an hour)
    if (SG.keyOnSale(s) && !s.singularity.key) SG.buyKey(s);
    if (SG.singularityReady(s)) {
      const g = SG.singularityGain(s);
      const life = s.totals.all.darkMatter ?? D(0);
      if ((s.stats.singularitiesAll ?? 0) === 0 || g.gte(life) || s.playtime - singularityStart > 3600) {
        singularityLengths.push(s.playtime - singularityStart);
        if (process.env.SIM_DEBUG_P13) console.log(`[p13] Singularity ${(s.stats.singularitiesAll ?? 0) + 1}: log10 SPS ${stat(s, 'stardustPerSec').add(1).log10().toNumber().toFixed(1)}, log10 run Stardust ${(s.totals.run.stardust ?? D(0)).add(1).log10().toNumber().toFixed(1)}, log10 tap ${stat(s, 'tapPower').add(1).log10().toNumber().toFixed(1)}, supernovas ${s.stats.supernovasAll ?? 0}`);
        performReset(s, 'singularity');
        singularityStart = s.playtime;
        nebulaStart = s.playtime;
        runStart = s.playtime;
        bestRate = D(0);
        spendDarkMatter(s);
        spendEssence(s);
        spendShards(s);
        const k = s.stats.singularitiesAll ?? 0;
        if (k === 1 || k === 3 || k === 5 || k === 10 || k === STOP_AT_SINGULARITIES) record(`Singularity ${k}`);
        continue;
      }
    }
    if (process.env.SIM_DEBUG_RUN && s.playtime - traceAt >= 600 && (s.stats.nebulasAll ?? 0) >= Number(process.env.SIM_DEBUG_RUN)) (traceAt = s.playtime) && console.log(`R ${hms(s.playtime)} N${s.stats.nebulasAll} sn ${s.stats.supernovas} shards ${fmt(cur(s, 'shards'))} raw ${fmt(rawShardGain(s))} ready ${nebulaReady(s)} essGain ${nebulaReady(s) ? fmt(nebulaGain(s)) : '-'} lifeE ${fmt(s.totals.all.essence ?? D(0))} tier ${s.tier}`);
    if (nebulaReady(s)) {
      const g = nebulaGain(s);
      // after a Singularity, Essence from earlier Singularity runs is out of reach: double this run's
      const lifetime = ((s.stats.singularitiesAll ?? 0) > 0 ? s.totals.run.essence : s.totals.all.essence) ?? D(0);
      if ((s.stats.nebulasAll ?? 0) === 0 || g.gte(lifetime) || s.playtime - nebulaStart > 6 * 3600) {
        nebulaLengths.push(s.playtime - nebulaStart);
        performReset(s, 'nebula');
        nebulaStart = s.playtime;
        runStart = s.playtime;
        bestRate = D(0);
        spendEssence(s);
        spendShards(s);
        if (process.env.SIM_DEBUG_NEB) {
          const { breakdown } = await import('../src/engine/stats');
          for (const id of ['shardGain', 'productionMult', 'essenceGain']) {
            const top = breakdown(s, id).filter((l) => l.op === 'mul').sort((x, y) => y.value.log10().toNumber() - x.value.log10().toNumber()).filter((l) => l.value.log10().toNumber() > 0.5).map((l) => `${l.label} ${l.value.log10().toNumber().toFixed(1)}`).join('; ');
            console.log(`N${s.stats.nebulasAll} ${id} = ${fmt(stat(s, id))}: ${top}`);
          }
          console.log(`N${s.stats.nebulasAll} essence ${fmt(s.totals.all.essence ?? D(0))} shards ${fmt(s.totals.all.shards ?? D(0))}`);
        }
        const label = wantNebula.get(s.stats.nebulasAll ?? 0);
        if (label) record(label);
        continue;
      }
    }
    const dt = s.playtime - runStart < 1800 ? 1 : 5;
    for (let i = 0; i < TAPS_PER_SECOND * dt && i < 40; i++) tapStar(s, rt, (ms += 1000 / TAPS_PER_SECOND));
    tick(s, dt);
    if (process.env.SIM_DEBUG_NAN && !nanSeen) {
      const pm = stat(s, 'productionMult');
      if (!Number.isFinite(pm.log10().toNumber()) || Number.isNaN(pm.mag)) {
        nanSeen = true;
        const st = await import('../src/engine/stats');
        console.log(`[nan] ${hms(s.playtime)} trial ${s.trials.active.join('+')} prod ${pm.toString()}`);
        for (const l of st.breakdown(s, 'productionMult')) console.log(`[nan]   ${l.op} ${l.label}: ${l.value.toString()}`);
      }
    }
    if (cometOnScreen(s)) catchComet(s);
    s.quests.forEach((q, i) => questProgress(s, q) >= 1 && claimQuest(s, i));
    shop(s);
    if (s.playtime - lastSide >= SIDE_EVERY) {
      sideSystems(s);
      lastSide = s.playtime;
    }
    // a Trial whose goal is met is claimed at once, as a player would
    if (TR.goalMet(s)) {
      const what = TR.completeTrial(s);
      if (process.env.SIM_DEBUG_P13) console.log(`[p13] ${hms(s.playtime)} S${s.stats.singularitiesAll ?? 0}: ${what} (prod log10 ${stat(s, 'productionMult').log10().toNumber().toFixed(0)}, sps log10 ${stat(s, 'stardustPerSec').add(1).log10().toNumber().toFixed(0)}, run ${(s.playtime - runStart).toFixed(0)}s)`);
    }
    if (supernovaReady(s)) {
      const g = supernovaGain(s);
      // after a Nebula, shards from earlier Nebula runs are out of reach: double this Nebula run's shards
      const lifetime = ((s.stats.nebulasAll ?? 0) > 0 ? s.totals.run.shards : s.totals.all.shards) ?? D(0);
      const tooLong = s.playtime - runStart > 4 * 3600;
      const rate = g.div(Math.max(1, s.playtime - runStart));
      if (rate.gt(bestRate)) bestRate = rate;
      // once lifetime shards grow by themselves (20 Supernovas), doubling them can stall a run for hours
      const peaked = milestoneReached(s, 'supernova', 'passive') && s.playtime - runStart > 60 && rate.lt(bestRate.mul(0.9));
      // short of the Supernovas the Nebula needs, a person resets rather than wait on passive shards
      const behind = (s.stats.nebulasAll ?? 0) > 0 && (s.stats.supernovas ?? 0) < BALANCE.nebula.supernovas && s.playtime - runStart > 600;
      if ((s.stats.supernovasAll ?? 0) === 0 || g.gte(lifetime.max(3)) || peaked || behind || tooLong) {
        if ((s.stats.supernovasAll ?? 0) === 0) {
          firstSnPurchases = s.stats.enginesBought ?? 0;
          firstSnTiers = s.tier;
        }
        runLengths.push(s.playtime - runStart);
        if (process.env.SIM_DEBUG && (s.stats.supernovas ?? 0) < 8) {
          console.log(`SN${(s.stats.supernovas ?? 0) + 1}: run ${(s.playtime - runStart).toFixed(0)}s gain ${fmt(g)} lifetime ${fmt(lifetime)} tier ${s.tier} sps ${fmt(stat(s, 'stardustPerSec'))} prodMult ${fmt(stat(s, 'productionMult'))} tap ${fmt(stat(s, 'tapPower'))} runS ${fmt(s.totals.run.stardust ?? D(0))} nodes ${Object.keys(s.novaTree).join(',')}`);
        }
        const wasIn = s.trials.active[0];
        const levelsBefore = TR.totalTrialLevels(s) + s.trials.fastBest;
        performReset(s, 'supernova');
        if (wasIn && TR.totalTrialLevels(s) + s.trials.fastBest === levelsBefore) trialFailed.set(wasIn, s.stats.singularitiesAll ?? 0);
        runStart = s.playtime;
        bestRate = D(0);
        spendShards(s);
        if (TR.trialsOpen(s) && !TR.inTrial(s)) {
          const next = CH.TRIALS.find((t) => (t.id === 'fast' ? s.trials.fastBest < 0 : TR.trialLevel(s, t.id) < t.levels) && trialFailed.get(t.id) !== (s.stats.singularitiesAll ?? 0));
          if (next) TR.enterTrial(s, [next.id]);
        }
        const label = (s.stats.nebulasAll ?? 0) === 0 ? want.get(s.stats.supernovasAll ?? 0) : undefined;
        if (label) record(label);
      }
    }
  }
  console.log('\n=== Starforge balance simulation ===');
  console.log(`Bot: ${TAPS_PER_SECOND} taps/s, catches every comet, best-value engines, Supernova when it at least doubles lifetime shards (from 20 Supernovas: once shards per second peak).`);
  console.log(`First Supernova after ${firstSnPurchases} engine purchases and ${firstSnTiers} Star Tiers (target: about 60 and 3).`);
  console.table(rows);
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  console.log(`Run length, game time: first ${hms(runLengths[0] ?? 0)}, runs 2-5 avg ${hms(avg(runLengths.slice(1, 5)))}, 6-12 avg ${hms(avg(runLengths.slice(5, 12)))}, 13-30 avg ${hms(avg(runLengths.slice(12)))}`);
  if (TR.trialsOpen(s)) console.log(`Trials: ${TR.totalTrialLevels(s)} levels (${CH.TRIALS.filter((t) => TR.trialLevel(s, t.id) >= t.levels).length} mastered), Fast Nova ${CH.FAST_RANKS[s.trials.fastBest]?.name ?? 'none'}. Spire floor ${s.spire.floor}. Leviathans beaten ${s.stats.leviathansBeaten ?? 0}/12 (${s.stats.leviathanKills ?? 0} kills), Scale Tree ${Object.keys(s.scaleTree).length}/14, scales ${fmt(cur(s, 'scales'))}.`);
  if (singularityLengths.length) console.log(`Singularity runs, game time: first ${hms(singularityLengths[0] ?? 0)}, then ${singularityLengths.slice(1).map(hms).join(', ')}`);
  console.log(`Nebula runs, game time: first ${hms(nebulaLengths[0] ?? 0)}, then ${nebulaLengths.slice(1).map(hms).join(', ')}`);
  console.log(`Ended at ${s.stats.supernovasAll} Supernovas and ${s.stats.nebulasAll ?? 0} Nebulas, ${hms(s.playtime)} played, Nebula Tree ${nebulaShare(s)} bought, raw next gain ${fmt(rawShardGain(s))}.`);
  console.log(`Wyrms: team of ${s.wyrms.team.length}, ${s.stats.wyrmsHatched ?? 0} hatched, ${s.wyrms.found.length}/60 variants. Nursery: ${s.nursery.found.length}/25 species grown, ${s.stats.nurseryHarvests ?? 0} harvests. Auras ${s.stats.aurasFound ?? 0}/30, stars ${s.stats.starsEarned ?? 0}. Spectral best 10^${s.stats.spectralBest ?? 0}, ${s.stats.spectralColors ?? 0} colours; tarot ${s.tarot.owned.length}/60.`);
  console.log(`Singularities ${s.stats.singularitiesAll ?? 0}, Dark Matter (lifetime) ${fmt(s.totals.all.darkMatter ?? D(0))}, Black Hole stage ${BH.bhStage(s)} (mass ${fmt(s.blackHole.mass)}), game speed x${(stat(s, 'gameSpeed').toNumber()).toFixed(2)}, Singularity Tree ${Object.keys(s.singularityTree).length}/100, Embers ${fmt(cur(s, 'embers'))}.`);
}, 600_000);
