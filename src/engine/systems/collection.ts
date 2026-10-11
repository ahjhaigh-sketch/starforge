import { BALANCE } from '../../content/balance';
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
