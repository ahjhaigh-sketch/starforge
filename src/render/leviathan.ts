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

function whaleTexture(): Texture {
  const w = 256;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // body and tail, facing right
  ctx.beginPath();
  ctx.moveTo(232, 62);
  ctx.bezierCurveTo(230, 26, 186, 14, 140, 16);
  ctx.bezierCurveTo(92, 18, 60, 36, 44, 56);
  ctx.lineTo(14, 30);
  ctx.bezierCurveTo(10, 50, 14, 62, 22, 70);
  ctx.bezierCurveTo(12, 82, 10, 96, 16, 110);
  ctx.lineTo(46, 80);
  ctx.bezierCurveTo(66, 104, 104, 114, 150, 110);
  ctx.bezierCurveTo(200, 106, 234, 92, 232, 62);
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // belly grooves and shade
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 4;
  for (const dy of [0, 9, 18]) {
    ctx.beginPath();
    ctx.moveTo(110, 86 + dy);
    ctx.quadraticCurveTo(170, 96 + dy, 222, 76 + dy * 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // fin
  ctx.beginPath();
  ctx.moveTo(150, 82);
  ctx.quadraticCurveTo(140, 112, 118, 120);
  ctx.quadraticCurveTo(150, 116, 166, 90);
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.stroke();
  // eye
  ctx.beginPath();
  ctx.arc(196, 56, 7, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(198, 53, 2.4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  return Texture.from(c);
}

export class LeviathanView {
  readonly root = new Container();
  private sprite: Sprite | null = null;
  private visible = false;
  private x = -200;
  private t = 0;
  private flinch = 0;
  private lastPct = 100;
  private index = 0;

  set(visible: boolean, index: number, color: string, pct: number): void {
    if (visible && !this.sprite) {
      this.sprite = new Sprite(whaleTexture());
      this.sprite.anchor.set(0.5);
      this.root.addChild(this.sprite);
    }
    if (this.sprite) {
      this.sprite.tint = lift(color);
      this.sprite.visible = visible;
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
    sp.x = this.x;
    sp.y = height * 0.3 + Math.sin(this.t * 0.6) * 14;
    sp.rotation = Math.sin(this.t * 0.6 + 0.8) * 0.05;
    const squash = 1 - this.flinch * 0.1;
    sp.scale.set(scale * (2 - squash), scale * squash);
    sp.alpha = 0.8;
  }
}
