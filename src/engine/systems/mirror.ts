import { BALANCE } from '../../content/balance';
import { ANTIMATTER_ENGINES, MIRROR_DEPTHS, MIRROR_UPGRADE_BY_ID, MIRROR_UPGRADES, type MirrorUpgrade } from '../../content/mirror';
import { D, type Decimal } from '../decimal';
import { makeEngineLayer } from '../engineKit';
import { events } from '../events';
import { milestoneReached } from '../layers';
import { cur, type GameState, spend } from '../state';
import { defineStat, invalidateStats, registerSources, stat, type StatSource } from '../stats';
import { masteryRank } from './mastery';

/**
 * The Antimatter Mirror (Game design: "Singularity"; UUT's Anti-World). It appears at Singularity
 * milestone 8 and is never reset by a Singularity.
 * - The Stardust layer's own engine code (engineKit) with the Mirror's data: 10 Antimatter engines,
 *   the Stardust top ten in reverse, whose milestones slow price growth instead of doubling output.
 * - The anti-star makes 1 Antimatter a second by itself; each Antimatter engine is boosted by its
 *   Stardust twin's Mastery rank.
 * - Collapse the anti-star down the Star Tiers, White Hole to Protostar: 11 steps, each Antimatter x3
 *   for good, and each scraps the Antimatter engines (ever-owned counts stay, so none hide again).
 * - Mirror upgrades bring Antimatter back to the main game (Dark Matter, Essence, game speed); the
 *   last is the Mirror Key that Galactic Rebirth asks for.
 */
const M = BALANCE.mirror;

export const mirrorOpen = (s: GameState) => milestoneReached(s, 'singularity', 'mirror');
export const hasMirrorUpgrade = (s: GameState, id: string) => s.mirror.upgrades.includes(id);
export const mirrorKey = (s: GameState) => hasMirrorUpgrade(s, 'mu.key');

export const MIRROR_ENGINES = makeEngineLayer({
  id: 'mirror',
  label: 'Antimatter',
  currency: 'antimatter',
  engines: ANTIMATTER_ENGINES,
  brackets: M.brackets,
  owned: (s) => s.mirror.engines,
  ever: (s) => s.mirror.ever,
  stats: { engineMult: 'amEngineMult.', layerMult: 'antimatterMult', perSec: 'antimatterPerSec', costMult: 'amCostMult' },
  open: mirrorOpen,
  onBuy: (s, _id, count) => {
    s.stats.amEnginesBought = (s.stats.amEnginesBought ?? 0) + count;
  },
  order: 11,
});

/** The owned count where an Antimatter engine's price growth next slows (its next "milestone"). */
export function nextPriceStep(owned: number): number | undefined {
  return M.brackets.find((b) => b.from > owned)?.from;
}

export function twinMult(s: GameState, twin: string): number {
  const per = M.twinBoost * (hasMirrorUpgrade(s, 'mu.twins') ? 2 : 1);
  return 1 + per * masteryRank(s, twin);
}

/** The price of the next collapse, or null at the bottom (Protostar). */
export function collapsePrice(s: GameState): Decimal | null {
  const next = MIRROR_DEPTHS[s.mirror.depth];
  return next ? D(next.cost) : null;
}

export function collapse(s: GameState): boolean {
  const price = collapsePrice(s);
  if (!mirrorOpen(s) || !price || !spend(s, 'antimatter', price)) return false;
  s.mirror.depth += 1;
  // inverted: evolving keeps your engines, collapsing scraps them (the Antimatter left over stays)
  s.mirror.engines = {};
  s.stats.mirrorDepth = Math.max(s.stats.mirrorDepth ?? 0, s.mirror.depth);
  invalidateStats();
  events.emit({ t: 'toast', title: 'The anti-star collapses', body: `Down to ${MIRROR_DEPTHS[s.mirror.depth - 1]!.name}: Antimatter x${depthMult(s)} more.`, icon: 'antimatter' });
  return true;
}

export const depthMult = (s: GameState) => (hasMirrorUpgrade(s, 'mu.deep') ? M.deepMult : M.depthMult);

export function canBuyMirrorUpgrade(s: GameState, u: MirrorUpgrade): boolean {
  return mirrorOpen(s) && !hasMirrorUpgrade(s, u.id) && s.mirror.depth >= u.depth && cur(s, 'antimatter').gte(u.cost);
}

export function buyMirrorUpgrade(s: GameState, id: string): boolean {
  const u = MIRROR_UPGRADE_BY_ID.get(id);
  if (!u || !canBuyMirrorUpgrade(s, u) || !spend(s, 'antimatter', D(u.cost))) return false;
  s.mirror.upgrades.push(id);
  s.stats.mirrorUpgrades = s.mirror.upgrades.length;
  invalidateStats();
  if (id === 'mu.key') events.emit({ t: 'toast', title: 'The Mirror Key', body: 'The way to Galactic Rebirth is open.', icon: 'antimatter', priority: true });
  else events.emit({ t: 'purchase', kind: 'mirrorUpgrade', id, amount: 1 });
  return true;
}

function upgradeSource(u: MirrorUpgrade): StatSource | null {
  const e = u.effect;
  const base = { id: `mirror.${u.id}`, label: `${u.name} (Mirror)`, active: (s: GameState) => hasMirrorUpgrade(s, u.id) };
  switch (e.kind) {
    case 'mult':
      return { ...base, stat: e.stat, op: 'mul', value: () => D(e.value) };
    case 'add':
      return { ...base, stat: e.stat, op: 'add', value: () => D(e.value) };
    case 'logStardust':
      return { ...base, stat: e.stat, op: 'mul', value: (s) => D(1).add(cur(s, 'stardust').add(1).log10()).pow(e.pow) };
    case 'logAntimatter':
      return { ...base, stat: e.stat, op: 'mul', value: (s) => D(1).add(cur(s, 'antimatter').add(1).log10().mul(e.per)) };
    case 'powAntimatter':
      return { ...base, stat: e.stat, op: 'mul', value: (s) => cur(s, 'antimatter').add(1).pow(e.pow) };
    case 'flag':
      return null;
  }
}

export function registerMirror(): void {
  defineStat({ id: 'antimatterPerSec', label: 'Antimatter per second', base: () => D(0) });
  defineStat({ id: 'antimatterMult', label: 'Antimatter multiplier', base: () => D(1) });
  defineStat({ id: 'amCostMult', label: 'Antimatter engine prices', base: () => D(1) });
  MIRROR_ENGINES.register();
  registerSources(
    { id: 'mirror.anchor', stat: 'antimatterPerSec', op: 'add', label: 'The anti-star', value: () => D(M.anchorProd), active: mirrorOpen },
    { id: 'mirror.depth', stat: 'antimatterMult', op: 'mul', label: 'Collapse depth', value: (s) => D(depthMult(s)).pow(s.mirror.depth), active: (s) => s.mirror.depth > 0 },
    ...ANTIMATTER_ENGINES.map(
      (e): StatSource => ({
        id: `mirror.twin.${e.id}`,
        stat: `amEngineMult.${e.id}`,
        op: 'mul',
        label: 'Stardust twin (Mastery)',
        value: (s) => D(twinMult(s, e.twin)),
        active: (s) => masteryRank(s, e.twin) > 0,
      }),
    ),
  );
  for (const u of MIRROR_UPGRADES) {
    const src = upgradeSource(u);
    if (src) registerSources(src);
  }
}

export const antimatterRate = (s: GameState): Decimal => (mirrorOpen(s) ? stat(s, 'antimatterPerSec') : D(0));
