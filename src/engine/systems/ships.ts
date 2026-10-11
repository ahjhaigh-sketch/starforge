import { BALANCE } from '../../content/balance';
import { ELEMENTS } from '../../content/elements';
import { SECTOR_BY_ID, type SectorDef } from '../../content/extras';
import { GRADE_BY_ID } from '../../content/forge';
import { planLimited, type PurchasePlan } from '../buy';
import type { CostCurve } from '../cost';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import { nextFloat, nextInt } from '../rng';
import { cur, gain, type GameState, spend } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { addRelicLevels, relicLevel } from './forge';
import { rawShardGain } from './supernova';

/**
 * Starship Expeditions: ships fly to named sectors and bring back ore, alloy, shards and rare finds.
 * There is no fixed timer: a trip takes distance / speed, so Engines shorten every trip, Cargo
 * fills the hold and Crew finds rare things. Ships on repeat keep flying while you are away.
 */
const S = BALANCE.ships;

export type ShipUpgradeId = 'engines' | 'cargo' | 'crew';
/** Which alloy pays for each upgrade (giving the rarer grades a use). */
export const SHIP_UPGRADE_ALLOY: Record<ShipUpgradeId, string> = { engines: 'alloy.iron', cargo: 'alloy.gold', crew: 'alloy.crystal' };

export const shipsOpen = (s: GameState) => (s.stats.supernovas ?? 0) >= S.supernovas || s.unlocked.includes('expeditions');
export const shipLevel = (s: GameState, id: ShipUpgradeId) => s.ships.upgrades[id] ?? 0;
export const sectorOpen = (s: GameState, sec: SectorDef) => Math.max(s.tier, s.stats.bestTier ?? 0) >= sec.tier;
export const shipSpeed = (s: GameState) => stat(s, 'shipSpeed').toNumber();
/** Seconds for one trip: distance / speed. */
export const tripSeconds = (s: GameState, sec: SectorDef) => sec.distance / shipSpeed(s);

const curves = new Map<string, CostCurve>();
function upgradeCurve(id: ShipUpgradeId): CostCurve {
  let c = curves.get(id);
  if (!c) {
    const u = S.upgrades[id];
    c = { base: u.base, brackets: [{ from: 0, ratio: u.growth }] };
    curves.set(id, c);
  }
  return c;
}

export const shipUpgradePlan = (s: GameState, id: ShipUpgradeId): PurchasePlan =>
  planLimited(upgradeCurve(id), shipLevel(s, id), cur(s, SHIP_UPGRADE_ALLOY[id]), s.settings.buyAmount, s.settings.customBuyAmount, Infinity);

export function buyShipUpgrade(s: GameState, id: ShipUpgradeId): boolean {
  if (!shipsOpen(s)) return false;
  const plan = shipUpgradePlan(s, id);
  if (plan.count <= 0 || !plan.canAfford || !spend(s, SHIP_UPGRADE_ALLOY[id], plan.cost)) return false;
  s.ships.upgrades[id] = shipLevel(s, id) + plan.count;
  events.emit({ t: 'purchase', kind: 'ships', id, amount: plan.count });
  return true;
}

/** The next ship's price in Iron alloy (the first one comes free). */
export const shipCost = (s: GameState): Decimal => D(S.shipBase).mul(D(S.shipGrowth).pow(s.ships.fleet.length - 1));

export function buyShip(s: GameState): boolean {
  if (!shipsOpen(s) || s.ships.fleet.length >= S.maxShips || !spend(s, 'alloy.iron', shipCost(s))) return false;
  s.ships.fleet.push({ sector: null, t: 0, auto: true });
  events.emit({ t: 'purchase', kind: 'ships', id: 'ship', amount: 1 });
  return true;
}

export function launch(s: GameState, ship: number, sectorId: string, auto = true): boolean {
  const sec = SECTOR_BY_ID.get(sectorId);
  const sh = s.ships.fleet[ship];
  if (!shipsOpen(s) || !sec || !sh || sh.sector || !sectorOpen(s, sec)) return false;
  s.ships.fleet[ship] = { sector: sec.id, t: tripSeconds(s, sec), auto };
  return true;
}

