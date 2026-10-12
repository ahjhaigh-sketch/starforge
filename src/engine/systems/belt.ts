import { BALANCE } from '../../content/balance';
import { BELT_UPGRADES, type BeltUpgradeId, DEPTH_LAYERS, RARITIES } from '../../content/belt';
import { GRADES } from '../../content/forge';
import { planLimited, type PurchasePlan } from '../buy';
import { bulkCost, type CostCurve, priceAt } from '../cost';
import { D, type Decimal, ZERO } from '../decimal';
import { events } from '../events';
import { drawHits } from '../odds';
import { nextFloat } from '../rng';
import { cur, gain, type GameState, spend } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { pacedDt, registerSystem, type TickContext } from '../tick';
import { asteroidMutMult, drawAsteroidMutations, recordAsteroidMutation, rollAsteroidMutation } from './mutations';
import { addXp } from './starsmith';

/**
 * The Asteroid Belt: asteroids drift into a field up to a cap; sweeping the tractor beam over them
 * harvests ore, Starsmith XP and a little Stardust. The field lives in the save (ids and rarities,
 * rolled with the seeded generator), so drones can keep harvesting offline and reloading never
 * re-rolls a rare one. Positions are only drawn, never stored.
 */
const B = BALANCE.belt;

export const beltOpen = (s: GameState) => s.tier >= B.tier || s.unlocked.includes('belt');
export const beltLevel = (s: GameState, id: BeltUpgradeId) => s.belt.upgrades[id] ?? 0;

const curves = new Map<string, CostCurve>();
export function beltCurve(id: BeltUpgradeId): CostCurve {
  let c = curves.get(id);
  if (!c) {
    const u = B.upgrades[id];
    c = { base: u.base, brackets: [{ from: 0, ratio: u.growth }] };
    curves.set(id, c);
  }
  return c;
}

/** Value and XP upgrades: (i + 1) x 2^floor(i / 25). */
const doublingShape = (i: number) => (i + 1) * 2 ** Math.floor(i / 25);

export const tierMult = (s: GameState): Decimal => D(2).pow(s.belt.tier);

export function rollRarity(s: GameState): number {
  const luck = stat(s, 'beltLuck').toNumber();
  // rarest first; each check is luck / oneIn
  for (let i = RARITIES.length - 1; i > 0; i--) if (nextFloat(s.belt.rng) < luck / RARITIES[i]!.oneIn) return i;
  return 0;
}

/** The Void rarity: from the first Singularity its asteroids also give Dark Matter (Game design: Rarities). */
const VOID = RARITIES.findIndex((r) => r.id === 'void');
/** Dark Matter from `worth` Void asteroids (a mutated one counts its mutation's size): one base unit each, as a Singularity's gain is counted in. */
const voidDarkMatter = (s: GameState, worth: number): Decimal => ((s.stats.singularitiesAll ?? 0) > 0 ? stat(s, 'darkMatterGain').mul(worth) : ZERO);

/** The chance a new asteroid has each rarity (rollRarity's odds: the rarest is checked first). */
function rarityShares(s: GameState): number[] {
  const luck = stat(s, 'beltLuck').toNumber();
  const shares = RARITIES.map(() => 0);
  let left = 1;
  for (let i = RARITIES.length - 1; i > 0; i--) {
    const p = Math.min(1, luck / RARITIES[i]!.oneIn);
    shares[i] = left * p;
    left *= 1 - p;
  }
  shares[0] = left;
  return shares;
}

/** Past this many arrivals in one step, the ones drones sweep in that same step are counted, not made. */
const ONE_BY_ONE = 64;

/**
 * Asteroids that arrive and are swept by drones within one step, counted instead of made one by
 * one (a late-game catch-up step sees millions; making each cost 6 ms a step, found by the speed
 * budgets). Each rarity is one draw from the belt's stream and each mutation one draw from the
 * mutation stream, like the runes, so on average it pays what harvesting them one at a time would.
 */
