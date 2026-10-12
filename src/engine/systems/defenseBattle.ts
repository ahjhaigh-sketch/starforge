import { BALANCE } from '../../content/balance';
import { EDGE, LANE_TURN, LANES, MAX_SECONDS, PLANET_RING, socketAt, STEP, TURRET_BY_ID, type TurretDef } from '../../content/defense';
import { nextFloat, nextInt, seedRng } from '../rng';

/**
 * One Planet Defense battle, as pure functions of its setup: no game state, no clock, no DOM. The
 * engine runs it to the end to score a wave; the panel steps the very same battle to draw it, so
 * what you watch is what was scored. Health is measured in units of this wave's basic swarmer, and
 * damage likewise (a hit's damage / that health), so wave 5,000 is as safe in floating point as
 * wave 1 and a battle costs the same at any wave.
 */
const DF = BALANCE.defense;

export interface BattleSetup {
  wave: number;
  seed: number;
  /** The turret kind in each socket ('' for empty). */
  sockets: readonly string[];
  /** A hit's damage for each kind, in units of a basic swarmer's health this wave. */
  hit: Readonly<Record<string, number>>;
}

export interface BattleResult {
  win: boolean;
  seconds: number;
  kills: number;
  leaks: number;
}

/** What a shot looked like this step, for drawing: from a socket to the points it hit. */
export interface Shot {
  socket: number;
  kind: string;
  to: Array<[number, number]>;
}

const WAITING = 0;
const ALIVE = 1;
const DEAD = 2;
const LEAKED = 3;

export interface Battle {
  setup: BattleSetup;
  t: number;
  n: number;
  hp: Float64Array;
  maxHp: Float64Array;
  taken: Float64Array;
  speed: Float64Array;
  lane: Uint8Array;
  spawnAt: Float64Array;
  u: Float64Array;
  slowUntil: Float64Array;
  state: Uint8Array;
  /** 0 a swarmer, 1 armoured, 2 the boss. */
  type: Uint8Array;
  x: Float64Array;
  y: Float64Array;
  cooldown: Float64Array;
  leaks: number;
  kills: number;
  done: boolean;
  win: boolean;
  shots: Shot[];
}

export const swarmCount = (wave: number) => Math.min(DF.maxCount, DF.baseCount + Math.floor(wave * DF.countPerWave));
export const hasArmour = (wave: number) => wave % DF.armourEvery === 0;
export const hasBoss = (wave: number) => wave % DF.bossEvery === 0;

/** log10 of a basic swarmer's health on a wave (it passes 1e308 near wave 5,800). */
export const healthLog10 = (wave: number) => Math.log10(DF.baseHealth) + wave * Math.log10(DF.healthGrowth);

/** A hit's damage in this wave's units: never Infinity, never NaN. */
export function relativeHit(damage: number, level: number, wave: number): number {
  const lg = Math.log10(damage) + level * Math.log10(DF.damagePerLevel) - healthLog10(wave);
  return lg > 9 ? 1e9 : lg < -300 ? 0 : 10 ** lg;
}

function laneAngle(lane: number): number {
  return -Math.PI / 2 + Math.PI / LANES + (lane * Math.PI * 2) / LANES;
}

function place(lane: number, u: number): [number, number] {
  const r = EDGE - (EDGE - PLANET_RING) * u;
  const a = laneAngle(lane) + LANE_TURN * u;
  return [Math.cos(a) * r, Math.sin(a) * r];
}

