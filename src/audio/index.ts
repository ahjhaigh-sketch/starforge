import { snapshotStore } from '../app/uiSnapshot';
import { events } from '../engine/events';
import { startMusic } from './music';
import { evolveTheme, type Theme, THEMES } from './themes';

/**
 * The one audio module (CLAUDE.md rule 14). Every sound is synthesised with WebAudio, so there are
 * no files to download: short, bright, soft. Purchases climb in pitch when repeated quickly;
 * automation buys quietly. Each reset layer has its own sound. The soundtrack (music.ts) plays
 * through its own volume. The context starts on the first tap or key press (browsers require a
 * gesture) and sleeps while the tab is hidden.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let music: GainNode | null = null;
/** Between the soundtrack and the mix: dips while a theme plays over it. */
let duck: GainNode | null = null;
let noise: AudioBuffer | null = null;

function ensure(): boolean {
  if (ctx) {
    if (ctx.state === 'suspended' && !document.hidden) void ctx.resume();
    return true;
  }
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    sfx = ctx.createGain();
    music = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    sfx.connect(master);
    duck = ctx.createGain();
    music.connect(duck);
    duck.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    applyVolumes();
    startMusic(ctx, music, () => {
      const s = snapshotStore.getState();
      return { soundtrack: s.soundtrack, layers: s.musicLayers };
    });
    return true;
  } catch {
    ctx = null;
    return false;
  }
}