function sweepThrough(s: GameState, count: number, scale: number): void {
  const shares = rarityShares(s);
  const sps = stat(s, 'stardustPerSec');
  let left = count;
  let below = 1; // the chance of this rarity or a commoner one
  let ore = ZERO;
  let xp = ZERO;
  let dust = ZERO;
  for (let r = RARITIES.length - 1; r >= 0 && left > 0; r--) {
    const p = r === 0 || below <= 0 ? 1 : Math.min(1, shares[r]! / below);
    below -= shares[r]!;
    const n = p >= 1 ? left : Math.min(left, drawHits(s.belt.rng, D(left), Math.log10(p), 1000).toNumber());
    if (n <= 0) continue;
    left -= n;
    // each asteroid is worth 1, or its mutation's size
    let worth = n;
    for (const { m, count: k } of drawAsteroidMutations(s, n)) {
      worth += k * (asteroidMutMult(m) - 1);
      recordAsteroidMutation(s, r, m, k);
    }
    const o = oreFor(s, r).mul(worth);
    ore = ore.add(o);
    xp = xp.add(xpFor(s, r).mul(worth));
    dust = dust.add(sps.mul(B.stardustSeconds * Math.sqrt(RARITIES[r]!.mult) * n));
    if (r === VOID) gain(s, 'darkMatter', voidDarkMatter(s, worth).mul(scale));
    if (r > 0) {
      gain(s, GRADES[r]!.ore, o.mul(scale));
      events.emit({ t: 'harvest', rarity: RARITIES[r]!.id, hand: false });
    }
  }
  ore = ore.mul(scale);
  gain(s, 'ore', ore);
  s.belt.oreThisTier = s.belt.oreThisTier.add(ore);
  addXp(s, xp.mul(scale));
  gain(s, 'stardust', dust.mul(scale));
  s.stats.harvested = (s.stats.harvested ?? 0) + count;
}

/** Ore one asteroid of this rarity gives. */
export function oreFor(s: GameState, rarity: number): Decimal {
  return stat(s, 'oreValue').mul(RARITIES[rarity]!.mult);
}

export function xpFor(s: GameState, rarity: number): Decimal {
  return stat(s, 'beltXp').mul(RARITIES[rarity]!.mult);
}

/**
 * Harvests these asteroids (if still there). Returns how many were taken. Drones pass `scale`, the
 * offline efficiency during catch-up, and `hand` false; a sweep by the player is always full value.
 */
export function harvest(s: GameState, ids: readonly number[], scale = 1, hand = true): number {
  if (!beltOpen(s) || ids.length === 0) return 0;
  const want = new Set(ids);
  let n = 0;
  let ore = ZERO;
  let xp = ZERO;
  let dust = ZERO;
  let darkMatter = ZERO;
  /** Rare asteroids also give their own grade of ore for the Starforge: as much as their common ore. */
  const rare = new Map<number, Decimal>();
  const sps = stat(s, 'stardustPerSec');
  const keep = s.belt.field.filter((a) => {
    if (!want.has(a.id)) return true;
    n++;
    // a mutated asteroid (from 3 Nebulas) is worth its mutation's size in ore and XP
    const mm = asteroidMutMult(a.m);
    ore = ore.add(oreFor(s, a.r).mul(mm));
    xp = xp.add(xpFor(s, a.r).mul(mm));
    recordAsteroidMutation(s, a.r, a.m);
    dust = dust.add(sps.mul(B.stardustSeconds * Math.sqrt(RARITIES[a.r]!.mult)));
    // rare asteroids give their own grade of ore (a Crystal asteroid's is the Crystal the Starforge smelts); Void ones Dark Matter too
    if (a.r === VOID) darkMatter = darkMatter.add(voidDarkMatter(s, mm));
    if (a.r > 0) {
      rare.set(a.r, (rare.get(a.r) ?? ZERO).add(oreFor(s, a.r).mul(mm)));
      events.emit({ t: 'harvest', rarity: RARITIES[a.r]!.id, hand });
    }
    return false;
  });
  if (n === 0) return 0;
  s.belt.field = keep;
  if (scale !== 1) {
    ore = ore.mul(scale);
    xp = xp.mul(scale);
    dust = dust.mul(scale);
  }
  gain(s, 'ore', ore);
  for (const [r, amount] of rare) gain(s, GRADES[r]!.ore, amount.mul(scale));
  s.belt.oreThisTier = s.belt.oreThisTier.add(ore);
  addXp(s, xp);
  gain(s, 'stardust', dust);
  if (darkMatter.gt(0)) gain(s, 'darkMatter', darkMatter.mul(scale));
  s.stats.harvested = (s.stats.harvested ?? 0) + n;
  events.emit({ t: 'harvest', rarity: 'any', hand });
  return n;
}

export function beltUpgradeCost(s: GameState, id: BeltUpgradeId, count = 1): Decimal {
  return bulkCost(beltCurve(id), beltLevel(s, id), count);
}

