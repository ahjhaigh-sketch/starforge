import { BALANCE } from '../content/balance';
import { ELEMENT_BY_ID } from '../content/elements';
import { ATTUNEMENTS, CHAOS_EFFECTS, FUSION_COLORS, SECTORS } from '../content/extras';
import { GRADE_BY_ID, RELIC_BY_ID } from '../content/forge';
import { cur, type Deal } from '../engine/state';
import type { Decimal } from '../engine/decimal';
import { stat } from '../engine/stats';
import { attuneOpen, heartMult, pulseRating } from '../engine/systems/attune';
import { boardSide, fusionLevel, fusionMult, fusionPlan, type FusionUpgradeId, spawnEvery, spawnLevel } from '../engine/systems/fusion';
import { canAfford, luckPlan, mythicalChance, nextShipIn, rerollCost } from '../engine/systems/merchant';
import { bestDesign, designOf, lootPerHour, partOwned, partPrice, rareChance, sectorOpen, SHIP_UPGRADE_ALLOY, shipCost, shipLevel, shipUpgradePlan, type ShipUpgradeId, tripLoot, tripSeconds } from '../engine/systems/ships';
import { PART_BY_ID, PART_SLOTS, PARTS, SLOT_NAMES } from '../content/shipParts';
import { TIERS } from '../content/tiers';
import { format, formatMult, formatTime } from '../ui/format';
import { dur } from './forgeReports';
import { game } from './game';

/** Read-outs for the Supernova stage's extras: Fusion, Attunements, the Merchant and starships. */
const n = () => game.state.settings.notation;

export const fusionColor = (level: number) => FUSION_COLORS[(level - 1) % FUSION_COLORS.length]!;

export interface FusionReport {
  side: number;
  cells: Array<{ level: number; color: string }>;
  best: number;
  mult: string;
  spawnPct: number;
  every: string;
  spawnLevel: number;
  shards: string;
  autoOwned: boolean;
  autoOn: boolean;
  autoCost: string;
  canAuto: boolean;
  upgrades: Array<{ id: string; name: string; desc: string; level: string; count: number; cost: string; can: boolean; maxed: boolean }>;
}

const FUSION_UPS: Array<{ id: FusionUpgradeId; name: string; desc: string }> = [
  { id: 'speed', name: 'Comet lure', desc: 'Comets arrive 12% faster.' },
  { id: 'start', name: 'Hot start', desc: 'Comets arrive one level higher (each level is three of the one below).' },
  { id: 'size', name: 'Wider board', desc: 'One more row and column, up to 5 x 5.' },
];

export function fusionReport(): FusionReport {
  const s = game.state;
  return {
    side: boardSide(s),
    cells: s.fusion.board.map((level) => ({ level, color: level > 0 ? fusionColor(level) : '' })),
    best: s.fusion.best,
    mult: formatMult(fusionMult(s), n()),
    spawnPct: Math.floor(Math.min(1, s.fusion.acc) * 100),
    every: `${spawnEvery(s).toFixed(spawnEvery(s) >= 10 ? 0 : 1)}s`,
    spawnLevel: spawnLevel(s),
    shards: format(cur(s, 'shards'), n()),
    autoOwned: s.fusion.autoOwned,
    autoOn: s.fusion.autoOn,
    autoCost: format(BALANCE.fusion.autoCost, n()),
    canAuto: cur(s, 'shards').gte(BALANCE.fusion.autoCost),
    upgrades: FUSION_UPS.map((u) => {
      const plan = fusionPlan(s, u.id);
      return { ...u, level: `Lv ${fusionLevel(s, u.id)}`, count: plan.count, cost: format(plan.cost, n()), can: plan.canAfford, maxed: plan.count === 0 };
    }),
  };
}

export interface AttuneReport {
  open: boolean;
  slots: number;
  used: number;
  shards: string;
  cards: Array<{ id: string; name: string; icon: string; desc: string; skill: string; unlocked: boolean; equipped: boolean; cost: string; canUnlock: boolean; canEquip: boolean; now: string }>;
}

export function attuneReport(): AttuneReport {
  const s = game.state;
  const full = s.attune.equipped.length >= BALANCE.attune.slots;
  return {
    open: attuneOpen(s),
    slots: BALANCE.attune.slots,
    used: s.attune.equipped.length,
    shards: format(cur(s, 'shards'), n()),
    cards: ATTUNEMENTS.map((a) => {
      const unlocked = s.attune.unlocked.includes(a.id);
      const equipped = s.attune.equipped.includes(a.id);
      const cost = BALANCE.attune.unlock[a.id];
      const now =
        a.id === 'pulse'
          ? `Rating ${formatMult(pulseRating(s), n())} tap power`
          : a.id === 'heartbeat'
            ? `Meter ${Math.round(s.attune.heart)} · ${formatMult(heartMult(s), n())} production`
            : a.id === 'chaos'
              ? `${s.attune.chaosTaps} / ${BALANCE.attune.chaos.every} taps to the next roll`
              : `Taps x${BALANCE.attune.lens.mult}, ${BALANCE.attune.lens.perSecond} a second`;
      return { ...a, unlocked, equipped, cost: format(cost, n()), canUnlock: !unlocked && cur(s, 'shards').gte(cost), canEquip: unlocked && !equipped && !full, now };
    }),
  };
}

