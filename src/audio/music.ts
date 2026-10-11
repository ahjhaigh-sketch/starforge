/**
 * The soundtrack (UI style tab, "Sound"): synthesised live with WebAudio, so there are no files.
 * A calm loop of four-bar phrases; each layer you reach adds an instrument: a pad from the start,
 * then arpeggios (first Supernova), bass (first Nebula), soft percussion (first Singularity),
 * shimmering bells (first Galactic Rebirth) and a choir (first Big Crunch).
 * Three soundtracks: Starlight (major pentatonic), Deep Void (minor) and Nebula (lydian), or off.
 *
 * Everything that decides what plays (scales, chords, which instruments, each bar's notes) is pure
 * and tested; only `startMusic` touches the audio graph. Notes are scheduled a little ahead of the
 * audio clock, so the music never stutters when the page is busy.
 */

export type Instrument = 'pad' | 'arp' | 'bass' | 'perc' | 'shimmer' | 'choir';

/** In the order they join: the number of layers reached says how many play. */
export const INSTRUMENTS: readonly Instrument[] = ['pad', 'arp', 'bass', 'perc', 'shimmer', 'choir'];

export function musicLayers(layersReached: number): Instrument[] {
  return INSTRUMENTS.slice(0, 1 + Math.max(0, Math.min(INSTRUMENTS.length - 1, Math.floor(layersReached))));
}

export interface Soundtrack {
  id: string;
  name: string;
  /** Frequency of scale degree 0 in the middle octave. */
  root: number;
  /** Semitones above the root, one octave. */
  scale: readonly number[];
  /** Beats a minute. */
  bpm: number;
  /** The scale degree each bar's chord is built on, a four-bar phrase. */
  chords: readonly number[];
}

export const SOUNDTRACKS: readonly Soundtrack[] = [
  { id: 'starlight', name: 'Starlight', root: 261.63, scale: [0, 2, 4, 7, 9], bpm: 84, chords: [0, 3, 4, 2] },
  { id: 'deepvoid', name: 'Deep Void', root: 220, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 72, chords: [0, 5, 3, 4] },
  { id: 'nebula', name: 'Nebula', root: 174.61, scale: [0, 2, 4, 6, 7, 9, 11], bpm: 78, chords: [0, 1, 4, 0] },
];

export const SOUNDTRACK_BY_ID: ReadonlyMap<string, Soundtrack> = new Map(SOUNDTRACKS.map((t) => [t.id, t]));

/** The frequency of a scale degree (any integer: it wraps into higher or lower octaves). */
export function degreeFreq(t: Soundtrack, degree: number, octave = 0): number {
  const n = t.scale.length;
  const o = Math.floor(degree / n);
  const step = t.scale[((degree % n) + n) % n]!;
  return t.root * 2 ** (octave + o + step / 12);
}

export interface NoteEvent {
  inst: Instrument;
  /** Beats from the start of the bar. */
  at: number;
  /** Length in beats. */
  len: number;
  freq: number;
  /** 0 to 1, before the instrument's own level. */
  vel: number;
}

