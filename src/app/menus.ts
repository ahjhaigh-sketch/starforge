import { SYSTEMS } from '../content/systems';
import type { GameState } from '../engine/state';
import { ENGINES } from '../content/engines';
import { milestoneReached } from '../engine/layers';
import { AUTO_BUYERS, autoSetting, autoUnlocked } from '../engine/systems/automation';
import { wardrobeOpen } from '../engine/systems/cosmetics';
import { automating } from '../engine/systems/eternity';
import { game } from './game';

/**
 * 1.2.0: which menus the rails show. You can hide any menu but these three (always at hand), and
 * menus that run themselves tuck away by themselves once you're past them (switch that off, or show
 * one again, in Settings). A just-unlocked menu always shows until you've opened it.
 */
export const NEVER_HIDE: ReadonlySet<string> = new Set(['starforge', 'novatree', 'fusion']);

const on = (s: GameState, id: string) => {
  const a = AUTO_BUYERS.find((x) => x.id === id);
  return !!a && autoUnlocked(s, a) && autoSetting(s, id).on;
};

/** Why a menu can tuck itself away (it runs itself), or null while it still needs you. */
export function runsItself(s: GameState, id: string): string | null {
  switch (id) {
    case 'automation': {
      // every Supernova auto-buyer earned, and no new one waiting for you to switch it on
      if (!milestoneReached(s, 'supernova', 'autoAll') && !automating(s, 'stardust')) return null;
      const waiting = AUTO_BUYERS.some((a) => autoUnlocked(s, a) && a.defaultOn === false && !s.auto[a.id]);
      return waiting ? null : 'every auto-buyer you have is set up';
    }
    case 'upgrades':
      return on(s, 'auto.upgrades') ? 'the Upgrades auto-buyer buys them' : null;
    case 'orbitals':
      return on(s, 'auto.planets') ? 'Auto-planets builds and levels them' : null;
    case 'belt':
      return on(s, 'auto.belt') ? 'Auto-Belt buys its upgrades and tiers' : null;
    case 'constants':
      return on(s, 'auto.constants') ? 'Auto-Constants steps them up every minute' : null;
    case 'wardrobe':
      return wardrobeOpen(s) && s.seen.includes('wardrobe') ? 'it lives in the Medals menu' : null;
    default:
      return null;
  }
}

/** Off the rails: hidden by you, or tucked away because it runs itself (unless you showed it again). */
export function menuHidden(s: GameState, id: string): boolean {
  if (NEVER_HIDE.has(id)) return false;
  const st = s.settings;
  if (st.hiddenMenus.includes(id)) return true;
  return st.autoHideMenus && !st.shownMenus.includes(id) && s.seen.includes(id) && runsItself(s, id) !== null;
}

/** Every engine has its auto-buyer, switched on. */
export function enginesAutomated(s: GameState): boolean {
  return (milestoneReached(s, 'supernova', 'autoAll') || automating(s, 'stardust')) && ENGINES.every((e) => on(s, `auto.${e.id}`));
}

/**
 * How the engine list shows: full rows, compact rows, or minimized to one line. By default (auto)
 * it minimizes once every engine buys itself, so the big things get the room; Show opens it again.
 */
export function engineView(s: GameState): 'full' | 'compact' | 'min' {
  const mode = s.settings.engineList;
  if (mode !== 'auto') return mode;
  return enginesAutomated(s) ? 'min' : 'full';
}

/** Kept for the tests and the snapshot's compact flag. */
export const enginesCompact = (s: GameState): boolean => engineView(s) !== 'full';

export interface MenuRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** 'shown', 'hidden' (by you), 'tucked' (runs itself), 'always' (can't be hidden). */
  state: 'shown' | 'hidden' | 'tucked' | 'always';
  why: string;
}

/** Every menu you have, for Settings. */
export function menuRows(s: GameState): MenuRow[] {
  return SYSTEMS.filter((x) => x.built && s.unlocked.includes(x.id)).map((x) => {
    const why = runsItself(s, x.id);
    const state: MenuRow['state'] = NEVER_HIDE.has(x.id)
      ? 'always'
      : s.settings.hiddenMenus.includes(x.id)
        ? 'hidden'
        : menuHidden(s, x.id)
          ? 'tucked'
          : 'shown';
    return { id: x.id, name: x.name, icon: x.icon, color: x.color, state, why: state === 'tucked' ? `Tucked away: ${why}` : state === 'always' ? 'Always on the rails' : why && s.settings.shownMenus.includes(x.id) ? `Runs itself (${why}), shown because you asked` : '' };
  });
}

/** Hides a menu, or shows it again (an automated one stays shown until you hide it). */
export function setMenuHidden(s: GameState, id: string, hide: boolean): void {
  const st = s.settings;
  if (NEVER_HIDE.has(id)) return;
  st.hiddenMenus = st.hiddenMenus.filter((x) => x !== id);
  st.shownMenus = st.shownMenus.filter((x) => x !== id);
  if (hide) st.hiddenMenus.push(id);
  else if (runsItself(s, id)) st.shownMenus.push(id);
}

/** Parts of the screen you can hide in Settings (each is a data-hide word on the page). */
export const HUD_PARTS: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'focus', name: 'Focus cards' },
  { id: 'teasers', name: 'Coming up' },
  { id: 'buffs', name: 'Boosts' },
  { id: 'autobars', name: 'Bars that run themselves' },
  { id: 'evolve', name: 'Evolve button' },
  { id: 'caption', name: 'Star name and combo' },
  { id: 'floaters', name: 'Tap numbers' },
  { id: 'attune', name: 'Attunement chips' },
  { id: 'tier', name: 'Tier pill' },
  { id: 'save', name: 'Saved note' },
  // 1.3.0: the engines' machines circling the star
  { id: 'machines', name: 'Engine machines round the star' },
];

export function toggleHud(s: GameState, id: string): void {
  if (!HUD_PARTS.some((p) => p.id === id)) return;
  const list = s.settings.hiddenHud;
  s.settings.hiddenHud = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/** Settings' Menus list (a stable builder for useReport). */
export const menusReport = (): MenuRow[] => menuRows(game.state);
