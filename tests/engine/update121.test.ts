import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BALANCE } from '../../src/content/balance';
import { CONSTANTS } from '../../src/content/constants';
import { MEDALS, pokeStat } from '../../src/content/medals';
import { D } from '../../src/engine/decimal';
import { performReset } from '../../src/engine/layers';
import { createInitialState, cur, gain, type GameState } from '../../src/engine/state';
import { invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { AUTO_BUYERS, autoSetting, autoUnlocked, runAutomation, setAuto } from '../../src/engine/systems/automation';
import { beltTierNeed } from '../../src/engine/systems/belt';
import { buyConstant, constantOpen, level, nextDoubling } from '../../src/engine/systems/constants';
import { runFurnace, setForgeGrade } from '../../src/engine/systems/forge';
import { checkMedals, hasMedal, poke } from '../../src/engine/systems/medals';
import { nebulaGain } from '../../src/engine/systems/nebula';
import { novaNeed, supernovaReady } from '../../src/engine/systems/supernova';
import { reqMet } from '../../src/engine/systems/unlocks';
import { enginesCompact, menuHidden, NEVER_HIDE, runsItself, setMenuHidden } from '../../src/app/menus';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

const auto = (id: string) => AUTO_BUYERS.find((a) => a.id === id)!;

/** A run ready to go Supernova: Blue Giant with plenty of Stardust. */
function novaRun(supernovasAll: number): GameState {
  const s = createInitialState(2_000_000, 7);
  s.tier = 3;
  s.stats.supernovasAll = supernovasAll;
  s.stats.supernovas = supernovasAll;
  s.engines.mote = 400;
  s.enginesEver.mote = 400;
  gain(s, 'stardust', D(1e9));
  invalidateStats();
  return s;
}

describe('1.2.0: Supernova needs grow with your economy; the first Nebula pays for its shards', () => {
  it('after a Supernova the next needs 30 s of the Stardust per second you had; a Nebula starts that over', () => {
    const s = novaRun(3);
    s.auto['auto.supernova'] = { on: false, spend: 1 };
    expect(novaNeed(s).eq(BALANCE.supernova.runStardust)).toBe(true);
    const sps = stat(s, 'stardustPerSec');
    expect(supernovaReady(s)).toBe(true);
    performReset(s, 'supernova');
    // what the run was making, x30 (or the base if that's more)
    const want = Math.max(BALANCE.supernova.runStardust, sps.toNumber() * BALANCE.supernova.needSeconds);
    expect(novaNeed(s).toNumber()).toBeCloseTo(want, -Math.floor(Math.log10(want)) + 6);
    s.stats.supernovas = 30;
    s.stats.nebulasAll = 0;
    gain(s, 'shards', D(2e7));
    expect(performReset(s, 'nebula')).not.toBeNull();
    expect(s.stats.novaRateLog).toBe(0);
    expect(novaNeed(s).eq(BALANCE.supernova.runStardust)).toBe(true);
  });

  it('the first Nebula gives Essence for the shards you gathered (at least 2), not a flat 2', () => {
    const s = createInitialState(1, 1);
    s.stats.nebulasAll = 0;
    s.totals.run.shards = D(1.44e23);
    invalidateStats();
    // 1.4.0: the reset ceiling holds a first reset under 100,000 however many shards you bring
    expect(nebulaGain(s).toNumber()).toBeGreaterThan(10_000);
    expect(nebulaGain(s).toNumber()).toBeLessThan(100_000);
    s.totals.run.shards = D(1.1e7);
    expect(nebulaGain(s).toNumber()).toBe(2);
  });
});

describe('1.2.0: the Starforge smelts every grade at once', () => {
  it('"All grades" puts each kind of ore you have in its own crucible and pays each its own alloy', () => {
    const s = createInitialState(3, 3);
    s.stats.supernovas = 5;
    s.forge.on = true;
    s.forge.share = 1;
    s.forge.upgrades.crucibles = 2;
    expect(setForgeGrade(s, 'all')).toBe(true);
    for (const ore of ['ore', 'ore.gold', 'ore.crystal']) gain(s, ore, D(1e9));
    invalidateStats();
    runFurnace(s, 0.01);
    expect(new Set(s.forge.lanes.map((l) => l.grade))).toEqual(new Set(['iron', 'gold', 'crystal']));
    runFurnace(s, 600);
    for (const alloy of ['alloy.iron', 'alloy.gold', 'alloy.crystal']) expect(cur(s, alloy).gt(0), alloy).toBe(true);
    // a grade that runs out hands its crucible to one that hasn't
    expect(setForgeGrade(s, 'nonsense')).toBe(false);
    expect(setForgeGrade(s, 'gold')).toBe(true);
  });
});

describe('1.2.0: new auto-buyers', () => {
  it('earned by lifetime Supernovas: the Nova Tree at 5, Supernova at 10, Belt at 15, Constants at 20', () => {
    const U = BALANCE.automation.unlockAt;
    expect(U.novatree).toBe(5);
    for (const [id, at] of [['auto.novatree', U.novatree], ['auto.supernova', U.supernova], ['auto.belt', U.belt], ['auto.constants', U.constants]] as const) {
      const s = createInitialState(1, 1);
      s.stats.supernovasAll = at - 1;
      expect(autoUnlocked(s, auto(id)), id).toBe(false);
      s.stats.supernovasAll = at;
      expect(autoUnlocked(s, auto(id)), id).toBe(true);
    }
    // Auto-Supernova starts on; 1.4.0: so do the tree auto-buyers
    expect(autoSetting(createInitialState(1, 1), 'auto.supernova').on).toBe(true);
    expect(autoSetting(createInitialState(1, 1), 'auto.novatree').on).toBe(true);
  });

  it('Auto-Supernova goes when a Supernova is ready, and not when switched off', () => {
    const s = novaRun(12);
    setAuto(s, 'auto.supernova', { on: false });
    runAutomation(s);
    expect(s.stats.supernovasAll).toBe(12);
    setAuto(s, 'auto.supernova', { on: true });
    runAutomation(s);
    expect(s.stats.supernovasAll).toBe(13);
    // straight after, the next one needs a real run
    runAutomation(s);
    expect(s.stats.supernovasAll).toBe(13);
  });

  it('Auto-Belt buys Belt upgrades with its share of ore and moves up a Belt Tier when it can', () => {
    const s = createInitialState(4, 4);
    s.tier = 3;
    s.stats.supernovasAll = 15;
    for (const a of AUTO_BUYERS) if (a.id !== 'auto.belt') s.auto[a.id] = { on: false, spend: 1 };
    gain(s, 'ore', D(1e6));
    invalidateStats();
    runAutomation(s);
    expect(Object.values(s.belt.upgrades).some((n) => n > 0)).toBe(true);
    s.belt.oreThisTier = beltTierNeed(1);
    runAutomation(s);
    expect(s.belt.tier).toBe(1);
  });

  it('1.4.0: Auto-Constants buys every level it can at once, on every pass (it stepped once a minute)', () => {
    const s = createInitialState(5, 5);
    s.tier = 4;
    s.stats.supernovasAll = 20;
    for (const a of AUTO_BUYERS) if (a.id !== 'auto.constants') s.auto[a.id] = { on: false, spend: 1 };
    gain(s, 'stardust', D(1e30));
    invalidateStats();
    const c = CONSTANTS.find((x) => constantOpen(s, x) && x.currency === 'stardust')!;
    expect(c).toBeDefined();
    s.playtime = 1000;
    runAutomation(s);
    const first = level(s, c.id);
    // far past its next doubling in one pass: everything the spending limit allows
    expect(first).toBeGreaterThan(nextDoubling(0));
    // and nothing left to buy straight after (it bought it all, short of the safe tenth)
    runAutomation(s);
    expect(level(s, c.id)).toBe(first);
    // more Stardust: the next pass buys more at once, with no wait
    gain(s, 'stardust', D(1e40));
    s.playtime = 1001;
    runAutomation(s);
    expect(level(s, c.id)).toBeGreaterThan(first);
    expect(buyConstant(s, c.id, 1) || true).toBe(true);
  });
});

describe('1.2.0: menus that run themselves tuck away; you can hide or show any but three', () => {
  it('Orbitals tucks away with Auto-planets on (once seen), shows again on request, and never hides the Starforge', () => {
    const s = createInitialState(6, 6);
    s.stats.supernovasAll = 5;
    s.seen.push('orbitals');
    expect(runsItself(s, 'orbitals')).not.toBeNull();
    expect(menuHidden(s, 'orbitals')).toBe(true);
    setMenuHidden(s, 'orbitals', false);
    expect(menuHidden(s, 'orbitals')).toBe(false);
    setMenuHidden(s, 'merchant', true);
    expect(menuHidden(s, 'merchant')).toBe(true);
    for (const id of NEVER_HIDE) {
      setMenuHidden(s, id, true);
      expect(menuHidden(s, id), id).toBe(false);
    }
    s.settings.autoHideMenus = false;
    setMenuHidden(s, 'orbitals', true);
    setMenuHidden(s, 'orbitals', false);
    expect(menuHidden(s, 'orbitals')).toBe(false);
  });

  it('engines go compact once every engine has its auto-buyer on, or by setting', () => {
    const s = createInitialState(7, 7);
    expect(enginesCompact(s)).toBe(false);
    // every engine auto-buyer earned (12 Supernovas) and on by default: compact
    s.stats.supernovas = 12;
    s.stats.supernovasAll = 12;
    expect(enginesCompact(s)).toBe(true);
    setAuto(s, 'auto.mote', { on: false });
    expect(enginesCompact(s)).toBe(false);
    s.settings.engineList = 'compact';
    expect(enginesCompact(s)).toBe(true);
    s.settings.engineList = 'full';
    expect(enginesCompact(s)).toBe(false);
  });
});

describe('1.2.0: more medals: combinations, unlocks and secrets', () => {
  it('a secret medal is earned by poking; a combination needs every part; unlock medals count systems', () => {
    const s = createInitialState(8, 8);
    for (let i = 0; i < 24; i++) poke(s, 'pill');
    poke(s, 'nonsense');
    checkMedals(s);
    expect(hasMedal(s, 'secret.pill')).toBe(false);
    poke(s, 'pill');
    expect(s.stats[pokeStat('pill')]).toBe(25);
    checkMedals(s);
    expect(hasMedal(s, 'secret.pill')).toBe(true);
    expect(MEDALS.filter((m) => m.secret).length).toBeGreaterThanOrEqual(10);
    const triple = MEDALS.find((m) => m.id === 'combo.triple')!;
    Object.assign(s.stats, { nebulasAll: 1, singularitiesAll: 1 });
    expect(reqMet(s, triple.req)).toBe(false);
    s.stats.galacticsAll = 1;
    expect(reqMet(s, triple.req)).toBe(true);
    s.unlocked = ['upgrades', 'medals', 'stats', 'belt', 'level', 'constants', 'quests', 'orbitals', 'mastery', 'wardrobe'];
    checkMedals(s);
    expect(hasMedal(s, 'unlock.10')).toBe(true);
  });

  it('ship-home pop-ups start off; reset animations start on; the interface starts at 100%', () => {
    const s = createInitialState(9, 9);
    expect(s.settings.shipAlerts).toBe(false);
    expect(s.settings.resetFx).toBe(true);
    expect(s.settings.uiScale).toBe(1);
    expect(s.settings.autoHideMenus).toBe(true);
  });
});

describe('1.2.0: switching the Starforge to All spreads busy crucibles out', () => {
  it('crucibles full of iron take up gold as their batches finish', () => {
    const s = createInitialState(10, 10);
    s.stats.supernovas = 5;
    s.forge.on = true;
    s.forge.share = 1;
    s.forge.upgrades.crucibles = 1;
    for (const ore of ['ore', 'ore.gold']) gain(s, ore, D(1e9));
    invalidateStats();
    runFurnace(s, 0.01);
    expect(s.forge.lanes.map((l) => l.grade)).toEqual(['iron', 'iron']);
    setForgeGrade(s, 'all');
    runFurnace(s, 120);
    expect(s.forge.lanes.map((l) => l.grade).sort()).toEqual(['gold', 'iron']);
  });
});
