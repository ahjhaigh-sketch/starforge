import { Texture } from 'pixi.js';

/** Small textures drawn once on a 2D canvas: no image files to download. */
function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  return Texture.from(c);
}

let cache: { soft: Texture; dot: Texture; mote: Texture } | null = null;

export function textures() {
  if (cache) return cache;
  cache = {
    /** A soft white glow for particles (tinted per burst). */
    soft: canvasTexture(64, (ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }),
    /** A crisp round point for background stars. */
    dot: canvasTexture(16, (ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.8)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }),
    /** A Spark Mote (1.3.0: a glowing four-point spark with a hot core, not a plain ball). */
    mote: canvasTexture(64, (ctx, s) => {
      const c = s / 2;
      const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
      glow.addColorStop(0, 'rgba(255,243,176,0.9)');
      glow.addColorStop(0.35, 'rgba(255,200,61,0.35)');
      glow.addColorStop(1, 'rgba(255,200,61,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, s, s);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? s * 0.42 : s * 0.13;
        const x = c + Math.cos(a) * r;
        const y = c + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = '#FFF3B0';
      ctx.fill();
      ctx.lineWidth = s * 0.06;
      ctx.strokeStyle = '#140B2E';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c, c, s * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }),
  };
  return cache;
}
