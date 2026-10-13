import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { MEGA_BY_ID } from '../content/galaxyBuild';

/**
 * Megastructures in the sky, round the star: each built stage adds to its structure (1.3.0: drawn
 * as the real thing and moving, as the playtest asked).
 * - Dyson Swarm: hexagonal mirror panels on three tilted orbits, glinting as they turn; the near
 *   half passes in front of the star.
 * - Ringworld: a broad tilted band with land and seas on its inner face and ribs that travel round
 *   it; its near side crosses in front of the star.
 * - Matrioshka Brain: nested shells with a turning lattice and blinking nodes.
 * - Star Lifter: plasma jets from both poles, with collars and plasma flowing outwards.
 * - Stellar Engine: a vast curved mirror on struts to one side, and the thrust plume opposite.
 * - Birch Planet: a huge banded disc far behind everything, turning slowly.
 * Static shapes are drawn when the stages or the star's size change; the moving parts redraw a
 * few dozen small shapes a frame (or hold still with reduced motion).
 */
const col = (id: string) => parseInt((MEGA_BY_ID.get(id)?.color ?? '#FFFFFF').slice(1), 16);
const INK = 0x140b2e;
const TAU = Math.PI * 2;

let panelTex: Texture | null = null;
/** One Dyson panel: a gold hexagon with an ink rim and a light streak, painted once. */
function panelTexture(): Texture {
  if (panelTex) return panelTex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6;
    const x = 16 + Math.cos(a) * 12;
    const y = 16 + Math.sin(a) * 12;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(6, 6, 26, 26);
  g.addColorStop(0, '#FFF6D0');
  g.addColorStop(0.5, '#FFC83D');
  g.addColorStop(1, '#B0701A');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#140B2E';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10, 13);
  ctx.lineTo(18, 9);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.stroke();
  panelTex = Texture.from(c);
  return panelTex;
}

interface Panel {
  sprite: Sprite;
  orbit: number;
  phase: number;
}

export class MegaView {
  /** Behind the star, and (1.3.0) in front of it for the near halves. */
  readonly root = new Container();
  readonly front = new Container();
  private still = new Graphics();
  private shells = new Graphics();
  private ringBack = new Graphics();
  private ringFront = new Graphics();
  private moving = new Graphics();
  private movingFront = new Graphics();
  private swarmBack = new Container();
  private swarmFront = new Container();
  private panels: Panel[] = [];
  private stages: Record<string, number> = {};
  private drawnFor = '';
  private t = 0;
  private movingAcc = 0;
  private movingDrawn = false;

  constructor() {
    this.root.addChild(this.still, this.shells, this.ringBack, this.moving, this.swarmBack);
    this.front.addChild(this.ringFront, this.movingFront, this.swarmFront);
  }

  /** "dyson:3|ringworld:1" from the snapshot. */
  set(spec: string): void {
    const next: Record<string, number> = {};
    for (const part of spec ? spec.split('|') : []) {
      const [id, k] = part.split(':');
      if (id) next[id] = Number(k) || 0;
    }
    this.stages = next;
    this.drawnFor = '';
    this.movingDrawn = false;
    const any = Object.keys(next).length > 0;
    this.root.visible = this.front.visible = any;
    // the swarm: 12 panels a stage
    const want = 12 * (next.dyson ?? 0);
    while (this.panels.length < want) {
      const i = this.panels.length;
      const sprite = new Sprite(panelTexture());
      sprite.anchor.set(0.5);
      this.swarmBack.addChild(sprite);
      this.panels.push({ sprite, orbit: i % 3, phase: (i * 2.399) % TAU });
    }
    while (this.panels.length > want) this.panels.pop()!.sprite.destroy();
  }

  private k(id: string): number {
    return this.stages[id] ?? 0;
  }

