import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BALANCE } from '../../src/content/balance';
import { SECTOR_BY_ID } from '../../src/content/extras';
import { D } from '../../src/engine/decimal';
import { performReset } from '../../src/engine/layers';
import { simulateElapsed } from '../../src/engine/offline';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { breakdown, invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { equipAttune, heartMult, pulseGrade, pulseRating, unlockAttune } from '../../src/engine/systems/attune';
import { autoFuse, boardSide, buyFusionUpgrade, fuse } from '../../src/engine/systems/fusion';
import { buyDeal, buyLuck, makeDeal, reroll, rerollCost } from '../../src/engine/systems/merchant';
import { buyShip, buyShipUpgrade, launch, shipCost, tripLoot, tripSeconds } from '../../src/engine/systems/ships';
import { createTapRuntime, tapStar } from '../../src/engine/systems/stardust';
import { tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

/** A player with this many Supernovas, at Blue Giant. */
function run(supernovas: number, seed = 9): GameState {
  const s = createInitialState(7_000_000, seed);
  s.tier = 3;
  s.stats.supernovas = supernovas;
  s.forge.on = false;
  invalidateStats();
  return s;
}

function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

/** Comets on the board, counted in level-1 comets (a level L comet is 3^(L-1) of them). */
const worth = (b: number[]) => b.reduce((a, x) => a + (x > 0 ? 3 ** (x - 1) : 0), 0);

describe('Comet Fusion', () => {
  it('always fuses exactly three, or nothing', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 9, maxLength: 9 }), fc.integer({ min: 0, max: 8 }), fc.integer({ min: 0, max: 8 }), (board, from, to) => {
        const s = run(6);
        s.fusion.board = [...board];
        const before = [...board];
        const ok = fuse(s, from, to);
        const count = (b: number[]) => b.filter((x) => x > 0).length;
        if (ok) {
          expect(count(before) - count(s.fusion.board)).toBe(2);
          expect(worth(s.fusion.board)).toBe(worth(before));
          expect(s.fusion.board[to]).toBe(before[to]! + 1);
          expect(s.fusion.board[from]).toBe(0);
        } else {
          expect(s.fusion.board).toEqual(before);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('needs a third comet of the same level', () => {
    const s = run(6);
    s.fusion.board = [2, 2, 1, 0, 0, 0, 0, 0, 0];
    expect(fuse(s, 0, 1)).toBe(false);
    s.fusion.board[5] = 2;
    expect(fuse(s, 0, 1)).toBe(true);
    expect(s.fusion.board).toEqual([0, 3, 1, 0, 0, 0, 0, 0, 0]);
    expect(s.fusion.best).toBe(3);
  });

  it('spawns a comet every 12 s until the board is full; auto-fuse keeps it going', () => {
    const s = run(6);
    for (let i = 0; i < 20 * 12; i++) tick(s, 0.05);
    expect(s.fusion.board.filter((x) => x > 0)).toHaveLength(1);
    for (let i = 0; i < 20 * 600; i++) tick(s, 0.05);
    expect(s.fusion.board.every((x) => x > 0)).toBe(true); // full: 9 comets, no more
    s.fusion.autoOwned = true;
    autoFuse(s);
    expect(s.fusion.board.filter((x) => x > 0).length).toBeLessThan(9);
    simulateElapsed(s, 3600, { cap: 86_400, efficiency: 1, offline: true });
    expect(s.fusion.best).toBeGreaterThanOrEqual(5);
  });

  it('the best level multiplies Stardust and taps, and shows in the breakdown', () => {
    const s = run(6);
    s.fusion.best = 4;
    invalidateStats();
    const line = breakdown(s, 'productionMult').find((l) => l.label === 'Comet Fusion (best level)');
    expect(line?.value.toNumber()).toBeCloseTo(1.25 ** 4, 9);
    expect(breakdown(s, 'tapPower').some((l) => l.label === 'Comet Fusion (best level)')).toBe(true);
  });

  it('a bigger board keeps every comet; upgrades cost shards with buy amounts', () => {
    const s = run(6);
    s.fusion.board = [1, 2, 3, 0, 0, 0, 0, 0, 4];
    gain(s, 'shards', D(1e9));
    s.settings.buyAmount = 'max';
    expect(buyFusionUpgrade(s, 'size')).toBe(true);
    expect(boardSide(s)).toBe(5);
    expect(s.fusion.board).toHaveLength(25);
    expect(s.fusion.board.filter((x) => x > 0).sort()).toEqual([1, 2, 3, 4]);
    expect(buyFusionUpgrade(s, 'size')).toBe(false);
  });
});

describe('Star Pulse Attunements', () => {
  it('Pulse grades taps by their distance to the beat', () => {
    expect(pulseGrade(5000).name).toBe('Perfect');
    expect(pulseGrade(5100).name).toBe('Great');
    expect(pulseGrade(4800).name).toBe('Good');
    expect(pulseGrade(5500).name).toBe('Off beat');
  });

  it('skill shows: perfect rhythm beats button-mashing, and the rating is in the breakdown', () => {
    const tapFor = (seconds: number, times: number[]) => {
      const s = run(8);
      equipAttune(s, 'pulse');
      const rt = createTapRuntime();
      let got = D(0);
      for (const t of times) {
        invalidateStats();
        const r = tapStar(s, rt, t);
        if (r) got = got.add(r.amount);
      }
      return { s, got, perSecond: got.div(seconds) };
    };
    // one tap a beat, dead on, for 20 s
    const rhythm = tapFor(20, Array.from({ length: 20 }, (_, i) => 1000 + i * 1000));
    // 20 taps a second, any time
    const mash = tapFor(20, Array.from({ length: 400 }, (_, i) => 1000 + i * 50 + 7));
    expect(pulseRating(rhythm.s)).toBe(25);
    expect(pulseRating(mash.s)).toBeLessThan(25);
    expect(rhythm.perSecond.gt(mash.perSecond.mul(2))).toBe(true);
    invalidateStats();
    const line = breakdown(rhythm.s, 'tapPower').find((l) => l.label === 'Pulse (timing rating)');
    expect(line?.value.toNumber()).toBe(25);
  });

  it('only the first tap in a beat counts; the rest of it is off beat', () => {
    const s = run(8);
    equipAttune(s, 'pulse');
    const rt = createTapRuntime();
    expect(tapStar(s, rt, 3000)?.grade).toBe('Perfect');
    const second = tapStar(s, rt, 3030);
    expect(second?.grade).toBe('Off beat');
    expect(second?.amount.toNumber()).toBe(0);
  });

  it('Heartbeat: taps fill the meter, it drains, and at 100 it overloads to zero', () => {
    const s = run(8);
    unlockAttune(s, 'heartbeat'); // costs shards: none yet
    expect(s.attune.unlocked).not.toContain('heartbeat');
    gain(s, 'shards', D(1000));
    expect(unlockAttune(s, 'heartbeat')).toBe(true);
    equipAttune(s, 'heartbeat');
    const rt = createTapRuntime();
    for (let i = 0; i < 10; i++) tapStar(s, rt, 1000 + i * 40);
    expect(s.attune.heart).toBe(80);
    invalidateStats();
    expect(heartMult(s)).toBeCloseTo(1 + 3 * 0.64, 9);
    expect(breakdown(s, 'productionMult').some((l) => l.label === 'Heartbeat (meter)')).toBe(true);
    for (let i = 0; i < 3; i++) tapStar(s, rt, 2000 + i * 40);
    expect(s.attune.heart).toBe(0); // 104 overloads
    s.attune.heart = 50;
    tick(s, 1);
    expect(s.attune.heart).toBe(32);
  });

  it('Chaos Die rolls an effect every 20 taps; Gravity Lens: x6, at most 4 taps a second', () => {
    const s = run(8);
    gain(s, 'shards', D(1e4));
    unlockAttune(s, 'chaos');
    unlockAttune(s, 'lens');
    equipAttune(s, 'chaos');
    equipAttune(s, 'lens');
    const rt = createTapRuntime();
    let taken = 0;
    for (let i = 0; i < 100; i++) if (tapStar(s, rt, 1000 + i * 50)) taken++;
    expect(taken).toBe(20); // 5 s at 4 a second
    expect(s.stats.chaosRolls).toBe(1);
    expect(s.attune.chaos).not.toBeNull();
    invalidateStats();
    expect(breakdown(s, 'tapPower').find((l) => l.label === 'Gravity Lens')?.value.toNumber()).toBe(6);
  });

  it('three slots at most', () => {
    const s = run(8);
    gain(s, 'shards', D(1e4));
    for (const id of ['heartbeat', 'chaos', 'lens'] as const) unlockAttune(s, id);
    for (const id of ['pulse', 'heartbeat', 'chaos', 'lens'] as const) equipAttune(s, id);
    expect(s.attune.equipped).toEqual(['pulse', 'heartbeat', 'chaos']);
  });
});

describe('the Wandering Merchant', () => {
  it('docks with four deals; a bought deal is replaced at once', () => {
    const s = run(10);
    tick(s, 0.05);
    expect(s.merchant.deals).toHaveLength(4);
    gain(s, 'stardust', D(1e12));
    gain(s, 'shards', D(1e6));
    gain(s, 'ore', D(1e9));
    const first = s.merchant.deals[0]!;
    expect(buyDeal(s, 0)).toBe(true);
    expect(s.merchant.deals).toHaveLength(4);
    expect(s.merchant.deals[0]).not.toBe(first);
    expect(s.stats.deals).toBe(1);
  });

  it('rerolls cost 5 x 2^n shards, back to 5 after a Supernova (a new ship docks)', () => {
    const s = run(10);
    tick(s, 0.05);
    gain(s, 'shards', D(100));
    expect(rerollCost(s).toNumber()).toBe(5);
    reroll(s);
    expect(rerollCost(s).toNumber()).toBe(10);
    gain(s, 'stardust', D(1e9));
    performReset(s, 'supernova');
    expect(rerollCost(s).toNumber()).toBe(5);
    expect(s.merchant.deals).toHaveLength(4);
  });

  it('about 1% of deals are Mythical (x100) and 10% rare, more with Merchant Luck; it never touches the game RNG', () => {
    const s = run(10);
    const rng = [...s.rng];
    const q = { common: 0, rare: 0, mythical: 0 };
    for (let i = 0; i < 20_000; i++) q[makeDeal(s).quality]++;
    expect(q.mythical / 20_000).toBeGreaterThan(0.007);
    expect(q.mythical / 20_000).toBeLessThan(0.013);
    expect(q.rare / 20_000).toBeGreaterThan(0.09);
    expect(q.rare / 20_000).toBeLessThan(0.11);
    expect(s.rng).toEqual(rng);
    gain(s, 'shards', D(1e9));
    s.settings.buyAmount = 10;
    buyLuck(s);
    expect(s.merchant.luck).toBe(10);
  });
});

describe('Starship Expeditions', () => {
  it('trip length falls as ship engines are upgraded', () => {
    const s = run(15);
    const kuiper = SECTOR_BY_ID.get('kuiper')!;
    let last = tripSeconds(s, kuiper);
    expect(last).toBe(600);
    gain(s, 'alloy.iron', D(1e12));
    for (let i = 0; i < 5; i++) {
      buyShipUpgrade(s, 'engines');
      invalidateStats();
      const now = tripSeconds(s, kuiper);
      expect(now).toBeLessThan(last);
      last = now;
    }
    expect(last).toBeCloseTo(600 / 1.25 ** 5, 6);
  });

  it('a ship flies, comes home with loot, and goes again on repeat (offline too)', () => {
    const s = run(15);
    s.tier = 4;
    expect(launch(s, 0, 'ember')).toBe(true);
    expect(launch(s, 0, 'kuiper')).toBe(false); // already away
    simulateElapsed(s, 1800 * 3 + 10, { cap: 86_400, efficiency: 1, offline: true });
    expect(s.stats.trips).toBe(3);
    expect(cur(s, 'alloy.gold').toNumber()).toBeGreaterThan(0);
    expect(s.ships.fleet[0]!.sector).toBe('ember');
  });

  it('sectors open with your best Star Tier; ships cost Iron alloy; Cargo fills the hold', () => {
    const s = run(15);
    expect(launch(s, 0, 'crystal')).toBe(false);
    gain(s, 'alloy.iron', D(1e6));
    expect(shipCost(s).toNumber()).toBe(40);
    expect(buyShip(s)).toBe(true);
    expect(shipCost(s).toNumber()).toBe(200);
    const kuiper = SECTOR_BY_ID.get('kuiper')!;
    const before = tripLoot(s, kuiper).alloy.toNumber();
    gain(s, 'alloy.gold', D(1e6));
    buyShipUpgrade(s, 'cargo');
    invalidateStats();
    expect(tripLoot(s, kuiper).alloy.toNumber()).toBeGreaterThan(before);
    expect(stat(s, 'shipLoot').toNumber()).toBeCloseTo(1.3, 9);
  });
});

describe('save version 8', () => {
  it('loads and migrates a real version 7 save', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v7.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.relics.levels).toEqual({ anvil: 4, hammer: 2 });
    expect(state.codex.he).toBe(6);
    expect(state.forge.upgrades).toEqual({ speed: 3 });
    expect(state.fusion.board).toHaveLength(9);
    expect(state.attune.unlocked).toEqual(['pulse']);
    expect(state.merchant.deals).toEqual([]);
    expect(state.ships.fleet).toHaveLength(1);
  });

  it('round-trips the board, attunements, deals and ships', () => {
    const s = run(15);
    tick(s, 0.05);
    s.fusion.board = [1, 2, 3, 0, 0, 0, 0, 0, 0];
    equipAttune(s, 'pulse');
    launch(s, 0, 'kuiper');
    const c = clone(s);
    expect(c.fusion.board).toEqual(s.fusion.board);
    expect(c.attune.equipped).toEqual(['pulse']);
    expect(c.merchant.deals).toHaveLength(4);
    expect(c.merchant.deals[0]!.pay.amount.eq(s.merchant.deals[0]!.pay.amount)).toBe(true);
    expect(c.ships.fleet[0]!.sector).toBe('kuiper');
  });

  it('is all kept through a Supernova', () => {
    const s = run(15);
    s.fusion.best = 6;
    s.fusion.board = [5, 0, 0, 0, 0, 0, 0, 0, 0];
    equipAttune(s, 'pulse');
    launch(s, 0, 'kuiper');
    gain(s, 'stardust', D(1e9));
    performReset(s, 'supernova');
    expect(s.fusion.best).toBe(6);
    expect(s.fusion.board[0]).toBe(5);
    expect(s.attune.equipped).toEqual(['pulse']);
    expect(s.ships.fleet[0]!.sector).toBe('kuiper');
    expect(BALANCE.fusion.supernovas).toBe(6);
  });
});
