import { Application, Container, Graphics } from 'pixi.js';
import { BALANCE } from '../content/balance';
import { EDGE, LANES, PLANET_RING, socketAt, STEP, TURRET_BY_ID } from '../content/defense';
import { type Battle, type BattleSetup, createBattle, lanePoint, stepBattle } from '../engine/systems/defenseBattle';

/**
 * Planet Defense's battlefield: its own small PixiJS canvas in the panel (like the Belt's field).
 * It replays a battle by stepping the very battle the engine scored (createBattle + stepBattle), at
 * x1, x2 or x4.
 * 1.3.0 (the playtest asked for it to look better): a starfield and a lit star with a corona, your
 * planets turning on their ring, glowing lanes with energy flowing in, turret pads with a shape for
 * each kind that turns to its last target, void creatures (spiky swarmers, shelled armour, a boss
 * with an eye), proper beams and bursts, and a puff where each one dies. Reduced motion shows the
 * end of a battle and holds the field still.
 */
const num = (hex: string) => parseInt(hex.slice(1), 16);
const INK = 0x140b2e;
const SWARM = [0xb23aff, 0x8fa6c8, 0xff4f6e];
const RADII = [0.024, 0.034, 0.058];
const TAU = Math.PI * 2;
const PLANETS = [0x5fb8e8, 0x3ee08a, 0xff9a3d, 0xb06bff];

interface Puff {
  x: number;
  y: number;
  r: number;
  color: number;
  life: number;
}

export class DefenseField {
  private app: Application | null = null;
  private board = new Graphics();
  private ambient = new Graphics();
  private live = new Graphics();
  private layer = new Container();
  private battle: Battle | null = null;
  private acc = 0;
  private sockets: string[] = [];
  private shotFade = 0;
  private time = 0;
  private puffs: Puff[] = [];
  /** Which way each socket's turret faces (radians), turned towards its last shot. */
  private aim: number[] = [];
  private stars: Array<[number, number, number]> = [];
  private aimDirty = true;
  speed = 1;
  still = false;
  onDone: (b: Battle) => void = () => {};

