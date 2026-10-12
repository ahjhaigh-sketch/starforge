import { BALANCE } from './balance';

/**
 * The Ship Customizer (Ideas menu 8): a starship's design is four parts, one per slot. The first part
 * of each slot is the default every ship starts with (owned from the start, and exactly today's
 * numbers); the rest are bought once with alloy and fit any ship. Prices live in balance.ts. IDs
 * never change.
 */
export type PartSlot = 'hull' | 'engine' | 'cargo' | 'scanner';
export const PART_SLOTS: readonly PartSlot[] = ['hull', 'engine', 'cargo', 'scanner'];
export const SLOT_NAMES: Record<PartSlot, string> = { hull: 'Hull', engine: 'Engine', cargo: 'Cargo pod', scanner: 'Scanner' };

export interface PartDef {
  id: string;
  slot: PartSlot;
  name: string;
  desc: string;
  /** Trip speed and loot, everywhere. */
  speed?: number;
  loot?: number;
  /** A matched hull: these multipliers only in its sectors. */
  fit?: { sectors: readonly string[]; speed: number; loot: number };
  /** Rare finds per trip x this; chance added to the rare-find chance. */
  rares?: number;
  rareChance?: number;
  /** Where rare finds go (the default splits them between relics and the Codex). */
  rareTo?: 'relics' | 'codex';
  /** Star seeds per trip x this. */
  seeds?: number;
}

const P = BALANCE.shipParts;
const fit = (sectors: readonly string[]) => ({ sectors, speed: P.fitSpeed, loot: P.fitLoot });

export const PARTS: readonly PartDef[] = [
  { id: 'hull.scout', slot: 'hull', name: 'Scout', desc: 'A light all-rounder.' },
  { id: 'hull.freighter', slot: 'hull', name: 'Freighter', desc: `Loot x${P.freighterLoot}, speed x${P.freighterSpeed}.`, loot: P.freighterLoot, speed: P.freighterSpeed },
  { id: 'hull.icebreaker', slot: 'hull', name: 'Ice-breaker', desc: `Kuiper Drift and Crystal Verge: loot x${P.fitLoot}, speed x${P.fitSpeed}.`, fit: fit(['kuiper', 'crystal']) },
  { id: 'hull.heatshield', slot: 'hull', name: 'Heat Shield', desc: `Ember Reach and Prism Gate: loot x${P.fitLoot}, speed x${P.fitSpeed}.`, fit: fit(['ember', 'prism']) },
  { id: 'hull.voidplating', slot: 'hull', name: 'Void Plating', desc: `Void Hollows and Galactic Rim: loot x${P.fitLoot}, speed x${P.fitSpeed}.`, fit: fit(['hollows', 'rim']) },
  { id: 'engine.ion', slot: 'engine', name: 'Ion Drive', desc: 'Steady and simple.' },
  { id: 'engine.fusion', slot: 'engine', name: 'Fusion Drive', desc: `Speed x${P.fusionSpeed}.`, speed: P.fusionSpeed },
  { id: 'engine.warp', slot: 'engine', name: 'Warp Coil', desc: `Speed x${P.warpSpeed}, loot x${P.warpLoot}.`, speed: P.warpSpeed, loot: P.warpLoot },
  { id: 'engine.sail', slot: 'engine', name: 'Solar Sail', desc: `Speed x${P.sailSpeed}, loot x${P.sailLoot}.`, speed: P.sailSpeed, loot: P.sailLoot },
  { id: 'cargo.standard', slot: 'cargo', name: 'Standard Pod', desc: 'Holds what it finds.' },
  { id: 'cargo.expanded', slot: 'cargo', name: 'Expanded Pod', desc: `Loot x${P.expandedLoot}, speed x${P.expandedSpeed}.`, loot: P.expandedLoot, speed: P.expandedSpeed },
  { id: 'cargo.vault', slot: 'cargo', name: 'Vault', desc: `Rare finds x${P.vaultRares}.`, rares: P.vaultRares },
  { id: 'cargo.seedpod', slot: 'cargo', name: 'Seed Pod', desc: `Star seeds x${P.seedPodSeeds}.`, seeds: P.seedPodSeeds },
  { id: 'scanner.basic', slot: 'scanner', name: 'Basic Scanner', desc: 'Rare finds go to relics and the Codex.' },
  { id: 'scanner.deep', slot: 'scanner', name: 'Deep Scanner', desc: `Rare-find chance +${Math.round(P.deepChance * 100)}%.`, rareChance: P.deepChance },
  { id: 'scanner.relic', slot: 'scanner', name: 'Relic Finder', desc: 'Rare finds all go to relics.', rareTo: 'relics' },
  { id: 'scanner.codex', slot: 'scanner', name: 'Codex Scanner', desc: 'Rare finds all go to the Codex.', rareTo: 'codex' },
];

export const PART_BY_ID: ReadonlyMap<string, PartDef> = new Map(PARTS.map((p) => [p.id, p]));

export type ShipDesign = Record<PartSlot, string>;
/** What every ship flies until you fit something else: exactly the numbers from before Phase 20. */
export const DEFAULT_DESIGN: Readonly<ShipDesign> = { hull: 'hull.scout', engine: 'engine.ion', cargo: 'cargo.standard', scanner: 'scanner.basic' };
export const isDefaultPart = (id: string) => (Object.values(DEFAULT_DESIGN) as string[]).includes(id);
