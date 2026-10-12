import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { ORBITALS, PLANET_TYPES } from '../content/early';

/**
 * Orbitals in the sky: faint ring ellipses around the star and the planets travelling along them.
 * Planets on the far side of a ring draw behind the star, like the Spark Motes.
 *
 * Every planet is a small stack of sprites: an atmosphere glow, the back half of its rings, the
 * painted surface, a day/night shadow and an outline that both turn to face away from the star,
 * glowing lava or crystal that shines through the night side, the front half of its rings, and
 * moonlets once it is levelled high. Each type has four looks; which one a planet wears (and its
 * tilt) comes from its slot, so the same slot always looks the same and neighbours differ. All the
 * pictures are painted once per (type, look) on a 2D canvas and cached.
 */

const TAU = Math.PI * 2;
const INK = '#140B2E';
/** Surface textures are TEX px square with the planet's radius BR px. Every layer shares this frame. */
const TEX = 128;
const C = TEX / 2;
const BR = Math.round(TEX * 0.42);
/** Glow texture: the planet's edge sits at GLOW_EDGE px from its centre. */
const GLOW_EDGE = 42;
/** Ring textures: RW x RH, the ring ellipse squashed to RING_SQUASH. */
const RW = 256;
const RH = 128;
const RING_SQUASH = 0.32;
/** Moonlet textures are MOON_TEX px with radius MOON_R. */
const MOON_TEX = 32;
const MOON_R = 11;
/** Levels at which a planet gains its first, second and third moonlet. */
const MOONLET_LEVELS = [10, 25, 50] as const;
const LOOKS = 4;

// ---------- deterministic noise (cosmetic only: the same seed always paints the same planet) ----------

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
/** Independent random streams from one seed: stream k always gives the same numbers. */
type Streams = (k: number) => Rand;
const between = (rand: Rand, a: number, b: number) => a + (b - a) * rand();

// ---------- colour helpers ----------

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number, alpha = 1): string {
  const x = rgbOf(a);
  const y = rgbOf(b);
  const c = x.map((v, i) => Math.round(v + (y[i]! - v) * t));
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}
const lighten = (c: string, t: number, alpha = 1) => mix(c, '#FFFFFF', t, alpha);
const darken = (c: string, t: number, alpha = 1) => mix(c, INK, t, alpha);
const withAlpha = (c: string, alpha: number) => mix(c, c, 0, alpha);

// ---------- painting helpers (all in surface-texture pixels, clipped to the disc) ----------

function newCanvas(w: number, h = w): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

/** A random point on the disc, kept `margin` (share of the radius) inside the edge. */
function pointOnDisc(rand: Rand, margin = 0.15): [number, number] {
  const a = rand() * TAU;
  const d = Math.sqrt(rand()) * BR * (1 - margin);
  return [C + Math.cos(a) * d, C + Math.sin(a) * d];
}

/** A lumpy round shape (continents, ice sheets, crust plates, dark maria). */
function blob(ctx: CanvasRenderingContext2D, rand: Rand, x: number, y: number, r: number, lumps = 9, squash = 1): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * TAU + between(rand, -0.2, 0.2);
    const d = r * between(rand, 0.65, 1.2);
    pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d * squash]);
  }
  ctx.beginPath();
  const mid = (i: number): [number, number] => {
    const p = pts[i % lumps]!;
    const q = pts[(i + 1) % lumps]!;
    return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  };
  const start = mid(0);
  ctx.moveTo(start[0], start[1]);
  for (let i = 1; i <= lumps; i++) {
    const p = pts[i % lumps]!;
    const m = mid(i);
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  ctx.closePath();
  ctx.fill();
}

/** A crater: a darker bowl with a lit lower rim and a shadowed upper rim. */
function crater(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, base: string): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = darken(base, 0.22);
  ctx.fill();
  ctx.lineWidth = Math.max(1.2, r * 0.32);
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI * 1.05, Math.PI * 1.95);
  ctx.strokeStyle = darken(base, 0.4, 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI * 0.05, Math.PI * 0.95);
  ctx.strokeStyle = lighten(base, 0.35, 0.9);
  ctx.stroke();
}

/** Horizontal cloud bands with wavy edges, top to bottom, for gas giants and frosty worlds. */
function bands(ctx: CanvasRenderingContext2D, rand: Rand, colors: readonly string[], wobble: number): void {
  const n = colors.length;
  const top = C - BR;
  const h = (BR * 2) / n;
  ctx.fillStyle = colors[0]!;
  ctx.fillRect(0, 0, TEX, TEX);
  for (let i = 1; i < n; i++) {
    const y0 = top + i * h + between(rand, -h * 0.25, h * 0.25);
    const freq = between(rand, 1.5, 3.5);
    const phase = rand() * TAU;
    const amp = wobble * between(rand, 0.6, 1.3);
    ctx.beginPath();
    ctx.moveTo(0, TEX);
    ctx.lineTo(0, y0);
    for (let x = 0; x <= TEX; x += 4) ctx.lineTo(x, y0 + Math.sin((x / TEX) * TAU * freq + phase) * amp);
    ctx.lineTo(TEX, TEX);
    ctx.closePath();
    ctx.fillStyle = colors[i]!;
    ctx.fill();
  }
}

