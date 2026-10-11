import { BALANCE } from '../../content/balance';
import { RUNE_BY_ID, runesOf, SHRINE_BY_ID, type RuneDef } from '../../content/runes';
import { STAR_RANKS } from '../../content/runeDepth';
import { planFlat, type FlatPlan } from '../buy';
import { D, type Decimal, ZERO } from '../decimal';
import { events } from '../events';
import { cur, gain, type GameState, spend } from '../state';
import { mutatedTotal, trimMutations } from './mutations';
import { copies, shrineOpen } from './runes';

/**
 * Rune Starring and Crafting (Game design: "More mid systems"; Ascender's Starring without its
 * wipe). From 2 Nebulas a shrine ranks up to 5 stars by sacrificing copies of one rune per rank
 * (Legendary x250 up to Absolute x1 quadrillion). Only the copies the rank asks for go; nothing
 * else in the collection is touched. Each star is +20% to that shrine's rune effects, and from
 * 2 stars its hidden rune shows and comes 10 times as often.
 * Rune Shards: salvaging a copy you don't need (beyond what the level cap uses) of a 1-in-N rune
 * gives N / 10 shards; crafting a chosen rune costs N each, so crafting trades volume for aim.
 */
const RD = BALANCE.runeDepth;

export const starringOpen = (s: GameState) => (s.stats.nebulasAll ?? 0) >= RD.opens.starring;
export const starsOf = (s: GameState, shrine: string) => s.runes.stars[shrine] ?? 0;
export const maxStars = STAR_RANKS.length;

/** The rune and number of copies the shrine's next star asks for (null at 5 stars). */
export function starTarget(s: GameState, shrine: string): { rune: RuneDef; need: Decimal } | null {
  const rank = STAR_RANKS[starsOf(s, shrine)];
  if (!rank) return null;
  const rune = runesOf(shrine).find((r) => r.tier === rank.tier);
  return rune ? { rune, need: D(rank.count) } : null;
}

export function canStar(s: GameState, shrine: string): boolean {
  const sh = SHRINE_BY_ID.get(shrine);
  const t = starTarget(s, shrine);
  return !!sh && !!t && starringOpen(s) && shrineOpen(s, sh) && copies(s, t.rune.id).gte(t.need);
}

/** Sacrifices exactly the copies the next star asks for. */
export function starUp(s: GameState, shrine: string): boolean {
  if (!canStar(s, shrine)) return false;
  const t = starTarget(s, shrine)!;
  const left = copies(s, t.rune.id).sub(t.need);
  s.runes.copies[t.rune.id] = left;
  trimMutations(s, t.rune.id, left);
  s.runes.stars[shrine] = starsOf(s, shrine) + 1;
  s.stats.starsEarned = (s.stats.starsEarned ?? 0) + 1;
  events.emit({ t: 'star', shrine, stars: starsOf(s, shrine) });
  return true;
}

/** A rune's base odds N, as a Decimal. */
const oddsOf = (r: RuneDef) => D(10).pow(r.log10);

/** Copies beyond what the level cap needs (never mutated ones). */
export function surplus(s: GameState, r: RuneDef): Decimal {
  const c = copies(s, r.id);
  const extra = c.sub(r.cap * r.cap).floor();
  const plain = c.sub(mutatedTotal(s, r.id)).floor();
  return Decimal_max(ZERO, extra.lt(plain) ? extra : plain);
}

const Decimal_max = (a: Decimal, b: Decimal) => (a.gt(b) ? a : b);

export const salvageValue = (r: RuneDef, n: Decimal): Decimal => n.mul(oddsOf(r)).div(RD.salvageRatio);

/** Rune Shards that salvaging this shrine's extra copies would give. */
export function salvagePreview(s: GameState, shrine: string): Decimal {
  let t = ZERO;
  for (const r of runesOf(shrine)) t = t.add(salvageValue(r, surplus(s, r)));
  return t;
}

/** Turns every copy this shrine doesn't need into Rune Shards. Levels never drop. */
export function salvage(s: GameState, shrine: string): Decimal {
  const sh = SHRINE_BY_ID.get(shrine);
  if (!sh || !starringOpen(s) || !shrineOpen(s, sh)) return ZERO;
  let got = ZERO;
  for (const r of runesOf(shrine)) {
    const n = surplus(s, r);
    if (n.lte(0)) continue;
    s.runes.copies[r.id] = copies(s, r.id).sub(n);
    got = got.add(salvageValue(r, n));
  }
  gain(s, 'runeShards', got);
  return got;
}

/** You can craft a rune you can see: every visible rune, and a hidden one once found or revealed. */
export function craftable(s: GameState, r: RuneDef): boolean {
  const sh = SHRINE_BY_ID.get(r.shrine);
  if (!sh || !starringOpen(s) || !shrineOpen(s, sh)) return false;
  return !r.hidden || copies(s, r.id).gt(0) || starsOf(s, r.shrine) >= RD.revealAt;
}

export const craftPlan = (s: GameState, id: string): FlatPlan => {
  const r = RUNE_BY_ID.get(id)!;
  return planFlat(oddsOf(r), cur(s, 'runeShards'), s.settings.buyAmount, s.settings.customBuyAmount);
};

/** Crafts copies of a chosen rune with the buy amount. */
export function craftRune(s: GameState, id: string): boolean {
  const r = RUNE_BY_ID.get(id);
  if (!r || !craftable(s, r)) return false;
  const plan = craftPlan(s, id);
  if (!plan.canAfford || !spend(s, 'runeShards', plan.cost)) return false;
  const first = copies(s, id).lte(0);
  s.runes.copies[id] = copies(s, id).add(plan.count);
  if (first) s.stats.runesFound = (s.stats.runesFound ?? 0) + 1;
  s.stats.runesCrafted = (s.stats.runesCrafted ?? 0) + Math.min(1e15, plan.count.toNumber());
  return true;
}
