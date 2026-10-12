import { BALANCE } from './balance';

/**
 * Planet Defense (Ideas menu 9): five turrets, each paid for and levelled with one grade of alloy.
 * The battlefield is a circle of radius 1 around the star: swarmers come in from EDGE along three
 * spiral lanes to your planets' ring (PLANET_RING), past twelve sockets on SOCKET_RING. Every number
 * a player could feel lives in balance.ts. IDs never change.
 */
export type TurretKind = 'laser' | 'flak' | 'frost' | 'prism' | 'lance';

export interface TurretDef {
  id: TurretKind;
  name: string;
  desc: string;
  color: string;
  /** The alloy that places and levels it. */
  alloy: string;
  placeCost: number;
  levelCost: number;
  /** Damage a hit at level 0, seconds between shots, and reach. */
  damage: number;
  every: number;
  range: number;
  /** Flak and Frost: everything this close to the target is hit too. */
  splash?: number;
  /** Frost: hit swarmers move at this share of their speed for `slowFor` seconds. */
  slow?: number;
  slowFor?: number;
  /** Prism: the beam jumps to this many targets in all, each within `jump` of the last. */
  chain?: number;
  jump?: number;
  /** Void Lance: everything within this distance of the line through its target is hit. */
  pierce?: number;
}

const T = BALANCE.defense.turrets;
const def = (id: TurretKind, name: string, desc: string, color: string, alloy: string): TurretDef => ({ id, name, desc, color, alloy, ...T[id]! });

export const TURRETS: readonly TurretDef[] = [
  def('laser', 'Laser', 'Fast shots at one target.', '#FF4F6E', 'alloy.iron'),
  def('flak', 'Flak', 'Bursts that hit everything near the target.', '#FFC83D', 'alloy.gold'),
  def('frost', 'Frost', 'Slows what it hits to half speed.', '#9FE7FF', 'alloy.crystal'),
  def('prism', 'Prism', 'A beam that chains to 3 targets.', '#FF9EF0', 'alloy.prismatic'),
  def('lance', 'Void Lance', 'Pierces everything in a line.', '#9B7CFF', 'alloy.void'),
];

export const TURRET_BY_ID: ReadonlyMap<string, TurretDef> = new Map(TURRETS.map((t) => [t.id, t]));

/** The field's layout (not balance: where things sit on the screen). */
export const EDGE = 1.05;
export const PLANET_RING = 0.2;
export const SOCKET_RING = 0.4;
/** Each lane turns this far around the star on its way in. */
export const LANE_TURN = 1.25 * Math.PI;
export const LANES = 3;
/** Simulation step (seconds) and the longest a battle can last. */
export const STEP = 0.05;
export const MAX_SECONDS = 300;

/** Where socket `i` sits (field units). */
export function socketAt(i: number, sockets: number = BALANCE.defense.sockets): { x: number; y: number } {
  const a = -Math.PI / 2 + (i / sockets) * Math.PI * 2;
  return { x: Math.cos(a) * SOCKET_RING, y: Math.sin(a) * SOCKET_RING };
}
