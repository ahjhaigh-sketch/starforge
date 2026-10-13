import { BALANCE } from '../../content/balance';
import { AURA_BY_ID, AURAS, auraFamily, type AuraDef } from '../../content/runeDepth';
import { planFlat, type FlatPlan } from '../buy';
import { D, type Decimal, ONE, ZERO } from '../decimal';
import { events } from '../events';
import { drawHits, effLog10 } from '../odds';
import { cur, gain, type GameState, spend, usable } from '../state';
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

export const dicePlan = (s: GameState): FlatPlan => planFlat(ONE, usable(s, 'auraDice').floor(), s.settings.buyAmount, s.settings.customBuyAmount);

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

// ---------- 1.3.0: more slots, Polish ranks and families ----------

/** Aura slots: one, then more at 10 and 20 auras found. */
export function auraSlots(s: GameState): number {
  const found = AURAS.filter((a) => auraCopies(s, a.id).gt(0)).length;
  return 1 + A.slotsAt.filter((n) => found >= n).length;
}

/** Every aura you wear, first slot first (no repeats, only ones you own, as many as you have slots). */
export function wornAuras(s: GameState): AuraDef[] {
  const ids = [s.auras.equipped, ...(s.auras.more ?? [])].filter((id, i, all): id is string => !!id && all.indexOf(id) === i);
  return ids
    .map((id) => AURA_BY_ID.get(id))
    .filter((a): a is AuraDef => !!a && auraCopies(s, a.id).gt(0))
    .slice(0, auraSlots(s));
}

export const auraRank = (s: GameState, id: string) => s.auras.ranks?.[id] ?? 0;
export const polishCost = (rank: number) => D(10).pow((rank + 1) ** 2);

/** Polishes an aura one rank: spends that many of its own copies. */
export function polishAura(s: GameState, id: string): boolean {
  const r = auraRank(s, id);
  if (!AURA_BY_ID.has(id) || r >= A.polishMax || auraCopies(s, id).lt(polishCost(r))) return false;
  s.auras.copies[id] = auraCopies(s, id).sub(polishCost(r));
  s.auras.ranks = { ...(s.auras.ranks ?? {}), [id]: r + 1 };
  return true;
}

/** How much of its boost a worn aura gives: its Polish rank and its family's bonus. */
export function auraStrength(s: GameState, id: string): number {
  const fam = auraFamily(id).id;
  const same = wornAuras(s).filter((a) => auraFamily(a.id).id === fam).length;
  const family = same >= 3 ? A.familyThree : same === 2 ? A.familyTwo : 0;
  return (1 + A.polishEach * auraRank(s, id)) * (1 + family);
}

/** What a worn aura multiplies one stat by (1 when it doesn't touch it). */
export function auraMult(s: GameState, a: AuraDef, statId: string): number {
  const e = a.effects.find((x) => x.stat === statId);
  return e ? 1 + (e.mul - 1) * auraStrength(s, a.id) : 1;
}

/** Wears an aura in a slot (0 is the first); null takes that slot's aura off. */
export function wearAura(s: GameState, id: string | null, slot: number): boolean {
  if (slot === 0) return equipAura(s, id);
  if (slot < 1 || slot >= auraSlots(s)) return false;
  if (id !== null && (!AURA_BY_ID.has(id) || auraCopies(s, id).lte(0))) return false;
  const more = [...(s.auras.more ?? [])];
  while (more.length < slot) more.push('');
  // wearing it here takes it out of any other slot
  if (id !== null && s.auras.equipped === id) s.auras.equipped = null;
  for (let i = 0; i < more.length; i++) if (id !== null && more[i] === id) more[i] = '';
  more[slot - 1] = id ?? '';
  s.auras.more = more;
  return true;
}

/** The score Best auras compares: the orders of magnitude a set of worn auras gives in all. */
function wornScore(s: GameState): number {
  let t = 0;
  for (const a of wornAuras(s)) for (const e of a.effects) t += Math.log10(auraMult(s, a, e.stat));
  return t;
}

/**
 * 1.3.0 Best auras: tries every set of owned auras for your slots (families included) and wears the strongest.
 * 1.4.0: `pool` limits the search to the strongest few on their own (automation: 20 sets, not 4,060).
 */
export function bestAuras(s: GameState, pool = Infinity): void {
  let owned = AURAS.filter((a) => auraCopies(s, a.id).gt(0)).map((a) => a.id);
  if (owned.length > pool) {
    const solo = (id: string) => {
      s.auras.equipped = id;
      s.auras.more = [];
      return wornScore(s);
    };
    const keepWorn = { equipped: s.auras.equipped, more: s.auras.more };
    owned = owned
      .map((id) => ({ id, v: solo(id) }))
      .sort((a, b) => b.v - a.v || a.id.localeCompare(b.id))
      .slice(0, pool)
      .map((x) => x.id);
    s.auras.equipped = keepWorn.equipped;
    s.auras.more = keepWorn.more;
  }
  const n = Math.min(auraSlots(s), owned.length);
  if (n === 0) return;
  let best: string[] = [];
  let top = -1;
  const tryIt = (set: string[]) => {
    s.auras.equipped = set[0] ?? null;
    s.auras.more = set.slice(1);
    const v = wornScore(s);
    if (v > top + 1e-12) {
      top = v;
      best = set;
    }
  };
  // at most 30 choose 3 = 4,060 sets
  const pick = (start: number, set: string[]) => {
    if (set.length === n) return tryIt(set);
    for (let i = start; i < owned.length; i++) pick(i + 1, [...set, owned[i]!]);
  };
  pick(0, []);
  s.auras.equipped = best[0] ?? null;
  s.auras.more = best.slice(1);
}

export function registerAuras(): void {
  defineStat({ id: 'auraLuck', label: 'Aura luck', base: () => D(1) });
  // one source per stat an aura can boost: every worn aura counts (1.3.0: up to three, polished, with families)
  const stats = new Set(AURAS.flatMap((a) => a.effects.map((e) => e.stat)));
  for (const statId of stats) {
    registerSources({
      id: `aura.${statId}`,
      stat: statId,
      op: 'mul',
      label: 'Celestial Auras',
      value: (s: GameState) => D(wornAuras(s).reduce((v, a) => v * auraMult(s, a, statId), 1)),
      active: (s: GameState) => wornAuras(s).some((a) => a.effects.some((e) => e.stat === statId)),
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
