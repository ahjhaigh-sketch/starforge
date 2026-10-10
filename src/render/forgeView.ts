import { Application, Graphics } from 'pixi.js';
import { events } from '../engine/events';
import { GRADE_BY_ID } from '../content/forge';
import { ParticlePool } from './particles';

/**
 * The Starforge's furnace line, drawn in its own small PixiJS canvas: a hopper holding the chosen
 * grade's ore, the Mag-Belt carrying chunks into the Stellar Furnace, and ingots sliding out onto a
 * stack when a batch finishes. The engine decides everything; this only shows it.
 */
const INK = 0x140b2e;
const hex = (c: string) => parseInt(c.slice(1), 16);

export interface ForgeViewState {
  on: boolean;
  busy: number;
  color: string;
  /** 0..1: how full the hopper looks. */
  fill: number;
  /** Seconds per batch: sets the belt speed. */
  seconds: number;
}

interface Ingot {
  color: number;
  t: number;
}

export class ForgeView {
  private app: Application | null = null;
  private g = new Graphics();
  private particles: ParticlePool | null = null;
  private state: ForgeViewState = { on: false, busy: 0, color: '#8C97C2', fill: 0, seconds: 10 };
  private beltOffset = 0;
  private time = 0;
  private flying: Ingot[] = [];
  private stack: number[] = [];
  private off: (() => void) | null = null;
  still = false;

