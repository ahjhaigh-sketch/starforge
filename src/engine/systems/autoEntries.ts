import { BALANCE } from '../../content/balance';
import { CONSTANTS } from '../../content/constants';
import { CROSSBREEDS, STAR_SPECIES } from '../../content/nursery';
import { ETERNITY_UPGRADES } from '../../content/crunch';
import { FORGE_UPGRADES, RELICS } from '../../content/forge';
import { TURRETS } from '../../content/defense';
import { SECTORS } from '../../content/extras';
import { BUILDINGS, MEGASTRUCTURES, RESEARCH } from '../../content/galaxyBuild';
import { ANTIMATTER_ENGINES, MIRROR_UPGRADES } from '../../content/mirror';
import { PERKS } from '../../content/belt';
import { PARTS } from '../../content/shipParts';
import { SHRINES } from '../../content/runes';
import { SPECTRAL } from '../../content/nebulaExtras';
import { planPurchase } from '../buy';
import { maxBuy } from '../cost';
import { D } from '../decimal';
import { milestoneReached, performReset } from '../layers';
import { autoLevel, layerAutoEntries, layerAutoSetting, registerLayerAuto, setLayerAuto } from '../layerAuto';
import { AUTO_LAYERS } from '../../content/layers';
import { AUTO_BUYERS, autoSetting, autoUnlocked, setAuto } from './automation';
import { type GameState, spend, usable, withBuyMax } from '../state';
import { events } from '../events';
import { stat } from '../stats';
import { auraSlots, aurasOpen, bestAuras, polishAura } from './auras';
import { bhOpen, bhStage, setDustShare, wheelOpen } from './blackhole';
import { buildingCost, buyBuilding, buyPort, buyResearch, colonySlots, coloniesOpen, finishPlanet, foundColony, foundCost, hasResearch, maxRoutes, openRoute, paintBestLayout, terraOpen } from './colonies';
import { CONSTANT_SHARE, constantCurve, constantOpen, constantSetAuto, level } from './constants';
import { crunchGain, crunchReady } from './crunch';
import { defenseOpen, placeTurret, setDefenseAuto, autoOpen as defenseAutoOpen, buyTurretLevels } from './defense';
import { ECHO_BOARD, echoesOpen } from './echoes';
import { buyEternity, canBuyEternity, ruleSaysGo } from './eternity';
import { buyForgeUpgrade, buyRelic, forgeOpen, setForgeOn } from './forge';
import { buyAutoFuse, buyFusionUpgrade, fusionOpen } from './fusion';
import { autoPickGalaxy, galacticGain, galacticReady, galacticTree, galaxyCleared, galaxyMapOpen, firstUnexplored } from './galactic';
import { leviathansOpen, leviathansUnlocked, killsOf, chooseLeviathan, setFighting } from './leviathans';
import { buildStage } from './megastructures';
import { buyMirrorUpgrade, collapse, MIRROR_ENGINES, mirrorOpen } from './mirror';
import { multiverseGain, multiverseReady, sparkTree } from './multiverse';
import { nebulaGain, nebulaReady } from './nebula';
import { buyNurseryUpgrade, buySeeds, crossbreed, ensurePlots, harvestPlot, nurseryOpen, plant, plotProgress } from './nursery';
import { autoChart, maxLinks, observatoryOpen, recordConstellation } from './observatory';
import { buyKey, keyOnSale, singularityGain, singularityReady, singularityTree } from './singularity';
import { setShrine, shrineOpen, shrineState } from './runes';
import { buyShip, buyShipUpgrade, buyPart, fitBest, launch, partOwned, sectorOpen, shipsOpen } from './ships';
import { buySpectral, colorOpen, energyOf, oom, setFocus, spectralOpen } from './spectral';
import { setClimbing, spireOpen } from './spire';
import { starUp } from './starring';
import { addPerk, perkAvailable, perksFree } from './starsmith';
import { supernovaGain, supernovaReady } from './supernova';
import { bestDeck, openPacks, tarotOpen } from './tarot';
import { buyAllNodes, TREE_SHOP_BY_ID } from './treeShop';
import { autoTrialsOpen, goalMet as trialGoalMet, inTrial } from './trials';
import { ASPECTS, BEYOND_BY_ID, LAWS } from '../../content/beyond';
import { beyondGain, beyondReady, buyAxis, buyDevotion, lawOf, lawPoints, lawPointsUsed, lawsOpen, pantheonOpen, setAxis, setLaw, tesseractOpen, wakeAspect } from './beyond';
import { bestTeam, buyEggs, fuseAll, trainWyrm, wyrmsOpen } from './wyrms';
import { claimQuest, questProgress, questsOpen } from './quests';
import { buyDrillBit, buyDrillDrone } from './belt';
import { buyDeal, buyLuck, canAfford, merchantOpen } from './merchant';

