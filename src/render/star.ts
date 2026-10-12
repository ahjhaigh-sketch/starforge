import { Container, Geometry, Mesh, Shader, Sprite } from 'pixi.js';
import { TIERS, type TierDef } from '../content/tiers';
import { textures } from './textures';

/**
 * The Star Core: one quad drawn by a fragment shader. The body is a glowing ball of plasma:
 * boiling convection cells over slow large-scale flows, limb darkening, a bright chromosphere rim
 * and the ink outline. Around it: a layered corona, soft tapering rays and coronal streamers, plus
 * what the tier brings (sunspots, flame tongues and prominence loops, magnetic field lines, pulsar
 * beams, quasar jets and disk, rainbow fringe). Colours, size and style ease to the new tier's.
 *
 * Every animated term is periodic in uTime and uBoil, which wrap at 1000 x 2pi seconds, so long
 * sessions keep full precision without a visible jump (keep time multipliers to 3 decimals).
 */
const vertex = /* glsl */ `
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
}
`;

const fragment = /* glsl */ `
in vec2 vUV;
out vec4 finalColor;

uniform highp float uTime;
uniform highp float uBoil;
uniform highp vec2 uDrift;
uniform float uExtent;
uniform vec3 uHot;
uniform vec3 uBody;
uniform vec3 uCorona;
uniform float uRays;
uniform float uRayLen;
uniform float uChurn;
uniform float uFeature;
uniform float uSpin;
uniform float uPx;
uniform float uFlash;
uniform float uSkin;
// x granule cells per radius, y sunspots, z flame tongues and prominences, w magnetic field lines
uniform vec4 uStyle;
// x granulation contrast, y limb darkening, z iridescence, w accretion disk
uniform vec4 uStyle2;

#define TAU 6.2831853

// hashes and noise run in highp: phones run mediump at half precision, which breaks hashing
highp float hash12(highp vec2 p) {
  highp vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
highp vec2 hash22(highp vec2 p) {
  highp vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float vnoise(highp vec2 p) {
  highp vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// noise round the star: n cells (a whole number, so it wraps), each cell breathing over time
float ring(float x, float n, float seed, highp float t, float speed) {
  float i = floor(x);
  float f = x - i;
  float a = sin(t * speed + hash12(vec2(mod(i, n), seed)) * TAU);
  float b = sin(t * speed + hash12(vec2(mod(i + 1.0, n), seed)) * TAU);
  return 0.5 + 0.5 * mix(a, b, f * f * (3.0 - 2.0 * f));
}
// boiling convection cells: x distance to the cell's centre, y distance to the lane between
// cells, z the cell's own random value; the cell centres wander as uBoil turns
vec3 cells(highp vec2 p) {
  highp vec2 i = floor(p);
  vec2 f = p - i;
  float d1 = 9.0;
  float d2 = 9.0;
  float id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      highp vec2 h = hash22(i + g);
      vec2 o = g + 0.5 + 0.4 * sin(uBoil + TAU * h) - f;
      float d = dot(o, o);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = h.x;
      } else {
        d2 = min(d2, d);
      }
    }
  }
  d1 = sqrt(d1);
  return vec3(d1, sqrt(d2) - d1, id);
}
vec3 hue(float h) {
  return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
}

// ---- the corona: glow, rays, streamers and the tier's outer features (premultiplied) ----
vec4 corona(highp vec2 p, float r, float a, vec2 dir, highp float t, highp float spin, vec2 bd, vec3 tint) {
  float d = max(r - 1.0, 0.0);
  // everything outside the body fades to nothing before the quad edge, so no box ever shows
  float edgeFade = 1.0 - smoothstep(uExtent * 0.7, uExtent * 0.97, r);
  vec3 warm = mix(uCorona, uHot, 0.45);

  // layered glow: a tight skin of bright light, then a wide soft corona
  float gIn = exp(-d * 7.0) * smoothstep(0.9, 1.0, r);
  float gOut = exp(-d * 1.6) * smoothstep(0.6, 1.0, r);
  vec3 rgb = warm * gIn * 0.6 + tint * gOut * 0.48;
  float lum = gIn * 0.6 + gOut * 0.48;

  // rays: soft, tapering to a point, long and short in turn, a hot core line, ripples running out
  float seg = (a + spin) / TAU * uRays;
  float idx = floor(seg + 0.5);
  float fa = abs(seg - idx) * 2.0;
  float id = mod(idx, uRays);
  float rnd = hash12(vec2(id, 17.0));
  float len = 1.0 + (uRayLen - 1.0) * (0.9 + 0.1 * sin(t * 1.3 + id * 1.7)) * (1.0 - mod(id, 2.0) * 0.3);
  float h = clamp(d / max(len - 1.0, 0.05), 0.0, 1.0);
  float w = 0.56 * (1.0 - h) + 0.025;
  float xr = fa / w;
  float base = smoothstep(-0.02, 0.05, d);
  float shimmer = 0.84 + 0.16 * sin(d * 10.0 - t * 2.0 + rnd * TAU);
  float ray = exp(-xr * xr * 2.4) * pow(1.0 - h, 1.25) * shimmer * base;
  float core = exp(-xr * xr * 22.0) * (1.0 - h) * (1.0 - h) * base;
  rgb += tint * ray * 0.95 + uHot * core * 0.5;
  lum += ray * 0.95 + core * 0.5;

  // coronal streamers: many faint threads turning the other way
  float m = uRays * 3.0;
  float st = ring((a - spin) / TAU * m, m, 5.0, t, 0.7);
  st = st * st * st * exp(-d * 2.3) * smoothstep(0.02, 0.16, d);
  rgb += tint * st * 0.4;
  lum += st * 0.4;

  // flame tongues licking off the limb, and prominence loops that rise and fade away
  if (uStyle.z > 0.01 && d < 0.75) {
    float fx = (a + spin) / TAU * 20.0;
    float fh = ring(fx, 20.0, 3.0, t, 0.9) * 0.6 + ring(fx * 2.0, 40.0, 4.0, t, 1.7) * 0.4;
    fh = (0.035 + 0.2 * fh * fh) * uStyle.z;
    float flame = (1.0 - smoothstep(fh * 0.3, fh, d)) * base;
    rgb += mix(uCorona, uHot, 0.6 * (1.0 - d / fh)) * flame * 0.8;
    lum += flame * 0.8;
    float loops = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float life = smoothstep(0.3, 0.9, 0.5 + 0.5 * sin(t * 0.21 + fi * 2.3));
      float th = fi * 2.09 + 0.7 + spin;
      vec2 nr = vec2(cos(th), sin(th));
      float u = dot(p, vec2(-nr.y, nr.x));
      float v = dot(p, nr) - 0.95;
      float lw = 0.11 + 0.04 * fi;
      float lh = (0.17 + 0.07 * fi) * (0.55 + 0.45 * life) * (0.55 + 0.45 * uStyle.z);
      vec2 q = vec2(u / lw, v / lh);
      float e = length(q) - 1.0;
      // brighter knots run along the arch
      float knot = 0.6 + 0.4 * sin(atan(q.y, q.x) * 5.0 + t * 1.1 + fi);
      loops += (exp(-e * e * 80.0) * knot + exp(-e * e * 18.0) * 0.12) * smoothstep(-0.02, 0.05, v) * life;
    }
    loops *= min(uStyle.z * 1.5, 1.0) * base;
    rgb += mix(uCorona, uHot, 0.55) * loops;
    lum += loops;
  }

  // magnetic field lines of a dipole (r = L sin^2): fixed and tilted on a magnetar, turning with
  // the beams on a pulsar; pulses run along them from pole to pole
  if (uStyle.w > 0.01) {
    vec2 ax = uFeature > 0.5 && uFeature < 1.5 ? bd : vec2(0.34, -0.94);
    float ct = dot(dir, ax);
    float s2 = max(1.0 - ct * ct, 0.03);
    float lv = r / s2;
    float k = log(lv) * 4.0;
    float dist = abs(fract(k + 0.5) - 0.5);
    float px = 4.0 / r * sqrt(1.0 + 4.0 * ct * ct / s2) * uPx;
    float line = 1.0 - smoothstep(px * 0.6, px * 2.0, dist);
    float soft = exp(-dist * dist * 40.0);
    float reach = smoothstep(1.15, 1.35, lv) * (1.0 - smoothstep(uExtent * 0.6, uExtent * 0.8, lv)) * smoothstep(1.0, 1.08, r);
    float flow = 0.5 + 0.5 * sin(ct * 10.0 - t * 2.0 + floor(k + 0.5) * 1.9);
    float mg = (line * (0.4 + 0.6 * flow) + soft * 0.22) * reach * uStyle.w;
    rgb += tint * mg;
    lum += mg * 0.8;
  }

  if (uFeature > 0.5 && uFeature < 1.5) {
    // pulsar: two beams sweeping round, a white-hot core in a widening cone
    float along = abs(dot(p, bd));
    float across = abs(dot(p, vec2(-bd.y, bd.x)));
    float bx = across / (0.05 + along * 0.07);
    float reach = (1.0 - smoothstep(1.3, uExtent * 0.96, along)) * smoothstep(0.92, 1.12, r);
    float beam = (exp(-bx * bx * 1.4) * 0.85 + exp(-bx * bx * 0.12) * 0.22) * reach;
    float bcore = exp(-bx * bx * 14.0) * reach;
    rgb += mix(tint, uHot, 0.35) * beam + uHot * bcore * 0.7;
    lum += beam + bcore * 0.7;
  } else if (uFeature > 1.5 && uFeature < 2.5) {
    // quasar and blazar: twin jets with knots running out, a slight corkscrew, and a disk edge-on
    float along = abs(p.y);
    float across = abs(p.x + sin(along * 3.0 - t * 2.0) * 0.035 * max(along - 1.0, 0.0));
    float jx = across / (0.045 + along * 0.055);
    float reach = smoothstep(0.92, 1.2, along) * (1.0 - smoothstep(1.4, uExtent * 0.96, along));
    float knots = 0.6 + 0.4 * sin(along * 7.0 - t * 6.0);
    float jet = (exp(-jx * jx * 1.5) * knots + exp(-jx * jx * 0.1) * 0.2) * reach;
    float jcore = exp(-jx * jx * 14.0) * reach;
    rgb += mix(tint, uHot, 0.3) * jet + uHot * jcore * 0.7;
    lum += jet + jcore * 0.7;
    float dx = abs(p.x);
    float dh = abs(p.y) / (0.04 + 0.05 * dx);
    float disk = exp(-dh * dh) * smoothstep(0.95, 1.25, dx) * (1.0 - smoothstep(1.5, uExtent * 0.9, dx)) * (p.x < 0.0 ? 1.0 : 0.6) * uStyle2.w;
    rgb += mix(uCorona, uHot, 0.5) * disk * 0.8;
    lum += disk * 0.8;
  }

  return vec4(rgb, clamp(lum * 0.4, 0.0, 1.0)) * edgeFade;
}

// ---- the body: a ball of boiling plasma ----
vec3 surface(float r, float a, vec2 dir, highp float t, highp float spin, vec2 bd) {
  float r1 = min(r, 0.999);
  float mu = sqrt(1.0 - r1 * r1);
  // azimuthal equidistant map: cells keep their size in the middle and squash towards the limb
  highp vec2 sp = dir * asin(r1);
  float n0 = vnoise(sp * 1.4 + uDrift);
  float n1 = vnoise(sp * 2.9 - uDrift * 1.3 + 7.3);
  float n2 = vnoise(sp * 6.1 + uDrift.yx * 1.7 + 3.1);
  float big = n0 * 0.5 + n1 * 0.32 + n2 * 0.18;
  // granulation: bright domed cells between dark lanes, warped by the big flows
  vec3 ce = cells(sp * uStyle.x + (vec2(n1, n2) - 0.5) * 1.6);
  float lane = smoothstep(0.0, 0.45, ce.y);
  float gran = ((1.0 - smoothstep(0.0, 0.85, ce.x)) * 0.82 + lane * 0.18) * (0.75 + 0.25 * ce.z);
  float heat = mix(0.5, big * 0.75 + gran * 0.42 - 0.15, uStyle2.x);

  // the cool lanes burn deeper and more saturated rather than going brown
  vec3 deep = uBody * uCorona * 0.8;
  vec3 c = mix(deep, uBody, smoothstep(0.0, 0.45, heat));
  c = mix(c, mix(uBody, uHot, 0.6), smoothstep(0.45, 0.8, heat));
  c = mix(c, uHot, smoothstep(0.75, 1.0, heat) * 0.8);

  // sunspots: a dark umbra in a darker penumbra, with bright faculae round them
  if (uStyle.y > 0.01) {
    // a few round spots on a coarse grid (one in five cells), drifting slowly with the flows
    highp vec2 sq = sp * 1.8 + uDrift * 0.25 + 11.0;
    highp vec2 si = floor(sq);
    float on = step(0.8, hash12(si + 9.1)) * uStyle.y;
    vec2 sc = 0.36 + 0.28 * hash22(si + 3.7);
    float sd = length(vec2(sq - si) - sc) / (0.17 + 0.09 * hash12(si + 2.3)) + (n2 - 0.5) * 0.3;
    float pen = (1.0 - smoothstep(0.75, 1.0, sd)) * on;
    float umb = (1.0 - smoothstep(0.3, 0.48, sd)) * on;
    float fac = (1.0 - smoothstep(1.0, 1.35, sd)) * on * (1.0 - pen);
    c = mix(c, min(c * 1.2 + uHot * 0.08, vec3(1.0)), fac * 0.6);
    c = mix(c, deep * (0.75 + 0.25 * lane), pen * 0.75);
    c = mix(c, deep * 0.25, umb * 0.9);
  }

  // iridescence: an opal sheen sliding over the plasma (Magnetar, White Hole)
  if (uStyle2.z > 0.01) {
    vec3 ir = hue(sp.x * 0.22 + sp.y * 0.14 + big * 0.7 + t * (0.3 / TAU));
    c = mix(c, c * (0.55 + 0.7 * ir), uStyle2.z * (1.0 - 0.75 * mu));
  }

  // limb darkening: cooler and darker towards the edge, tinted by the corona; a hot heart
  c = mix(mix(c, deep * 0.85, uStyle2.y), c, pow(mu, 0.7));
  c += uHot * pow(mu, 3.0) * 0.12;

  // the poles where a pulsar's beams leave the star, and a magnetar's glowing magnetic poles
  if (uFeature > 0.5 && uFeature < 1.5) c += uHot * pow(abs(dot(dir, bd)), 18.0) * smoothstep(0.45, 0.95, r) * 0.7;
  if (uStyle.w > 0.5) c += uCorona * pow(abs(dot(dir, vec2(0.34, -0.94))), 14.0) * smoothstep(0.4, 0.95, r) * 0.45 * uStyle.w;

  // chromosphere: a bright, flickering rim just inside the outline
  float flick = ring((a + spin) / TAU * 16.0, 16.0, 9.0, t, 1.3);
  float rim = smoothstep(0.85, 0.975, r) * (0.85 + 0.3 * (flick - 0.5) * min(uChurn, 1.0) + 0.15 * flick);
  c = mix(c, mix(uCorona, uHot, 0.3) * 1.1, clamp(rim, 0.0, 1.0) * 0.7);

  // Candy Star: a white swirl turning through the body
  if (uSkin > 1.5 && uSkin < 2.5) {
    float sw = fract((a + r * 2.6 - t * 0.35) * (6.0 / TAU));
    c = mix(c, vec3(1.0), smoothstep(0.46, 0.54, sw) * (1.0 - smoothstep(0.94, 1.0, sw)) * 0.55);
  }
  // Prism Star: colours sliding over the plasma
  if (uSkin > 2.5) c = mix(c, hue(sp.x * 0.25 + sp.y * 0.16 + t * (0.4 / TAU)) * (0.65 + 0.55 * heat), 0.55);
  // Pixel Star: a short palette
  if (uSkin > 0.5 && uSkin < 1.5) c = floor(c * 6.0 + 0.5) / 6.0;
  return mix(c, vec3(1.0), uFlash);
}

void main() {
  highp vec2 p = (vUV * 2.0 - 1.0) * uExtent;
  // Pixel Star: everything snaps to a coarse grid
  if (uSkin > 0.5 && uSkin < 1.5) p = (floor(p * 9.0) + 0.5) / 9.0;
  highp float r = length(p);
  float a = atan(p.y, p.x);
  vec2 dir = p / max(r, 0.0001);
  highp float t = uTime;
  highp float spin = mod(t * uSpin, TAU);
  float aa = uPx * 1.6;
  highp float ba = mod(t * 1.4, TAU);
  vec2 bd = vec2(cos(ba), sin(ba));
  // the Magnetar and White Hole fringe their light with a slowly turning rainbow
  vec3 tint = uFeature > 2.5 ? mix(uCorona, hue(a / TAU + t * (0.5 / TAU)), 0.65) : uCorona;

  float inside = 1.0 - smoothstep(1.0 - aa, 1.0, r);
  vec4 col = vec4(0.0);
  if (inside < 1.0) col = corona(p, r, a, dir, t, spin, bd, tint);
  if (inside > 0.0) {
    col = col * (1.0 - inside) + vec4(surface(r, a, dir, t, spin, bd), 1.0) * inside;
    // gloss: a soft tilted sheen on the upper left
    vec2 g = p - vec2(-0.32, -0.45);
    g = vec2(0.8776 * g.x - 0.4794 * g.y, 0.4794 * g.x + 0.8776 * g.y);
    float gloss = (1.0 - smoothstep(0.3, 1.0, length(g / vec2(0.42, 0.19)))) * 0.26 * inside;
    col = col * (1.0 - gloss) + vec4(1.0) * gloss;
  }

  // ---- ink outline: the toy-box edge ----
  float w = 0.055;
  float ringA = (1.0 - smoothstep(1.0 + w - aa, 1.0 + w, r)) * smoothstep(1.0 - w * 0.35 - aa, 1.0 - w * 0.35, r) * 0.95;
  col = col * (1.0 - ringA) + vec4(0.078, 0.043, 0.18, 1.0) * ringA;

  finalColor = col;
}
`;

