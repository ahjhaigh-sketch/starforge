import { BALANCE } from '../content/balance';
import { CREDITS, MULTIVERSE_ARMS, STORY, UNIVERSE_RULES } from '../content/multiverse';
import { layer, milestoneReached, resetsDone } from '../engine/layers';
import { cur } from '../engine/state';
import { crunchesThisUniverse, keeps, maxRules, multiverseGain, multiverseReady, multiverseSeen, ruleReward, sparkFlag, BARRIER_KEEPS } from '../engine/systems/multiverse';
import { formatFifths } from '../ui/format';
import { game } from './game';

/** Read-outs for the Multiverse, the Universe Forge and the ending. */
const n = () => game.state.settings.notation;
const M = BALANCE.multiverse;
const pct = (share: number) => `+${Math.round(share * 100)}%`;
const ruleNames = (ids: readonly string[]) => ids.map((id) => UNIVERSE_RULES.find((r) => r.id === id)?.name ?? id);

export interface MultiverseReport {
  seen: boolean;
  sparks: string;
  ready: boolean;
  gain: string;
  crunches: number;
  need: number;
  /** This universe's rules and the extra Sparks they pay. */
  rules: string[];
  reward: string;
  done: number;
  omniOpen: boolean;
  /** Which layers the Multiverse no longer resets (Unbound choices). */
  unbound: Array<{ name: string; color: string; kept: boolean }>;
  autoCrunch: boolean;
  storySeen: boolean;
  milestones: Array<{ at: number; text: string; reached: boolean }>;
}

export function multiverseReport(): MultiverseReport {
  const s = game.state;
  const def = layer('multiverse')!;
  return {
    seen: multiverseSeen(s),
    sparks: formatFifths(cur(s, 'sparks'), n()),
    ready: multiverseReady(s),
    gain: formatFifths(multiverseGain(s), n()),
    crunches: crunchesThisUniverse(s),
    need: M.crunches,
    rules: ruleNames(s.multiverse.rules),
    reward: pct(ruleReward(s)),
    done: resetsDone(s, def),
    omniOpen: milestoneReached(s, 'multiverse', 'omni'),
    unbound: MULTIVERSE_ARMS.map((a) => ({ name: a.name, color: a.color, kept: BARRIER_KEEPS.has(a.key) || keeps(s, a.key) })),
    autoCrunch: sparkFlag(s, 'autoCrunch'),
    storySeen: s.multiverse.storySeen,
    milestones: def.milestones.map((m) => ({ at: m.at, text: m.text, reached: milestoneReached(s, 'multiverse', m.id) })),
  };
}

export interface RuleCard {
  id: string;
  name: string;
  desc: string;
  reward: string;
  /** Picked for the next universe. */
  next: boolean;
  /** In force in this universe. */
  now: boolean;
  /** Can be picked (a slot is free) or unpicked. */
  can: boolean;
}

export function forgeReport(): { open: boolean; max: number; picked: number; now: string[]; nowReward: string; nextReward: string; cards: RuleCard[] } {
  const s = game.state;
  const open = multiverseSeen(s);
  const max = maxRules(s);
  const next = s.multiverse.next;
  const nextShare = next.reduce((a, id) => a + (UNIVERSE_RULES.find((r) => r.id === id)?.reward ?? 0), 0);
  return {
    open,
    max,
    picked: next.length,
    now: ruleNames(s.multiverse.rules),
    nowReward: pct(ruleReward(s)),
    nextReward: pct(nextShare),
    cards: UNIVERSE_RULES.map((r) => {
      const on = next.includes(r.id);
      return { id: r.id, name: r.name, desc: r.desc, reward: pct(r.reward), next: on, now: s.multiverse.rules.includes(r.id), can: open && (on || next.length < max) };
    }),
  };
}

export const storyText = (): readonly string[] => STORY;
export const creditsText = () => CREDITS;
