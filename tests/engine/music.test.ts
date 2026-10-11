import { describe, expect, it } from 'vitest';
import { barNotes, degreeFreq, INSTRUMENTS, musicLayers, SOUNDTRACKS } from '../../src/audio/music';
import { plural } from '../../src/engine/words';

describe('the soundtrack', () => {
  it('starts with the pad and adds one instrument per layer reached, up to the choir', () => {
    expect(musicLayers(0)).toEqual(['pad']);
    expect(musicLayers(1)).toEqual(['pad', 'arp']);
    expect(musicLayers(5)).toEqual([...INSTRUMENTS]);
    expect(musicLayers(99)).toEqual([...INSTRUMENTS]);
    expect(musicLayers(-3)).toEqual(['pad']);
  });

  it('every note of every soundtrack is in its scale and audible, and only the instruments that joined play', () => {
    for (const t of SOUNDTRACKS) {
      const inScale = (f: number) => {
        const semis = Math.round(12 * Math.log2(f / t.root));
        return t.scale.includes(((semis % 12) + 12) % 12);
      };
      for (let layers = 0; layers <= 5; layers++) {
        const on = musicLayers(layers);
        for (let bar = 0; bar < 16; bar++) {
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

  it('plays the same bar the same way every time', () => {
    const t = SOUNDTRACKS[0]!;
    expect(barNotes(t, 7, musicLayers(5))).toEqual(barNotes(t, 7, musicLayers(5)));
    expect(degreeFreq(t, 0)).toBeCloseTo(t.root, 6);
    expect(degreeFreq(t, t.scale.length)).toBeCloseTo(t.root * 2, 6);
    expect(degreeFreq(t, -t.scale.length)).toBeCloseTo(t.root / 2, 6);
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
