import { BALANCE } from '../../content/balance';
import { PERKS } from '../../content/belt';
import { D, type Decimal, ZERO } from '../decimal';
import { events } from '../events';
import { gain, type GameState } from '../state';
import { defineStat, registerSources, stat } from '../stats';

/**
 * The Starsmith Level: XP from taps, harvests, purchases and resets fills a bar; every level is a
 * perk point. Perks can be reset for free at any time. Level L needs 50 x 2.7^(L^0.75) XP more.
 */
const S = BALANCE.starsmith;

export const starsmithOpen = (s: GameState) => s.tier >= S.tier || s.unlocked.includes('level');

/** XP to go from level L to L + 1. */
export const xpForLevel = (L: number): Decimal => D(S.base).mul(D(S.ratio).pow(L ** S.pow));

/** Where the last count got to: XP only grows, so the next count carries on from there. */
let memo: { s: GameState | null; level: number; base: Decimal } = { s: null, level: 0, base: ZERO };

/** Level from all XP ever earned, and progress into the next level. */
export function levelInfo(s: GameState): { level: number; into: Decimal; need: Decimal } {
  const total = s.totals.all.xp ?? ZERO;
  if (memo.s !== s || total.lt(memo.base)) memo = { s, level: 0, base: ZERO };
  let L = memo.level;
  let xp = total.sub(memo.base);
  while (L < 100_000) {
    const need = xpForLevel(L);
    if (xp.lt(need)) {
      memo.level = L;
      memo.base = total.sub(xp);
      return { level: L, into: xp, need };
    }
    xp = xp.sub(need);
    L++;
  }
  return { level: L, into: ZERO, need: xpForLevel(L) };
}

export const perkPoints = (s: GameState) => levelInfo(s).level;
export const perksSpent = (s: GameState) => Object.values(s.starsmith.perks).reduce((a, b) => a + b, 0);
export const perksFree = (s: GameState) => perkPoints(s) - perksSpent(s);

/** Hidden perks show up once their rune has been found. */
export const perkAvailable = (s: GameState, p: (typeof PERKS)[number]) => !p.needsRune || (s.runes.copies[p.needsRune]?.gt(0) ?? false);

export function addPerk(s: GameState, id: string): boolean {
  const p = PERKS.find((x) => x.id === id);
  if (!p || !perkAvailable(s, p) || perksFree(s) <= 0) return false;
  s.starsmith.perks[id] = (s.starsmith.perks[id] ?? 0) + 1;
  return true;
}

/** Free respec: every point comes back. */
export function resetPerks(s: GameState): void {
  s.starsmith.perks = {};
}

/** Adds XP that is already scaled, announcing any level gained. */
export function addXp(s: GameState, amount: Decimal): void {
  if (!starsmithOpen(s) || amount.lte(0)) return;
  const before = levelInfo(s).level;
  gain(s, 'xp', amount);
  const after = levelInfo(s).level;
  if (after > before) {
    s.stats.level = after;
    events.emit({ t: 'milestone', id: `level.${after}` });
  }
}

/** XP for something the player did (taps, purchases, resets, quests), scaled by XP gain. */
export function giveXp(s: GameState, amount: number): void {
  if (amount > 0) addXp(s, stat(s, 'xpGain').mul(amount));
}

export function registerStarsmith(): void {
  defineStat({ id: 'xpGain', label: 'XP gain', base: () => D(1) });
  registerSources(
    ...PERKS.map((p) => ({
      id: `perk.${p.id}`,
      stat: p.stat,
      op: p.op,
      label: `${p.name} (perk)`,
      value: (s: GameState) => (p.op === 'add' ? D(p.value * (s.starsmith.perks[p.id] ?? 0)) : D(p.value).pow(s.starsmith.perks[p.id] ?? 0)),
      active: (s: GameState) => (s.starsmith.perks[p.id] ?? 0) > 0,
    })),
  );
}
