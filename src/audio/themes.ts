/**
 * Short pieces of music for the big moments (played by src/audio/index.ts, with the soundtrack
 * dipping underneath). Each is a list of notes in semitones above its root, so every theme is
 * pure data and testable. Evolving climbs one step of a major scale with every Star Tier, so each
 * new tier sounds higher than the last.
 */
export interface ThemeNote {
  /** Seconds from the start. */
  at: number;
  semis: number;
  dur: number;
  wave: OscillatorType;
  /** 0 to 1. */
  vel: number;
  /** Slide to this many semitones by the end. */
  glide?: number;
}

export interface Theme {
  id: string;
  root: number;
  notes: readonly ThemeNote[];
  /** Seconds the soundtrack stays dipped. */
  length: number;
}

const run = (semis: readonly number[], gap: number, from: number, dur: number, wave: OscillatorType, vel: number): ThemeNote[] => semis.map((s, i) => ({ at: from + i * gap, semis: s, dur, wave, vel }));
const chord = (semis: readonly number[], at: number, dur: number, wave: OscillatorType, vel: number): ThemeNote[] => semis.map((s) => ({ at, semis: s, dur, wave, vel }));

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];

/** Evolving the star: a rising call and a held chord, a step higher for every tier. */
export function evolveTheme(tier: number): Theme {
  const root = 261.63 * 2 ** (MAJOR_STEPS[((tier % 12) + 12) % 12]! / 12);
  return {
    id: `evolve.${tier}`,
    root,
    notes: [...run([0, 4, 7], 0.09, 0, 0.25, 'triangle', 0.8), ...chord([12, 7, 16], 0.3, 1.1, 'triangle', 0.7), { at: 0.3, semis: -12, dur: 1.2, wave: 'sine', vel: 0.8 }],
    length: 1.5,
  };
}

export const THEMES: Readonly<Record<string, Theme>> = {
  supernova: {
    id: 'supernova',
    root: 392,
    notes: [...run([0, 2, 4, 7, 9, 12, 14, 16], 0.06, 0, 0.3, 'triangle', 0.6), ...chord([12, 16, 19, 24], 0.55, 1.5, 'triangle', 0.7), { at: 0.5, semis: -24, dur: 1.4, wave: 'sine', vel: 1, glide: -31 }],
    length: 2,
  },
  nebula: {
    id: 'nebula',
    root: 349.23,
    notes: [...run([0, 4, 6, 11, 14, 18], 0.13, 0, 1.2, 'sine', 0.6), ...chord([0, 7, 11, 14], 0.85, 1.8, 'triangle', 0.55), { at: 0.85, semis: -12, dur: 1.8, wave: 'sine', vel: 0.8 }],
    length: 2.6,
  },
  singularity: {
    id: 'singularity',
    root: 196,
    notes: [...run([24, 22, 19, 15, 12], 0.1, 0, 0.35, 'triangle', 0.6), ...chord([-12, -9, -5, 0], 0.6, 1.8, 'sawtooth', 0.28), { at: 0.6, semis: 0, dur: 1.6, wave: 'sine', vel: 0.9, glide: -12 }],
    length: 2.4,
  },
  galactic: {
    id: 'galactic',
    root: 261.63,
    notes: [
      { at: 0, semis: 0, dur: 0.1, wave: 'sawtooth', vel: 0.35 },
      { at: 0.12, semis: 0, dur: 0.1, wave: 'sawtooth', vel: 0.35 },
      { at: 0.24, semis: 7, dur: 0.32, wave: 'sawtooth', vel: 0.4 },
      { at: 0.6, semis: 12, dur: 0.3, wave: 'sawtooth', vel: 0.4 },
      ...chord([12, 16, 19, 24], 0.9, 1.6, 'triangle', 0.7),
      { at: 0.9, semis: -12, dur: 1.6, wave: 'sine', vel: 0.9 },
    ],
    length: 2.5,
  },
  crunch: {
    id: 'crunch',
    root: 196,
    notes: [...run([0, 7, 12, 16, 19, 24], 0.08, 1.2, 1.2, 'triangle', 0.6), ...chord([12, 16, 19], 1.9, 1.8, 'triangle', 0.6), { at: 1.9, semis: -12, dur: 1.8, wave: 'sine', vel: 0.7 }],
    length: 3.6,
  },
  multiverse: {
    id: 'multiverse',
    root: 261.63,
    notes: [...run([0, 4, 7, 11, 14, 16, 19, 23, 24], 0.07, 0.95, 1.4, 'triangle', 0.5), ...run([24, 23, 19, 16, 14, 12], 0.11, 1.7, 0.6, 'sine', 0.5), ...chord([12, 16, 19, 23], 2.4, 2, 'triangle', 0.6)],
    length: 4.2,
  },
  medal: { id: 'medal', root: 880, notes: [...run([0, 4, 7, 12], 0.06, 0, 0.3, 'sine', 0.6), { at: 0.26, semis: 16, dur: 0.6, wave: 'sine', vel: 0.45 }], length: 0.8 },
  unlock: { id: 'unlock', root: 523.25, notes: [...chord([0, 4, 7], 0, 0.4, 'triangle', 0.5), ...chord([5, 9, 12], 0.28, 0.9, 'triangle', 0.55)], length: 1.2 },
  recipe: { id: 'recipe', root: 523.25, notes: run([0, 7, 12, 7, 19, 24], 0.055, 0, 0.25, 'sine', 0.55), length: 0.6 },
  defense: {
    id: 'defense',
    root: 293.66,
    notes: [...run([0, 0, 7], 0.1, 0, 0.12, 'square', 0.25), ...run([5, 7], 0.1, 0.38, 0.12, 'square', 0.25), ...chord([12, 16, 19], 0.62, 0.8, 'triangle', 0.55)],
    length: 1.4,
  },
  sigil: { id: 'sigil', root: 220, notes: [...run([0, 6, 11, 13], 0.18, 0, 1.4, 'sine', 0.5), { at: 0.7, semis: -12, dur: 1.6, wave: 'sawtooth', vel: 0.18 }], length: 2.2 },
};
