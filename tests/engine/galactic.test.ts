import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BALANCE } from '../../src/content/balance';
import { GALACTIC_TREE, GALAXIES, rollSky } from '../../src/content/galactic';
import { D } from '../../src/engine/decimal';
import { milestoneReached, performReset } from '../../src/engine/layers';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { breakdown, invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { constellationScore, currentScore, loopsOf, maxLinks, recordConstellation, skyOf, toggleLink } from '../../src/engine/systems/observatory';
import { galacticGain, galacticReady, galacticTree, galaxyAvailable, setNextGalaxy } from '../../src/engine/systems/galactic';
import { MIRROR_ENGINES } from '../../src/engine/systems/mirror';
import { tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

/** A player ready for a first Galactic Rebirth. */
function ready(seed = 3): GameState {
  const s = createInitialState(12_000_000, seed);
  s.stats.singularities = 14;
  s.stats.singularitiesAll = 14;
  s.stats.singularitiesBest = 14;
  s.stats.nebulasAll = 60;
  s.forge.on = false;
  s.blackHole.mass = D(2e7);
  s.mirror.upgrades = ['mu.spark', 'mu.key'];
  s.mirror.depth = 11;
  s.singularityTree = { score: 1 };
  s.constants['void.horizon'] = 12;
  gain(s, 'darkMatter', D('1.6e13'));
  invalidateStats();
  return s;
}

function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

const labels = (s: GameState, id: string) => breakdown(s, id).map((l) => l.label);

describe('Galactic Rebirth', () => {
  it('1.3.0: needs the anti-star at Protostar (Mirror depth 11, not Black Hole stages), the Mirror Key and (1.4.0) 1e12 Dark Matter this run', () => {
    const s = ready();
    expect(galacticReady(s)).toBe(true);
    s.mirror.depth = 10;
    expect(galacticReady(s)).toBe(false);
    s.mirror.depth = 11;
    s.blackHole.mass = D(0);
    expect(galacticReady(s)).toBe(true);
    s.mirror.upgrades = ['mu.spark'];
    expect(galacticReady(s)).toBe(false);
    s.mirror.upgrades = ['mu.key'];
    const low = ready();
    low.totals.run.darkMatter = D(9e7);
    expect(galacticReady(low)).toBe(false);
  });

  it('gives floor((DM / 1e8)^0.5) x Galaxy Core gain', () => {
    const s = ready();
    const expected = Math.floor((1.6e13 / 1e8) ** 0.5 * stat(s, 'galaxyCoreGain').toNumber());
    expect(galacticGain(s).toNumber()).toBe(expected);
    expect(expected).toBe(400);
  });

  it('resets the Singularity layer and keeps collections, challenges, wormholes and the key', () => {
    const s = ready();
    s.trials.levels = { dim: 2 };
    s.spire.floor = 20;
    s.leviathans.kills = { calf: 3 };
    s.wormholes.links = [{ from: 'ore', to: 'essence', share: 0.2 }];
    s.runes.copies['dust.1'] = D(5);
    s.mirror.engines = { 'am.lantern': 30 };
    gain(s, 'antimatter', D(1e9));
    expect(performReset(s, 'galactic')!.toNumber()).toBe(400);
    expect(cur(s, 'galaxyCores').toNumber()).toBe(400);
    expect(cur(s, 'darkMatter').toNumber()).toBe(0);
    expect((s.totals.run.darkMatter ?? D(0)).toNumber()).toBe(0);
    expect(s.singularityTree).toEqual({});
    expect(s.constants['void.horizon']).toBe(0);
    expect(s.blackHole.mass.toNumber()).toBe(0);
    expect(s.stats.singularities).toBe(0);
    expect(MIRROR_ENGINES.owned(s, 'am.lantern')).toBe(0);
    expect(s.mirror.depth).toBe(0);
    expect(s.mirror.upgrades).toEqual(['mu.key']);
    expect(cur(s, 'antimatter').toNumber()).toBe(0);
    // kept
    expect(s.trials.levels).toEqual({ dim: 2 });
    expect(s.spire.floor).toBe(20);
    expect(s.leviathans.kills).toEqual({ calf: 3 });
    expect(s.wormholes.links).toHaveLength(1);
    expect(s.runes.copies['dust.1']!.toNumber()).toBe(5);
    expect(s.stats.galacticsAll).toBe(1);
  });

  it('milestone 1 keeps the Singularity milestones', () => {
    const s = ready();
    performReset(s, 'galactic');
    expect(s.stats.singularities).toBe(0);
    expect(milestoneReached(s, 'singularity', 'mirror')).toBe(true);
    expect(milestoneReached(s, 'singularity', 'nebulaFree')).toBe(true);
  });

  it('lifetime Galaxy Cores multiply Dark Matter by (1 + GC)^0.3', () => {
    const s = ready();
    performReset(s, 'galactic');
    const src = breakdown(s, 'darkMatterGain').find((l) => l.label === 'Galaxy Cores (lifetime)')!;
    expect(src.value.toNumber()).toBeCloseTo(401 ** BALANCE.galactic.passivePow, 9);
  });
});

describe('galaxies', () => {
  it('every galaxy rule shows in the stat breakdowns, and only while you are there', () => {
    for (const g of GALAXIES) {
      const s = ready();
      s.stats.galacticsAll = 1;
      s.galactic.galaxy = g.id;
      invalidateStats();
      for (const e of g.effects) expect(labels(s, e.stat), `${g.id} ${e.stat}`).toContain(`Galaxy: ${g.name}`);
      s.galactic.galaxy = g.id === 'milkyway' ? 'spiral' : 'milkyway';
      invalidateStats();
      for (const e of g.effects) expect(labels(s, e.stat)).not.toContain(`Galaxy: ${g.name}`);
    }
    expect(GALAXIES).toHaveLength(20);
  });

  it('meeting a galaxy goal clears it for good', () => {
    const s = ready();
    performReset(s, 'galactic');
    s.galactic.galaxy = 'spiral';
    gain(s, 'darkMatter', D(2e15));
    tick(s, 0.1);
    expect(s.galactic.cleared).toContain('spiral');
    expect(s.stats.galaxiesCleared).toBe(1);
    s.galactic.galaxy = 'milkyway';
    invalidateStats();
    expect(labels(s, 'cometRate')).toContain('Spiral (cleared)');
    expect(labels(s, 'cometRate')).not.toContain('Galaxy: Spiral');
  });

  it('you pick where the next Galactic Rebirth takes you, four galaxies ahead of what you have explored', () => {
    const s = ready();
    expect(galaxyAvailable(s, 'dwarf')).toBe(false);
    expect(galaxyAvailable(s, 'ring')).toBe(true);
    expect(setNextGalaxy(s, 'dwarf')).toBe(false);
    expect(setNextGalaxy(s, 'elliptical')).toBe(true);
    performReset(s, 'galactic');
    expect(s.galactic.galaxy).toBe('elliptical');
    s.galactic.cleared = ['milkyway'];
    expect(galaxyAvailable(s, 'dwarf')).toBe(true);
  });
});

describe('the Galactic Tree', () => {
  it('has 200 nodes, every one reachable from the core', () => {
    expect(GALACTIC_TREE).toHaveLength(200);
    expect(new Set(GALACTIC_TREE.map((n) => n.id)).size).toBe(200);
    const seen = new Set(['gal.core']);
    let grew = true;
    while (grew) {
      grew = false;
      for (const n of GALACTIC_TREE) {
        if (seen.has(n.id)) continue;
        const ok = n.needsAll ? n.parents.every((p) => seen.has(p)) : n.parents.some((p) => seen.has(p));
        if (ok) {
          seen.add(n.id);
          grew = true;
        }
      }
    }
    expect(seen.size).toBe(200);
  });

  it('is bought with Galaxy Cores, and Arms makes its multipliers stronger', () => {
    const s = ready();
    performReset(s, 'galactic');
    expect(galacticTree.buy(s, 'gal.core')).toBe(true);
    const label = 'Galactic Core (Galactic Tree)';
    const v1 = breakdown(s, 'galaxyCoreGain').find((l) => l.label === label)!.value.toNumber();
    expect(v1).toBeCloseTo(1.5, 9);
    s.constants['gal.arms'] = 10;
    invalidateStats();
    const v2 = breakdown(s, 'galaxyCoreGain').find((l) => l.label === label)!.value.toNumber();
    expect(v2).toBeCloseTo(1.5 ** (1 + 10 * BALANCE.galactic.armsPer), 9);
  });
});

describe('the Observatory', () => {
  it('the same seed always draws the same sky', () => {
    expect(rollSky(77)).toEqual(rollSky(77));
    expect(rollSky(77)).not.toEqual(rollSky(78));
    expect(rollSky(77)).toHaveLength(BALANCE.galactic.skyStars);
  });

  it('identical links give identical scores, in any order and either way round', () => {
    const sky = rollSky(5);
    const a: Array<[number, number]> = [[0, 1], [1, 2], [2, 0], [3, 4]];
    const b: Array<[number, number]> = [[4, 3], [0, 2], [2, 1], [1, 0]];
    expect(constellationScore(sky, a)).toBe(constellationScore(sky, b));
    // a closed triangle adds 25%
    expect(loopsOf(a)).toBe(1);
    const open: Array<[number, number]> = [[0, 1], [1, 2], [3, 4]];
    const triangle = constellationScore(sky, [[0, 1], [1, 2], [2, 0]]);
    const raw = constellationScore(sky, open) - constellationScore(sky, [[3, 4]]) + constellationScore(sky, [[2, 0]]);
    expect(triangle).toBeCloseTo(raw * 1.25, 1);
  });

  it('links toggle, cap at the limit, and a record pays only the improvement', () => {
    const s = ready();
    performReset(s, 'galactic');
    expect(skyOf(s)).toHaveLength(24);
    expect(toggleLink(s, 0, 1)).toBe(true);
    expect(toggleLink(s, 1, 0)).toBe(true); // erased
    expect(s.observatory.links).toHaveLength(0);
    for (let i = 0; i < 20; i++) toggleLink(s, i, i + 1);
    expect(s.observatory.links).toHaveLength(maxLinks(s));
    const score = currentScore(s);
    const paid = recordConstellation(s);
    // 1.4.0: the first record on a sky also adds 5% to Star Charts for good, this one included
    expect(paid).toBe(Math.floor(Math.floor(score) * 1.05));
    expect(cur(s, 'starCharts').toNumber()).toBe(paid);
    expect(recordConstellation(s)).toBe(0);
    // a new Galactic run brings a new sky
    const seed = s.observatory.seed;
    s.blackHole.mass = D(2e7);
    s.mirror.depth = 11;
    gain(s, 'darkMatter', D(1e13));
    invalidateStats();
    performReset(s, 'galactic');
    expect(s.observatory.seed).not.toBe(seed);
    expect(s.observatory.links).toEqual([]);
    expect(s.observatory.best).toBe(0);
  });
});

describe('save version 16', () => {
  it('loads a real version 15 save', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v15.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.mirror.depth).toBe(1);
    expect(state.mirror.upgrades).toContain('mu.spark');
    expect(state.wormholes.links).toHaveLength(1);
    expect(state.galactic).toMatchObject({ galaxy: 'milkyway', next: 'milkyway', cleared: [] });
    expect(state.galacticTree).toEqual({});
    expect(state.observatory.links).toEqual([]);
  });

  it('round-trips the galaxy, the trees and the Observatory', () => {
    const s = ready();
    s.galactic = { galaxy: 'ring', next: 'dwarf', cleared: ['milkyway', 'spiral'], autoAt: D(500), here: {}, explore: true };
    s.galacticTree = { 'gal.core': 1, 'gal.echo.0': 3 };
    s.observatory = { seed: 1234, links: [[0, 5], [2, 9]], best: 88.5 };
    s.starChart = { 'chart.root': 1 };
    const c = clone(s);
    expect(c.galactic.cleared).toEqual(['milkyway', 'spiral']);
    expect(c.galactic.autoAt.toNumber()).toBe(500);
    expect(c.galacticTree).toEqual(s.galacticTree);
    expect(c.observatory).toEqual(s.observatory);
    expect(c.starChart).toEqual(s.starChart);
  });
});

