import { snapshotStore } from '../app/uiSnapshot';
import { events } from '../engine/events';

/**
 * The one audio module (CLAUDE.md rule 14). Every sound is synthesised with WebAudio, so there are
 * no files to download: short, bright, soft. Purchases climb in pitch when repeated quickly.
 * The context starts on the first tap or key press (browsers require a gesture).
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let noise: AudioBuffer | null = null;

function ensure(): boolean {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return true;
  }
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    sfx = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    sfx.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    applyVolumes();
    return true;
  } catch {
    ctx = null;
    return false;
  }
}

function applyVolumes(): void {
  if (!ctx || !master || !sfx) return;
  const s = snapshotStore.getState();
  master.gain.setTargetAtTime(s.muted ? 0 : s.volumeMaster, ctx.currentTime, 0.02);
  sfx.gain.setTargetAtTime(s.volumeSfx * 0.6, ctx.currentTime, 0.02);
}

/** One enveloped oscillator note. */
function tone(freq: number, start: number, dur: number, type: OscillatorType, peak: number, glideTo?: number): void {
  if (!ctx || !sfx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g);
  g.connect(sfx);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function whoosh(start: number, dur: number, from: number, to: number, peak: number): void {
  if (!ctx || !sfx || !noise) return;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.4;
  f.frequency.setValueAtTime(from, start);
  f.frequency.exponentialRampToValueAtTime(to, start + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f);
  f.connect(g);
  g.connect(sfx);
  src.start(start);
  src.stop(start + dur + 0.02);
}

const semis = (n: number) => 2 ** (n / 12);
let lastTap = 0;
let buyStreak = 0;
let lastBuy = 0;

export const sounds = {
  tap(crit: boolean) {
    if (!ensure() || !ctx) return;
    const t = ctx.currentTime;
    if (t - lastTap < 0.045) return; // at most ~20 taps of sound a second
    lastTap = t;
    const f = 520 * semis(Math.floor(Math.random() * 3));
    tone(f, t, 0.09, 'sine', 0.35, f * 0.6);
    if (crit) tone(f * 2, t + 0.01, 0.16, 'triangle', 0.22, f * 2.4);
  },
  buy() {
    if (!ensure() || !ctx) return;
    const t = ctx.currentTime;
    buyStreak = t - lastBuy < 1.4 ? Math.min(buyStreak + 1, 12) : 0;
    lastBuy = t;
    const f = 600 * semis(buyStreak);
    tone(f, t, 0.12, 'triangle', 0.3);
    tone(f * 1.5, t + 0.035, 0.14, 'sine', 0.18);
  },
  denied() {
    if (!ensure() || !ctx) return;
    tone(190, ctx.currentTime, 0.12, 'sine', 0.25, 140);
  },
  tierUp() {
    if (!ensure() || !ctx) return;
    const t = ctx.currentTime;
    [0, 4, 7, 12, 16].forEach((n, i) => tone(392 * semis(n), t + i * 0.07, 0.45, 'triangle', 0.24));
    whoosh(t, 0.9, 400, 4000, 0.12);
  },
  comet() {
    if (!ensure() || !ctx) return;
    whoosh(ctx.currentTime, 0.7, 2500, 500, 0.08);
  },
  catchComet() {
    if (!ensure() || !ctx) return;
    const t = ctx.currentTime;
    [0, 7, 12, 19].forEach((n, i) => tone(660 * semis(n), t + i * 0.05, 0.3, 'sine', 0.2));
  },
  medal() {
    if (!ensure() || !ctx) return;
    const t = ctx.currentTime;
    [0, 5, 9].forEach((n, i) => tone(880 * semis(n), t + i * 0.06, 0.25, 'sine', 0.16));
  },
  toast() {
    if (!ensure() || !ctx) return;
    const t = ctx.currentTime;
    tone(988, t, 0.14, 'sine', 0.1);
    tone(1319, t + 0.08, 0.18, 'sine', 0.1);
  },
};

export function installAudio(): void {
  // Unlock the context on the first gesture; nothing plays before that.
  const unlock = () => {
    ensure();
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  snapshotStore.subscribe(applyVolumes);
  events.on((e) => {
    if (!ctx) return; // no sound until the player has interacted
    switch (e.t) {
      case 'tap':
        sounds.tap(e.crit);
        break;
      case 'purchase':
        sounds.buy();
        break;
      case 'tierUp':
        sounds.tierUp();
        break;
      case 'comet':
        if (e.kind === 'spawn') sounds.comet();
        else sounds.catchComet();
        break;
      case 'achievement':
        sounds.medal();
        break;
      case 'unlock':
        sounds.toast();
        break;
    }
  });
}
