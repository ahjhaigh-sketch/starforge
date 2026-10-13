import { BALANCE } from '../../content/balance';
import { GALAXIES } from '../../content/galactic';
import { RARITIES } from '../../content/belt';
import { ELEMENTS } from '../../content/elements';
import { RELICS } from '../../content/forge';
import { RUNES } from '../../content/runes';
import { AURAS, INDEX_PAGES, MUTATIONS, type IndexPage } from '../../content/runeDepth';
import { D } from '../decimal';
import type { GameState } from '../state';
import { registerSources } from '../stats';
import { auraCopies } from './auras';
import { mutationsFound } from './mutations';
import { reqMet } from './unlocks';
import { WYRM_FORMS, WYRM_SPECIES } from '../../content/wyrms';
import { STAR_SPECIES } from '../../content/nursery';
import { CARDS } from '../../content/nebulaExtras';
import { ENGINES } from '../../content/engines';
import { TIERS } from '../../content/tiers';
import { RECIPES } from '../../content/alchemy';
import { PARTS } from '../../content/shipParts';
import { LEVIATHANS, SPIRE_BANNERS, TRIALS } from '../../content/challenges';
import { SIGILS } from '../../content/sigils';
import { MEGASTRUCTURES } from '../../content/galaxyBuild';
import { MIRACLES, RITES } from '../../content/beyond';

/**
 * The Index (Game design: "Across the whole game"): a collection book of every rune, aura,
 * element, relic and mutation, with pages for Wyrms, star species, cards and galaxies waiting for
 * their systems. Each page multiplies one stat once for every completion milestone it passes
 * (10%, 25%, 50%, 75%, 100%), and that shows in the stat breakdowns as "Index: <page>".
 */
const MILESTONES = BALANCE.runeDepth.indexMilestones;

export const indexOpen = (s: GameState) => (s.stats.nebulasAll ?? 0) >= BALANCE.runeDepth.opens.index;

export function pageOpen(s: GameState, p: IndexPage): boolean {
  return p.built && indexOpen(s) && reqMet(s, p.req);
}

/** How many of the page's entries you have, out of how many. */
export function pageCount(s: GameState, id: string): { found: number; total: number } {
  switch (id) {
    case 'runes':
      return { found: RUNES.filter((r) => (s.runes.copies[r.id] ?? D(0)).gt(0)).length, total: RUNES.length };
    case 'auras':
      return { found: AURAS.filter((a) => auraCopies(s, a.id).gt(0)).length, total: AURAS.length };
    case 'elements':
      return { found: ELEMENTS.filter((e) => (s.codex[e.id] ?? 0) > 0).length, total: ELEMENTS.length };
    case 'relics':
      return { found: RELICS.filter((r) => (s.relics.levels[r.id] ?? 0) > 0).length, total: RELICS.length };
    case 'mutations':
      return { found: mutationsFound(s), total: MUTATIONS.length * (RUNES.length + RARITIES.length + WYRM_SPECIES.length + STAR_SPECIES.length) };
    case 'wyrms':
      return { found: s.wyrms.found.length, total: WYRM_SPECIES.length * WYRM_FORMS.length };
    case 'species':
      return { found: s.nursery.found.length, total: STAR_SPECIES.length };
    case 'cards':
      return { found: s.tarot.owned.length, total: CARDS.length };
    case 'galaxies':
      return { found: s.galactic.cleared.length, total: GALAXIES.length };
    case 'engines':
      return { found: ENGINES.filter((e) => (s.enginesEver[e.id] ?? 0) > 0 || (s.engines[e.id] ?? 0) > 0).length, total: ENGINES.length };
    case 'tiers':
      return { found: Math.min(TIERS.length, Math.max(s.tier, s.stats.bestTier ?? 0) + 1), total: TIERS.length };
    case 'recipes':
      return { found: s.alchemy.known.length, total: RECIPES.length };
    case 'parts':
      return { found: s.ships.parts.length, total: PARTS.length };
    case 'trials':
      return { found: TRIALS.filter((t) => (s.trials.levels[t.id] ?? 0) > 0 || (t.id === 'fast' && s.trials.fastBest >= 0)).length, total: TRIALS.length };
    case 'leviathans':
      return { found: LEVIATHANS.filter((l) => (s.leviathans.kills[l.id] ?? 0) > 0).length, total: LEVIATHANS.length };
    case 'banners':
      return { found: Math.min(SPIRE_BANNERS.length, Math.floor((s.stats.spireBest ?? 0) / 10)), total: SPIRE_BANNERS.length };
    case 'sigils':
      return { found: s.sigils.owned.length, total: SIGILS.length };
    case 'mega':
      return { found: MEGASTRUCTURES.reduce((t, m) => t + Math.min(5, s.megastructures[m.id] ?? 0), 0), total: MEGASTRUCTURES.length * 5 };
    case 'rites':
      return { found: s.pantheon.rites.length, total: RITES.length };
    case 'miracles':
      return { found: s.lives.miracles.length, total: MIRACLES.length };
    default:
      return { found: 0, total: 0 };
  }
}

/** Completion milestones passed (0 to 5). */
export function pageMilestones(s: GameState, p: IndexPage): number {
  if (!pageOpen(s, p)) return 0;
  const { found, total } = pageCount(s, p.id);
  if (total === 0) return 0;
  return MILESTONES.filter((m) => found >= Math.ceil(m * total)).length;
}

export function registerIndex(): void {
  registerSources(
    ...INDEX_PAGES.filter((p) => p.built).map((p) => ({
      id: `index.${p.id}`,
      stat: p.stat,
      op: 'mul' as const,
      label: `Index: ${p.name}`,
      value: (s: GameState) => D(p.per).pow(pageMilestones(s, p)),
      active: (s: GameState) => pageMilestones(s, p) > 0,
    })),
  );
}
