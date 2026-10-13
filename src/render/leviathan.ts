import { Container, Sprite, Texture } from 'pixi.js';

/**
 * The Leviathan you're hunting, swimming slowly across the upper sky behind the star: one sprite
 * drawn once (white body with an ink outline, tinted per Leviathan), bigger for later ones. It
 * flinches when it takes a big hit and drifts on a slow sine; reduced motion holds it still.
 */
const INK = '#140B2E';

/** The tint, lifted toward white so the darkest Leviathans still read against the night sky. */
function lift(hex: string, by = 0.35): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = (sh: number) => Math.round(((n >> sh) & 255) + (255 - ((n >> sh) & 255)) * by);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

const TAU = Math.PI * 2;

/** Light greys (tinted per Leviathan): the back shaded darker, the belly pale. */
function bodyFill(ctx: CanvasRenderingContext2D, top: number, bottom: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, '#9A92C2');
  g.addColorStop(0.35, '#E6E2F6');
  g.addColorStop(0.7, '#FFFFFF');
  g.addColorStop(1, '#F4EFE0');
  return g;
}

/**
 * 1.3.0: the body (no tail), facing right: a ridged back with spines, a toothed jaw, belly grooves,
 * barnacles, glowing markings and a glowing eye, so it reads as a creature, not a flat fish.
 */
function whaleTexture(): Texture {
  const w = 256;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // spines along the back, behind the body
  for (let i = 0; i < 7; i++) {
    const x = 70 + i * 20;
    const y = 22 - Math.sin((i / 6) * Math.PI) * 6;
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 10);
    ctx.lineTo(x + 2, y - 10 - (i % 2) * 4);
    ctx.lineTo(x + 9, y + 10);
    ctx.closePath();
    ctx.fillStyle = '#C9C2E4';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  const body = new Path2D();
  body.moveTo(240, 64);
  body.bezierCurveTo(238, 30, 190, 14, 140, 16);
  body.bezierCurveTo(92, 18, 52, 38, 34, 62);
  body.bezierCurveTo(52, 92, 100, 114, 150, 110);
  body.bezierCurveTo(200, 106, 242, 96, 240, 64);
  body.closePath();
  ctx.fillStyle = bodyFill(ctx, 16, 112);
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  // belly grooves
  ctx.strokeStyle = 'rgba(20,11,46,0.28)';
  ctx.lineWidth = 3;
  for (const dy of [0, 8, 16, 24]) {
    ctx.beginPath();
    ctx.moveTo(100, 84 + dy);
    ctx.quadraticCurveTo(170, 96 + dy, 236, 74 + dy * 0.6);
    ctx.stroke();
  }
  // barnacle clusters and glowing markings along the flank
  let seed = 7;
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);
  for (let i = 0; i < 14; i++) {
    const x = 70 + rnd() * 120;
    const y = 30 + rnd() * 26;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + rnd() * 2.5, 0, TAU);
    ctx.fillStyle = 'rgba(20,11,46,0.25)';
    ctx.fill();
  }
  for (let i = 0; i < 9; i++) {
    const x = 80 + i * 16;
    const y = 62 + Math.sin(i * 0.9) * 6;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
    g.addColorStop(0, 'rgba(180,255,255,0.95)');
    g.addColorStop(1, 'rgba(180,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 7, y - 7, 14, 14);
  }
  // a gloss along the back
  ctx.beginPath();
  ctx.ellipse(150, 28, 56, 6, -0.04, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 7;
  ctx.strokeStyle = INK;
  ctx.stroke(body);
  // the jaw line and teeth
  ctx.beginPath();
  ctx.moveTo(238, 70);
  ctx.quadraticCurveTo(214, 82, 186, 80);
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 4; i++) {
    const x = 200 + i * 9;
    ctx.beginPath();
    ctx.moveTo(x, 79 - i * 1.6);
    ctx.lineTo(x + 3.5, 87 - i * 1.6);
    ctx.lineTo(x + 7, 78 - i * 1.6);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // pectoral fin
  ctx.beginPath();
  ctx.moveTo(152, 84);
  ctx.quadraticCurveTo(140, 116, 112, 124);
  ctx.quadraticCurveTo(150, 120, 170, 92);
  ctx.closePath();
  ctx.fillStyle = bodyFill(ctx, 84, 124);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.stroke();
  // a glowing eye under a heavy brow
  const eg = ctx.createRadialGradient(204, 54, 1, 204, 54, 9);
  eg.addColorStop(0, '#FFFFFF');
  eg.addColorStop(0.4, '#9FF7FF');
  eg.addColorStop(1, '#2EA8C8');
  ctx.beginPath();
  ctx.ellipse(204, 54, 8, 6.5, 0, 0, TAU);
  ctx.fillStyle = eg;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(205, 54, 2, 4.5, 0, 0, TAU);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(190, 44);
  ctx.quadraticCurveTo(204, 38, 218, 46);
  ctx.lineWidth = 5;
  ctx.stroke();
  return Texture.from(c);
}

/** The tail flukes, pointing left from their root at the right middle (they sway). */
function tailTexture(): Texture {
  const c = document.createElement('canvas');
  c.width = 72;
  c.height = 112;
  const ctx = c.getContext('2d')!;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(70, 56);
  ctx.bezierCurveTo(52, 50, 34, 30, 8, 6);
  ctx.bezierCurveTo(10, 30, 20, 46, 26, 56);
  ctx.bezierCurveTo(20, 66, 10, 82, 8, 106);
  ctx.bezierCurveTo(34, 82, 52, 62, 70, 56);
  ctx.closePath();
  ctx.fillStyle = bodyFill(ctx, 6, 106);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(20,11,46,0.3)';
  ctx.lineWidth = 2.5;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(60, 56);
    ctx.quadraticCurveTo(36, 56 + k * 14, 16, 56 + k * 40);
    ctx.stroke();
  }
  return Texture.from(c);
}

