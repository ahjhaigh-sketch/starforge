import { BALANCE } from '../../content/balance';
import { AURA_BY_ID, AURAS, type AuraDef } from '../../content/runeDepth';
import { planFlat, type FlatPlan } from '../buy';
import { D, type Decimal, ONE, ZERO } from '../decimal';
import { events } from '../events';
import { drawHits, effLog10 } from '../odds';
import { cur, gain, type GameState, spend } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { registerSystem } from '../tick';

/**
 * Celestial Auras (Game design: "More mid systems", Noob Incremental's Auras). From 4 Nebulas every
 * 1,000 runes rolled at any shrine give an Aura Die. Each die rolls every aura on its own at
 * 1 in eff (Aura Luck divides the odds, as runes do), from Comet Haze (1 in 5) to Stellar Crown
 * (1 in 1.75M). One aura is equipped at a time. Dice are drawn as Poisson counts from the aura
 * stream, so rolling e30 dice is one step.
 */
const A = BALANCE.runeDepth.auras;

export const aurasOpen = (s: GameState) => (s.stats.nebulasAll ?? 0) >= BALANCE.runeDepth.opens.auras;

export const auraCopies = (s: GameState, id: string): Decimal => s.auras.copies[id] ?? ZERO;

export function auraEffLog(s: GameState, a: AuraDef): number {
  return effLog10(a.log10, Math.max(1, stat(s, 'auraLuck').toNumber()), 1);
}

/** Dice earned by rolling runes (called by the rune shrines). */
export function earnDice(s: GameState, runes: Decimal): void {
  if (!aurasOpen(s) || runes.lte(0)) return;
  gain(s, 'auraDice', runes.div(A.diceEvery));
}

export interface AuraRoll {
  dice: Decimal;
  hits: Array<{ id: string; count: Decimal }>;
  best: AuraDef | null;
}

/** Rolls `dice` whole dice (already paid for). */
export function rollAuraDice(s: GameState, dice: Decimal): AuraRoll {
  const hits: AuraRoll['hits'] = [];
  let best: AuraDef | null = null;
  for (const a of AURAS) {
    const count = drawHits(s.auras.rng, dice, -auraEffLog(s, a), BALANCE.runes.poissonBelow);
    if (count.lte(0)) continue;
    const first = auraCopies(s, a.id).lte(0);
    s.auras.copies[a.id] = auraCopies(s, a.id).add(count);
    hits.push({ id: a.id, count });
    if (!best || a.log10 > best.log10) best = a;
    if (first) s.stats.aurasFound = (s.stats.aurasFound ?? 0) + 1;
    if (first || a.log10 >= 4) events.emit({ t: 'aura', id: a.id, first });
  }
  s.stats.diceRolled = (s.stats.diceRolled ?? 0) + Math.min(1e15, dice.toNumber());
  // the first aura you find goes on at once
  if (!s.auras.equipped && best) s.auras.equipped = best.id;
  return { dice, hits, best };
}

export const dicePlan = (s: GameState): FlatPlan => planFlat(ONE, cur(s, 'auraDice').floor(), s.settings.buyAmount, s.settings.customBuyAmount);

/** Rolls dice with the buy amount (x1, x10 ... Max, typed). */
export function rollAuras(s: GameState): AuraRoll | null {
  if (!aurasOpen(s)) return null;
  const plan = dicePlan(s);
  if (!plan.canAfford || !spend(s, 'auraDice', plan.cost)) return null;
  return rollAuraDice(s, plan.count);
}

export function equipAura(s: GameState, id: string | null): boolean {
  if (id === null) {
    s.auras.equipped = null;
    return true;
  }
  if (!AURA_BY_ID.has(id) || auraCopies(s, id).lte(0)) return false;
  s.auras.equipped = id;
  return true;
}

export const equippedAura = (s: GameState): AuraDef | null => (s.auras.equipped ? (AURA_BY_ID.get(s.auras.equipped) ?? null) : null);

export function registerAuras(): void {
  defineStat({ id: 'auraLuck', label: 'Aura luck', base: () => D(1) });
  // one source per stat an aura can boost; only the equipped aura counts
  const stats = new Set(AURAS.flatMap((a) => a.effects.map((e) => e.stat)));
  for (const statId of stats) {
    registerSources({
      id: `aura.${statId}`,
      stat: statId,
      op: 'mul',
      label: 'Celestial Aura',
      value: (s: GameState) => D(equippedAura(s)?.effects.find((e) => e.stat === statId)?.mul ?? 1),
      active: (s: GameState) => !!equippedAura(s)?.effects.some((e) => e.stat === statId),
    });
  }
  registerSystem({
    id: 'auras',
    order: 41,
    // auto-roll throws every whole die as it arrives, offline too, from the aura stream
    tick: (s: GameState) => {
      if (!s.auras.auto || !aurasOpen(s)) return;
      const dice = cur(s, 'auraDice').floor();
      if (dice.lt(1)) return;
      spend(s, 'auraDice', dice);
      rollAuraDice(s, dice);
    },
  });
}
