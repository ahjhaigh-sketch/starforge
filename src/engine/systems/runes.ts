import { BALANCE } from '../../content/balance';
import { RUNE_RARITIES, runesOf, SHRINE_BY_ID, SHRINES, type RuneDef, type ShrineDef } from '../../content/runes';
import { D, Decimal, ONE, ZERO } from '../decimal';
import { events } from '../events';
import { nextPoisson } from '../rng';
import { cur, type GameState, type ShrineState, spend } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';
import { earnDice } from './auras';
import { effectiveCopies, mutateRunes } from './mutations';
import { reqMet } from './unlocks';
import { effLog10 } from '../odds';

export { effLog10 };

/**
 * Constellation Runes (Math and balance: "Rune maths").
 * - Every rune rolled costs the shrine's price: spend per second = price x runes per second, and
 *   auto-roll slows to what your currency covers instead of going negative.
 * - Runes per second = speed (rolls a second, at most 20) x bulk (runes a roll).
 * - Effective odds: if N <= 10, N; else max(10, (N / L)^(1 / R)), in log space. Anomalies use N.
 * - Never roll one by one: each rune's expected hits are runes / eff, drawn as a Poisson count
 *   from the rune stream below 1,000 and taken as-is above, so e30 runes cost the same work as 1.
 * - Every 10th roll has x2 luck; the rarest visible rune is guaranteed after 3 x its odds in rolls.
 * - level = min(cap, floor(sqrt(copies))); each stat gets (1 + a x level x Resonance).
 */
const R = BALANCE.runes;

export const runesOpen = (s: GameState) => (s.stats.nebulasAll ?? 0) >= 1;
export const shrineOpen = (s: GameState, sh: ShrineDef) => runesOpen(s) && reqMet(s, sh.req);

export function shrineState(s: GameState, id: string): ShrineState {
  let st = s.runes.shrines[id];
  if (!st) {
    st = { auto: false, rate: 1, luck: 1, keep: 0, acc: 0, pity: ZERO, rolled: ZERO };
    s.runes.shrines[id] = st;
  }
  return st;
}

export const copies = (s: GameState, id: string): Decimal => s.runes.copies[id] ?? ZERO;

/** Mutated copies count as their mutation's size (a Golden copy is two). */
export function runeLevel(s: GameState, r: RuneDef): number {
  const c = copies(s, r.id);
  if (c.lte(0)) return 0;
  return Math.min(r.cap, Math.floor(effectiveCopies(s, r.id, c).sqrt().toNumber()));
}

/** A shrine's stars (Rune Starring): +20% rune effects each. */
export const shrineStars = (s: GameState, shrine: string) => s.runes.stars[shrine] ?? 0;

/** Rolls a second: Rune Speed, at most 20. */
export const rollSpeed = (s: GameState) => Math.min(R.speedCap, stat(s, 'runeSpeed').toNumber());
export const runeBulk = (s: GameState): Decimal => stat(s, 'runeBulk').max(1);
/** Runes per second at this shrine: speed x bulk x the share of speed you let it use. */
export const runesPerSecond = (s: GameState, id: string): Decimal => runeBulk(s).mul(rollSpeed(s) * shrineState(s, id).rate);
export const runePrice = (s: GameState, sh: ShrineDef): Decimal => D(sh.price).mul(stat(s, 'runePrice'));

/** Luck after the shrine's luck slider (1 = no luck at all, the full stat at 100%). */
export function shrineLuck(s: GameState, id: string): number {
  const L = Math.max(1, stat(s, 'runeLuck').toNumber());
  return 1 + (L - 1) * shrineState(s, id).luck;
}

/** From 2 stars a shrine's hidden rune comes 10 times as often. */
const baseLog = (s: GameState, r: RuneDef) => (r.hidden && shrineStars(s, r.shrine) >= BALANCE.runeDepth.revealAt ? r.log10 - Math.log10(BALANCE.runeDepth.hiddenBoost) : r.log10);

export const runeEffLog = (s: GameState, r: RuneDef, luck = shrineLuck(s, r.shrine)) => effLog10(baseLog(s, r), luck, Math.max(1, stat(s, 'luckRoot').toNumber()), r.anomaly);

