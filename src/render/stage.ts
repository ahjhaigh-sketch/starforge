import { Application, Container, Rectangle } from 'pixi.js';
import { onFrame } from '../app/clock';
import { snapshotStore } from '../app/uiSnapshot';
import { useUi } from '../ui/store';
import { BACKGROUND_BY_ID, SKIN_BY_ID, TRAIL_BY_ID } from '../content/cosmetics';
import { TIERS } from '../content/tiers';
import { events } from '../engine/events';
import { isEchoLayer, layer } from '../engine/layers';
import { burst, initParticles, setParticlesEnabled, trailMote, updateParticles } from './particles';
import { OrbitalsView } from './orbitals';
import { StarCore } from './star';
import { initStarfield, resizeStarfield, setCloudPalette, setNebulaClouds, updateClouds, updateStarfield } from './starfield';
import { WyrmSky } from './wyrms';
import { WeatherSky } from './weather';
import { BlackHoleView } from './blackhole';
import { LeviathanView } from './leviathan';
import { MegaView } from './megastructures';
import { BH_STAGES } from '../engine/systems/blackhole';

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
let hole: BlackHoleView | null = null;
let whale: LeviathanView | null = null;
let mega: MegaView | null = null;
let megaSpec = '';
let weather: WeatherSky | null = null;
let holeMass = 0;
/** Wyrms swimming in the sky right now (tests and the dev panel). */
export const swimmingWyrms = () => wyrms?.count ?? 0;
/** How far a weather's sky effect has faded in (tests). */
export const weatherLevel = (kind: string) => weather?.levelOf(kind) ?? 0;
let still = false;
let wornSkin = '';
let wornBackground = '';
let trailColors: readonly number[] = [];
let trailAt = 0;
let trailIndex = 0;

/** A cursor trail: a mote every 25 ms where the pointer moves over the game (not over an open panel). */
function onPointerMove(e: PointerEvent): void {
  if (trailColors.length === 0 || still || useUi.getState().panel) return;
  const now = performance.now();
  if (now - trailAt < 25) return;
  trailAt = now;
  trailMote(e.clientX, e.clientY, trailColors[trailIndex++ % trailColors.length]!);
}
let flashScale = 1;
/** Average CPU time of one rendered frame, ms (dev panel). */
export let renderMs = 0;

const colorNum = (hex: string) => parseInt(hex.slice(1), 16);

/**
 * Where the star sits on the page. Reading it forces a layout, and the page changes ten times a
 * second, so the frame loop reads a copy at most 4 times a second (and at once after a resize).
 */
let anchorCache: { rect: DOMRect | null; at: number } = { rect: null, at: -Infinity };
function anchorRect(): DOMRect | null {
  const now = performance.now();
  if (now - anchorCache.at < 250 && anchor?.isConnected) return anchorCache.rect;
  if (!anchor || !anchor.isConnected) anchor = document.querySelector('[data-star-anchor]');
  anchorCache = { rect: anchor ? anchor.getBoundingClientRect() : null, at: now };
  return anchorCache.rect;
}
if (typeof window !== 'undefined') window.addEventListener('resize', () => (anchorCache.at = -Infinity));

/**
 * Photo Mode: the sky around the star (the star, its motes, planets and whatever orbits), drawn
 * fresh into a square canvas of `size` pixels, or null before the renderer is up.
 */
