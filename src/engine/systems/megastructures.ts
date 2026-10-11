import { BALANCE } from '../../content/balance';
import { MEGA_BY_ID, MEGASTRUCTURES, type MegastructureDef } from '../../content/galaxyBuild';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import { cur, type GameState, spend } from '../state';
import { defineStat, invalidateStats, registerSources, stat } from '../stats';

/**
 * Megastructures (Game design: "Megastructures"; Tower Incremental's Gateway). From the first
 * Galactic Rebirth, one after another as Galactic Rebirths add up.
 * - Six structures of five stages. A stage costs a bundle of currencies from every layer, each
 *   10^(base + step x stage): the whole game feeds them.
 * - Every stage's reward is permanent: no reset touches the stages built (they're not part of any
 *   layer's reset), and the reward is a stat source labelled "<name> (megastructure)".
 * - Lattice (a Galactic Constant) raises every reward to a higher power.
 * - Built stages are drawn round the star.
 */
export const megaOpen = (s: GameState, m: MegastructureDef) => (s.stats.galacticsAll ?? 0) >= m.galactics;
export const megaStage = (s: GameState, id: string) => s.megastructures[id] ?? 0;
export const STAGES = 5;

/** What the next stage costs, currency by currency (null once complete). */
export function megaCost(s: GameState, m: MegastructureDef): Array<{ currency: string; amount: Decimal }> | null {
  const k = megaStage(s, m.id);
  if (k >= STAGES) return null;
  return Object.entries(m.cost).map(([currency, [base, step]]) => ({ currency, amount: D(10).pow(base + step * k) }));
}

export function canBuildStage(s: GameState, m: MegastructureDef): boolean {
  const cost = megaCost(s, m);
  return megaOpen(s, m) && !!cost && cost.every((c) => cur(s, c.currency).gte(c.amount));
}

export function buildStage(s: GameState, id: string): boolean {
  const m = MEGA_BY_ID.get(id);
  if (!m || !canBuildStage(s, m)) return false;
  for (const c of megaCost(s, m)!) spend(s, c.currency, c.amount);
  s.megastructures[id] = megaStage(s, id) + 1;
  s.stats.megaStages = Object.values(s.megastructures).reduce((a, b) => a + b, 0);
  if (megaStage(s, id) === STAGES) s.stats.megaDone = MEGASTRUCTURES.filter((x) => megaStage(s, x.id) >= STAGES).length;
  invalidateStats();
  events.emit({ t: 'toast', title: `${m.name}: stage ${megaStage(s, id)}`, body: `${m.rewardText}, for good.`, icon: 'mega', priority: megaStage(s, id) === STAGES });
  return true;
}

/** Lattice raises every reward to a power, up to x2 (like Reactor strength: it must not compound with itself). */
export const rewardPower = (s: GameState) => Math.min(BALANCE.galaxyBuild.megaPowerCap, stat(s, 'megaRewardPower').toNumber());

/** A structure's reward with the stages built. */
export function megaReward(s: GameState, m: MegastructureDef): Decimal {
  const k = megaStage(s, m.id);
  return m.reward.op === 'add' ? D(m.reward.value * k * rewardPower(s)) : D(m.reward.value).pow(k * rewardPower(s));
}

export function registerMegastructures(): void {
  defineStat({ id: 'megaRewardPower', label: 'Megastructure rewards', base: () => D(1) });
  registerSources(
    ...MEGASTRUCTURES.map((m) => ({
      id: `mega.${m.id}`,
      stat: m.reward.stat,
      op: m.reward.op,
      label: `${m.name} (megastructure)`,
      value: (s: GameState) => megaReward(s, m),
      active: (s: GameState) => megaStage(s, m.id) > 0,
    })),
  );
}
