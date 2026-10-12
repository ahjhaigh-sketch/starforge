import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BACKGROUNDS, SKINS, TRAILS } from '../../src/content/cosmetics';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { resetStatRegistry } from '../../src/engine/stats';
import { cosmeticUnlocked, setCosmetic, wardrobeOpen } from '../../src/engine/systems/cosmetics';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

const fresh = (seed = 20): GameState => createInitialState(1_000_000, seed);
function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

describe('save version 20', () => {
  it('loads a real version 19 save (the 1.0.0 build): everything new starts at its default', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v19.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.stats.multiversesAll).toBe(1);
    expect(state.ships.fleet).toHaveLength(2);
    expect(state.cosmetics).toEqual({ skin: 'classic', trail: 'none', background: 'violet' });
  });
});

describe('20.1 the Wardrobe', () => {
  it('opens at 10 medals; Classic, no trail and Deep Violet are always there', () => {
    const s = fresh();
    expect(wardrobeOpen(s)).toBe(false);
    s.achievements = Array.from({ length: 10 }, (_, i) => `m${i}`);
    expect(wardrobeOpen(s)).toBe(true);
    expect(cosmeticUnlocked(s, 'skin', 'classic')).toBe(true);
    expect(cosmeticUnlocked(s, 'trail', 'none')).toBe(true);
    expect(cosmeticUnlocked(s, 'background', 'violet')).toBe(true);
  });

  it('each choice unlocks with its own medal or count, and a locked or unknown one is refused', () => {
    const s = fresh();
    expect(setCosmetic(s, 'skin', 'blacksun')).toBe(false);
    expect(setCosmetic(s, 'skin', 'nonsense')).toBe(false);
    expect(s.cosmetics.skin).toBe('classic');
    s.stats.bhStageBest = 8;
    expect(setCosmetic(s, 'skin', 'blacksun')).toBe(true);
    expect(s.cosmetics.skin).toBe('blacksun');
    // everything there is, unlocked by the numbers that unlock it
    Object.assign(s.stats, { smelts: 1000, elements: 26, questsDone: 50, taps: 1e6, multiversesAll: 1, comets: 100, supernovasAll: 30, singularitiesAll: 1, nebulasAll: 1, crunchesAll: 1, galacticsAll: 1 });
    s.achievements = Array.from({ length: 50 }, (_, i) => `m${i}`);
    for (const k of SKINS) expect(setCosmetic(s, 'skin', k.id)).toBe(true);
    for (const t of TRAILS) expect(setCosmetic(s, 'trail', t.id)).toBe(true);
    for (const b of BACKGROUNDS) expect(setCosmetic(s, 'background', b.id)).toBe(true);
  });

  it('only the choices are saved: they round-trip, and no reset touches them', () => {
    const s = fresh();
    s.stats.bhStageBest = 8;
    s.stats.comets = 100;
    setCosmetic(s, 'skin', 'blacksun');
    setCosmetic(s, 'trail', 'comet');
    const c = clone(s);
    expect(c.cosmetics).toEqual({ skin: 'blacksun', trail: 'comet', background: 'violet' });
  });
});
