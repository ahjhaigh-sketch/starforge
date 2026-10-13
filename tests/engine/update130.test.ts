import { manual } from './manual';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/content/balance';
import { registerContent } from '../../src/content';
import { D } from '../../src/engine/decimal';
import { milestoneReached } from '../../src/engine/layers';
import { importSave } from '../../src/engine/save/store';
import { automatedSpend, createInitialState, cur, free, gain, keptOf, recentSpending, SAVE_VERSION, spend } from '../../src/engine/state';
import { invalidateStats, resetStatRegistry } from '../../src/engine/stats';
import { tick } from '../../src/engine/tick';
import { galacticReady } from '../../src/engine/systems/galactic';
import { autoRoll, setShrine } from '../../src/engine/systems/runes';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

const playtest = () => importSave(readFileSync('tests/fixtures/save-v21.txt', 'utf8').trim()).state;

describe('1.3.0: save version 22 loads the real playtest save (version 21)', () => {
  it('keeps everything, and starts with a tenth of each currency kept safe', () => {
    const s = playtest();
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(22);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.stats.singularitiesAll).toBe(23);
    expect(s.stats.galacticsAll).toBe(1);
    const stardust = cur(s, 'stardust');
    expect(keptOf(s, 'stardust').div(stardust).toNumber()).toBeCloseTo(BALANCE.automation.keepShare, 6);
    expect(s.runes.shrines.void!.auto).toBe(true);
  });

  it('unsticks the full Comet Fusion board (two of every level from 6 to 16, plus 1, 1 and 2)', () => {
    const s = manual(playtest());
    const before = s.fusion.best;
    expect(before).toBe(16);
    tick(s, 60);
    expect(s.fusion.best).toBeGreaterThan(before);
  });
});

describe('1.3.0: the safe tenth', () => {
  it('a tenth of every gain is kept from automation; your own purchases may still spend it', () => {
    const s = createInitialState(1_000_000, 5);
    gain(s, 'darkMatter', D(1000));
    expect(keptOf(s, 'darkMatter').toNumber()).toBe(100);
    expect(free(s, 'darkMatter').toNumber()).toBe(900);
    expect(automatedSpend('Test', () => spend(s, 'darkMatter', D(901)))).toBe(false);
    expect(automatedSpend('Test', () => spend(s, 'darkMatter', D(900)))).toBe(true);
    expect(cur(s, 'darkMatter').toNumber()).toBe(100);
    expect(automatedSpend('Test', () => spend(s, 'darkMatter', D(1)))).toBe(false);
    // by hand: all of it, and (1.5.0) the kept tenth is never more than a tenth of what's left
    expect(spend(s, 'darkMatter', D(60))).toBe(true);
    expect(keptOf(s, 'darkMatter').toNumber()).toBe(4);
    expect(s.kept.darkMatter!.toNumber()).toBe(4);
  });

  it('a currency emptied by a reset leaves no stale safe tenth behind', () => {
    const s = createInitialState(1_000_000, 6);
    gain(s, 'ore', D(1e6));
    s.currencies.ore = D(0);
    gain(s, 'ore', D(100));
    expect(keptOf(s, 'ore').toNumber()).toBe(10);
  });

  it('the Void shrine auto-roll can no longer spend every Dark Matter, and says where it went', () => {
    const s = createInitialState(1_000_000, 7);
    s.stats.nebulasAll = 1;
    s.stats.singularitiesAll = 1;
    setShrine(s, 'void', { auto: true });
    gain(s, 'darkMatter', D(1e6));
    for (let i = 0; i < 30; i++) {
      gain(s, 'darkMatter', D(1e5));
      autoRoll(s, 'void', 1);
      s.playtime += 1;
    }
    // 1.3M earned: at least a tenth (130,000) is still there
    expect(cur(s, 'darkMatter').toNumber()).toBeGreaterThanOrEqual(1.3e5 - 1);
    const where = recentSpending(s, 'darkMatter');
    expect(where[0]?.name).toBe('Void Shrine auto-roll');
  });
});

describe('1.3.0: passive gains and the Galactic requirement', () => {
  it('Singularity milestone 15 pays 1% of the Singularity gain a second without resetting', () => {
    // (1.4.0: with layer automation off, so no Singularity happens by itself in the second)
    const s = manual(playtest());
    expect(milestoneReached(s, 'singularity', 'passive')).toBe(true);
    const before = cur(s, 'darkMatter');
    const run = s.totals.run.darkMatter!;
    tick(s, 1);
    expect(cur(s, 'darkMatter').gt(before)).toBe(true);
    // passive income is yours to spend, but never counts towards the next reset or a galaxy's goal
    expect(s.totals.run.darkMatter!.eq(run)).toBe(true);
  });

  it('a Galactic Rebirth needs the anti-star at Protostar, not 8 Black Hole stages', () => {
    const s = playtest();
    s.blackHole.mass = D(0);
    s.totals.run.darkMatter = D(1e13);
    invalidateStats();
    expect(s.mirror.depth).toBe(11);
    expect(galacticReady(s)).toBe(true);
    s.mirror.depth = 10;
    expect(galacticReady(s)).toBe(false);
  });
});