/** Thin streaks along the bands (the fine texture of a gas giant). */
function streaks(ctx: CanvasRenderingContext2D, rand: Rand, color: string, count: number): void {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const y = C + between(rand, -0.9, 0.9) * BR;
    const x = C + between(rand, -1, 0.6) * BR;
    const len = between(rand, 0.2, 0.7) * BR;
    ctx.lineWidth = between(rand, 0.8, 2.2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len / 2, y + between(rand, -2, 2), x + len, y + between(rand, -1.5, 1.5));
    ctx.stroke();
  }
}

/** An oval storm with a few rings, like a great red spot. */
function storm(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string): void {
  for (let i = 0; i < 3; i++) {
    const k = 1 - i * 0.3;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * k, ry * k, 0, 0, TAU);
    ctx.fillStyle = i === 0 ? lighten(color, 0.35) : i === 1 ? color : darken(color, 0.2);
    ctx.fill();
  }
}

/** Polar caps: lumpy white ellipses over the top and bottom of the disc. */
function caps(ctx: CanvasRenderingContext2D, rand: Rand, color: string, size: number): void {
  ctx.fillStyle = color;
  for (const dir of [-1, 1]) {
    const s = size * between(rand, 0.75, 1.15);
    blob(ctx, rand, C + between(rand, -4, 4), C + dir * BR * 0.98, BR * 0.62 * s, 11, 0.42);
  }
}

/** Soft cloud wisps. */
function wisps(ctx: CanvasRenderingContext2D, rand: Rand, count: number, alpha: number): void {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  for (let i = 0; i < count; i++) {
    const [x, y] = pointOnDisc(rand, 0.05);
    ctx.beginPath();
    ctx.ellipse(x, y, between(rand, 6, 16), between(rand, 1.6, 3.4), between(rand, -0.25, 0.25), 0, TAU);
    ctx.fill();
  }
}

/** Branching lines (lava seams, ice cracks): random walks from points on the disc. Same seed, same lines. */
function crackPaths(rand: Rand, count: number, steps: number, stepLen: number): Array<Array<[number, number]>> {
  const out: Array<Array<[number, number]>> = [];
  for (let i = 0; i < count; i++) {
    let [x, y] = pointOnDisc(rand, 0.1);
    let a = rand() * TAU;
    const path: Array<[number, number]> = [[x, y]];
    for (let k = 0; k < steps; k++) {
      a += between(rand, -0.9, 0.9);
      x += Math.cos(a) * stepLen;
      y += Math.sin(a) * stepLen;
      path.push([x, y]);
    }
    out.push(path);
  }
  return out;
}

function strokePaths(ctx: CanvasRenderingContext2D, paths: Array<Array<[number, number]>>, color: string, width: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const path of paths) {
    ctx.beginPath();
    path.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  }
}

/** Crystal facets: a jittered grid cut into triangles, each a slightly different shade. */
function facets(ctx: CanvasRenderingContext2D, rand: Rand, base: string, cells: number, spread: number): void {
  const step = TEX / cells;
  const pts: Array<Array<[number, number]>> = [];
  for (let j = 0; j <= cells; j++) {
    const row: Array<[number, number]> = [];
    for (let i = 0; i <= cells; i++) {
      const edge = i === 0 || j === 0 || i === cells || j === cells;
      row.push([i * step + (edge ? 0 : between(rand, -0.35, 0.35) * step), j * step + (edge ? 0 : between(rand, -0.35, 0.35) * step)]);
    }
    pts.push(row);
  }
  const tri = (a: [number, number], b: [number, number], c: [number, number]) => {
    const t = between(rand, -spread, spread);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.closePath();
    ctx.fillStyle = t >= 0 ? lighten(base, t) : darken(base, -t);
    ctx.fill();
    ctx.strokeStyle = lighten(base, 0.45, 0.55);
    ctx.lineWidth = 0.9;
    ctx.stroke();
  };
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const p00 = pts[j]![i]!;
      const p10 = pts[j]![i + 1]!;
      const p01 = pts[j + 1]![i]!;
      const p11 = pts[j + 1]![i + 1]!;
      if (rand() < 0.5) {
        tri(p00, p10, p11);
        tri(p00, p11, p01);
      } else {
        tri(p00, p10, p01);
        tri(p10, p11, p01);
      }
    }
  }
}

/** A four-point sparkle. */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r * 0.7, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r * 0.7, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

// ---------- the looks ----------

interface RingStyle {
  /** Inner and outer radius as a share of the planet's radius. */
  inner: number;
  outer: number;
  colors: readonly string[];
  alpha: number;
  /** Draw the ring as a belt of small crystal shards instead of bands. */
  shards?: boolean;
}

interface Look {
  /** Paints the surface (already clipped to the disc). `rand` is stream 0 of `sub`. */
  paint: (ctx: CanvasRenderingContext2D, rand: Rand, sub: Streams) => void;
  /**
   * Paints what glows on the night side too (lava seams, crystal sparkles). It gets the same
   * streams as paint, so a feature drawn from the same stream lands in the same place.
   */
  glow?: (ctx: CanvasRenderingContext2D, rand: Rand, sub: Streams) => void;
  atmosphere: number;
  atmosphereAlpha: number;
  ring?: RingStyle;
}

