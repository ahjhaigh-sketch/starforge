import { Geometry, Mesh, Shader } from 'pixi.js';

/**
 * The Black Hole behind the star (Game design: "Singularity"): one quad drawn by a fragment
 * shader. Light bends round it: a field of faint stars is sampled at lensed positions (pushed out
 * from the hole by a deflection that grows near the horizon), there's a thin photon ring, and a
 * tilted accretion disk passes in front below and is seen bent over the top behind. The disk takes
 * the stage's colour; the rainbow stage cycles through every hue.
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
uniform vec3 uColor;
uniform float uRainbow;
uniform float uDark;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec3 hue(float h) {
  return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
}
// a sparse field of points: the background the hole bends
float starField(vec2 q) {
  vec2 g = q * 14.0;
  vec2 i = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash(i);
  float d = length(f - (vec2(hash(i + 7.1), hash(i + 3.3)) - 0.5) * 0.6);
  return step(0.86, h) * smoothstep(0.08, 0.0, d);
}
// the accretion disk seen nearly edge-on: an ellipse band with swirling streaks
float diskBand(vec2 p, float squash, out float swirl) {
  vec2 d = vec2(p.x, p.y * squash);
  float r = length(d);
  float band = smoothstep(0.95, 0.62, r) * smoothstep(0.30, 0.42, r);
  swirl = 0.55 + 0.45 * sin(atan(d.y, d.x) * 5.0 - uTime * 1.6 + r * 24.0);
  return band;
}

void main() {
  vec2 p = vUV * 2.0 - 1.0;
  float r = length(p);
  float rs = 0.27;
  if (r > 1.0) { finalColor = vec4(0.0); return; }
  vec3 disk = mix(uColor, hue(fract(atan(p.y, p.x) / 6.2831 + uTime * 0.05)), uRainbow);
  // light bending: stars behind are pushed outwards, more the nearer they pass the horizon
  vec2 dir = p / max(r, 1e-4);
  vec2 q = p + dir * (rs * rs * 1.4 / max(r, rs * 0.9));
  float stars = starField(q + vec2(uTime * 0.01, 0.0)) * smoothstep(1.0, 0.6, r);
  // the far side of the disk, lensed into an arc over the top of the hole
  float arcR = abs(r - 0.36);
  float arc = smoothstep(0.07, 0.0, arcR) * smoothstep(0.1, -0.35, p.y) * 0.85;
  // the near side of the disk, in front, below the middle
  float swirl;
  float band = diskBand(p, 3.4, swirl);
  float front = band * step(0.0, p.y);
  float back = band * (1.0 - step(0.0, p.y));
  // the photon ring hugging the horizon
  float ring = exp(-pow((r - rs * 1.12) / 0.018, 2.0));
  float glow = exp(-pow((r - rs) / 0.25, 2.0)) * 0.35;
  vec3 col = vec3(0.0);
  float a = 0.0;
  col += vec3(1.0) * stars * 0.7; a += stars * 0.7;
  col += disk * glow; a += glow * 0.6;
  // behind the horizon: the back of the disk and the lensed arc
  col += disk * (back * (0.5 + 0.7 * swirl) + arc * (0.8 + 0.4 * swirl)); a += back * 0.85 + arc;
  // the horizon itself: pure dark with an ink rim
  float hole = smoothstep(rs + 0.006, rs - 0.006, r);
  col = mix(col, vec3(0.03, 0.01, 0.07) * (1.0 - uDark * 0.5), hole); a = max(a, hole);
  col += vec3(1.0, 0.97, 0.9) * ring * 0.9; a = max(a, ring * 0.9);
  // the front of the disk crosses in front of everything
  col = mix(col, disk * (0.6 + 0.8 * swirl) + vec3(0.25) * swirl, front); a = max(a, front);
  // premultiplied: light adds, coverage blocks the sky behind
  finalColor = vec4(col, clamp(a, 0.0, 1.0));
}
`;

export class BlackHoleView {
  readonly mesh: Mesh<Geometry, Shader>;
  private readonly u: Record<string, unknown>;
  private time = 0;
  private stage = 0;

  constructor() {
    const geometry = new Geometry({
      attributes: { aPosition: [-1, -1, 1, -1, 1, 1, -1, 1], aUV: [0, 0, 1, 0, 1, 1, 0, 1] },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    const shader = Shader.from({
      gl: { vertex, fragment, name: 'black-hole' },
      resources: {
        bhUniforms: {
          uTime: { value: 0, type: 'f32' },
          uColor: { value: new Float32Array([1, 0.7, 0.28]), type: 'vec3<f32>' },
          uRainbow: { value: 0, type: 'f32' },
          uDark: { value: 0, type: 'f32' },
        },
      },
    });
    this.mesh = new Mesh({ geometry, shader });
    this.u = (shader.resources.bhUniforms as { uniforms: Record<string, unknown> }).uniforms;
    this.mesh.visible = false;
  }

  /** Stage 0 hides it; 1 to 8 are amber to rainbow. */
  setStage(stage: number, color: string): void {
    this.stage = stage;
    this.mesh.visible = stage > 0;
    const c = parseInt(color.slice(1), 16);
    const v = this.u.uColor as Float32Array;
    // the black stage glows deep violet so the disk still reads against the night
    const rgb = stage === 7 ? [0.42, 0.26, 0.85] : [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
    v[0] = rgb[0]!;
    v[1] = rgb[1]!;
    v[2] = rgb[2]!;
    this.u.uRainbow = stage >= 8 ? 1 : 0;
    this.u.uDark = stage === 7 ? 1 : 0;
  }

  /** Centred on the star, a few star-radii across, growing a little with each order of mass. */
  update(dt: number, x: number, y: number, starRadius: number, massLog: number, still: boolean): void {
    if (!this.mesh.visible) return;
    if (!still) this.time += dt;
    this.u.uTime = this.time;
    const half = starRadius * (2.1 + Math.min(1.2, massLog * 0.08));
    this.mesh.position.set(x, y);
    this.mesh.scale.set(half, half);
  }

  get visible(): boolean {
    return this.stage > 0;
  }
}
