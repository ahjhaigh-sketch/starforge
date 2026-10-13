import { BALANCE } from '../content/balance';
import { CURRENCY_LABEL, MEGASTRUCTURES } from '../content/galaxyBuild';
import type { Decimal } from '../engine/decimal';
import { bestGainLog, layer, milestoneReached, weakReset } from '../engine/layers';
import { cur, type GameState } from '../engine/state';
import { autoSetting, AUTO_BUYERS, autoUnlocked } from '../engine/systems/automation';
import { crunchGain, crunchReady } from '../engine/systems/crunch';
import { automating } from '../engine/systems/eternity';
import { galacticGain, galacticReady, galacticReqs, galaxyMapOpen } from '../engine/systems/galactic';
import { canBuildStage, megaOpen } from '../engine/systems/megastructures';
import { collapsePrice, mirrorKey, mirrorOpen } from '../engine/systems/mirror';
import { multiverseGain, multiverseReady, sparkFlag } from '../engine/systems/multiverse';
import { nebulaGain, nebulaReady } from '../engine/systems/nebula';
import { autoChartLinks, constellationScore, observatoryOpen, skyOf } from '../engine/systems/observatory';
import { singularityGain, singularityReady } from '../engine/systems/singularity';
import { supernovaGain, supernovaReady } from '../engine/systems/supernova';
import { TREE_SHOPS } from '../engine/systems/treeShop';
import { format } from '../ui/format';
import { game } from './game';

/**
 * 1.3.0: the Recommended card. The playtest asked for "next up" to suggest what to do: what you can
 * buy that matters, and what gets you to the next reset. One suggestion, the first rule that fits:
 *   1. a reset that's ready and worth taking (highest layer first), or a warning that it isn't yet;
 *   2. the next step towards a Galactic Rebirth;
 *   3. a tree with nodes you can afford and no auto-buyer spending on it;
 *   4. a megastructure stage you can build;
 *   5. a better constellation on tonight's sky.
 */
export interface Recommendation {
  id: string;
  title: string;
  text: string;
  icon: string;
  color: string;
  /** The panel the card opens. */
  panel: string;
}

const n = () => game.state.settings.notation;
const LABEL: Record<string, string> = { ...CURRENCY_LABEL, chronons: 'Chronons', sparks: 'Sparks' };

interface ResetCase {
  id: string;
  ready: (s: GameState) => boolean;
  gain: (s: GameState) => Decimal;
  /** Already taken care of by automation (so the card needn't mention it). */
  auto: (s: GameState) => boolean;
  icon: string;
  panel: string;
  /** What raises its gain, for the weak-reset warning. */
  buildUp: string;
}

const autoNova = (s: GameState) => {
  const a = AUTO_BUYERS.find((x) => x.id === 'auto.supernova')!;
  return autoUnlocked(s, a) && autoSetting(s, a.id).on;
};

const RESETS: readonly ResetCase[] = [
  { id: 'multiverse', ready: multiverseReady, gain: multiverseGain, auto: () => false, icon: 'spark', panel: 'multiverse', buildUp: 'Another Big Crunch adds more Sparks.' },
  { id: 'crunch', ready: crunchReady, gain: crunchGain, auto: (s) => sparkFlag(s, 'autoCrunch'), icon: 'crunch', panel: 'bigcrunch', buildUp: 'More Galactic Rebirths this Crunch run gather more Galaxy Cores, and Cores set the Chronons.' },
  { id: 'galactic', ready: galacticReady, gain: galacticGain, auto: (s) => automating(s, 'galactic'), icon: 'galaxy', panel: 'galactic', buildUp: 'Go Singularity a few more times first: Dark Matter gained this Galactic run sets the Galaxy Cores.' },
  { id: 'singularity', ready: singularityReady, gain: singularityGain, auto: (s) => automating(s, 'singularity') || (milestoneReached(s, 'galactic', 'autoSingularity') && s.galactic.autoAt.gt(0)), icon: 'darkmatter', panel: 'singularity', buildUp: 'Do a Nebula or two first: Essence gathered this Singularity run sets the Dark Matter.' },
  { id: 'nebula', ready: nebulaReady, gain: nebulaGain, auto: (s) => automating(s, 'nebula') || (milestoneReached(s, 'singularity', 'autoNebula') && s.singularity.autoAt.gt(0)), icon: 'nebula', panel: 'nebula', buildUp: 'Do more Supernovas first: shards gathered this Nebula run set the Essence.' },
  { id: 'supernova', ready: supernovaReady, gain: supernovaGain, auto: (s) => automating(s, 'supernova') || autoNova(s), icon: 'shard', panel: 'supernova', buildUp: 'Let this run go on: Stardust gathered this run sets the shards.' },
];

