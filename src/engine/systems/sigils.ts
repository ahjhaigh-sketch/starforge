import { BALANCE } from '../../content/balance';
import { NEBULA_TREE } from '../../content/nebulaTree';
import { NOVA_TREE } from '../../content/novaTree';
import { SIGIL_BY_ID, SIGILS, type SigilDef, type SigilTree } from '../../content/sigils';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import { type GameState, spend } from '../state';
import { invalidateStats, registerSources } from '../stats';
import { galacticTree } from './galactic';
import { scaleTree } from './leviathans';
import { sparkTree } from './multiverse';
import { ownsNebulaNode } from './nebulaTree';
import { ownsNode } from './novaTree';
import { starChart } from './observatory';
import { singularityTree } from './singularity';

/**
 * The Hidden Sigils (Ideas menu 17). A sigil shows in its tree once you own both nodes beside its
 * hiding place, and is bought with that tree's currency: ten times what those two nodes cost, x100
 * for every sigil you already own. Bought sigils are kept for good, through every reset, and switch
 * on and off for free at the Sigil Altar.
 */
const G = BALANCE.sigils;

interface Place {
  owns: (s: GameState, id: string) => boolean;
  node: (id: string) => { x: number; y: number; cost: number } | undefined;
}

const fromList = (list: ReadonlyArray<{ id: string; x: number; y: number; cost: number }>) => {
  const m = new Map(list.map((n) => [n.id, n]));
  return (id: string) => m.get(id);
};
const kit = (t: typeof galacticTree): Place => ({ owns: t.owns, node: (id) => t.byId.get(id) });

export const SIGIL_TREES: Record<SigilTree, Place> = {
  nova: { owns: ownsNode, node: fromList(NOVA_TREE) },
  nebula: { owns: ownsNebulaNode, node: fromList(NEBULA_TREE) },
  singularityTree: kit(singularityTree),
  galacticTree: kit(galacticTree),
  scaleTree: kit(scaleTree),
  starChart: kit(starChart),
  sparkTree: kit(sparkTree),
};

export const sigilOwned = (s: GameState, id: string) => s.sigils.owned.includes(id);
export const sigilOn = (s: GameState, id: string) => s.sigils.on.includes(id);

/** Shown once both nodes beside it are owned (and for good once bought). */
export function sigilRevealed(s: GameState, def: SigilDef): boolean {
  if (sigilOwned(s, def.id)) return true;
  const t = SIGIL_TREES[def.tree];
  return def.between.every((id) => t.owns(s, id));
}

/** Where it hides: beside the midpoint of its two nodes (the tree view's own coordinates). */
export function sigilPlace(def: SigilDef): { x: number; y: number } {
  const t = SIGIL_TREES[def.tree];
  const a = t.node(def.between[0])!;
  const b = t.node(def.between[1])!;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: Math.round((a.x + b.x) / 2 + ((a.y - b.y) / len) * G.offset), y: Math.round((a.y + b.y) / 2 + ((b.x - a.x) / len) * G.offset) };
}

export function sigilPrice(s: GameState, def: SigilDef): Decimal {
  const t = SIGIL_TREES[def.tree];
  const base = def.between.reduce((sum, id) => sum + (t.node(id)?.cost ?? 0), 0);
  return D(G.priceMult).mul(base).mul(D(G.priceGrowth).pow(s.sigils.owned.length));
}

export function buySigil(s: GameState, id: string): boolean {
  const def = SIGIL_BY_ID.get(id);
  if (!def || sigilOwned(s, id) || !sigilRevealed(s, def) || !spend(s, def.currency, sigilPrice(s, def))) return false;
  s.sigils.owned.push(id);
  s.sigils.on.push(id);
  s.stats.sigils = s.sigils.owned.length;
  invalidateStats();
  events.emit({ t: 'purchase', kind: 'sigil', id, amount: 1 });
  return true;
}

/** Switches an owned sigil on or off, free. */
export function toggleSigil(s: GameState, id: string): boolean {
  if (!sigilOwned(s, id)) return false;
  s.sigils.on = sigilOn(s, id) ? s.sigils.on.filter((x) => x !== id) : [...s.sigils.on, id];
  invalidateStats();
  return true;
}

export function registerSigils(): void {
  registerSources(
    ...SIGILS.flatMap((def) =>
      def.effects.map((e) => ({
        id: `${def.id}.${e.stat}`,
        stat: e.stat,
        op: e.op,
        label: def.name,
        value: () => D(e.value),
        active: (s: GameState) => sigilOn(s, def.id),
      })),
    ),
  );
}
