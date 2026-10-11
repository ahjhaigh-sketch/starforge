import { BALANCE } from '../content/balance';
import { BELT_TIER_REWARDS, BELT_UPGRADES, DEPTH_LAYERS, PERKS, RARITIES } from '../content/belt';
import { cur } from '../engine/state';
import { stat } from '../engine/stats';
import {
  beltLevel,
  beltOpen,
  beltPlan,
  beltTierNeed,
  beltUpgradeMaxed,
  bitPlan,
  coreHp,
  coreReward,
  drillDps,
  drillOpen,
  droneCount,
  dronePlan,
  droneSpeed,
  freeUpgrades,
  layerAt,
  oreMastery,
} from '../engine/systems/belt';
import { levelInfo, perkAvailable, perksFree, starsmithOpen } from '../engine/systems/starsmith';
import { format, formatCount, formatMult } from '../ui/format';
import { game } from './game';

/** Read-outs for the Belt panel (field, upgrades, tiers, Deep Core) and the Starsmith panel. */
const n = () => game.state.settings.notation;

export interface BeltReport {
  open: boolean;
  ore: string;
  tier: number;
  tierMult: string;
  nextTier: string;
  tierPct: number;
  canTier: boolean;
  nextReward: string;
  rewards: Array<{ text: string; got: boolean }>;
  drones: string;
  upgrades: Array<{ id: string; name: string; desc: string; icon: string; level: string; count: number; cost: string; can: boolean; maxed: boolean }>;
  free: boolean;
  stats: Array<{ label: string; value: string }>;
  odds: Array<{ name: string; color: string; odds: string; mult: string }>;
}

export function beltReport(): BeltReport {
  const s = game.state;
  const ore = cur(s, 'ore');
  const need = beltTierNeed(s.belt.tier + 1);
  const luck = stat(s, 'beltLuck').toNumber();
  return {
    open: beltOpen(s),
    ore: format(ore, n()),
    tier: s.belt.tier,
    tierMult: formatMult(2 ** s.belt.tier, n()),
    nextTier: format(need, n()),
    tierPct: Math.floor(Math.min(1, s.belt.oreThisTier.div(need).toNumber()) * 100),
    canTier: s.belt.oreThisTier.gte(need),
    nextReward: BELT_TIER_REWARDS[s.belt.tier] ?? 'x2 ore and XP',
    rewards: BELT_TIER_REWARDS.map((text, i) => ({ text, got: s.belt.tier > i })),
    drones: droneCount(s) > 0 ? `${droneCount(s)} drone${droneCount(s) === 1 ? '' : 's'}, ${formatCount(droneCount(s) * droneSpeed(s), n())} asteroids a second` : 'No drones yet: Belt Tier 1 brings the first',
    upgrades: BELT_UPGRADES.map((u) => {
      const plan = beltPlan(s, u.id);
      const maxed = beltUpgradeMaxed(s, u.id);
      return { id: u.id, name: u.name, desc: u.desc, icon: u.icon, level: `Lv ${beltLevel(s, u.id)}`, count: plan.count, cost: format(plan.cost, n()), can: !maxed && plan.canAfford, maxed };
    }),
    free: freeUpgrades(s),
    stats: [
      { label: 'Ore per asteroid', value: format(stat(s, 'oreValue'), n()) },
      { label: 'Field size', value: `${s.belt.field.length} / ${Math.min(BALANCE.belt.maxCap, Math.floor(stat(s, 'beltCap').toNumber()))}` },
      { label: 'Arrivals', value: `one every ${(BALANCE.belt.spawnSeconds / stat(s, 'beltSpawn').toNumber()).toFixed(2)} s` },
      { label: 'Beam', value: `${Math.round(stat(s, 'beamRadius').toNumber())} px` },
    ],
    odds: RARITIES.map((r) => ({ name: r.name, color: r.color, odds: r.oneIn === 1 ? 'the rest' : `1 in ${formatCount(Math.max(1, Math.round(r.oneIn / luck)), n())}`, mult: `x${formatCount(r.mult, n())}` })),
  };
}

export interface DrillReport {
  open: boolean;
  depth: number;
  layer: string;
  layerColor: string;
  hpPct: number;
  hp: string;
  dps: string;
  reward: string;
  drones: number;
  droneCount: number;
  droneCost: string;
  canDrone: boolean;
  bits: number;
  bitCount: number;
  bitCost: string;
  canBit: boolean;
  alloy: string;
  mastery: Array<{ name: string; level: number; color: string }>;
}

export function drillReport(): DrillReport {
  const s = game.state;
  const ore = cur(s, 'ore');
  const hp = coreHp(s.drill.depth);
  const drone = dronePlan(s);
  const bit = bitPlan(s);
  const layer = layerAt(s.drill.depth);
  return {
    open: drillOpen(s),
    depth: s.drill.depth,
    layer: layer.name,
    layerColor: layer.color,
    hpPct: Math.floor(Math.max(0, 1 - s.drill.damage.div(hp).toNumber()) * 100),
    hp: format(hp.sub(s.drill.damage).max(0), n()),
    dps: format(drillDps(s), n()),
    reward: format(coreReward(s, s.drill.depth), n()),
    drones: s.drill.drones,
    droneCount: drone.count,
    droneCost: format(drone.cost, n()),
    canDrone: drone.canAfford,
    bits: s.drill.bits,
    bitCount: bit.count,
    bitCost: format(bit.cost, n()),
    canBit: bit.canAfford,
    alloy: format(cur(s, 'alloy.iron'), n()),
    mastery: DEPTH_LAYERS.map((l) => ({ name: l.oreName, level: oreMastery(s, l.ore), color: l.color })),
  };
}

export interface StarsmithReport {
  open: boolean;
  level: number;
  pct: number;
  into: string;
  need: string;
  free: number;
  perks: Array<{ id: string; name: string; desc: string; icon: string; points: number }>;
}

export function starsmithReport(): StarsmithReport {
  const s = game.state;
  const info = levelInfo(s);
  return {
    open: starsmithOpen(s),
    level: info.level,
    pct: Math.floor(Math.min(1, info.into.div(info.need).toNumber()) * 100),
    into: format(info.into, n()),
    need: format(info.need, n()),
    free: perksFree(s),
    perks: PERKS.filter((p) => perkAvailable(s, p)).map((p) => ({ id: p.id, name: p.name, desc: p.desc, icon: p.icon, points: s.starsmith.perks[p.id] ?? 0 })),
  };
}