/** A small deterministic hash, so a bar always plays the same way (and tests can check it). */
function hash(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Every note of one 4-beat bar. */
export function barNotes(t: Soundtrack, bar: number, layers: readonly Instrument[]): NoteEvent[] {
  const chord = t.chords[((bar % t.chords.length) + t.chords.length) % t.chords.length]!;
  // a triad from the scale: every other degree, so it always fits the soundtrack's mode
  const triad = [chord, chord + 2, chord + 4];
  const out: NoteEvent[] = [];
  const has = (i: Instrument) => layers.includes(i);
  if (has('pad')) for (const d of triad) out.push({ inst: 'pad', at: 0, len: 4, freq: degreeFreq(t, d, -1), vel: 0.8 });
  if (has('arp')) {
    const pattern = [0, 1, 2, 1, 0, 2, 1, 2];
    pattern.forEach((k, i) => out.push({ inst: 'arp', at: i * 0.5, len: 0.45, freq: degreeFreq(t, triad[k]!, 0), vel: i % 2 === 0 ? 0.8 : 0.55 }));
  }
  if (has('bass')) {
    out.push({ inst: 'bass', at: 0, len: 1.6, freq: degreeFreq(t, chord, -2), vel: 0.9 });
    out.push({ inst: 'bass', at: 2, len: 1.6, freq: degreeFreq(t, chord + (bar % 2 === 0 ? 4 : 0), -2), vel: 0.75 });
  }
  if (has('perc')) {
    out.push({ inst: 'perc', at: 0, len: 0.3, freq: 60, vel: 0.9 });
    out.push({ inst: 'perc', at: 2, len: 0.3, freq: 60, vel: 0.7 });
    for (const at of [1, 3]) out.push({ inst: 'perc', at, len: 0.12, freq: 8000, vel: 0.45 });
  }
  if (has('shimmer')) {
    for (let i = 0; i < 16; i++) {
      if (hash(bar, i) < 0.18) out.push({ inst: 'shimmer', at: i * 0.25, len: 1.5, freq: degreeFreq(t, Math.floor(hash(i, bar) * t.scale.length * 2), 1), vel: 0.5 + hash(bar + 7, i) * 0.5 });
    }
  }
  if (has('choir') && bar % 2 === 0) for (const d of [chord, chord + 4]) out.push({ inst: 'choir', at: 0, len: 8, freq: degreeFreq(t, d, -1), vel: 0.7 });
  return out;
}

// ---------- playing it ----------

export interface MusicSettings {
  soundtrack: string;
  layers: number;
}

const LOOKAHEAD = 0.25;
/** Each instrument's level under the music volume. */
const LEVEL: Record<Instrument, number> = { pad: 0.06, arp: 0.05, bass: 0.09, perc: 0.08, shimmer: 0.035, choir: 0.045 };

/**
 * Starts the scheduler on an audio context, playing into `out`. `read` gives the current settings
 * each time a bar is scheduled. Returns a stop function.
 */
export function startMusic(ctx: AudioContext, out: AudioNode, read: () => MusicSettings): () => void {
  let noise: AudioBuffer | null = null;
  let bar = 0;
  let nextBar = ctx.currentTime + 0.2;

  const voice = (n: NoteEvent, start: number, beat: number) => {
    const end = start + n.len * beat;
    const g = ctx.createGain();
    const peak = LEVEL[n.inst] * n.vel;
    g.connect(out);
    if (n.inst === 'perc' && n.freq > 1000) {
      noise ??= makeNoise(ctx);
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = n.freq;
      src.connect(hp);
      hp.connect(g);
      envelope(g, start, 0.003, end, peak);
      src.start(start);
      src.stop(end + 0.05);
      return;
    }
    const attack = n.inst === 'pad' || n.inst === 'choir' ? 0.8 : n.inst === 'shimmer' ? 0.005 : 0.01;
    const make = (type: OscillatorType, detune: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(n.freq, start);
      o.detune.value = detune;
      if (n.inst === 'perc') o.frequency.exponentialRampToValueAtTime(30, start + 0.25);
      return o;
    };
    const oscs: OscillatorNode[] = [];
    let into: AudioNode = g;
    if (n.inst === 'pad' || n.inst === 'choir') {
      const lp = ctx.createBiquadFilter();
      lp.type = n.inst === 'choir' ? 'bandpass' : 'lowpass';
      lp.frequency.value = n.inst === 'choir' ? 800 : 1100;
      lp.Q.value = n.inst === 'choir' ? 2.5 : 0.7;
      lp.connect(g);
      into = lp;
      oscs.push(make('sawtooth', -7), make('sawtooth', 7));
    } else if (n.inst === 'arp') oscs.push(make('triangle', 0));
    else if (n.inst === 'bass') oscs.push(make('sine', 0), make('triangle', 0));
    else oscs.push(make('sine', 0));
    for (const o of oscs) {
      o.connect(into);
      o.start(start);
      o.stop(end + 0.6);
    }
    envelope(g, start, attack, end, peak);
  };

  const schedule = () => {
    const s = read();
    const t = SOUNDTRACK_BY_ID.get(s.soundtrack);
    // off, or caught up after a pause: start the next bar from now
    if (!t) {
      nextBar = ctx.currentTime + 0.2;
      return;
    }
    if (nextBar < ctx.currentTime) nextBar = ctx.currentTime + 0.05;
    const beat = 60 / t.bpm;
    while (nextBar < ctx.currentTime + LOOKAHEAD) {
      for (const n of barNotes(t, bar, musicLayers(s.layers))) voice(n, nextBar + n.at * beat, beat);
      bar++;
      nextBar += 4 * beat;
    }
  };

  // a scheduling heartbeat for the audio clock (not a game timer: nothing in the game waits on it)
  const id = window.setInterval(schedule, 100);
  schedule();
  return () => window.clearInterval(id);
}

function envelope(g: GainNode, start: number, attack: number, end: number, peak: number): void {
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
  g.gain.setValueAtTime(Math.max(0.0002, peak), Math.max(start + attack, end - 0.05));
  g.gain.exponentialRampToValueAtTime(0.0001, end + 0.5);
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const b = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
