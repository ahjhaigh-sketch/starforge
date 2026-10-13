import { Container, Sprite, Texture } from 'pixi.js';
import { ENGINE_BY_ID, ENGINES } from '../content/engines';

/**
 * 1.3.0: the engines you own fly round the star as machines (the playtest: "maybe each one be a
 * different engine: a comet catcher, a void lantern, a Big Bang kiln, an infinity engine, a cosmic
 * string harp"). One machine per engine you own (the Spark Motes keep their own swarm), each
 * painted once on a 2D canvas in the chunky ink-outlined look and cached. They travel a tilted
 * band just outside the motes; on the far side they pass behind the star. Some spin as they go
 * (turbines, gears, the Galaxy Spinner), and every machine bobs a little. Reduced motion holds
 * them still.
 */

const TAU = Math.PI * 2;
const INK = '#140B2E';
const TEX = 96;
const C = TEX / 2;

type Paint = (ctx: CanvasRenderingContext2D, color: string) => void;

// ---------- small painting helpers (all in a 96 px frame, centre 48) ----------

function shade(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function inked(ctx: CanvasRenderingContext2D, fill: string | CanvasGradient, width = 5): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = width;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function ball(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, shade(color, 0.55));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.35));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  inked(ctx, g, Math.max(3, r * 0.22));
}

function shine(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = -0.6): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 0.55): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.startsWith('#') ? `${color}` : color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

function poly(ctx: CanvasRenderingContext2D, pts: Array<[number, number]>): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, points = 5, inner = 0.45): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * TAU - Math.PI / 2;
    const k = i % 2 === 0 ? r : r * inner;
    pts.push([x + Math.cos(a) * k, y + Math.sin(a) * k]);
  }
  poly(ctx, pts);
}

function gear(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, teeth: number, color: string): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * TAU;
    const k = i % 4 < 2 ? r : r * 0.78;
    pts.push([x + Math.cos(a) * k, y + Math.sin(a) * k]);
  }
  poly(ctx, pts);
  inked(ctx, color, 4);
}

function flame(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, outer: string, inner: string): void {
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.bezierCurveTo(x + h * 0.55, y - h * 0.4, x + h * 0.45, y + h * 0.15, x, y + h * 0.2);
  ctx.bezierCurveTo(x - h * 0.45, y + h * 0.15, x - h * 0.55, y - h * 0.4, x, y - h);
  inked(ctx, outer, 3.5);
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.55);
  ctx.bezierCurveTo(x + h * 0.25, y - h * 0.2, x + h * 0.2, y + h * 0.08, x, y + h * 0.1);
  ctx.bezierCurveTo(x - h * 0.2, y + h * 0.08, x - h * 0.25, y - h * 0.2, x, y - h * 0.55);
  ctx.fillStyle = inner;
  ctx.fill();
}

// ---------- one painter per engine ----------

