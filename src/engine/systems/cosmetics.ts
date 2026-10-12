import { BACKGROUND_BY_ID, SKIN_BY_ID, TRAIL_BY_ID } from '../../content/cosmetics';
import type { Requirement } from '../../content/requirements';
import type { GameState } from '../state';
import { reqMet } from './unlocks';

/**
 * The Wardrobe (Ideas menu 4): star skins, cursor trails and backgrounds. Purely how the game looks:
 * nothing here changes a number. A choice is unlocked by its requirement (medals or a stat), worked
 * out every time, so no reset can take one away; only the current choices are saved.
 */
export type CosmeticKind = 'skin' | 'trail' | 'background';

/** The Wardrobe opens at 10 medals. */
export const WARDROBE_REQ: Requirement = { kind: 'medals', count: 10 };
export const wardrobeOpen = (s: GameState) => reqMet(s, WARDROBE_REQ);

const DEFS = { skin: SKIN_BY_ID, trail: TRAIL_BY_ID, background: BACKGROUND_BY_ID } as const;

export function cosmeticUnlocked(s: GameState, kind: CosmeticKind, id: string): boolean {
  const def = DEFS[kind].get(id);
  return !!def && reqMet(s, def.req);
}

/** Wears an unlocked choice. Returns false for an unknown or locked one. */
export function setCosmetic(s: GameState, kind: CosmeticKind, id: string): boolean {
  if (!cosmeticUnlocked(s, kind, id)) return false;
  s.cosmetics[kind] = id;
  return true;
}
