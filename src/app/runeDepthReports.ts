import { BALANCE } from '../content/balance';
import { RARITIES } from '../content/belt';
import { ELEMENTS } from '../content/elements';
import { RELICS } from '../content/forge';
import { RUNE_RARITIES, RUNE_STAT_WORDS, RUNES, runesOf, SHRINE_BY_ID, SHRINES } from '../content/runes';
import { AURAS, INDEX_PAGES, MUTATIONS, STAR_RANKS } from '../content/runeDepth';
import { D } from '../engine/decimal';
import { cur } from '../engine/state';
import { stat } from '../engine/stats';
import { auraCopies, auraEffLog, aurasOpen, dicePlan } from '../engine/systems/auras';
import { pageCount, pageMilestones, pageOpen } from '../engine/systems/collection';
import { mutEffLog, mutationsOpen } from '../engine/systems/mutations';
import { copies, runeLevel, shrineOpen } from '../engine/systems/runes';
import { canStar, craftable, craftPlan, maxStars, salvagePreview, starringOpen, starsOf, starTarget, surplus } from '../engine/systems/starring';
import { reqText } from '../engine/systems/unlocks';
import { format, formatCount } from '../ui/format';
import { game } from './game';
import { oddsText, rarityName } from './runeReports';

/** Read-outs for Rune Starring and Crafting, Celestial Auras, Mutations and the Index. */
const n = () => game.state.settings.notation;
const RD = BALANCE.runeDepth;
const WORDS: Record<string, string> = { ...RUNE_STAT_WORDS, auraLuck: 'aura luck', mutationLuck: 'mutation luck' };
const word = (statId: string) => WORDS[statId] ?? statId;
const pct = (x: number) => `+${formatCount(Math.round(x * 100), n())}%`;

// ---------- Rune Starring and Crafting ----------

export interface CraftRow {
  id: string;
  name: string;
  rarity: string;
  color: string;
  price: string;
  count: string;
  cost: string;
  can: boolean;
  level: string;
  extra: string;
}

export interface StarringReport {
  open: boolean;
  req: string;
  tabs: Array<{ id: string; name: string; color: string; open: boolean; stars: number }>;
  id: string;
  name: string;
  color: string;
  shrineOpen: boolean;
  stars: number;
  max: number;
  bonus: string;
  target: { name: string; rarity: string; color: string; have: string; need: string; share: number } | null;
  canStar: boolean;
  revealNote: string;
  shards: string;
  salvage: string;
  canSalvage: boolean;
  craft: CraftRow[];
}

export function starringReport(shrine: string): StarringReport {
  const s = game.state;
  const sh = SHRINE_BY_ID.get(shrine) ?? SHRINES[0]!;
  const stars = starsOf(s, sh.id);
  const t = starTarget(s, sh.id);
  const have = t ? copies(s, t.rune.id) : D(0);
  const preview = salvagePreview(s, sh.id);
  return {
    open: starringOpen(s),
    req: `${RD.opens.starring} Nebulas`,
    tabs: SHRINES.map((x) => ({ id: x.id, name: x.name.replace(' Shrine', ''), color: x.color, open: shrineOpen(s, x), stars: starsOf(s, x.id) })),
    id: sh.id,
    name: sh.name,
    color: sh.color,
    shrineOpen: shrineOpen(s, sh),
    stars,
    max: maxStars,
    bonus: stars > 0 ? `${pct(RD.starEffect * stars)} to this shrine's rune effects` : 'No stars yet',
    target: t
      ? {
          name: t.rune.name,
          rarity: rarityName(t.rune),
          color: t.rune.color,
          have: format(have, n()),
          need: format(t.need, n()),
          share: Math.min(1, have.div(t.need).toNumber()),
        }
      : null,
    canStar: canStar(s, sh.id),
    revealNote: stars >= RD.revealAt ? 'The hidden rune shows, and comes 10 times as often.' : `At ${RD.revealAt} stars the hidden rune shows itself and comes 10 times as often.`,
    shards: format(cur(s, 'runeShards'), n()),
    salvage: format(preview, n()),
    canSalvage: preview.gt(0),
    craft: runesOf(sh.id)
      .filter((r) => craftable(s, r))
      .map((r): CraftRow => {
        const plan = craftPlan(s, r.id);
        return {
          id: r.id,
          name: r.name,
          rarity: rarityName(r),
          color: r.color,
          price: format(D(10).pow(r.log10), n()),
          count: format(plan.count, n()),
          cost: format(plan.cost, n()),
          can: plan.canAfford,
          level: runeLevel(s, r) >= r.cap ? 'MAX' : `L${runeLevel(s, r)}`,
          extra: format(surplus(s, r), n()),
        };
      }),
  };
}

export const STAR_LADDER = STAR_RANKS.map((r) => ({ rarity: RUNE_RARITIES[r.tier]?.name ?? '', count: r.count }));

// ---------- Celestial Auras ----------

export interface AuraRow {
  id: string;
  name: string;
  color: string;
  odds: string;
  copies: string;
  found: boolean;
  effects: string;
  equipped: boolean;
}

export interface AurasReport {
  open: boolean;
  req: string;
  dice: string;
  every: string;
  count: string;
  can: boolean;
  auto: boolean;
  luck: string;
  equipped: string;
  found: number;
  total: number;
  auras: AuraRow[];
}

