import { BALANCE } from '../../content/balance';
import { type BeltUpgradeId, DEPTH_LAYERS, RARITIES } from '../../content/belt';
import { GRADES } from '../../content/forge';
import { planLimited, type PurchasePlan } from '../buy';
import { bulkCost, type CostCurve, priceAt } from '../cost';
import { D, type Decimal, ZERO } from '../decimal';
import { events } from '../events';
import { nextFloat } from '../rng';
import { cur, gain, type GameState, spend } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { asteroidMutMult, recordAsteroidMutation, rollAsteroidMutation } from './mutations';
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
    // TODO(later phases): Crystal asteroids also give Crystals, Void ones Dark Matter (Game design: Rarities).
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
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      if (!beltOpen(s)) return;
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
      for (let i = 0; i < arrive; i++) {
        const a: GameState['belt']['field'][number] = { id: s.belt.nextId++, r: rollRarity(s) };
        const m = rollAsteroidMutation(s);
        if (m) a.m = m;
        s.belt.field.push(a);
      }
      s.belt.spawnAcc -= arrive;
      s.stats.spawned = (s.stats.spawned ?? 0) + arrive;
      // a full field doesn't bank arrivals; drones with nothing left to sweep don't bank sweeps
      s.belt.spawnAcc = Math.min(s.belt.spawnAcc, 1);
      if (take > 0) {
        harvest(s, s.belt.field.slice(0, take).map((a) => a.id), ctx.gainScale, false);
        s.belt.droneAcc -= take;
      }
      // passive ore from the whole field
      if (s.belt.tier >= 3 && s.belt.field.length > 0) {
        let sum = ZERO;
        for (const a of s.belt.field) sum = sum.add(oreFor(s, a.r).mul(asteroidMutMult(a.m)));
        const ore = sum.mul(B.passiveShare * dt * ctx.gainScale);
        gain(s, 'ore', ore);
        s.belt.oreThisTier = s.belt.oreThisTier.add(ore);
      }
      // the drill works on its own once you have any power
      if (drillOpen(s)) drillDamage(s, drillDps(s).mul(dt * ctx.gainScale));
    },
  });
}