/** The length of a lane (the same for all three), worked out once. */
const PATH = (() => {
  let len = 0;
  let [px, py] = place(0, 0);
  for (let i = 1; i <= 512; i++) {
    const [x, y] = place(0, i / 512);
    len += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return len;
})();

/** Where a swarmer on a lane is, for the panel (and the battle). */
export const lanePoint = place;

export function createBattle(setup: BattleSetup): Battle {
  const rng = seedRng(setup.seed);
  const base = swarmCount(setup.wave);
  const boss = hasBoss(setup.wave) ? 1 : 0;
  const n = base + boss;
  const armoured = hasArmour(setup.wave) ? Math.floor(base / 4) : 0;
  const b: Battle = {
    setup,
    t: 0,
    n,
    hp: new Float64Array(n),
    maxHp: new Float64Array(n),
    taken: new Float64Array(n),
    speed: new Float64Array(n),
    lane: new Uint8Array(n),
    spawnAt: new Float64Array(n),
    u: new Float64Array(n),
    slowUntil: new Float64Array(n),
    state: new Uint8Array(n),
    type: new Uint8Array(n),
    x: new Float64Array(n),
    y: new Float64Array(n),
    cooldown: new Float64Array(setup.sockets.length),
    leaks: 0,
    kills: 0,
    done: false,
    win: false,
    shots: [],
  };
  for (let i = 0; i < n; i++) {
    const type = i >= base ? 2 : i >= base - armoured ? 1 : 0;
    const hp = type === 2 ? DF.bossHealth : type === 1 ? DF.armourHealth : 1;
    b.type[i] = type;
    b.hp[i] = b.maxHp[i] = hp;
    b.taken[i] = type === 1 ? DF.armourTaken : 1;
    b.speed[i] = type === 2 ? DF.speed.boss : type === 1 ? DF.speed.armoured : DF.speed.swarmer;
    b.lane[i] = nextInt(rng, 0, LANES - 1);
    b.spawnAt[i] = i * DF.spawnGap + nextFloat(rng) * 0.2 + (type === 2 ? 1 : 0);
    const [x, y] = place(b.lane[i]!, 0);
    b.x[i] = x;
    b.y[i] = y;
  }
  return b;
}

function damage(b: Battle, i: number, amount: number): void {
  if (b.state[i] !== ALIVE) return;
  b.hp[i]! -= amount * b.taken[i]!;
  if (b.hp[i]! <= 0) {
    b.state[i] = DEAD;
    b.kills++;
  }
}

/** The swarmer furthest along the lane within reach of a point, or -1. */
function target(b: Battle, x: number, y: number, range: number): number {
  let best = -1;
  let bestU = -1;
  const r2 = range * range;
  for (let i = 0; i < b.n; i++) {
    if (b.state[i] !== ALIVE) continue;
    const dx = b.x[i]! - x;
    const dy = b.y[i]! - y;
    if (dx * dx + dy * dy <= r2 && b.u[i]! > bestU) {
      bestU = b.u[i]!;
      best = i;
    }
  }
  return best;
}

function fire(b: Battle, socket: number, t: TurretDef, hit: number, sx: number, sy: number, first: number): void {
  const shot: Shot = { socket, kind: t.id, to: [] };
  if (t.splash) {
    // flak and frost: everything near the target
    const cx = b.x[first]!;
    const cy = b.y[first]!;
    const r2 = t.splash * t.splash;
    for (let i = 0; i < b.n; i++) {
      if (b.state[i] !== ALIVE) continue;
      const dx = b.x[i]! - cx;
      const dy = b.y[i]! - cy;
      if (dx * dx + dy * dy > r2) continue;
      if (t.slow) b.slowUntil[i] = b.t + (t.slowFor ?? 0);
      damage(b, i, hit);
    }
    shot.to.push([cx, cy]);
  } else if (t.chain) {
    // prism: target, then the nearest swarmer not hit yet, within a jump of the last
    const hitSet: number[] = [];
    let cur = first;
    while (cur >= 0 && hitSet.length < t.chain) {
      hitSet.push(cur);
      shot.to.push([b.x[cur]!, b.y[cur]!]);
      const lx = b.x[cur]!;
      const ly = b.y[cur]!;
      let next = -1;
      let nd = (t.jump ?? 0) ** 2;
      for (let i = 0; i < b.n; i++) {
        if (b.state[i] !== ALIVE || hitSet.includes(i)) continue;
        const d = (b.x[i]! - lx) ** 2 + (b.y[i]! - ly) ** 2;
        if (d <= nd) {
          nd = d;
          next = i;
        }
      }
      cur = next;
    }
    for (const i of hitSet) damage(b, i, hit);
  } else if (t.pierce) {
    // void lance: a line from the socket through the target, as far as it reaches
    const dx = b.x[first]! - sx;
    const dy = b.y[first]! - sy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    for (let i = 0; i < b.n; i++) {
      if (b.state[i] !== ALIVE) continue;
      const px = b.x[i]! - sx;
      const py = b.y[i]! - sy;
      const along = px * ux + py * uy;
      if (along < 0 || along > t.range) continue;
      if (Math.abs(px * uy - py * ux) <= t.pierce) damage(b, i, hit);
    }
    shot.to.push([sx + ux * t.range, sy + uy * t.range]);
  } else {
    shot.to.push([b.x[first]!, b.y[first]!]);
    damage(b, first, hit);
  }
  b.shots.push(shot);
}

/** One fixed step of the battle. */
export function stepBattle(b: Battle): void {
  if (b.done) return;
  b.t += STEP;
  b.shots = [];
  let pending = 0;
  for (let i = 0; i < b.n; i++) {
    const st = b.state[i];
    if (st === WAITING) {
      if (b.t >= b.spawnAt[i]!) b.state[i] = ALIVE;
      else {
        pending++;
        continue;
      }
    } else if (st !== ALIVE) continue;
    const slow = b.t < b.slowUntil[i]! ? (TURRET_BY_ID.get('frost')?.slow ?? 1) : 1;
    b.u[i]! += (b.speed[i]! * slow * STEP) / PATH;
    if (b.u[i]! >= 1) {
      b.state[i] = LEAKED;
      b.leaks++;
      continue;
    }
    const [x, y] = place(b.lane[i]!, b.u[i]!);
    b.x[i] = x;
    b.y[i] = y;
    pending++;
  }
  const { sockets, hit } = b.setup;
  for (let k = 0; k < sockets.length; k++) {
    const kind = sockets[k];
    if (!kind) continue;
    const t = TURRET_BY_ID.get(kind);
    if (!t) continue;
    b.cooldown[k] = Math.max(0, b.cooldown[k]! - STEP);
    if (b.cooldown[k]! > 0) continue;
    const { x: sx, y: sy } = socketAt(k, sockets.length);
    const first = target(b, sx, sy, t.range);
    if (first < 0) continue;
    fire(b, k, t, hit[kind] ?? 0, sx, sy, first);
    b.cooldown[k] = t.every;
  }
  let left = 0;
  for (let i = 0; i < b.n; i++) if (b.state[i] === WAITING || b.state[i] === ALIVE) left++;
  if (b.leaks >= DF.leaks) {
    b.done = true;
    b.win = false;
  } else if (left === 0 && pending >= 0) {
    b.done = true;
    b.win = true;
  } else if (b.t >= MAX_SECONDS) {
    b.done = true;
    b.win = false;
  }
}

/** Runs a battle to its end. */
export function runBattle(setup: BattleSetup): BattleResult {
  const b = createBattle(setup);
  while (!b.done) stepBattle(b);
  return { win: b.win, seconds: b.t, kills: b.kills, leaks: b.leaks };
}
