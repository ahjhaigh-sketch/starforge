import { BALANCE } from '../../content/balance';
import { CARD_BY_ID, CARD_RARITIES, CARDS, type CardDef, type CardEffect } from '../../content/nebulaExtras';
import { planLimited, type PurchasePlan } from '../buy';
import type { CostCurve } from '../cost';
import { D, ONE, ZERO } from '../decimal';
import { events } from '../events';
import { onAnyReset } from '../layers';
import { nextFloat, nextInt } from '../rng';
import { cur, type GameState, spend, usable } from '../state';
import { registerSources } from '../stats';

/**
 * Tarot of the Void (Game design: "More mid systems", EUT's Cards). From 6 Nebulas, packs bought
 * with Essence (50 x 1.6^packs) each give one card from the lowest rarity you haven't finished,
 * never a duplicate. Up to 5 cards sit in a deck (6 at 30 cards owned, 7 at 50), and where they sit
 * matters. Resolution, left to right, is exactly what the cards say:
 * 1. A Mirror acts as the card on its left (a copy of a copy follows the chain; leftmost or next
 *    to an empty slot, it copies nothing).
 * 2. Disabling goes left to right: an active Mirror disables the slot on its right; an active card
 *    acting as The Tower disables both neighbours. A disabled card does nothing, including disabling.
 * 3. Each active card's boosts are worked out where it sits (Magician, Chariot, Hermit, Fool, Gambler).
 * 4. Each active card acting as The Lovers makes its active neighbours count twice (squared).
 */
const T = BALANCE.tarot;

export const tarotOpen = (s: GameState) => (s.stats.nebulasAll ?? 0) >= T.nebulas;

export function deckSlots(s: GameState): number {
  return T.slots + T.slotCards.filter((n) => s.tarot.owned.length >= n).length;
}

/** The rarity packs draw from now: the lowest with cards you don't own (null when you own them all). */
export function packRarity(s: GameState): number | null {
  for (let r = 0; r < CARD_RARITIES.length; r++) if (CARDS.some((c) => c.rarity === r && !s.tarot.owned.includes(c.id))) return r;
  return null;
}

const packCurve: CostCurve = { base: T.packBase, brackets: [{ from: 0, ratio: T.packGrowth }] };

export function packPlan(s: GameState): PurchasePlan {
  return planLimited(packCurve, s.tarot.packs, usable(s, 'essence'), s.settings.buyAmount, s.settings.customBuyAmount, s.tarot.packs + (CARDS.length - s.tarot.owned.length));
}

/** Opens packs with the buy amount. Returns the cards drawn, in order. */
export function openPacks(s: GameState): CardDef[] {
  if (!tarotOpen(s)) return [];
  const plan = packPlan(s);
  if (!plan.canAfford || plan.count < 1 || !spend(s, 'essence', plan.cost)) return [];
  const drawn: CardDef[] = [];
  for (let k = 0; k < plan.count; k++) {
    const r = packRarity(s);
    if (r === null) break;
    const pool = CARDS.filter((c) => c.rarity === r && !s.tarot.owned.includes(c.id));
    const c = pool[nextInt(s.tarot.rng, 0, pool.length - 1)]!;
    s.tarot.owned.push(c.id);
    s.tarot.packs++;
    drawn.push(c);
  }
  s.stats.cardsDrawn = s.tarot.owned.length;
  for (const c of drawn) events.emit({ t: 'card', id: c.id });
  return drawn;
}

function rollGamble(s: GameState): void {
  s.tarot.gamble = nextFloat(s.tarot.rng) < T.gambleChance ? T.gambleWin : T.gambleLose;
}

/** Puts an owned card in a slot (moving it if it's already in the deck). */
export function placeCard(s: GameState, id: string, slot: number): boolean {
  if (!tarotOpen(s) || !s.tarot.owned.includes(id) || slot < 0 || slot >= deckSlots(s)) return false;
  while (s.tarot.deck.length < deckSlots(s)) s.tarot.deck.push(null);
  const was = s.tarot.deck.indexOf(id);
  if (was >= 0) s.tarot.deck[was] = null;
  s.tarot.deck[slot] = id;
  // the Gambler's first roll happens when it's first dealt in; after that, once each Nebula
  if (CARD_BY_ID.get(id)?.rule === 'gambler' && s.tarot.gamble === 1) rollGamble(s);
  return true;
}

export function removeCard(s: GameState, slot: number): void {
  if (slot >= 0 && slot < s.tarot.deck.length) s.tarot.deck[slot] = null;
}

export interface SlotView {
  /** The card printed in this slot. */
  card: CardDef | null;
  /** What it acts as (a Mirror acts as the card on its left). */
  acts: CardDef | null;
  active: boolean;
  /** How many times its boosts count (2 next to an active Lovers, 4 between two). */
  counts: number;
  effects: CardEffect[];
}

