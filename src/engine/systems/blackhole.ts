import { BALANCE } from '../../content/balance';
import { planFlat, type FlatPlan } from '../buy';
import { D, Decimal, ONE, ZERO } from '../decimal';
import { events } from '../events';
import { onAnyReset } from '../layers';
import { automatedSpend, cur, free, type GameState, spend } from '../state';
import { registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';

/**
 * The Black Hole, the Prism Wheel and the Dark Matter Reactor (Game design: "Singularity").
 * - The Black Hole wakes with the first Singularity and sits behind the star. Feed it Dark Matter
 *   (10 mass each) or a share of your Stardust (share x log10(1 + Stardust a second) mass a second,
 *   that share taken from production). Mass passes 8 colour stages at 1, 10, 100 ... 1e7, each with
 *   a perk, and speeds up the whole game: game speed = 1 + 0.04 x log10(1 + mass), plus Spin.
 * - The Prism Wheel (stage 8): when on, its eight shares, which always add up to exactly 80%, split
 *   that much of each Singularity's Dark Matter into eight banks; each bank boosts its currency by
 *   x(1 + bank)^0.5.
 * - The Reactor (5 Singularities): Dark Matter fed in becomes charge, and Dark Matter gain is
 *   x(1 + charge)^(0.15 x Reactor power), so feeding now trades against spending.
 */
const B = BALANCE.blackHole;

export const BH_STAGES = [
  { id: 'amber', name: 'Amber', color: '#FFB347', perk: 'Stardust x10', stat: 'productionMult', op: 'mul' as const, value: 10 },
  { id: 'blue', name: 'Blue', color: '#4FB6FF', perk: 'Dark Matter x2', stat: 'darkMatterGain', op: 'mul' as const, value: 2 },
  { id: 'violet', name: 'Violet', color: '#B06BFF', perk: 'Luck Root +0.1', stat: 'luckRoot', op: 'add' as const, value: 0.1 },
  { id: 'red', name: 'Red', color: '#FF5640', perk: 'Essence x10', stat: 'essenceGain', op: 'mul' as const, value: 10 },
  { id: 'green', name: 'Green', color: '#5FD39B', perk: 'Black Hole mass x3', stat: 'massGain', op: 'mul' as const, value: 3 },
  { id: 'pink', name: 'Pink', color: '#FF7AE0', perk: 'The game runs 10% faster', stat: 'gameSpeed', op: 'add' as const, value: 0.1 },
  { id: 'black', name: 'Black', color: '#140B2E', perk: 'Shards x100', stat: 'shardGain', op: 'mul' as const, value: 100 },
  { id: 'rainbow', name: 'Rainbow', color: '#FF4FC1', perk: 'The Prism Wheel opens; Dark Matter x2', stat: 'darkMatterGain', op: 'mul' as const, value: 2 },
] as const;

/** The Prism Wheel's eight colours and what each bank boosts. */
export const WHEEL = [
  { id: 'red', name: 'Stardust', color: '#FF5640', stat: 'productionMult' },
  { id: 'orange', name: 'Shards', color: '#FF8A3D', stat: 'shardGain' },
  { id: 'yellow', name: 'Essence', color: '#FFC83D', stat: 'essenceGain' },
  { id: 'green', name: 'Ore', color: '#5FD39B', stat: 'oreGain' },
  { id: 'cyan', name: 'Alloy', color: '#2EE6FF', stat: 'alloyGain' },
  { id: 'blue', name: 'Embers', color: '#4FB6FF', stat: 'emberGain' },
  { id: 'violet', name: 'Rune bulk', color: '#B06BFF', stat: 'runeBulk' },
  { id: 'pink', name: 'Taps', color: '#FF7AE0', stat: 'tapPower' },
] as const;

export const bhOpen = (s: GameState) => (s.stats.singularitiesAll ?? 0) >= 1;
export const reactorOpen = (s: GameState) => (s.stats.singularitiesAll ?? 0) >= 5;

/** Stages reached: 0 below 1 mass, then one more at each power of ten, up to 8. */
export function bhStage(s: GameState): number {
  const m = s.blackHole.mass;
  if (m.lt(1)) return 0;
  let k = Math.floor(m.log10().toNumber());
  while (k > 0 && m.lt(D(B.stageBase).pow(k))) k--;
  return Math.min(BH_STAGES.length, k + 1);
}

export const wheelOpen = (s: GameState) => bhStage(s) >= 8;

/** Feeding Dark Matter with the buy amount: 1 Dark Matter each. */
export const feedPlan = (s: GameState): FlatPlan => planFlat(ONE, cur(s, 'darkMatter').floor(), s.settings.buyAmount, s.settings.customBuyAmount);

export function feedDarkMatter(s: GameState): boolean {
  if (!bhOpen(s)) return false;
  const plan = feedPlan(s);
  if (!plan.canAfford || !spend(s, 'darkMatter', plan.cost)) return false;
  addMass(s, plan.count.mul(B.massPerDM).mul(stat(s, 'massGain')));
  return true;
}

function addMass(s: GameState, m: Decimal): void {
  const before = bhStage(s);
  s.blackHole.mass = s.blackHole.mass.add(m);
  const after = bhStage(s);
  for (let k = before + 1; k <= after; k++) events.emit({ t: 'bhStage', stage: k });
  if (after > (s.stats.bhStageBest ?? 0)) s.stats.bhStageBest = after;
}

export function setDustShare(s: GameState, share: number): void {
  s.blackHole.dustShare = Math.max(0, Math.min(B.maxDustShare, Number.isFinite(share) ? share : 0));
}

/** Mass a second from the Stardust share. */
export function dustMassRate(s: GameState): Decimal {
  if (!bhOpen(s) || s.blackHole.dustShare <= 0) return ZERO;
  const sps = stat(s, 'stardustPerSec');
  // log10(1 + x), safe for x far past 1e308
  const lg = sps.gt(1e15) ? sps.log10().toNumber() : Math.log10(1 + Math.max(0, sps.toNumber()));
  return D(s.blackHole.dustShare * lg).mul(stat(s, 'massGain'));
}

// ---------- the Prism Wheel ----------

/** Puts shares back on the wheel's limit: never negative, adding up to exactly the limit. */
export function normalizeShares(shares: readonly number[], limit = B.wheelLimit): number[] {
  const clean = WHEEL.map((_, i) => Math.max(0, Number.isFinite(shares[i]) ? shares[i]! : 0));
  const sum = clean.reduce((a, b) => a + b, 0);
  const out = sum > 0 ? clean.map((x) => (x / sum) * limit) : clean.map(() => limit / WHEEL.length);
  // the last share takes the rounding, so the sum is the limit to the last bit
  out[out.length - 1] = Math.max(0, limit - out.slice(0, -1).reduce((a, b) => a + b, 0));
  return out;
}

/**
 * Drags the boundary after wedge k by `delta` (a share of the whole wheel): wedge k grows and the
 * next wedge round shrinks by the same amount, so the total never moves.
 */
export function moveBoundary(s: GameState, k: number, delta: number): void {
  const n = WHEEL.length;
  const i = ((k % n) + n) % n;
  const j = (i + 1) % n;
  const sh = [...s.wheel.shares];
  const d = Math.max(-sh[i]!, Math.min(sh[j]!, Number.isFinite(delta) ? delta : 0));
  sh[i] = sh[i]! + d;
  sh[j] = sh[j]! - d;
  s.wheel.shares = normalizeShares(sh);
}

/** Sets one wedge to a share; the others scale to fill the rest of the limit. */
export function setShare(s: GameState, i: number, v: number): void {
  const L = B.wheelLimit;
  const target = Math.max(0, Math.min(L, Number.isFinite(v) ? v : 0));
  const sh = [...s.wheel.shares];
  const others = sh.reduce((a, b, k) => (k === i ? a : a + b), 0);
  const rest = L - target;
  const out = sh.map((x, k) => (k === i ? target : others > 0 ? (x / others) * rest : rest / (sh.length - 1)));
  s.wheel.shares = normalizeShares(out);
}

export const wheelBank = (s: GameState, id: string): Decimal => s.wheel.banks[id] ?? ZERO;

// ---------- the Reactor ----------

/** Reactor strength as it counts: up to x2. */
export const reactorPower = (s: GameState): number => Math.min(B.reactorPowerCap, stat(s, 'reactorPower').toNumber());
export const reactorMult = (s: GameState): Decimal => s.reactor.charge.add(1).pow(B.reactorPow * reactorPower(s));

export const reactorPlan = (s: GameState): FlatPlan => planFlat(ONE, cur(s, 'darkMatter').floor(), s.settings.buyAmount, s.settings.customBuyAmount);

export function feedReactor(s: GameState): boolean {
  if (!reactorOpen(s)) return false;
  const plan = reactorPlan(s);
  if (!plan.canAfford || !spend(s, 'darkMatter', plan.cost)) return false;
  s.reactor.charge = s.reactor.charge.add(plan.count);
  return true;
}

export function registerBlackHole(): void {
  registerSources(
    ...BH_STAGES.map((st, i) => ({
      id: `bh.stage.${st.id}`,
      stat: st.stat,
      op: st.op,
      label: `Black Hole: ${st.name}`,
      value: () => D(st.value),
      active: (s: GameState) => bhStage(s) > i,
    })),
    { id: 'bh.speed', stat: 'gameSpeed', op: 'add', label: 'Black Hole mass', value: (s) => D(B.speedPerOoM * Math.log10(1 + s.blackHole.mass.min(1e300).toNumber())), active: (s) => bhOpen(s) && s.blackHole.mass.gt(0) },
    { id: 'bh.feed', stat: 'productionMult', op: 'mul', label: 'Fed to the Black Hole', value: (s) => D(1 - s.blackHole.dustShare), active: (s) => bhOpen(s) && s.blackHole.dustShare > 0 },
    { id: 'reactor', stat: 'darkMatterGain', op: 'mul', label: 'Dark Matter Reactor', value: reactorMult, active: (s) => s.reactor.charge.gt(0) },
    ...WHEEL.map((w) => ({
      id: `wheel.${w.id}`,
      stat: w.stat,
      op: 'mul' as const,
      label: `Prism Wheel: ${w.name}`,
      value: (s: GameState) => wheelBank(s, w.id).add(1).pow(B.wheelPow),
      active: (s: GameState) => wheelBank(s, w.id).gt(0),
    })),
  );
  // the Prism Wheel splits each Singularity's Dark Matter into its banks
  onAnyReset((s, layerId, before) => {
    if (layerId !== 'singularity' || !s.wheel.on || !wheelOpen(s) || before.gained.lte(0)) return;
    const shares = normalizeShares(s.wheel.shares);
    // 1.3.0: the wheel takes its 80% but never the safe tenth
    const diverted = Decimal.min(before.gained.mul(B.wheelLimit), free(s, 'darkMatter').max(0));
    if (diverted.lte(0)) return;
    automatedSpend('Prism Wheel', () => spend(s, 'darkMatter', diverted));
    WHEEL.forEach((w, i) => {
      s.wheel.banks[w.id] = wheelBank(s, w.id).add(diverted.mul(shares[i]! / B.wheelLimit));
    });
  });
  registerSystem({
    id: 'blackhole',
    order: 45,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      if (!bhOpen(s) || s.blackHole.dustShare <= 0) return;
      addMass(s, dustMassRate(s).mul(dt * ctx.gainScale));
    },
  });
}
