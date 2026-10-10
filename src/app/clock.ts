import { simulateElapsed } from '../engine/offline';
import { tick } from '../engine/tick';
import { game } from './game';
import { saveNow } from './persistence';
import { publish } from './uiSnapshot';

const TICK = 0.05; // 20 simulation ticks per second
const MAX_LIVE_GAP = 60; // seconds; longer gaps go through the catch-up path
const PUBLISH_MS = 100; // UI snapshot at 10 Hz

type FrameListener = (dtSeconds: number, nowMs: number) => void;
const frameListeners = new Set<FrameListener>();

/** The renderer subscribes here to draw every frame. */
export function onFrame(fn: FrameListener): () => void {
  frameListeners.add(fn);
  return () => frameListeners.delete(fn);
}

let acc = 0;
let lastPublish = 0;
let lastSaveAt = Date.now();
let lastFrame = performance.now();
let running = false;

/**
 * Wall-clock time is the truth: every frame measures real time since the last tick.
 * A gap over 60 s (hidden tab, sleep) is simulated in one go, at full efficiency, because
 * the game was open the whole time. Offline time (closed tab) is handled at boot instead.
 */
function frame(nowMs: number): void {
  const s = game.state;
  const wall = Date.now();
  let elapsed = (wall - s.lastTick) / 1000;
  if (elapsed < 0) elapsed = 0; // clock moved backwards: ignore, don't punish
  s.lastTick = wall;

  const t0 = performance.now();
  if (elapsed > MAX_LIVE_GAP) {
    simulateElapsed(s, elapsed, { cap: Infinity, efficiency: 1, offline: false });
    acc = 0;
  } else {
    acc += elapsed;
    let steps = 0;
    while (acc >= TICK && steps < 200) {
      tick(s, TICK);
      acc -= TICK;
      steps++;
    }
    if (steps > 0) game.tickMs = game.tickMs * 0.9 + ((performance.now() - t0) / steps) * 0.1;
  }

  if (nowMs - lastPublish >= PUBLISH_MS) {
    lastPublish = nowMs;
    publish();
  }
  if (wall - lastSaveAt >= s.settings.autosaveSeconds * 1000) {
    lastSaveAt = wall;
    saveNow();
  }

  const dt = Math.min((nowMs - lastFrame) / 1000, 0.1);
  lastFrame = nowMs;
  for (const fn of frameListeners) fn(dt, nowMs);

  requestAnimationFrame(frame);
}

export function startClock(): void {
  if (running) return;
  running = true;
  lastFrame = performance.now();
  requestAnimationFrame(frame);
}