const ROCKY: readonly Look[] = [
  {
    // dusty brown, dark seas and craters
    paint: (ctx, rand) => {
      const base = '#B07A52';
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, TEX, TEX);
      ctx.fillStyle = withAlpha('#8A5A3A', 0.75);
      for (let i = 0; i < 4; i++) {
        const [x, y] = pointOnDisc(rand, 0.2);
        blob(ctx, rand, x, y, between(rand, 9, 18));
      }
      for (let i = 0; i < 9; i++) {
        const [x, y] = pointOnDisc(rand, 0.12);
        crater(ctx, x, y, between(rand, 2.5, 8), base);
      }
    },
    atmosphere: 0xe8b890,
    atmosphereAlpha: 0.25,
  },
  {
    // a grey moon, pocked all over, one bright rayed crater
    paint: (ctx, rand) => {
      const base = '#A59CB4';
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, TEX, TEX);
      ctx.fillStyle = withAlpha('#7D7590', 0.7);
      for (let i = 0; i < 3; i++) {
        const [x, y] = pointOnDisc(rand, 0.25);
        blob(ctx, rand, x, y, between(rand, 10, 16));
      }
      const [rx, ry] = pointOnDisc(rand, 0.4);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const a = rand() * TAU;
        const len = between(rand, 14, 34);
        ctx.lineWidth = between(rand, 1, 2.4);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.cos(a) * len, ry + Math.sin(a) * len);
        ctx.stroke();
      }
      for (let i = 0; i < 15; i++) {
        const [x, y] = pointOnDisc(rand, 0.08);
        crater(ctx, x, y, between(rand, 2, 7), base);
      }
      crater(ctx, rx, ry, 5, lighten(base, 0.3));
    },
    atmosphere: 0xc9c2f2,
    atmosphereAlpha: 0.12,
  },
  {
    // a red desert: dune bands, a long canyon and one frosty cap
    paint: (ctx, rand) => {
      bands(ctx, rand, ['#D98250', '#C8643C', '#D2744A', '#B5543A', '#C8643C', '#A84E30'], 4);
      strokePaths(ctx, crackPaths(rand, 1, 9, 7), darken('#A84E30', 0.35), 3);
      for (let i = 0; i < 5; i++) {
        const [x, y] = pointOnDisc(rand, 0.15);
        crater(ctx, x, y, between(rand, 2, 5), '#C8643C');
      }
      ctx.fillStyle = '#FFF4EA';
      blob(ctx, rand, C + 3, C - BR * 0.98, BR * 0.45, 11, 0.4);
    },
    atmosphere: 0xff9a6a,
    atmosphereAlpha: 0.35,
  },
  {
    // an ocean world: blue seas, green-and-tan continents, ice caps and clouds
    paint: (ctx, rand) => {
      const sea = ctx.createLinearGradient(0, C - BR, 0, C + BR);
      sea.addColorStop(0, '#3D9AD8');
      sea.addColorStop(1, '#2366A8');
      ctx.fillStyle = sea;
      ctx.fillRect(0, 0, TEX, TEX);
      for (let i = 0; i < 3; i++) {
        const [x, y] = pointOnDisc(rand, 0.25);
        const r = between(rand, 12, 20);
        ctx.fillStyle = '#C9A27E';
        blob(ctx, rand, x, y, r, 10);
        ctx.fillStyle = '#6FA64A';
        blob(ctx, rand, x + between(rand, -3, 3), y + between(rand, -3, 3), r * 0.62, 8);
      }
      caps(ctx, rand, '#F4FBFF', 0.75);
      wisps(ctx, rand, 7, 0.55);
    },
    atmosphere: 0x6fc8ff,
    atmosphereAlpha: 0.55,
  },
];