/** Highest level an upgrade can reach: the beam stops at 8 levels, the field at 400 asteroids. */
export function beltLimit(s: GameState, id: BeltUpgradeId): number {
  if (id === 'beam') return B.beamMaxLevel;
  if (id === 'amount') return beltLevel(s, id) + Math.max(0, B.maxCap - Math.floor(stat(s, 'beltCap').toNumber()));
  return Infinity;
}

export const beltUpgradeMaxed = (s: GameState, id: BeltUpgradeId) => beltLevel(s, id) >= beltLimit(s, id);

/** Value and XP double every 25 levels, so "Next" buys up to the next doubling. */
const nextDoubling = (level: number) => (Math.floor(level / 25) + 1) * 25;

export function beltPlan(s: GameState, id: BeltUpgradeId): PurchasePlan {
  const level = beltLevel(s, id);
  const next = id === 'value' || id === 'xp' ? nextDoubling(level) : undefined;
  return planLimited(beltCurve(id), level, cur(s, 'ore'), s.settings.buyAmount, s.settings.customBuyAmount, beltLimit(s, id), next);
}

/** From Belt Tier 4 upgrades no longer cost ore (you still need that much). */
export const freeUpgrades = (s: GameState) => s.belt.tier >= 4;

/** Buys the current buy amount (x1 to Max, or typed). From Belt Tier 4 you need the ore but keep it. */
export function buyBeltUpgrade(s: GameState, id: BeltUpgradeId): boolean {
  if (!beltOpen(s)) return false;
  const plan = beltPlan(s, id);
  if (plan.count <= 0 || !plan.canAfford) return false;
  if (!freeUpgrades(s)) spend(s, 'ore', plan.cost);
  s.belt.upgrades[id] = beltLevel(s, id) + plan.count;
  events.emit({ t: 'purchase', kind: 'belt', id, amount: plan.count });
  return true;
}

/**
 * 1.2.0 Auto-Belt: buys as many levels of every Belt upgrade as its share of your ore pays for,
 * then moves up a Belt Tier as soon as it can (a Belt Tier only resets the Belt's own ore and upgrades).
 */
export function autoBelt(s: GameState, share: number): void {
  if (!beltOpen(s)) return;
  for (const u of BELT_UPGRADES) {
    const level = beltLevel(s, u.id);
    const plan = planLimited(beltCurve(u.id), level, cur(s, 'ore').mul(share), 'max', 0, beltLimit(s, u.id));
    if (plan.count <= 0 || !plan.canAfford) continue;
    if (!freeUpgrades(s) && !spend(s, 'ore', plan.cost)) continue;
    s.belt.upgrades[u.id] = level + plan.count;
    events.emit({ t: 'purchase', kind: 'belt', id: u.id, amount: plan.count });
  }
  beltTierUp(s);
}

/** Ore needed this tier to reach Belt Tier T: 100 x 3^(T^1.2). */
export function beltTierNeed(T: number): Decimal {
  return D(B.tierBase).mul(D(B.tierRatio).pow(T ** B.tierPow));
}

/** A mini-reset inside the Belt: ore and upgrades go, x2 ore and XP and one automation stay. */
export function beltTierUp(s: GameState): boolean {
  const need = beltTierNeed(s.belt.tier + 1);
  if (s.belt.oreThisTier.lt(need)) return false;
  s.belt.tier += 1;
  s.stats.beltTier = Math.max(s.stats.beltTier ?? 0, s.belt.tier);
  s.belt.upgrades = {};
  s.belt.oreThisTier = ZERO;
  s.currencies.ore = ZERO;
  events.emit({ t: 'milestone', id: `beltTier.${s.belt.tier}` });
  return true;
}

export const droneCount = (s: GameState) => (s.belt.tier >= 5 ? 2 : s.belt.tier >= 1 ? 1 : 0);
export const droneSpeed = (s: GameState) => (s.belt.tier >= 6 ? 4 : s.belt.tier >= 2 ? 2 : 1) * B.droneRate;

// ---------- Deep Core Drilling ----------

const DR = BALANCE.drill;
export const drillOpen = (s: GameState) => (s.stats.supernovas ?? 0) >= DR.supernovas || s.unlocked.includes('drill');
export const layerAt = (depth: number) => [...DEPTH_LAYERS].reverse().find((l) => depth >= l.from) ?? DEPTH_LAYERS[0]!;
export const coreHp = (depth: number): Decimal => D(DR.hpBase).mul(D(DR.hpGrowth).pow(depth));

