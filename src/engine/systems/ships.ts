import { BALANCE } from '../../content/balance';
import { ELEMENTS } from '../../content/elements';
import { SECTOR_BY_ID, type SectorDef } from '../../content/extras';
import { GRADE_BY_ID } from '../../content/forge';
import { planLimited, type PurchasePlan } from '../buy';
import { type CostCurve, lateRamp } from '../cost';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import { drawHits } from '../odds';
import { nextFloat, nextInt } from '../rng';
import { cur, gain, type GameState, spend } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { addSamples } from './codex';
import { addRelicLevels, relicLevel } from './forge';
import { rawShardGain } from './supernova';
import { BASE_SEEDS } from '../../content/nursery';
import { addSeeds, nurseryOpen } from './nursery';
import { DEFAULT_DESIGN, isDefaultPart, PART_BY_ID, PART_SLOTS, PARTS, type PartSlot, type ShipDesign } from '../../content/shipParts';

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

/** A ship's parts (a ship from before Phase 20 flies the default design). */
export const designOf = (sh: { design?: ShipDesign } | undefined): ShipDesign => sh?.design ?? DEFAULT_DESIGN;
const partsOf = (design: ShipDesign) => PART_SLOTS.map((slot) => PART_BY_ID.get(design[slot])).filter((p) => p !== undefined);

/** A design's speed and loot multipliers in a sector: exactly 1 and 1 for the default design. */
export function designMults(design: ShipDesign, sec: SectorDef): { speed: number; loot: number } {
  let speed = 1;
  let loot = 1;
  for (const p of partsOf(design)) {
    speed *= p.speed ?? 1;
    loot *= p.loot ?? 1;
    if (p.fit?.sectors.includes(sec.id)) {
      speed *= p.fit.speed;
      loot *= p.fit.loot;
    }
  }
  return { speed, loot };
}

/** Seconds for one trip: distance / (speed x the ship's parts). */
export const tripSeconds = (s: GameState, sec: SectorDef, design: ShipDesign = DEFAULT_DESIGN) => sec.distance / (shipSpeed(s) * designMults(design, sec).speed);

