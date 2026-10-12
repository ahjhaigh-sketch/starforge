/**
 * The soundtrack (UI style tab, "Sound"): composed and synthesised live with WebAudio, so there are
 * no files. Seven songs, one for each stage of the game, and Journey (the default) moves from one to
 * the next as you reach each reset layer. A song is a form of four-bar sections (intro, verse,
 * chorus, bridge) with its own key, mode, tempo and feel; the lead melody is built from a motif that
 * repeats and answers itself, and changes a little on every pass, so it never sounds like a loop.
 * Each layer you reach adds an instrument: pad and melody from the start, then arpeggios (first
 * Supernova), bass (Nebula), percussion (Singularity), shimmering bells (Galactic) and a choir (Big
 * Crunch).
 *
 * Everything that decides what plays (songs, sections, every bar's notes) is pure and tested; only
 * `startMusic` touches the audio graph. Notes are scheduled a little ahead of the audio clock, so the
 * music never stutters when the page is busy.
 */

export type Instrument = 'pad' | 'lead' | 'arp' | 'bass' | 'perc' | 'shimmer' | 'choir';

/** In the order they join: pad and melody from the start, then one more per layer reached. */
export const INSTRUMENTS: readonly Instrument[] = ['pad', 'lead', 'arp', 'bass', 'perc', 'shimmer', 'choir'];

export function musicLayers(layersReached: number): Instrument[] {
  return INSTRUMENTS.slice(0, 2 + Math.max(0, Math.min(INSTRUMENTS.length - 2, Math.floor(layersReached))));
}

type Section = 'I' | 'A' | 'B' | 'C';

export interface Soundtrack {
  id: string;
  name: string;
  /** What it sounds like, for Settings. */
  mood: string;
  /** Frequency of scale degree 0 in the middle octave. */
  root: number;
  /** Semitones above the root, one octave. */
  scale: readonly number[];
  /** Beats a minute. */
  bpm: number;
  /** Each section's four bars, as the scale degree each bar's chord is built on (I uses A's). */
  sections: Readonly<Record<'A' | 'B' | 'C', readonly number[]>>;
  /** The order of the sections, four bars each; then it plays again, varied. */
  form: string;
  arp: 'flow' | 'climb' | 'sparkle';
  bass: 'roots' | 'pulse' | 'walk';
  perc: 'soft' | 'drive' | 'half';
  /** Seeds the melody, so each song has its own tune. */
  seed: number;
}

export const SOUNDTRACKS: readonly Soundtrack[] = [
  { id: 'dawn', name: 'Starlight', mood: 'gentle, hopeful', root: 261.63, scale: [0, 2, 4, 7, 9], bpm: 84, sections: { A: [0, 3, 4, 2], B: [3, 4, 0, 4], C: [2, 3, 1, 4] }, form: 'IAABACB', arp: 'flow', bass: 'roots', perc: 'soft', seed: 11 },
  { id: 'ember', name: 'Ember Forge', mood: 'busy, warm', root: 293.66, scale: [0, 2, 4, 5, 7, 9, 10], bpm: 100, sections: { A: [0, 6, 3, 0], B: [3, 4, 6, 0], C: [5, 3, 6, 4] }, form: 'IAABABCB', arp: 'climb', bass: 'pulse', perc: 'drive', seed: 23 },
  { id: 'nebula', name: 'Nebula', mood: 'floating, wide', root: 174.61, scale: [0, 2, 4, 6, 7, 9, 11], bpm: 76, sections: { A: [0, 1, 4, 0], B: [5, 1, 0, 4], C: [3, 1, 5, 4] }, form: 'IAABACAB', arp: 'sparkle', bass: 'roots', perc: 'half', seed: 37 },
  { id: 'deepvoid', name: 'Deep Void', mood: 'dark, slow', root: 220, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 70, sections: { A: [0, 5, 3, 4], B: [5, 6, 0, 4], C: [3, 5, 6, 4] }, form: 'IAABACB', arp: 'flow', bass: 'walk', perc: 'half', seed: 41 },
  { id: 'spiral', name: 'Spiral Arms', mood: 'bold, rising', root: 164.81, scale: [0, 2, 3, 5, 7, 9, 10], bpm: 92, sections: { A: [0, 3, 0, 6], B: [2, 3, 4, 0], C: [5, 6, 3, 4] }, form: 'IAABABCBB', arp: 'climb', bass: 'pulse', perc: 'drive', seed: 53 },
  { id: 'eternity', name: 'Eternity', mood: 'vast, choral', root: 233.08, scale: [0, 2, 4, 5, 7, 9, 11], bpm: 66, sections: { A: [0, 4, 5, 3], B: [3, 0, 4, 0], C: [5, 3, 1, 4] }, form: 'IAABACB', arp: 'flow', bass: 'roots', perc: 'soft', seed: 67 },
  { id: 'manyworlds', name: 'Many Worlds', mood: 'bright, strange', root: 196, scale: [0, 2, 4, 6, 7, 9, 11], bpm: 80, sections: { A: [0, 1, 5, 4], B: [3, 1, 0, 5], C: [6, 5, 1, 4] }, form: 'IAABACBA', arp: 'sparkle', bass: 'walk', perc: 'half', seed: 79 },
];

