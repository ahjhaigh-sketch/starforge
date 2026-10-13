import { galaxiesNeeded } from '../engine/systems/crunch';
import { BALANCE } from '../content/balance';
import { GALAXIES, starColor } from '../content/galactic';
import { layer, milestoneReached, resetsDone } from '../engine/layers';
import { cur } from '../engine/state';
import { stat } from '../engine/stats';
import { darkMatterNeeded, galacticGain, galacticReady, galacticReqs, galaxyAvailable, galaxyCleared, galaxyMapOpen, galaxyOf, goalProgress, nextCoreAt } from '../engine/systems/galactic';
import { autoChartLinks, bestNextLink, constellationScore, currentScore, linkScore, loopsOf, maxLinks, observatoryOpen, skyOf, chartBonus } from '../engine/systems/observatory';
import { format, formatMult } from '../ui/format';
import { game } from './game';

/** Read-outs for Galactic Rebirth, the Galaxy Map and the Observatory. */
const n = () => game.state.settings.notation;
const G = BALANCE.galactic;

export interface GalacticReport {
  cores: string;
  ready: boolean;
  gain: string;
  next: string;
  depth: number;
  depthNeed: number;
  key: boolean;
  dm: string;
  dmNeed: string;
  dmMet: boolean;
  done: number;
  galaxy: string;
  nextGalaxy: string;
  autoUnlocked: boolean;
  autoAt: number;
  passive: string;
  milestones: Array<{ at: number; text: string; reached: boolean }>;
}

export function galacticReport(): GalacticReport {
  const s = game.state;
  const def = layer('galactic')!;
  const r = galacticReqs(s);
  return {
    cores: format(cur(s, 'galaxyCores'), n()),
    ready: galacticReady(s),
    gain: format(galacticGain(s), n()),
    next: format(nextCoreAt(s), n()),
    depth: r.depth,
    depthNeed: G.mirrorDepth,
    key: r.key,
    dm: format(r.dm, n()),
    dmNeed: format(darkMatterNeeded(s), n()),
    dmMet: r.dm.gte(darkMatterNeeded(s)),
    done: resetsDone(s, def),
    galaxy: galaxyOf(s).name,
    nextGalaxy: GALAXIES.find((g) => g.id === s.galactic.next)?.name ?? '',
    autoUnlocked: milestoneReached(s, 'galactic', 'autoSingularity'),
    autoAt: s.galactic.autoAt.toNumber(),
    passive: formatMult((s.totals.all.galaxyCores ?? cur(s, 'galaxyCores')).add(1).pow(G.passivePow), n()),
    milestones: def.milestones.map((m) => ({ at: m.at, text: m.text, reached: milestoneReached(s, 'galactic', m.id) })),
  };
}

export interface GalaxyCard {
  id: string;
  name: string;
  color: string;
  rule: string;
  goal: string;
  reward: string;
  cleared: boolean;
  current: boolean;
  next: boolean;
  available: boolean;
  /** Goal progress while you're there, 0 to 100 (log scale for big amounts). */
  pct: number;
  progress: string;
}

/** 1.4.0: the strip at the top of the map: where you are, how far its goal is, and where the next rebirth goes. */
export interface GalaxyStatus {
  here: string;
  hereColor: string;
  goal: string;
  pct: number;
  progress: string;
  explored: boolean;
  next: string;
  explore: boolean;
  /** For the Big Crunch: galaxies explored this Crunch run, of how many. */
  crunch: string;
}