const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/**
 * Each tier's surface (shader only; tiers.ts holds the colours, size and rays):
 * granule cells per radius, sunspots, flame tongues and prominences, magnetic field lines,
 * granulation contrast, limb darkening, iridescence, accretion disk.
 */
type Style = [number, number, number, number, number, number, number, number];
const STYLE: Record<string, Style> = {
  protostar: [3, 0, 0.3, 0, 0.8, 0.8, 0, 0],
  reddwarf: [3.6, 0.6, 0.45, 0, 0.9, 0.85, 0, 0],
  goldensun: [4.4, 0.85, 0.5, 0, 0.9, 0.8, 0, 0],
  bluegiant: [5, 0, 0.75, 0, 0.8, 0.7, 0, 0],
  redsupergiant: [2.4, 0.45, 0.45, 0, 1, 0.9, 0, 0],
  hypergiant: [3.4, 0, 1, 0, 0.75, 0.7, 0, 0],
  neutronstar: [7.5, 0, 0, 0.25, 0.45, 0.5, 0.1, 0],
  magnetar: [5.5, 0, 0.2, 1, 0.75, 0.6, 0.3, 0],
  pulsar: [6.5, 0, 0, 0.5, 0.65, 0.55, 0, 0],
  quasar: [4.4, 0, 0.6, 0, 0.8, 0.6, 0, 1],
  blazar: [4.4, 0, 0.8, 0, 0.8, 0.6, 0, 1],
  whitehole: [5, 0, 0.6, 0, 0.6, 0.3, 0.35, 0],
};
const PLAIN: Style = [4.4, 0, 0.4, 0, 0.8, 0.8, 0, 0];

