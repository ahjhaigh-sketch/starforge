import { Container, Sprite, Texture } from 'pixi.js';

/**
 * The team's Void Wyrms swimming across the sky: each a chain of round segments behind a head that
 * wanders the screen, and the lead Wyrm darts for a comet while one is flying. Segments sit at even
 * distances along the head's recent path, so the body follows every turn at any frame rate.
 * Sprites only (no per-frame drawing): 6 Wyrms are about 90 sprites.
 */
const SEGMENTS = 14;
const SPACING = 7;
const INK = '#140B2E';

function ballTexture(eyes: boolean): Texture {
  const s = 48;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = s * 0.08;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // a soft shade on the lower side, so the body reads as round
  const g = ctx.createRadialGradient(s * 0.4, s * 0.35, s * 0.05, s / 2, s / 2, s * 0.42);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(20,11,46,0.35)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.37, 0, Math.PI * 2);
  ctx.fill();
  if (eyes) {
    for (const dy of [-0.13, 0.13]) {
      ctx.beginPath();
      ctx.arc(s * 0.66, s * (0.5 + dy), s * 0.075, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
    }
  }
  return Texture.from(c);
}

let bodyTex: Texture | null = null;
let headTex: Texture | null = null;

interface Serpent {
  segs: Sprite[];
  /** Head path, newest first, points about 3 px apart. */
  path: Array<{ x: number; y: number }>;
  head: { x: number; y: number };
  phase: number;
  color: number;
  rainbow: boolean;
  size: number;
}

const hsv = (h: number) => {
  const f = (n: number) => {
    const k = (n + h * 6) % 6;
    return Math.round(255 * (1 - Math.max(0, Math.min(k, 4 - k, 1)) * 0.75));
  };
  return (f(5) << 16) | (f(3) << 8) | f(1);
};

export class WyrmSky {
  readonly root = new Container();
  private serpents: Serpent[] = [];
  private key = '';
  private t = 0;

  /** The team as "colour:rank:form|..." from the snapshot. */
  set(sky: string, w: number, h: number): void {
    if (sky === this.key) return;
    this.key = sky;
    for (const sp of this.serpents) for (const seg of sp.segs) seg.destroy();
    this.serpents = [];
    if (!sky) return;
    bodyTex ??= ballTexture(false);
    headTex ??= ballTexture(true);
    sky.split('|').forEach((part, i) => {
      const [color = '#FFFFFF', rankS = '0', formS = '0'] = part.split(':');
      const rank = Number(rankS) || 0;
      const form = Number(formS) || 0;
      const size = 9 * (1 + rank * 0.03) * (form === 2 ? 1.3 : form === 1 ? 1.15 : 1);
      const segs: Sprite[] = [];
      for (let k = SEGMENTS - 1; k >= 0; k--) {
        const seg = new Sprite(k === 0 ? headTex! : bodyTex!);
        seg.anchor.set(0.5);
        const taper = 1 - (k / SEGMENTS) * 0.55;
        seg.scale.set(((size * 2) / 48) * taper);
        seg.tint = parseInt(color.slice(1), 16);
        this.root.addChild(seg);
        segs.unshift(seg);
      }
      const start = { x: ((i + 1) / 7) * w, y: h * (0.25 + 0.1 * (i % 3)) };
      this.serpents.push({ segs, path: [start], head: { ...start }, phase: i * 1.7, color: parseInt(color.slice(1), 16), rainbow: form === 2, size });
    });
  }

  /** `comet`: where the comet is on screen, if one is flying. */
  update(dt: number, w: number, h: number, still: boolean, comet: { x: number; y: number } | null): void {
    if (this.serpents.length === 0) return;
    if (!still) this.t += dt;
    this.serpents.forEach((sp, i) => {
      if (!still) {
        // wander: chase a point drifting on a slow figure-of-eight; the lead Wyrm goes for a comet
        const chase = i === 0 && comet;
        const tx = chase ? comet.x : w * (0.5 + 0.42 * Math.sin(this.t * 0.11 + sp.phase));
        const ty = chase ? comet.y : h * (0.45 + 0.32 * Math.sin(this.t * 0.17 + sp.phase * 1.3));
        const dx = tx - sp.head.x;
        const dy = ty - sp.head.y;
        const d = Math.hypot(dx, dy) || 1;
        const v = (chase ? 320 : 90) * Math.min(1, d / 40);
        sp.head.x += (dx / d) * v * dt;
        sp.head.y += (dy / d) * v * dt;
        const last = sp.path[0]!;
        if (Math.hypot(sp.head.x - last.x, sp.head.y - last.y) >= 3) sp.path.unshift({ x: sp.head.x, y: sp.head.y });
        if (sp.path.length > (SEGMENTS * SPACING) / 3 + 4) sp.path.length = Math.ceil((SEGMENTS * SPACING) / 3 + 4);
      }
      // lay the segments along the path at even distances from the head
      let seg = 0;
      let walked = 0;
      let prev = sp.head;
      sp.segs[0]!.position.set(sp.head.x, sp.head.y);
      const next = sp.path[1] ?? sp.path[0]!;
      sp.segs[0]!.rotation = Math.atan2(sp.head.y - next.y, sp.head.x - next.x);
      for (const p of sp.path) {
        walked += Math.hypot(p.x - prev.x, p.y - prev.y);
        prev = p;
        while (seg + 1 < SEGMENTS && walked >= (seg + 1) * SPACING * (sp.size / 9)) {
          seg++;
          sp.segs[seg]!.position.set(p.x, p.y);
        }
      }
      for (let k = seg + 1; k < SEGMENTS; k++) sp.segs[k]!.position.copyFrom(sp.segs[seg]!.position);
      if (sp.rainbow && !still) sp.segs.forEach((s, k) => (s.tint = hsv((this.t * 0.25 + k * 0.04) % 1)));
    });
  }

  /** How many Wyrms are swimming (tests and the dev panel). */
  get count(): number {
    return this.serpents.length;
  }
}