export function galaxyMapReport(): { open: boolean; started: boolean; cleared: number; status: GalaxyStatus; cards: GalaxyCard[] } {
  const s = game.state;
  const here = galaxyOf(s).id;
  const started = (s.stats.galacticsAll ?? 0) > 0;
  const g0 = galaxyOf(s);
  const p0 = goalProgress(s, g0.goal);
  const big0 = p0.target.gt(1000);
  const nextG = GALAXIES.find((g) => g.id === s.galactic.next);
  return {
    open: galaxyMapOpen(s),
    started,
    cleared: s.galactic.cleared.length,
    status: {
      here: started ? g0.name : 'Not in a galaxy yet',
      hereColor: g0.color,
      goal: g0.goalText,
      pct: started ? Math.floor(Math.min(1, big0 ? p0.now.add(1).log10().toNumber() / p0.target.log10().toNumber() : p0.now.div(p0.target).toNumber()) * 100) : 0,
      progress: `${format(p0.now, n())} / ${format(p0.target, n())}`,
      explored: galaxyCleared(s, g0.id),
      next: nextG?.name ?? '',
      explore: s.galactic.explore,
      crunch: `${s.galactic.cleared.length} / ${galaxiesNeeded(s)}`,
    },
    cards: GALAXIES.map((g) => {
      const current = started && g.id === here;
      const { now, target } = goalProgress(s, g.goal);
      const big = target.gt(1000);
      const pct = current ? Math.floor(Math.min(1, big ? now.add(1).log10().toNumber() / target.log10().toNumber() : now.div(target).toNumber()) * 100) : 0;
      return {
        id: g.id,
        name: g.name,
        color: g.color,
        rule: g.rule,
        goal: g.goalText,
        reward: g.rewardText,
        cleared: galaxyCleared(s, g.id),
        current,
        next: s.galactic.next === g.id,
        available: galaxyAvailable(s, g.id),
        pct,
        progress: current ? `${format(now, n())} / ${format(target, n())}` : '',
      };
    }),
  };
}

export interface ObservatoryReport {
  open: boolean;
  stars: Array<{ i: number; x: number; y: number; r: number; color: string; mass: string; temp: string; dist: string }>;
  links: Array<{ a: number; b: number; score: string }>;
  score: string;
  best: string;
  loops: number;
  used: number;
  max: number;
  charts: string;
  /** Star Charts a record would pay now. */
  pays: number;
  /** 1.4.0: skies recorded ever, and the Star Chart bonus they give (percent). */
  skies: number;
  bonus: number;
  /** 1.3.0: the best link to draw next (the Hint), and what Auto-draw would score. */
  hint: { a: number; b: number; gain: string } | null;
  autoScore: string;
}

export function observatoryReport(): ObservatoryReport {
  const s = game.state;
  const sky = skyOf(s);
  const score = currentScore(s);
  return {
    open: observatoryOpen(s),
    stars: sky.map((st, i) => ({ i, x: st.x, y: st.y, r: 4 + Math.sqrt(st.mass) * 3, color: starColor(st.temp), mass: st.mass.toFixed(2), temp: `${st.temp.toLocaleString('en-GB')} K`, dist: `${st.dist} ly` })),
    links: s.observatory.links.map(([a, b]) => ({ a, b, score: linkScore(sky[a]!, sky[b]!).toFixed(1) })),
    score: score.toFixed(1),
    best: s.observatory.best.toFixed(1),
    loops: loopsOf(s.observatory.links),
    used: s.observatory.links.length,
    max: maxLinks(s),
    charts: format(cur(s, 'starCharts'), n()),
    pays: Math.floor(Math.max(0, Math.floor(score) - Math.floor(s.observatory.best)) * chartBonus(s)),
    skies: s.stats.skiesCharted ?? 0,
    bonus: Math.round((chartBonus(s) - 1) * 100),
    hint: (() => {
      const h = bestNextLink(s);
      return h ? { a: h.a, b: h.b, gain: h.gain.toFixed(1) } : null;
    })(),
    autoScore: autoScoreOf(s.observatory.seed, maxLinks(s)),
  };
}

/** Auto-draw's score for a sky, worked out once per sky and link count. */
let autoCache: { key: string; score: string } | null = null;
function autoScoreOf(seed: number, links: number): string {
  const key = `${seed}:${links}`;
  if (autoCache?.key !== key) autoCache = { key, score: constellationScore(skyOf(game.state), autoChartLinks(game.state)).toFixed(1) };
  return autoCache.score;
}

/** For tests and tooltips: a shape's score without drawing it. */
export const scoreOf = (links: Array<[number, number]>) => constellationScore(skyOf(game.state), links);
