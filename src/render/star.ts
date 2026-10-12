import { Container, Geometry, Mesh, Shader, Sprite } from 'pixi.js';
import { TIERS, type TierDef } from '../content/tiers';
import { textures } from './textures';

/**
 * The Star Core: one quad drawn by a fragment shader (sphere shading, churning plasma, corona
 * rays, ink outline, gloss, plus a per-tier feature: pulsar beams, quasar jets, rainbow fringe).
 * Colours and size ease to the new tier's values when the star evolves.
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

uniform float uTime;
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

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}
vec3 hue(float h) {
  return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
}

void main() {
  vec2 p = (vUV * 2.0 - 1.0) * uExtent;
  // Pixel Star: everything snaps to a coarse grid
  if (uSkin > 0.5 && uSkin < 1.5) p = (floor(p * 9.0) + 0.5) / 9.0;
  float r = length(p);
  float a = atan(p.y, p.x);
  float t = uTime;
  float aa = uPx * 1.6;

  // ---- corona: soft glow and tapering rays ----
  // everything outside the body fades to nothing before the quad edge, so no box ever shows
  float edgeFade = 1.0 - smoothstep(uExtent * 0.7, uExtent * 0.97, r);
  float glow = exp(-max(r - 1.0, 0.0) * 1.9) * 0.7 * smoothstep(0.6, 1.0, r);
  float seg = (a + t * uSpin) / 6.28318 * uRays;
  float idx = floor(seg + 0.5);
  float f = abs(seg - idx) * 2.0;
  float len = uRayLen * (0.84 + 0.16 * sin(t * 1.3 + idx * 1.7)) + mod(idx, 2.0) * 0.16;
  float taper = 1.0 - smoothstep(0.85, len, r);
  float width = 0.72 * taper;
  float ray = (1.0 - smoothstep(width * 0.55, width + 0.001, f)) * smoothstep(0.75, 1.02, r) * taper;
  float halo = glow + ray * 1.05;

  if (uFeature > 0.5 && uFeature < 1.5) {
    // pulsar: two narrow beams sweeping round
    float ba = t * 1.4;
    vec2 d = vec2(cos(ba), sin(ba));
    float along = abs(dot(p, d));
    float across = abs(dot(p, vec2(-d.y, d.x)));
    halo += (1.0 - smoothstep(0.0, 0.07 + along * 0.05, across)) * (1.0 - smoothstep(1.2, uExtent, along)) * smoothstep(0.95, 1.1, r) * 0.95;
  } else if (uFeature > 1.5 && uFeature < 2.5) {
    // quasar and blazar: twin jets, pulsing outwards
    float along = abs(p.y);
    float across = abs(p.x);
    float pulse = 0.7 + 0.3 * sin(along * 7.0 - t * 6.0);
    halo += (1.0 - smoothstep(0.0, 0.05 + along * 0.07, across)) * smoothstep(0.9, 1.25, along) * (1.0 - smoothstep(1.3, uExtent, along)) * pulse;
  }
  vec3 haloCol = uCorona;
  if (uFeature > 2.5) haloCol = mix(uCorona, hue(a / 6.28318 + t * 0.08), 0.65);
  halo = clamp(halo, 0.0, 1.3) * edgeFade;
  vec4 col = vec4(haloCol * halo, halo * 0.4);

  // ---- body: shaded sphere with churning plasma ----
  float inside = 1.0 - smoothstep(1.0 - aa, 1.0, r);
  if (inside > 0.0) {
    vec3 n = vec3(p, sqrt(max(0.0, 1.0 - r * r)));
    vec2 sp = n.xy / (1.0 + n.z) * 2.4;
    float c1 = fbm(sp * 2.0 + vec2(t * 0.13 * uChurn, -t * 0.09 * uChurn));
    float c2 = fbm(sp * 4.2 - vec2(t * 0.19 * uChurn, t * 0.06 * uChurn));
    float heat = smoothstep(0.25, 0.9, c1 * 0.75 + c2 * 0.45);
    float light = clamp(dot(n, normalize(vec3(-0.45, -0.55, 0.75))), 0.0, 1.0);
    vec3 c = mix(uBody * 0.7, uBody, heat);
    c = mix(c, uHot, smoothstep(0.6, 1.0, heat) * 0.55 + pow(light, 3.0) * 0.5);
    c *= mix(1.0, 0.6, smoothstep(0.5, 1.0, r));
    c += uHot * pow(c2, 5.0) * 0.7;
    // Candy Star: a white swirl turning through the body
    if (uSkin > 1.5 && uSkin < 2.5) c = mix(c, vec3(1.0), step(0.5, fract((a + r * 2.6 - t * 0.35) * 0.95)) * 0.55 * inside);
    // Prism Star: colours sliding over the plasma
    if (uSkin > 2.5) c = mix(c, hue(fract(sp.x * 0.15 + sp.y * 0.1 + t * 0.06)), 0.55);
    c = mix(c, vec3(1.0), uFlash);
    col = col * (1.0 - inside) + vec4(c, 1.0) * inside;

    // gloss: a tilted white ellipse on the upper left
    vec2 g = p - vec2(-0.3, -0.44);
    float ca = cos(0.5);
    float sa = sin(0.5);
    g = vec2(ca * g.x - sa * g.y, sa * g.x + ca * g.y);
    float ge = length(g / vec2(0.42, 0.19));
    float gloss = (1.0 - smoothstep(0.75, 1.0, ge)) * 0.4 * inside;
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

interface Look {
  hot: [number, number, number];
  body: [number, number, number];
  corona: [number, number, number];
  size: number;
  rays: number;
  rayLength: number;
  churn: number;
}

const lookOf = (t: TierDef): Look => ({
  hot: hex(t.hot),
  body: hex(t.body),
  corona: hex(t.corona),
  size: t.size,
  rays: t.rays,
  rayLength: t.rayLength,
  churn: t.churn,
});

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: [number, number, number], b: [number, number, number], k: number): [number, number, number] => [
  lerp(a[0], b[0], k),
  lerp(a[1], b[1], k),
  lerp(a[2], b[2], k),
];

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
    const extent = this.feature === 1 || this.feature === 2 ? 3.2 : look.rayLength + 0.45;
    this.mesh.position.set(cx, cy);
    this.mesh.scale.set(R * extent);

    const u = this.u;
    u.uTime = this.time;
    u.uExtent = extent;
    // a Wardrobe skin keeps the tier's size and rays but brings its own colours
    const colours = this.skin ?? look;
    (u.uHot as Float32Array).set(colours.hot);
    (u.uBody as Float32Array).set(colours.body);
    (u.uCorona as Float32Array).set(colours.corona);
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
