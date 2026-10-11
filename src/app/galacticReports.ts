import { BALANCE } from '../content/balance';
import { GALAXIES, starColor } from '../content/galactic';
import { layer, milestoneReached, resetsDone } from '../engine/layers';
import { cur } from '../engine/state';
import { stat } from '../engine/stats';
import { galacticGain, galacticReady, galacticReqs, galaxyAvailable, galaxyCleared, galaxyMapOpen, galaxyOf, goalProgress, nextCoreAt } from '../engine/systems/galactic';
import { constellationScore, currentScore, linkScore, loopsOf, maxLinks, observatoryOpen, skyOf } from '../engine/systems/observatory';
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
  stages: number;
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
    stages: r.stages,
    key: r.key,
    dm: format(r.dm, n()),
    dmNeed: format(G.runDarkMatter, n()),
    dmMet: r.dm.gte(G.runDarkMatter),
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

export function galaxyMapReport(): { open: boolean; started: boolean; cleared: number; cards: GalaxyCard[] } {
  const s = game.state;
  const here = galaxyOf(s).id;
  const started = (s.stats.galacticsAll ?? 0) > 0;
  return {
    open: galaxyMapOpen(s),
    started,
    cleared: s.galactic.cleared.length,
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
    pays: Math.max(0, Math.floor(score) - Math.floor(s.observatory.best)),
  };
}

/** For tests and tooltips: a shape's score without drawing it. */
export const scoreOf = (links: Array<[number, number]>) => constellationScore(skyOf(game.state), links);