export const SOUNDTRACK_BY_ID: ReadonlyMap<string, Soundtrack> = new Map(SOUNDTRACKS.map((t) => [t.id, t]));

/** Journey: the song for each stage, in order (start, Supernova, Nebula, Singularity, Galactic, Crunch, Multiverse). */
export const JOURNEY: readonly string[] = ['dawn', 'ember', 'nebula', 'deepvoid', 'spiral', 'eternity', 'manyworlds'];

/** What Settings offers. 'starlight' (the setting saved since 1.0) is now Journey. */
export const MUSIC_CHOICES: ReadonlyArray<{ id: string; name: string; mood: string }> = [
  { id: 'starlight', name: 'Journey', mood: 'changes as you reach each layer' },
  ...SOUNDTRACKS.map((t) => ({ id: t.id, name: t.name, mood: t.mood })),
];

/** The song a setting plays at a stage (layers reached, 0 to 6), or null for off. */
export function songFor(setting: string, stage: number): Soundtrack | null {
  if (setting === 'starlight') return SOUNDTRACK_BY_ID.get(JOURNEY[Math.max(0, Math.min(JOURNEY.length - 1, Math.floor(stage)))]!)!;
  return SOUNDTRACK_BY_ID.get(setting) ?? null;
}

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

/** Where a bar falls in its song: the section, the bar within it, and which pass of the form. */
export function songPlace(t: Soundtrack, bar: number): { section: Section; inSection: number; pass: number; chord: number; occurrence: number } {
  const len = t.form.length * 4;
  const b = ((bar % len) + len) % len;
  const section = t.form[Math.floor(b / 4)] as Section;
  const inSection = b % 4;
  const chords = t.sections[section === 'I' ? 'A' : section];
  // how many times this section has come round before in the form (a second verse answers differently)
  const occurrence = t.form.slice(0, Math.floor(b / 4)).split('').filter((x) => x === section).length;
  return { section, inSection, pass: Math.floor(bar / len), chord: chords[inSection]!, occurrence };
}

/** Which instruments a section uses (of those you have): the intro is quiet, the chorus is full. */
const SECTION_INSTRUMENTS: Record<Section, readonly Instrument[]> = {
  I: ['pad', 'shimmer', 'arp'],
  A: ['pad', 'lead', 'arp', 'bass', 'perc'],
  B: ['pad', 'lead', 'arp', 'bass', 'perc', 'shimmer', 'choir'],
  C: ['pad', 'lead', 'bass', 'shimmer', 'choir'],
};

/** Melody rhythms (onsets in beats, with lengths), one picked per section and pass. */
const RHYTHMS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1.5], [3.5, 0.5]],
  [[0, 1.5], [1.5, 0.5], [2, 1], [3, 1]],
  [[0, 0.5], [0.5, 0.5], [1, 1], [2, 0.5], [2.5, 0.5], [3, 1]],
  [[0, 2], [2, 1], [3, 0.5], [3.5, 0.5]],
  [[0.5, 0.5], [1, 1], [2, 1], [3, 1]],
];

/**
 * The lead melody for one bar. The first and third bars of a section share a motif (moved onto
 * each bar's chord), the second answers it, and the fourth comes home on a long chord tone. Strong
 * beats land on chord tones; the notes between step through the scale.
 */
