import { Container, Sprite } from 'pixi.js';
import { textures } from './textures';

/**
 * The one particle module (CLAUDE.md rule 14). A fixed pool of 400 sprites; bursts reuse the
 * oldest when the pool is full, so effects can never pile up and slow the game down.
 */
const MAX = 400;

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
}

const pool: Particle[] = [];
let layer: Container | null = null;
let cursor = 0;
let enabled = true;

export function initParticles(parent: Container): void {
  layer = new Container();
  parent.addChild(layer);
  const tex = textures().soft;
  for (let i = 0; i < MAX; i++) {
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5);
    sprite.blendMode = 'add';
    sprite.visible = false;
    layer.addChild(sprite);
    pool.push({ sprite, vx: 0, vy: 0, life: 0, decay: 1, size: 1 });
  }
}

/** Reduced motion turns bursts off entirely. */
export function setParticlesEnabled(on: boolean): void {
  enabled = on;
  if (!on) for (const p of pool) (p.life = 0), (p.sprite.visible = false);
}

/**
 * Throws `count` particles out from (x, y) in screen pixels.
 * `reach` is roughly how far they travel in pixels; `size` their diameter in pixels.
 */
export function burst(x: number, y: number, count: number, color: number, reach = 120, size = 10): void {
  if (!enabled || !layer) return;
  for (let i = 0; i < count; i++) {
    const p = pool[cursor]!;
    cursor = (cursor + 1) % MAX;
    const a = Math.random() * Math.PI * 2;
    const sp = reach * (0.6 + Math.random() * 1.6);
    p.vx = Math.cos(a) * sp;
    p.vy = Math.sin(a) * sp;
    p.life = 1;
    p.decay = 1.1 + Math.random() * 0.8;
    p.size = size * (0.5 + Math.random() * 0.9);
    p.sprite.position.set(x, y);
    p.sprite.tint = color;
    p.sprite.visible = true;
  }
}

export function updateParticles(dt: number): void {
  const drag = Math.max(0, 1 - dt * 2.4);
  for (const p of pool) {
    if (p.life <= 0) continue;
    p.life -= dt * p.decay;
    if (p.life <= 0) {
      p.sprite.visible = false;
      continue;
    }
    p.sprite.x += p.vx * dt;
    p.sprite.y += p.vy * dt;
    p.vx *= drag;
    p.vy *= drag;
    p.sprite.alpha = p.life;
    const s = (p.size * (0.4 + p.life * 0.6)) / 64;
    p.sprite.scale.set(s);
  }
}

export function liveParticles(): number {
  let n = 0;
  for (const p of pool) if (p.life > 0) n++;
  return n;
}
