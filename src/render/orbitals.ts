import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { ORBITALS, PLANET_TYPES } from '../content/early';

/**
 * Orbitals in the sky: faint ring ellipses around the star and the planets travelling along them.
 * Planets on the far side of a ring draw behind the star, like the Spark Motes.
 */
const textureCache = new Map<string, Texture>();

function planetTexture(type: string): Texture {
  let t = textureCache.get(type);
  if (t) return t;
  const def = PLANET_TYPES.find((p) => p.id === type) ?? PLANET_TYPES[0]!;
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const r = s * 0.38;
  ctx.save();
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
  ctx.fillStyle = def.color;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = def.band;
  if (type === 'gas') for (const y of [0.36, 0.52, 0.66]) ctx.fillRect(0, s * y, s, s * 0.07);
  else if (type === 'rocky') for (const [x, y, rr] of [[0.4, 0.42, 0.07], [0.6, 0.6, 0.05], [0.36, 0.64, 0.04]] as const) {
    ctx.beginPath();
    ctx.arc(s * x, s * y, s * rr, 0, Math.PI * 2);
    ctx.fill();
  }
  else if (type === 'lava') {
    ctx.lineWidth = s * 0.04;
    ctx.strokeStyle = '#FFC83D';
    ctx.beginPath();
    ctx.moveTo(s * 0.25, s * 0.45);
    ctx.lineTo(s * 0.5, s * 0.55);
    ctx.lineTo(s * 0.72, s * 0.42);
    ctx.stroke();
  } else if (type === 'crystal') {
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.3);
    ctx.lineTo(s * 0.62, s * 0.52);
    ctx.lineTo(s * 0.5, s * 0.72);
    ctx.lineTo(s * 0.38, s * 0.52);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(0, s * 0.62, s, s * 0.2);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
  ctx.lineWidth = s * 0.09;
  ctx.strokeStyle = '#140B2E';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(s * 0.41, s * 0.38, r * 0.36, r * 0.2, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();
  t = Texture.from(c);
  textureCache.set(type, t);
  return t;
}

interface PlanetSprite {
  ring: number;
  slot: number;
  level: number;
  back: Sprite;
  front: Sprite;
}

export class OrbitalsView {
  /** Drawn under the star (rings and far-side planets) and over it (near-side planets). */
  readonly behind = new Container();
  readonly infront = new Container();
  private readonly rings = new Graphics();
  private planets: PlanetSprite[] = [];
  private openRings = 0;
  private key = '';
  private time = 0;

  constructor() {
    this.behind.addChild(this.rings);
  }

  /** "ring.slot:type:level|..." from the snapshot, and how many rings are open. */
  set(planets: string, openRings: number): void {
    this.openRings = openRings;
    if (planets === this.key) return;
    this.key = planets;
    for (const p of this.planets) {
      p.back.destroy();
      p.front.destroy();
    }
    this.planets = planets
      .split('|')
      .filter(Boolean)
      .map((entry) => {
        const [at = '0.0', type = 'rocky', lv = '1'] = entry.split(':');
        const [ring = 0, slot = 0] = at.split('.').map(Number);
        const tex = planetTexture(type);
        const back = new Sprite(tex);
        const front = new Sprite(tex);
        back.anchor.set(0.5);
        front.anchor.set(0.5);
        this.behind.addChild(back);
        this.infront.addChild(front);
        return { ring, slot, level: Number(lv), back, front };
      });
  }

  update(dt: number, cx: number, cy: number, R: number, still: boolean): void {
    if (!still) this.time += dt;
    const rx = (k: number) => R * (2.15 + 0.34 * k);
    const tilt = 0.4;
    this.rings.clear();
    for (let k = 0; k < this.openRings; k++) {
      this.rings.ellipse(cx, cy, rx(k), rx(k) * tilt).stroke({ width: 2, color: 0xc9c2f2, alpha: 0.22 });
    }
    for (const p of this.planets) {
      const slots = ORBITALS.rings[p.ring]?.slots ?? 1;
      const open = p.ring < this.openRings;
      const a = (p.slot / slots) * Math.PI * 2 + this.time * (0.12 / (p.ring + 1));
      const x = cx + Math.cos(a) * rx(p.ring);
      const y = cy + Math.sin(a) * rx(p.ring) * tilt;
      const inFront = Math.sin(a) > 0;
      const size = (R * (0.2 + Math.min(p.level, 20) * 0.006)) / 48.6;
      p.back.visible = open && !inFront;
      p.front.visible = open && inFront;
      const sp = inFront ? p.front : p.back;
      sp.position.set(x, y);
      sp.scale.set(size * (inFront ? 1.05 : 0.9));
    }
  }
}