function melody(t: Soundtrack, place: ReturnType<typeof songPlace>): Array<{ at: number; len: number; degree: number; vel: number }> {
  const sec = place.section.charCodeAt(0);
  const variant = place.pass % 3;
  const motifSeed = t.seed * 31 + sec * 7 + variant;
  const rhythm = RHYTHMS[Math.floor(hash(motifSeed, 1) * RHYTHMS.length)]!;
  // the hook (bars 1 and 3) stays the same each time a section comes round; the answer and ending change
  const answerSeed = motifSeed + place.occurrence * 101;
  const answer = RHYTHMS[Math.floor(hash(answerSeed, 2) * RHYTHMS.length)]!;
  const triad = [place.chord, place.chord + 2, place.chord + 4];
  if (place.inSection === 3) {
    // the cadence: a short pickup, then a long chord tone
    const home = place.occurrence % 2 === 0 ? triad[0]! : triad[2]!;
    return [
      { at: 0, len: 0.5, degree: triad[2]!, vel: 0.65 },
      { at: 0.5, len: 0.5, degree: triad[1]!, vel: 0.65 },
      { at: 1, len: 3, degree: home, vel: 0.85 },
    ];
  }
  const shape = place.inSection === 1 ? answer : rhythm;
  const out: Array<{ at: number; len: number; degree: number; vel: number }> = [];
  let degree = triad[Math.floor(hash(motifSeed, 3) * 3)]!;
  shape.forEach(([at, len], i) => {
    if (at % 1 === 0) {
      // on the beat: the nearest chord tone to where the line is
      let best = triad[0]!;
      for (const c of [...triad, triad[0]! + t.scale.length]) if (Math.abs(c - degree) < Math.abs(best - degree)) best = c;
      degree = best;
    } else {
      // between beats: a step up or down, shaped by the motif
      degree += hash(place.inSection === 1 ? answerSeed : motifSeed, 10 + i) < 0.5 ? -1 : 1;
    }
    out.push({ at, len, degree, vel: at % 2 === 0 ? 0.85 : 0.65 });
  });
  return out;
}

/** Every note of one 4-beat bar of a song, with the instruments you have. */
export function barNotes(t: Soundtrack, bar: number, layers: readonly Instrument[]): NoteEvent[] {
  const place = songPlace(t, bar);
  const { chord, section } = place;
  const triad = [chord, chord + 2, chord + 4];
  const out: NoteEvent[] = [];
  const has = (i: Instrument) => layers.includes(i) && SECTION_INSTRUMENTS[section].includes(i);
  if (has('pad')) for (const d of triad) out.push({ inst: 'pad', at: 0, len: 4, freq: degreeFreq(t, d, -1), vel: section === 'I' ? 0.6 : 0.8 });
  if (has('lead')) {
    // the bridge sings an octave higher and softer; the chorus is the strongest
    const octave = section === 'C' ? 1 : 0;
    const level = section === 'B' ? 1 : 0.8;
    for (const m of melody(t, place)) out.push({ inst: 'lead', at: m.at, len: m.len * 0.95, freq: degreeFreq(t, m.degree, octave), vel: m.vel * level });
  }
  if (has('arp')) {
    const patterns = { flow: [0, 1, 2, 1, 0, 2, 1, 2], climb: [0, 1, 2, 3, 0, 1, 2, 3], sparkle: [2, 0, 3, 1, 2, 0, 3, 1] } as const;
    const notes = [...triad, triad[0]! + t.scale.length];
    const sparse = section === 'I' || section === 'A';
    patterns[t.arp].forEach((k, i) => {
      if (sparse && i % 2 === 1) return;
      out.push({ inst: 'arp', at: i * 0.5, len: 0.45, freq: degreeFreq(t, notes[k]!, 0), vel: i % 2 === 0 ? 0.75 : 0.5 });
    });
  }
  if (has('bass')) {
    if (t.bass === 'pulse') for (let i = 0; i < 8; i++) out.push({ inst: 'bass', at: i * 0.5, len: 0.4, freq: degreeFreq(t, i === 6 ? chord + 4 : chord, -2), vel: i % 2 === 0 ? 0.9 : 0.6 });
    else if (t.bass === 'walk') [0, 2, 4, 2].forEach((d, i) => out.push({ inst: 'bass', at: i, len: 0.9, freq: degreeFreq(t, chord + d, -2), vel: i === 0 ? 0.9 : 0.7 }));
    else {
      out.push({ inst: 'bass', at: 0, len: 1.6, freq: degreeFreq(t, chord, -2), vel: 0.9 });
      out.push({ inst: 'bass', at: 2, len: 1.6, freq: degreeFreq(t, chord + (place.inSection % 2 === 0 ? 4 : 0), -2), vel: 0.75 });
    }
  }
  if (has('perc')) {
    const kick = (at: number, vel: number) => out.push({ inst: 'perc', at, len: 0.3, freq: 60, vel });
    const hat = (at: number, vel: number) => out.push({ inst: 'perc', at, len: 0.1, freq: 8000, vel });
    const snare = (at: number) => out.push({ inst: 'perc', at, len: 0.22, freq: 1800, vel: 0.5 });
    if (t.perc === 'drive') {
      for (let i = 0; i < 4; i++) kick(i, i % 2 === 0 ? 0.9 : 0.6);
      for (let i = 0; i < 8; i++) hat(i * 0.5, i % 2 === 1 ? 0.45 : 0.25);
      if (section === 'B') snare(3.5);
    } else if (t.perc === 'half') {
      kick(0, 0.9);
      snare(2);
      for (const at of [1, 3]) hat(at, 0.35);
    } else {
      kick(0, 0.9);
      kick(2, 0.7);
      for (const at of [1, 3]) hat(at, 0.45);
    }
  }
  if (has('shimmer')) {
    for (let i = 0; i < 16; i++) {
      if (hash(bar * 3 + t.seed, i) < (section === 'B' ? 0.22 : 0.12)) out.push({ inst: 'shimmer', at: i * 0.25, len: 1.5, freq: degreeFreq(t, chord + Math.floor(hash(i, bar + t.seed) * 5), 1), vel: 0.5 + hash(bar + 7, i) * 0.5 });
    }
  }
  if (has('choir') && place.inSection % 2 === 0) for (const d of [chord, chord + 4]) out.push({ inst: 'choir', at: 0, len: 8, freq: degreeFreq(t, d, -1), vel: 0.7 });
  return out;
}

