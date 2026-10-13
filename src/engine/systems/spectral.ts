import { BALANCE } from '../../content/balance';
import { SPECTRAL, SPECTRAL_BY_ID } from '../../content/nebulaExtras';
import { planLimited, type PurchasePlan } from '../buy';
import { type CostCurve, lateRamp } from '../cost';
import { D, type Decimal, ZERO } from '../decimal';
import { cur, type GameState, spend, usable } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';

/**
 * Spectral Focus (Game design: "More mid systems", Upgradex's Wavelengths). From 5 Nebulas the
 * nebula's seven colours build energy, one in focus at a time (Afterglow lets the others build a
 * little too). Every order of magnitude of a colour's energy is one more step of its bonus, from
 * exactly 10, 100, 1,000 and so on. Violet instead adds an effective order of magnitude to the
 * Supernova and Nebula formula inputs for every 2 of its own. Energy never falls, and each colour
 * opens once the one before it reaches 1,000.
 */
const SP = BALANCE.spectral;

export const spectralOpen = (s: GameState) => (s.stats.nebulasAll ?? 0) >= SP.nebulas;
export const energyOf = (s: GameState, id: string): Decimal => s.spectral.energy[id] ?? ZERO;
export const spectralLevel = (s: GameState, id: string) => s.spectral.upgrades[id] ?? 0;

/** Whole orders of magnitude: 0 below 10, then exactly 1 at 10, 2 at 100, and so on. */
export function oom(e: Decimal): number {
  if (e.lt(10)) return 0;
  let n = Math.floor(e.log10().toNumber());
  // float log10 can land a hair under a power of ten: settle it against the powers themselves
  while (n > 0 && e.lt(D(10).pow(n))) n--;
  while (e.gte(D(10).pow(n + 1))) n++;
  return n;
}

export function colorOpen(s: GameState, id: string): boolean {
  const i = SPECTRAL.findIndex((c) => c.id === id);
  if (i < 0 || !spectralOpen(s)) return false;
  return i === 0 || energyOf(s, SPECTRAL[i - 1]!.id).gte(SP.unlockAt);
}

/** Energy a second for the colour in focus. */
export function focusRate(s: GameState): Decimal {
  const essence = s.totals.all.essence ?? ZERO;
  return essence.add(1).pow(SP.essencePow).mul(D(SP.lens[2]).pow(spectralLevel(s, 'lens'))).mul(stat(s, 'spectralSpeed'));
}

/** Share of the focus rate every other open colour gets. */
export const afterglowShare = (s: GameState) => SP.afterglow[2] * spectralLevel(s, 'afterglow');

export function setFocus(s: GameState, id: string | null): boolean {
  if (id === null) {
    s.spectral.focus = null;
    return true;
  }
  if (!SPECTRAL_BY_ID.has(id) || !colorOpen(s, id)) return false;
  s.spectral.focus = id;
  return true;
}

function curve(id: 'lens' | 'afterglow'): CostCurve {
  const [base, growth] = SP[id];
  return lateRamp({ base, brackets: [{ from: 0, ratio: growth }] });
}

export function spectralPlan(s: GameState, id: 'lens' | 'afterglow'): PurchasePlan {
  return planLimited(curve(id), spectralLevel(s, id), usable(s, 'essence'), s.settings.buyAmount, s.settings.customBuyAmount, id === 'afterglow' ? SP.afterglowMax : Infinity);
}

export function buySpectral(s: GameState, id: 'lens' | 'afterglow'): boolean {
  if (!spectralOpen(s)) return false;
  const plan = spectralPlan(s, id);
  if (!plan.canAfford || plan.count < 1 || !spend(s, 'essence', plan.cost)) return false;
  s.spectral.upgrades[id] = spectralLevel(s, id) + plan.count;
  return true;
}

/** Violet's extra orders of magnitude for reset formula inputs. */
export const violetOoM = (s: GameState) => Math.floor(oom(energyOf(s, 'violet')) / SP.violetEvery);

export function registerSpectral(): void {
  defineStat({ id: 'spectralSpeed', label: 'Spectral energy speed', base: () => D(1) });
  for (const c of SPECTRAL) {
    for (const statId of c.stats) {
      registerSources({
        id: `spectral.${c.id}.${statId}`,
        stat: statId,
        op: 'mul',
        label: `Spectral: ${c.name}`,
        value: (s: GameState) => D(c.per).pow(oom(energyOf(s, c.id))),
        active: (s: GameState) => spectralOpen(s) && oom(energyOf(s, c.id)) > 0,
      });
    }
  }
  // Violet: k more orders of magnitude of Stardust and shards going in is x10^(k x the formula's power)
  registerSources(
    { id: 'spectral.violet.shards', stat: 'shardGain', op: 'mul', label: 'Spectral: Violet', value: (s) => D(10).pow(violetOoM(s) * BALANCE.supernova.gainPow), active: (s) => spectralOpen(s) && violetOoM(s) > 0 },
    { id: 'spectral.violet.essence', stat: 'essenceGain', op: 'mul', label: 'Spectral: Violet', value: (s) => D(10).pow(violetOoM(s) * BALANCE.nebula.gainPow), active: (s) => spectralOpen(s) && violetOoM(s) > 0 },
  );
  registerSystem({
    id: 'spectral',
    order: 44,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      if (!spectralOpen(s)) return;
      const rate = focusRate(s).mul(dt * ctx.gainScale);
      const glow = afterglowShare(s);
      // which colours are open is settled before any energy lands, so a colour that opens during
      // this step starts building next step (one long offline step can't open several at once)
      const open = SPECTRAL.map((c) => colorOpen(s, c.id));
      for (const [i, c] of SPECTRAL.entries()) {
        if (!open[i]) continue;
        const add = c.id === s.spectral.focus ? rate : glow > 0 ? rate.mul(glow) : ZERO;
        if (add.gt(0)) s.spectral.energy[c.id] = energyOf(s, c.id).add(add);
      }
      const best = Math.max(...SPECTRAL.map((c) => oom(energyOf(s, c.id))));
      if (best > (s.stats.spectralBest ?? 0)) s.stats.spectralBest = best;
      s.stats.spectralColors = SPECTRAL.filter((c) => colorOpen(s, c.id)).length;
    },
  });
}
