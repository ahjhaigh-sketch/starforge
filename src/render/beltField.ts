import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { RARITIES } from '../content/belt';
import { MUTATIONS } from '../content/runeDepth';
import { ParticlePool } from './particles';

/**
 * The Asteroid Belt's harvest field: its own small PixiJS canvas inside the Belt panel. Asteroids
 * drift across slowly; the tractor-beam circle follows the pointer (or a dragging finger) and
 * harvests whatever it touches. Positions come from each asteroid's id, so they're stable without
 * being saved. Harvested ones vanish at once here and in the game state a moment later.
 */
const rockCache = new Map<number, Texture>();

function rockTexture(rarity: number): Texture {
  let t = rockCache.get(rarity);
  if (t) return t;
  const r = RARITIES[rarity]!;
  const s = 96;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  if (r.glow) {
    const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.2, s / 2, s / 2, s / 2);
    g.addColorStop(0, `${r.glow}cc`);
    g.addColorStop(1, `${r.glow}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }
  // a lumpy rock: a circle with a wobbling edge
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rr = s * 0.27 * (1 + 0.12 * Math.sin(i * 2.7 + rarity));
    const x = s / 2 + Math.cos(a) * rr;
    const y = s / 2 + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = r.color;
  ctx.fill();
  ctx.lineWidth = s * 0.06;
  ctx.strokeStyle = '#140B2E';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = 'rgba(20,11,46,0.25)';
  for (const [x, y, rr] of [
    [0.42, 0.45, 0.05],
    [0.58, 0.58, 0.04],
  ] as const) {
    ctx.beginPath();
    ctx.arc(s * x, s * y, s * rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(s * 0.42, s * 0.36, s * 0.08, s * 0.04, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
  t = Texture.from(c);
  rockCache.set(rarity, t);
  return t;
}

const hash = (n: number, k: number) => {
  const v = Math.sin(n * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/** Distance from (x, y) to the segment a-b: the beam sweeps a capsule, not just a circle. */
function segmentDistance(x: number, y: number, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2)) : 0;
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
}

interface Rock {
  id: number;
  rarity: number;
  /** 0 for none, else 1 (Golden) to 4 (Prismatic). */
  mut: number;
  sprite: Sprite;
  age: number;
}

export class BeltField {
  private app: Application | null = null;
  private rocks = new Map<number, Rock>();
  private layer = new Container();
  private beam = new Graphics();
  private particles: ParticlePool | null = null;
  private pointer: { x: number; y: number } | null = null;
  /** Where the beam was last frame: a quick flick sweeps everything along the way. */
  private last: { x: number; y: number } | null = null;
  private time = 0;
  private gone = new Set<number>();
  radius = 48;
  still = false;
  onHarvest: (ids: number[]) => void = () => {};

  async mount(canvas: HTMLCanvasElement, width: number, height: number): Promise<boolean> {
    try {
      this.app = new Application();
      await this.app.init({ canvas, width, height, backgroundAlpha: 0, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl' });
    } catch {
      this.app = null;
      return false;
    }
    this.app.stage.addChild(this.layer, this.beam);
    this.particles = new ParticlePool(this.app.stage, 160);
    this.app.ticker.add((t) => this.frame(t.deltaMS / 1000));
    return true;
  }

  resize(width: number, height: number): void {
    this.app?.renderer.resize(width, height);
  }

  /** The asteroids the game state holds: "id:rarity|..." or "id:rarity:mutation". */
  setField(field: string): void {
    if (!this.app) return;
    const seen = new Set<number>();
    for (const part of field.split('|')) {
      if (!part) continue;
      const [idS, rS, mS] = part.split(':');
      const id = Number(idS);
      seen.add(id);
      if (this.rocks.has(id) || this.gone.has(id)) continue;
      const rarity = Number(rS);
      const mut = Number(mS ?? 0) || 0;
      const sprite = new Sprite(rockTexture(rarity));
      sprite.anchor.set(0.5);
      // a mutated asteroid wears a ring in its mutation's colour
      const m = MUTATIONS[mut - 1];
      if (m) {
        const ring = new Graphics();
        const rr = sprite.texture.width * 0.47;
        ring.circle(0, 0, rr).stroke({ width: 7, color: 0x140b2e });
        ring.circle(0, 0, rr).stroke({ width: 4, color: parseInt(m.color.slice(1), 16) });
        sprite.addChild(ring);
      }
      sprite.scale.set(0);
      this.layer.addChild(sprite);
      this.rocks.set(id, { id, rarity, mut, sprite, age: 0 });
    }
    for (const [id, rock] of this.rocks) {
      if (!seen.has(id)) {
        rock.sprite.destroy({ children: true });
        this.rocks.delete(id);
      }
    }
    // forget ids the game has also dropped
    for (const id of this.gone) if (!seen.has(id)) this.gone.delete(id);
  }

  /** Reduced motion: asteroids hold still and harvests make no particles. */
  setReducedMotion(on: boolean): void {
    this.still = on;
    this.particles?.setEnabled(!on);
  }

  setPointer(p: { x: number; y: number } | null): void {
    this.pointer = p;
    if (!p) this.last = null;
  }

  private place(rock: Rock, w: number, h: number): void {
    const speed = this.still ? 0 : 6 + hash(rock.id, 3) * 10;
    const x = (hash(rock.id, 1) * (w + 80) + this.time * speed) % (w + 80) - 40;
    const y = 30 + hash(rock.id, 2) * (h - 60) + (this.still ? 0 : Math.sin(this.time * 0.6 + rock.id) * 6);
    rock.sprite.position.set(x, y);
    rock.sprite.rotation = this.still ? 0 : this.time * (hash(rock.id, 4) - 0.5) * 0.6;
  }

  private frame(dt: number): void {
    if (!this.app) return;
    if (!this.still) this.time += dt;
    const { width: w, height: h } = this.app.screen;
    const hit: number[] = [];
    const p = this.pointer;
    const r = this.radius;
    for (const rock of this.rocks.values()) {
      rock.age += dt;
      const target = 0.62 + RARITIES[rock.rarity]!.mult ** 0.08 * 0.12;
      rock.sprite.scale.set(Math.min(target, (rock.age / 0.25) * target));
      this.place(rock, w, h);
      if (p && segmentDistance(rock.sprite.x, rock.sprite.y, this.last ?? p, p) < r + 18) hit.push(rock.id);
    }
    this.last = p ? { x: p.x, y: p.y } : null;
    if (hit.length) {
      for (const id of hit) {
        const rock = this.rocks.get(id)!;
        const color = parseInt((MUTATIONS[rock.mut - 1]?.color ?? (RARITIES[rock.rarity]!.glow || '#C9C2F2')).slice(1), 16);
        this.particles?.burst(rock.sprite.x, rock.sprite.y, rock.rarity > 0 ? 18 : 7, color, 60, 9);
        rock.sprite.destroy({ children: true });
        this.rocks.delete(id);
        this.gone.add(id);
      }
      this.onHarvest(hit);
    }
    this.beam.clear();
    if (p) {
      this.beam.circle(p.x, p.y, r).fill({ color: 0x2ee6ff, alpha: 0.12 }).stroke({ width: 3, color: 0x2ee6ff, alpha: 0.8 });
    }
    this.particles?.update(dt);
  }

  destroy(): void {
    this.app?.destroy(false, { children: true });
    this.app = null;
    this.rocks.clear();
  }
}