const GAS: readonly Look[] = [
  {
    // banded cream and orange with a great storm
    paint: (ctx, rand) => {
      bands(ctx, rand, ['#F2D9B0', '#D9905A', '#EFC48E', '#B9683E', '#F5E1C0', '#C97A4A', '#E8B27C', '#D9905A'], 3);
      streaks(ctx, rand, 'rgba(255,240,215,0.45)', 14);
      storm(ctx, C + BR * 0.28, C + BR * 0.3, BR * 0.3, BR * 0.17, '#C2452E');
      storm(ctx, C - BR * 0.4, C - BR * 0.42, BR * 0.12, BR * 0.07, '#F5E6CF');
    },
    atmosphere: 0xffd6a0,
    atmosphereAlpha: 0.4,
  },
  {
    // pale gold, softly banded, with a broad ring
    paint: (ctx, rand) => {
      bands(ctx, rand, ['#F3E2B3', '#E3C786', '#F0D9A0', '#D4B070', '#EBD39A', '#DDBE7E'], 1.6);
      streaks(ctx, rand, 'rgba(255,248,225,0.4)', 10);
    },
    atmosphere: 0xffe6b0,
    atmosphereAlpha: 0.35,
    ring: { inner: 1.3, outer: 2.05, colors: ['#E8D2A0', '#C9A86A', '#F3E2B3', '#B89058', '#EADBB4'], alpha: 0.95 },
  },
  {
    // rose bands with white storm ovals
    paint: (ctx, rand) => {
      bands(ctx, rand, ['#F7B8C8', '#E07A9A', '#F5D0DA', '#C8587E', '#F2A6BC', '#D86A8E', '#F7C4D2'], 3.5);
      streaks(ctx, rand, 'rgba(255,235,242,0.45)', 12);
      for (let i = 0; i < 3; i++) {
        const [x, y] = pointOnDisc(rand, 0.3);
        storm(ctx, x, y, between(rand, 4, 8), between(rand, 2.5, 4), '#FFF0F4');
      }
    },
    atmosphere: 0xffb8d0,
    atmosphereAlpha: 0.4,
  },
  {
    // a teal ice giant with a dark spot and a thin ring
    paint: (ctx, rand) => {
      bands(ctx, rand, ['#8FE0D8', '#5FC0C4', '#A6EDE4', '#4AA2B4', '#7FD8D0', '#3E8FA6'], 2.4);
      streaks(ctx, rand, 'rgba(235,255,252,0.45)', 10);
      storm(ctx, C - BR * 0.25, C + BR * 0.22, BR * 0.2, BR * 0.12, '#2C5E7E');
      wisps(ctx, rand, 3, 0.6);
    },
    atmosphere: 0x9ff0f0,
    atmosphereAlpha: 0.45,
    ring: { inner: 1.45, outer: 1.72, colors: ['#BFEFF0', '#8FD0DA'], alpha: 0.6 },
  },
];

const ICE: readonly Look[] = [
  {
    // a pale glacier moon criss-crossed with rusty cracks
    paint: (ctx, rand) => {
      ctx.fillStyle = '#CFF3FF';
      ctx.fillRect(0, 0, TEX, TEX);
      ctx.fillStyle = 'rgba(159,231,255,0.6)';
      for (let i = 0; i < 4; i++) {
        const [x, y] = pointOnDisc(rand, 0.2);
        blob(ctx, rand, x, y, between(rand, 8, 16));
      }
      strokePaths(ctx, crackPaths(rand, 7, 7, 8), 'rgba(176,122,106,0.7)', 1.6);
      caps(ctx, rand, '#FFFFFF', 0.7);
    },
    atmosphere: 0xbff4ff,
    atmosphereAlpha: 0.45,
  },
  {
    // a snowball with blue crevasses and a faint ring
    paint: (ctx, rand) => {
      ctx.fillStyle = '#EAF8FF';
      ctx.fillRect(0, 0, TEX, TEX);
      ctx.fillStyle = 'rgba(127,200,238,0.35)';
      for (let i = 0; i < 5; i++) {
        const [x, y] = pointOnDisc(rand, 0.15);
        blob(ctx, rand, x, y, between(rand, 6, 14));
      }
      strokePaths(ctx, crackPaths(rand, 6, 6, 7), '#7FC8EE', 2);
    },
    atmosphere: 0xdff6ff,
    atmosphereAlpha: 0.5,
    ring: { inner: 1.35, outer: 1.62, colors: ['#DFF6FF', '#A8DDF5'], alpha: 0.5 },
  },
  {
    // a frozen ocean: deep blue with white ice sheets and wide caps
    paint: (ctx, rand) => {
      const sea = ctx.createLinearGradient(0, C - BR, 0, C + BR);
      sea.addColorStop(0, '#4FA0DA');
      sea.addColorStop(1, '#2E78BE');
      ctx.fillStyle = sea;
      ctx.fillRect(0, 0, TEX, TEX);
      ctx.fillStyle = '#EAF8FF';
      for (let i = 0; i < 4; i++) {
        const [x, y] = pointOnDisc(rand, 0.25);
        blob(ctx, rand, x, y, between(rand, 6, 12), 9, 0.7);
      }
      caps(ctx, rand, '#F6FCFF', 1.05);
      wisps(ctx, rand, 4, 0.4);
    },
    atmosphere: 0x9fe7ff,
    atmosphereAlpha: 0.55,
  },
  {
    // cyan frost bands with polar caps and a sparkling ring
    paint: (ctx, rand) => {
      bands(ctx, rand, ['#B8EEFF', '#9FE7FF', '#CFF5FF', '#7FD6F5', '#AEEBFF', '#8ADCF8'], 2.2);
      streaks(ctx, rand, 'rgba(255,255,255,0.5)', 9);
      caps(ctx, rand, '#FFFFFF', 0.8);
    },
    atmosphere: 0x9fe7ff,
    atmosphereAlpha: 0.5,
    ring: { inner: 1.3, outer: 1.85, colors: ['#CFF5FF', '#8ADCF8', '#E8FAFF'], alpha: 0.6 },
  },
];

const lavaSeams = (rand: Rand) => crackPaths(rand, 8, 8, 7);