  async mount(canvas: HTMLCanvasElement, width: number, height: number): Promise<boolean> {
    try {
      this.app = new Application();
      await this.app.init({ canvas, width, height, backgroundAlpha: 0, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl' });
    } catch {
      this.app = null;
      return false;
    }
    // a fixed little starfield (cosmetic only)
    let seed = 0x5eed;
    const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);
    this.stars = Array.from({ length: 60 }, () => [rnd(), rnd(), 0.4 + rnd() * 1.4] as [number, number, number]);
    this.layer.addChild(this.board, this.ambient, this.live);
    this.app.stage.addChild(this.layer);
    this.app.ticker.add((t) => this.frame(Math.min(t.deltaMS / 1000, 0.1)));
    this.drawBoard();
    this.drawAmbient();
    return true;
  }

  resize(width: number, height: number): void {
    this.app?.renderer.resize(width, height);
    this.drawBoard();
  }

  /** The turret in each socket ('' empty). */
  setSockets(sockets: readonly string[]): void {
    if (sockets.join(',') === this.sockets.join(',')) return;
    this.sockets = sockets.slice();
    this.aimDirty = true;
    this.drawBoard();
  }

  /** Replays a battle from its setup; `instant` shows its end at once (Skip, or reduced motion). */
  play(setup: BattleSetup, instant = false): void {
    this.battle = createBattle(setup);
    this.acc = 0;
    this.puffs = [];
    if (instant) this.finish();
  }

  /** Runs the replay to its end now. */
  finish(): void {
    const b = this.battle;
    if (!b) return;
    while (!b.done) stepBattle(b);
    b.shots = [];
    this.puffs = [];
    this.drawLive();
    this.onDone(b);
  }

  get playing(): boolean {
    return !!this.battle && !this.battle.done;
  }

  private get scale(): { cx: number; cy: number; k: number } {
    const w = this.app?.screen.width ?? 1;
    const h = this.app?.screen.height ?? 1;
    return { cx: w / 2, cy: h / 2, k: Math.min(w, h) / 2 / (EDGE + 0.04) };
  }

  /** What never moves: the stars, the lanes' beds, the planets' ring and the socket pads. */
  private drawBoard(): void {
    if (!this.app) return;
    const g = this.board;
    const { cx, cy, k } = this.scale;
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    g.clear();
    for (const [x, y, r] of this.stars) g.circle(x * w, y * h, r).fill({ color: 0xffffff, alpha: 0.35 + r * 0.25 });
    // the lanes: a dark bed with a glowing edge
    for (let lane = 0; lane < LANES; lane++) {
      const pts: number[] = [];
      for (let i = 0; i <= 48; i++) {
        const [x, y] = lanePoint(lane, i / 48);
        pts.push(cx + x * k, cy + y * k);
      }
      g.poly(pts, false).stroke({ width: Math.max(10, k * 0.085), color: 0x6e5cc4, alpha: 0.25, cap: 'round', join: 'round' });
      g.poly(pts, false).stroke({ width: Math.max(6, k * 0.06), color: 0x1b1240, alpha: 0.9, cap: 'round', join: 'round' });
    }
    g.circle(cx, cy, PLANET_RING * k).stroke({ width: 2, color: 0x7dff5a, alpha: 0.35 });
    // socket pads: a hexagon each, coloured by its turret
    const n = BALANCE.defense.sockets;
    for (let i = 0; i < n; i++) {
      const { x, y } = socketAt(i, n);
      const t = TURRET_BY_ID.get(this.sockets[i] ?? '');
      const r = k * 0.055;
      const pts: number[] = [];
      for (let j = 0; j < 6; j++) pts.push(cx + x * k + Math.cos((j / 6) * TAU) * r, cy + y * k + Math.sin((j / 6) * TAU) * r);
      g.poly(pts).fill({ color: t ? 0x2b1f6e : 0x1b1240 }).stroke({ width: 3, color: t ? num(t.color) : 0x4a4f80, alpha: t ? 0.9 : 0.6 });
    }
  }

  /** What moves even between battles: the star's corona, the planets, energy in the lanes, the turrets. */
  private drawAmbient(): void {
    const g = this.ambient;
    g.clear();
    if (!this.app) return;
    const { cx, cy, k } = this.scale;
    const t = this.time;
    // the star: corona rings that breathe, then the disc
    for (let i = 3; i >= 1; i--) g.circle(cx, cy, k * (0.07 + i * 0.025 + 0.006 * Math.sin(t * 2 + i))).fill({ color: 0xffb347, alpha: 0.08 * i });
    g.circle(cx, cy, k * 0.075).fill({ color: 0xffe08a }).stroke({ width: 3, color: INK });
    g.circle(cx - k * 0.022, cy - k * 0.022, k * 0.025).fill({ color: 0xffffff, alpha: 0.75 });
    // the planets turning on their ring
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4 + t * 0.15;
      const px = cx + Math.cos(a) * PLANET_RING * k;
      const py = cy + Math.sin(a) * PLANET_RING * k;
      const r = k * 0.034;
      g.circle(px, py, r).fill({ color: PLANETS[i]! }).stroke({ width: 2.5, color: INK });
      // the night side faces away from the star
      g.arc(px, py, r * 0.9, a - Math.PI / 2, a + Math.PI / 2).fill({ color: INK, alpha: 0.35 });
    }
    // energy flowing in along each lane
    for (let lane = 0; lane < LANES; lane++) {
      for (let j = 0; j < 5; j++) {
        const u = (j / 5 + t * 0.18) % 1;
        const [x, y] = lanePoint(lane, u);
        g.circle(cx + x * k, cy + y * k, Math.max(1.5, k * 0.008)).fill({ color: 0xb06bff, alpha: 0.65 * Math.sin(u * Math.PI) });
      }
    }
    // turrets: a shape per kind, turned towards their last target
    const n = BALANCE.defense.sockets;
    for (let i = 0; i < n; i++) {
      const tdef = TURRET_BY_ID.get(this.sockets[i] ?? '');
      if (!tdef) continue;
      const { x, y } = socketAt(i, n);
      const sx = cx + x * k;
      const sy = cy + y * k;
      const a = this.aim[i] ?? Math.atan2(sy - cy, sx - cx);
      const c = num(tdef.color);
      const r = k * 0.032;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const barrel = (off: number, len: number, wid: number) =>
        g
          .moveTo(sx - dy * off, sy + dx * off)
          .lineTo(sx - dy * off + dx * len, sy + dx * off + dy * len)
          .stroke({ width: wid + 3, color: INK })
          .moveTo(sx - dy * off, sy + dx * off)
          .lineTo(sx - dy * off + dx * len, sy + dx * off + dy * len)
          .stroke({ width: wid, color: c });
      switch (tdef.id) {
        case 'flak':
          barrel(-r * 0.4, r * 1.5, 3);
          barrel(r * 0.4, r * 1.5, 3);
          g.circle(sx, sy, r).fill({ color: c }).stroke({ width: 2.5, color: INK });
          break;
        case 'frost': {
          const pts: number[] = [];
          for (let j = 0; j < 8; j++) {
            const aa = a + (j / 8) * TAU;
            const rr = j % 2 ? r * 0.55 : r * 1.25;
            pts.push(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr);
          }
          g.poly(pts).fill({ color: c }).stroke({ width: 2.5, color: INK });
          break;
        }
        case 'prism':
          g.poly([sx + dx * r * 1.4, sy + dy * r * 1.4, sx - dy * r - dx * r * 0.7, sy + dx * r - dy * r * 0.7, sx + dy * r - dx * r * 0.7, sy - dx * r - dy * r * 0.7])
            .fill({ color: c })
            .stroke({ width: 2.5, color: INK });
          break;
        case 'lance':
          barrel(0, r * 2.4, 4);
          g.circle(sx, sy, r * 0.85).fill({ color: c }).stroke({ width: 2.5, color: INK });
          g.circle(sx + dx * r * 2.4, sy + dy * r * 2.4, 3).fill({ color: 0xffffff });
          break;
        default:
          barrel(0, r * 1.7, 4);
          g.circle(sx, sy, r * 0.9).fill({ color: c }).stroke({ width: 2.5, color: INK });
      }
    }
  }