function resetAdvice(s: GameState): Recommendation | null {
  for (const r of RESETS) {
    const def = layer(r.id);
    if (!def || !r.ready(s) || r.auto(s)) continue;
    const g = r.gain(s);
    const money = LABEL[def.currency] ?? def.currency;
    if (weakReset(s, r.id, g)) {
      const best = bestGainLog(s, r.id) ?? 0;
      return { id: `weak.${r.id}`, title: `Build up before your next ${def.name}`, text: `It would give +${format(g, n())} ${money}; your best gave about +${format(Math_pow10(best), n())}. ${r.buildUp}`, icon: r.icon, color: '#FF7A2E', panel: r.panel };
    }
    // worth it: it at least matches what you hold, or it's the layer's first
    const have = cur(s, def.currency);
    if (bestGainLog(s, r.id) === null || g.gte(have) || r.id === 'multiverse') return { id: `go.${r.id}`, title: `${def.action} now`, text: `+${format(g, n())} ${money}, at least what you hold now.`, icon: r.icon, color: def.color, panel: r.panel };
  }
  return null;
}

const Math_pow10 = (log: number) => 10 ** Math.min(300, log);

function galacticStep(s: GameState): Recommendation | null {
  if (!galaxyMapOpen(s) || galacticReady(s) || automating(s, 'galactic')) return null;
  const r = galacticReqs(s);
  const need = BALANCE.galactic.mirrorDepth;
  if (mirrorOpen(s) && r.depth < need) {
    const price = collapsePrice(s);
    const can = price && cur(s, 'antimatter').gte(price);
    return { id: 'gal.mirror', title: 'Towards a Galactic Rebirth', text: `Collapse the anti-star in the Antimatter Mirror (${r.depth}/${need})${can ? ': you can afford the next collapse now.' : '. Build Antimatter engines to afford the next collapse.'}`, icon: 'antimatter', color: '#2A6F8F', panel: 'mirror' };
  }
  if (!mirrorKey(s)) return { id: 'gal.key', title: 'Towards a Galactic Rebirth', text: 'Find the Mirror Key among the Antimatter Mirror upgrades.', icon: 'antimatter', color: '#2A6F8F', panel: 'mirror' };
  return null;
}

function treeAdvice(s: GameState): Recommendation | null {
  for (const t of TREE_SHOPS) {
    const auto = AUTO_BUYERS.find((a) => a.tree === t.id);
    if (auto && autoUnlocked(s, auto) && autoSetting(s, auto.id).on) continue;
    const list = t.buyable(s);
    if (list.length === 0) continue;
    const money = LABEL[t.currency] ?? t.currency;
    return { id: `tree.${t.id}`, title: `Spend your ${money}`, text: `${list.length === 1 ? 'A node' : `${list.length} nodes`} in the ${t.name} ${list.length === 1 ? 'is' : 'are'} affordable now.`, icon: t.id === 'starchart' ? 'telescope' : 'tree', color: '#3F7A12', panel: t.id };
  }
  return null;
}

function megaAdvice(s: GameState): Recommendation | null {
  for (const m of MEGASTRUCTURES) {
    if (!megaOpen(s, m) || !canBuildStage(s, m)) continue;
    return { id: `mega.${m.id}`, title: `Build the ${m.name}`, text: 'You can afford its next stage, and every stage is yours for good.', icon: 'mega', color: '#B08A1A', panel: 'megastructures' };
  }
  return null;
}

let autoSky: { seed: number; score: number } | null = null;
function skyAdvice(s: GameState): Recommendation | null {
  if (!observatoryOpen(s)) return null;
  if (autoSky?.seed !== s.observatory.seed) autoSky = { seed: s.observatory.seed, score: constellationScore(skyOf(s), autoChartLinks(s)) };
  const gain = Math.floor(autoSky.score) - Math.floor(s.observatory.best);
  if (gain < 1) return null;
  return { id: 'sky', title: 'Chart tonight’s sky', text: `Auto-draw in the Observatory, then Record: +${gain} Star Charts.`, icon: 'telescope', color: '#5B45C2', panel: 'observatory' };
}

export function recommend(s: GameState): Recommendation | null {
  return resetAdvice(s) ?? galacticStep(s) ?? treeAdvice(s) ?? megaAdvice(s) ?? skyAdvice(s);
}