const LAVA: readonly Look[] = [
  {
    // a dark crust split by a glowing magma network
    paint: (ctx, rand, sub) => {
      ctx.fillStyle = '#3A1A28';
      ctx.fillRect(0, 0, TEX, TEX);
      ctx.fillStyle = 'rgba(90,34,40,0.8)';
      for (let i = 0; i < 6; i++) {
        const [x, y] = pointOnDisc(rand, 0.1);
        blob(ctx, rand, x, y, between(rand, 6, 13));
      }
      strokePaths(ctx, lavaSeams(sub(1)), '#B0301E', 5);
    },
    glow: (ctx, _rand, sub) => {
      const seams = lavaSeams(sub(1));
      strokePaths(ctx, seams, '#FF8A2D', 3);
      strokePaths(ctx, seams, '#FFE07A', 1.2);
    },
    atmosphere: 0xff6a2d,
    atmosphereAlpha: 0.65,
  },
  {
    // red rock with dark plates and bright volcanoes
    paint: (ctx, rand) => {
      ctx.fillStyle = '#B0301E';
      ctx.fillRect(0, 0, TEX, TEX);
      ctx.fillStyle = '#5A1A1E';
      for (let i = 0; i < 5; i++) {
        const [x, y] = pointOnDisc(rand, 0.1);
        blob(ctx, rand, x, y, between(rand, 9, 16));
      }
    },
    glow: (ctx, _rand, sub) => {
      const rand = sub(2);
      for (let i = 0; i < 6; i++) {
        const [x, y] = pointOnDisc(rand, 0.12);
        const r = between(rand, 2, 4.5);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
        g.addColorStop(0, 'rgba(255,240,170,1)');
        g.addColorStop(0.35, 'rgba(255,170,60,0.9)');
        g.addColorStop(1, 'rgba(255,90,40,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 2.6, 0, TAU);
        ctx.fill();
      }
    },
    atmosphere: 0xff5a2d,
    atmosphereAlpha: 0.55,
  },
  {
    // cooling black basalt with thin red seams
    paint: (ctx, rand) => {
      ctx.fillStyle = '#2A1626';
      ctx.fillRect(0, 0, TEX, TEX);
      facets(ctx, rand, '#33192C', 5, 0.12);
    },
    glow: (ctx, _rand, sub) => {
      strokePaths(ctx, crackPaths(sub(1), 6, 7, 8), '#FF4A2D', 2.2);
    },
    atmosphere: 0xff4a2d,
    atmosphereAlpha: 0.45,
  },
  {
    // molten orange with dark crust islands drifting on it
    paint: (ctx, rand) => {
      ctx.fillStyle = '#FF6A3D';
      ctx.fillRect(0, 0, TEX, TEX);
      ctx.strokeStyle = 'rgba(255,200,61,0.8)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const y = C + between(rand, -0.85, 0.85) * BR;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= TEX; x += 6) ctx.lineTo(x, y + Math.sin(x * 0.12 + i) * 3);
        ctx.stroke();
      }
      ctx.fillStyle = '#4A1E22';
      for (let i = 0; i < 6; i++) {
        const [x, y] = pointOnDisc(rand, 0.1);
        blob(ctx, rand, x, y, between(rand, 6, 13), 8);
      }
    },
    atmosphere: 0xff7a3d,
    atmosphereAlpha: 0.7,
  },
];

const crystalSparks = (ctx: CanvasRenderingContext2D, rand: Rand, n: number) => {
  for (let i = 0; i < n; i++) {
    const [x, y] = pointOnDisc(rand, 0.15);
    sparkle(ctx, x, y, between(rand, 3, 6.5), 'rgba(255,255,255,0.95)');
  }
};

const CRYSTAL: readonly Look[] = [
  {
    // amethyst facets
    paint: (ctx, rand) => facets(ctx, rand, '#B48AF0', 6, 0.28),
    glow: (ctx, _rand, sub) => {
      crystalSparks(ctx, sub(3), 4);
    },
    atmosphere: 0xd9b8ff,
    atmosphereAlpha: 0.55,
  },
  {
    // rose quartz
    paint: (ctx, rand) => facets(ctx, rand, '#F0A0D8', 5, 0.26),
    glow: (ctx, _rand, sub) => {
      crystalSparks(ctx, sub(3), 3);
    },
    atmosphere: 0xffc0e8,
    atmosphereAlpha: 0.5,
  },
  {
    // a prism: lilac facets washed with rainbow bands
    paint: (ctx, rand) => {
      facets(ctx, rand, '#C9A0FF', 7, 0.2);
      const colors = ['rgba(120,230,255,0.28)', 'rgba(255,150,220,0.28)', 'rgba(255,240,150,0.24)'];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = colors[i]!;
        ctx.save();
        ctx.translate(C, C);
        ctx.rotate(-0.6);
        ctx.fillRect(-TEX, -BR + i * BR * 0.7 + between(rand, -4, 4), TEX * 2, BR * 0.32);
        ctx.restore();
      }
    },
    glow: (ctx, _rand, sub) => {
      crystalSparks(ctx, sub(3), 5);
    },
    atmosphere: 0xc9f0ff,
    atmosphereAlpha: 0.5,
  },
  {
    // a geode: dark violet rock, bright crystal clusters and a ring of shards
    paint: (ctx, rand) => {
      facets(ctx, rand, '#4A2A80', 5, 0.15);
      for (let i = 0; i < 5; i++) {
        const [x, y] = pointOnDisc(rand, 0.15);
        const r = between(rand, 4, 8);
        for (let k = 0; k < 4; k++) {
          const a = rand() * TAU;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a - 0.35) * r, y + Math.sin(a - 0.35) * r);
          ctx.lineTo(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5);
          ctx.lineTo(x + Math.cos(a + 0.35) * r, y + Math.sin(a + 0.35) * r);
          ctx.closePath();
          ctx.fillStyle = k % 2 ? '#E0C8FF' : '#B48AF0';
          ctx.fill();
        }
      }
    },
    glow: (ctx, _rand, sub) => {
      crystalSparks(ctx, sub(3), 4);
    },
    atmosphere: 0xb48af0,
    atmosphereAlpha: 0.55,
    ring: { inner: 1.4, outer: 1.95, colors: ['#E0C8FF', '#B48AF0'], alpha: 0.9, shards: true },
  },
];