export function setShipAuto(s: GameState, ship: number, auto: boolean): void {
  const sh = s.ships.fleet[ship];
  if (sh) sh.auto = auto;
}

/** What one trip to a sector brings home (Cargo multiplies all of it). */
export function tripLoot(s: GameState, sec: SectorDef): { ore: Decimal; alloy: Decimal; grade: string; shards: Decimal } {
  const cargo = stat(s, 'shipLoot');
  return {
    ore: stat(s, 'oreValue').mul(300 * sec.loot).mul(cargo).floor(),
    alloy: D(5 * sec.loot).mul(cargo).floor().max(1),
    grade: sec.grade,
    shards: rawShardGain(s).mul(0.01 * sec.loot).mul(cargo).floor(),
  };
}

export const rareChance = (s: GameState) => Math.min(0.9, 0.1 + S.crewPerLevel * shipLevel(s, 'crew'));

/** A ship comes home: loot, and maybe a rare find (a relic level or Codex samples). */
function deliver(s: GameState, sec: SectorDef, scale: number): void {
  const loot = tripLoot(s, sec);
  gain(s, 'ore', loot.ore.mul(scale));
  gain(s, GRADE_BY_ID.get(loot.grade)!.alloy, loot.alloy.mul(scale));
  if (loot.shards.gt(0)) gain(s, 'shards', loot.shards.mul(scale));
  if (nextFloat(s.ships.rng) < rareChance(s)) {
    const relics = Object.keys(s.relics.levels).filter((id) => relicLevel(s, id) > 0);
    const found = ELEMENTS.filter((e) => (s.codex[e.id] ?? 0) > 0);
    if (relics.length > 0 && nextFloat(s.ships.rng) < 0.5) {
      const id = relics[nextInt(s.ships.rng, 0, relics.length - 1)]!;
      addRelicLevels(s, id, 1);
    } else if (found.length > 0) {
      const e = found[nextInt(s.ships.rng, 0, found.length - 1)]!;
      s.codex[e.id] = (s.codex[e.id] ?? 0) + Math.max(1, Math.round(sec.loot));
    }
    s.stats.rareFinds = (s.stats.rareFinds ?? 0) + 1;
  }
  // TODO(Phase 10): star seeds for the Star Nursery come home too.
  s.stats.trips = (s.stats.trips ?? 0) + 1;
  events.emit({ t: 'milestone', id: `ship.${sec.id}` });
}

export function registerShips(): void {
  defineStat({ id: 'shipSpeed', label: 'Starship speed', base: () => D(S.baseSpeed) });
  defineStat({ id: 'shipLoot', label: 'Starship loot', base: () => D(1) });
  registerSources(
    { id: 'ships.engines', stat: 'shipSpeed', op: 'mul', label: 'Engines', value: (s) => D(S.enginePerLevel).pow(shipLevel(s, 'engines')), active: (s) => shipLevel(s, 'engines') > 0 },
    { id: 'ships.cargo', stat: 'shipLoot', op: 'mul', label: 'Cargo holds', value: (s) => D(S.cargoPerLevel).pow(shipLevel(s, 'cargo')), active: (s) => shipLevel(s, 'cargo') > 0 },
  );
  registerSystem({
    id: 'ships',
    order: 36,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      if (!shipsOpen(s)) return;
      for (const sh of s.ships.fleet) {
        if (!sh.sector) continue;
        const sec = SECTOR_BY_ID.get(sh.sector);
        if (!sec) {
          sh.sector = null;
          continue;
        }
        // offline, ships fly at the offline efficiency
        sh.t -= dt * ctx.gainScale;
        for (let guard = 0; sh.t <= 0 && guard < 1000; guard++) {
          deliver(s, sec, 1);
          if (sh.auto) sh.t += tripSeconds(s, sec);
          else {
            sh.sector = null;
            sh.t = 0;
          }
        }
      }
    },
  });
}

