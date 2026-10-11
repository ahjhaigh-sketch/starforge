import { BALANCE } from '../../content/balance';
import { ELEMENTS, type ElementDef, type Family, FAMILY_NAMES } from '../../content/elements';
import { TIERS } from '../../content/tiers';
import { D, type Decimal, ONE } from '../decimal';
import { events } from '../events';
import type { GameState } from '../state';
import { registerSources } from '../stats';
import { forgeOpen } from './forge';

/**
 * The Element Codex. Each Supernova grants floor(1 + log10(S / 1e7)) samples of every element the
 * star could fuse at the tier it reached, so pushing the star higher before resetting unlocks
 * heavier elements. An element's level is floor(log2(samples)) + 1; each family turns the levels
 * of its elements into one perk, and a completed row of the table gives x1.5.
 */
const C = BALANCE.codex;

/** The heaviest element (atomic number) a star of this tier can fuse. */
export const maxZForTier = (tier: number): number => C.tierMaxZ[Math.max(0, Math.min(tier, C.tierMaxZ.length - 1))]!;

/** Samples of each element one Supernova gives, from the Stardust gathered that run. */
export function samplesFor(runStardust: Decimal): number {
  if (runStardust.lt(C.samplesAt)) return 0;
  return Math.floor(1 + runStardust.div(C.samplesAt).log10().toNumber());
}

export const samples = (s: GameState, id: string) => s.codex[id] ?? 0;

/**
 * Samples stop at 2^50 (element level 51). Late in the game starships bring home billions of
 * rare finds a tick, and past 2^53 a plain number can't count whole samples, so the save refused
 * it and the game stopped saving (found by the simulator).
 */
export const MAX_SAMPLES = 2 ** 50;
export function addSamples(s: GameState, id: string, n: number): void {
  s.codex[id] = Math.min(MAX_SAMPLES, samples(s, id) + Math.max(0, Math.floor(n)));
}
export const elementLevel = (s: GameState, id: string): number => {
  const n = samples(s, id);
  return n <= 0 ? 0 : Math.floor(Math.log2(n)) + 1;
};

const BY_FAMILY = new Map<Family, ElementDef[]>();
const BY_PERIOD = new Map<number, ElementDef[]>();
for (const e of ELEMENTS) {
  BY_FAMILY.set(e.family, [...(BY_FAMILY.get(e.family) ?? []), e]);
  BY_PERIOD.set(e.period, [...(BY_PERIOD.get(e.period) ?? []), e]);
}

export const familyLevels = (s: GameState, f: Family) => (BY_FAMILY.get(f) ?? []).reduce((a, e) => a + elementLevel(s, e.id), 0);
export const rowComplete = (s: GameState, period: number) => (BY_PERIOD.get(period) ?? []).every((e) => samples(s, e.id) > 0);
export const rowElements = (period: number) => BY_PERIOD.get(period) ?? [];
export const elementsFound = (s: GameState) => ELEMENTS.reduce((a, e) => a + (samples(s, e.id) > 0 ? 1 : 0), 0);

/** What a Supernova right now would add to the Codex. */
export function codexPreview(s: GameState, runStardust: Decimal, tier: number): { each: number; upTo: ElementDef | undefined; count: number; tierName: string } {
  const z = maxZForTier(tier);
  return { each: samplesFor(runStardust), upTo: ELEMENTS[z - 1], count: z, tierName: TIERS[tier]?.name ?? '' };
}

/** Grants a Supernova's samples. Returns how many elements were seen for the first time. */
export function grantCodex(s: GameState, runStardust: Decimal, tier: number): number {
  const each = samplesFor(runStardust);
  // the Codex is part of the Starforge: samples start once it opens
  if (each <= 0 || !forgeOpen(s)) return 0;
  const rowsBefore = [1, 2, 3, 4, 5, 6, 7].filter((p) => rowComplete(s, p)).length;
  let fresh = 0;
  for (const e of ELEMENTS) {
    if (e.z > maxZForTier(tier)) break;
    if (samples(s, e.id) === 0) fresh++;
    addSamples(s, e.id, each);
  }
  s.stats.elements = elementsFound(s);
  const rows = [1, 2, 3, 4, 5, 6, 7].filter((p) => rowComplete(s, p)).length;
  s.stats.codexRows = rows;
  if (fresh > 0) events.emit({ t: 'milestone', id: `codex.${fresh}` });
  if (rows > rowsBefore) events.emit({ t: 'milestone', id: `codexRow.${rows}` });
  return fresh;
}

type Kind = 'mul' | 'add' | 'reduce';
const asValue = (kind: Kind, x: number): Decimal => (kind === 'add' ? D(x) : kind === 'mul' ? D(1 + x) : ONE.div(1 + x));

export function registerCodex(): void {
  const families = C.families as Record<Family, { stat: string; kind: Kind; per: number }>;
  registerSources(
    ...(Object.keys(families) as Family[]).map((f) => ({
      id: `codex.${f}`,
      stat: families[f].stat,
      op: families[f].kind === 'add' ? ('add' as const) : ('mul' as const),
      label: `Codex: ${FAMILY_NAMES[f]}`,
      value: (s: GameState) => asValue(families[f].kind, families[f].per * familyLevels(s, f)),
      active: (s: GameState) => familyLevels(s, f) > 0,
    })),
    ...C.rowStats.flatMap((statsForRow, i) =>
      statsForRow.map((st) => ({
        id: `codex.row${i + 1}.${st}`,
        stat: st,
        op: 'mul' as const,
        label: `Codex: row ${i + 1} complete`,
        value: () => D(C.rowMult),
        active: (s: GameState) => rowComplete(s, i + 1),
      })),
    ),
    { id: 'codex.fe', stat: 'relicSlots', op: 'add', label: 'Codex: Iron', value: () => ONE, active: (s) => samples(s, 'fe') > 0 },
    { id: 'codex.au', stat: 'alloyGain.gold', op: 'mul', label: 'Codex: Gold', value: () => D(C.goldAlloyMult), active: (s) => samples(s, 'au') > 0 },
    { id: 'codex.u', stat: 'shardGain', op: 'mul', label: 'Codex: Uranium', value: (s) => D(1 + C.uraniumPerLevel * elementLevel(s, 'u')), active: (s) => samples(s, 'u') > 0 },
  );
}