const LOOKS_BY_TYPE: Record<string, readonly Look[]> = { rocky: ROCKY, gas: GAS, ice: ICE, lava: LAVA, crystal: CRYSTAL };

/** Which of its type's looks a planet wears: neighbours on a ring always differ. */
function planetLook(ring: number, slot: number, type: string): number {
  const typeIndex = Math.max(0, PLANET_TYPES.findIndex((t) => t.id === type));
  return (slot + ring * 2 + typeIndex) % LOOKS;
}

// ---------- textures (painted once per type and look, then cached) ----------

function toTexture(c: HTMLCanvasElement): Texture {
  const t = Texture.from(c);
  // planets are drawn far smaller than painted: mipmaps keep them smooth instead of shimmering
  t.source.autoGenerateMipmaps = true;
  return t;
}

interface PlanetTextures {
  body: Texture;
  glow: Texture | null;
  ringBack: Texture | null;
  ringFront: Texture | null;
  look: Look;
}

const planetCache = new Map<string, PlanetTextures>();

function paintDisc(look: Look, seed: number, which: 'paint' | 'glow'): HTMLCanvasElement {
  const [c, ctx] = newCanvas(TEX);
  ctx.save();
  ctx.beginPath();
  ctx.arc(C, C, BR, 0, TAU);
  ctx.clip();
  const sub: Streams = (k) => mulberry32((seed + Math.imul(k, 0x9e3779b1)) >>> 0);
  look[which]!(ctx, sub(0), sub);
  if (which === 'paint') {
    // limb darkening: the edge of a ball is always a little darker
    const g = ctx.createRadialGradient(C, C, BR * 0.55, C, C, BR);
    g.addColorStop(0, 'rgba(20,11,46,0)');
    g.addColorStop(1, 'rgba(20,11,46,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TEX, TEX);
  } else {
    // glowing things also bloom a little
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35;
    ctx.filter = 'blur(2px)';
    ctx.drawImage(c, 0, 0);
    ctx.filter = 'none';
  }
  ctx.restore();
  return c;
}

function paintRing(style: RingStyle, seed: number, half: 'back' | 'front'): HTMLCanvasElement {
  const [c, ctx] = newCanvas(RW, RH);
  const rand = mulberry32(seed);
  ctx.save();
  ctx.beginPath();
  if (half === 'back') ctx.rect(0, 0, RW, RH / 2);
  else ctx.rect(0, RH / 2, RW, RH / 2);
  ctx.clip();
  const cx = RW / 2;
  const cy = RH / 2;
  if (style.shards) {
    const n = 34;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + between(rand, -0.05, 0.05);
      const d = BR * between(rand, style.inner, style.outer);
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d * RING_SQUASH;
      const s = between(rand, 3.5, 6.5);
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s * 0.6, y);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s * 0.6, y);
      ctx.closePath();
      ctx.fillStyle = style.colors[i % style.colors.length]!;
      ctx.globalAlpha = style.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
  } else {
    const inner = BR * style.inner;
    const outer = BR * style.outer;
    // an ink edge first, so the ring reads against the sky like the rest of the chunky art
    for (const r of [inner, outer]) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * RING_SQUASH, 0, 0, TAU);
      ctx.lineWidth = 3;
      ctx.strokeStyle = withAlpha(INK, 0.7);
      ctx.stroke();
    }
    const steps = Math.max(3, Math.round((outer - inner) / 2.2));
    const w = (outer - inner) / steps;
    for (let i = 0; i < steps; i++) {
      const r = inner + w * (i + 0.5);
      const gap = i === Math.floor(steps * 0.62) && steps > 6;
      if (gap) continue;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * RING_SQUASH, 0, 0, TAU);
      ctx.lineWidth = w + 0.6;
      ctx.strokeStyle = withAlpha(style.colors[Math.floor(rand() * style.colors.length)]!, style.alpha * between(rand, 0.65, 1));
      ctx.stroke();
    }
  }
  ctx.restore();
  return c;
}

