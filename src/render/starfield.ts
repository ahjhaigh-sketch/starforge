import { Container, Sprite } from 'pixi.js';
import { textures } from './textures';

/** The sky: three depths of stars drifting at different speeds, twinkling. Pauses with reduced motion. */
interface SkyStar {
  sprite: Sprite;
  x: number;
  depth: number;
  phase: number;
  base: number;
}

let layer: Container | null = null;
let stars: SkyStar[] = [];
let width = 0;
let height = 0;
let elapsed = 0;

const TINTS = [0xffffff, 0xffffff, 0xffffff, 0xbdf6ff, 0xffe9a8];

export function initStarfield(parent: Container): void {
  layer = new Container();
  parent.addChild(layer);
}

export function resizeStarfield(w: number, h: number): void {
  if (!layer || (w === width && h === height)) return;
  width = w;
  height = h;
  layer.removeChildren().forEach((c) => c.destroy());
  const count = Math.min(420, Math.round((w * h) / 5200));
  const tex = textures().dot;
  stars = Array.from({ length: count }, () => {
    const depth = Math.random();
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5);
    const size = 1.2 + depth * depth * 3.2;
    sprite.scale.set(size / 16);
    sprite.tint = depth > 0.92 ? TINTS[4]! : depth > 0.85 ? TINTS[3]! : TINTS[0]!;
    const x = Math.random() * w;
    sprite.position.set(x, Math.random() * h);
    layer!.addChild(sprite);
    return { sprite, x, depth, phase: Math.random() * 6.283, base: 0.3 + depth * 0.7 };
  });
}

export function updateStarfield(dt: number, still: boolean): void {
  if (!still) elapsed += dt;
  for (const s of stars) {
    if (!still) {
      s.x -= dt * (4 + s.depth * 14);
      if (s.x < -4) s.x += width + 8;
      s.sprite.x = s.x;
    }
    const tw = still ? 0.8 : 0.45 + 0.55 * Math.abs(Math.sin(elapsed * (0.6 + s.depth) + s.phase));
    s.sprite.alpha = tw * s.base;
  }
}
