import { BACKGROUNDS, SKINS, TRAILS } from '../content/cosmetics';
import { MEDALS } from '../content/medals';
import type { Requirement } from '../content/requirements';
import { TIERS } from '../content/tiers';
import { cur } from '../engine/state';
import { stat } from '../engine/stats';
import { cosmeticUnlocked, wardrobeOpen, WARDROBE_REQ } from '../engine/systems/cosmetics';
import { reqText } from '../engine/systems/unlocks';
import type { PhotoCard } from '../render/photo';
import { format, formatCount, formatRate } from '../ui/format';
import { game } from './game';

/** Read-outs for the Wardrobe and Photo Mode. */
const n = () => game.state.settings.notation;
const hexOf = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

export interface WardrobeChoice {
  id: string;
  name: string;
  desc: string;
  unlocked: boolean;
  worn: boolean;
  /** What unlocks it, in words (empty once it's unlocked). */
  req: string;
  /** Colours for its little preview. */
  colors: string[];
}

const reqWords = (r: Requirement) => reqText(r, (x) => formatCount(x, n()));

export function wardrobeReport(): { open: boolean; req: string; skins: WardrobeChoice[]; trails: WardrobeChoice[]; backgrounds: WardrobeChoice[] } {
  const s = game.state;
  const tier = TIERS[Math.min(s.tier, TIERS.length - 1)]!;
  const choice = (kind: 'skin' | 'trail' | 'background', id: string, name: string, desc: string, req: Requirement, colors: string[]): WardrobeChoice => {
    const unlocked = cosmeticUnlocked(s, kind, id);
    return { id, name, desc, unlocked, worn: s.cosmetics[kind] === id, req: unlocked ? '' : reqWords(req), colors };
  };
  return {
    open: wardrobeOpen(s),
    req: reqWords(WARDROBE_REQ),
    skins: SKINS.map((k) => choice('skin', k.id, k.name, k.desc, k.req, k.palette ? [k.palette.hot, k.palette.body, k.palette.corona] : [tier.hot, tier.body, tier.corona])),
    trails: TRAILS.map((t) => choice('trail', t.id, t.name, '', t.req, t.colors.map(hexOf))),
    backgrounds: BACKGROUNDS.map((b) => choice('background', b.id, b.name, '', b.req, [b.swatch, ...b.clouds.slice(0, 3).map(hexOf)])),
  };
}

/** The numbers on a photo: your star, your speed, your medals and the deepest layers you've reached. */
export function photoCard(): PhotoCard {
  const s = game.state;
  const tier = TIERS[Math.min(s.tier, TIERS.length - 1)]!;
  const lines: Array<{ label: string; value: string }> = [
    { label: 'Stardust', value: formatRate(stat(s, 'stardustPerSec'), n()) },
    { label: 'Medals', value: `${s.achievements.length} / ${MEDALS.length}` },
  ];
  const layers: Array<[string, string]> = [
    ['multiversesAll', 'Multiverses'],
    ['crunchesAll', 'Big Crunches'],
    ['galacticsAll', 'Galactics'],
    ['singularitiesAll', 'Singularities'],
    ['nebulasAll', 'Nebulas'],
    ['supernovasAll', 'Supernovas'],
  ];
  for (const [k, label] of layers) if ((s.stats[k] ?? 0) > 0 && lines.length < 6) lines.push({ label, value: formatCount(s.stats[k] ?? 0, n()) });
  if (lines.length < 6) lines.push({ label: 'Stardust held', value: format(cur(s, 'stardust'), n()) });
  return {
    title: 'Starforge',
    subtitle: `${tier.name} · ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`,
    lines,
    footer: 'ahjhaigh-sketch.github.io/starforge',
  };
}