  async mount(canvas: HTMLCanvasElement, width: number, height: number): Promise<boolean> {
    try {
      this.app = new Application();
      await this.app.init({ canvas, width, height, backgroundAlpha: 0, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl' });
    } catch {
      this.app = null;
      return false;
    }
    this.app.stage.addChild(this.g);
    this.particles = new ParticlePool(this.app.stage, 80);
    this.app.ticker.add((t) => this.frame(t.deltaMS / 1000));
    this.off = events.on((e) => {
      if (e.t !== 'smelt') return;
      const c = hex(GRADE_BY_ID.get(e.grade)?.color ?? '#8C97C2');
      if (this.still) this.land(c);
      else this.flying.push({ color: c, t: 0 });
    });
    return true;
  }

  resize(width: number, height: number): void {
    this.app?.renderer.resize(width, height);
  }

  setState(st: ForgeViewState): void {
    this.state = st;
  }

  setReducedMotion(on: boolean): void {
    this.still = on;
    this.particles?.setEnabled(!on);
  }

  private land(color: number): void {
    this.stack.push(color);
    if (this.stack.length > 8) this.stack.shift();
  }

  private frame(dt: number): void {
    if (!this.app) return;
    const { width: w, height: h } = this.app.screen;
    const st = this.state;
    const running = st.busy > 0;
    if (!this.still) this.time += dt;
    // the belt moves one chunk-gap per batch, a little faster so it reads as moving
    const gap = 34;
    if (running && !this.still) this.beltOffset = (this.beltOffset + dt * Math.max(18, (gap * 4) / st.seconds)) % gap;
    const g = this.g;
    g.clear();
    const ore = hex(st.color);

    // Mag-Belt
    const bx0 = w * 0.12;
    const bx1 = w * 0.64;
    const by = h * 0.74;
    const bh = Math.max(12, h * 0.1);
    g.roundRect(bx0, by - bh / 2, bx1 - bx0, bh, bh / 2).fill({ color: 0x2b2558 }).stroke({ width: 3, color: INK });
    for (let x = bx0 + bh / 2 - gap + this.beltOffset; x < bx1 - bh / 2; x += gap / 2) {
      if (x < bx0 + bh / 2) continue;
      g.moveTo(x, by - bh / 2 + 3).lineTo(x - 5, by + bh / 2 - 3).stroke({ width: 2, color: 0x4c3bc4, alpha: 0.7 });
    }
    // ore chunks riding the belt
    if (running) {
      for (let x = bx0 + gap + this.beltOffset; x < bx1 - gap * 0.6; x += gap) {
        const r = Math.min(gap * 0.36, bh * 0.85);
        const y = by - bh / 2 - r * 0.55;
        g.poly([x - r, y, x - r * 0.4, y - r, x + r * 0.6, y - r * 0.8, x + r, y + r * 0.1, x + r * 0.3, y + r, x - r * 0.7, y + r * 0.8])
          .fill({ color: ore })
          .stroke({ width: 2, color: INK, join: 'round' });
      }
    }

    // hopper
    const hx0 = w * 0.03;
    const hx1 = w * 0.23;
    const ht = h * 0.12;
    const hb = h * 0.6;
    g.poly([hx0, ht, hx1, ht, hx1 - (hx1 - hx0) * 0.28, hb, hx0 + (hx1 - hx0) * 0.28, hb]).fill({ color: 0x3a3466 }).stroke({ width: 3, color: INK, join: 'round' });
    if (st.fill > 0) {
      const top = hb - (hb - ht - 8) * Math.min(1, st.fill);
      const inset = ((hb - top) / (hb - ht)) * (hx1 - hx0) * 0.28;
      g.poly([hx0 + (hx1 - hx0) * 0.28 - inset + 4, top, hx1 - (hx1 - hx0) * 0.28 + inset - 4, top, hx1 - (hx1 - hx0) * 0.28 - 2, hb - 3, hx0 + (hx1 - hx0) * 0.28 + 2, hb - 3]).fill({ color: ore, alpha: 0.9 });
      for (let i = 0; i < 5; i++) g.circle(hx0 + (hx1 - hx0) * (0.3 + 0.1 * i), top + 4 + (i % 2) * 3, 3).fill({ color: 0xffffff, alpha: 0.35 });
    }
    g.rect(hx0 + (hx1 - hx0) * 0.38, hb, (hx1 - hx0) * 0.24, by - bh / 2 - hb).fill({ color: 0x3a3466 }).stroke({ width: 3, color: INK });

    // furnace
    const fx0 = w * 0.6;
    const fx1 = w * 0.82;
    const ft = h * 0.14;
    const fb = h * 0.94;
    g.roundRect(fx0, ft, fx1 - fx0, fb - ft, 14).fill({ color: 0x4a3f7a }).stroke({ width: 3, color: INK });
    g.roundRect(fx0 + 6, ft + 6, fx1 - fx0 - 12, (fb - ft) * 0.18, 8).fill({ color: 0xffffff, alpha: 0.12 });
    const flicker = running ? 0.75 + (this.still ? 0 : 0.25 * Math.sin(this.time * 9) * Math.sin(this.time * 3.3)) : 0.15;
    const mx = (fx0 + fx1) / 2;
    const my = by - bh * 0.2;
    const mw = (fx1 - fx0) * 0.62;
    const mh = (fb - ft) * 0.42;
    g.roundRect(mx - mw / 2, my - mh / 2, mw, mh, 10).fill({ color: 0x140b2e });
    g.roundRect(mx - mw / 2 + 4, my - mh / 2 + 4, mw - 8, mh - 8, 8).fill({ color: running ? 0xff7a2e : 0x3a3466, alpha: flicker });
    if (running) g.roundRect(mx - mw / 4, my - mh / 4, mw / 2, mh / 2, 6).fill({ color: 0xffd25e, alpha: flicker * 0.9 });
    // chimney
    g.rect(fx1 - (fx1 - fx0) * 0.3, ft - h * 0.1, (fx1 - fx0) * 0.18, h * 0.1 + 4).fill({ color: 0x4a3f7a }).stroke({ width: 3, color: INK });

    // ingot stack
    const sx = w * 0.9;
    const iw = Math.min(46, w * 0.09);
    const ih = iw * 0.42;
    this.stack.forEach((c, i) => {
      const y = fb - ih * (i + 1) - 2;
      const x = sx + (i % 2 ? 3 : -3);
      this.ingot(g, x, y, iw, ih, c);
    });
    // ingots flying from the furnace mouth to the stack
    this.flying = this.flying.filter((ing) => {
      ing.t += dt * 1.6;
      if (ing.t >= 1) {
        this.land(ing.color);
        this.particles?.burst(sx, fb - ih * this.stack.length, 10, ing.color, 40, 7);
        return false;
      }
      const x0 = mx + mw / 2;
      const y0 = my;
      const x1 = sx;
      const y1 = fb - ih * (this.stack.length + 1) - 2;
      const k = ing.t;
      this.ingot(g, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * h * 0.25, iw, ih, ing.color);
      return true;
    });
    this.particles?.update(dt);
  }

  private ingot(g: Graphics, x: number, y: number, w: number, h: number, color: number): void {
    g.poly([x - w * 0.36, y, x + w * 0.36, y, x + w / 2, y + h, x - w / 2, y + h]).fill({ color }).stroke({ width: 2, color: INK, join: 'round' });
    g.moveTo(x - w * 0.22, y + h * 0.3).lineTo(x + w * 0.1, y + h * 0.3).stroke({ width: 2, color: 0xffffff, alpha: 0.6 });
  }

  destroy(): void {
    this.off?.();
    this.off = null;
    this.app?.destroy(false, { children: true });
    this.app = null;
  }
}
