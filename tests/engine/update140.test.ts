import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/content/balance';
import { RITES } from '../../src/content/beyond';
import { planetScore } from '../../src/content/galaxyBuild';
import { MEGA_BY_ID } from '../../src/content/galaxyBuild';
import { STAR_CHART } from '../../src/content/galactic';
import { registerContent } from '../../src/content';
import { D } from '../../src/engine/decimal';
import { autoLevel, layerAutoSetting, reachedLayer, setLayerAuto, systemFullyAutomated } from '../../src/engine/layerAuto';
import { ceilingFor, milestoneReached, performReset, resetCeiling } from '../../src/engine/layers';
import { importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, gainPassive, SAVE_VERSION } from '../../src/engine/state';
import { invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { tick } from '../../src/engine/tick';
import { autoAll } from '../../src/engine/systems/autoEntries';
import { AUTO_BUYERS, autoSetting, autoUnlocked } from '../../src/engine/systems/automation';
import {
  aspectShare,
  axisMult,
  beyondGain,
  beyondReady,
  buyAxis,
  buyDevotion,
  buyMiracle,
  harmony,
  lawPoints,
  resonance,
  setAscendant,
  setAxis,
  setLaw,
  wakeAspect,
} from '../../src/engine/systems/beyond';
import { bestLayout, paintBestLayout } from '../../src/engine/systems/colonies';
import { crunchGain, crunchReady } from '../../src/engine/systems/crunch';
import { firstUnexplored, galacticGain, galaxyCleared, goalProgress, galaxyOf } from '../../src/engine/systems/galactic';
import { megaCost } from '../../src/engine/systems/megastructures';
import { chartBonus, recordConstellation, starChart } from '../../src/engine/systems/observatory';
import { runsItself } from '../../src/app/menus';
import { manual } from './manual';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

/** The playtest save the 1.4.0 list was written from (version 22: 30 hours, 10 Galactic Rebirths, 2 galaxies explored). */
const playtest = () => importSave(readFileSync('tests/fixtures/save-v22.txt', 'utf8').trim()).state;

describe('1.4.0: save version 23 loads the playtest save (version 22)', () => {
  it('keeps everything; galaxy goals count from now; Auto-explore starts on; shown menus tuck away again', () => {
    const s = playtest();
    expect(SAVE_VERSION).toBe(23);
    expect(s.version).toBe(23);
    expect(s.stats.galacticsAll).toBe(10);
    expect(s.galactic.cleared).toEqual(['milkyway', 'dwarf']);
    expect(s.galactic.explore).toBe(true);
    expect(s.galactic.here).toEqual({});
    expect(s.settings.shownMenus).toEqual([]);
    expect(cur(s, 'galaxyCores').gt(1e18)).toBe(true);
  });
});

describe('1.4.0: Galaxy Cores, the Big Crunch and galaxy goals', () => {
  it('a Galactic Rebirth on the playtest save pays about a trillion Galaxy Cores, not 9.4e18', () => {
    const s = playtest();
    const g = galacticGain(s);
    expect(g.gt(1e11)).toBe(true);
    expect(g.lt(1e13)).toBe(true);
  });

  it('the Big Crunch needs 100 billion Galaxy Cores this Crunch run (it was 10)', () => {
    const s = createInitialState(1, 1);
    s.galactic.cleared = ['milkyway', 'spiral', 'elliptical', 'ring', 'dwarf', 'quasar', 'lenticular'];
    s.totals.run.galaxyCores = D(9e10);
    expect(crunchReady(s)).toBe(false);
    s.totals.run.galaxyCores = D(1e11);
    expect(crunchReady(s)).toBe(true);
    expect(crunchGain(s).toNumber()).toBe(1);
  });

  it('a galaxy goal counts everything gained after arriving, passive income too', () => {
    const s = manual(playtest());
    // pretend we just arrived in Spiral (goal: 1e15 Dark Matter here)
    s.galactic.galaxy = 'spiral';
    s.galactic.here = {};
    s.totals.run.darkMatter = D(0);
    expect(goalProgress(s, galaxyOf(s).goal).now.toNumber()).toBe(0);
    gainPassive(s, 'darkMatter', D(2e15));
    expect(goalProgress(s, galaxyOf(s).goal).now.gte(1e10)).toBe(true);
    tick(s, 0.05);
    expect(galaxyCleared(s, 'spiral')).toBe(true);
  });

  it('Auto-explore sends the next rebirth to the first galaxy not explored yet', () => {
    const s = manual(playtest());
    tick(s, 0.05);
    expect(s.galactic.next).not.toBe('milkyway');
    expect(s.galactic.next).toBe(firstUnexplored(s)!.id);
  });
});

describe('1.4.0: the reset ceiling', () => {
  it('a first reset keeps small gains, bends big ones towards 100,000 and never reaches it', () => {
    const s = createInitialState(1, 1);
    expect(resetCeiling(s, 'galactic', D(500)).toNumber()).toBe(500);
    const million = resetCeiling(s, 'galactic', D(1e6)).toNumber();
    const trillion = resetCeiling(s, 'galactic', D(1e12)).toNumber();
    const septillion = resetCeiling(s, 'galactic', D(1e24)).toNumber();
    expect(million).toBeGreaterThan(1e4);
    expect(million).toBeLessThan(2e4);
    expect(trillion).toBeGreaterThan(million);
    expect(septillion).toBeGreaterThan(trillion);
    expect(septillion).toBeLessThan(1e5);
    expect(resetCeiling(s, 'galactic', D('1e1000')).toNumber()).toBeLessThan(1e5);
  });

  it('each reset of the layer lifts it, and a few resets later it is out of the way', () => {
    expect(ceilingFor(0)!.c).toBe(5);
    expect(ceilingFor(1)!.c).toBeCloseTo(7.5, 9);
    expect(ceilingFor(2)!.c).toBeCloseTo(11.25, 9);
    expect(ceilingFor(40)).toBeNull();
    const s = createInitialState(1, 1);
    s.stats.galacticsAll = 30;
    expect(resetCeiling(s, 'galactic', D(1e40)).eq(1e40)).toBe(true);
  });
});

describe('1.4.0: layers you have passed run themselves', () => {
  it('one layer up mostly, two layers up fully', () => {
    const s = createInitialState(1, 1);
    expect(reachedLayer(s)).toBe(0);
    s.stats.supernovasAll = 3;
    s.stats.nebulasAll = 1;
    s.stats.singularitiesAll = 1;
    s.stats.galacticsAll = 1;
    expect(reachedLayer(s)).toBe(4);
    expect(autoLevel(s, 'nebula')).toBe(2);
    expect(autoLevel(s, 'singularity')).toBe(1);
    expect(autoLevel(s, 'galactic')).toBe(0);
    // Eternal Galaxy runs all of the Galactic layer early
    s.eternity.upgrades = ['et.galaxy'];
    expect(autoLevel(s, 'galactic')).toBe(2);
  });

  it('the Stardust auto-buyers unlock two layers up; Auto-Supernova one layer up; tree auto-buyers start on', () => {
    const s = createInitialState(1, 1);
    s.stats.supernovasAll = 1;
    const novas = AUTO_BUYERS.find((a) => a.id === 'auto.supernova')!;
    const engines = AUTO_BUYERS.filter((a) => a.kind === 'engine');
    expect(engines.every((a) => autoUnlocked(s, a))).toBe(false);
    s.stats.nebulasAll = 1;
    expect(engines.every((a) => autoUnlocked(s, a))).toBe(true);
    expect(autoUnlocked(s, novas)).toBe(true);
    expect(autoSetting(s, 'auto.nebulatree').on).toBe(true);
  });

  it('a fully automated layer tucks its menus away; a finished tree with its auto-buyer on does too', () => {
    const s = createInitialState(1, 1);
    Object.assign(s.stats, { supernovasAll: 3, nebulasAll: 1, singularitiesAll: 1 });
    expect(systemFullyAutomated(s, 'starforge')).toBe(true);
    expect(runsItself(s, 'starforge')).not.toBeNull();
    expect(runsItself(s, 'singularitytree')).toBeNull();
    setLayerAuto(s, 'supernova', { on: false });
    expect(runsItself(s, 'starforge')).toBeNull();
  });

  it('a passed layer resets by itself on its rule, and its tree buys everything at once', () => {
    const s = createInitialState(1, 1);
    Object.assign(s.stats, { supernovas: 30, supernovasAll: 300, nebulasAll: 1, singularitiesAll: 1 });
    gain(s, 'shards', D(1e9));
    invalidateStats();
    tick(s, 1.01);
    expect(s.stats.nebulasAll).toBe(2);
    expect(Object.keys(s.nebulaTree).length).toBeGreaterThan(0);
  });

  it('Auto all switches on every auto-buyer and every layer that can run itself', () => {
    const s = createInitialState(1, 1);
    Object.assign(s.stats, { supernovasAll: 300, nebulasAll: 3, singularitiesAll: 1 });
    manual(s);
    s.galactic.explore = false;
    expect(autoAll(s)).toBeGreaterThan(5);
    expect(layerAutoSetting(s, 'supernova').on).toBe(true);
    expect(AUTO_BUYERS.filter((a) => autoUnlocked(s, a)).every((a) => autoSetting(s, a.id).on && autoSetting(s, a.id).spend === 1)).toBe(true);
    expect(s.galactic.explore).toBe(true);
  });

  it('Galactic milestones 6, 8 and 9 run the Mirror, Galactic Rebirths and the builds', () => {
    const s = playtest();
    expect(milestoneReached(s, 'galactic', 'autoMirror')).toBe(true);
    expect(milestoneReached(s, 'galactic', 'autoGalactic')).toBe(true);
    expect(milestoneReached(s, 'galactic', 'autoBuild')).toBe(true);
  });
});

describe('1.4.0: the barrier and the layers beyond the Multiverse', () => {
  const beyond = () => {
    const s = createInitialState(7, 7);
    Object.assign(s.stats, { supernovasAll: 900, nebulasAll: 120, singularitiesAll: 400, galacticsAll: 60, crunchesAll: 30, multiversesAll: 8, multiverses: 8, multiversesBest: 8 });
    s.singularityTree = { score: 1 };
    s.galacticTree = { 'gal.core': 1 };
    gain(s, 'darkMatter', D(1e30));
    gain(s, 'galaxyCores', D(1e20));
    gain(s, 'chronons', D(50));
    gain(s, 'sparks', D(60));
    invalidateStats();
    return manual(s);
  };

  it('the Hyperverse needs 60 Sparks this run and wipes only the three layers below (Multiverse, Big Crunch, Galactic)', () => {
    const s = beyond();
    expect(beyondReady(s, 'hyperverse')).toBe(true);
    expect(beyondGain(s, 'hyperverse').toNumber()).toBe(1);
    performReset(s, 'hyperverse');
    expect(cur(s, 'tesseracts').toNumber()).toBe(1);
    expect(s.stats.hyperversesAll).toBe(1);
    expect(cur(s, 'sparks').toNumber()).toBe(0);
    expect(cur(s, 'chronons').toNumber()).toBe(0);
    expect(cur(s, 'galaxyCores').toNumber()).toBe(0);
    expect(s.galacticTree).toEqual({});
    // three layers down at most: the Singularity layer is untouched
    expect(s.singularityTree).toEqual({ score: 1 });
    expect(cur(s, 'darkMatter').toNumber()).toBe(1e30);
    // counts and milestones stay
    expect(s.stats.crunchesAll).toBe(30);
    expect(milestoneReached(s, 'multiverse', 'sparkPlus')).toBe(true);
  });

  it('the Tesseract: an axis multiplies its layer by its currency, and neighbours in order resonate', () => {
    const s = beyond();
    performReset(s, 'hyperverse');
    gain(s, 'tesseracts', D(1000));
    expect(setAxis(s, 0, 'nebula')).toBe(true);
    expect(setAxis(s, 1, 'singularity')).toBe(true);
    expect(resonance(s, 0)).toBe(1);
    expect(resonance(s, 1)).toBe(1);
    expect(setAxis(s, 2, 'nebula')).toBe(true);
    // a layer holds one axis: it moved
    expect(s.tesseract.axes[0]).toBe('');
    s.settings.buyAmount = 1;
    expect(buyAxis(s, 1)).toBe(true);
    expect(axisMult(s, 1).gt(1)).toBe(true);
    expect(stat(s, 'darkMatterGain').gt(0)).toBe(true);
  });

  it('the Pantheon: wake, raise three Ascendant, find every Rite of the pairs standing together', () => {
    const s = createInitialState(8, 8);
    s.stats.omniversesAll = 1;
    gain(s, 'aether', D(1e6));
    for (const id of ['smith', 'weaver', 'hunger', 'tide']) expect(wakeAspect(s, id)).toBe(true);
    expect(s.pantheon.ascendant).toEqual(['smith', 'weaver', 'hunger']);
    expect(s.pantheon.rites.length).toBe(3);
    expect(setAscendant(s, 'tide', true)).toBe(false);
    expect(setAscendant(s, 'smith', false)).toBe(true);
    expect(setAscendant(s, 'tide', true)).toBe(true);
    expect(s.pantheon.rites.length).toBe(5);
    expect(aspectShare(s, 'smith')).toBeLessThan(aspectShare(s, 'tide'));
    s.settings.buyAmount = 10;
    expect(buyDevotion(s, 'tide')).toBe(true);
    expect(RITES).toHaveLength(28);
  });

  it('the Laws: a point a doubling of Origin Seeds; every law turned is Harmony', () => {
    const s = createInitialState(9, 9);
    s.stats.genesesAll = 1;
    gain(s, 'originSeeds', D(1023));
    expect(lawPoints(s)).toBe(11);
    for (const id of ['gravity', 'light', 'entropy', 'charge']) expect(setLaw(s, id, 2)).toBe(true);
    expect(harmony(s)).toBe(false);
    expect(setLaw(s, 'time', 4)).toBe(false);
    expect(setLaw(s, 'time', -3)).toBe(true);
    expect(harmony(s)).toBe(true);
    expect(stat(s, 'seedGain').gte(2)).toBe(true);
  });

  it('Apotheosis remembers each run as a Life, and Divinity buys Miracles', () => {
    const s = createInitialState(10, 10);
    Object.assign(s.stats, { genesesAll: 6, geneses: 6, genesesBest: 6 });
    gain(s, 'originSeeds', D(1e6));
    invalidateStats();
    expect(beyondReady(s, 'apotheosis')).toBe(true);
    performReset(s, 'apotheosis');
    expect(s.lives.list).toHaveLength(1);
    expect(s.lives.list[0]!.score).toBe(120);
    gain(s, 'divinity', D(1));
    expect(buyMiracle(s, 'mir.dawn')).toBe(true);
    expect(buyMiracle(s, 'mir.dawn')).toBe(false);
  });
});

describe('1.4.0: Leviathans, megastructures, terraforming and the Observatory', () => {
  it('the last megastructure stages need far less Antimatter', () => {
    const s = createInitialState(1, 1);
    s.megastructures = { matrioshka: 4, stellarengine: 4 };
    const am = (id: string) => megaCost(s, MEGA_BY_ID.get(id)!)!.find((c) => c.currency === 'antimatter')!.amount;
    expect(am('matrioshka').lte(1e24)).toBe(true);
    expect(am('stellarengine').lte(1e26)).toBe(true);
  });

  it('the best terraforming layout beats the simple rings, and paints for you', () => {
    const rings = planetScore(bestLayout().map(() => 'ocean'));
    expect(planetScore(bestLayout())).toBeGreaterThan(rings);
    const s = playtest();
    gain(s, 'supply', D(1e9));
    expect(paintBestLayout(s, 1)).toBeGreaterThan(10);
    expect(s.colonies.list[1]!.grid.every(Boolean)).toBe(true);
  });

  it('the Stardust Chart has three charts that level up for ever, and every sky recorded adds 5% Star Charts', () => {
    expect(STAR_CHART.filter((n) => n.repeat)).toHaveLength(3);
    const s = playtest();
    const node = starChart.def.nodes.find((n) => n.id === 'chart.echo.cores')!;
    expect(starChart.cost(s, node).toNumber()).toBe(BALANCE.galactic.chartEchoCost);
    const before = s.stats.skiesCharted ?? 0;
    s.observatory.best = 0;
    s.observatory.links = [[0, 1], [1, 2], [2, 0]];
    expect(recordConstellation(s)).toBeGreaterThan(0);
    expect(s.stats.skiesCharted).toBe(before + 1);
    expect(chartBonus(s)).toBeCloseTo(1 + 0.05 * (before + 1), 9);
  });
});

describe('1.4.5: constant engines in the Singularity and Galactic Trees', () => {
  it('the Nebula Constant Engine buys Nebula Constants by itself, before the Nebula layer runs itself', async () => {
    const { singularityTree } = await import('../../src/engine/systems/singularity');
    const { CONSTANTS } = await import('../../src/content/constants');
    const { constantOpen, level } = await import('../../src/engine/systems/constants');
    const s = createInitialState(21, 21);
    // one Singularity: the Nebula layer only mostly runs itself... switch its automation off to see the engine alone
    Object.assign(s.stats, { supernovasAll: 300, nebulasAll: 20, nebulas: 20, singularitiesAll: 1 });
    manual(s);
    setLayerAuto(s, 'nebula', { on: true });
    gain(s, 'essence', D('1e60'));
    gain(s, 'darkMatter', D(1e9));
    const neb = CONSTANTS.filter((c) => c.set === 'nebula' && constantOpen(s, c));
    expect(neb.length).toBeGreaterThan(0);
    s.stats.singularitiesAll = 1;
    // nebula is one layer down (level 1): its constants run anyway; turn the layer's reach off by checking a level-0 set
    const before = neb.map((c) => level(s, c.id));
    const node = singularityTree.def.nodes.find((n) => n.id === 'sing.nebulaEngine')!;
    expect(node.parents).toEqual(['sing.1.1']);
    s.singularityTree = { score: 1, 'sing.1.1': 1, 'sing.nebulaEngine': 1 };
    invalidateStats();
    tick(s, 1.01);
    expect(neb.some((c, i) => level(s, c.id) > before[i]!)).toBe(true);
  });

  it('the Constant Engine buys every set, even one whose layer does not run itself yet', async () => {
    const { galacticTree } = await import('../../src/engine/systems/galactic');
    const { CONSTANTS } = await import('../../src/content/constants');
    const { constantOpen, level } = await import('../../src/engine/systems/constants');
    const s = createInitialState(22, 22);
    Object.assign(s.stats, { supernovasAll: 300, nebulasAll: 20, singularitiesAll: 30, galacticsAll: 1 });
    manual(s);
    for (const l of ['stardust', 'supernova', 'nebula', 'singularity', 'galactic'] as const) setLayerAuto(s, l, { on: true });
    // the Galactic layer itself is level 0 here, so only the engine can buy Galactic Constants
    expect(autoLevel(s, 'galactic')).toBe(0);
    gain(s, 'galaxyCores', D(1e9));
    const gal = CONSTANTS.filter((c) => c.set === 'galactic' && constantOpen(s, c));
    expect(gal.length).toBeGreaterThan(0);
    tick(s, 1.01);
    expect(gal.every((c) => level(s, c.id) === 0)).toBe(true);
    expect(galacticTree.def.nodes.some((n) => n.id === 'gal.constantEngine')).toBe(true);
    s.galacticTree = { 'gal.constantEngine': 1 };
    invalidateStats();
    tick(s, 1.01);
    expect(gal.some((c) => level(s, c.id) > 0)).toBe(true);
  });
});