/** Mastery level of an ore from how many cores of that layer you have broken. */
export const oreMastery = (s: GameState, ore: string) => Math.floor(Math.sqrt(s.drill.mastery[ore] ?? 0));

const droneCurve: CostCurve = { base: DR.droneBase, brackets: [{ from: 0, ratio: DR.droneGrowth }] };
const bitCurve: CostCurve = { base: DR.bitBase, brackets: [{ from: 0, ratio: DR.bitGrowth }] };
export const droneCost = (s: GameState) => priceAt(droneCurve, s.drill.drones);
/** Drill bits are crafted at the Starforge from Iron alloy. */
export const bitCost = (s: GameState) => priceAt(bitCurve, s.drill.bits);
export const dronePlan = (s: GameState): PurchasePlan => planLimited(droneCurve, s.drill.drones, cur(s, 'ore'), s.settings.buyAmount, s.settings.customBuyAmount, Infinity);
export const bitPlan = (s: GameState): PurchasePlan => planLimited(bitCurve, s.drill.bits, cur(s, 'alloy.iron'), s.settings.buyAmount, s.settings.customBuyAmount, Infinity);

export function drillDps(s: GameState): Decimal {
  const layer = layerAt(s.drill.depth);
  return D(DR.baseDps + DR.droneDps * s.drill.drones)
    .mul(D(DR.bitMult).pow(s.drill.bits))
    .mul(stat(s, 'drillPower'))
    .mul(1 + DR.masteryPerLevel * oreMastery(s, layer.ore));
}

export function coreReward(s: GameState, depth: number): Decimal {
  return D(DR.rewardBase).mul(D(DR.rewardGrowth).pow(depth)).mul(stat(s, 'oreGain')).mul(tierMult(s));
}

/** Deals damage to the current core; breaking it pays ore and goes one layer deeper. */
export function drillDamage(s: GameState, amount: Decimal): number {
  if (!drillOpen(s)) return 0;
  let broken = 0;
  let dmg = s.drill.damage.add(amount);
  while (dmg.gte(coreHp(s.drill.depth)) && broken < 50) {
    dmg = dmg.sub(coreHp(s.drill.depth));
    const layer = layerAt(s.drill.depth);
    const ore = coreReward(s, s.drill.depth);
    gain(s, 'ore', ore);
    s.belt.oreThisTier = s.belt.oreThisTier.add(ore);
    s.drill.mastery[layer.ore] = (s.drill.mastery[layer.ore] ?? 0) + 1;
    s.drill.depth += 1;
    s.stats.cores = (s.stats.cores ?? 0) + 1;
    broken++;
    events.emit({ t: 'milestone', id: `core.${s.drill.depth}` });
  }
  s.drill.damage = dmg;
  return broken;
}

/** A click on the core: two seconds of drilling. */
export const tapCore = (s: GameState) => drillDamage(s, drillDps(s).mul(DR.tapSeconds));

export function buyDrillDrone(s: GameState): boolean {
  const plan = dronePlan(s);
  if (!drillOpen(s) || plan.count <= 0 || !plan.canAfford || !spend(s, 'ore', plan.cost)) return false;
  s.drill.drones += plan.count;
  events.emit({ t: 'purchase', kind: 'drill', id: 'drone', amount: plan.count });
  return true;
}

export function buyDrillBit(s: GameState): boolean {
  const plan = bitPlan(s);
  if (!drillOpen(s) || plan.count <= 0 || !plan.canAfford || !spend(s, 'alloy.iron', plan.cost)) return false;
  s.drill.bits += plan.count;
  events.emit({ t: 'purchase', kind: 'drill', id: 'bit', amount: plan.count });
  return true;
}