const curves = new Map<string, CostCurve>();
function upgradeCurve(id: ShipUpgradeId): CostCurve {
  let c = curves.get(id);
  if (!c) {
    const u = S.upgrades[id];
    c = lateRamp({ base: u.base, brackets: [{ from: 0, ratio: u.growth }] });
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
  // the ship keeps its design (and anything else it carries)
  s.ships.fleet[ship] = { ...sh, sector: sec.id, t: tripSeconds(s, sec, designOf(sh)), auto };
  return true;
}

export function setShipAuto(s: GameState, ship: number, auto: boolean): void {
  const sh = s.ships.fleet[ship];
  if (sh) sh.auto = auto;
}

/** What one trip to a sector brings home (Cargo and the ship's parts multiply all of it). */
export function tripLoot(s: GameState, sec: SectorDef, design: ShipDesign = DEFAULT_DESIGN): { ore: Decimal; alloy: Decimal; grade: string; shards: Decimal } {
  const cargo = stat(s, 'shipLoot').mul(designMults(design, sec).loot);
  return {
    ore: stat(s, 'oreValue').mul(300 * sec.loot).mul(cargo).floor(),
    alloy: D(5 * sec.loot).mul(cargo).floor().max(1),
    grade: sec.grade,
    shards: rawShardGain(s).mul(0.01 * sec.loot).mul(cargo).floor(),
  };
}

export const rareChance = (s: GameState, design: ShipDesign = DEFAULT_DESIGN) =>
  Math.min(0.9, 0.1 + S.crewPerLevel * shipLevel(s, 'crew') + partsOf(design).reduce((a, p) => a + (p.rareChance ?? 0), 0));

/** What one ship on repeat brings home an hour from a sector (the panel's figures, from the engine's own sums). */
export function lootPerHour(s: GameState, sec: SectorDef, design: ShipDesign = DEFAULT_DESIGN): { ore: Decimal; alloy: Decimal; shards: Decimal; trips: number } {
  const trips = 3600 / tripSeconds(s, sec, design);
  const loot = tripLoot(s, sec, design);
  return { ore: loot.ore.mul(trips), alloy: loot.alloy.mul(trips), shards: loot.shards.mul(trips), trips };
}

// ---------- Phase 20.4: the Ship Customizer ----------

export const partOwned = (s: GameState, id: string) => isDefaultPart(id) || s.ships.parts.includes(id);
export function partPrice(id: string): { alloy: string; amount: Decimal } | null {
  const p = BALANCE.shipParts.prices[id];
  return p ? { alloy: p[0], amount: D(p[1]) } : null;
}

/** Buys a part once; it then fits any ship. */
export function buyPart(s: GameState, id: string): boolean {
  const price = partPrice(id);
  if (!shipsOpen(s) || !price || !PART_BY_ID.has(id) || partOwned(s, id) || !spend(s, price.alloy, price.amount)) return false;
  s.ships.parts.push(id);
  events.emit({ t: 'purchase', kind: 'shipPart', id, amount: 1 });
  return true;
}

/** Fits an owned part to a docked ship (free; refused mid-trip). */
export function fitPart(s: GameState, ship: number, id: string): boolean {
  const sh = s.ships.fleet[ship];
  const p = PART_BY_ID.get(id);
  if (!sh || !p || sh.sector || !partOwned(s, id)) return false;
  sh.design = { ...designOf(sh), [p.slot]: id };
  return true;
}

/**
 * The owned hull, engine and cargo pod that bring home the most loot an hour from a sector (loot x
 * speed; the scanner is a choice about rare finds, so it stays). Ties keep the parts already fitted.
 */
export function bestDesign(s: GameState, sec: SectorDef, current: ShipDesign = DEFAULT_DESIGN): ShipDesign {
  const owned = (slot: PartSlot) => PARTS.filter((p) => p.slot === slot && partOwned(s, p.id)).map((p) => p.id);
  const score = (d: ShipDesign) => {
    const m = designMults(d, sec);
    return m.speed * m.loot;
  };
  let best = current;
  let top = score(current);
  for (const hull of owned('hull'))
    for (const engine of owned('engine'))
      for (const cargo of owned('cargo')) {
        const d = { hull, engine, cargo, scanner: current.scanner };
        const v = score(d);
        if (v > top * (1 + 1e-12)) {
          top = v;
          best = d;
        }
      }
  return best;
}

/** Refits a docked ship with its best design for a sector. */
export function fitBest(s: GameState, ship: number, sectorId: string): boolean {
  const sh = s.ships.fleet[ship];
  const sec = SECTOR_BY_ID.get(sectorId);
  if (!sh || !sec || sh.sector) return false;
  sh.design = bestDesign(s, sec, designOf(sh));
  return true;
}

/** Calls a ship home at once so it can be refitted: the trip in progress brings nothing. */
export function recallShip(s: GameState, ship: number): boolean {
  const sh = s.ships.fleet[ship];
  if (!sh || !sh.sector) return false;
  sh.sector = null;
  sh.t = 0;
  return true;
}

/** Rare finds are shared out over at most this many picks, however many trips ended at once. */
const RARE_PICKS = 12;

/**
 * `trips` trips to a sector come home at once: loot x trips, and rare finds (a relic level or
 * Codex samples), each trip finding one at the crew's chance. One trip rolls exactly as it always
 * did; many trips (late game, when a trip takes a fraction of a tick) are a single draw, so the work
 * is the same at 1 trip a tick or a million (CLAUDE.md rule 10, the runes' rule).
 */
function deliver(s: GameState, sec: SectorDef, trips: number, design: ShipDesign = DEFAULT_DESIGN): void {
  const loot = tripLoot(s, sec, design);
  const parts = partsOf(design);
  const rareMult = parts.reduce((a, p) => a * (p.rares ?? 1), 1);
  const rareTo = parts.find((p) => p.rareTo)?.rareTo;
  const seedMult = parts.reduce((a, p) => a * (p.seeds ?? 1), 1);
  gain(s, 'ore', loot.ore.mul(trips));
  gain(s, GRADE_BY_ID.get(loot.grade)!.alloy, loot.alloy.mul(trips));
  if (loot.shards.gt(0)) gain(s, 'shards', loot.shards.mul(trips));
  const p = rareChance(s, design);
  let rares = 0;
  if (trips <= 20) for (let i = 0; i < trips; i++) rares += nextFloat(s.ships.rng) < p ? 1 : 0;
  else rares = Math.min(trips, drawHits(s.ships.rng, D(trips), Math.log10(p), 1000).toNumber());
  // a Vault doubles what was found (the draws above are the same for every design)
  rares *= rareMult;
  if (rares > 0) {
    const relics = Object.keys(s.relics.levels).filter((id) => relicLevel(s, id) > 0);
    const found = ELEMENTS.filter((e) => (s.codex[e.id] ?? 0) > 0);
    const picks = Math.min(rares, RARE_PICKS);
    for (let i = 0; i < picks; i++) {
      const share = Math.floor(rares / picks) + (i < rares % picks ? 1 : 0);
      // a Relic Finder or Codex Scanner sends every find one way (while there is somewhere to send it)
      const toRelic = rareTo === 'relics' ? relics.length > 0 : rareTo === 'codex' ? found.length === 0 && relics.length > 0 : relics.length > 0 && nextFloat(s.ships.rng) < 0.5;
      if (toRelic) {
        const id = relics[nextInt(s.ships.rng, 0, relics.length - 1)]!;
        addRelicLevels(s, id, share);
      } else if (found.length > 0) {
        const e = found[nextInt(s.ships.rng, 0, found.length - 1)]!;
        addSamples(s, e.id, share * Math.max(1, Math.round(sec.loot)));
      }
    }
    s.stats.rareFinds = (s.stats.rareFinds ?? 0) + rares;
  }
  // a base star seed for the Star Nursery comes home with each trip (once it's open, so earlier trips roll the same)
  if (nurseryOpen(s)) {
    const picks = Math.min(trips, BASE_SEEDS.length);
    for (let i = 0; i < picks; i++) {
      const seed = BASE_SEEDS[nextInt(s.ships.rng, 0, BASE_SEEDS.length - 1)]!;
      addSeeds(s, seed, (Math.floor(trips / picks) + (i < trips % picks ? 1 : 0)) * seedMult);
    }
  }
  s.stats.trips = (s.stats.trips ?? 0) + trips;
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
        if (sh.t > 0) continue;
        if (!sh.auto) {
          // a one-off trip ends here
          deliver(s, sec, 1, designOf(sh));
          sh.sector = null;
          sh.t = 0;
          continue;
        }
        // every trip that ended this tick at once: the one that hit zero, then one per trip length
        const design = designOf(sh);
        const trip = tripSeconds(s, sec, design);
        const trips = Number.isFinite(trip) && trip > 0 ? 1 + Math.floor(-sh.t / trip) : 1;
        sh.t = Number.isFinite(trip) && trip > 0 ? sh.t + trips * trip : 1;
        deliver(s, sec, Math.min(trips, 1e12), design);
      }
    },
  });
}