describe('long-run safety (found by the Galactic simulator)', () => {
  it('relic effects stay finite at any level and grow x1.02 a level past 300', async () => {
    const { relicEffect } = await import('../../src/engine/systems/forge');
    const { RELICS } = await import('../../src/content/forge');
    const def = RELICS[0]!;
    const at300 = relicEffect(def, 300);
    expect(relicEffect(def, 301).div(at300).toNumber()).toBeCloseTo(1.02, 9);
    expect(relicEffect(def, 300).div(relicEffect(def, 299)).toNumber()).toBeCloseTo(1.25, 9);
    const huge = relicEffect(def, 1_000_000);
    expect(Number.isFinite(huge.log10().toNumber())).toBe(true);
  });

  it('Comet Fusion speed stops at 60 levels, so spawning never divides by zero', async () => {
    const { fusionPlan, spawnEvery } = await import('../../src/engine/systems/fusion');
    const s = ready();
    s.stats.supernovasAll = 300;
    s.fusion.upgrades = { speed: 60 };
    gain(s, 'shards', D('1e3000'));
    expect(fusionPlan(s, 'speed').count).toBe(0);
    expect(spawnEvery(s)).toBeGreaterThan(0);
  });
});

describe('relic level cap', () => {
  it('no relic passes 1,000 levels, from alloy or from Merchant deals', async () => {
    const { addRelicLevels, relicEffect, relicPlan } = await import('../../src/engine/systems/forge');
    const { RELICS } = await import('../../src/content/forge');
    const s = ready();
    const def = RELICS.find((r) => r.maxLevel === undefined)!;
    s.relics.levels[def.id] = 999;
    expect(addRelicLevels(s, def.id, 5)).toBe(1);
    expect(s.relics.levels[def.id]).toBe(1000);
    expect(relicPlan(s, def.id).count).toBe(0);
    // an old save with more levels counts only up to the cap
    expect(relicEffect(def, 50_000).eq(relicEffect(def, 1000))).toBe(true);
  });
});
