import { BALANCE } from '../../content/balance';
import { parseWyrmKey, WYRM_BY_ID, WYRM_FORMS, WYRM_SPECIES, wyrmKey, type WyrmSpecies } from '../../content/wyrms';
import { MUTATION_BY_ID } from '../../content/runeDepth';
import { planLimited, type PurchasePlan } from '../buy';
import { type CostCurve, lateRamp } from '../cost';
import { D, type Decimal, ONE, ZERO } from '../decimal';
import { events } from '../events';
import { drawHits, effLog10 } from '../odds';
import { cur, gain, type GameState, spend, usable } from '../state';
import { registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { catchComet, cometOnScreen } from './comets';
import { recordMutation, rollMutations } from './mutations';

/**
 * Void Wyrms (Game design: "Void Wyrms"; Math and balance: Wyrm numbers). They arrive with the
 * third Nebula.
 * - Eggs cost Essence (10 x 1.15^eggs so far, every buy amount). Each egg hatches one Wyrm whose
 *   species is rolled rarest first with the rune odds at the square root of Rune Luck (Luck Root
 *   still applies), from the Wyrms' own stream; big batches use expected counts with Poisson draws.
 * - Identical Wyrms stack ("species|form|mutation"). Exactly 5 of a Normal stack fuse into one
 *   Golden (x3), and 5 Golden into one Rainbow (x10).
 * - Training: Iron alloy buys levels for a stack (20 x 1.35^level, divided by Wyrm XP).
 *   Boost = base x (1 + 0.1 x level) x form x mutation, on the species' stat.
 * - The team: 3 slots, one more at 25, 100 and 400 Wyrms hatched (up to 6). Team Wyrms breathe
 *   Embers (offline too), swim across the sky and catch comets.
 */
const W = BALANCE.wyrms;

export const wyrmsOpen = (s: GameState) => (s.stats.nebulasAll ?? 0) >= W.nebulas;

export const stackOf = (s: GameState, key: string): Decimal => s.wyrms.stacks[key] ?? ZERO;
export const stackLevel = (s: GameState, key: string): number => s.wyrms.levels[key] ?? 0;

export function teamSlots(s: GameState): number {
  return W.slots + W.slotHatches.filter((n) => (s.stats.wyrmsHatched ?? 0) >= n).length;
}

const eggCurve: CostCurve = lateRamp({ base: W.eggBase, brackets: [{ from: 0, ratio: W.eggGrowth }] });
export const eggPlan = (s: GameState): PurchasePlan => planLimited(eggCurve, s.wyrms.eggs, usable(s, 'essence'), s.settings.buyAmount, s.settings.customBuyAmount, Infinity);

/** log10 of the effective odds of a species: rune odds at the square root of your luck. */
export function speciesEffLog(s: GameState, w: WyrmSpecies): number {
  const luck = Math.sqrt(Math.max(1, stat(s, 'runeLuck').toNumber()));
  return effLog10(w.log10, luck, Math.max(1, stat(s, 'luckRoot').toNumber()));
}

function addWyrms(s: GameState, key: string, n: Decimal): void {
  s.wyrms.stacks[key] = stackOf(s, key).add(n);
  const { species, form } = parseWyrmKey(key);
  const variant = `${species}|${form}`;
  if (!s.wyrms.found.includes(variant)) s.wyrms.found.push(variant);
}

export interface HatchResult {
  count: number;
  hits: Array<{ key: string; count: Decimal }>;
  best: WyrmSpecies;
}

/** Hatches `n` eggs (already paid for). */
export function hatchEggs(s: GameState, n: number): HatchResult {
  let left = D(n);
  const hits: HatchResult['hits'] = [];
  // rarest first, so the first species hatched is the best
  let best: WyrmSpecies | null = null;
  // rarest first; whatever is left is the commonest species
  for (let i = WYRM_SPECIES.length - 1; i >= 0 && left.gt(0); i--) {
    const w = WYRM_SPECIES[i]!;
    let k = i === 0 ? left : drawHits(s.wyrms.rng, left, -speciesEffLog(s, w), BALANCE.runes.poissonBelow);
    if (k.gt(left)) k = left;
    if (k.lte(0)) continue;
    left = left.sub(k);
    best ??= w;
    // a few of them may hatch mutated (from 3 Nebulas)
    let plain = k;
    for (const { mut, k: mk } of rollMutations(s, k)) {
      addWyrms(s, wyrmKey(w.id, 0, mut.id), mk);
      hits.push({ key: wyrmKey(w.id, 0, mut.id), count: mk });
      recordMutation(s, 'wyrm', w.id, mut.id, mk.toNumber());
      plain = plain.sub(mk);
    }
    if (plain.gt(0)) {
      addWyrms(s, wyrmKey(w.id, 0), plain);
      hits.push({ key: wyrmKey(w.id, 0), count: plain });
    }
  }
  s.wyrms.eggs += n;
  s.stats.wyrmsHatched = (s.stats.wyrmsHatched ?? 0) + n;
  // the first Wyrm joins the team at once
  if (s.wyrms.team.length === 0 && hits.length > 0) s.wyrms.team.push(hits.reduce((a, b) => (boostOfKey(s, b.key).gt(boostOfKey(s, a.key)) ? b : a)).key);
  const top = best ?? WYRM_SPECIES[0]!;
  events.emit({ t: 'hatch', count: n, best: top.id });
  return { count: n, hits, best: top };
}

/** Buys eggs with the buy amount and hatches them. */
export function buyEggs(s: GameState): HatchResult | null {
  if (!wyrmsOpen(s)) return null;
  const plan = eggPlan(s);
  if (!plan.canAfford || plan.count < 1 || !spend(s, 'essence', plan.cost)) return null;
  return hatchEggs(s, plan.count);
}

/** Exactly five identical Wyrms become one of the next form. */
export function fuseWyrms(s: GameState, key: string): boolean {
  const { species, form, mut } = parseWyrmKey(key);
  if (form >= WYRM_FORMS.length - 1 || stackOf(s, key).lt(W.fuse)) return false;
  s.wyrms.stacks[key] = stackOf(s, key).sub(W.fuse);
  addWyrms(s, wyrmKey(species, form + 1, mut), ONE);
  // a stack fused away leaves the team
  if (stackOf(s, key).lte(0)) s.wyrms.team = s.wyrms.team.filter((k) => k !== key);
  s.stats.wyrmFusions = (s.stats.wyrmFusions ?? 0) + 1;
  return true;
}

export function equipWyrm(s: GameState, key: string): boolean {
  if (stackOf(s, key).lt(1) || s.wyrms.team.includes(key) || s.wyrms.team.length >= teamSlots(s)) return false;
  s.wyrms.team.push(key);
  return true;
}

export function unequipWyrm(s: GameState, key: string): void {
  s.wyrms.team = s.wyrms.team.filter((k) => k !== key);
}

/**
 * 1.3.0 Fuse all: every stack of five or more fuses as far as it can, lowest forms first (so a fresh
 * Golden can go on to Rainbow in the same click). Returns the fusions made.
 */
export function fuseAll(s: GameState): number {
  let made = 0;
  for (let form = 0; form < WYRM_FORMS.length - 1; form++)
    for (const key of Object.keys(s.wyrms.stacks)) {
      if (parseWyrmKey(key).form !== form) continue;
      // five at a time, in one step: the stack's fusions, as a count
      const n = Math.floor(stackOf(s, key).div(W.fuse).min(1e15).toNumber());
      if (n < 1) continue;
      const { species, mut } = parseWyrmKey(key);
      s.wyrms.stacks[key] = stackOf(s, key).sub(D(n).mul(W.fuse));
      addWyrms(s, wyrmKey(species, form + 1, mut), D(n));
      if (stackOf(s, key).lte(0)) s.wyrms.team = s.wyrms.team.filter((k) => k !== key);
      s.stats.wyrmFusions = (s.stats.wyrmFusions ?? 0) + n;
      made += n;
    }
  return made;
}

/** 1.3.0 Best team: the strongest stacks you own, as many as there are slots. */
export function bestTeam(s: GameState): void {
  s.wyrms.team = Object.keys(s.wyrms.stacks)
    .filter((k) => stackOf(s, k).gte(1))
    .sort((a, b) => boostOfKey(s, b).cmp(boostOfKey(s, a)) || a.localeCompare(b))
    .slice(0, teamSlots(s));
}

const trainCurve: CostCurve = lateRamp({ base: W.trainBase, brackets: [{ from: 0, ratio: W.trainGrowth }] });

/** Levels for a stack: Iron alloy, with Wyrm XP making every alloy count for more. */
export function trainPlan(s: GameState, key: string): PurchasePlan {
  const xp = stat(s, 'wyrmXp').max(1);
  const plan = planLimited(trainCurve, stackLevel(s, key), usable(s, 'alloy.iron').mul(xp), s.settings.buyAmount, s.settings.customBuyAmount, Infinity);
  return { ...plan, cost: plan.cost.div(xp) };
}

export function trainWyrm(s: GameState, key: string): boolean {
  if (stackOf(s, key).lt(1)) return false;
  const plan = trainPlan(s, key);
  if (!plan.canAfford || plan.count < 1 || !spend(s, 'alloy.iron', plan.cost)) return false;
  s.wyrms.levels[key] = stackLevel(s, key) + plan.count;
  return true;
}

/** Form and mutation size of a stack. */
function sizeOf(key: string): number {
  const { form, mut } = parseWyrmKey(key);
  return (WYRM_FORMS[form]?.mult ?? 1) * (mut ? (MUTATION_BY_ID.get(mut)?.mult ?? 1) : 1);
}

/** The boost one Wyrm of this stack gives on the team: x(1 + this). */
export function boostOfKey(s: GameState, key: string): Decimal {
  const w = WYRM_BY_ID.get(parseWyrmKey(key).species);
  if (!w) return ZERO;
  return D(W.boostBase * W.boostGrowth ** w.rank * (1 + W.perLevel * stackLevel(s, key)) * sizeOf(key));
}

/** Embers a second from one Wyrm of this stack. */
export function embersOfKey(s: GameState, key: string): Decimal {
  const w = WYRM_BY_ID.get(parseWyrmKey(key).species);
  if (!w) return ZERO;
  return D(W.emberBase * W.emberGrowth ** w.rank * (1 + W.perLevel * stackLevel(s, key)) * sizeOf(key));
}

export function embersPerSecond(s: GameState): Decimal {
  let t = ZERO;
  for (const key of s.wyrms.team) t = t.add(embersOfKey(s, key));
  return t.mul(stat(s, 'emberGain'));
}

export function registerWyrms(): void {
  const stats = [...new Set(WYRM_SPECIES.map((w) => w.stat))];
  for (const statId of stats) {
    registerSources({
      id: `wyrms.${statId}`,
      stat: statId,
      op: 'mul',
      label: 'Void Wyrms',
      value: (s: GameState) => {
        let v = ONE;
        for (const key of s.wyrms.team) if (WYRM_BY_ID.get(parseWyrmKey(key).species)?.stat === statId) v = v.mul(boostOfKey(s, key).add(1));
        return v;
      },
      active: (s: GameState) => s.wyrms.team.some((key) => WYRM_BY_ID.get(parseWyrmKey(key).species)?.stat === statId),
    });
  }
  registerSystem({
    id: 'wyrms',
    order: 42,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      if (!wyrmsOpen(s) || s.wyrms.team.length === 0) return;
      gain(s, 'embers', embersPerSecond(s).mul(dt * ctx.gainScale));
      // a Wyrm snaps up a comet a moment after it appears (comets only fly while you play)
      if (!cometOnScreen(s)) {
        s.wyrms.catchAcc = 0;
        return;
      }
      s.wyrms.catchAcc += dt;
      if (s.wyrms.catchAcc >= W.catchSeconds) {
        s.wyrms.catchAcc = 0;
        if (catchComet(s)) s.stats.wyrmCatches = (s.stats.wyrmCatches ?? 0) + 1;
      }
    },
  });
}