  /** The parts that only change with the stages or the star's size. */
  private draw(R: number): void {
    const g = this.still;
    g.clear();
    // Birch Planet: a vast banded disc far up and behind
    const birch = this.k('birch');
    if (birch) {
      const r = R * (0.7 + 0.28 * birch);
      const x = -R * 3.6;
      const y = -R * 2.5;
      g.circle(x, y, r * 1.18).fill({ color: col('birch'), alpha: 0.05 });
      g.circle(x, y, r).fill({ color: col('birch'), alpha: 0.14 }).stroke({ width: 3, color: col('birch'), alpha: 0.35 });
      for (let i = 1; i <= birch; i++) g.circle(x, y, r * (0.25 + i * 0.13)).stroke({ width: 2, color: 0xffffff, alpha: 0.1 });
      g.circle(x, y, r * 0.18).fill({ color: INK, alpha: 0.75 }).stroke({ width: 2, color: col('birch'), alpha: 0.6 });
    }
    // Stellar Engine: a curved mirror on struts to the left
    const se = this.k('stellarengine');
    if (se) {
      const cx = -R * 2.25;
      const r = R * (0.6 + 0.16 * se);
      for (const a of [-0.8, 0, 0.8]) {
        g.moveTo(cx + Math.cos(a) * r, Math.sin(a) * r)
          .lineTo(-R * 1.05, Math.sin(a) * R * 0.3)
          .stroke({ width: 3, color: INK, alpha: 0.55 });
      }
      g.arc(cx, 0, r, -1.15, 1.15).stroke({ width: 14, color: INK, alpha: 0.65 });
      g.arc(cx, 0, r, -1.15, 1.15).stroke({ width: 9, color: col('stellarengine'), alpha: 0.95 });
      g.arc(cx, 0, r - 4, -0.9, 0.2).stroke({ width: 3, color: 0xffffff, alpha: 0.5 });
    }
    // Ringworld: a broad band, the far half behind the star and the near half in front
    const rw = this.k('ringworld');
    for (const [gfx, from, to] of [
      [this.ringBack, Math.PI, TAU],
      [this.ringFront, 0, Math.PI],
    ] as const) {
      gfx.clear();
      if (!rw) continue;
      const rx = R * 2.75;
      const ry = rx * 0.2;
      const w = R * (0.06 + 0.035 * rw);
      const pts = (r1: number, r2: number) => {
        const out: number[] = [];
        const n = 48;
        for (let i = 0; i <= n; i++) {
          const a = from + ((to - from) * i) / n;
          out.push(Math.cos(a) * r1, Math.sin(a) * r1 * (ry / rx));
        }
        for (let i = n; i >= 0; i--) {
          const a = from + ((to - from) * i) / n;
          out.push(Math.cos(a) * r2, Math.sin(a) * r2 * (ry / rx) + w);
        }
        return out;
      };
      gfx.poly(pts(rx, rx)).fill({ color: col('ringworld'), alpha: from === 0 ? 0.95 : 0.7 }).stroke({ width: 3, color: INK, alpha: 0.7 });
      // land and seas painted on the inner face, more with each stage
      for (let i = 0; i < 6 + rw * 4; i++) {
        const a = from + ((to - from) * (i + 0.5)) / (6 + rw * 4);
        const x = Math.cos(a) * rx;
        const y = Math.sin(a) * ry + w * 0.5;
        gfx.ellipse(x, y, R * 0.07, w * 0.3).fill({ color: i % 3 === 0 ? 0x2b7fd0 : 0x5fd39b, alpha: 0.85 });
      }
      gfx.rotation = -0.2;
    }
    // Matrioshka Brain: nested shells with a lattice
    const sh = this.shells;
    sh.clear();
    for (let i = 0; i < this.k('matrioshka'); i++) {
      const r = R * (1.2 + 0.13 * i);
      sh.circle(0, 0, r).fill({ color: col('matrioshka'), alpha: 0.035 }).stroke({ width: 2.5, color: col('matrioshka'), alpha: 0.4 });
    }
  }