function applyVolumes(): void {
  if (!ctx || !master || !sfx || !music) return;
  const s = snapshotStore.getState();
  master.gain.setTargetAtTime(s.muted ? 0 : s.volumeMaster, ctx.currentTime, 0.02);
  sfx.gain.setTargetAtTime(s.volumeSfx * 0.6, ctx.currentTime, 0.02);
  music.gain.setTargetAtTime(s.soundtrack === 'off' ? 0 : s.volumeMusic, ctx.currentTime, 0.05);
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

/** Plays a theme over the soundtrack, which dips while it lasts. */
function playTheme(theme: Theme, delay = 0): void {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  for (const n of theme.notes) {
    const f = theme.root * semis(n.semis);
    tone(f, t + n.at, n.dur, n.wave, Math.max(0.002, n.vel * 0.22), n.glide !== undefined ? theme.root * semis(n.glide) : undefined);
  }
  if (duck) {
    duck.gain.cancelScheduledValues(t);
    duck.gain.setTargetAtTime(0.3, t, 0.06);
    duck.gain.setTargetAtTime(1, t + theme.length, 0.5);
  }
}
let lastTap = 0;
let buyStreak = 0;
let lastBuy = 0;
let lastHarvest = 0;
/** When a big sound (a reset, a new tier) last played: a priority toast right after stays quiet. */
let lastBig = -1;
const lastAt: Record<string, number> = {};
const RARE_STEPS: Record<string, number> = { gold: 0, crystal: 3, prismatic: 5, void: 7 };

/** True at most once every `gap` seconds per kind of sound (some events come in floods). */
function throttle(kind: string, gap: number): boolean {
  if (!ctx) return false;
  const t = ctx.currentTime;
  if (t - (lastAt[kind] ?? -1e9) < gap) return false;
  lastAt[kind] = t;
  return true;
}

/** Each reset layer's sweep (its theme is in themes.ts), from the bright Supernova down to the deep Singularity. */
const RESET_CHORDS: Record<string, { root: number; steps: number[]; sweep: [number, number] }> = {
  supernova: { root: 392, steps: [0, 4, 7, 12], sweep: [500, 5000] },
  nebula: { root: 349, steps: [0, 5, 9, 14], sweep: [800, 3000] },
  singularity: { root: 196, steps: [0, 3, 7, 10], sweep: [3000, 200] },
  galactic: { root: 262, steps: [0, 7, 12, 16, 19], sweep: [300, 6000] },
};

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
  /** Evolving: its own fanfare, a step higher for every Star Tier. */
  tierUp(tier = 1) {
    if (!ensure() || !ctx) return;
    const t = ctx.currentTime;
    lastBig = t;
    playTheme(evolveTheme(tier));
    whoosh(t, 0.9, 400, 4000, 0.12);
  },
  /** A system opens. */
  unlock() {
    if (!ensure() || !ctx || !throttle('unlock', 0.6)) return;
    playTheme(THEMES.unlock!);
  },
  /** A short theme by name (a recipe found, a new best wave, a sigil). */
  theme(id: string, gap = 0.5) {
    const th = THEMES[id];
    if (!th || !ensure() || !ctx || !throttle(`theme.${id}`, gap)) return;
    playTheme(th);
  },
  /** Every reset has its own chord; the Big Crunch falls into a point, then booms as it comes back. */
  reset(layer: string) {
    if (!ensure() || !ctx) return;
    const t = ctx.currentTime;
    if (layer === 'echoNova' || layer === 'echoNebula') {
      if (!throttle('echo', 0.3)) return;
      const f = layer === 'echoNova' ? 784 : 659;
      [0, 7, 12].forEach((n, i) => tone(f * semis(n), t + i * 0.05, 0.35, 'sine', 0.1));
      return;
    }
    lastBig = t;
    if (layer === 'crunch') {
      whoosh(t, 1.1, 6000, 120, 0.22);
      tone(330, t, 1.1, 'sawtooth', 0.06, 40);
      tone(55, t + 1.15, 1.6, 'sine', 0.5, 32);
      whoosh(t + 1.15, 1.4, 150, 7000, 0.18);
      playTheme(THEMES.crunch!);
      return;
    }
    if (layer === 'multiverse') {
      // glass cracks three times, shatters, then a rainbow of bells climbs over a low boom
      [0, 0.14, 0.26].forEach((d) => whoosh(t + d, 0.08, 7000, 3000, 0.12));
      whoosh(t + 0.85, 1.2, 9000, 300, 0.2);
      tone(65.4, t + 0.85, 1.8, 'sine', 0.45, 49);
      playTheme(THEMES.multiverse!);
      return;
    }
    const r = RESET_CHORDS[layer] ?? RESET_CHORDS.supernova!;
    whoosh(t, 1, r.sweep[0], r.sweep[1], 0.14);
    // each layer's own theme
    playTheme(THEMES[layer] ?? THEMES.supernova!);
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
  weather() {
    if (!ensure() || !ctx || !throttle('weather', 1)) return;
    const t = ctx.currentTime;
    tone(110, t, 1.6, 'sine', 0.22, 165);
    whoosh(t + 0.1, 1.4, 400, 3200, 0.06);
    [0, 7, 14].forEach((n, i) => tone(1320 * semis(n), t + 0.5 + i * 0.12, 0.6, 'sine', 0.06));
  },
  medal() {
    if (!ensure() || !ctx || !throttle('medal', 0.4)) return;
    playTheme(THEMES.medal!);
  },
  /** A soft pluck per harvest; rare asteroids add a sparkle that climbs with rarity. */
  harvest(rarity: string) {
    if (!ensure() || !ctx) return;
    const t = ctx.currentTime;
    const rare = RARE_STEPS[rarity];
    if (rare !== undefined) {
      [0, 4, 7, 12].forEach((n, i) => tone(1046 * semis(n + rare), t + i * 0.045, 0.3, 'sine', 0.16));
      return;
    }
    if (t - lastHarvest < 0.06) return;
    lastHarvest = t;
    const f = 330 * semis(Math.floor(Math.random() * 5));
    whoosh(t, 0.06, 3400, 1100, 0.09); // the crunch
    tone(f, t, 0.08, 'triangle', 0.2, f * 1.5);
  },
  toast() {
    if (!ensure() || !ctx) return;
    const t = ctx.currentTime;
    tone(988, t, 0.14, 'sine', 0.1);
    tone(1319, t + 0.08, 0.18, 'sine', 0.1);
  },
  /** Big news (a galaxy explored, the Mirror Key): a short fanfare, unless a reset or tier just sounded. */
  fanfare() {
    if (!ensure() || !ctx) return;
    const t = ctx.currentTime;
    if (t - lastBig < 0.8 || !throttle('fanfare', 1)) return;
    [0, 4, 7, 12].forEach((n, i) => tone(523 * semis(n), t + i * 0.09, 0.4, 'triangle', 0.16));
    tone(1046, t + 0.36, 0.6, 'sine', 0.1);
  },
  /** A rare rune: a sparkle that climbs higher the first time you find it. */
  rune(first: boolean) {
    if (!ensure() || !ctx || !throttle('rune', 0.25)) return;
    const t = ctx.currentTime;
    const top = first ? 4 : 3;
    for (let i = 0; i < top; i++) tone(1175 * semis(i * 4), t + i * 0.05, 0.3, 'sine', 0.13);
  },
  aura(first: boolean) {
    if (!ensure() || !ctx || !throttle('aura', 0.25)) return;
    const t = ctx.currentTime;
    whoosh(t, 0.8, 900, 5000, 0.08);
    [0, 7, 14].forEach((n, i) => tone(740 * semis(n), t + i * 0.1, 0.6, 'sine', first ? 0.15 : 0.1));
  },
  hatch() {
    if (!ensure() || !ctx || !throttle('hatch', 0.2)) return;
    const t = ctx.currentTime;
    whoosh(t, 0.08, 2600, 900, 0.1);
    tone(880, t + 0.05, 0.12, 'sine', 0.16, 1320);
    tone(1320, t + 0.13, 0.1, 'sine', 0.12, 1760);
  },
  card() {
    if (!ensure() || !ctx || !throttle('card', 0.12)) return;
    const t = ctx.currentTime;
    whoosh(t, 0.12, 5000, 2000, 0.08);
    tone(660, t + 0.06, 0.2, 'triangle', 0.12);
  },
  bhStage(stage: number) {
    if (!ensure() || !ctx || !throttle('bh', 0.4)) return;
    const t = ctx.currentTime;
    tone(55 * semis(stage), t, 1.2, 'sine', 0.35, 41 * semis(stage));
    whoosh(t, 1.2, 2000, 150, 0.1);
  },
  star() {
    if (!ensure() || !ctx || !throttle('star', 0.3)) return;
    const t = ctx.currentTime;
    [0, 4, 7, 11, 14].forEach((n, i) => tone(988 * semis(n), t + i * 0.05, 0.4, 'sine', 0.12));
  },
  smelt() {
    if (!ensure() || !ctx || !throttle('smelt', 0.6)) return;
    const t = ctx.currentTime;
    tone(1568, t, 0.25, 'square', 0.035);
    tone(2093, t + 0.04, 0.3, 'sine', 0.06);
  },
  mutation() {
    if (!ensure() || !ctx || !throttle('mutation', 0.3)) return;
    const t = ctx.currentTime;
    tone(440, t, 0.5, 'sine', 0.14, 660);
    tone(554, t + 0.08, 0.45, 'sine', 0.1, 415);
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
  // the music and every sound sleep while the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else void ctx.resume();
  });
  snapshotStore.subscribe(applyVolumes);
  events.on((e) => {
    if (!ctx) return; // no sound until the player has interacted
    switch (e.t) {
      case 'tap':
        sounds.tap(e.crit);
        break;
      case 'purchase':
        if (e.kind === 'sigil') sounds.theme('sigil');
        else if (!e.auto) sounds.buy();
        break;
      case 'tierUp':
        sounds.tierUp(e.tier);
        break;
      case 'reset':
        // automated resets (several a second late in the game) are silent, like automated purchases
        if (!e.auto) sounds.reset(e.layer);
        break;
      case 'comet':
        if (e.kind === 'spawn') sounds.comet();
        else sounds.catchComet();
        break;
      case 'weather':
        sounds.weather();
        break;
      case 'milestone':
        // a recipe found; a new best wave (auto-defend can win several in a row: one theme at a time)
        if (e.id.startsWith('alchemy.')) sounds.theme('recipe');
        else if (e.id.startsWith('defense.')) sounds.theme('defense', 4);
        break;
      case 'achievement':
        sounds.medal();
        break;
      case 'harvest':
        if (e.hand) sounds.harvest(e.rarity);
        break;
      case 'unlock':
        sounds.unlock();
        break;
      case 'toast':
        // decided after the event that raised it has played its own sound (a reset's toast arrives first)
        if (e.priority) queueMicrotask(() => sounds.fanfare());
        break;
      case 'rune':
        sounds.rune(e.first);
        break;
      case 'aura':
        sounds.aura(e.first);
        break;
      case 'hatch':
        sounds.hatch();
        break;
      case 'card':
        sounds.card();
        break;
      case 'bhStage':
        sounds.bhStage(e.stage);
        break;
      case 'star':
        sounds.star();
        break;
      case 'smelt':
        sounds.smelt();
        break;
      case 'mutation':
        if (e.firstOfKind) sounds.mutation();
        break;
    }
  });
}