/** Works out the deck, left to right, exactly as the card texts say. */
export function resolveDeck(s: GameState): SlotView[] {
  const n = deckSlots(s);
  const printed: Array<CardDef | null> = Array.from({ length: n }, (_, i) => CARD_BY_ID.get(s.tarot.deck[i] ?? '') ?? null);
  // 1. what each slot acts as
  const acts: Array<CardDef | null> = [];
  for (let i = 0; i < n; i++) {
    const p = printed[i] ?? null;
    acts.push(p?.rule === 'mirror' ? (i > 0 && printed[i - 1] ? acts[i - 1]! : null) : p);
  }
  // 2. disabling, left to right
  const disabled: boolean[] = new Array<boolean>(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (disabled[i] || !printed[i]) continue;
    if (printed[i]!.rule === 'mirror' && i + 1 < n) disabled[i + 1] = true;
    if (acts[i]?.rule === 'tower') {
      if (i > 0) disabled[i - 1] = true;
      if (i + 1 < n) disabled[i + 1] = true;
    }
  }
  const active = (i: number) => i >= 0 && i < n && !!printed[i] && !disabled[i];
  const empty = printed.filter((p) => !p).length;
  // 3. boosts where each card sits
  const out: SlotView[] = printed.map((card, i) => {
    const a = acts[i] ?? null;
    if (!active(i) || !a) return { card, acts: a, active: active(i), counts: 1, effects: [] };
    const fx: CardEffect[] = [...a.effects];
    const mul = (stat: string, v: number) => fx.push({ stat, op: 'mul', v });
    if (a.rule === 'herald') mul('essenceGain', i === 0 ? 3 : 1.5);
    if (a.rule === 'chariot') mul('runeBulk', i === n - 1 ? 4 : 1.5);
    if (a.rule === 'hermit') mul('shardGain', !printed[i - 1] && !printed[i + 1] ? 5 : 1.2);
    if (a.rule === 'fool') mul('tapPower', 2 ** empty);
    if (a.rule === 'gambler') mul('essenceGain', s.tarot.gamble);
    return { card, acts: a, active: true, counts: 1, effects: fx };
  });
  // 4. the Lovers make their active neighbours count twice
  for (let i = 0; i < n; i++) {
    if (!active(i) || acts[i]?.rule !== 'lovers') continue;
    for (const j of [i - 1, i + 1]) if (active(j)) out[j]!.counts *= 2;
  }
  return out;
}

/** The deck's total for one stat: multipliers multiply, additions add, each counted as often as it counts. */
export function deckValue(s: GameState, statId: string, op: 'mul' | 'add') {
  let v = op === 'mul' ? ONE : ZERO;
  for (const slot of resolveDeck(s)) {
    for (const e of slot.effects) {
      if (e.stat !== statId || e.op !== op) continue;
      v = op === 'mul' ? v.mul(D(e.v).pow(slot.counts)) : v.add(e.v * slot.counts);
    }
  }
  return v;
}

/** 1.3.0: a deck's worth as one number: the orders of magnitude of all its multipliers, plus offline hours a little. */
export function deckScore(s: GameState): number {
  let total = 0;
  for (const slot of resolveDeck(s))
    for (const e of slot.effects) total += e.op === 'mul' ? Math.log10(Math.max(1e-9, e.v)) * slot.counts : (e.v / 3600) * 0.01 * slot.counts;
  return total;
}

/**
 * 1.3.0 Deal best deck (the playtest found Tarot confusing): a strong deck from the cards you own, by
 * the deck score. The best single cards first, then every slot tries every card (and empty) and every
 * pair of slots swaps, while that scores more. Deterministic, and only a few thousand deck checks.
 */
export function bestDeck(s: GameState): void {
  if (!tarotOpen(s)) return;
  const n = deckSlots(s);
  const owned = [...s.tarot.owned];
  const solo = (id: string) => {
    s.tarot.deck = [id, ...new Array<null>(n - 1).fill(null)];
    return deckScore(s);
  };
  const ranked = owned.map((id) => ({ id, v: solo(id) })).sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));
  let deck: Array<string | null> = Array.from({ length: n }, (_, i) => ranked[i]?.id ?? null);
  const scoreOf = (d: Array<string | null>) => {
    s.tarot.deck = d;
    return deckScore(s);
  };
  let best = scoreOf(deck);
  for (let pass = 0; pass < 6; pass++) {
    let better = false;
    for (let i = 0; i < n; i++)
      for (const id of [null, ...owned]) {
        if (id !== null && deck.includes(id)) continue;
        const d = deck.map((x, k) => (k === i ? id : x));
        const v = scoreOf(d);
        if (v > best + 1e-9) {
          deck = d;
          best = v;
          better = true;
        }
      }
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const d = [...deck];
        [d[i], d[j]] = [d[j]!, d[i]!];
        const v = scoreOf(d);
        if (v > best + 1e-9) {
          deck = d;
          best = v;
          better = true;
        }
      }
    if (!better) break;
  }
  s.tarot.deck = deck;
  if (deck.some((id) => id && CARD_BY_ID.get(id)?.rule === 'gambler') && s.tarot.gamble === 1) rollGamble(s);
}

export function registerTarot(): void {
  const stats = new Set<string>(['essenceGain', 'runeBulk', 'shardGain', 'tapPower']);
  for (const c of CARDS) for (const e of c.effects) if (e.op === 'mul') stats.add(e.stat);
  for (const statId of stats) {
    registerSources({
      id: `tarot.${statId}`,
      stat: statId,
      op: 'mul',
      label: 'Tarot of the Void',
      value: (s: GameState) => deckValue(s, statId, 'mul'),
      active: (s: GameState) => tarotOpen(s) && s.tarot.deck.some(Boolean),
    });
  }
  registerSources({ id: 'tarot.offlineCap', stat: 'offlineCap', op: 'add', label: 'Tarot of the Void', value: (s) => deckValue(s, 'offlineCap', 'add'), active: (s) => tarotOpen(s) && s.tarot.deck.some(Boolean) });
  // The Gambler rolls again after every Nebula while it's in the deck
  onAnyReset((s, layer) => {
    if (layer === 'nebula' && s.tarot.deck.some((id) => id && CARD_BY_ID.get(id)?.rule === 'gambler')) rollGamble(s);
  });
}
