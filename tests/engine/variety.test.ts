import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BALANCE } from '../../src/content/balance';
import { ENGINES } from '../../src/content/engines';
import { GOALS, MEDALS } from '../../src/content/medals';
import { SYSTEMS } from '../../src/content/systems';
import { UPGRADES } from '../../src/content/upgrades';
import { D } from '../../src/engine/decimal';
import { events } from '../../src/engine/events';
import { simulateElapsed } from '../../src/engine/offline';
import { toPlain } from '../../src/engine/save/serialize';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { buffActive, catchComet, rollCometKind } from '../../src/engine/systems/comets';
import { checkMedals } from '../../src/engine/systems/medals';
import { buyEngine, tapValue } from '../../src/engine/systems/stardust';
import { availableUpgrades, buyUpgrade } from '../../src/engine/systems/upgrades';
import { tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

const fresh = () => createInitialState(2_000_000, 11);

/** A deep copy that keeps Decimals (structuredClone would turn them into plain objects). */
function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

/** A mid-game state with engines, a tier and some upgrades. */
function midGame() {
  const s = fresh();
  s.tier = 2;
  gain(s, 'stardust', D(1e9));
  for (const e of ENGINES.slice(0, 6)) buyEngine(s, e.id, 40);
  for (const u of availableUpgrades(s)) buyUpgrade(s, u.id);
  invalidateStats();
  return s;
}

describe('content', () => {
  it('every ID is unique', () => {
    for (const list of [UPGRADES, MEDALS, GOALS, SYSTEMS, ENGINES]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(UPGRADES.length).toBeGreaterThanOrEqual(60);
    expect(MEDALS.length).toBeGreaterThanOrEqual(100);
  });
});

describe('upgrades', () => {
  it('each kind of effect changes its stat through the pipeline', () => {
    const s = fresh();
    gain(s, 'stardust', D(1e12));
    s.stats.taps = 300;
    buyEngine(s, 'mote', 30);
    invalidateStats();
    const tap0 = stat(s, 'tapPower').toNumber();
    expect(buyUpgrade(s, 'tap.warm')).toBe(true);
    invalidateStats();
    expect(stat(s, 'tapPower').toNumber()).toBe(tap0 + 1);
    expect(buyUpgrade(s, 'tap.touch')).toBe(true);
    invalidateStats();
    expect(stat(s, 'tapPower').toNumber()).toBe((tap0 + 1) * 2);
    expect(buyUpgrade(s, 'tap.motes')).toBe(true); // +0.1 per Spark Mote
    invalidateStats();
    expect(stat(s, 'tapPower').toNumber()).toBeCloseTo((tap0 + 1 + 3) * 2, 9);
    const mote = stat(s, 'engineMult.mote').toNumber();
    expect(buyUpgrade(s, 'mote.x2a')).toBe(true);
    invalidateStats();
    expect(stat(s, 'engineMult.mote').toNumber()).toBe(mote * 2);
  });

  it('refuses upgrades that are bought, locked or unaffordable', () => {
    const s = fresh();
    expect(buyUpgrade(s, 'tap.warm')).toBe(false); // locked: needs 25 taps
    s.stats.taps = 25;
    expect(buyUpgrade(s, 'tap.warm')).toBe(false); // can't afford 100
    gain(s, 'stardust', D(100));
    expect(buyUpgrade(s, 'tap.warm')).toBe(true);
    expect(buyUpgrade(s, 'tap.warm')).toBe(false); // already bought
    expect(cur(s, 'stardust').toNumber()).toBe(0);
  });

  it('Starstrike adds 1% of Stardust per second to every tap', () => {
    const s = midGame();
    const sps = stat(s, 'stardustPerSec');
    expect(s.upgrades).toContain('tap.strike1');
    expect(stat(s, 'tapSpsShare').toNumber()).toBeGreaterThanOrEqual(0.01);
    expect(tapValue(s).sub(stat(s, 'tapPower')).div(sps).toNumber()).toBeCloseTo(stat(s, 'tapSpsShare').toNumber(), 9);
  });
});

describe('medals and goals', () => {
  it('every medal unlocks exactly once', () => {
    const s = fresh();
    s.tier = 11;
    gain(s, 'stardust', D('1e45'));
    for (const e of ENGINES) {
      s.engines[e.id] = 100;
      s.enginesEver[e.id] = 100;
    }
    s.stats = { taps: 2e9, crits: 2e8, comets: 20_000, enginesBought: 1e8, evolves: 11, maxCombo: 60, supernovas: 30, harvested: 1e5, beltTier: 6, cores: 20, level: 40, smelts: 1e4, relics: 50, elements: 118, fusionBest: 20, perfects: 300, chaosRolls: 30, deals: 60, trips: 600, nebulasAll: 10, runesFound: 100, runesRolled: 1e13, starsEarned: 12, runesCrafted: 5, aurasFound: 30, mutationsFound: 60, wyrmsHatched: 150, wyrmFusions: 3, wyrmCatches: 30, nurseryHarvests: 10, crossbreeds: 2, speciesGrown: 25, spectralBest: 10, spectralColors: 7, cardsDrawn: 60, singularitiesAll: 12, bhStageBest: 8, trialsDone: 5, trialLevels: 25, spireBest: 60, leviathansBeaten: 12, amEnginesBought: 200, mirrorDepth: 11, wormholesOpened: 2, galacticsAll: 2, galaxiesCleared: 6, starScoreBest: 150, megaStages: 6, megaDone: 1, coloniesFounded: 2, colonyPopBest: 2e6, planetsFinished: 1 };
    s.upgrades = UPGRADES.map((u) => u.id);
    invalidateStats();
    const seen: string[] = [];
    const off = events.on((e) => {
      if (e.t === 'achievement') seen.push(e.id);
    });
    for (let i = 0; i < 5; i++) checkMedals(s);
    off();
    expect(seen.length).toBe(MEDALS.length);
    expect(new Set(seen).size).toBe(MEDALS.length);
    expect(new Set(s.achievements).size).toBe(s.achievements.length);
    expect(s.achievements.length).toBe(MEDALS.length);
    for (const g of GOALS) expect(s.goals[g.id]).toBe(g.tiers.length);
  });

  it('each medal is +1% Stardust and each Goal tier adds luck and bulk', () => {
    const s = fresh();
    buyEngine(s, 'mote', 0);
    gain(s, 'stardust', D(15));
    buyEngine(s, 'mote', 1);
    invalidateStats();
    const before = stat(s, 'productionMult').toNumber();
    s.stats.taps = 150; // first-tap medal, plus Goal "Tapper" tier 1 (100 taps)
    checkMedals(s);
    invalidateStats();
    const medals = s.achievements.length;
    const tiers = s.goals.taps ?? 0;
    expect(tiers).toBe(1);
    expect(stat(s, 'productionMult').toNumber()).toBeCloseTo(before * (1 + 0.01 * medals + 0.01 * tiers), 9);
    expect(stat(s, 'runeLuck').toNumber()).toBeCloseTo(1 + BALANCE.medals.goalLuck, 9);
    expect(stat(s, 'runeBulk').toNumber()).toBeCloseTo(BALANCE.medals.goalBulk, 9);
  });
});

describe('comets', () => {
  it('rolls each kind at its odds', () => {
    const s = fresh();
    const n = 200_000;
    const counts: Record<string, number> = { frenzy: 0, lucky: 0, tapstorm: 0, wish: 0 };
    for (let i = 0; i < n; i++) counts[rollCometKind(s)]!++;
    expect(counts.frenzy! / n).toBeCloseTo(0.6 * 0.99, 2);
    expect(counts.lucky! / n).toBeCloseTo(0.3 * 0.99, 2);
    expect(counts.tapstorm! / n).toBeCloseTo(0.09 * 0.99, 2);
    expect(counts.wish! / n).toBeCloseTo(0.01, 2);
  });

  it('appear from Red Dwarf on a schedule, never during catch-up, and buffs run on game time', () => {
    const s = midGame();
    s.tier = 0;
    s.comet.nextAt = 0;
    tick(s, 0.05);
    expect(s.comet.until).toBe(0); // Protostar: no comets yet
    s.tier = 1;
    tick(s, 0.05);
    expect(s.comet.until).toBeGreaterThan(s.playtime);
    // a catch-up moves the schedule on but never shows a comet
    s.comet.until = 0;
    s.comet.nextAt = s.playtime;
    simulateElapsed(s, 300, { cap: Infinity, efficiency: 1, offline: false });
    expect(s.comet.until).toBe(0);
    expect(s.comet.nextAt).toBeGreaterThan(s.playtime - BALANCE.comets.maxGap);
  });

  it('Frenzy multiplies production by 7 until its playtime runs out; buffs stack across kinds', () => {
    const s = midGame();
    const base = stat(s, 'stardustPerSec');
    s.buffs.frenzy = s.playtime + 30;
    s.buffs.wish = s.playtime + 30;
    invalidateStats();
    expect(stat(s, 'stardustPerSec').div(base).toNumber()).toBeCloseTo(7, 9);
    expect(stat(s, 'engineCostMult').toNumber()).toBe(0.5);
    for (let i = 0; i < 620; i++) tick(s, 0.05);
    expect(buffActive(s, 'frenzy')).toBe(false);
    expect(s.buffs.frenzy).toBeUndefined();
    // medals earned while ticking changed the base, so compare against a fresh Frenzy now
    invalidateStats();
    const after = stat(s, 'stardustPerSec');
    s.buffs.frenzy = s.playtime + 5;
    invalidateStats();
    expect(stat(s, 'stardustPerSec').div(after).toNumber()).toBeCloseTo(7, 9);
  });

  it('catching needs a comet on screen and counts once', () => {
    const s = midGame();
    expect(catchComet(s)).toBeNull();
    s.comet.until = s.playtime + 5;
    const r = catchComet(s);
    expect(r).not.toBeNull();
    expect(s.stats.comets).toBe(1);
    expect(catchComet(s)).toBeNull();
  });
});

describe('offline and saves', () => {
  it('1 hour offline at full efficiency matches 1 hour played within 1%', () => {
    const a = midGame();
    a.comet.nextAt = 1e12; // comets are random events, kept out of the comparison
    const b = clone(a);
    const a0 = cur(a, 'stardust');
    simulateElapsed(a, 3600, { cap: Infinity, efficiency: 1, offline: true });
    for (let i = 0; i < 72_000; i++) tick(b, 0.05);
    const gainA = cur(a, 'stardust').sub(a0);
    const gainB = cur(b, 'stardust').sub(a0);
    expect(gainA.gt(0)).toBe(true);
    expect(gainA.div(gainB).sub(1).abs().toNumber()).toBeLessThan(0.01);
  }, 30_000);

  it('export then import gives back an identical save', () => {
    const s = midGame();
    s.stats.taps = 999;
    checkMedals(s);
    s.buffs.frenzy = s.playtime + 12;
    const r = exportSave(s);
    if (!r.ok) throw new Error(r.error);
    const back = importSave(r.code).state;
    expect(toPlain(back)).toEqual(toPlain(s));
  });

  it('importing junk throws and changes nothing', () => {
    for (const junk of ['', 'hello', 'STARFORGE1:', 'STARFORGE1:abc', 'STARFORGE2:eJzLSM3JyQcABiwCFQ==']) {
      expect(() => importSave(junk)).toThrow();
    }
  });

  it('loads and migrates a real version 2 save', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v2.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.tier).toBe(2);
    expect(state.engines.mote).toBe(25);
    expect(state.stats.taps).toBe(321);
    expect(state.seen).toContain('belt');
    expect(state.upgrades).toEqual([]);
    expect(state.achievements).toEqual([]);
    expect(state.comet.nextAt).toBe(BALANCE.comets.firstAt);
    // the first medal check grants what was already earned
    checkMedals(state);
    expect(state.achievements).toContain('own.mote.1');
    expect(state.achievements).toContain('tier.2');
  });
});
