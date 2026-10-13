import { Container, Sprite, Texture } from 'pixi.js';

/**
 * The team's Void Wyrms flying across the sky. 1.3.0 (the playtest: "they just look like a bunch of
 * dots in a row"): each is a small dragon. A horned head with a glowing eye, two membrane wings
 * that beat, a body of overlapping scaled plates with a spine ridge and a pale belly, tapering to a
 * spade at the tail. The head wanders the screen and the lead Wyrm darts for a comet; the body
 * follows the head's recent path at even distances, so it follows every turn at any frame rate.
 * All pictures are painted once in light greys and tinted with the species' colour (the eyes stay
 * gold). Sprites only, no per-frame drawing.
 */
const SEGMENTS = 13;
const SPACING = 7;
const INK = '#140B2E';
const TAU = Math.PI * 2;

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

/** Overlapping scale rows across a shape already on the canvas (source-atop keeps them inside). */
function scales(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, r: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.lineWidth = Math.max(1, r * 0.22);
  ctx.strokeStyle = 'rgba(20,11,46,0.28)';
  for (let row = 0, y = y0; y < y0 + h + r; row++, y += r * 0.8) {
    for (let x = x0 - (row % 2 ? r : 0); x < x0 + w + r; x += r * 2) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** One body plate, facing right: an oval with shading, scales, a pale belly and a spine spike. */
function plateTexture(): Texture {
  const [c, ctx] = canvas(64, 64);
  // the spine spike on top
  ctx.beginPath();
  ctx.moveTo(22, 20);
  ctx.lineTo(30, 4);
  ctx.lineTo(40, 20);
  ctx.closePath();
  ctx.fillStyle = '#D8D2F0';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(32, 34, 24, 17, 0, 0, TAU);
  const g = ctx.createLinearGradient(0, 16, 0, 52);
  g.addColorStop(0, '#FFFFFF');
  g.addColorStop(0.55, '#D9D4EE');
  g.addColorStop(1, '#8F86B8');
  ctx.fillStyle = g;
  ctx.fill();
  scales(ctx, 8, 18, 48, 22, 5);
  // the pale belly band
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(255,250,235,0.75)';
  ctx.fillRect(0, 42, 64, 12);
  ctx.strokeStyle = 'rgba(20,11,46,0.25)';
  ctx.lineWidth = 1.5;
  for (let x = 12; x < 56; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 43);
    ctx.lineTo(x, 52);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(32, 34, 24, 17, 0, 0, TAU);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // a gloss on the back
  ctx.beginPath();
  ctx.ellipse(28, 25, 10, 3.5, -0.15, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
  return Texture.from(c);
}

/** The head, facing right: snout, jaw, swept-back horns, a brow ridge, a nostril and frills. */
function headTexture(): Texture {
  const [c, ctx] = canvas(96, 72);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // horns, behind the head
  for (const [y, len] of [
    [22, 30],
    [30, 24],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.quadraticCurveTo(22, y - 16, 40 - len, y - 20);
    ctx.quadraticCurveTo(28, y - 6, 46, y + 6);
    ctx.closePath();
    ctx.fillStyle = '#EDE6CF';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  // frill fins at the back of the jaw
  ctx.beginPath();
  ctx.moveTo(30, 40);
  ctx.lineTo(14, 36);
  ctx.lineTo(22, 46);
  ctx.lineTo(10, 52);
  ctx.lineTo(30, 54);
  ctx.closePath();
  ctx.fillStyle = '#C9C2E4';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // the head: a skull that runs out into a long snout
  const head = new Path2D();
  head.moveTo(26, 38);
  head.bezierCurveTo(26, 18, 48, 14, 62, 22);
  head.bezierCurveTo(74, 26, 86, 28, 90, 34);
  head.bezierCurveTo(92, 38, 88, 42, 82, 43);
  head.lineTo(60, 46);
  head.bezierCurveTo(70, 50, 76, 54, 70, 58);
  head.bezierCurveTo(56, 62, 34, 60, 26, 38);
  head.closePath();
  const g = ctx.createLinearGradient(0, 16, 0, 60);
  g.addColorStop(0, '#FFFFFF');
  g.addColorStop(0.6, '#D6D0EC');
  g.addColorStop(1, '#8F86B8');
  ctx.fillStyle = g;
  ctx.fill(head);
  ctx.save();
  ctx.clip(head);
  scales(ctx, 26, 16, 40, 30, 4);
  // the pale underjaw
  ctx.fillStyle = 'rgba(255,250,235,0.7)';
  ctx.fillRect(30, 48, 50, 14);
  ctx.restore();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = INK;
  ctx.stroke(head);
  // the mouth line
  ctx.beginPath();
  ctx.moveTo(84, 42);
  ctx.quadraticCurveTo(70, 46, 58, 46);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // teeth
  ctx.fillStyle = '#FFFFFF';
  for (const x of [66, 74]) {
    ctx.beginPath();
    ctx.moveTo(x, 45);
    ctx.lineTo(x + 2.5, 50);
    ctx.lineTo(x + 5, 45);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // brow ridge, nostril, gloss
  ctx.beginPath();
  ctx.moveTo(46, 26);
  ctx.quadraticCurveTo(54, 22, 62, 27);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(84, 33, 2.4, 1.6, -0.3, 0, TAU);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(56, 21, 9, 2.6, -0.1, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();
  return Texture.from(c);
}

/** The eye, painted apart so it keeps its own gold whatever the species' colour. */
function eyeTexture(): Texture {
  const [c, ctx] = canvas(24, 24);
  const g = ctx.createRadialGradient(12, 12, 1, 12, 12, 10);
  g.addColorStop(0, '#FFF6B0');
  g.addColorStop(0.6, '#FFC83D');
  g.addColorStop(1, '#FF7A2E');
  ctx.beginPath();
  ctx.ellipse(12, 12, 9, 7, 0, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(13, 12, 2, 5.5, 0, 0, TAU);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(9.5, 9.5, 1.8, 0, TAU);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  return Texture.from(c);
}

/** One wing, rooted at the left middle and spreading up and back: bones and a membrane. */
function wingTexture(): Texture {
  const [c, ctx] = canvas(96, 80);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const root = { x: 70, y: 74 };
  const tips = [
    { x: 6, y: 8 },
    { x: 24, y: 4 },
    { x: 46, y: 2 },
    { x: 66, y: 10 },
  ];
  // the membrane between the fingers, scalloped at the trailing edge
  ctx.beginPath();
  ctx.moveTo(root.x, root.y);
  ctx.lineTo(tips[0]!.x, tips[0]!.y);
  for (let i = 1; i < tips.length; i++) {
    const a = tips[i - 1]!;
    const b = tips[i]!;
    ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 16, b.x, b.y);
  }
  ctx.lineTo(root.x + 8, root.y - 10);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 70, 74);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(1, 'rgba(160,150,200,0.95)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // fine veins
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(20,11,46,0.3)';
  for (let i = 0; i < tips.length - 1; i++) {
    const a = tips[i]!;
    const b = tips[i + 1]!;
    ctx.beginPath();
    ctx.moveTo(root.x, root.y);
    ctx.lineTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 10);
    ctx.stroke();
  }
  // the finger bones
  for (const t of tips) {
    ctx.beginPath();
    ctx.moveTo(root.x, root.y);
    ctx.lineTo(t.x, t.y);
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#EDE6CF';
    ctx.stroke();
  }
  return Texture.from(c);
}

/** The spade at the tip of the tail, pointing left. */
function tailTexture(): Texture {
  const [c, ctx] = canvas(48, 40);
  ctx.beginPath();
  ctx.moveTo(44, 20);
  ctx.quadraticCurveTo(26, 4, 6, 8);
  ctx.lineTo(16, 20);
  ctx.lineTo(6, 32);
  ctx.quadraticCurveTo(26, 36, 44, 20);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 6, 0, 34);
  g.addColorStop(0, '#FFFFFF');
  g.addColorStop(1, '#9E96C4');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.stroke();
  return Texture.from(c);
}

let tex: { plate: Texture; head: Texture; eye: Texture; wing: Texture; tail: Texture } | null = null;
const textures = () => (tex ??= { plate: plateTexture(), head: headTexture(), eye: eyeTexture(), wing: wingTexture(), tail: tailTexture() });

interface Serpent {
  /** Plates from the neck to the tail (index 0 is just behind the head). */
  plates: Sprite[];
  head: Container;
  headSprite: Sprite;
  wings: [Sprite, Sprite];
  tail: Sprite;
  /** Head path, newest first, points about 3 px apart. */
  path: Array<{ x: number; y: number }>;
  pos: { x: number; y: number };
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

/** A shade darker of a colour (for the wings). */
const darker = (c: number, k = 0.78) => ((Math.round(((c >> 16) & 255) * k) << 16) | (Math.round(((c >> 8) & 255) * k) << 8) | Math.round((c & 255) * k)) >>> 0;

export class WyrmSky {
  readonly root = new Container();
  private serpents: Serpent[] = [];
  private key = '';
  private t = 0;

  /** The team as "colour:rank:form|..." from the snapshot. */
  set(sky: string, w: number, h: number): void {
    if (sky === this.key) return;
    this.key = sky;
    for (const sp of this.serpents) {
      for (const p of sp.plates) p.destroy();
      sp.head.destroy({ children: true });
      sp.wings.forEach((x) => x.destroy());
      sp.tail.destroy();
    }
    this.serpents = [];
    if (!sky) return;
    const T = textures();
    sky.split('|').forEach((part, i) => {
      const [color = '#FFFFFF', rankS = '0', formS = '0'] = part.split(':');
      const rank = Number(rankS) || 0;
      const form = Number(formS) || 0;
      const size = 13 * (1 + rank * 0.03) * (form === 2 ? 1.3 : form === 1 ? 1.15 : 1);
      const tint = parseInt(color.slice(1), 16);
      const holder = new Container();
      this.root.addChild(holder);
      const tail = new Sprite(T.tail);
      tail.anchor.set(0.9, 0.5);
      tail.tint = tint;
      holder.addChild(tail);
      const plates: Sprite[] = [];
      // the tail end is added first so the plates overlap towards the head
      for (let k = SEGMENTS - 1; k >= 0; k--) {
        const p = new Sprite(T.plate);
        p.anchor.set(0.5, 0.53);
        const taper = 1 - (k / SEGMENTS) * 0.62;
        p.scale.set(((size * 2.1) / 64) * taper);
        p.tint = tint;
        holder.addChild(p);
        plates.unshift(p);
      }
      const wings: [Sprite, Sprite] = [new Sprite(T.wing), new Sprite(T.wing)];
      for (const wg of wings) {
        wg.anchor.set(70 / 96, 74 / 80);
        wg.tint = darker(tint);
        holder.addChild(wg);
      }
      const head = new Container();
      const headSprite = new Sprite(T.head);
      headSprite.anchor.set(30 / 96, 40 / 72);
      headSprite.tint = tint;
      const eye = new Sprite(T.eye);
      eye.anchor.set(0.5);
      eye.position.set(52 - 30, 30 - 40);
      head.addChild(headSprite, eye);
      head.scale.set((size * 2.6) / 72);
      holder.addChild(head);
      const start = { x: ((i + 1) / 7) * w, y: h * (0.25 + 0.1 * (i % 3)) };
      this.serpents.push({ plates, head, headSprite, wings, tail, path: [start], pos: { ...start }, phase: i * 1.7, color: tint, rainbow: form === 2, size });
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
        const dx = tx - sp.pos.x;
        const dy = ty - sp.pos.y;
        const d = Math.hypot(dx, dy) || 1;
        const v = (chase ? 320 : 90) * Math.min(1, d / 40);
        sp.pos.x += (dx / d) * v * dt;
        // a gentle up-and-down as it flies
        sp.pos.y += (dy / d) * v * dt + Math.sin(this.t * 3 + sp.phase) * 6 * dt;
        const last = sp.path[0]!;
        if (Math.hypot(sp.pos.x - last.x, sp.pos.y - last.y) >= 3) sp.path.unshift({ x: sp.pos.x, y: sp.pos.y });
        const keep = Math.ceil((SEGMENTS * SPACING * (sp.size / 9)) / 3 + 8);
        if (sp.path.length > keep) sp.path.length = keep;
      }
      // the body: plates at even distances along the path behind the head
      const spacing = SPACING * (sp.size / 9);
      const pts: Array<{ x: number; y: number }> = [];
      let walked = 0;
      let prev = sp.pos;
      // plates sit closer as they taper towards the tail, so the body stays one piece
    const taperAt = (k: number) => Math.max(0.45, 1 - (k / SEGMENTS) * 0.62);
    let want = spacing;
      for (const p of sp.path) {
        const step = Math.hypot(p.x - prev.x, p.y - prev.y);
        while (step > 0 && walked + step >= want && pts.length < SEGMENTS + 1) {
          const f = (want - walked) / step;
          pts.push({ x: prev.x + (p.x - prev.x) * f, y: prev.y + (p.y - prev.y) * f });
          want += spacing * taperAt(pts.length);
        }
        walked += step;
        prev = p;
      }
      while (pts.length < SEGMENTS + 1) pts.push(pts[pts.length - 1] ?? { ...sp.pos });
      const angle = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.atan2(a.y - b.y, a.x - b.x);
      sp.plates.forEach((pl, k) => {
        const p = pts[k]!;
        // a slight wave runs down the body
        const sway = Math.sin(this.t * 4 - k * 0.6 + sp.phase) * sp.size * 0.08 * (k / SEGMENTS);
        const a = angle(k === 0 ? sp.pos : pts[k - 1]!, p);
        pl.position.set(p.x - Math.sin(a) * sway, p.y + Math.cos(a) * sway);
        pl.rotation = a;
      });
      const headAngle = angle(sp.pos, pts[0]!);
      sp.head.position.set(sp.pos.x, sp.pos.y);
      sp.head.rotation = headAngle;
      // facing left, the head (and its eye) would be upside down: mirror it instead
      const left = Math.cos(headAngle) < 0;
      sp.head.scale.y = Math.abs(sp.head.scale.y) * (left ? -1 : 1);
      // wings beat from the shoulders (the second plate)
      const sh = pts[1]!;
      const bodyA = angle(pts[0]!, pts[2]!);
      const beat = still ? 0.6 : 0.55 + 0.45 * Math.sin(this.t * 7 + sp.phase);
      const ws = (sp.size * 3.4) / 80;
      sp.wings.forEach((wg, side) => {
        wg.position.set(sh.x, sh.y);
        wg.rotation = bodyA + (side === 0 ? -0.2 : 0.2);
        wg.scale.set(ws, ws * (side === 0 ? 1 : -1) * (0.35 + 0.65 * beat));
        wg.alpha = side === 0 ? 0.95 : 0.75;
      });
      const end = pts[SEGMENTS]!;
      const tailA = angle(pts[SEGMENTS - 1]!, end);
      sp.tail.position.set(end.x, end.y);
      sp.tail.rotation = tailA;
      sp.tail.scale.set((sp.size * 1.3) / 40);
      if (sp.rainbow && !still) {
        sp.plates.forEach((s, k) => (s.tint = hsv((this.t * 0.25 + k * 0.04) % 1)));
        sp.headSprite.tint = hsv((this.t * 0.25) % 1);
        sp.tail.tint = hsv((this.t * 0.25 + 0.55) % 1);
      }
    });
  }

  /** How many Wyrms are flying (tests and the dev panel). */
  get count(): number {
    return this.serpents.length;
  }
}