const PAINTERS: Record<string, Paint> = {
  // a ring of gravity netting with a comet caught in it
  catcher: (ctx, c) => {
    ctx.save();
    ctx.translate(C, C);
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 32, 0, 0, TAU);
    ctx.lineWidth = 9;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = c;
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = shade(c, 0.5);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 12, -30);
      ctx.lineTo(i * 12, 30);
      ctx.moveTo(-30, i * 12);
      ctx.lineTo(30, i * 12);
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(C - 34, C + 30);
    ctx.lineTo(C + 6, C + 4);
    ctx.lineTo(C + 2, C - 4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(159,231,255,0.8)';
    ctx.fill();
    ball(ctx, C + 6, C - 2, 9, '#E8F8FF');
  },
  // a moon with a little mill wheel turning on top
  moonmill: (ctx, c) => {
    ball(ctx, C, C + 8, 26, '#B9C4FF');
    for (const [x, y, r] of [
      [C - 9, C + 4, 5],
      [C + 10, C + 16, 4],
      [C + 4, C - 2, 3],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = 'rgba(20,11,46,0.25)';
      ctx.fill();
    }
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(C, C - 22);
      ctx.rotate((i * TAU) / 4 + 0.4);
      ctx.beginPath();
      ctx.rect(-3, -20, 6, 20);
      inked(ctx, c, 3);
      ctx.restore();
    }
    ball(ctx, C, C - 22, 5, shade(c, 0.3));
  },
  // a rock with a spinning drill cone
  drill: (ctx, c) => {
    poly(ctx, [
      [C - 30, C + 6],
      [C - 18, C - 18],
      [C + 6, C - 24],
      [C + 22, C - 6],
      [C + 14, C + 20],
      [C - 12, C + 26],
    ]);
    inked(ctx, '#8C7A6A');
    poly(ctx, [
      [C + 12, C - 8],
      [C + 40, C - 2],
      [C + 14, C + 8],
    ]);
    inked(ctx, c, 4);
    ctx.lineWidth = 2;
    ctx.strokeStyle = shade(c, 0.5);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(C + 18 + k * 7, C - 6 + k);
      ctx.lineTo(C + 16 + k * 7, C + 6 - k);
      ctx.stroke();
    }
  },
  // a striped gas giant with a straw sipping a storm
  siphon: (ctx, c) => {
    ball(ctx, C - 4, C + 4, 28, c);
    ctx.save();
    ctx.beginPath();
    ctx.arc(C - 4, C + 4, 26, 0, TAU);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = -2; i <= 2; i++) ctx.fillRect(C - 34, C + i * 11, 64, 5);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(C + 14, C - 10);
    ctx.lineTo(C + 36, C - 36);
    ctx.lineWidth = 9;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#FF7AE0';
    ctx.stroke();
  },
  // a triangular sail on a mast, catching the star wind
  sail: (ctx, c) => {
    ctx.beginPath();
    ctx.moveTo(C - 4, C - 36);
    ctx.lineTo(C - 4, C + 34);
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(C, C - 32);
    ctx.quadraticCurveTo(C + 40, C - 4, C, C + 24);
    ctx.closePath();
    inked(ctx, shade(c, 0.35));
    ctx.beginPath();
    ctx.moveTo(C - 8, C - 28);
    ctx.quadraticCurveTo(C - 34, C, C - 8, C + 20);
    ctx.closePath();
    inked(ctx, c);
  },
  // a hexagonal mirror lattice with a hot centre
  dyson: (ctx, c) => {
    glow(ctx, C, C, 26, '#FFE08A', 0.7);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU;
      const x = C + Math.cos(a) * 24;
      const y = C + Math.sin(a) * 24;
      const pts: Array<[number, number]> = [];
      for (let i = 0; i < 6; i++) pts.push([x + Math.cos((i / 6) * TAU) * 11, y + Math.sin((i / 6) * TAU) * 11]);
      poly(ctx, pts);
      inked(ctx, k % 2 ? c : shade(c, 0.35), 3.5);
    }
  },
  // a lighthouse tower with two beams
  pulsar: (ctx, c) => {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = shade(c, 0.6);
    poly(ctx, [
      [C, C - 22],
      [C - 46, C - 40],
      [C - 46, C - 26],
    ]);
    ctx.fill();
    poly(ctx, [
      [C, C - 22],
      [C + 46, C - 4],
      [C + 46, C - 18],
    ]);
    ctx.fill();
    ctx.globalAlpha = 1;
    poly(ctx, [
      [C - 10, C + 34],
      [C - 7, C - 14],
      [C + 7, C - 14],
      [C + 10, C + 34],
    ]);
    inked(ctx, c);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(C - 6, C + 2, 12, 5);
    ball(ctx, C, C - 22, 9, '#FFF6D0');
  },
  // a glowing disc with two jets
  quasar: (ctx, c) => {
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(C - 5, C);
      ctx.lineTo(C + d * 6, C - d * 44);
      ctx.lineTo(C + 5, C);
      ctx.fillStyle = 'rgba(159,231,255,0.85)';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(C, C, 38, 12, -0.2, 0, TAU);
    inked(ctx, c, 4);
    ctx.beginPath();
    ctx.ellipse(C, C, 24, 7, -0.2, 0, TAU);
    ctx.fillStyle = shade(c, 0.5);
    ctx.fill();
    ball(ctx, C, C, 8, '#140B2E');
  },
  // three little singing stars and a note
  choir: (ctx, c) => {
    for (const [x, y, r] of [
      [C - 18, C + 10, 13],
      [C + 16, C + 12, 11],
      [C, C - 14, 15],
    ] as const) {
      star(ctx, x, y, r);
      inked(ctx, shade(c, 0.25), 3.5);
      ctx.beginPath();
      ctx.arc(x, y + r * 0.25, r * 0.22, 0, Math.PI);
      ctx.fillStyle = INK;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(C + 30, C - 26, 5, 4, -0.4, 0, TAU);
    ctx.moveTo(C + 34, C - 27);
    ctx.lineTo(C + 34, C - 44);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fill();
  },
  // a spindle wound with starlight thread
  loom: (ctx, c) => {
    ctx.beginPath();
    ctx.moveTo(C - 30, C + 30);
    ctx.lineTo(C + 30, C - 30);
    ctx.lineWidth = 8;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#E8C99A';
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(C, C, 20, 13, -Math.PI / 4, 0, TAU);
    inked(ctx, c);
    ctx.lineWidth = 2;
    ctx.strokeStyle = shade(c, 0.6);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(C, C, 18, 4 + Math.abs(i) * 2, -Math.PI / 4 + i * 0.25, 0, TAU);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(C + 14, C - 6);
    ctx.quadraticCurveTo(C + 40, C + 4, C + 30, C + 34);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#FFE08A';
    ctx.stroke();
  },
  // a three-bladed turbine (spins)
  turbine: (ctx, c) => {
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(C, C);
      ctx.rotate((i * TAU) / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(10, -10, 14, -30, 4, -40);
      ctx.bezierCurveTo(-6, -30, -8, -12, 0, 0);
      inked(ctx, i === 0 ? shade(c, 0.35) : c, 3.5);
      ctx.restore();
    }
    ball(ctx, C, C, 8, '#E8E0FF');
  },
  // bellows breathing a puff of cloud
  bellows: (ctx, c) => {
    poly(ctx, [
      [C - 30, C - 20],
      [C + 10, C - 8],
      [C + 10, C + 8],
      [C - 30, C + 20],
    ]);
    inked(ctx, c);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(C - 30 + i * 10, C - 20 + i * 3);
      ctx.lineTo(C - 30 + i * 10, C + 20 - i * 3);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.rect(C + 8, C - 4, 12, 8);
    inked(ctx, '#8C97C2', 3);
    for (const [x, y, r] of [
      [C + 30, C - 4, 8],
      [C + 38, C + 6, 6],
      [C + 26, C + 8, 5],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = 'rgba(232,224,255,0.85)';
      ctx.fill();
    }
  },
  // a crucible pouring molten comet ice
  foundry: (ctx, c) => {
    glow(ctx, C, C + 6, 30, '#FF7A2E', 0.5);
    poly(ctx, [
      [C - 26, C - 18],
      [C + 26, C - 18],
      [C + 18, C + 22],
      [C - 18, C + 22],
    ]);
    inked(ctx, c);
    ctx.beginPath();
    ctx.ellipse(C, C - 18, 26, 7, 0, 0, TAU);
    inked(ctx, '#FFC83D', 3.5);
    ctx.beginPath();
    ctx.moveTo(C + 22, C - 16);
    ctx.quadraticCurveTo(C + 38, C - 10, C + 34, C + 30);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#FF9A3D';
    ctx.stroke();
  },
  // a lantern burning a dark violet flame
  lantern: (ctx, c) => {
    ctx.beginPath();
    ctx.arc(C, C - 34, 6, Math.PI, 0);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    poly(ctx, [
      [C - 16, C - 28],
      [C + 16, C - 28],
      [C + 20, C - 22],
      [C - 20, C - 22],
    ]);
    inked(ctx, shade(c, -0.2), 3.5);
    ctx.beginPath();
    ctx.rect(C - 16, C - 22, 32, 40);
    inked(ctx, 'rgba(20,11,46,0.75)', 4);
    glow(ctx, C, C, 24, '#B06BFF', 0.8);
    flame(ctx, C, C + 4, 14, c, '#E8E0FF');
    poly(ctx, [
      [C - 20, C + 18],
      [C + 20, C + 18],
      [C + 16, C + 26],
      [C - 16, C + 26],
    ]);
    inked(ctx, shade(c, -0.2), 3.5);
  },
  // a coil spring with magnetic field lines
  magnetar: (ctx, c) => {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,158,240,0.6)';
    for (const k of [18, 30]) {
      ctx.beginPath();
      ctx.ellipse(C - k * 0.6, C, k * 0.6, k, 0, 0, TAU);
      ctx.ellipse(C + k * 0.6, C, k * 0.6, k, 0, 0, TAU);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(C, C - 16 + i * 8, 14, 5, 0, 0, TAU);
      ctx.lineWidth = 6;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = i % 2 ? c : shade(c, 0.4);
      ctx.stroke();
    }
  },
  // two plates squeezing a shining neutron star
  press: (ctx, c) => {
    glow(ctx, C, C, 20, '#B8D4FF', 0.9);
    ball(ctx, C, C, 9, '#F4F1FF');
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.rect(C - 30, C + d * 14 - (d < 0 ? 10 : 0), 60, 10);
      inked(ctx, c, 4);
      ctx.beginPath();
      ctx.rect(C - 4, C + d * 24 - (d < 0 ? 12 : 0), 8, 12);
      inked(ctx, shade(c, -0.25), 3);
    }
  },
  // branching coral made of plasma
  reef: (ctx, c) => {
    const branch = (x: number, y: number, a: number, len: number, depth: number) => {
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 3 + depth * 2.2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.lineWidth = 1 + depth * 2.2;
      ctx.strokeStyle = depth > 1 ? c : shade(c, 0.5);
      ctx.stroke();
      if (depth > 0) {
        branch(x2, y2, a - 0.5, len * 0.7, depth - 1);
        branch(x2, y2, a + 0.45, len * 0.7, depth - 1);
      }
    };
    branch(C, C + 34, -Math.PI / 2, 22, 3);
    ball(ctx, C + 18, C - 24, 4, '#FFFFFF');
    ball(ctx, C - 20, C - 20, 3, '#FFFFFF');
  },
  // a funnel with light pumped up out of it
  wellpump: (ctx, c) => {
    ctx.beginPath();
    ctx.ellipse(C, C + 16, 32, 10, 0, 0, TAU);
    inked(ctx, '#140B2E', 4);
    ctx.beginPath();
    ctx.ellipse(C, C + 16, 22, 6, 0, 0, TAU);
    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    ctx.stroke();
    poly(ctx, [
      [C, C - 38],
      [C + 14, C - 18],
      [C + 6, C - 18],
      [C + 6, C + 10],
      [C - 6, C + 10],
      [C - 6, C - 18],
      [C - 14, C - 18],
    ]);
    inked(ctx, '#FFE08A', 3.5);
  },
  // a ring of fire around a giant
  crown: (ctx, c) => {
    ball(ctx, C, C + 6, 18, '#FF9A3D');
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      flame(ctx, C + Math.cos(a) * 26, C + 6 + Math.sin(a) * 26, 10, c, '#FFF3B0');
    }
  },
  // an egg cracking open with a baby comet
  hatchery: (ctx, c) => {
    ctx.beginPath();
    ctx.ellipse(C, C + 6, 22, 28, 0, 0, TAU);
    inked(ctx, '#F2F6FF');
    ctx.beginPath();
    ctx.moveTo(C - 22, C);
    for (let i = 0; i <= 8; i++) ctx.lineTo(C - 22 + i * 5.5, C + (i % 2 ? -6 : 2));
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(C - 30, C - 34);
    ctx.lineTo(C + 2, C - 16);
    ctx.lineTo(C - 2, C - 10);
    ctx.closePath();
    ctx.fillStyle = 'rgba(159,231,255,0.85)';
    ctx.fill();
    ball(ctx, C + 2, C - 14, 8, c);
  },
  // a bowl brimming with saved starlight
  reservoir: (ctx, c) => {
    glow(ctx, C, C - 4, 30, '#FFE08A', 0.7);
    ctx.beginPath();
    ctx.arc(C, C - 6, 30, 0, Math.PI);
    ctx.closePath();
    inked(ctx, shade(c, -0.2));
    ctx.beginPath();
    ctx.ellipse(C, C - 6, 30, 8, 0, 0, TAU);
    inked(ctx, '#FFF3B0', 4);
    for (let i = 0; i < 3; i++) {
      star(ctx, C - 14 + i * 14, C - 20 - (i % 2) * 8, 5, 4, 0.4);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }
  },
  // a furnace with a small supernova inside
  novaforge: (ctx, c) => {
    ctx.beginPath();
    ctx.roundRect(C - 26, C - 22, 52, 46, 10);
    inked(ctx, shade(c, -0.35));
    ctx.beginPath();
    ctx.arc(C, C + 2, 15, 0, TAU);
    inked(ctx, '#140B2E', 3.5);
    glow(ctx, C, C + 2, 16, '#FF4FC1', 0.95);
    star(ctx, C, C + 2, 11, 8, 0.4);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.beginPath();
    ctx.rect(C - 6, C - 36, 12, 14);
    inked(ctx, shade(c, -0.35), 3.5);
  },
  // a gear with a dark core (spins)
  dmmill: (ctx, c) => {
    gear(ctx, C, C, 34, 9, c);
    ctx.beginPath();
    ctx.arc(C, C, 16, 0, TAU);
    inked(ctx, '#140B2E', 4);
    glow(ctx, C, C, 14, '#6B4BC8', 0.9);
  },
  // a ring portal with a tap dripping stardust
  wormtap: (ctx, c) => {
    ctx.beginPath();
    ctx.ellipse(C - 4, C - 4, 26, 26, 0, 0, TAU);
    ctx.lineWidth = 12;
    ctx.strokeStyle = INK;
    ctx.stroke();
    const g = ctx.createRadialGradient(C - 4, C - 4, 4, C - 4, C - 4, 26);
    g.addColorStop(0, '#E8E0FF');
    g.addColorStop(1, c);
    ctx.lineWidth = 7;
    ctx.strokeStyle = g;
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(C + 14, C + 14, 18, 7);
    inked(ctx, '#8C97C2', 3);
    ctx.beginPath();
    ctx.arc(C + 28, C + 32, 4, 0, TAU);
    ctx.fillStyle = '#FFC83D';
    ctx.fill();
  },
  // a spiral galaxy pinwheel (spins)
  spinner: (ctx, c) => {
    glow(ctx, C, C, 34, c, 0.5);
    for (let arm = 0; arm < 3; arm++) {
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        const a = arm * (TAU / 3) + t * 3.2;
        const r = 4 + t * 34;
        const x = C + Math.cos(a) * r;
        const y = C + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineWidth = 9;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.strokeStyle = arm === 0 ? shade(c, 0.4) : c;
      ctx.stroke();
    }
    ball(ctx, C, C, 8, '#FFF3B0');
  },
  // a harp frame strung with glowing cosmic strings
  harp: (ctx, c) => {
    ctx.beginPath();
    ctx.moveTo(C - 24, C + 34);
    ctx.lineTo(C - 24, C - 30);
    ctx.quadraticCurveTo(C + 10, C - 44, C + 28, C - 12);
    ctx.lineTo(C - 24, C + 34);
    ctx.lineWidth = 9;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = c;
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const x = C - 16 + i * 9;
      ctx.beginPath();
      ctx.moveTo(x, C - 32 + i * 4);
      ctx.lineTo(x, C + 26 - i * 9);
      ctx.lineWidth = 2;
      ctx.strokeStyle = i % 2 ? '#9FE7FF' : '#FFE08A';
      ctx.stroke();
    }
  },
  // a hexagonal time crystal with a clock hand
  crystal: (ctx, c) => {
    poly(ctx, [
      [C, C - 40],
      [C + 22, C - 16],
      [C + 22, C + 16],
      [C, C + 40],
      [C - 22, C + 16],
      [C - 22, C - 16],
    ]);
    const g = ctx.createLinearGradient(C - 22, C - 40, C + 22, C + 40);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.5, c);
    g.addColorStop(1, shade(c, -0.3));
    inked(ctx, g);
    ctx.beginPath();
    ctx.moveTo(C, C - 40);
    ctx.lineTo(C, C + 40);
    ctx.moveTo(C - 22, C - 16);
    ctx.lineTo(C + 22, C + 16);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(C, C, 10, 0, TAU);
    inked(ctx, '#140B2E', 3);
    ctx.beginPath();
    ctx.moveTo(C, C);
    ctx.lineTo(C + 6, C - 6);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  },
  // a domed kiln firing a tiny universe
  kiln: (ctx, c) => {
    ctx.beginPath();
    ctx.moveTo(C - 30, C + 28);
    ctx.lineTo(C - 30, C);
    ctx.arc(C, C, 30, Math.PI, 0);
    ctx.lineTo(C + 30, C + 28);
    ctx.closePath();
    inked(ctx, shade(c, -0.25));
    ctx.beginPath();
    ctx.arc(C, C + 4, 14, Math.PI, 0);
    ctx.lineTo(C + 14, C + 28);
    ctx.lineTo(C - 14, C + 28);
    ctx.closePath();
    inked(ctx, '#140B2E', 3.5);
    glow(ctx, C, C + 14, 18, '#FFC83D', 1);
    for (const [x, y, col] of [
      [C - 5, C + 12, '#FF4FC1'],
      [C + 6, C + 18, '#2EE6FF'],
      [C + 1, C + 8, '#FFFFFF'],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, TAU);
      ctx.fillStyle = col;
      ctx.fill();
    }
    flame(ctx, C, C - 34, 9, '#FF9A3D', '#FFF3B0');
  },
  // a glowing infinity loop with a bolt at its heart
  infinity: (ctx, c) => {
    glow(ctx, C, C, 40, c, 0.55);
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const t = (i / 80) * TAU;
      const d = 1 + Math.sin(t) ** 2;
      const x = C + (38 * Math.cos(t)) / d;
      const y = C + (38 * Math.sin(t) * Math.cos(t)) / d;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = 13;
    ctx.strokeStyle = INK;
    ctx.stroke();
    const g = ctx.createLinearGradient(C - 38, C, C + 38, C);
    g.addColorStop(0, '#FF4FC1');
    g.addColorStop(0.5, '#FFFFFF');
    g.addColorStop(1, '#2EE6FF');
    ctx.lineWidth = 7;
    ctx.strokeStyle = g;
    ctx.stroke();
    poly(ctx, [
      [C + 2, C - 12],
      [C - 6, C + 2],
      [C, C + 2],
      [C - 2, C + 12],
      [C + 6, C - 2],
      [C, C - 2],
    ]);
    inked(ctx, '#FFE08A', 2.5);
  },
};

