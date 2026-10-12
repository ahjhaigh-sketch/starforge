import { Application, Container, Graphics } from 'pixi.js';
import { BALANCE } from '../content/balance';
import { EDGE, LANES, PLANET_RING, socketAt, STEP, TURRET_BY_ID } from '../content/defense';
import { type Battle, type BattleSetup, createBattle, lanePoint, stepBattle } from '../engine/systems/defenseBattle';

/**
 * Planet Defense's battlefield: its own small PixiJS canvas in the panel (like the Belt's field).
 * It draws the star, your planets' ring, the three lanes and the sockets, and replays a battle by
 * stepping the very battle the engine scored (createBattle + stepBattle), at x1, x2 or x4.
 */
const num = (hex: string) => parseInt(hex.slice(1), 16);
const SWARM = [0xb23aff, 0x8fa6c8, 0xff4f6e];
const RADII = [0.022, 0.03, 0.05];

export class DefenseField {
  private app: Application | null = null;
  private board = new Graphics();
  private live = new Graphics();
  private layer = new Container();
  private battle: Battle | null = null;
  private acc = 0;
  private sockets: string[] = [];
  private shotFade = 0;
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
    this.layer.addChild(this.board, this.live);
    this.app.stage.addChild(this.layer);
    this.app.ticker.add((t) => this.frame(Math.min(t.deltaMS / 1000, 0.1)));
    this.drawBoard();
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
    this.drawBoard();
  }

  /** Replays a battle from its setup; `instant` shows its end at once (Skip, or reduced motion). */
  play(setup: BattleSetup, instant = false): void {
    this.battle = createBattle(setup);
    this.acc = 0;
    if (instant) this.finish();
  }

  /** Runs the replay to its end now. */
  finish(): void {
    const b = this.battle;
    if (!b) return;
    while (!b.done) stepBattle(b);
    b.shots = [];
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

  private drawBoard(): void {
    if (!this.app) return;
    const g = this.board;
    const { cx, cy, k } = this.scale;
    g.clear();
    // the lanes, faint
    for (let lane = 0; lane < LANES; lane++) {
      const pts: number[] = [];
      for (let i = 0; i <= 48; i++) {
        const [x, y] = lanePoint(lane, i / 48);
        pts.push(cx + x * k, cy + y * k);
      }
      g.poly(pts, false).stroke({ width: Math.max(6, k * 0.06), color: 0x2a2f55, alpha: 0.7, cap: 'round', join: 'round' });
    }
    // the planets' ring and the star
    g.circle(cx, cy, PLANET_RING * k).stroke({ width: 2, color: 0x7dff5a, alpha: 0.5 });
    g.circle(cx, cy, k * 0.07).fill({ color: 0xffd27a });
    g.circle(cx, cy, k * 0.07).stroke({ width: 3, color: 0x140b2e });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      g.circle(cx + Math.cos(a) * PLANET_RING * k, cy + Math.sin(a) * PLANET_RING * k, k * 0.03).fill({ color: [0x5fb8e8, 0x3ee08a, 0xff9a3d, 0xb06bff][i]! });
    }
    // the sockets: a ring each, filled with its turret's colour
    const n = BALANCE.defense.sockets;
    for (let i = 0; i < n; i++) {
      const { x, y } = socketAt(i, n);
      const t = TURRET_BY_ID.get(this.sockets[i] ?? '');
      const r = k * 0.045;
      if (t) g.circle(cx + x * k, cy + y * k, r).fill({ color: num(t.color) });
      g.circle(cx + x * k, cy + y * k, r).stroke({ width: 3, color: t ? 0x140b2e : 0x4a4f80 });
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
      const x = cx + b.x[i]! * k;
      const y = cy + b.y[i]! * k;
      g.circle(x, y, r).fill({ color: SWARM[type]!, alpha: b.t < b.slowUntil[i]! ? 0.6 : 1 });
      g.circle(x, y, r).stroke({ width: 2, color: b.t < b.slowUntil[i]! ? 0x9fe7ff : 0x140b2e });
      // health left, as an arc for the armoured and the boss
      if (type > 0) g.arc(x, y, r + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, b.hp[i]! / b.maxHp[i]!)).stroke({ width: 2, color: 0x7dff5a });
    }
    if (this.shotFade > 0) {
      const n = b.setup.sockets.length;
      for (const shot of b.shots) {
        const t = TURRET_BY_ID.get(shot.kind);
        if (!t) continue;
        const { x: sx, y: sy } = socketAt(shot.socket, n);
        let px = cx + sx * k;
        let py = cy + sy * k;
        for (const [tx, ty] of shot.to) {
          const qx = cx + tx * k;
          const qy = cy + ty * k;
          g.moveTo(px, py).lineTo(qx, qy).stroke({ width: t.id === 'lance' ? 4 : 2, color: num(t.color), alpha: this.shotFade });
          if (t.splash) g.circle(qx, qy, t.splash * k).stroke({ width: 2, color: num(t.color), alpha: this.shotFade * 0.6 });
          // a prism beam jumps on from where it hit
          if (t.chain) {
            px = qx;
            py = qy;
          }
        }
      }
    }
  }

  private frame(dt: number): void {
    const b = this.battle;
    if (!b || b.done) return;
    if (this.still) {
      this.finish();
      return;
    }
    this.acc += dt * this.speed;
    let stepped = false;
    while (this.acc >= STEP && !b.done) {
      this.acc -= STEP;
      stepBattle(b);
      stepped = true;
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
