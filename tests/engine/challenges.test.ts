import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { BALANCE } from '../../src/content/balance';
import { FAST_RANKS, LEVIATHANS, SCALE_TREE, SPIRE_GIMMICKS, TRIALS } from '../../src/content/challenges';
import { SYSTEMS } from '../../src/content/systems';
import { ASCENT_IDS } from '../../src/app/novaReports';
import { D } from '../../src/engine/decimal';
import { performReset } from '../../src/engine/layers';
import { simulateElapsed } from '../../src/engine/offline';
import { exportSave, importSave } from '../../src/engine/save/store';
import { createInitialState, cur, gain, type GameState, SAVE_VERSION } from '../../src/engine/state';
import { breakdown, invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { chooseLeviathan, damageLeviathan, killsOf, leviathanDps, leviathanHp, leviathansUnlocked, scaleTree, scalesFor, setFighting } from '../../src/engine/systems/leviathans';
import { damageSpire, floorHp, flyBanner, gimmickOf, setClimbing, spireDps } from '../../src/engine/systems/spire';
import { BUFF_KINDS } from '../../src/engine/systems/comets';
import { buyEngine, tapStar } from '../../src/engine/systems/stardust';
import { completeTrial, enterTrial, exitTrial, fastRankFor, fusionScore, goalMet, trialGoal } from '../../src/engine/systems/trials';
import { tick } from '../../src/engine/tick';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

/** A player after a few Singularities, mid-run with engines. */
function player(singularities = 4, seed = 7): GameState {
  const s = createInitialState(12_000_000, seed);
  s.stats.supernovasAll = 300;
  s.stats.nebulasAll = 9;
  s.stats.singularitiesAll = singularities;
  s.forge.on = false;
  gain(s, 'stardust', D('1e12'));
  for (let i = 0; i < 20; i++) buyEngine(s, 'mote', 1);
  invalidateStats();
  return s;
}

function clone(s: GameState): GameState {
  const r = exportSave(s);
  if (!r.ok) throw new Error(r.error);
  return importSave(r.code).state;
}

/** Puts the run past a Trial's goal: Blue Giant and enough Stardust this run. */
function meetGoal(s: GameState): void {
  s.tier = BALANCE.supernova.tier;
  gain(s, 'stardust', trialGoal(s).mul(2));
  invalidateStats();
}

describe('Trials', () => {
  it('open at 2 Singularities, and entering restarts the Supernova run', () => {
    const s = player(1);
    expect(enterTrial(s, ['dim'])).toBe(false);
    s.stats.singularitiesAll = 2;
    s.tier = 5;
    expect(enterTrial(s, ['dim'])).toBe(true);
    expect(s.tier).toBe(0);
    expect(s.engines.mote ?? 0).toBe(0);
    expect((s.totals.run.stardust ?? D(0)).toNumber()).toBe(0);
    // only one at a time
    expect(enterTrial(s, ['silent'])).toBe(false);
  });

  it('debuffs exist only inside the Trial and vanish on exit', () => {
    const s = player();
    const before = stat(s, 'productionMult');
    const ids = (sid: string) => breakdown(s, sid).map((x) => x.label);
    expect(ids('productionMult').some((l) => l.startsWith('Trial:'))).toBe(false);
    enterTrial(s, ['lowgrav']);
    // Low Gravity level 1: Stardust x0.01
    expect(stat(s, 'productionMult').div(before).toNumber()).toBeCloseTo(0.01, 9);
    expect(ids('productionMult')).toContain('Trial: Low Gravity');
    exitTrial(s);
    expect(stat(s, 'productionMult').eq(before)).toBe(true);
    expect(ids('productionMult')).not.toContain('Trial: Low Gravity');
    // every Trial: on while active, gone after
    for (const t of TRIALS.filter((x) => x.id !== 'fast')) {
      const fresh = player();
      const stats = [...new Set(t.debuffs(1).map((e) => e.stat))];
      const was = stats.map((id) => stat(fresh, id).toString());
      enterTrial(fresh, [t.id]);
      expect(stats.some((id, i) => stat(fresh, id).toString() !== was[i]) || stats.every((id) => breakdown(fresh, id).some((x) => x.label === `Trial: ${t.name}`))).toBe(true);
      exitTrial(fresh);
      stats.forEach((id, i) => expect(stat(fresh, id).toString()).toBe(was[i]));
    }
  });

  it('no Trial or Spire floor ever zeroes production or breaks a number, with every comet buff on', () => {
    for (const t of TRIALS) {
      for (const mode of ['trial', 'spire'] as const) {
        const s = player(4);
        for (const b of BUFF_KINDS) s.buffs[b] = s.playtime + 60;
        if (mode === 'trial') enterTrial(s, [t.id]);
        else {
          const i = SPIRE_GIMMICKS.findIndex((g) => g.id === t.id);
          if (i < 0) continue;
          s.spire.floor = i;
          setClimbing(s, true);
        }
        invalidateStats();
        const pm = stat(s, 'productionMult');
        expect(pm.gt(0), `${t.id} (${mode})`).toBe(true);
        expect(Number.isFinite(pm.log10().toNumber()), `${t.id} (${mode})`).toBe(true);
        expect(Number.isNaN(stat(s, 'stardustPerSec').mag), `${t.id} (${mode})`).toBe(false);
      }
    }
  });

  it('No Taps really stops taps, the share of Stardust a second too', () => {
    const s = player();
    s.upgrades.push('tap.strike1');
    invalidateStats();
    enterTrial(s, ['notaps']);
    expect(stat(s, 'tapPower').toNumber()).toBe(0);
    expect(stat(s, 'tapSpsShare').toNumber()).toBe(0);
  });

  it('Lonely Cosmos leaves only the first engine types working', () => {
    const s = player();
    enterTrial(s, ['lonely']);
    expect(stat(s, 'engineMult.mote').toNumber()).toBeGreaterThan(0);
    const third = stat(s, 'engineMult.moonmill').toNumber();
    expect(third).toBeGreaterThan(0);
    expect(stat(s, 'engineMult.drill').toNumber()).toBe(0);
  });

  it('the goal grows x100 a level; finishing earns the level and a permanent reward', () => {
    const s = player();
    enterTrial(s, ['dim']);
    expect(trialGoal(s).toNumber()).toBe(1e200);
    expect(goalMet(s)).toBe(false);
    expect(completeTrial(s)).toBeNull();
    meetGoal(s);
    expect(goalMet(s)).toBe(true);
    expect(completeTrial(s)).toBe('Dimmed Star level 1');
    expect(s.trials.levels.dim).toBe(1);
    expect(s.trials.active).toEqual([]);
    expect(breakdown(s, 'productionMult').find((x) => x.label === 'Trial: Dimmed Star')?.value).toBeDefined();
    enterTrial(s, ['dim']);
    expect(trialGoal(s).toNumber()).toBe(1e300);
    exitTrial(s);
    // maxed Trials can't be entered again
    s.trials.levels.dim = 5;
    expect(enterTrial(s, ['dim'])).toBe(false);
  });

  it('a Supernova during a Trial finishes it if the goal was met, and otherwise ends it', () => {
    const s = player();
    enterTrial(s, ['heavy']);
    meetGoal(s);
    expect(performReset(s, 'supernova')).not.toBeNull();
    expect(s.trials.levels.heavy).toBe(1);
    expect(s.trials.active).toEqual([]);
    enterTrial(s, ['heavy']);
    s.tier = BALANCE.supernova.tier;
    gain(s, 'stardust', D(1e220)); // ready for a Supernova, short of level 2's 1e300 goal
    invalidateStats();
    expect(goalMet(s)).toBe(false);
    expect(performReset(s, 'supernova')).not.toBeNull();
    expect(s.trials.levels.heavy).toBe(1);
    expect(s.trials.active).toEqual([]);
  });

  it('auto-Supernova waits for an unfinished Trial, then finishes it', () => {
    const s = player();
    s.stats.nebulas = 10;
    s.stats.nebulasBest = 10;
    s.nebula.autoAt = D(1);
    enterTrial(s, ['drought']);
    s.tier = BALANCE.supernova.tier;
    gain(s, 'stardust', D(1e150)); // a Supernova is ready, the e200 goal is not met
    invalidateStats();
    tick(s, 0.1);
    expect(s.trials.active).toEqual(['drought']);
    meetGoal(s);
    tick(s, 0.1);
    expect(s.trials.active).toEqual([]);
    expect(s.trials.levels.drought).toBe(1);
  });

  it('no Trial is required: nothing in the game gates on Trial levels', () => {
    for (const x of SYSTEMS) expect(['trialsDone', 'trialLevels']).not.toContain((x.req as { stat?: string }).stat);
  });

  it('Fast Nova ranks by run time, D under 5 min to Q under 5 s', () => {
    expect(fastRankFor(301)).toBe(-1);
    expect(FAST_RANKS[fastRankFor(299)]!.name).toBe('D');
    expect(FAST_RANKS[fastRankFor(59)]!.name).toBe('AA');
    expect(FAST_RANKS[fastRankFor(4)]!.name).toBe('Q');
    const s = player();
    enterTrial(s, ['fast']);
    expect(trialGoal(s).toNumber()).toBe(1e300);
    s.playtime += 100;
    meetGoal(s);
    completeTrial(s);
    expect(FAST_RANKS[s.trials.fastBest]!.name).toBe('A');
    const shard = breakdown(s, 'shardGain').find((x) => x.label === 'Fast Nova (best rank)');
    expect(shard?.value).toBeDefined();
    // a slower run never lowers the best
    enterTrial(s, ['fast']);
    s.playtime += 250;
    meetGoal(s);
    completeTrial(s);
    expect(FAST_RANKS[s.trials.fastBest]!.name).toBe('A');
  });

  it('Fusion runs 2 to 4 Trials; score = product of factors x (1 + log10(1 + 100/(t+1)^0.75))', () => {
    const s = player();
    expect(enterTrial(s, ['dim', 'fast'])).toBe(false);
    expect(enterTrial(s, ['dim', 'dim'])).toBe(false);
    expect(enterTrial(s, ['dim', 'silent', 'notaps', 'fog', 'cold'])).toBe(false);
    expect(enterTrial(s, ['lonely', 'hardcore'])).toBe(true);
    expect(trialGoal(s).toNumber()).toBe(1e200);
    const t = 50;
    expect(fusionScore(s, t)).toBeCloseTo(2.5 * 2.5 * (1 + Math.log10(1 + 100 / (t + 1) ** 0.75)), 9);
    s.playtime += t;
    meetGoal(s);
    completeTrial(s);
    expect(s.trials.fusionBest).toBeGreaterThan(6.25);
    // a Fusion earns no Trial levels
    expect(s.trials.levels.lonely ?? 0).toBe(0);
    expect(breakdown(s, 'essenceGain').some((x) => x.label === 'Trial Fusion (best score)')).toBe(true);
  });

  it('auto-finish works only from 10 Trial levels and only when switched on', () => {
    const s = player();
    s.trials.auto = true;
    enterTrial(s, ['drought']);
    meetGoal(s);
    tick(s, 0.1);
    expect(s.trials.active).toEqual(['drought']);
    exitTrial(s);
    s.trials.levels = { dim: 5, silent: 5 };
    enterTrial(s, ['drought']);
    meetGoal(s);
    tick(s, 0.1);
    expect(s.trials.active).toEqual([]);
    expect(s.trials.levels.drought).toBe(1);
  });
});

describe('the Spire', () => {
  it('floor HP is a formula: 10 x 1.15^f', () => {
    for (const f of [0, 1, 10, 100, 1000]) expect(floorHp(f).div(D(10).mul(D(1.15).pow(f))).toNumber()).toBeCloseTo(1, 9);
    expect(floorHp(5000).gt('1e300')).toBe(true);
  });

  it('clears floors in closed form and keeps the rest of the damage', () => {
    const s = player();
    // floors 0..9 cost 10 x (1.15^10 - 1) / 0.15
    const ten = 10 * (1.15 ** 10 - 1) / 0.15;
    expect(damageSpire(s, D(ten + 1))).toBe(10);
    expect(s.spire.floor).toBe(10);
    expect(s.spire.damage.toNumber()).toBeCloseTo(1, 6);
    expect(s.stats.spireBest).toBe(10);
    // a huge pile is one calculation
    const big = player();
    const n = damageSpire(big, D('1e60'));
    expect(n).toBeGreaterThan(900);
    expect(big.spire.damage.lt(floorHp(big.spire.floor))).toBe(true);
  });

  it('each floor plays one Trial debuff while climbing, and stopping removes it', () => {
    const s = player(3);
    const before = stat(s, 'productionMult');
    expect(gimmickOf(0).id).toBe(SPIRE_GIMMICKS[0]!.id);
    expect(gimmickOf(SPIRE_GIMMICKS.length).id).toBe(SPIRE_GIMMICKS[0]!.id);
    // a Low Gravity floor: Stardust x0.01 while you climb it
    s.spire.floor = SPIRE_GIMMICKS.findIndex((t) => t.id === 'lowgrav');
    invalidateStats();
    const atFloor = stat(s, 'productionMult');
    setClimbing(s, true);
    expect(stat(s, 'productionMult').div(atFloor).toNumber()).toBeCloseTo(0.01, 9);
    expect(breakdown(s, 'productionMult').some((x) => x.label === 'Spire floor: Low Gravity')).toBe(true);
    setClimbing(s, false);
    expect(stat(s, 'productionMult').eq(atFloor)).toBe(true);
    expect(atFloor.gte(before)).toBe(true);
  });

  it('deals (1 + log10(1 + SPS)) x Spire power a second, offline too, and pays per floor', () => {
    const s = player(3);
    setClimbing(s, true);
    const dps = spireDps(s);
    expect(dps.toNumber()).toBeCloseTo(1 + Math.log10(1 + stat(s, 'stardustPerSec').toNumber()), 6);
    simulateElapsed(s, 3600, { cap: Infinity, efficiency: 1, offline: true });
    expect(s.spire.floor).toBeGreaterThan(5);
    const per = BALANCE.spire.perFloor.productionMult!;
    const src = breakdown(s, 'productionMult').find((x) => x.label === 'Spire floors');
    expect(src).toBeDefined();
    expect(D(src!.value).toNumber()).toBeCloseTo(per ** s.spire.floor, 6);
  });

  it('banners unlock every 10 floors and only unlocked ones fly', () => {
    const s = player(3);
    expect(flyBanner(s, 'ember')).toBe(false);
    damageSpire(s, D('1e5'));
    expect(s.spire.floor).toBeGreaterThanOrEqual(10);
    expect(flyBanner(s, 'ember')).toBe(true);
    expect(s.spire.banner).toBe('ember');
    expect(flyBanner(s, 'crown')).toBe(false);
  });

  it('climbing pauses during a Trial', () => {
    const s = player(3);
    setClimbing(s, true);
    enterTrial(s, ['dim']);
    tick(s, 100);
    expect(s.spire.damage.toNumber()).toBe(0);
    expect(breakdown(s, 'productionMult').some((x) => x.label.startsWith('Spire floor:'))).toBe(false);
  });
});

describe('the Void Leviathans', () => {
  it('HP is 1,000 x 6^k, x2.5 for each kill', () => {
    const s = player();
    expect(leviathanHp(s, 0).toNumber()).toBe(1000);
    expect(leviathanHp(s, 3).toNumber() / (1000 * 6 ** 3)).toBeCloseTo(1, 9);
    s.leviathans.kills.calf = 2;
    expect(leviathanHp(s, 0).toNumber()).toBeCloseTo(1000 * 2.5 ** 2, 6);
  });

  it('a kill pays scales, opens the next one and moves the hunt on', () => {
    const s = player();
    expect(leviathansUnlocked(s)).toBe(1);
    expect(chooseLeviathan(s, 1)).toBe(false);
    expect(damageLeviathan(s, D(999))).toBe(0);
    expect(damageLeviathan(s, D(1))).toBe(1);
    expect(killsOf(s, 0)).toBe(1);
    expect(cur(s, 'scales').toNumber()).toBe(scalesFor(s, 0).toNumber());
    expect(s.leviathans.current).toBe(1);
    expect(leviathansUnlocked(s)).toBe(2);
    expect(s.stats.leviathansBeaten).toBe(1);
    // farming the first one again: kills counted in closed form
    expect(chooseLeviathan(s, 0)).toBe(true);
    const pool = 2500 + 6250 + 15625 + 1;
    expect(damageLeviathan(s, D(pool))).toBe(3);
    expect(killsOf(s, 0)).toBe(4);
  });

  it('damage comes from output, Wyrms and taps while hunting', () => {
    const s = player();
    const out = (1 + Math.log10(1 + stat(s, 'stardustPerSec').toNumber())) ** 2;
    expect(leviathanDps(s).toNumber()).toBeCloseTo(out, 6);
    s.wyrms.team = ['a|b|c', 'd|e|f'];
    expect(leviathanDps(s).toNumber()).toBeCloseTo(out + 50, 6);
    s.wyrms.team = [];
    // taps hit only while hunting
    const rt = { recent: [] as number[], combo: 0, lastTapMs: 0 } as Parameters<typeof tapStar>[1];
    tapStar(s, rt, 1000);
    expect(s.leviathans.damage.toNumber()).toBe(0);
    setFighting(s, true);
    tapStar(s, rt, 2000);
    expect(s.leviathans.damage.toNumber()).toBeGreaterThan(0);
    // and output over time, offline too
    simulateElapsed(s, 600, { cap: Infinity, efficiency: 1, offline: true });
    expect(killsOf(s, 0)).toBeGreaterThan(0);
  });

  it('the Scale Tree uses the one tree engine and is bought with scales', () => {
    const s = player();
    const root = SCALE_TREE.find((n) => n.id === 'scale.root')!;
    expect(scaleTree.canBuy(s, root)).toBe(false);
    gain(s, 'scales', D(root.cost));
    expect(scaleTree.buy(s, 'scale.root')).toBe(true);
    expect(stat(s, 'leviathanDamage').toNumber()).toBe(2);
    expect(breakdown(s, 'leviathanDamage').some((x) => x.label === 'First Scale (Scale Tree)')).toBe(true);
    const crown = SCALE_TREE.find((n) => n.id === 'scale.13')!;
    expect(crown.needsAll).toBe(true);
    expect(LEVIATHANS).toHaveLength(12);
  });
});

describe('the Ascent map', () => {
  it('shows every system on the rails', () => {
    for (const x of SYSTEMS.filter((y) => y.rail === 'right' || ['belt', 'level', 'constants', 'quests', 'orbitals', 'mastery', 'ascent'].includes(y.id))) expect(ASCENT_IDS).toContain(x.id);
  });
});

describe('save version 14', () => {
  it('loads a real version 13 save', () => {
    const { state } = importSave(readFileSync('tests/fixtures/save-v13.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.stats.singularitiesAll).toBe(4);
    expect(state.singularity).toMatchObject({ key: true });
    expect(state.reactor.charge.toNumber()).toBe(77);
    expect(state.trials).toMatchObject({ levels: {}, active: [], fastBest: -1, fusionBest: 0, auto: false });
    expect(state.spire.floor).toBe(0);
    expect(state.leviathans).toMatchObject({ kills: {}, current: 0, fighting: false });
    expect(state.scaleTree).toEqual({});
  });

  it('round-trips Trials, the Spire and the Leviathans', () => {
    const s = player();
    s.trials = { levels: { dim: 2 }, active: ['fog'], start: 12, fastBest: 3, fusionBest: 7.5, auto: true };
    s.spire = { floor: 42, damage: D(123), climbing: true, banner: 'ember' };
    s.leviathans = { kills: { calf: 3 }, current: 1, damage: D('1e5'), fighting: true };
    s.scaleTree = { 'scale.root': 1 };
    const c = clone(s);
    expect(c.trials).toEqual(s.trials);
    expect(c.spire.floor).toBe(42);
    expect(c.spire.damage.toNumber()).toBe(123);
    expect(c.spire.banner).toBe('ember');
    expect(c.leviathans.kills).toEqual({ calf: 3 });
    expect(c.leviathans.damage.toNumber()).toBe(1e5);
    expect(c.scaleTree).toEqual({ 'scale.root': 1 });
  });
});