  private drawLive(): void {
    const g = this.live;
    g.clear();
    const b = this.battle;
    if (!b) return;
    const { cx, cy, k } = this.scale;
    for (let i = 0; i < b.n; i++) {
      if (b.state[i] !== 1) continue;
      const type = b.type[i]!;
      const r = RADII[type]! * k;
      const wob = Math.sin(this.time * 6 + i) * r * 0.08;
      const x = cx + b.x[i]! * k;
      const y = cy + b.y[i]! * k + wob;
      const slowed = b.t < b.slowUntil[i]!;
      const color = SWARM[type]!;
      if (type === 0) {
        // a spiky swarmer
        const pts: number[] = [];
        for (let j = 0; j < 10; j++) {
          const a = (j / 10) * TAU + this.time * 2;
          const rr = j % 2 ? r * 0.65 : r * 1.15;
          pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        g.poly(pts).fill({ color, alpha: slowed ? 0.6 : 1 }).stroke({ width: 2, color: slowed ? 0x9fe7ff : INK });
      } else if (type === 1) {
        // a shelled one: a hexagon with plates
        const pts: number[] = [];
        for (let j = 0; j < 6; j++) pts.push(x + Math.cos((j / 6) * TAU + 0.5) * r, y + Math.sin((j / 6) * TAU + 0.5) * r);
        g.poly(pts).fill({ color, alpha: slowed ? 0.6 : 1 }).stroke({ width: 2.5, color: slowed ? 0x9fe7ff : INK });
        g.circle(x, y, r * 0.45).fill({ color: 0x5a6f92 }).stroke({ width: 1.5, color: INK });
      } else {
        // the boss: a big body, waving feelers and an eye that follows the star
        for (let j = 0; j < 6; j++) {
          const a = (j / 6) * TAU + Math.sin(this.time * 2 + j) * 0.3;
          g.moveTo(x, y).lineTo(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6).stroke({ width: 4, color: INK }).moveTo(x, y).lineTo(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6).stroke({ width: 2, color });
        }
        g.circle(x, y, r).fill({ color, alpha: slowed ? 0.7 : 1 }).stroke({ width: 3, color: slowed ? 0x9fe7ff : INK });
        const ea = Math.atan2(cy - y, cx - x);
        g.circle(x, y, r * 0.45).fill({ color: 0xffffff }).stroke({ width: 2, color: INK });
        g.circle(x + Math.cos(ea) * r * 0.18, y + Math.sin(ea) * r * 0.18, r * 0.2).fill({ color: INK });
      }
      if (slowed) g.circle(x, y, r * 1.35).stroke({ width: 1.5, color: 0x9fe7ff, alpha: 0.7 });
      // health left, as an arc for the armoured and the boss
      if (type > 0) g.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, b.hp[i]! / b.maxHp[i]!)).stroke({ width: 2.5, color: 0x7dff5a });
    }
    if (this.shotFade > 0) {
      const n = b.setup.sockets.length;
      for (const shot of b.shots) {
        const t = TURRET_BY_ID.get(shot.kind);
        if (!t) continue;
        const { x: sx, y: sy } = socketAt(shot.socket, n);
        let px = cx + sx * k;
        let py = cy + sy * k;
        const c = num(t.color);
        for (const [tx, ty] of shot.to) {
          const qx = cx + tx * k;
          const qy = cy + ty * k;
          const wide = t.id === 'lance' ? 9 : t.id === 'prism' ? 6 : 5;
          // a soft glow under a bright core
          g.moveTo(px, py).lineTo(qx, qy).stroke({ width: wide, color: c, alpha: this.shotFade * 0.35 });
          g.moveTo(px, py).lineTo(qx, qy).stroke({ width: Math.max(1.5, wide * 0.35), color: 0xffffff, alpha: this.shotFade * 0.9 });
          if (t.splash) {
            g.circle(qx, qy, t.splash * k * (1.2 - this.shotFade * 0.2)).fill({ color: c, alpha: this.shotFade * 0.18 }).stroke({ width: 2, color: c, alpha: this.shotFade * 0.7 });
          }
          if (t.id === 'frost') for (let j = 0; j < 6; j++) g.moveTo(qx, qy).lineTo(qx + Math.cos((j / 6) * TAU) * 8, qy + Math.sin((j / 6) * TAU) * 8).stroke({ width: 1.5, color: 0xe8f8ff, alpha: this.shotFade });
          // a prism beam jumps on from where it hit
          if (t.chain) {
            px = qx;
            py = qy;
          }
        }
        const last = shot.to[shot.to.length - 1];
        if (last) this.aim[shot.socket] = Math.atan2(cy + last[1] * k - (cy + sy * k), cx + last[0] * k - (cx + sx * k));
      }
    }
    // puffs where the swarm died
    for (const p of this.puffs) {
      const f = 1 - p.life;
      g.circle(p.x, p.y, p.r * (1 + f * 1.6)).stroke({ width: 2, color: p.color, alpha: p.life });
      for (let j = 0; j < 5; j++) {
        const a = (j / 5) * TAU + p.r;
        g.circle(p.x + Math.cos(a) * p.r * (0.8 + f * 2), p.y + Math.sin(a) * p.r * (0.8 + f * 2), Math.max(1, p.r * 0.25 * p.life)).fill({ color: 0xffffff, alpha: p.life });
      }
    }
  }

  private frame(dt: number): void {
    // held still (reduced motion), the field is drawn once and when its turrets change
    if (!this.still) this.time += dt;
    if (!this.still || this.aimDirty) {
      this.drawAmbient();
      this.aimDirty = false;
    }
    for (const p of this.puffs) p.life -= dt * 2.2;
    this.puffs = this.puffs.filter((p) => p.life > 0);
    const b = this.battle;
    if (!b || b.done) {
      if (this.puffs.length) this.drawLive();
      return;
    }
    if (this.still) {
      this.finish();
      return;
    }
    // which were alive before this frame's steps, to put a puff where each one dies
    const was = Array.from(b.state);
    this.acc += dt * this.speed;
    let stepped = false;
    while (this.acc >= STEP && !b.done) {
      this.acc -= STEP;
      stepBattle(b);
      stepped = true;
    }
    if (stepped) {
      const { cx, cy, k } = this.scale;
      for (let i = 0; i < b.n; i++) if (was[i] === 1 && b.state[i] === 2 && this.puffs.length < 40) this.puffs.push({ x: cx + b.x[i]! * k, y: cy + b.y[i]! * k, r: RADII[b.type[i]!]! * k, color: SWARM[b.type[i]!]!, life: 1 });
    }
    if (stepped && b.shots.length > 0) this.shotFade = 1;
    else this.shotFade = Math.max(0, this.shotFade - dt * 6);
    if (b.done) {
      // the battle is over: no beams left hanging
      b.shots = [];
      this.shotFade = 0;
    }
    this.drawLive();
    if (b.done) this.onDone(b);
  }

  destroy(): void {
    this.app?.destroy(false, { children: true });
    this.app = null;
  }
}