export function aurasReport(): AurasReport {
  const s = game.state;
  const plan = dicePlan(s);
  return {
    open: aurasOpen(s),
    req: `${RD.opens.auras} Nebulas`,
    dice: format(cur(s, 'auraDice').floor(), n()),
    every: formatCount(RD.auras.diceEvery, n()),
    count: format(plan.count, n()),
    can: plan.canAfford,
    auto: s.auras.auto,
    luck: `x${format(stat(s, 'auraLuck'), n())}`,
    equipped: AURAS.find((a) => a.id === s.auras.equipped)?.name ?? 'None',
    found: AURAS.filter((a) => auraCopies(s, a.id).gt(0)).length,
    total: AURAS.length,
    auras: AURAS.map((a) => {
      const found = auraCopies(s, a.id).gt(0);
      return {
        id: a.id,
        name: found ? a.name : '???',
        color: a.color,
        odds: oddsText(auraEffLog(s, a)),
        copies: format(auraCopies(s, a.id), n()),
        found,
        effects: found ? a.effects.map((e) => `${pct(e.mul - 1)} ${word(e.stat)}`).join(' · ') : 'Roll to find out',
        equipped: s.auras.equipped === a.id,
      };
    }),
  };
}

// ---------- Mutations ----------

export interface MutationsReport {
  open: boolean;
  req: string;
  luck: string;
  rows: Array<{ id: string; name: string; color: string; mult: string; odds: string; base: string; runes: string; asteroids: string }>;
  targets: Array<{ name: string; built: boolean }>;
}

export function mutationsReport(): MutationsReport {
  const s = game.state;
  return {
    open: mutationsOpen(s),
    req: `${RD.opens.mutations} Nebulas`,
    luck: `x${format(stat(s, 'mutationLuck'), n())}`,
    rows: MUTATIONS.map((m) => {
      let runes = D(0);
      for (const rec of Object.values(s.mutations.runes)) runes = runes.add(rec[m.id] ?? 0);
      let asteroids = 0;
      for (const r of RARITIES) asteroids += s.mutations.asteroids[`${r.id}.${m.id}`] ?? 0;
      return { id: m.id, name: m.name, color: m.color, mult: `x${m.mult}`, odds: oddsText(mutEffLog(s, m)), base: oddsText(m.log10), runes: format(runes, n()), asteroids: formatCount(asteroids, n()) };
    }),
    targets: [
      { name: 'Runes: a mutated copy counts as that many copies toward the rune’s level', built: true },
      { name: 'Asteroids: a mutated asteroid gives that many times the ore and XP', built: true },
      { name: 'Void Wyrms and nursery stars mutate too, once they arrive', built: false },
    ],
  };
}

// ---------- The Index ----------

export interface IndexEntry {
  name: string;
  color: string;
  found: boolean;
}

export interface IndexReport {
  pages: Array<{ id: string; name: string; icon: string; open: boolean; req: string; found: number; total: number; share: number; milestones: number; bonus: string }>;
  id: string;
  groups: Array<{ name: string; entries: IndexEntry[] }>;
}

function entries(id: string): Array<{ name: string; entries: IndexEntry[] }> {
  const s = game.state;
  switch (id) {
    case 'runes':
      return SHRINES.map((sh) => ({
        name: sh.name,
        entries: runesOf(sh.id).map((r) => {
          const found = copies(s, r.id).gt(0);
          return { name: found ? r.name : '???', color: r.color, found };
        }),
      }));
    case 'auras':
      return [{ name: 'Celestial Auras', entries: AURAS.map((a) => ({ name: auraCopies(s, a.id).gt(0) ? a.name : '???', color: a.color, found: auraCopies(s, a.id).gt(0) })) }];
    case 'elements':
      return [{ name: 'Element Codex', entries: ELEMENTS.map((e) => ({ name: e.symbol, color: '#2EE6FF', found: (s.codex[e.id] ?? 0) > 0 })) }];
    case 'relics':
      return [{ name: 'Relics', entries: RELICS.map((r) => ({ name: (s.relics.levels[r.id] ?? 0) > 0 ? r.name : '???', color: '#C9B9FF', found: (s.relics.levels[r.id] ?? 0) > 0 })) }];
    case 'mutations':
      return MUTATIONS.map((m) => ({
        name: `${m.name} (x${m.mult})`,
        entries: [
          ...SHRINES.map((sh) => {
            const k = runesOf(sh.id).filter((r) => s.mutations.runes[r.id]?.[m.id]?.gt(0)).length;
            return { name: `${sh.name.replace(' Shrine', '')} runes ${k}/${runesOf(sh.id).length}`, color: m.color, found: k > 0 };
          }),
          ...RARITIES.map((r) => ({ name: `${r.name} asteroid`, color: m.color, found: (s.mutations.asteroids[`${r.id}.${m.id}`] ?? 0) > 0 })),
        ],
      }));
    default:
      return [];
  }
}

export function indexReport(page: string): IndexReport {
  const s = game.state;
  const pages = INDEX_PAGES.map((p) => {
    const { found, total } = pageCount(s, p.id);
    const k = pageMilestones(s, p);
    const open = pageOpen(s, p);
    return {
      id: p.id,
      name: p.name,
      icon: p.icon,
      open,
      req: p.built ? reqText(p.req) : `Opens with ${p.name}`,
      found,
      total,
      share: total > 0 ? found / total : 0,
      milestones: k,
      bonus: `x${format(D(p.per).pow(k), n())} ${word(p.stat)} (x${p.per} at 10%, 25%, 50%, 75% and 100%)`,
    };
  });
  const id = pages.find((p) => p.id === page && p.open)?.id ?? 'runes';
  return { pages, id, groups: entries(id) };
}

/** For tests and the Stats panel: total runes in the game. */
export const RUNE_COUNT = RUNES.length;
