import { Container, Graphics } from 'pixi.js';
import { MEGA_BY_ID } from '../content/galaxyBuild';

/**
 * Megastructures in the sky, round the star: each built stage adds to its structure's drawing.
 * Shapes are drawn once (when stages or the star's size change) in the star's own coordinates;
 * each frame only moves the container to the star and turns the swarm and the ring.
 * Dyson Swarm: panels on an orbit. Ringworld: a tilted band. Matrioshka Brain: nested shells.
 * Star Lifter: jets from the poles. Stellar Engine: a mirror arc on one side. Birch Planet: a
 * vast faint disc far behind.
 */
const col = (id: string) => parseInt((MEGA_BY_ID.get(id)?.color ?? '#FFFFFF').slice(1), 16);
const INK = 0x140b2e;

export class MegaView {
  readonly root = new Container();
  private still = new Graphics();
  private swarm = new Graphics();
  private ring = new Graphics();
  private stages: Record<string, number> = {};
  private drawnFor = '';
  private t = 0;

  constructor() {
    this.root.addChild(this.still, this.ring, this.swarm);
  }

  /** "dyson:3|ringworld:1" from the snapshot. */
  set(spec: string): void {
    const next: Record<string, number> = {};
    for (const part of spec ? spec.split('|') : []) {
      const [id, k] = part.split(':');
      if (id) next[id] = Number(k) || 0;
    }
    this.stages = next;
    this.drawnFor = '';
    this.root.visible = Object.keys(next).length > 0;
  }

  private draw(R: number): void {
    const k = (id: string) => this.stages[id] ?? 0;
    const g = this.still;
    g.clear();
    if (k('birch')) g.circle(-R * 3.4, -R * 2.4, R * (0.6 + 0.25 * k('birch'))).fill({ color: col('birch'), alpha: 0.1 }).stroke({ width: 3, color: col('birch'), alpha: 0.3 });
    for (let i = 0; i < k('matrioshka'); i++) g.circle(0, 0, R * (1.22 + 0.13 * i)).stroke({ width: 2, color: col('matrioshka'), alpha: 0.3 });
    if (k('starlifter')) {
      const len = R * (1.45 + 0.3 * k('starlifter'));
      const w = 3 + 2 * k('starlifter');
      for (const dir of [-1, 1]) {
        g.moveTo(0, dir * R * 0.95).lineTo(0, dir * len).stroke({ width: w + 4, color: INK, alpha: 0.5 });
        g.moveTo(0, dir * R * 0.95).lineTo(0, dir * len).stroke({ width: w, color: col('starlifter'), alpha: 0.75 });
        g.circle(0, dir * len, w * 1.2).fill({ color: col('starlifter'), alpha: 0.9 }).stroke({ width: 2, color: INK });
      }
    }
    if (k('stellarengine')) {
      const r = R * (0.55 + 0.15 * k('stellarengine'));
      g.arc(-R * 2.3, 0, r, -1.1, 1.1).stroke({ width: 10, color: INK, alpha: 0.6 });
      g.arc(-R * 2.3, 0, r, -1.1, 1.1).stroke({ width: 6, color: col('stellarengine'), alpha: 0.9 });
    }
    const ring = this.ring;
    ring.clear();
    if (k('ringworld')) {
      const rx = R * 2.7;
      ring.ellipse(0, 0, rx, rx * 0.17).stroke({ width: 3 + 2.5 * k('ringworld'), color: INK, alpha: 0.45 });
      ring.ellipse(0, 0, rx, rx * 0.17).stroke({ width: 1 + 2 * k('ringworld'), color: col('ringworld'), alpha: 0.8 });
      ring.rotation = -0.22;
    }
    const sw = this.swarm;
    sw.clear();
    const panels = 10 * k('dyson');
    for (let i = 0; i < panels; i++) {
      const a = (i / panels) * Math.PI * 2;
      const r = R * (1.5 + 0.08 * (i % 3));
      sw.rect(Math.cos(a) * r - 3, Math.sin(a) * r - 3, 6, 6).fill({ color: col('dyson') }).stroke({ width: 1.5, color: INK });
    }
  }

  update(dt: number, cx: number, cy: number, R: number, still: boolean): void {
    if (!this.root.visible) return;
    const key = `${Math.round(R / 3)}`;
    if (key !== this.drawnFor) {
      this.draw(R);
      this.drawnFor = key;
    }
    this.root.position.set(cx, cy);
    if (!still) {
      this.t += dt;
      this.swarm.rotation = this.t * 0.08;
    }
  }
}