/** The rarest visible rune (hard pity target) of a shrine. */
const rarestVisible = (shrine: string) => runesOf(shrine).filter((r) => !r.hidden && !r.anomaly).reduce((a, b) => (b.log10 > a.log10 ? b : a));

export interface RollResult {
  runes: Decimal;
  hits: Array<{ id: string; count: Decimal }>;
  best: RuneDef | null;
}

/**
 * Rolls \`runes\` runes at a shrine (already paid for). Expected hits per rune, with the 10th-roll
 * luck bonus folded in; Poisson below 1,000 expected, the expectation above.
 */
export function rollRunes(s: GameState, shrineId: string, runes: Decimal, keepAll = false): RollResult {
  const st = shrineState(s, shrineId);
  const L = shrineLuck(s, shrineId);
  const bulk = runeBulk(s);
  const rolls = runes.div(bulk);
  const hits: RollResult['hits'] = [];
  let best: RuneDef | null = null;
  const rarest = rarestVisible(shrineId);
  for (const r of runesOf(shrineId)) {
    const pLog = -runeEffLog(s, r, L);
    const pLucky = -runeEffLog(s, r, L * R.pityLuck);
    const share = 1 - 1 / R.pityEvery;
    const p = D(10).pow(pLog).mul(share).add(D(10).pow(pLucky).mul(1 - share));
    const lambda = runes.mul(p);
    let count = lambda.lt(R.poissonBelow) ? D(nextPoisson(s.runes.rng, lambda.toNumber())) : lambda.floor();
    if (r.id === rarest.id) {
      // hard pity: after 3 x its odds in rolls, the rarest visible rune comes for sure
      st.pity = count.gt(0) ? ZERO : st.pity.add(rolls);
      if (count.eq(0) && st.pity.gte(D(10).pow(runeEffLog(s, r, L)).mul(R.hardPity))) {
        count = ONE;
        st.pity = ZERO;
      }
    }
    if (count.lte(0)) continue;
    // the keep filter only applies to auto-roll, and never to hidden runes or anomalies
    if (!keepAll && r.tier >= 0 && r.tier < st.keep) continue;
    const firstTime = copies(s, r.id).lte(0);
    s.runes.copies[r.id] = copies(s, r.id).add(count);
    mutateRunes(s, r.id, count);
    hits.push({ id: r.id, count });
    if (!best || r.log10 > best.log10) best = r;
    if (firstTime) s.stats.runesFound = (s.stats.runesFound ?? 0) + 1;
    if (r.tier >= 5 || r.tier < 0) events.emit({ t: 'rune', shrine: shrineId, id: r.id, first: firstTime });
  }
  st.rolled = st.rolled.add(runes);
  earnDice(s, runes);
  s.stats.runesRolled = (s.stats.runesRolled ?? 0) + Math.min(1e15, runes.toNumber());
  return { runes, hits, best };
}

/** How many runes the currency covers right now. */
export const affordable = (s: GameState, sh: ShrineDef): Decimal => cur(s, sh.currency).div(runePrice(s, sh)).floor();

/** One roll by hand: \`bulk\` runes (or as many as you can pay for). */
export function rollOnce(s: GameState, shrineId: string): RollResult | null {
  const sh = SHRINE_BY_ID.get(shrineId);
  if (!sh || !shrineOpen(s, sh)) return null;
  const n = Decimal.min(runeBulk(s).floor(), affordable(s, sh));
  if (n.lt(1) || !spend(s, sh.currency, n.mul(runePrice(s, sh)))) return null;
  return rollRunes(s, shrineId, n, true);
}

export function setShrine(s: GameState, shrineId: string, patch: Partial<Pick<ShrineState, 'auto' | 'rate' | 'luck' | 'keep'>>): void {
  const st = shrineState(s, shrineId);
  if (patch.auto !== undefined) st.auto = patch.auto;
  if (patch.rate !== undefined) st.rate = Math.max(0, Math.min(1, patch.rate));
  if (patch.luck !== undefined) st.luck = Math.max(0, Math.min(1, patch.luck));
  if (patch.keep !== undefined) st.keep = Math.max(0, Math.min(RUNE_RARITIES.length - 1, Math.floor(patch.keep)));
}

