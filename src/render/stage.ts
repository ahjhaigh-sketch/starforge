import { Application, Container } from 'pixi.js';
import { onFrame } from '../app/clock';
import { snapshotStore } from '../app/uiSnapshot';
import { TIERS } from '../content/tiers';
import { events } from '../engine/events';
import { burst, initParticles, setParticlesEnabled, updateParticles } from './particles';
import { OrbitalsView } from './orbitals';
import { StarCore } from './star';
import { initStarfield, resizeStarfield, setNebulaClouds, updateClouds, updateStarfield } from './starfield';
import { WyrmSky } from './wyrms';

/**
 * PixiJS draws behind the whole UI: the sky, the Star Core and particles. One canvas, fixed to
 * the window; the star sits wherever the DOM element marked data-star-anchor is.
 * Rendering is driven by the game clock's frame callback, so a hidden tab draws nothing.
 */
let app: Application | null = null;
let star: StarCore | null = null;
let orbitals: OrbitalsView | null = null;
let anchor: Element | null = null;
let wyrms: WyrmSky | null = null;
/** Wyrms swimming in the sky right now (tests and the dev panel). */
export const swimmingWyrms = () => wyrms?.count ?? 0;
let still = false;
let flashScale = 1;
/** Average CPU time of one rendered frame, ms (dev panel). */
export let renderMs = 0;

const colorNum = (hex: string) => parseInt(hex.slice(1), 16);

function anchorRect(): DOMRect | null {
  if (!anchor || !anchor.isConnected) anchor = document.querySelector('[data-star-anchor]');
  return anchor ? anchor.getBoundingClientRect() : null;
}

export async function initRender(): Promise<boolean> {
  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'sky';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
    app = new Application();
    await app.init({
      canvas,
      resizeTo: window,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: 'webgl',
      autoStart: false,
    });
    app.ticker.stop();
  } catch (err) {
    console.warn('Graphics could not start; showing the simple star instead.', err);
    document.documentElement.classList.add('no-webgl');
    document.querySelector('canvas.sky')?.remove();
    app = null;
    return false;
  }

  const sky = new Container();
  const mid = new Container();
  const fx = new Container();
  app.stage.addChild(sky, mid, fx);
  initStarfield(sky);
  wyrms = new WyrmSky();
  sky.addChild(wyrms.root);
  star = new StarCore();
  orbitals = new OrbitalsView();
  mid.addChild(orbitals.behind, star.root, orbitals.infront);
  initParticles(fx);

  const apply = () => {
    const s = snapshotStore.getState();
    still = s.reducedMotion;
    flashScale = s.reduceFlashing ? 0.35 : 1;
    setParticlesEnabled(!still);
    star!.setMotes(s.moteCount);
    orbitals!.set(s.planets, s.ringsOpen);
    star!.setTier(s.tierIndex, false);
    setNebulaClouds(s.nebulasAll);
    wyrms!.set(s.wyrmSky, app!.screen.width, app!.screen.height);
  };
  star.setTier(snapshotStore.getState().tierIndex, true);
  apply();
  snapshotStore.subscribe(apply);

  events.on((e) => {
    if (e.t === 'reset' && star) {
      const r = anchorRect();
      star.collapse();
      star.flashWhite(1 * flashScale);
      if (r) {
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        burst(cx, cy, 80, 0xff4fc1, r.width * 0.6, 16);
        burst(cx, cy, 60, 0xff7a2e, r.width * 0.45, 14);
      }
      return;
    }
    if (e.t !== 'tierUp' || !star) return;
    const r = anchorRect();
    if (!r) return;
    const color = colorNum(TIERS[e.tier]?.color ?? '#FFFFFF');
    burst(r.left + r.width / 2, r.top + r.height / 2, 60, color, r.width * 0.35, 14);
    star.flashWhite(0.7 * flashScale);
  });

  onFrame((dt) => {
    if (!app || !star) return;
    const t0 = performance.now();
    const { width, height } = app.screen;
    resizeStarfield(width, height);
    updateStarfield(dt, still);
    updateClouds(dt, still);
    if (wyrms && wyrms.count > 0) {
      // the lead Wyrm darts for a flying comet (the comet is a DOM button; read where it is)
      let comet: { x: number; y: number } | null = null;
      if (snapshotStore.getState().cometKey) {
        const el = document.querySelector('[data-testid="comet"]');
        const b = el?.getBoundingClientRect();
        if (b && b.width > 0) comet = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }
      wyrms.update(dt, width, height, still, comet);
    }
    const r = anchorRect();
    if (r && r.width > 0) {
      star.update(dt, r.left + r.width / 2, r.top + r.height / 2, r.width, still);
      orbitals?.update(dt, r.left + r.width / 2, r.top + r.height / 2, star.lastRadius, still);
    }
    updateParticles(dt);
    app.render();
    renderMs = renderMs * 0.95 + (performance.now() - t0) * 0.05;
  });
  return true;
}

/** Called by the star's tap handler: squash, and a few sparks where the pointer hit. */
export function tapFx(x: number, y: number, crit: boolean): void {
  if (!star) return;
  if (!still) star.poke();
  const tier = TIERS[snapshotStore.getState().tierIndex] ?? TIERS[0]!;
  burst(x, y, crit ? 14 : 6, crit ? 0xffffff : colorNum(tier.color), crit ? 110 : 70, crit ? 12 : 9);
}

/** A burst anywhere on screen (comets, purchases). */
export function burstAt(x: number, y: number, count: number, color: number): void {
  burst(x, y, count, color, 120, 12);
}
