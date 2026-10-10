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
    /** A Spark Mote: cream ball, ink outline, one white highlight (the chunky look). */
    mote: canvasTexture(64, (ctx, s) => {
      const r = s * 0.36;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
      ctx.fillStyle = '#FFF3B0';
      ctx.fill();
      ctx.lineWidth = s * 0.11;
      ctx.strokeStyle = '#140B2E';
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(s * 0.42, s * 0.4, r * 0.38, r * 0.22, -0.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
    }),
  };
  return cache;
}
