import { SIGILS, type SigilTree } from '../content/sigils';
import { cur } from '../engine/state';
import { sigilOn, sigilOwned, sigilPlace, sigilPrice, sigilRevealed } from '../engine/systems/sigils';
import type { TreeNodeView } from '../ui/tree/TreeView';
import { format } from '../ui/format';
import { game } from './game';

/** Read-outs for the Hidden Sigils: a glyph in its tree once found, and the Sigil Altar. */
const n = () => game.state.settings.notation;
const GLYPH = '#6B4BC8';

/** Adds a tree's sigil (once it shows) to that tree's nodes, linked to the two beside it. */
export function withSigil(tree: SigilTree, nodes: TreeNodeView[], edges: Array<[string, string]>): void {
  const s = game.state;
  for (const def of SIGILS) {
    if (def.tree !== tree || !sigilRevealed(s, def)) continue;
    const owned = sigilOwned(s, def.id);
    const price = sigilPrice(s, def);
    const { x, y } = sigilPlace(def);
    nodes.push({
      id: def.id,
      x,
      y,
      name: def.name,
      desc: `A hidden sigil. ${def.boon}; ${def.bane}. Switch it on and off at the Sigil Altar.`,
      state: owned ? 'owned' : cur(s, def.currency).gte(price) ? 'affordable' : 'available',
      color: GLYPH,
      cost: owned ? '' : format(price, n()),
      level: owned ? 1 : 0,
      repeat: false,
    });
    for (const b of def.between) edges.push([b, def.id]);
  }
}

export function altarReport() {
  const s = game.state;
  return {
    sigils: SIGILS.map((def) => {
      const shown = sigilRevealed(s, def);
      return {
        id: def.id,
        name: shown ? def.name : 'An unknown sigil',
        where: def.treeName,
        boon: shown ? def.boon : '',
        bane: shown ? def.bane : '',
        owned: sigilOwned(s, def.id),
        on: sigilOn(s, def.id),
        shown,
      };
    }),
    owned: s.sigils.owned.length,
    on: s.sigils.on.length,
  };
}
