import { Container, Sprite } from 'pixi.js';
import { textures } from './textures';

/**
 * The one particle module (CLAUDE.md rule 14). A pool is a fixed set of sprites; bursts reuse the
 * oldest when it is full, so effects can never pile up and slow the game down. The main stage uses
 * the shared pool (400); other canvases (the Belt field) make their own smaller pool here.
 */
interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  /** Streaks are stretched along their flight and keep their speed; bursts and motes slow down. */
  stretch: number;
  drag: boolean;
}

export class ParticlePool {
  private readonly pool: Particle[] = [];
  private cursor = 0;
  enabled = true;

  constructor(parent: Container, private readonly max: number) {
    const layer = new Container();
    parent.addChild(layer);
    const tex = textures().soft;
    for (let i = 0; i < max; i++) {
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5);
      sprite.blendMode = 'add';
      sprite.visible = false;
      layer.addChild(sprite);
      this.pool.push({ sprite, vx: 0, vy: 0, life: 0, decay: 1, size: 1, stretch: 1, drag: true });
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) for (const p of this.pool) (p.life = 0), (p.sprite.visible = false);
  }

  /** Throws `count` particles out from (x, y); `reach` is roughly how far they fly, `size` their diameter (px). */
  burst(x: number, y: number, count: number, color: number, reach = 120, size = 10): void {
    if (!this.enabled) return;
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.cursor]!;
      this.cursor = (this.cursor + 1) % this.max;
      const a = Math.random() * Math.PI * 2;
      const sp = reach * (0.6 + Math.random() * 1.6);
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.life = 1;
      p.decay = 1.1 + Math.random() * 0.8;
      p.size = size * (0.5 + Math.random() * 0.9);
      p.stretch = 1;
      p.drag = true;
      p.sprite.rotation = 0;
      p.sprite.position.set(x, y);
      p.sprite.tint = color;
      p.sprite.visible = true;
    }
  }

  /** One slow mote left behind (a cursor trail): it drifts a little and fades in about half a second. */
  mote(x: number, y: number, color: number, size = 9): void {
    if (!this.enabled) return;
    const p = this.pool[this.cursor]!;
    this.cursor = (this.cursor + 1) % this.max;
    const a = Math.random() * Math.PI * 2;
    p.vx = Math.cos(a) * 18;
    p.vy = Math.sin(a) * 18 + 12;
    p.life = 1;
    p.decay = 1.8 + Math.random() * 0.6;
    p.size = size * (0.7 + Math.random() * 0.6);
    p.stretch = 1;
    p.drag = true;
    p.sprite.rotation = 0;
    p.sprite.position.set(x, y);
    p.sprite.tint = color;
    p.sprite.visible = true;
  }

  /** A streak (a meteor, a gust of stellar wind): flies straight at (vx, vy) px/s, stretched `stretch` times along its path. */
  streak(x: number, y: number, vx: number, vy: number, color: number, size: number, stretch: number, decay: number): void {
    if (!this.enabled) return;
    const p = this.pool[this.cursor]!;
    this.cursor = (this.cursor + 1) % this.max;
    p.vx = vx;
    p.vy = vy;
    p.life = 1;
    p.decay = decay;
    p.size = size;
    p.stretch = stretch;
    p.drag = false;
    p.sprite.rotation = Math.atan2(vy, vx);
    p.sprite.position.set(x, y);
    p.sprite.tint = color;
    p.sprite.visible = true;
  }

  update(dt: number): void {
    const drag = Math.max(0, 1 - dt * 2.4);
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt * p.decay;
      if (p.life <= 0) {
        p.sprite.visible = false;
        continue;
      }
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      if (p.drag) {
        p.vx *= drag;
        p.vy *= drag;
      }
      p.sprite.alpha = p.life;
      const k = (p.size * (0.4 + p.life * 0.6)) / 64;
      p.sprite.scale.set(k * p.stretch, k);
    }
  }

  live(): number {
    let n = 0;
    for (const p of this.pool) if (p.life > 0) n++;
    return n;
  }
}

/** The main stage's shared pool. */
let main: ParticlePool | null = null;

export function initParticles(parent: Container): void {
  main = new ParticlePool(parent, 400);
}

/** Reduced motion turns bursts off entirely. */
export function setParticlesEnabled(on: boolean): void {
  main?.setEnabled(on);
}

export function burst(x: number, y: number, count: number, color: number, reach = 120, size = 10): void {
  main?.burst(x, y, count, color, reach, size);
}

/** A cursor-trail mote on the main stage. */
export function trailMote(x: number, y: number, color: number): void {
  main?.mote(x, y, color);
}

/** A weather streak on the main stage (meteors, stellar wind, a nebula storm). */
export function weatherStreak(x: number, y: number, vx: number, vy: number, color: number, size: number, stretch: number, decay: number): void {
  main?.streak(x, y, vx, vy, color, size, stretch, decay);
}

export function updateParticles(dt: number): void {
  main?.update(dt);
}

export function liveParticles(): number {
  return main?.live() ?? 0;
}