/** "Worth chasing": the rarest visible rune with odds at most 1,000 x your runes per second. */
export function worthChasing(s: GameState, shrineId: string): RuneDef | null {
  const rps = runesPerSecond(s, shrineId);
  if (rps.lte(0)) return null;
  const limit = rps.mul(1000).log10().toNumber();
  return (
    runesOf(shrineId)
      .filter((r) => !r.hidden && runeEffLog(s, r) <= limit)
      .sort((a, b) => b.log10 - a.log10)[0] ?? null
  );
}

/** Auto-roll for dt seconds: as many runes as your speed allows and your currency covers. */
export function autoRoll(s: GameState, shrineId: string, dt: number): Decimal {
  const sh = SHRINE_BY_ID.get(shrineId)!;
  const st = shrineState(s, shrineId);
  const want = runesPerSecond(s, shrineId).mul(dt).add(st.acc);
  const whole = want.floor();
  const n = Decimal.min(whole, affordable(s, sh));
  // the fraction carries over; a shortfall doesn't (rolling slows, it never runs a debt)
  st.acc = n.lt(whole) ? 0 : want.sub(whole).toNumber();
  if (n.lt(1)) return ZERO;
  spend(s, sh.currency, n.mul(runePrice(s, sh)));
  rollRunes(s, shrineId, n);
  return n;
}

/** Stats runes can boost that no earlier system defined (later layers build on them). */
const NEW_STATS: Array<[string, string, number]> = [
  ['runeSpeed', 'Rune speed (rolls a second)', 1],
  ['runeEffect', 'Rune effects', 1],
  ['runePrice', 'Rune prices', 1],
  ['luckRoot', 'Luck Root', 1],
  ['wyrmXp', 'Wyrm XP', 1],
  ['emberGain', 'Ember gain', 1],
  ['darkMatterGain', 'Dark Matter gain', 1],
  ['galaxyCoreGain', 'Galaxy Core gain', 1],
  ['chrononGain', 'Chronon gain', 1],
];

export function registerRunes(): void {
  for (const [id, label, base] of NEW_STATS) defineStat({ id, label, base: () => D(base) });
  // one source per shrine and stat: the product (or sum) over that shrine's runes
  for (const sh of SHRINES) {
    const byStat = new Map<string, Array<{ r: RuneDef; op: 'mul' | 'add' | 'pow'; a: number }>>();
    for (const r of runesOf(sh.id)) for (const e of r.effects) byStat.set(`${e.stat}|${e.op}`, [...(byStat.get(`${e.stat}|${e.op}`) ?? []), { r, op: e.op, a: e.a }]);
    for (const [key, list] of byStat) {
      const [statId, op] = key.split('|') as [string, 'mul' | 'add' | 'pow'];
      registerSources({
        id: `runes.${sh.id}.${statId}.${op}`,
        stat: statId,
        op,
        label: `Runes: ${sh.name}`,
        value: (s: GameState) => {
          // Resonance strengthens multipliers and additions, never powers
          const res = statId === 'runeEffect' || op === 'pow' ? 1 : stat(s, 'runeEffect').toNumber() * (1 + BALANCE.runeDepth.starEffect * shrineStars(s, sh.id));
          if (op === 'add') return D(list.reduce((t, x) => t + x.a * runeLevel(s, x.r) * res, 0));
          let v = ONE;
          for (const x of list) {
            const lvl = runeLevel(s, x.r);
            if (lvl > 0) v = v.mul(1 + x.a * lvl * res);
          }
          return v;
        },
        active: (s: GameState) => list.some((x) => copies(s, x.r.id).gt(0)),
      });
    }
  }
  registerSystem({
    id: 'runes',
    order: 40,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      if (!runesOpen(s)) return;
      for (const sh of SHRINES) {
        const st = s.runes.shrines[sh.id];
        // auto-roll keeps going offline, from the same seeded stream (at the offline efficiency)
        if (st?.auto && shrineOpen(s, sh)) autoRoll(s, sh.id, dt * ctx.gainScale);
      }
    },
  });
}