// ---------- playing it ----------

export interface MusicSettings {
  soundtrack: string;
  layers: number;
}

const LOOKAHEAD = 0.25;
/** Each instrument's level under the music volume. */
const LEVEL: Record<Instrument, number> = { pad: 0.055, lead: 0.05, arp: 0.04, bass: 0.085, perc: 0.07, shimmer: 0.03, choir: 0.04 };

/**
 * Starts the scheduler on an audio context, playing into `out`. `read` gives the current settings
 * each time a bar is scheduled. A new song (another stage on Journey, or another choice) starts at
 * the top of its form. Returns a stop function.
 */
export function startMusic(ctx: AudioContext, out: AudioNode, read: () => MusicSettings): () => void {
  let noise: AudioBuffer | null = null;
  let bar = 0;
  let playing = '';
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
      const f = ctx.createBiquadFilter();
      // hats are bright; the snare is a band of noise lower down
      f.type = n.freq > 4000 ? 'highpass' : 'bandpass';
      f.frequency.value = n.freq;
      if (f.type === 'bandpass') f.Q.value = 0.8;
      src.connect(f);
      f.connect(g);
      envelope(g, start, 0.003, end, peak);
      src.start(start);
      src.stop(end + 0.05);
      return;
    }
    const attack = n.inst === 'pad' || n.inst === 'choir' ? 0.8 : n.inst === 'shimmer' ? 0.005 : n.inst === 'lead' ? 0.025 : 0.01;
    const make = (type: OscillatorType, detune: number, mult = 1) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(n.freq * mult, start);
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
    } else if (n.inst === 'lead') {
      // a soft flute-like voice with a gentle vibrato that grows into longer notes
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      lp.connect(g);
      into = lp;
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 5.2;
      depth.gain.setValueAtTime(0, start);
      depth.gain.linearRampToValueAtTime(n.len * beat > 0.6 ? 9 : 0, start + 0.35);
      lfo.connect(depth);
      lfo.start(start);
      lfo.stop(end + 0.6);
      const a = make('triangle', 0);
      const b = make('sine', 3, 2);
      depth.connect(a.detune);
      depth.connect(b.detune);
      oscs.push(a, b);
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
    const t = songFor(s.soundtrack, s.layers);
    // off, or caught up after a pause: start the next bar from now
    if (!t) {
      nextBar = ctx.currentTime + 0.2;
      playing = '';
      return;
    }
    if (t.id !== playing) {
      playing = t.id;
      bar = 0;
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
