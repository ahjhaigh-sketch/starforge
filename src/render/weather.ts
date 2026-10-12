import { Container, Graphics, Sprite } from 'pixi.js';
import { weatherStreak } from './particles';
import { textures } from './textures';

/**
 * Space Weather in the sky (Phase 20.3). Meteor showers, stellar wind and nebula storms are streaks
 * from the particle module (so reduced motion turns them off with every other particle); an aurora
 * is three soft ribbons along the top of the sky; a solar flare is a slow glow behind the star; an
 * eclipse is a shadow across it. Every effect fades in and out over a second or so, and with reduced
 * motion the ribbons, glow and shadow hold still. Reduce flashing keeps the flare low and steady.
 */
const STREAKS: Record<string, { every: number; colors: number[] }> = {
  meteor: { every: 0.14, colors: [0xffffff, 0x2ee6ff, 0xbdf6ff] },
  wind: { every: 0.07, colors: [0x8fd3ff, 0xe8f6ff] },
  storm: { every: 0.09, colors: [0xff4fc1, 0xb06bff, 0xffc8e6] },
};
const RIBBONS = [0x3ee08a, 0x2ee6ff, 0xb06bff];

export class WeatherSky {
  /** Behind everything (the sky): the aurora. */
  readonly sky = new Graphics();
  /** Behind the star: the flare's glow. */
  readonly glow: Sprite;
  /** In front of the star: the eclipse's shadow. */
  readonly shadow = new Graphics();
  private kind = '';
  /** How far each effect has faded in (0 to 1). */
  private level: Record<string, number> = {};
  private time = 0;
  private acc = 0;
  private drawnStill = false;

  constructor() {
    this.glow = new Sprite(textures().soft);
    this.glow.anchor.set(0.5);
    this.glow.blendMode = 'add';
    this.glow.tint = 0xff9a3d;
    this.glow.visible = false;
    this.sky.blendMode = 'add';
    this.shadow.circle(0, 0, 100).fill({ color: 0x05020c, alpha: 1 });
    this.shadow.visible = false;
  }

  /** The weather now ('' for clear). */
  set(kind: string): void {
    this.kind = kind;
  }

  /** Current fade level of an effect, for tests and the dev panel. */
  levelOf(kind: string): number {
    return this.level[kind] ?? 0;
  }

  update(dt: number, width: number, height: number, star: { x: number; y: number; r: number } | null, still: boolean, flashScale: number): void {
    if (!still) this.time += dt;
    for (const k of ['meteor', 'wind', 'storm', 'flare', 'eclipse', 'aurora']) {
      const target = k === this.kind ? 1 : 0;
      const cur = this.level[k] ?? 0;
      this.level[k] = still ? target : cur + Math.sign(target - cur) * Math.min(Math.abs(target - cur), dt / 1.2);
    }

    // streaks: a steady trickle while the weather lasts
    const streak = STREAKS[this.kind];
    if (streak && !still) {
      this.acc = Math.min(this.acc + dt / streak.every, 4);
      while (this.acc >= 1) {
        this.acc -= 1;
        this.spawn(this.kind, streak.colors, width, height);
      }
    } else this.acc = 0;

    // the flare: a big warm glow behind the star, breathing slowly
    const flare = this.level.flare ?? 0;
    this.glow.visible = flare > 0.01 && !!star;
    if (this.glow.visible && star) {
      const breathe = still || flashScale < 1 ? 0 : Math.sin(this.time * 1.4) * 0.12;
      this.glow.position.set(star.x, star.y);
      this.glow.scale.set((star.r * 6.5) / 64);
      this.glow.alpha = flare * (0.55 * Math.min(1, flashScale + 0.25) + breathe);
    }

    // the eclipse: a dark disc drifting across the star's face
    const eclipse = this.level.eclipse ?? 0;
    this.shadow.visible = eclipse > 0.01 && !!star;
    if (this.shadow.visible && star) {
      const drift = still ? 0.25 : Math.sin(this.time * 0.25) * 0.35;
      this.shadow.position.set(star.x + star.r * (0.25 + drift), star.y - star.r * 0.12);
      this.shadow.scale.set((star.r * 0.92) / 100);
      this.shadow.alpha = eclipse * 0.82;
    }

    // the aurora: redrawn while it moves; once when still
    const aurora = this.level.aurora ?? 0;
    if (aurora <= 0.01) {
      if (this.sky.visible) this.sky.clear();
      this.sky.visible = false;
      this.drawnStill = false;
    } else if (!still || !this.drawnStill) {
      this.sky.visible = true;
      this.drawRibbons(width, height, aurora);
      this.drawnStill = still;
    }
  }

  private spawn(kind: string, colors: number[], w: number, h: number): void {
    const color = colors[Math.floor(Math.random() * colors.length)]!;
    if (kind === 'meteor') {
      // from the top and right edges, falling down and to the left
      const fromTop = Math.random() < 0.6;
      const x = fromTop ? w * (0.25 + Math.random() * 0.85) : w + 20;
      const y = fromTop ? -20 : h * Math.random() * 0.5;
      const sp = 650 + Math.random() * 350;
      weatherStreak(x, y, -sp * 0.78, sp * 0.62, color, 14 + Math.random() * 8, 6, 0.7 + Math.random() * 0.4);
    } else if (kind === 'wind') {
      // thin gusts across the sky, left to right
      const sp = 700 + Math.random() * 500;
      weatherStreak(-30, h * Math.random(), sp, sp * 0.05, color, 5 + Math.random() * 3, 10, 0.55 + Math.random() * 0.3);
    } else {
      // a storm: pink and violet swirls blowing in from the top left
      const sp = 380 + Math.random() * 220;
      const a = 0.35 + Math.random() * 0.35;
      weatherStreak(w * Math.random() * 0.6, -20, Math.cos(a) * sp, Math.sin(a) * sp, color, 12 + Math.random() * 8, 4, 0.5 + Math.random() * 0.3);
    }
  }

  private drawRibbons(w: number, h: number, level: number): void {
    const g = this.sky;
    g.clear();
    const steps = 36;
    for (let i = 0; i < RIBBONS.length; i++) {
      // a fresh array per ribbon: Pixi keeps the array it is given, it does not copy it
      const pts = new Array<number>((steps + 1) * 2);
      const base = h * (0.1 + i * 0.045);
      for (let j = 0; j <= steps; j++) {
        const x = (w * j) / steps;
        const y = base + Math.sin(x * 0.0045 + this.time * (0.5 + i * 0.12) + i * 1.7) * h * 0.035 + Math.sin(x * 0.011 - this.time * 0.3) * h * 0.012;
        pts[j * 2] = x;
        pts[j * 2 + 1] = y;
      }
      // a wide faint band with a brighter core reads as light, not paint (a stroke uses up its path)
      const width = Math.max(18, h * 0.05);
      g.beginPath().poly(pts, false).stroke({ width, color: RIBBONS[i]!, alpha: 0.09 * level, cap: 'round', join: 'round' });
      g.beginPath().poly(pts, false).stroke({ width: width * 0.3, color: RIBBONS[i]!, alpha: 0.2 * level, cap: 'round', join: 'round' });
    }
  }
}