/** The Star Core's attunement read-outs (in the snapshot, 10 a second). */
export function attuneHud(): { list: string; rating: string; heart: number; chaosTaps: number; chaos: string; chaosLeft: string } {
  const s = game.state;
  const fx = s.attune.chaos && s.playtime < s.attune.chaos.until ? CHAOS_EFFECTS.find((c) => c.id === s.attune.chaos!.id) : undefined;
  return {
    list: attuneOpen(s) ? s.attune.equipped.join(',') : '',
    rating: formatMult(pulseRating(s), n()),
    heart: Math.round((s.attune.heart / BALANCE.attune.heartbeat.max) * 100),
    chaosTaps: s.attune.chaosTaps,
    chaos: fx ? `${fx.name}: ${fx.desc}` : '',
    chaosLeft: fx ? `${Math.ceil(s.attune.chaos!.until - s.playtime)}s` : '',
  };
}

/** "Pay 1.2M Stardust" / "Get +3 levels of Anvil of Dawn". */
const NAMES: Record<string, string> = { stardust: 'Stardust', shards: 'Nova Shards', ore: 'ore', xp: 'Starsmith XP' };
const currencyName = (c: string) => NAMES[c] ?? (GRADE_BY_ID.get(c.replace('alloy.', ''))?.name ? `${GRADE_BY_ID.get(c.replace('alloy.', ''))!.name} alloy` : c);

export function dealText(d: Deal): { pay: string; get: string } {
  const pay = `${format(d.pay.amount, n())} ${currencyName(d.pay.currency)}`;
  switch (d.kind) {
    case 'relic':
      return { pay, get: `+${d.get.count} level${d.get.count === 1 ? '' : 's'} of ${RELIC_BY_ID.get(d.get.id!)?.name ?? 'a relic'}` };
    case 'codex':
      return { pay, get: `+${d.get.count} ${ELEMENT_BY_ID.get(d.get.id!)?.name ?? 'element'} samples` };
    case 'frenzy':
      return { pay, get: `A Frenzy comet buff for ${dur(d.get.count ?? 60)}` };
    default:
      return { pay, get: `+${format(d.get.amount!, n())} ${currencyName(d.get.currency!)}` };
  }
}

export interface MerchantReport {
  deals: Array<{ i: number; kind: string; quality: string; pay: string; get: string; can: boolean; sold: boolean }>;
  /** Time until the next ship docks. */
  nextShip: string;
  reroll: string;
  canReroll: boolean;
  luck: number;
  luckCount: number;
  luckCost: string;
  canLuck: boolean;
  mythical: string;
  shards: string;
}

export function merchantReport(): MerchantReport {
  const s = game.state;
  const lp = luckPlan(s);
  return {
    deals: s.merchant.deals.map((d, i) => ({ i, kind: d.kind, quality: d.quality, ...dealText(d), can: !d.sold && canAfford(s, d), sold: !!d.sold })),
    nextShip: formatTime(nextShipIn(s)),
    reroll: format(rerollCost(s), n()),
    canReroll: cur(s, 'shards').gte(rerollCost(s)) && s.merchant.deals.some((d) => !d.sold),
    luck: s.merchant.luck,
    luckCount: lp.count,
    luckCost: format(lp.cost, n()),
    canLuck: lp.canAfford,
    mythical: `${(mythicalChance(s) * 100).toFixed(1)}%`,
    shards: format(cur(s, 'shards'), n()),
  };
}

export interface ShipsReport {
  fleet: Array<{ i: number; sector: string; name: string; color: string; pct: number; left: string; auto: boolean; design: string }>;
  maxShips: number;
  shipCost: string;
  canShip: boolean;
  sectors: Array<{ id: string; name: string; color: string; open: boolean; req: string; trip: string; loot: string }>;
  upgrades: Array<{ id: string; name: string; desc: string; level: string; count: number; cost: string; alloy: string; can: boolean }>;
  speed: string;
  rare: string;
}

const SHIP_UPS: Array<{ id: ShipUpgradeId; name: string; desc: string }> = [
  { id: 'engines', name: 'Engines', desc: 'Every trip 25% faster.' },
  { id: 'cargo', name: 'Cargo holds', desc: 'Every hold carries 30% more.' },
  { id: 'crew', name: 'Crew', desc: 'Rare finds +5% a trip.' },
];