  /** Matrioshka lattice, Star Lifter jets, the Stellar Engine plume and the Ringworld ribs. */
  private drawMoving(R: number, t: number, m: Graphics, mf: Graphics): void {
    // Matrioshka lattice: meridians turning, nodes blinking
    const shells = this.k('matrioshka');
    for (let i = 0; i < shells; i++) {
      const r = R * (1.2 + 0.13 * i);
      for (let k = 0; k < 4; k++) {
        const a = t * (0.1 + i * 0.03) + (k * Math.PI) / 4;
        const w = Math.abs(Math.cos(a)) * r;
        m.ellipse(0, 0, Math.max(1, w), r).stroke({ width: 1.2, color: col('matrioshka'), alpha: 0.22 });
      }
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + t * 0.2 + i;
        const on = 0.5 + 0.5 * Math.sin(t * 3 + k * 1.7 + i);
        m.circle(Math.cos(a) * r, Math.sin(a) * r, 2.5).fill({ color: 0x7dff5a, alpha: 0.25 + 0.6 * on });
      }
    }
    // Star Lifter: jets from both poles with plasma flowing out
    const sl = this.k('starlifter');
    if (sl) {
      const base = R * 0.95;
      const len = R * (1.2 + 0.13 * sl);
      const w = 4 + 2 * sl;
      for (const dir of [-1, 1]) {
        const g = dir < 0 ? m : mf;
        // a tapering, fading jet in four pieces, plasma flowing out along it
        for (let k = 0; k < 4; k++) {
          const y1 = dir * (base + ((len - base) * k) / 4);
          const y2 = dir * (base + ((len - base) * (k + 1)) / 4);
          g.moveTo(0, y1).lineTo(0, y2).stroke({ width: w * (1 - k * 0.2) + 4, color: INK, alpha: 0.4 * (1 - k * 0.22) });
          g.moveTo(0, y1).lineTo(0, y2).stroke({ width: w * (1 - k * 0.2), color: col('starlifter'), alpha: 0.75 * (1 - k * 0.22) });
        }
        for (let k = 0; k < 6; k++) {
          const f = (t * 0.6 + k / 6) % 1;
          g.circle(Math.sin(t * 5 + k) * w * 0.25, dir * (base + (len - base) * f), w * (0.45 - f * 0.25)).fill({ color: 0xffffff, alpha: 0.85 * (1 - f) });
        }
        g.ellipse(0, dir * R * 1.02, R * 0.32, R * 0.07).stroke({ width: 4, color: INK, alpha: 0.6 });
        g.ellipse(0, dir * R * 1.02, R * 0.32, R * 0.07).stroke({ width: 2.5, color: col('starlifter'), alpha: 0.95 });
      }
    }
    // Stellar Engine: the thrust plume on the far side from the mirror
    const se = this.k('stellarengine');
    if (se) {
      for (let k = 0; k < 7; k++) {
        const f = (t * 0.5 + k / 7) % 1;
        const x = R * (1.1 + f * (1.2 + 0.25 * se));
        m.circle(x, Math.sin(t * 4 + k) * R * 0.05 * f, R * (0.12 - f * 0.08)).fill({ color: col('stellarengine'), alpha: 0.6 * (1 - f) });
      }
    }
    // Ringworld ribs travelling round the band
    const rw = this.k('ringworld');
    if (rw) {
      const rx = R * 2.75;
      const ry = rx * 0.2;
      const w = R * (0.06 + 0.035 * rw);
      const rot = -0.2;
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * TAU + t * 0.12;
        const x = Math.cos(a) * rx;
        const y = Math.sin(a) * ry;
        const g = Math.sin(a) > 0 ? mf : m;
        const x1 = x * c - y * s;
        const y1 = x * s + y * c;
        const x2 = x * c - (y + w) * s;
        const y2 = x * s + (y + w) * c;
        g.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: 2, color: INK, alpha: 0.55 });
      }
    }
  }

  update(dt: number, cx: number, cy: number, R: number, still: boolean): void {
    if (!this.root.visible) return;
    const key = `${Math.round(R / 3)}`;
    if (key !== this.drawnFor) {
      this.draw(R);
      this.drawnFor = key;
      this.movingDrawn = false;
    }
    this.root.position.set(cx, cy);
    this.front.position.set(cx, cy);
    if (!still) this.t += dt;
    const t = this.t;
    const m = this.moving;
    const mf = this.movingFront;
    // the shapes that move redraw at most 20 times a second (held still: once), the panels every frame
    this.movingAcc += dt;
    if (!this.movingDrawn || (!still && this.movingAcc >= 0.05)) {
      this.movingAcc = 0;
      this.movingDrawn = true;
      m.clear();
      mf.clear();
      this.drawMoving(R, t, m, mf);
    }
    // Dyson Swarm panels on three tilted orbits
    const tilts = [0.35, -0.5, 1.1];
    for (const p of this.panels) {
      const r = R * (1.5 + 0.12 * p.orbit);
      const a = p.phase + t * (0.14 + p.orbit * 0.05) * (p.orbit === 1 ? -1 : 1);
      const ex = Math.cos(a) * r;
      const ey = Math.sin(a) * r * 0.32;
      const tl = tilts[p.orbit]!;
      const x = ex * Math.cos(tl) - ey * Math.sin(tl);
      const y = ex * Math.sin(tl) + ey * Math.cos(tl);
      const front = Math.sin(a) > 0;
      const parent = front ? this.swarmFront : this.swarmBack;
      if (p.sprite.parent !== parent) parent.addChild(p.sprite);
      p.sprite.position.set(x, y);
      const size = Math.max(9, R * 0.11) / 32;
      p.sprite.scale.set(size * (front ? 1.1 : 0.8), size * (0.55 + 0.45 * Math.abs(Math.sin(a * 2 + p.phase))));
      p.sprite.alpha = front ? 1 : 0.7;
      p.sprite.rotation = tl;
    }
  }
}