interface Look {
  hot: [number, number, number];
  body: [number, number, number];
  corona: [number, number, number];
  size: number;
  rays: number;
  rayLength: number;
  churn: number;
  style: Style;
}

const lookOf = (t: TierDef): Look => ({
  hot: hex(t.hot),
  body: hex(t.body),
  corona: hex(t.corona),
  size: t.size,
  rays: t.rays,
  rayLength: t.rayLength,
  churn: t.churn,
  style: STYLE[t.id] ?? PLAIN,
});

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: [number, number, number], b: [number, number, number], k: number): [number, number, number] => [
  lerp(a[0], b[0], k),
  lerp(a[1], b[1], k),
  lerp(a[2], b[2], k),
];

/** The shader's clocks wrap here: every time term in it is periodic over 1000 x 2pi seconds. */
const WRAP = 1000 * Math.PI * 2;

export class StarCore {
  readonly root = new Container();
  private readonly mesh: Mesh<Geometry, Shader>;
  private readonly u: Record<string, unknown>;
  private readonly back = new Container();
  private readonly front = new Container();
  private readonly motesBack: Sprite[] = [];
  private readonly motesFront: Sprite[] = [];
  private from: Look;
  private to: Look;
  private blend = 1;
  private feature = 0;
  private tier = -1;
  private time = 0;
  /** The plasma's own clock: runs at the tier's churn speed, so a new tier never jumps it. */
  private boil = 0;
  private squash = 1;
  private squashVel = 0;
  private flash = 0;
  private motes = 0;
  private collapseT = -1;
  /** A Wardrobe skin's colours in place of the tier's, and its shader mode (null: Classic). */
  private skin: { mode: number; hot: [number, number, number]; body: [number, number, number]; corona: [number, number, number] } | null = null;