export function shipsReport(): ShipsReport {
  const s = game.state;
  return {
    fleet: s.ships.fleet.map((sh, i) => {
      const sec = SECTORS.find((x) => x.id === sh.sector);
      const design = designOf(sh);
      const total = sec ? tripSeconds(s, sec, design) : 1;
      const names = PART_SLOTS.map((slot) => PART_BY_ID.get(design[slot])?.name ?? '?').join(' · ');
      return { i, sector: sh.sector ?? '', name: sec?.name ?? 'Docked', color: sec?.color ?? '#3A3466', pct: sec ? Math.floor((1 - sh.t / total) * 100) : 0, left: sec ? dur(sh.t) : '', auto: sh.auto, design: names };
    }),
    maxShips: BALANCE.ships.maxShips,
    shipCost: format(shipCost(s), n()),
    canShip: s.ships.fleet.length < BALANCE.ships.maxShips && cur(s, 'alloy.iron').gte(shipCost(s)),
    sectors: SECTORS.map((sec) => {
      const loot = tripLoot(s, sec);
      return {
        id: sec.id,
        name: sec.name,
        color: sec.color,
        open: sectorOpen(s, sec),
        req: `Reach ${TIERS[sec.tier]?.name ?? 'a bigger star'}`,
        trip: dur(tripSeconds(s, sec)),
        loot: `${format(loot.ore, n())} ore, ${format(loot.alloy, n())} ${GRADE_BY_ID.get(loot.grade)!.name} alloy${loot.shards.gt(0) ? `, ${format(loot.shards, n())} shards` : ''}`,
      };
    }),
    upgrades: SHIP_UPS.map((u) => {
      const plan = shipUpgradePlan(s, u.id);
      const alloy = SHIP_UPGRADE_ALLOY[u.id];
      return { ...u, level: `Lv ${shipLevel(s, u.id)}`, count: plan.count, cost: format(plan.cost, n()), alloy: GRADE_BY_ID.get(alloy.replace('alloy.', ''))!.name, can: plan.canAfford };
    }),
    speed: formatMult(stat(s, 'shipSpeed'), n()),
    rare: `${Math.round(rareChance(s) * 100)}%`,
  };
}


// ---------- Phase 20.4: the Shipyard ----------

export interface ShipyardReport {
  ships: Array<{ i: number; docked: boolean; where: string }>;
  ship: number;
  docked: boolean;
  slots: Array<{ slot: string; name: string; parts: Array<{ id: string; name: string; desc: string; owned: boolean; fitted: boolean; price: string; can: boolean }> }>;
  /** The open sectors, with this ship's trip time and loot an hour in each. */
  sectors: Array<{ id: string; name: string; color: string; trip: string; perHour: string }>;
  /** Whether Best fit would change anything for the chosen sector. */
  better: boolean;
}

const lootText = (ore: Decimal, alloy: Decimal, grade: string, shards: Decimal) =>
  `${format(ore, n())} ore, ${format(alloy, n())} ${GRADE_BY_ID.get(grade)!.name} alloy${shards.gt(0) ? `, ${format(shards, n())} shards` : ''}`;

export function shipyardReport(ship: number, sectorId: string): ShipyardReport {
  const s = game.state;
  const i = Math.max(0, Math.min(s.ships.fleet.length - 1, ship));
  const sh = s.ships.fleet[i];
  const design = designOf(sh);
  const open = SECTORS.filter((sec) => sectorOpen(s, sec));
  const target = open.find((x) => x.id === sectorId) ?? open[open.length - 1];
  const best = target ? bestDesign(s, target, design) : design;
  return {
    ships: s.ships.fleet.map((x, k) => ({ i: k, docked: !x.sector, where: x.sector ? (SECTORS.find((sec) => sec.id === x.sector)?.name ?? '') : 'Docked' })),
    ship: i,
    docked: !sh?.sector,
    slots: PART_SLOTS.map((slot) => ({
      slot,
      name: SLOT_NAMES[slot],
      parts: PARTS.filter((p) => p.slot === slot).map((p) => {
        const price = partPrice(p.id);
        return {
          id: p.id,
          name: p.name,
          desc: p.desc,
          owned: partOwned(s, p.id),
          fitted: design[slot] === p.id,
          price: price ? `${format(price.amount, n())} ${GRADE_BY_ID.get(price.alloy.replace('alloy.', ''))!.name} alloy` : '',
          can: !!price && cur(s, price.alloy).gte(price.amount),
        };
      }),
    })),
    sectors: open.map((sec) => {
      const h = lootPerHour(s, sec, design);
      return { id: sec.id, name: sec.name, color: sec.color, trip: dur(tripSeconds(s, sec, design)), perHour: lootText(h.ore, h.alloy, sec.grade, h.shards) };
    }),
    better: PART_SLOTS.some((slot) => best[slot] !== design[slot]),
  };
}