/**
 * 1.4.0: what "runs itself" means for every system, layer by layer (systems/layerAuto). Level 1 runs
 * one layer up, level 2 two layers up (the layer's last few things). Everything buys all it can at
 * once, with the bulk amount at Max, inside automatedSpend (so never the safe tenth).
 */

const blocked = (s: GameState) => inTrial(s) && !trialGoalMet(s);

/** What the searching entries last searched for (a search is dear: only when what it searches over changes). Not saved. */
const searched = new WeakMap<GameState, Record<string, string>>();
const remember = (s: GameState, key: string, sig: string) => searched.set(s, { ...(searched.get(s) ?? {}), [key]: sig });
/** Galactic milestone 9: megastructures, colonies and Galactic Constants build themselves. */
const autoBuild = (s: GameState) => milestoneReached(s, 'galactic', 'autoBuild');

/** Every open constant of a set, as many levels as it can pay for at once. */
function maxConstants(s: GameState, set: string): void {
  if (!constantSetAuto(s, set)) return;
  for (const c of CONSTANTS) {
    if (c.set !== set || !constantOpen(s, c)) continue;
    const L = level(s, c.id);
    const plan = planPurchase(constantCurve(c), L, usable(s, c.currency).mul(CONSTANT_SHARE), 'max', 0, D(1));
    // worked out on what's usable, so spend() (which refuses past the safe tenth) takes it
    if (plan.count <= 0 || !plan.canAfford || !spend(s, c.currency, plan.cost)) continue;
    s.constants[c.id] = L + plan.count;
    events.emit({ t: 'purchase', kind: 'constant', id: c.id, amount: plan.count });
  }
}

const tree = (s: GameState, id: string) => {
  const shop = TREE_SHOP_BY_ID.get(id);
  if (shop) buyAllNodes(s, shop);
};

/**
 * 1.4.5: the Constant Engine (Galactic Tree) runs every set, the Nebula Constant Engine (Singularity Tree) the Nebula
 * set, before their layers would run them.
 */
const constantEngine = (s: GameState) => galacticTree.flag(s, 'autoConstants') > 0;
const nebulaEngine = (s: GameState) => singularityTree.flag(s, 'autoNebulaConstants') > 0 || constantEngine(s);
const SET_SOONER: Readonly<Record<string, (s: GameState) => boolean>> = { nebula: nebulaEngine, stellar: constantEngine, nova: constantEngine, void: constantEngine, galactic: constantEngine };

const constantsEntry = (set: string, layer: Parameters<typeof registerLayerAuto>[0]['layer'], name: string) =>
  ({ id: `constants.${set}`, name, layer, level: 1 as const, sooner: SET_SOONER[set], run: (s: GameState) => maxConstants(s, set) });