function planetTextures(type: string, look: number): PlanetTextures {
  const key = `${type}:${look}`;
  let t = planetCache.get(key);
  if (t) return t;
  const looks = LOOKS_BY_TYPE[type] ?? ROCKY;
  const def = looks[look % looks.length]!;
  const seed = hashString(key);
  t = {
    body: toTexture(paintDisc(def, seed, 'paint')),
    glow: def.glow ? toTexture(paintDisc(def, seed, 'glow')) : null,
    ringBack: def.ring ? toTexture(paintRing(def.ring, seed ^ 0x5bd1e995, 'back')) : null,
    ringFront: def.ring ? toTexture(paintRing(def.ring, seed ^ 0x5bd1e995, 'front')) : null,
    look: def,
  };
  planetCache.set(key, t);
  return t;
}

let shared: { shadow: Texture; rim: Texture; halo: Texture; moons: Texture[] } | null = null;

/** The layers every planet shares: night shadow, outline and lit rim, atmosphere halo, moonlets. */
function sharedTextures() {
  if (shared) return shared;
  // night side: light comes from -x (the sprite turns so -x points at the star)
  const [sc, s] = newCanvas(TEX);
  s.beginPath();
  s.arc(C, C, BR, 0, TAU);
  s.clip();
  const g = s.createRadialGradient(C - BR * 0.8, C, 0, C - BR * 0.8, C, BR * 2);
  g.addColorStop(0, 'rgba(14,6,34,0)');
  g.addColorStop(0.38, 'rgba(14,6,34,0)');
  g.addColorStop(0.5, 'rgba(14,6,34,0.55)');
  g.addColorStop(0.62, 'rgba(14,6,34,0.86)');
  g.addColorStop(1, 'rgba(14,6,34,0.94)');
  s.fillStyle = g;
  s.fillRect(0, 0, TEX, TEX);

  // the chunky ink outline, a thin sunlit rim and a soft gloss on the star side
  const [rc, r] = newCanvas(TEX);
  r.beginPath();
  r.arc(C, C, BR * 0.87, Math.PI * 0.68, Math.PI * 1.32);
  r.lineWidth = BR * 0.08;
  r.lineCap = 'round';
  r.strokeStyle = 'rgba(255,246,222,0.6)';
  r.stroke();
  r.beginPath();
  r.ellipse(C - BR * 0.42, C - BR * 0.28, BR * 0.17, BR * 0.3, 0.5, 0, TAU);
  r.fillStyle = 'rgba(255,255,255,0.5)';
  r.fill();
  r.beginPath();
  r.arc(C, C, BR, 0, TAU);
  r.lineWidth = BR * 0.2;
  r.strokeStyle = INK;
  r.stroke();

  // the atmosphere: a soft halo starting just inside the planet's edge (tinted per look)
  const [hc, h] = newCanvas(TEX);
  const hg = h.createRadialGradient(C, C, 0, C, C, C);
  hg.addColorStop(0, 'rgba(255,255,255,0)');
  hg.addColorStop(0.55, 'rgba(255,255,255,0.0)');
  hg.addColorStop(0.66, 'rgba(255,255,255,0.85)');
  hg.addColorStop(0.78, 'rgba(255,255,255,0.35)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  h.fillStyle = hg;
  h.fillRect(0, 0, TEX, TEX);

  const moon = (base: string, seed: number) => {
    const [mc, m] = newCanvas(MOON_TEX);
    const k = MOON_TEX / 2;
    const rand = mulberry32(seed);
    m.save();
    m.beginPath();
    m.arc(k, k, MOON_R, 0, TAU);
    m.fillStyle = base;
    m.fill();
    m.clip();
    for (let i = 0; i < 3; i++) {
      m.beginPath();
      m.arc(k + between(rand, -6, 6), k + between(rand, -6, 6), between(rand, 1.5, 3), 0, TAU);
      m.fillStyle = darken(base, 0.25);
      m.fill();
    }
    m.beginPath();
    m.arc(k + MOON_R * 0.55, k + MOON_R * 0.35, MOON_R * 1.05, 0, TAU);
    m.fillStyle = 'rgba(14,6,34,0.45)';
    m.fill();
    m.restore();
    m.beginPath();
    m.arc(k, k, MOON_R, 0, TAU);
    m.lineWidth = 2.6;
    m.strokeStyle = INK;
    m.stroke();
    m.beginPath();
    m.ellipse(k - 4, k - 4, 2.6, 1.6, -0.6, 0, TAU);
    m.fillStyle = 'rgba(255,255,255,0.75)';
    m.fill();
    return toTexture(mc);
  };

  shared = {
    shadow: toTexture(sc),
    rim: toTexture(rc),
    halo: toTexture(hc),
    moons: [moon('#A59CB4', 11), moon('#C9A27E', 23), moon('#CFEFFF', 37)],
  };
  return shared;
}

// ---------- the view ----------

interface Moonlet {
  sprite: Sprite;
  /** Orbit radius (texture px), speed (radians a second), starting angle, tilt of its orbit. */
  dist: number;
  speed: number;
  phase: number;
  tilt: number;
}

interface PlanetView {
  ring: number;
  slot: number;
  level: number;
  root: Container;
  shadow: Sprite;
  rim: Sprite;
  moonBack: Container;
  moonFront: Container;
  moons: Moonlet[];
}

function moonletCount(level: number): number {
  return MOONLET_LEVELS.filter((l) => level >= l).length;
}

function buildPlanet(ring: number, slot: number, type: string, level: number): PlanetView {
  const look = planetLook(ring, slot, type);
  const tex = planetTextures(type, look);
  const sh = sharedTextures();
  const id = `${ring}.${slot}`;
  const rand = mulberry32(hashString(`${id}:${type}`));
  // each slot tilts its planet (and the planet's rings) its own way
  const tilt = between(rand, -0.38, 0.38);

  const root = new Container();
  const moonBack = new Container();
  const moonFront = new Container();
  const centred = (t: Texture) => {
    const s = new Sprite(t);
    s.anchor.set(0.5);
    return s;
  };

  const halo = centred(sh.halo);
  halo.tint = tex.look.atmosphere;
  halo.alpha = tex.look.atmosphereAlpha;
  halo.scale.set(BR / GLOW_EDGE);
  root.addChild(moonBack, halo);
  if (tex.ringBack) {
    const back = centred(tex.ringBack);
    back.rotation = tilt;
    root.addChild(back);
  }
  const body = centred(tex.body);
  body.rotation = tilt;
  const shadow = centred(sh.shadow);
  root.addChild(body, shadow);
  if (tex.glow) {
    const glow = centred(tex.glow);
    glow.rotation = tilt;
    root.addChild(glow);
  }
  const rim = centred(sh.rim);
  root.addChild(rim);
  if (tex.ringFront) {
    const front = centred(tex.ringFront);
    front.rotation = tilt;
    root.addChild(front);
  }
  root.addChild(moonFront);

  const moons: Moonlet[] = [];
  for (let i = 0; i < moonletCount(level); i++) {
    const sprite = centred(sh.moons[(i + slot) % sh.moons.length]!);
    sprite.scale.set((BR * between(rand, 0.17, 0.24)) / MOON_R);
    moons.push({
      sprite,
      dist: BR * (1.85 + i * 0.45),
      speed: between(rand, 0.6, 1.1) * (i % 2 ? -1 : 1) / (1 + i * 0.4),
      phase: rand() * TAU,
      tilt: tilt + between(rand, -0.3, 0.3),
    });
  }
  return { ring, slot, level, root, shadow, rim, moonBack, moonFront, moons };
}

export class OrbitalsView {
  /** Drawn under the star (rings and far-side planets) and over it (near-side planets). */
  readonly behind = new Container();
  readonly infront = new Container();
  private readonly rings = new Graphics();
  private planets: PlanetView[] = [];
  private openRings = 0;
  private key = '';
  private time = 0;

  constructor() {
    // planets nearer the viewer (lower on screen) draw over farther ones
    this.behind.sortableChildren = true;
    this.infront.sortableChildren = true;
    this.rings.zIndex = -1e9;
    this.behind.addChild(this.rings);
  }

  /** "ring.slot:type:level|..." from the snapshot, and how many rings are open. */
  set(planets: string, openRings: number): void {
    this.openRings = openRings;
    if (planets === this.key) return;
    this.key = planets;
    for (const p of this.planets) p.root.destroy({ children: true });
    this.planets = planets
      .split('|')
      .filter(Boolean)
      .map((entry) => {
        const [at = '0.0', type = 'rocky', lv = '1'] = entry.split(':');
        const [ring = 0, slot = 0] = at.split('.').map(Number);
        const view = buildPlanet(ring, slot, type, Number(lv) || 1);
        this.behind.addChild(view.root);
        return view;
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
      p.root.visible = open;
      if (!open) continue;
      const a = (p.slot / slots) * Math.PI * 2 + this.time * (0.12 / (p.ring + 1));
      const x = cx + Math.cos(a) * rx(p.ring);
      const y = cy + Math.sin(a) * rx(p.ring) * tilt;
      const depth = Math.sin(a);
      const parent = depth > 0 ? this.infront : this.behind;
      if (p.root.parent !== parent) parent.addChild(p.root);
      p.root.zIndex = y;
      p.root.position.set(x, y);
      // a little bigger on the near side of the ring, a little smaller on the far side
      // and bigger with level, quickly at first, up to Lv 100
      const radius = R * (0.115 + 0.0275 * Math.min(2, Math.log10(1 + p.level)));
      p.root.scale.set((radius / BR) * (0.975 + 0.075 * depth));
      // the night side faces away from the star; planets crossing in front show more of it
      const light = Math.atan2(y - cy, x - cx);
      p.shadow.rotation = light;
      p.rim.rotation = light;
      p.shadow.alpha = 0.62 + 0.3 * depth;
      for (const m of p.moons) {
        const t = m.phase + this.time * m.speed;
        const ox = Math.cos(t) * m.dist;
        const oy = Math.sin(t) * m.dist * 0.34;
        const holder = Math.sin(t) > 0 ? p.moonFront : p.moonBack;
        if (m.sprite.parent !== holder) holder.addChild(m.sprite);
        m.sprite.position.set(ox * Math.cos(m.tilt) - oy * Math.sin(m.tilt), ox * Math.sin(m.tilt) + oy * Math.cos(m.tilt));
      }
    }
  }
}