export function captureStar(size: number, starAt = 0.5): HTMLCanvasElement | null {
  const r = anchorRect();
  if (!app || !r || r.width <= 0) return null;
  app.render();
  const side = Math.min(app.screen.width, app.screen.height, r.width * 4.2);
  const x = Math.max(0, Math.min(app.screen.width - side, r.left + r.width / 2 - side / 2));
  // the star sits `starAt` of the way down (the photo's card covers the bottom); see-through where the sky is empty
  const y = Math.max(0, Math.min(app.screen.height - side, r.top + r.height / 2 - side * starAt));
  return app.renderer.extract.canvas({ target: app.stage, frame: new Rectangle(x, y, side, side), resolution: size / side, clearColor: [0, 0, 0, 0] }) as HTMLCanvasElement;
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
  weather = new WeatherSky();
  sky.addChild(weather.sky);
  wyrms = new WyrmSky();
  whale = new LeviathanView();
  sky.addChild(whale.root, wyrms.root);
  star = new StarCore();
  orbitals = new OrbitalsView();
  hole = new BlackHoleView();
  // the Black Hole sits behind everything at the star: orbits and the star are in front of it
  mega = new MegaView();
  // a solar flare glows behind the star; an eclipse's shadow crosses in front of it
  mid.addChild(hole.mesh, mega.root, orbitals.behind, weather.glow, star.root, weather.shadow, orbitals.infront);
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
    // the Wardrobe: star skin, background (clouds here, the page's own gradient in CSS) and cursor trail
    if (s.skin !== wornSkin) {
      wornSkin = s.skin;
      const skin = SKIN_BY_ID.get(s.skin);
      star!.setSkin(skin && skin.id !== 'classic' ? skin : null);
    }
    if (s.background !== wornBackground) {
      wornBackground = s.background;
      setCloudPalette(BACKGROUND_BY_ID.get(s.background)?.clouds ?? []);
      document.documentElement.dataset.bg = s.background;
    }
    trailColors = TRAIL_BY_ID.get(s.trail)?.colors ?? [];
    weather!.set(s.weatherKind);
    wyrms!.set(s.wyrmSky, app!.screen.width, app!.screen.height);
    hole!.setStage(s.bhStage, BH_STAGES[Math.max(0, s.bhStage - 1)]?.color ?? '#FFB347');
    holeMass = s.bhMassLog;
    whale!.set(s.levVisible, s.levIndex, s.levColor, s.levPct);
    if (s.megaStages !== megaSpec) {
      megaSpec = s.megaStages;
      mega!.set(s.megaStages);
    }
  };
  star.setTier(snapshotStore.getState().tierIndex, true);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  apply();
  snapshotStore.subscribe(apply);

  events.on((e) => {
    if (e.t === 'reset' && star) {
      if (isEchoLayer(e.layer) || e.auto) return;
      star.collapse();
      // 140 particles in the layer's colour (and white); the Big Crunch bursts as the universe comes back
      const color = colorNum(layer(e.layer)?.color ?? '#FF4FC1');
      const blast = () => {
        const r = anchorRect();
        star?.flashWhite(1 * flashScale);
        if (!r) return;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        burst(cx, cy, 80, color, r.width * 0.6, 16);
        burst(cx, cy, 60, 0xffffff, r.width * 0.45, 14);
      };
      // the Multiverse: a burst in every colour as the glass shatters
      const rainbow = () => {
        const r = anchorRect();
        star?.flashWhite(1 * flashScale);
        if (!r) return;
        for (const c of [0xff4fc1, 0xffc83d, 0x7dff5a, 0x2ee6ff, 0xb06bff, 0xffffff]) burst(r.left + r.width / 2, r.top + r.height / 2, 30, c, r.width * 0.55, 16);
      };
      if (e.layer === 'crunch') window.setTimeout(blast, 1150);
      else if (e.layer === 'multiverse') window.setTimeout(rainbow, 850);
      else blast();
      return;
    }
    if (e.t !== 'tierUp' || !star) return;
    const r = anchorRect();
    if (!r) return;
    const color = colorNum(TIERS[e.tier]?.color ?? '#FFFFFF');
    burst(r.left + r.width / 2, r.top + r.height / 2, 60, color, r.width * 0.35, 14);
    star.flashWhite(0.7 * flashScale);
  });

  // behind an open panel the sky is blurred and dimmed: draw it every 8th frame, with the time saved
  // up, not every frame (each new frame made the blur start over; found by the speed budgets on a phone)
  let behind = 0;
  let savedDt = 0;
  onFrame((frameDt) => {
    if (!app || !star) return;
    let dt = frameDt;
    if (useUi.getState().panel) {
      savedDt += frameDt;
      if (++behind < 8) return;
      dt = Math.min(savedDt, 0.25);
    }
    behind = 0;
    savedDt = 0;
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
    whale?.update(dt, width, height, still);
    const r = anchorRect();
    if (r && r.width > 0) {
      star.update(dt, r.left + r.width / 2, r.top + r.height / 2, r.width, still);
      hole?.update(dt, r.left + r.width / 2, r.top + r.height / 2, star.lastRadius, holeMass, still);
      mega?.update(dt, r.left + r.width / 2, r.top + r.height / 2, star.lastRadius, still);
      orbitals?.update(dt, r.left + r.width / 2, r.top + r.height / 2, star.lastRadius, still);
    }
    weather?.update(dt, width, height, r && r.width > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2, r: star.lastRadius } : null, still, flashScale);
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