  constructor() {
    const geometry = new Geometry({
      attributes: {
        aPosition: [-1, -1, 1, -1, 1, 1, -1, 1],
        aUV: [0, 0, 1, 0, 1, 1, 0, 1],
      },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    const shader = Shader.from({
      gl: { vertex, fragment, name: 'star-core' },
      resources: {
        starUniforms: {
          uTime: { value: 0, type: 'f32' },
          uBoil: { value: 0, type: 'f32' },
          uDrift: { value: new Float32Array(2), type: 'vec2<f32>' },
          uExtent: { value: 2, type: 'f32' },
          uHot: { value: new Float32Array(3), type: 'vec3<f32>' },
          uBody: { value: new Float32Array(3), type: 'vec3<f32>' },
          uCorona: { value: new Float32Array(3), type: 'vec3<f32>' },
          uRays: { value: 12, type: 'f32' },
          uRayLen: { value: 1.4, type: 'f32' },
          uChurn: { value: 1, type: 'f32' },
          uFeature: { value: 0, type: 'f32' },
          uSpin: { value: 0.05, type: 'f32' },
          uPx: { value: 0.01, type: 'f32' },
          uFlash: { value: 0, type: 'f32' },
          uSkin: { value: 0, type: 'f32' },
          uStyle: { value: new Float32Array(4), type: 'vec4<f32>' },
          uStyle2: { value: new Float32Array(4), type: 'vec4<f32>' },
        },
      },
    });
    this.mesh = new Mesh({ geometry, shader });
    this.u = (shader.resources.starUniforms as { uniforms: Record<string, unknown> }).uniforms;
    this.from = this.to = lookOf(TIERS[0]!);
    this.root.addChild(this.back, this.mesh, this.front);
    const tex = textures().mote;
    for (let i = 0; i < 36; i++) {
      for (const [list, parent] of [
        [this.motesBack, this.back],
        [this.motesFront, this.front],
      ] as const) {
        const m = new Sprite(tex);
        m.anchor.set(0.5);
        m.visible = false;
        parent.addChild(m);
        list.push(m);
      }
    }
  }

  /** Switches to a tier's look; eases from the current look unless `instant`. */
  setTier(tier: number, instant: boolean): void {
    if (tier === this.tier) return;
    const def = TIERS[Math.max(0, Math.min(TIERS.length - 1, tier))]!;
    this.from = instant ? lookOf(def) : this.current();
    this.to = lookOf(def);
    this.blend = instant ? 1 : 0;
    this.feature = def.feature;
    this.tier = tier;
  }

  /** Wears a Wardrobe skin (null for Classic: the tier's own look). */
  setSkin(skin: { mode: number; palette?: { hot: string; body: string; corona: string } } | null): void {
    this.skin = skin?.palette ? { mode: skin.mode, hot: hex(skin.palette.hot), body: hex(skin.palette.body), corona: hex(skin.palette.corona) } : null;
    this.u.uSkin = skin?.mode ?? 0;
  }

  setMotes(n: number): void {
    this.motes = Math.min(36, n);
  }

  /** The squash-and-spring on every tap. */
  poke(): void {
    this.squash = 0.9;
    this.squashVel = 0;
  }

  /** Supernova: the star swells, then collapses to nothing and is reborn small. */
  collapse(): void {
    this.collapseT = 0;
  }

  flashWhite(strength: number): void {
    this.flash = Math.max(this.flash, strength);
  }

  private current(): Look {
    const k = this.blend;
    return {
      hot: lerp3(this.from.hot, this.to.hot, k),
      body: lerp3(this.from.body, this.to.body, k),
      corona: lerp3(this.from.corona, this.to.corona, k),
      size: lerp(this.from.size, this.to.size, k),
      rays: k < 0.5 ? this.from.rays : this.to.rays,
      rayLength: lerp(this.from.rayLength, this.to.rayLength, k),
      churn: lerp(this.from.churn, this.to.churn, k),
      style: this.from.style.map((v, i) => lerp(v, this.to.style[i]!, k)) as Style,
    };
  }

  /** Star radius in pixels for a stage of this width (before the tap squash). */
  radiusFor(stageWidth: number): number {
    return stageWidth * this.current().size;
  }

  /** Radius drawn last frame, in pixels (other layers orbit around it). */
  lastRadius = 0;

  update(dt: number, cx: number, cy: number, stageWidth: number, still: boolean): void {
    this.time += still ? 0 : dt;
    if (this.blend < 1) this.blend = Math.min(1, this.blend + dt / 0.8);
    // critically damped spring back to 1
    const k = 260;
    const c = 2 * Math.sqrt(k) * 0.55;
    this.squashVel += (-(this.squash - 1) * k - this.squashVel * c) * dt;
    this.squash += this.squashVel * dt;
    if (still) this.squash = 1;
    this.flash = Math.max(0, this.flash - dt * 2);

    const look = this.current();
    // the cells boil faster on hotter, wilder tiers
    this.boil += still ? 0 : dt * (0.3 + 0.22 * look.churn);
    let pulse = 1;
    if (this.collapseT >= 0) {
      this.collapseT += dt;
      const t = this.collapseT;
      // 0-0.35 s swell, 0.35-0.8 s collapse to a point, 0.8-1.6 s reborn
      pulse = t < 0.35 ? 1 + (t / 0.35) * 0.35 : t < 0.8 ? 1.35 * (1 - (t - 0.35) / 0.45) : Math.min(1, (t - 0.8) / 0.8);
      if (t >= 1.6) this.collapseT = -1;
    }
    const R = stageWidth * look.size * this.squash * Math.max(0.001, pulse);
    this.lastRadius = stageWidth * look.size;
    // magnetic field lines need a little more room than the rays
    const extent = this.feature === 1 || this.feature === 2 ? 3.2 : Math.max(look.rayLength + 0.45, 2.35 + 0.45 * look.style[3]);
    this.mesh.position.set(cx, cy);
    this.mesh.scale.set(R * extent);

    const u = this.u;
    u.uTime = this.time % WRAP;
    u.uBoil = this.boil % WRAP;
    // the big flows wander on a slow Lissajous path (bounded, so the noise keeps its precision)
    const drift = u.uDrift as Float32Array;
    drift[0] = Math.cos(this.boil * 0.031) * 2.6;
    drift[1] = Math.sin(this.boil * 0.023) * 2.6;
    u.uExtent = extent;
    // a Wardrobe skin keeps the tier's size and rays but brings its own colours
    const colours = this.skin ?? look;
    (u.uHot as Float32Array).set(colours.hot);
    (u.uBody as Float32Array).set(colours.body);
    (u.uCorona as Float32Array).set(colours.corona);
    (u.uStyle as Float32Array).set(look.style.slice(0, 4));
    (u.uStyle2 as Float32Array).set(look.style.slice(4, 8));
    u.uRays = look.rays;
    u.uRayLen = look.rayLength;
    u.uChurn = still ? 0 : look.churn;
    u.uFeature = this.feature;
    u.uSpin = still ? 0 : 0.05;
    u.uPx = 1 / Math.max(8, R);
    u.uFlash = this.flash;

    // Spark Motes orbit on a tilted ellipse; the ones on the far side draw behind the star.
    // the mote texture's ball is 46 px wide inside 64
    const moteSize = Math.max(9, R * 0.12) / 46;
    for (let i = 0; i < 36; i++) {
      const b = this.motesBack[i]!;
      const f = this.motesFront[i]!;
      if (i >= this.motes) {
        b.visible = f.visible = false;
        continue;
      }
      const orbit = R * (1.35 + (i % 4) * 0.2);
      const ang = this.time * (0.35 + (i % 5) * 0.07) + i * 2.399;
      const x = cx + Math.cos(ang) * orbit;
      const y = cy + Math.sin(ang) * orbit * 0.42;
      const inFront = Math.sin(ang) > 0;
      const show = inFront ? f : b;
      const hide = inFront ? b : f;
      hide.visible = false;
      show.visible = true;
      show.position.set(x, y);
      show.scale.set(moteSize * (inFront ? 1.1 : 0.9));
    }
  }
}