export function registerAutoEntries(): void {
  registerLayerAuto(
    // ---------- the Stardust layer: its auto-buyers all unlock at level 2 (automation.ts); these join them ----------
    constantsEntry('stellar', 'stardust', 'Stellar Constants'),
    {
      id: 'quests',
      name: 'Quests',
      layer: 'stardust',
      level: 2,
      run: (s) => {
        if (!questsOpen(s)) return;
        for (let i = 0; i < s.quests.length; i++) if (questProgress(s, s.quests[i]!) >= 1) claimQuest(s, i);
      },
    },
    {
      id: 'level',
      name: 'Starsmith perks',
      layer: 'stardust',
      level: 2,
      // free points go on the lowest perk you can take, one at a time, so they climb together
      run: (s) => {
        for (let i = 0; i < 200 && perksFree(s) > 0; i++) {
          const open = PERKS.filter((p) => perkAvailable(s, p)).sort((a, b) => (s.starsmith.perks[a.id] ?? 0) - (s.starsmith.perks[b.id] ?? 0));
          if (!open[0] || !addPerk(s, open[0].id)) break;
        }
      },
    },

    // ---------- the Supernova layer ----------
    {
      id: 'supernova',
      name: 'Supernovas',
      layer: 'supernova',
      level: 1,
      run: (s) => {
        if (supernovaReady(s) && !blocked(s) && ruleSaysGo(s, 'supernova', supernovaGain(s), 'shards')) performReset(s, 'supernova');
      },
    },
    { id: 'novatree', name: 'Nova Tree', layer: 'supernova', level: 1, run: (s) => tree(s, 'novatree') },
    {
      id: 'starforge',
      name: 'Starforge',
      layer: 'supernova',
      level: 1,
      run: (s) => {
        if (!forgeOpen(s)) return;
        if (!s.forge.on) setForgeOn(s, true);
        withBuyMax(s, () => {
          for (const u of FORGE_UPGRADES) buyForgeUpgrade(s, u.id);
          for (const r of RELICS) buyRelic(s, r.id);
        });
      },
    },
    {
      id: 'drill',
      name: 'Deep Core',
      layer: 'supernova',
      level: 1,
      run: (s) =>
        withBuyMax(s, () => {
          buyDrillDrone(s);
          buyDrillBit(s);
        }),
    },
    {
      id: 'fusion',
      name: 'Comet Fusion',
      layer: 'supernova',
      level: 1,
      run: (s) => {
        if (!fusionOpen(s)) return;
        if (!s.fusion.autoOwned) buyAutoFuse(s);
        else if (!s.fusion.autoOn) s.fusion.autoOn = true;
        withBuyMax(s, () => {
          for (const id of ['speed', 'start', 'size'] as const) buyFusionUpgrade(s, id);
        });
      },
    },
    {
      id: 'expeditions',
      name: 'Starships',
      layer: 'supernova',
      level: 1,
      run: (s) => {
        if (!shipsOpen(s)) return;
        while (buyShip(s));
        withBuyMax(s, () => {
          for (const id of ['engines', 'cargo', 'crew'] as const) buyShipUpgrade(s, id);
        });
        for (const p of PARTS) if (!partOwned(s, p.id)) buyPart(s, p.id);
        const best = [...SECTORS].reverse().find((x) => sectorOpen(s, x));
        if (best)
          s.ships.fleet.forEach((sh, i) => {
            if (sh.sector) return;
            fitBest(s, i, best.id);
            launch(s, i, best.id, true);
          });
      },
    },
    {
      id: 'merchant',
      name: 'Merchant',
      layer: 'supernova',
      level: 2,
      run: (s) => {
        if (!merchantOpen(s)) return;
        s.merchant.deals.forEach((d, i) => {
          if (!d.sold && canAfford(s, d) && d.pay.amount.lte(usable(s, d.pay.currency).mul(0.5))) buyDeal(s, i);
        });
        withBuyMax(s, () => buyLuck(s));
      },
    },

    // things that need nothing bought: they tuck away with the rest of their layer
    { id: 'attune', name: 'Attunements', layer: 'supernova', level: 2, run: () => undefined },

    // ---------- the Nebula layer ----------
    {
      id: 'nebula',
      name: 'Nebulas',
      layer: 'nebula',
      level: 1,
      run: (s) => {
        if (nebulaReady(s) && !blocked(s) && ruleSaysGo(s, 'nebula', nebulaGain(s), 'essence')) performReset(s, 'nebula');
      },
    },
    { id: 'nebulatree', name: 'Nebula Tree', layer: 'nebula', level: 1, run: (s) => tree(s, 'nebulatree') },
    constantsEntry('nebula', 'nebula', 'Nebula Constants'),
    {
      id: 'runes',
      name: 'Rune shrines',
      layer: 'nebula',
      level: 1,
      // every shrine you've opened rolls by itself (never the Eternal Shrine: Chronons buy Eternity)
      run: (s) => {
        for (const sh of SHRINES) if (sh.id !== 'eternal' && shrineOpen(s, sh) && !shrineState(s, sh.id).auto) setShrine(s, sh.id, { auto: true });
      },
    },
    {
      id: 'spectral',
      name: 'Spectral Focus',
      layer: 'nebula',
      level: 1,
      run: (s) => {
        if (!spectralOpen(s)) return;
        const open = SPECTRAL.filter((c) => colorOpen(s, c.id)).sort((a, b) => oom(energyOf(s, a.id)) - oom(energyOf(s, b.id)));
        if (open[0] && s.spectral.focus !== open[0].id) setFocus(s, open[0].id);
        withBuyMax(s, () => {
          buySpectral(s, 'lens');
          buySpectral(s, 'afterglow');
        });
      },
    },
    { id: 'starring', name: 'Rune Stars', layer: 'nebula', level: 2, run: (s) => SHRINES.forEach((sh) => starUp(s, sh.id)) },
    { id: 'mutations', name: 'Mutations', layer: 'nebula', level: 2, run: () => undefined },
    {
      id: 'auras',
      name: 'Auras',
      layer: 'nebula',
      level: 2,
      run: (s) => {
        if (!aurasOpen(s)) return;
        // the dice roll themselves with the Auras' own auto-roll (cheap in any step)
        if (!s.auras.auto) s.auras.auto = true;
        for (const id of Object.keys(s.auras.copies)) while (polishAura(s, id));
        // the best set: a search among the strongest few, only when a new kind turns up (or a slot is empty)
        const sig = `${Object.keys(s.auras.copies).filter((id) => s.auras.copies[id]!.gt(0)).length}`;
        const full = !!s.auras.equipped && (s.auras.more ?? []).filter(Boolean).length >= auraSlots(s) - 1;
        const last = searched.get(s)?.auras;
        if (last === undefined && full) remember(s, 'auras', sig);
        else if (last !== sig) {
          bestAuras(s, 6);
          remember(s, 'auras', sig);
        }
      },
    },
    {
      id: 'wyrms',
      name: 'Wyrms',
      layer: 'nebula',
      level: 2,
      run: (s) => {
        if (!wyrmsOpen(s)) return;
        const hatched = withBuyMax(s, () => buyEggs(s));
        if (fuseAll(s) > 0 || hatched || s.wyrms.team.length === 0) bestTeam(s);
        withBuyMax(s, () => {
          for (const key of s.wyrms.team) trainWyrm(s, key);
        });
      },
    },
    {
      id: 'nursery',
      name: 'Star Nursery',
      layer: 'nebula',
      level: 2,
      run: (s) => {
        if (!nurseryOpen(s)) return;
        withBuyMax(s, () => {
          for (const id of Object.keys(BALANCE.nursery.upgrades)) buyNurseryUpgrade(s, id);
        });
        for (const [a, b, c] of CROSSBREEDS) if ((s.nursery.seeds[c] ?? 0) === 0 && (s.nursery.seeds[a] ?? 0) >= 2 && (s.nursery.seeds[b] ?? 0) >= 2) crossbreed(s, a, b);
        ensurePlots(s);
        s.nursery.plots.forEach((plot, i) => {
          if (plotProgress(s, i) >= 1) harvestPlot(s, i);
          if (plot.species) return;
          const want = STAR_SPECIES.filter((x) => (s.nursery.seeds[x.id] ?? 0) >= 1).sort((x, y) => y.tier - x.tier)[0];
          if (want) plant(s, i, want.id);
          else if (buySeeds(s, STAR_SPECIES[0]!.id)) plant(s, i, STAR_SPECIES[0]!.id);
        });
      },
    },
    {
      id: 'tarot',
      name: 'Tarot',
      layer: 'nebula',
      level: 2,
      run: (s) => {
        if (!tarotOpen(s)) return;
        const before = s.tarot.owned.length;
        withBuyMax(s, () => openPacks(s));
        if (s.tarot.owned.length !== before || s.tarot.deck.every((x) => !x)) bestDeck(s);
      },
    },

    // ---------- the Singularity layer ----------
    {
      id: 'singularity',
      name: 'Singularities',
      layer: 'singularity',
      level: 1,
      run: (s) => {
        if (keyOnSale(s) && !s.singularity.key) buyKey(s);
        if (singularityReady(s) && !blocked(s) && ruleSaysGo(s, 'singularity', singularityGain(s), 'darkMatter')) performReset(s, 'singularity');
      },
    },
    { id: 'singularitytree', name: 'Singularity Tree', layer: 'singularity', level: 1, run: (s) => tree(s, 'singularitytree') },
    constantsEntry('void', 'singularity', 'Void Constants'),
    {
      id: 'blackhole',
      name: 'Black Hole',
      layer: 'singularity',
      level: 1,
      run: (s) => {
        if (!bhOpen(s)) return;
        if (bhStage(s) < 8 && s.blackHole.dustShare <= 0) setDustShare(s, 0.2);
        if (wheelOpen(s) && !s.wheel.on) s.wheel.on = true;
      },
    },
    {
      id: 'mirror',
      name: 'Antimatter Mirror',
      layer: 'singularity',
      level: 2,
      // Galactic milestone 6 runs it sooner (it has to be rebuilt every Galactic Rebirth)
      sooner: (s) => milestoneReached(s, 'galactic', 'autoMirror'),
      run: (s) => {
        if (!mirrorOpen(s)) return;
        while (collapse(s));
        for (const u of MIRROR_UPGRADES) buyMirrorUpgrade(s, u.id);
        for (let k = ANTIMATTER_ENGINES.length - 1; k >= 0; k--) {
          const e = ANTIMATTER_ENGINES[k]!;
          if (!MIRROR_ENGINES.revealed(s, k)) continue;
          const n = maxBuy(MIRROR_ENGINES.curve(e.id), MIRROR_ENGINES.owned(s, e.id), usable(s, 'antimatter').div(stat(s, 'amCostMult')));
          if (n > 0) MIRROR_ENGINES.buy(s, e.id, n);
        }
      },
    },
    {
      id: 'defense',
      name: 'Planet Defense',
      layer: 'singularity',
      level: 2,
      run: (s) => {
        if (!defenseOpen(s)) return;
        // fill empty sockets round the turrets in turn, then level every turret placed
        s.defense.sockets.forEach((k, i) => {
          if (!k) placeTurret(s, i, TURRETS[i % TURRETS.length]!.id);
        });
        withBuyMax(s, () => {
          for (const t of TURRETS) if (s.defense.sockets.includes(t.id)) buyTurretLevels(s, t.id);
        });
        if (defenseAutoOpen(s) && !s.defense.auto) setDefenseAuto(s, true);
      },
    },
    { id: 'spire', name: 'Spire', layer: 'singularity', level: 2, run: (s) => spireOpen(s) && !s.spire.climbing && setClimbing(s, true) },
    {
      id: 'leviathans',
      name: 'Leviathans',
      layer: 'singularity',
      level: 2,
      // fight the first one not yet beaten (or the latest), always
      run: (s) => {
        if (!leviathansOpen(s)) return;
        if (!s.leviathans.fighting) setFighting(s, true);
        const n = leviathansUnlocked(s);
        let want = n - 1;
        for (let k = 0; k < n; k++)
          if (killsOf(s, k) === 0) {
            want = k;
            break;
          }
        if (want >= 0 && want !== s.leviathans.current) chooseLeviathan(s, want);
      },
    },
    { id: 'scaletree', name: 'Scale Tree', layer: 'singularity', level: 2, run: (s) => tree(s, 'scaletree') },
    { id: 'prismwheel', name: 'Prism Wheel', layer: 'singularity', level: 2, run: (s) => wheelOpen(s) && !s.wheel.on && (s.wheel.on = true) },
    // the Reactor is fed a tenth of each Singularity by the Eternal Void hook (systems/eternity)
    { id: 'reactor', name: 'Reactor', layer: 'singularity', level: 2, run: () => undefined },
    { id: 'trials', name: 'Trials', layer: 'singularity', level: 2, run: (s) => autoTrialsOpen(s) && !s.trials.auto && (s.trials.auto = true) },
    { id: 'wormholes', name: 'Wormholes', layer: 'singularity', level: 2, run: () => undefined },

    // ---------- the Galactic layer ----------
    {
      id: 'galactic',
      name: 'Galactic Rebirths',
      layer: 'galactic',
      level: 1,
      // Galactic milestone 8 brings it in sooner. It goes once the galaxy you're in is explored (a rebirth would lose its
      // goal's progress), or there's nowhere new to go
      sooner: (s) => milestoneReached(s, 'galactic', 'autoGalactic'),
      run: (s) => {
        if (!s.galactic.explore && galaxyMapOpen(s) && galaxyCleared(s, s.galactic.next)) {
          const g = firstUnexplored(s);
          if (g) s.galactic.next = g.id;
        } else autoPickGalaxy(s);
        const leaving = s.galactic.next !== s.galactic.galaxy;
        const explored = (s.stats.galacticsAll ?? 0) === 0 || leaving || galaxyCleared(s, s.galactic.galaxy) || !firstUnexplored(s);
        if (!explored || !galacticReady(s) || blocked(s)) return;
        // this galaxy is explored and the next one isn't: moving on beats waiting for more Galaxy Cores (unless you set an amount)
        const onwards = leaving && galaxyCleared(s, s.galactic.galaxy) && !galaxyCleared(s, s.galactic.next);
        const rule = layerAutoSetting(s, 'galactic');
        const g = galacticGain(s);
        if (onwards ? rule.mode !== 'amount' || g.gte(rule.at) : ruleSaysGo(s, 'galactic', g, 'galaxyCores')) performReset(s, 'galactic');
      },
    },
    { id: 'galactictree', name: 'Galactic Tree', layer: 'galactic', level: 1, run: (s) => tree(s, 'galactictree') },
    { ...constantsEntry('galactic', 'galactic', 'Galactic Constants'), sooner: (s: GameState) => autoBuild(s) || constantEngine(s) },
    { id: 'megastructures', name: 'Megastructures', layer: 'galactic', level: 1, sooner: autoBuild, run: (s) => MEGASTRUCTURES.forEach((m) => { while (buildStage(s, m.id)); }) },
    {
      id: 'colonies',
      name: 'Colonies',
      layer: 'galactic',
      level: 1,
      sooner: autoBuild,
      run: (s) => {
        if (!coloniesOpen(s)) return;
        const types = ['rocky', 'ocean', 'ice', 'desert', 'gasmoon'];
        while (s.colonies.list.length < colonySlots(s) && foundCost(s).lte(usable(s, 'galaxyCores').mul(0.25))) if (!foundColony(s, types[s.colonies.list.length % types.length]!)) break;
        for (const r of RESEARCH) if (!hasResearch(s, r.id) && D(r.cost).lte(usable(s, 'supply').mul(0.5))) buyResearch(s, r.id);
        s.colonies.list.forEach((c, i) => {
          for (const { id } of BUILDINGS) for (let k = 0; k < 50 && buildingCost(c, id).lte(usable(s, 'supply').mul(0.25)); k++) buyBuilding(s, i, id);
          if (!c.port && usable(s, 'supply').gte(BALANCE.galaxyBuild.portCost * 2)) buyPort(s, i);
        });
        for (let a = 0; a < s.colonies.list.length && s.colonies.routes.length < maxRoutes(s); a++) for (let b = a + 1; b < s.colonies.list.length; b++) openRoute(s, a, b);
      },
    },
    {
      id: 'observatory',
      name: 'Observatory',
      layer: 'galactic',
      level: 2,
      // a strong shape for each new sky (greedy at first, then polished on the next pass under the same sky), recorded for
      // its Star Charts
      run: (s) => {
        if (!observatoryOpen(s)) return;
        const sig = `${s.observatory.seed}:${maxLinks(s)}`;
        const last = searched.get(s)?.sky;
        // a sky already charted (a loaded game) keeps its shape until the next sky
        if (last === undefined && s.observatory.links.length >= maxLinks(s)) remember(s, 'sky', sig);
        else if (last !== sig && last !== `${sig}:greedy`) {
          autoChart(s, false);
          remember(s, 'sky', `${sig}:greedy`);
        } else if (last === `${sig}:greedy`) {
          autoChart(s, true);
          remember(s, 'sky', sig);
        }
        recordConstellation(s);
      },
    },
    { id: 'starchart', name: 'Star Chart', layer: 'galactic', level: 2, run: (s) => tree(s, 'starchart') },
    {
      id: 'terraform',
      name: 'Terraforming',
      layer: 'galactic',
      level: 2,
      // the best layout on every unfinished planet, then finish it
      run: (s) => {
        if (!terraOpen(s)) return;
        s.colonies.list.forEach((c, i) => {
          if (c.finished !== null) return;
          paintBestLayout(s, i);
          finishPlanet(s, i);
        });
      },
    },

    // ---------- the Big Crunch layer ----------
    {
      id: 'bigcrunch',
      name: 'Big Crunches',
      layer: 'crunch',
      level: 1,
      run: (s) => {
        if (crunchReady(s) && !blocked(s) && ruleSaysGo(s, 'crunch', crunchGain(s), 'chronons')) performReset(s, 'crunch');
      },
    },
    {
      id: 'eternity',
      name: 'Eternity upgrades',
      layer: 'crunch',
      level: 1,
      run: (s) => {
        for (const u of [...ETERNITY_UPGRADES].sort((a, b) => a.cost - b.cost)) if (canBuyEternity(s, u)) buyEternity(s, u.id);
      },
    },
    constantsEntry('eternal', 'crunch', 'Eternal Constants'),
    {
      id: 'echoes',
      name: 'Echo Boards',
      layer: 'crunch',
      level: 2,
      run: (s) => {
        if (!echoesOpen(s)) return;
        const engines = ECHO_BOARD.def.engines;
        for (let k = engines.length - 1; k >= 0; k--) {
          const e = engines[k]!;
          if (!ECHO_BOARD.revealed(s, k)) continue;
          const n = maxBuy(ECHO_BOARD.curve(e.id), ECHO_BOARD.owned(s, e.id), usable(s, 'echoDust').div(stat(s, 'echoCostMult')));
          if (n > 0) ECHO_BOARD.buy(s, e.id, n);
        }
      },
    },

    // ---------- the Multiverse layer ----------
    {
      id: 'multiverse',
      name: 'Multiverses',
      layer: 'multiverse',
      level: 1,
      run: (s) => {
        if (multiverseReady(s) && !blocked(s) && ruleSaysGo(s, 'multiverse', multiverseGain(s), 'sparks')) performReset(s, 'multiverse');
      },
    },
    {
      id: 'sparktree',
      name: 'Spark choices',
      layer: 'multiverse',
      level: 1,
      run: (s) => {
        for (let i = 0; i < 200; i++) {
          const pick = sparkTree.def.nodes.filter((n) => sparkTree.canBuy(s, n)).sort((a, b) => sparkTree.cost(s, a).cmp(sparkTree.cost(s, b)))[0];
          if (!pick || !sparkTree.buy(s, pick.id)) break;
        }
      },
    },
    constantsEntry('omni', 'multiverse', 'Omni Constants'),

    // ---------- beyond the Multiverse ----------
    ...(['hyperverse', 'omniverse', 'genesis'] as const).map((id) => ({
      id,
      name: `${BEYOND_BY_ID.get(id)!.name} resets`,
      layer: id,
      level: 1 as const,
      run: (s: GameState) => {
        if (beyondReady(s, id) && !blocked(s) && ruleSaysGo(s, id, beyondGain(s, id), BEYOND_BY_ID.get(id)!.currency)) performReset(s, id);
      },
    })),
    {
      id: 'tesseract',
      name: 'Tesseract',
      layer: 'hyperverse',
      level: 1,
      // empty axes take the four layers from the Supernova to the Galactic (three neighbours resonate), then every axis climbs
      run: (s) => {
        if (!tesseractOpen(s)) return;
        const plan = ['supernova', 'nebula', 'singularity', 'galactic'];
        s.tesseract.axes.forEach((a, i) => {
          if (!a && !s.tesseract.axes.includes(plan[i]!)) setAxis(s, i, plan[i]!);
        });
        withBuyMax(s, () => {
          for (let round = 0; round < 4; round++) for (let i = 0; i < 4; i++) buyAxis(s, i);
        });
      },
    },
    {
      id: 'pantheon',
      name: 'Pantheon',
      layer: 'omniverse',
      level: 1,
      run: (s) => {
        if (!pantheonOpen(s)) return;
        for (const a of ASPECTS) if (!s.pantheon.awake.includes(a.id)) wakeAspect(s, a.id);
        withBuyMax(s, () => {
          for (const id of s.pantheon.ascendant) buyDevotion(s, id);
        });
      },
    },
    {
      id: 'laws',
      name: 'Laws',
      layer: 'genesis',
      level: 2,
      // unused points: one on every law first (Harmony), then up on Time, Gravity, Light, Entropy and Charge in turn
      run: (s) => {
        if (!lawsOpen(s)) return;
        for (const l of LAWS) if (lawOf(s, l.id) === 0) setLaw(s, l.id, 1);
        for (let i = 0; i < 50 && lawPointsUsed(s) < lawPoints(s); i++) {
          const next = ['time', 'gravity', 'light', 'entropy', 'charge'].find((id) => lawOf(s, id) >= 0 && lawOf(s, id) < BALANCE.beyond.laws.maxStep && setLaw(s, id, lawOf(s, id) + 1));
          if (!next) break;
        }
      },
    },
  );
  // systems whose own purchases needn't be looked at every second (the speed budgets)
  for (const e of layerAutoEntries()) {
    const every = SLOW[e.id];
    if (every) e.every = every;
  }
}

