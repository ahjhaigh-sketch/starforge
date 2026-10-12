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

// ---------- nebula clouds (from the first Nebula) ----------

interface Cloud {
  sprite: Sprite;
  x: number;
  y: number;
  speed: number;
  phase: number;
}

let clouds: Cloud[] = [];
let cloudLayer: Container | null = null;
let cloudCount = 0;
let CLOUD_TINTS: readonly number[] = [0x2ee6ff, 0x1e8fa8, 0x7b3fd6, 0x2ee6ff, 0x5fd3c4, 0x9b7cff];

/** A Wardrobe background: the nebula clouds take its colours (now and when more appear). */
export function setCloudPalette(tints: readonly number[]): void {
  if (tints.length === 0) return;
  CLOUD_TINTS = tints;
  clouds.forEach((c, i) => (c.sprite.tint = tints[i % tints.length]!));
}

/** Big soft cyan clouds drift behind the stars: two after the first Nebula, up to eight. */
export function setNebulaClouds(nebulas: number): void {
  const want = nebulas <= 0 ? 0 : Math.min(8, 1 + nebulas);
  if (!layer || want === cloudCount) return;
  cloudCount = want;
  if (!cloudLayer) {
    cloudLayer = new Container();
    layer.parent?.addChildAt(cloudLayer, 0);
  }
  cloudLayer.removeChildren().forEach((c) => c.destroy());
  const tex = textures().soft;
  clouds = Array.from({ length: want }, (_, i) => {
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5);
    // normal blending: 'add' onto the transparent sky canvas adds colour but no alpha, so it never shows
    sprite.tint = CLOUD_TINTS[i % CLOUD_TINTS.length]!;
    sprite.alpha = 0.3;
    const size = 520 + ((i * 137) % 360);
    sprite.scale.set(size / 64, (size * 0.55) / 64);
    cloudLayer!.addChild(sprite);
    return { sprite, x: ((i * 0.37) % 1) * (width || 1400), y: (0.15 + ((i * 0.29) % 0.7)) * (height || 900), speed: 3 + (i % 3) * 2, phase: i * 1.7 };
  });
}

export function updateClouds(dt: number, still: boolean): void {
  for (const c of clouds) {
    if (!still) {
      c.x -= dt * c.speed;
      c.phase += dt * 0.15;
      if (c.x < -400) c.x += width + 800;
    }
    c.sprite.position.set(c.x, c.y + Math.sin(c.phase) * 18);
    c.sprite.alpha = 0.38 + 0.08 * Math.sin(c.phase * 0.7);
  }
}
