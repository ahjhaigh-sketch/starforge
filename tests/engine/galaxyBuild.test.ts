import { manual } from './manual';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BALANCE } from '../../src/content/balance';
import { HEX_EDGES, HEXES, MEGA_BY_ID, MEGASTRUCTURES, planetScore } from '../../src/content/galaxyBuild';
import { D } from '../../src/engine/decimal';
import { performReset } from '../../src/engine/layers';
import { simulateElapsed } from '../../src/engine/offline';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { breakdown, invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { buyBuilding, buyPort, buyResearch, capacity, colonySlots, finishPlanet, foundColony, foundCost, growPop, growthRate, maxRoutes, openRoute, placeBiome, supplyRate } from '../../src/engine/systems/colonies';
import { buildStage, megaCost, megaStage } from '../../src/engine/systems/megastructures';
import { tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

const B = BALANCE.galaxyBuild;

/** A player a few Galactic Rebirths in, rich in everything. */
function player(galactics = 2, seed = 9): GameState {
  const s = createInitialState(12_000_000, seed);
  s.stats.galacticsAll = galactics;
  s.stats.singularitiesAll = 30;
  s.stats.nebulasAll = 80;
  s.forge.on = false;
  s.galactic.cleared = ['milkyway', 'spiral'];
  for (const c of ['stardust', 'shards', 'essence', 'darkMatter', 'galaxyCores', 'antimatter', 'embers', 'ore', 'scales', 'alloy.iron', 'alloy.gold', 'supply']) gain(s, c, D('1e600'));
  invalidateStats();
  return manual(s);
}

function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

const labels = (s: GameState, id: string) => breakdown(s, id).map((l) => l.label);

describe('Megastructures', () => {
  it('open as Galactic Rebirths add up; each stage costs 10^(base + step x stage) of every currency listed', () => {
    const s = player(1);
    const birch = MEGA_BY_ID.get('birch')!;
    expect(buildStage(s, 'birch')).toBe(false);
    const dyson = MEGA_BY_ID.get('dyson')!;
    const cost = megaCost(s, dyson)!;
    expect(cost.map((c) => c.currency).sort()).toEqual(Object.keys(dyson.cost).sort());
    s.currencies.darkMatter = D(1e12);
    const before = cur(s, 'darkMatter');
    expect(buildStage(s, 'dyson')).toBe(true);
    const [base, step] = dyson.cost.darkMatter!;
    expect(before.sub(cur(s, 'darkMatter')).div(10 ** base).toNumber()).toBeCloseTo(1, 6);
    const next = megaCost(s, dyson)!.find((c) => c.currency === 'darkMatter')!;
    expect(next.amount.log10().toNumber()).toBeCloseTo(base + step, 9);
    expect(birch.galactics).toBe(5);
  });

  it('every stage is permanent: no reset touches it, and it shows in the breakdowns', () => {
    const s = player(5);
    for (const m of MEGASTRUCTURES) expect(buildStage(s, m.id)).toBe(true);
    expect(labels(s, 'productionMult')).toContain('Dyson Swarm (megastructure)');
    expect(labels(s, 'gameSpeed')).toContain('Stellar Engine (megastructure)');
    // a Galactic Rebirth (which resets the most) leaves them all
    s.blackHole.mass = D(2e7);
    s.mirror.depth = 11;
    s.mirror.upgrades = ['mu.key'];
    s.totals.run.darkMatter = D(1e13);
    invalidateStats();
    expect(performReset(s, 'galactic')).not.toBeNull();
    for (const m of MEGASTRUCTURES) expect(megaStage(s, m.id)).toBe(1);
    expect(labels(s, 'productionMult')).toContain('Dyson Swarm (megastructure)');
  });

  it('five stages at most, and Lattice raises the rewards', () => {
    const s = player(5);
    for (let i = 0; i < 8; i++) buildStage(s, 'dyson');
    expect(megaStage(s, 'dyson')).toBe(5);
    const v = () => breakdown(s, 'productionMult').find((l) => l.label === 'Dyson Swarm (megastructure)')!.value;
    const per = Math.log10(MEGA_BY_ID.get('dyson')!.reward.value);
    expect(v().log10().toNumber()).toBeCloseTo(per * 5, 6);
    s.constants['gal.lattice'] = 10;
    invalidateStats();
    expect(v().log10().toNumber()).toBeCloseTo(per * 5 * (1 + 10 * B.latticePer), 6);
  });
});

describe('Colonies', () => {
  it('open at 2 Galactic Rebirths, one slot per galaxy explored plus one, founded with Galaxy Cores', () => {
    expect(foundColony(player(1), 'rocky')).toBe(false);
    const s = player();
    expect(colonySlots(s)).toBe(3);
    expect(foundCost(s).toNumber()).toBe(5);
    s.currencies.galaxyCores = D(1000);
    const cores = cur(s, 'galaxyCores');
    expect(foundColony(s, 'rocky')).toBe(true);
    expect(cores.sub(cur(s, 'galaxyCores')).toNumber()).toBeCloseTo(5, 0);
    expect(foundCost(s).toNumber()).toBe(15);
    expect(foundColony(s, 'ocean')).toBe(true);
    expect(foundColony(s, 'ice')).toBe(true);
    expect(foundColony(s, 'desert')).toBe(false);
    expect(s.colonies.list[0]!.pop).toBe(B.startPop);
  });

  it('growth is logistic and exact: an hour away gives the same people as an hour played', () => {
    const online = player();
    const away = player();
    const once = player();
    for (const s of [online, away, once]) foundColony(s, 'rocky');
    for (let i = 0; i < 7200; i++) tick(online, 0.5);
    simulateElapsed(away, 3600, { cap: Infinity, efficiency: 1, offline: true });
    tick(once, 3600);
    const a = online.colonies.list[0]!.pop;
    expect(away.colonies.list[0]!.pop / a).toBeCloseTo(1, 9);
    expect(once.colonies.list[0]!.pop / a).toBeCloseTo(1, 9);
    // and it matches the formula
    const K = capacity(online, online.colonies.list[0]!);
    const r = growthRate(online, online.colonies.list[0]!);
    expect(a / growPop(B.startPop, K, r, 3600)).toBeCloseTo(1, 9);
    expect(growPop(K, K, r, 1e6)).toBeCloseTo(K, 6);
  });

  it('buildings, spaceports, routes and research do what they say', () => {
    const s = player();
    foundColony(s, 'rocky');
    foundColony(s, 'ocean');
    const c = s.colonies.list[0]!;
    const K = capacity(s, c);
    expect(buyBuilding(s, 0, 'housing')).toBe(true);
    expect(capacity(s, c) / K).toBeCloseTo(B.housingMult, 9);
    const r = growthRate(s, c);
    buyBuilding(s, 0, 'farms');
    expect(growthRate(s, c) / r).toBeCloseTo(B.farmsMult, 9);
    const sup = supplyRate(s, 0).toNumber();
    buyBuilding(s, 0, 'factories');
    expect(supplyRate(s, 0).toNumber() / sup).toBeCloseTo(B.factoriesMult, 9);
    // routes need spaceports at both ends
    expect(openRoute(s, 0, 1)).toBe(false);
    buyPort(s, 0);
    buyPort(s, 1);
    const before = supplyRate(s, 0).toNumber();
    expect(openRoute(s, 0, 1)).toBe(true);
    expect(supplyRate(s, 0).toNumber() / before).toBeCloseTo(B.routeMult, 9);
    expect(openRoute(s, 1, 0)).toBe(false);
    const routes = maxRoutes(s);
    expect(buyResearch(s, 'res.warp')).toBe(true);
    expect(maxRoutes(s)).toBe(routes + 2);
    const g = growthRate(s, c);
    buyResearch(s, 'res.hydro');
    expect(growthRate(s, c) / g).toBeCloseTo(2, 9);
  });

  it("each colony boosts its planet type's stat, labelled in the breakdown", () => {
    const s = player();
    foundColony(s, 'rocky');
    s.colonies.list[0]!.pop = 9999;
    invalidateStats();
    const src = breakdown(s, 'productionMult').find((l) => l.label === 'Colony 1 (Rocky world)')!;
    expect(src.value.toNumber()).toBeCloseTo((1 + Math.log10(10000)) ** 4, 6);
  });
});

describe('Terraforming', () => {
  it('a planet has 19 hexes and 42 touching pairs; the score is the same for the same layout', () => {
    expect(HEXES).toHaveLength(19);
    expect(HEX_EDGES).toHaveLength(42);
    const grid = HEXES.map((_, i) => ['ocean', 'forest', 'lava', 'tundra'][i % 4]!);
    expect(planetScore(grid)).toBe(planetScore([...grid]));
    expect(planetScore(new Array(19).fill('ocean'))).toBe(42);
  });

  it('needs Terraformers; a finished planet is a multiplier for good and can no longer change', () => {
    const s = player();
    foundColony(s, 'rocky');
    expect(placeBiome(s, 0, 0, 'ocean')).toBe(false);
    buyResearch(s, 'res.terra');
    s.currencies.supply = D(1e6);
    const supply = cur(s, 'supply');
    expect(placeBiome(s, 0, 0, 'ocean')).toBe(true);
    expect(supply.sub(cur(s, 'supply')).toNumber()).toBeCloseTo(B.biomeCost, -1);
    expect(finishPlanet(s, 0)).toBe(false);
    for (let i = 0; i < 19; i++) placeBiome(s, 0, i, i % 2 ? 'forest' : 'ocean');
    const score = planetScore(s.colonies.list[0]!.grid);
    expect(finishPlanet(s, 0)).toBe(true);
    expect(s.colonies.list[0]!.finished).toBe(score);
    expect(placeBiome(s, 0, 3, 'lava')).toBe(false);
    const src = breakdown(s, 'productionMult').find((l) => l.label === 'Terraformed planet 1 (Rocky world)')!;
    expect(src.value.toNumber()).toBeCloseTo(1 + score * B.finishPer, 9);
    expect(s.stats.planetsFinished).toBe(1);
  });
});

describe('save version 17', () => {
  it('loads a real version 16 save', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v16.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.stats.galacticsAll).toBe(1);
    expect(state.galactic.galaxy).toBe('spiral');
    expect(state.galacticTree['gal.core']).toBe(1);
    expect(state.megastructures).toEqual({});
    expect(state.colonies).toEqual({ list: [], routes: [], research: [] });
  });

  it('round-trips megastructures and colonies', () => {
    const s = player();
    buildStage(s, 'dyson');
    foundColony(s, 'gasmoon');
    buyResearch(s, 'res.terra');
    placeBiome(s, 0, 4, 'lava');
    s.colonies.list[0]!.pop = 1234.5;
    const c = clone(s);
    expect(c.megastructures).toEqual({ dyson: 1 });
    expect(c.colonies).toEqual(s.colonies);
    expect(stat(c, 'antimatterMult').gt(1)).toBe(true);
  });
});
