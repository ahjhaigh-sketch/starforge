import { describe, expect, it } from 'vitest';
import { barNotes, degreeFreq, INSTRUMENTS, JOURNEY, MUSIC_CHOICES, musicLayers, songFor, songPlace, SOUNDTRACK_BY_ID, SOUNDTRACKS } from '../../src/audio/music';
import { evolveTheme, THEMES } from '../../src/audio/themes';
import { plural } from '../../src/engine/words';

describe('the soundtrack', () => {
  it('starts with the pad and the melody and adds one instrument per layer reached, up to the choir', () => {
    expect(musicLayers(0)).toEqual(['pad', 'lead']);
    expect(musicLayers(1)).toEqual(['pad', 'lead', 'arp']);
    expect(musicLayers(5)).toEqual([...INSTRUMENTS]);
    expect(musicLayers(99)).toEqual([...INSTRUMENTS]);
    expect(musicLayers(-3)).toEqual(['pad', 'lead']);
  });

  it('every note of every song is in its key and audible, and only the instruments that joined play', () => {
    for (const t of SOUNDTRACKS) {
      const inScale = (f: number) => {
        const semis = Math.round(12 * Math.log2(f / t.root));
        return t.scale.includes(((semis % 12) + 12) % 12);
      };
      for (let layers = 0; layers <= 6; layers++) {
        const on = musicLayers(layers);
        for (let bar = 0; bar < t.form.length * 8; bar++) {
          for (const n of barNotes(t, bar, on)) {
            expect(on).toContain(n.inst);
            expect(n.at).toBeGreaterThanOrEqual(0);
            expect(n.at).toBeLessThan(4);
            expect(n.len).toBeGreaterThan(0);
            expect(n.freq).toBeGreaterThan(20);
            expect(n.freq).toBeLessThan(16000);
            if (n.inst !== 'perc') expect(inScale(n.freq)).toBe(true);
          }
        }
      }
    }
  });

  it('a song is sections, not a loop: its bars differ, and the melody changes from pass to pass', () => {
    for (const t of SOUNDTRACKS) {
      const all = musicLayers(6);
      const key = (bar: number) => JSON.stringify(barNotes(t, bar, all).filter((n) => n.inst === 'lead'));
      const form = t.form.length * 4;
      expect(new Set(Array.from({ length: form }, (_, b) => key(b))).size).toBeGreaterThan(form / 3);
      expect(Array.from({ length: form }, (_, b) => key(b)).join()).not.toBe(Array.from({ length: form }, (_, b) => key(b + form)).join());
      // the intro is quiet: no melody yet
      expect(songPlace(t, 0).section).toBe('I');
      expect(barNotes(t, 0, all).some((n) => n.inst === 'lead')).toBe(false);
    }
  });

  it('Journey (the setting saved since 1.0) plays a new song for each layer reached', () => {
    expect(new Set(JOURNEY).size).toBe(7);
    for (const id of JOURNEY) expect(SOUNDTRACK_BY_ID.has(id)).toBe(true);
    expect(songFor('starlight', 0)!.id).toBe('dawn');
    expect(songFor('starlight', 3)!.id).toBe('deepvoid');
    expect(songFor('starlight', 99)!.id).toBe('manyworlds');
    expect(songFor('nebula', 0)!.id).toBe('nebula');
    expect(songFor('off', 2)).toBeNull();
    expect(MUSIC_CHOICES[0]!.id).toBe('starlight');
  });

  it('plays the same bar the same way every time', () => {
    const t = SOUNDTRACKS[0]!;
    expect(barNotes(t, 7, musicLayers(5))).toEqual(barNotes(t, 7, musicLayers(5)));
    expect(degreeFreq(t, 0)).toBeCloseTo(t.root, 6);
    expect(degreeFreq(t, t.scale.length)).toBeCloseTo(t.root * 2, 6);
    expect(degreeFreq(t, -t.scale.length)).toBeCloseTo(t.root / 2, 6);
  });

  it('every big moment has its own theme, and evolving climbs with the tier', () => {
    for (const id of ['supernova', 'nebula', 'singularity', 'galactic', 'crunch', 'multiverse', 'medal', 'unlock', 'recipe', 'defense', 'sigil']) {
      const th = THEMES[id]!;
      expect(th.notes.length).toBeGreaterThan(2);
      for (const n of th.notes) expect(n.at + n.dur).toBeLessThanOrEqual(th.length + 0.5);
    }
    expect(evolveTheme(2).root).toBeGreaterThan(evolveTheme(1).root);
    expect(evolveTheme(11).root).toBeGreaterThan(evolveTheme(5).root);
  });
});

describe('plurals from data', () => {
  it('says Singularities, galaxies, Big Crunches, people and species', () => {
    expect(plural('Singularity', 2)).toBe('Singularities');
    expect(plural('galaxy', 5)).toBe('galaxies');
    expect(plural('Big Crunch', 3)).toBe('Big Crunches');
    expect(plural('Galactic Rebirth', 7)).toBe('Galactic Rebirths');
    expect(plural('person', 1e6)).toBe('people');
    expect(plural('species', 25)).toBe('species');
    expect(plural('Nebula', 1)).toBe('Nebula');
    expect(plural('Black Hole stage', 8)).toBe('Black Hole stages');
    expect(plural('day', 2)).toBe('days');
  });
});
