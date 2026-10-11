import { BALANCE } from '../../content/balance';
import { ENGINES } from '../../content/engines';
import { maxBuy } from '../cost';
import { D } from '../decimal';
import { events } from '../events';
import { milestoneReached } from '../layers';
import { cur, type GameState } from '../state';
import { defineStat, stat } from '../stats';
import { registerSystem } from '../tick';
import { automating } from './eternity';
import { buyEngine, engineCurve, engineRevealed, evolve, nextTierCost, owned } from './stardust';
import { availableUpgrades, buyUpgrade } from './upgrades';

/**
 * The Automation hub's auto-buyers. Each is earned from a Supernova milestone, has an on/off
 * switch and a spending limit, and acts in the normal tick, so it keeps working offline too.
 * Every chore becomes a reward: buy-max, auto-buy, then reset automation in later layers.
 */
export interface AutoBuyerDef {
  id: string;
  name: string;
  /** Supernova milestone that unlocks it. */
  milestone: string;
  kind: 'engine' | 'evolve' | 'upgrades';
  engine?: string;
}

const ENGINE_MILESTONE = (i: number) => (i === 0 ? 'starforge' : i <= 4 ? 'auto5' : 'autoAll');

export const AUTO_BUYERS: readonly AutoBuyerDef[] = [
  { id: 'auto.evolve', name: 'Auto-Evolve', milestone: 'autoEvolve', kind: 'evolve' },
  ...ENGINES.map((e, i): AutoBuyerDef => ({ id: `auto.${e.id}`, name: e.name, milestone: ENGINE_MILESTONE(i), kind: 'engine', engine: e.id })),
  { id: 'auto.upgrades', name: 'Upgrades', milestone: 'autoAll', kind: 'upgrades' },
];

/** Unlocked by its Supernova milestone, or by Eternal Forge (Eternity) from the start of every run. */
export const autoUnlocked = (s: GameState, a: AutoBuyerDef) => milestoneReached(s, 'supernova', a.milestone) || automating(s, 'stardust');

/** Unlocked auto-buyers start switched on, spending everything. */
export function autoSetting(s: GameState, id: string): { on: boolean; spend: number } {
  return s.auto[id] ?? { on: true, spend: 1 };
}

export function setAuto(s: GameState, id: string, change: Partial<{ on: boolean; spend: number }>): void {
  const next = { ...autoSetting(s, id), ...change };
  if (!BALANCE.automation.spendChoices.includes(next.spend as 1)) next.spend = 1;
  s.auto[id] = next;
}

/** One pass of every switched-on auto-buyer. */
export function runAutomation(s: GameState): void {
  for (const a of AUTO_BUYERS) {
    if (!autoUnlocked(s, a)) continue;
    const { on, spend } = autoSetting(s, a.id);
    if (!on) continue;
    const budget = cur(s, 'stardust').mul(spend);
    if (a.kind === 'evolve') {
      const cost = nextTierCost(s);
      if (cost && budget.gte(cost)) evolve(s);
    } else if (a.kind === 'engine' && a.engine) {
      const index = ENGINES.findIndex((e) => e.id === a.engine);
      if (!engineRevealed(s, index)) continue;
      const n = maxBuy(engineCurve(a.engine), owned(s, a.engine), budget.div(stat(s, 'engineCostMult')));
      if (n > 0) buyEngine(s, a.engine, n);
    } else if (a.kind === 'upgrades') {
      for (const u of availableUpgrades(s)) {
        if (D(u.cost).gt(cur(s, 'stardust').mul(spend))) break; // cheapest first
        buyUpgrade(s, u.id);
      }
    }
  }
}

export function registerAutomation(): void {
  defineStat({ id: 'autoSpeed', label: 'Auto-buyer speed', base: () => D(1) });
  registerSystem({
    id: 'automation',
    order: 40,
    tick: (s, dt) => {
      const hz = BALANCE.automation.perSecond * stat(s, 'autoSpeed').toNumber();
      // several passes if a long catch-up step covers more than one interval
      const passes = Math.min(20, Math.floor(s.playtime * hz) - Math.floor((s.playtime - dt) * hz));
      // automated purchases make no sound (only the player's own clicks do)
      if (passes > 0) events.automated(() => {
        for (let i = 0; i < passes; i++) runAutomation(s);
      });
    },
  });
}