export class LeviathanView {
  readonly root = new Container();
  private sprite: Sprite | null = null;
  private tail: Sprite | null = null;
  private holder = new Container();
  private visible = false;
  private x = -200;
  private t = 0;
  private flinch = 0;
  private lastPct = 100;
  private index = 0;

  set(visible: boolean, index: number, color: string, pct: number): void {
    if (visible && !this.sprite) {
      // the flukes hang off the back of the body and sway (1.3.0)
      this.tail = new Sprite(tailTexture());
      this.tail.anchor.set(70 / 72, 0.5);
      this.tail.position.set(34 - 128, 62 - 64);
      this.sprite = new Sprite(whaleTexture());
      this.sprite.anchor.set(0.5);
      this.holder.addChild(this.tail, this.sprite);
      this.root.addChild(this.holder);
    }
    if (this.sprite && this.tail) {
      this.sprite.tint = this.tail.tint = lift(color);
      this.holder.visible = visible;
    }
    // it surfaces already in view, then swims on across the sky
    if (visible && !this.visible) this.x = Number.NaN;
    // a hit of 2% or more (or a kill, when the bar refills) makes it flinch
    if (visible && (pct <= this.lastPct - 2 || pct > this.lastPct + 50)) this.flinch = 1;
    this.lastPct = pct;
    this.visible = visible;
    this.index = index;
  }

  update(dt: number, width: number, height: number, still: boolean): void {
    const sp = this.sprite;
    if (!sp || !this.visible) return;
    const size = Math.min(width * 0.32, 150 + this.index * 14);
    const scale = size / 256;
    if (Number.isNaN(this.x)) this.x = width * 0.18;
    if (!still) {
      this.t += dt;
      this.x += dt * Math.max(18, width * 0.018);
      if (this.x > width + size) this.x = -size;
      this.flinch = Math.max(0, this.flinch - dt * 3);
    } else {
      this.x = width * 0.22;
      this.flinch = 0;
    }
    const hold = this.holder;
    hold.x = this.x;
    hold.y = height * 0.3 + Math.sin(this.t * 0.6) * 14;
    hold.rotation = Math.sin(this.t * 0.6 + 0.8) * 0.05;
    const squash = 1 - this.flinch * 0.1;
    hold.scale.set(scale * (2 - squash), scale * squash);
    hold.alpha = 0.85;
    if (this.tail) this.tail.rotation = still ? 0 : Math.sin(this.t * 1.6) * 0.28;
  }
}
