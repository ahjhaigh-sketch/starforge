/**
 * The balance simulator (npm run sim). A bot plays Starforge the way an engaged player would:
 * taps a few times a second, catches every comet, claims quests, buys the best-value engine,
 * evolves when it can, buys upgrades, constants and planets, and goes Supernova when the gain is
 * worth it, then spends shards on the cheapest Nova Tree node. It reports purchases and resets
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
}

const TAPS_PER_SECOND = 4;
const MAX_HOURS = 120;
const STOP_AT_SUPERNOVAS = 30;

interface Row {
  milestone: string;
  supernovas: number;
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

function spendShards(s: GameState): void {
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
  const s = createInitialState(0, 2026);
  const rt = createTapRuntime();
  const rows: Row[] = [];
  const record = (milestone: string) =>
    rows.push({
      milestone,
      supernovas: s.stats.supernovas ?? 0,
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
  const runLengths: number[] = [];
  let firstSnPurchases = 0;
  let firstSnTiers = 0;
  let ms = 0;
  while (s.playtime < MAX_HOURS * 3600 && (s.stats.supernovas ?? 0) < STOP_AT_SUPERNOVAS) {
    const dt = s.playtime - runStart < 1800 ? 1 : 5;
    for (let i = 0; i < TAPS_PER_SECOND * dt && i < 40; i++) tapStar(s, rt, (ms += 1000 / TAPS_PER_SECOND));
    tick(s, dt);
    if (cometOnScreen(s)) catchComet(s);
    s.quests.forEach((q, i) => questProgress(s, q) >= 1 && claimQuest(s, i));
    shop(s);
    if (supernovaReady(s)) {
      const g = supernovaGain(s);
      const lifetime = s.totals.all.shards ?? D(0);
      const tooLong = s.playtime - runStart > 4 * 3600;
      if ((s.stats.supernovas ?? 0) === 0 || g.gte(lifetime.max(3)) || tooLong) {
        if ((s.stats.supernovas ?? 0) === 0) {
          firstSnPurchases = s.stats.enginesBought ?? 0;
          firstSnTiers = s.tier;
        }
        runLengths.push(s.playtime - runStart);
        if (process.env.SIM_DEBUG && (s.stats.supernovas ?? 0) < 8) {
          console.log(`SN${(s.stats.supernovas ?? 0) + 1}: run ${(s.playtime - runStart).toFixed(0)}s gain ${fmt(g)} lifetime ${fmt(lifetime)} tier ${s.tier} sps ${fmt(stat(s, 'stardustPerSec'))} prodMult ${fmt(stat(s, 'productionMult'))} tap ${fmt(stat(s, 'tapPower'))} runS ${fmt(s.totals.run.stardust ?? D(0))} nodes ${Object.keys(s.novaTree).join(',')}`);
        }
        performReset(s, 'supernova');
        runStart = s.playtime;
        spendShards(s);
        const label = want.get(s.stats.supernovas ?? 0);
        if (label) record(label);
      }
    }
  }
  console.log('\n=== Starforge balance simulation ===');
  console.log(`Bot: ${TAPS_PER_SECOND} taps/s, catches every comet, best-value engines, Supernova when it at least doubles lifetime shards.`);
  console.log(`First Supernova after ${firstSnPurchases} engine purchases and ${firstSnTiers} Star Tiers (target: about 60 and 3).`);
  console.table(rows);
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  console.log(`Run length, game time: first ${hms(runLengths[0] ?? 0)}, runs 2-5 avg ${hms(avg(runLengths.slice(1, 5)))}, 6-12 avg ${hms(avg(runLengths.slice(5, 12)))}, 13-30 avg ${hms(avg(runLengths.slice(12)))}`);
  console.log(`Ended at ${s.stats.supernovas} Supernovas, ${hms(s.playtime)} played, raw next gain ${fmt(rawShardGain(s))}.`);
}, 600_000);