/** Engines that spin as they orbit, and how fast (turns a second). */
const SPIN: Record<string, number> = { turbine: 0.6, dmmill: 0.3, spinner: 0.25, catcher: 0.08, moonmill: 0.12 };

const cache = new Map<string, Texture>();
function textureOf(id: string): Texture {
  let t = cache.get(id);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  const ctx = c.getContext('2d')!;
  const def = ENGINE_BY_ID.get(id);
  const paint = PAINTERS[id];
  // a soft halo in the engine's colour sets each machine apart from the sky and the motes
  if (def) glow(ctx, C, C, C, def.color, 0.45);
  if (paint && def) paint(ctx, def.color);
  else {
    ball(ctx, C, C, 22, def?.color ?? '#FFC83D');
    shine(ctx, C - 8, C - 8, 7, 4);
  }
  t = Texture.from(c);
  cache.set(id, t);
  return t;
}

interface Machine {
  id: string;
  sprite: Sprite;
  phase: number;
  band: number;
  speed: number;
}

export class EngineOrbits {
  readonly behind = new Container();
  readonly infront = new Container();
  private machines: Machine[] = [];
  private key = '';
  private time = 0;

  /** "catcher|moonmill|...": the engines you own, in shop order (the snapshot sends it). */
  set(list: string): void {
    if (list === this.key) return;
    this.key = list;
    const want = list.split('|').filter((id) => id && ENGINE_BY_ID.has(id));
    const keep = new Map(this.machines.map((m) => [m.id, m]));
    this.machines = want.map((id) => {
      const had = keep.get(id);
      if (had) return had;
      const sprite = new Sprite(textureOf(id));
      sprite.anchor.set(0.5);
      this.behind.addChild(sprite);
      const k = ENGINES.findIndex((e) => e.id === id);
      return { id, sprite, phase: k * 2.399, band: k % 2, speed: 0.11 + (k % 5) * 0.018 };
    });
    for (const [id, m] of keep) if (!want.includes(id)) m.sprite.destroy();
  }

  update(dt: number, cx: number, cy: number, R: number, still: boolean): void {
    if (!still) this.time += dt;
    // two bands on an ellipse tilted against the planets' rings, tall enough to clear the star's disc
    const size = Math.max(26, R * 0.46) / TEX;
    const tilt = -0.32;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    for (const m of this.machines) {
      const rx = R * (1.78 + m.band * 0.2);
      const ry = rx * 0.62;
      const a = m.phase + this.time * m.speed;
      const ex = Math.cos(a) * rx;
      const ey = Math.sin(a) * ry;
      const x = cx + ex * ct - ey * st;
      const y = cy + ex * st + ey * ct + Math.sin(this.time * 1.7 + m.phase) * R * 0.02;
      const front = Math.sin(a) > 0;
      const parent = front ? this.infront : this.behind;
      if (m.sprite.parent !== parent) parent.addChild(m.sprite);
      m.sprite.position.set(x, y);
      m.sprite.scale.set(size * (front ? 1.08 : 0.84));
      m.sprite.alpha = front ? 1 : 0.78;
      m.sprite.rotation = (SPIN[m.id] ?? 0) * this.time * TAU + (SPIN[m.id] ? 0 : Math.sin(this.time + m.phase) * 0.12);
    }
  }
}