export function registerBelt(): void {
  defineStat({ id: 'oreValue', label: 'Ore per asteroid', base: () => D(B.oreBase) });
  defineStat({ id: 'oreGain', label: 'Ore gain', base: () => D(1) });
  defineStat({ id: 'beltXp', label: 'XP per asteroid', base: () => D(B.xpBase) });
  defineStat({ id: 'beltCap', label: 'Asteroids in the field', base: () => D(B.baseCap) });
  defineStat({ id: 'beltSpawn', label: 'Asteroid arrival speed', base: () => D(1) });
  defineStat({ id: 'beamRadius', label: 'Tractor beam radius (px)', base: () => D(B.beamBase) });
  defineStat({ id: 'beltLuck', label: 'Asteroid luck', base: () => D(1) });
  defineStat({ id: 'drillPower', label: 'Drilling power', base: () => D(1) });
  registerSources(
    { id: 'belt.value', stat: 'oreValue', op: 'mul', label: 'Value upgrade', value: (s) => D(doublingShape(beltLevel(s, 'value'))) },
    { id: 'belt.oreGain', stat: 'oreValue', op: 'mul', label: 'Ore gain', value: (s) => stat(s, 'oreGain') },
    { id: 'belt.tier', stat: 'oreValue', op: 'mul', label: 'Belt Tier', value: tierMult, active: (s) => s.belt.tier > 0 },
    { id: 'belt.xp', stat: 'beltXp', op: 'mul', label: 'XP upgrade', value: (s) => D(doublingShape(beltLevel(s, 'xp'))) },
    { id: 'belt.xpTier', stat: 'beltXp', op: 'mul', label: 'Belt Tier', value: tierMult, active: (s) => s.belt.tier > 0 },
    { id: 'belt.xpGain', stat: 'beltXp', op: 'mul', label: 'XP gain', value: (s) => stat(s, 'xpGain') },
    { id: 'belt.amount', stat: 'beltCap', op: 'add', label: 'Amount upgrade', value: (s) => D(beltLevel(s, 'amount')) },
    { id: 'belt.growth', stat: 'beltSpawn', op: 'add', label: 'Growth upgrade', value: (s) => D(B.growthPerLevel * beltLevel(s, 'growth')) },
    { id: 'belt.beam', stat: 'beamRadius', op: 'add', label: 'Beam upgrade', value: (s) => D(B.beamPerLevel * beltLevel(s, 'beam')) },
  );

  registerSystem({
    id: 'belt',
    order: 30,
    tick: (s: GameState, step: number, ctx: TickContext) => {
      if (!beltOpen(s)) return;
      // arrivals, drones and the drill 5 times a second, with the game time between kept
      const dt = pacedDt(s, 'belt', ctx, step, 0.2);
      if (dt === null) return;
      // Works the same for one 50 ms tick or one 43 s catch-up step: arrivals may fill the room
      // the drones free up within the step, then drones sweep the oldest asteroids.
      const cap = Math.min(B.maxCap, Math.floor(stat(s, 'beltCap').toNumber()));
      const rate = stat(s, 'beltSpawn').toNumber() / B.spawnSeconds;
      const drones = droneCount(s);
      s.belt.droneAcc += dt * drones * droneSpeed(s);
      const take = Math.floor(s.belt.droneAcc);
      s.belt.spawnAcc += dt * rate;
      const room = Math.max(0, cap - s.belt.field.length + take);
      const arrive = Math.min(Math.floor(s.belt.spawnAcc), room);
      // new arrivals the drones sweep within this step: past the first few they're only counted
      const through = Math.max(0, Math.min(arrive, take - s.belt.field.length) - ONE_BY_ONE);
      for (let i = 0; i < arrive - through; i++) {
        const a: GameState['belt']['field'][number] = { id: s.belt.nextId++, r: rollRarity(s) };
        const m = rollAsteroidMutation(s);
        if (m) a.m = m;
        s.belt.field.push(a);
      }
      s.belt.spawnAcc -= arrive;
      s.stats.spawned = (s.stats.spawned ?? 0) + arrive;
      // a full field doesn't bank arrivals; drones with nothing left to sweep don't bank sweeps
      s.belt.spawnAcc = Math.min(s.belt.spawnAcc, 1);
      if (through > 0) sweepThrough(s, through, ctx.gainScale);
      if (take > 0) {
        if (take > through) harvest(s, s.belt.field.slice(0, take - through).map((a) => a.id), ctx.gainScale, false);
        s.belt.droneAcc -= take;
      }
      // passive ore from the whole field
      if (s.belt.tier >= 3 && s.belt.field.length > 0) {
        // one price per rarity, not per asteroid (the field can hold dozens)
        const per = new Map<number, Decimal>();
        let sum = ZERO;
        for (const a of s.belt.field) {
          let o = per.get(a.r);
          if (!o) per.set(a.r, (o = oreFor(s, a.r)));
          sum = sum.add(a.m ? o.mul(asteroidMutMult(a.m)) : o);
        }
        const ore = sum.mul(B.passiveShare * dt * ctx.gainScale);
        gain(s, 'ore', ore);
        s.belt.oreThisTier = s.belt.oreThisTier.add(ore);
      }
      // the drill works on its own once you have any power
      if (drillOpen(s)) drillDamage(s, drillDps(s).mul(dt * ctx.gainScale));
    },
  });
}
