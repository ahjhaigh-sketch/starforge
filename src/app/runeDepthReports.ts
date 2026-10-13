import { BALANCE } from '../content/balance';
import { MEGASTRUCTURES } from '../content/galaxyBuild';
import { SIGILS } from '../content/sigils';
import { LEVIATHANS, SPIRE_BANNERS, TRIALS } from '../content/challenges';
import { PARTS } from '../content/shipParts';
import { RECIPES } from '../content/alchemy';
import { TIERS } from '../content/tiers';
import { ENGINES } from '../content/engines';
import { GALAXIES } from '../content/galactic';
import { CARDS, CARD_RARITIES } from '../content/nebulaExtras';
import { STAR_SPECIES } from '../content/nursery';
import { WYRM_FORMS, WYRM_SPECIES } from '../content/wyrms';
import { RARITIES } from '../content/belt';
import { ELEMENTS } from '../content/elements';
import { RELICS } from '../content/forge';
import { RUNE_RARITIES, RUNE_STAT_WORDS, RUNES, runesOf, SHRINE_BY_ID, SHRINES } from '../content/runes';
import { AURAS, INDEX_PAGES, MUTATIONS, STAR_RANKS, auraFamily } from '../content/runeDepth';
import { D } from '../engine/decimal';
import { cur } from '../engine/state';
import { stat } from '../engine/stats';
import { auraCopies, auraEffLog, auraMult, auraRank, auraSlots, aurasOpen, dicePlan, polishCost, wornAuras } from '../engine/systems/auras';
import { pageCount, pageMilestones, pageOpen } from '../engine/systems/collection';
import { mutEffLog, mutationsOpen } from '../engine/systems/mutations';
import { copies, runeLevel, shrineOpen } from '../engine/systems/runes';
import { canStar, craftable, craftPlan, maxStars, salvagePreview, starringOpen, starsOf, starTarget, surplus } from '../engine/systems/starring';
import { reqText } from '../engine/systems/unlocks';
import { format, formatMult, formatCount } from '../ui/format';
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
  /** 1.3.0: its slot (-1 when not worn), Polish rank and next price, and its family. */
  slot: number;
  rank: number;
  rankMax: number;
  polishCost: string;
  canPolish: boolean;
  family: string;
  familyColor: string;
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
  /** 1.3.0: slots, what's worn in each, and the families' rule. */
  slots: number;
  nextSlot: string;
  worn: Array<{ slot: number; id: string; name: string; color: string; effects: string }>;
  familyRule: string;
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
    luck: `${formatMult(stat(s, 'auraLuck'), n())}`,
    equipped: wornAuras(s).map((a) => a.name).join(', ') || 'None',
    slots: auraSlots(s),
    nextSlot: ((found) => {
      const at = RD.auras.slotsAt.find((x) => found < x);
      return at ? `Slot ${auraSlots(s) + 1} at ${at} auras found` : '';
    })(AURAS.filter((a) => auraCopies(s, a.id).gt(0)).length),
    worn: Array.from({ length: auraSlots(s) }, (_, slot) => {
      const id = slot === 0 ? s.auras.equipped : (s.auras.more ?? [])[slot - 1];
      const a = id ? AURAS.find((x) => x.id === id && auraCopies(s, x.id).gt(0)) : undefined;
      return { slot, id: a?.id ?? '', name: a?.name ?? 'Empty', color: a?.color ?? '#2B1F6E', effects: a ? a.effects.map((e) => `${pct(auraMult(s, a, e.stat) - 1)} ${word(e.stat)}`).join(' · ') : 'Wear an aura below' };
    }),
    familyRule: `Families: two worn from one family give both +${Math.round(RD.auras.familyTwo * 100)}%, three +${Math.round(RD.auras.familyThree * 100)}%.`,
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
        effects: found ? a.effects.map((e) => `${pct((e.mul - 1) * (1 + RD.auras.polishEach * auraRank(s, a.id)))} ${word(e.stat)}`).join(' · ') : 'Roll to find out',
        equipped: wornAuras(s).some((w) => w.id === a.id),
        slot: [s.auras.equipped, ...(s.auras.more ?? [])].indexOf(a.id),
        rank: auraRank(s, a.id),
        rankMax: RD.auras.polishMax,
        polishCost: format(polishCost(auraRank(s, a.id)), n()),
        canPolish: found && auraRank(s, a.id) < RD.auras.polishMax && auraCopies(s, a.id).gte(polishCost(auraRank(s, a.id))),
        family: auraFamily(a.id).name,
        familyColor: auraFamily(a.id).color,
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
    luck: `${formatMult(stat(s, 'mutationLuck'), n())}`,
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
      { name: 'Void Wyrms: a mutated Wyrm hatches that many times as strong', built: true },
      { name: 'Nursery stars: a mutated harvest is worth that many times the Essence', built: true },
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
          // 1.3.0: Wyrms and Nursery stars mutate too
          ((k) => ({ name: `Void Wyrms ${k}/${WYRM_SPECIES.length}`, color: m.color, found: k > 0 }))(WYRM_SPECIES.filter((w) => (s.mutations.others[`wyrm.${w.id}.${m.id}`] ?? 0) > 0).length),
          ((k) => ({ name: `Nursery stars ${k}/${STAR_SPECIES.length}`, color: m.color, found: k > 0 }))(STAR_SPECIES.filter((x) => (s.mutations.others[`nursery.${x.id}.${m.id}`] ?? 0) > 0).length),
        ],
      }));
    // 1.3.0: these pages listed nothing before
    case 'wyrms':
      return WYRM_FORMS.map((f, i) => ({
        name: `${f.name} Wyrms`,
        entries: WYRM_SPECIES.map((w) => {
          const found = s.wyrms.found.includes(`${w.id}|${i}`);
          return { name: found ? w.name : '???', color: w.color, found };
        }),
      }));
    case 'species':
      return [1, 2, 3].map((tier) => ({
        name: tier === 1 ? 'Base seeds' : tier === 2 ? 'Crosses' : 'Crosses of crosses',
        entries: STAR_SPECIES.filter((x) => x.tier === tier).map((x) => ({ name: s.nursery.found.includes(x.id) ? x.name : '???', color: x.color, found: s.nursery.found.includes(x.id) })),
      }));
    case 'cards':
      return CARD_RARITIES.map((r, i) => ({
        name: r.name,
        entries: CARDS.filter((c) => c.rarity === i).map((c) => ({ name: s.tarot.owned.includes(c.id) ? c.name : '???', color: r.color, found: s.tarot.owned.includes(c.id) })),
      }));
    case 'galaxies':
      return [{ name: 'The Galaxy Map', entries: GALAXIES.map((g) => ({ name: s.galactic.cleared.includes(g.id) ? g.name : s.galactic.galaxy === g.id ? `${g.name} (here)` : '???', color: g.color, found: s.galactic.cleared.includes(g.id) })) }];
    case 'engines':
      return [{ name: 'Engines', entries: ENGINES.map((e) => ({ name: e.name, color: '#FFC83D', found: (s.enginesEver[e.id] ?? 0) > 0 || (s.engines[e.id] ?? 0) > 0 })) }];
    case 'tiers':
      return [{ name: 'Star tiers', entries: TIERS.map((t, i) => ({ name: i <= Math.max(s.tier, s.stats.bestTier ?? 0) ? t.name : '???', color: t.color, found: i <= Math.max(s.tier, s.stats.bestTier ?? 0) })) }];
    case 'recipes':
      return [{ name: 'Elixirs', entries: RECIPES.map((r) => ({ name: s.alchemy.known.includes(r.id) ? r.name : '???', color: r.color, found: s.alchemy.known.includes(r.id) })) }];
    case 'parts':
      return [{ name: 'Ship parts', entries: PARTS.map((p) => ({ name: p.name, color: '#8C97C2', found: s.ships.parts.includes(p.id) })) }];
    case 'trials':
      return [{ name: 'Trials', entries: TRIALS.map((t) => ({ name: t.name, color: '#FF7A2E', found: (s.trials.levels[t.id] ?? 0) > 0 || (t.id === 'fast' && s.trials.fastBest >= 0) })) }];
    case 'leviathans':
      return [{ name: 'Void Leviathans', entries: LEVIATHANS.map((l) => ({ name: (s.leviathans.kills[l.id] ?? 0) > 0 ? l.name : '???', color: l.color, found: (s.leviathans.kills[l.id] ?? 0) > 0 })) }];
    case 'banners':
      return [{ name: 'Spire banners', entries: SPIRE_BANNERS.map((b, i) => ({ name: i < Math.floor((s.stats.spireBest ?? 0) / 10) ? b.name : `Floor ${(i + 1) * 10}`, color: b.color, found: i < Math.floor((s.stats.spireBest ?? 0) / 10) })) }];
    case 'sigils':
      return [{ name: 'Hidden Sigils', entries: SIGILS.map((x) => ({ name: s.sigils.owned.includes(x.id) ? x.name : '???', color: '#C99A1E', found: s.sigils.owned.includes(x.id) })) }];
    case 'mega':
      return MEGASTRUCTURES.map((m) => ({ name: m.name, entries: Array.from({ length: 5 }, (_, i) => ({ name: `Stage ${i + 1}`, color: '#B08A1A', found: (s.megastructures[m.id] ?? 0) > i })) }));
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
      bonus: `${formatMult(D(p.per).pow(k), n())} ${word(p.stat)} (x${p.per} at 10%, 25%, 50%, 75% and 100%)`,
    };
  });
  const id = pages.find((p) => p.id === page && p.open)?.id ?? 'runes';
  return { pages, id, groups: entries(id) };
}

/** For tests and the Stats panel: total runes in the game. */
export const RUNE_COUNT = RUNES.length;
