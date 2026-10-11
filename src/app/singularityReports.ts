import { BALANCE } from '../content/balance';
import { cur } from '../engine/state';
import { layer, milestoneReached, resetsDone } from '../engine/layers';
import { stat } from '../engine/stats';
import { BH_STAGES, bhOpen, bhStage, dustMassRate, feedPlan, reactorMult, reactorOpen, reactorPower, reactorPlan, WHEEL, wheelBank, wheelOpen } from '../engine/systems/blackhole';
import { keyOnSale, nextDarkMatterAt, runEssence, singularityGain, singularityReady } from '../engine/systems/singularity';
import { gameSpeed } from '../engine/tick';
import { format, formatMult } from '../ui/format';
import { game } from './game';

/** Read-outs for the Singularity, the Black Hole, the Prism Wheel and the Reactor. */
const n = () => game.state.settings.notation;
const SG = BALANCE.singularity;
const BH = BALANCE.blackHole;

export interface SingularityReport {
  darkMatter: string;
  gain: string;
  ready: boolean;
  onSale: boolean;
  hasKey: boolean;
  keyCost: string;
  embers: string;
  canKey: boolean;
  essence: string;
  essenceNeed: string;
  next: string;
  done: number;
  autoUnlocked: boolean;
  autoAt: number;
  milestones: Array<{ at: number; text: string; reached: boolean }>;
}

export function singularityReport(): SingularityReport {
  const s = game.state;
  const def = layer('singularity')!;
  return {
    darkMatter: format(cur(s, 'darkMatter'), n()),
    gain: format(singularityGain(s), n()),
    ready: singularityReady(s),
    onSale: keyOnSale(s),
    hasKey: s.singularity.key,
    keyCost: format(SG.keyEmbers, n()),
    embers: format(cur(s, 'embers'), n()),
    canKey: !s.singularity.key && keyOnSale(s) && cur(s, 'embers').gte(SG.keyEmbers),
    essence: format(runEssence(s), n()),
    essenceNeed: format(SG.runEssence, n()),
    next: format(nextDarkMatterAt(s), n()),
    done: resetsDone(s, def),
    autoUnlocked: milestoneReached(s, 'singularity', 'autoNebula'),
    autoAt: s.singularity.autoAt.toNumber(),
    milestones: def.milestones.map((m) => ({ at: m.at, text: m.text, reached: (s.stats.singularities ?? 0) >= m.at })),
  };
}

export interface BlackHoleReport {
  open: boolean;
  mass: string;
  stage: number;
  stages: Array<{ id: string; name: string; color: string; perk: string; at: string; reached: boolean }>;
  next: string;
  share: number;
  speed: string;
  rate: string;
  dustShare: number;
  maxShare: number;
  feedCount: string;
  feedCost: string;
  canFeed: boolean;
}

export function blackHoleReport(): BlackHoleReport {
  const s = game.state;
  const k = bhStage(s);
  const plan = feedPlan(s);
  const nextAt = BH.stageBase ** k;
  return {
    open: bhOpen(s),
    mass: format(s.blackHole.mass, n()),
    stage: k,
    stages: BH_STAGES.map((st, i) => ({ id: st.id, name: st.name, color: st.color, perk: st.perk, at: format(BH.stageBase ** i, n()), reached: k > i })),
    next: k >= BH_STAGES.length ? 'Every stage reached' : `${BH_STAGES[k]!.name} at ${format(nextAt, n())} mass`,
    // progress through the current stage on a log scale (each stage is ten times the last)
    share: k >= BH_STAGES.length ? 1 : k === 0 ? Math.min(1, s.blackHole.mass.toNumber()) : Math.max(0, Math.min(1, s.blackHole.mass.log10().toNumber() - (k - 1))),
    speed: `x${gameSpeed(s).toFixed(2)}`,
    rate: format(dustMassRate(s), n()),
    dustShare: s.blackHole.dustShare,
    maxShare: BH.maxDustShare,
    feedCount: format(plan.count, n()),
    feedCost: format(plan.cost, n()),
    canFeed: plan.canAfford,
  };
}

export interface WheelReport {
  open: boolean;
  on: boolean;
  limit: number;
  wedges: Array<{ id: string; name: string; color: string; share: number; bank: string; mult: string }>;
}

export function wheelReport(): WheelReport {
  const s = game.state;
  return {
    open: wheelOpen(s),
    on: s.wheel.on,
    limit: BH.wheelLimit,
    wedges: WHEEL.map((w, i) => ({ id: w.id, name: w.name, color: w.color, share: s.wheel.shares[i] ?? 0, bank: format(wheelBank(s, w.id), n()), mult: formatMult(wheelBank(s, w.id).add(1).pow(BH.wheelPow), n()) })),
  };
}

export interface ReactorReport {
  open: boolean;
  charge: string;
  mult: string;
  power: string;
  darkMatter: string;
  count: string;
  cost: string;
  can: boolean;
}

export function reactorReport(): ReactorReport {
  const s = game.state;
  const plan = reactorPlan(s);
  return {
    open: reactorOpen(s),
    charge: format(s.reactor.charge, n()),
    mult: formatMult(reactorMult(s), n()),
    power: `${formatMult(reactorPower(s), n())}${stat(s, 'reactorPower').toNumber() > BALANCE.blackHole.reactorPowerCap ? ' (the most that counts)' : ''}`,
    darkMatter: format(cur(s, 'darkMatter'), n()),
    count: format(plan.count, n()),
    cost: format(plan.cost, n()),
    can: plan.canAfford,
  };
}