/** Game seconds between passes for the slower entries. */
const SLOW: Readonly<Record<string, number>> = { starforge: 5, drill: 5, fusion: 5, expeditions: 5, merchant: 10, spectral: 5, starring: 10, auras: 5, wyrms: 10, nursery: 5, tarot: 10, defense: 5, observatory: 5, colonies: 5, terraform: 10, echoes: 2, mirror: 2 };

/**
 * 1.4.0, Auto all (the Automation menu): every auto-buyer you've earned on, spending all it may; every layer that
 * can run itself switched on; Auto-explore, auto-fuse, Planet Defense waves, the Spire, the Leviathans, every
 * starship and every open rune shrine (never the Eternal Shrine) running. Returns how many switches it turned on.
 */
export function autoAll(s: GameState): number {
  let n = 0;
  for (const a of AUTO_BUYERS) {
    if (!autoUnlocked(s, a)) continue;
    const st = autoSetting(s, a.id);
    if (!st.on || st.spend !== 1) n++;
    setAuto(s, a.id, { on: true, spend: 1 });
  }
  for (const l of AUTO_LAYERS) {
    if (autoLevel(s, l) === 0) continue;
    if (!layerAutoSetting(s, l).on) n++;
    setLayerAuto(s, l, { on: true });
  }
  if (!s.galactic.explore) n++;
  s.galactic.explore = true;
  if (s.fusion.autoOwned && !s.fusion.autoOn) {
    s.fusion.autoOn = true;
    n++;
  }
  if (defenseOpen(s) && defenseAutoOpen(s) && !s.defense.auto) {
    setDefenseAuto(s, true);
    n++;
  }
  if (spireOpen(s) && !s.spire.climbing) {
    setClimbing(s, true);
    n++;
  }
  if (leviathansOpen(s) && !s.leviathans.fighting) {
    setFighting(s, true);
    n++;
  }
  s.ships.fleet.forEach((sh) => {
    if (!sh.auto) n++;
    sh.auto = true;
  });
  for (const sh of SHRINES)
    if (sh.id !== 'eternal' && shrineOpen(s, sh) && !shrineState(s, sh.id).auto) {
      setShrine(s, sh.id, { auto: true });
      n++;
    }
  return n;
}
