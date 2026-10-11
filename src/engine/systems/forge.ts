import { BALANCE } from '../../content/balance';
import { type ForgeUpgradeId, type GradeDef, GRADE_BY_ID, GRADES, type GradeId, RELIC_BY_ID, RELICS, type RelicDef } from '../../content/forge';
import { planLimited, type PurchasePlan } from '../buy';
import type { CostCurve } from '../cost';
import { D, Decimal, ONE, ZERO } from '../decimal';
import { events } from '../events';
import { cur, gain, type GameState, spend } from '../state';
import { defineStat, registerSources, stat } from '../stats';
import { registerSystem, type TickContext } from '../tick';

/**
 * The Starforge: ore of each grade rides the Mag-Belt into the Stellar Furnace and comes out as
 * that grade's Star Alloy. Every running batch keeps the ore it took and the alloy it will give,
 * so reloading mid-smelt loses nothing. Alloy crafts and levels relics; only equipped ones count.
 */
const F = BALANCE.forge;
const R = BALANCE.relics;

export const forgeOpen = (s: GameState) => (s.stats.supernovas ?? 0) >= F.supernovas || s.unlocked.includes('starforge');
export const forgeLevel = (s: GameState, id: ForgeUpgradeId) => s.forge.upgrades[id] ?? 0;

const upgradeCurves = new Map<string, CostCurve>();
export function forgeCurve(id: ForgeUpgradeId): CostCurve {
  let c = upgradeCurves.get(id);
  if (!c) {
    const u = F.upgrades[id];
    c = { base: u.base, brackets: [{ from: 0, ratio: u.growth }] };
    upgradeCurves.set(id, c);
  }
  return c;
}

/** Highest level an upgrade can reach (crucibles stop at six). */
const forgeLimit = (id: ForgeUpgradeId) => (id === 'crucibles' ? F.maxCrucibles - 1 : Infinity);

export const crucibles = (s: GameState) => 1 + forgeLevel(s, 'crucibles');
/** Batches per smelt: Bulk smelting adds one a level. */
export const bulk = (s: GameState) => 1 + forgeLevel(s, 'bulk');
export const batchOre = (s: GameState): Decimal => D(F.orePerBatch * bulk(s));
export const batchAlloy = (s: GameState, grade: GradeId): Decimal => D(F.alloyPerBatch * bulk(s)).mul(stat(s, 'alloyGain')).mul(stat(s, `alloyGain.${grade}`));
export const batchSeconds = (s: GameState): number => F.batchSeconds / stat(s, 'forgeSpeed').toNumber();

export function forgePlan(s: GameState, id: ForgeUpgradeId): PurchasePlan {
  return planLimited(forgeCurve(id), forgeLevel(s, id), cur(s, 'ore'), s.settings.buyAmount, s.settings.customBuyAmount, forgeLimit(id));
}

export function buyForgeUpgrade(s: GameState, id: ForgeUpgradeId): boolean {
  if (!forgeOpen(s)) return false;
  const plan = forgePlan(s, id);
  if (plan.count <= 0 || !plan.canAfford || !spend(s, 'ore', plan.cost)) return false;
  s.forge.upgrades[id] = forgeLevel(s, id) + plan.count;
  events.emit({ t: 'purchase', kind: 'forge', id, amount: plan.count });
  return true;
}

export function setForgeGrade(s: GameState, grade: string): boolean {
  if (!GRADE_BY_ID.has(grade)) return false;
  s.forge.grade = grade;
  return true;
}

export function setForgeOn(s: GameState, on: boolean): void {
  s.forge.on = on;
}

export function setForgeShare(s: GameState, share: number): boolean {
  if (!(F.shareChoices as readonly number[]).includes(share)) return false;
  s.forge.share = share;
  return true;
}

/**
 * Common ore the hopper may take right now. Rare grades have no other use, so all of theirs goes
 * in; of common ore it takes its share of what has been mined since (all of it at "All").
 */
function hopperOre(s: GameState, grade: GradeDef): Decimal {
  const have = cur(s, grade.ore);
  if (grade.id !== 'iron' || s.forge.share >= 1) return have;
  return Decimal.min(have, s.forge.allowance);
}

function takeOre(s: GameState, grade: GradeDef, amount: Decimal): boolean {
  if (hopperOre(s, grade).lt(amount) || !spend(s, grade.ore, amount)) return false;
  if (grade.id === 'iron') s.forge.allowance = Decimal.max(0, s.forge.allowance.sub(amount));
  return true;
}

/** Adds the hopper's share of the common ore mined since the last count. */
function countMined(s: GameState): void {
  const total = s.totals.all.ore ?? ZERO;
  // the first count (the Starforge just opened): the hopper's share of the ore on hand, not of all ore ever
  const mined = s.forge.seen.eq(0) ? cur(s, 'ore') : total.sub(s.forge.seen);
  s.forge.seen = total;
  if (mined.gt(0) && s.forge.share < 1) s.forge.allowance = Decimal.min(cur(s, 'ore'), s.forge.allowance.add(mined.mul(s.forge.share)));
}

/**
 * Runs the furnace for dt seconds. A crucible that finishes a batch starts the next straight
 * away if the hopper has ore, so one long catch-up step gives what many short ticks would.
 * Offline, the furnace runs at the offline efficiency (slower, never lossy).
 */
export function runFurnace(s: GameState, dt: number): void {
  countMined(s);
  const T = batchSeconds(s);
  const grade = GRADE_BY_ID.get(s.forge.grade) ?? GRADES[0]!;
  // fill idle crucibles
  const fill = () => {
    while (s.forge.on && s.forge.lanes.length < crucibles(s)) {
      const ore = batchOre(s);
      if (!takeOre(s, grade, ore)) break;
      s.forge.lanes.push({ grade: grade.id, ore, alloy: batchAlloy(s, grade.id), t: 0 });
    }
  };
  fill();
  const done: Record<string, Decimal> = {};
  let batches = 0;
  const keep: GameState['forge']['lanes'] = [];
  for (const lane of s.forge.lanes) {
    let t = lane.t + dt;
    if (t < T) {
      keep.push({ ...lane, t });
      continue;
    }
    // the batch in the crucible finishes
    done[lane.grade] = (done[lane.grade] ?? D(0)).add(lane.alloy);
    batches++;
    t -= T;
    // then whole batches back to back while time and ore last (closed form: no loop per batch)
    const g = GRADE_BY_ID.get(s.forge.grade) ?? GRADES[0]!;
    const ore = batchOre(s);
    if (s.forge.on && keep.length + 1 <= crucibles(s)) {
      const byTime = Math.floor(t / T);
      const byOre = Math.floor(hopperOre(s, g).div(ore).toNumber());
      const k = Math.max(0, Math.min(byTime, byOre));
      if (k > 0) {
        takeOre(s, g, ore.mul(k));
        done[g.id] = (done[g.id] ?? D(0)).add(batchAlloy(s, g.id).mul(k));
        batches += k;
        t -= k * T;
      }
      // a partly smelted next batch, if there's ore for it
      if (takeOre(s, g, ore)) keep.push({ grade: g.id, ore, alloy: batchAlloy(s, g.id), t });
    }
  }
  s.forge.lanes = keep;
  fill();
  for (const [g, amount] of Object.entries(done)) {
    gain(s, GRADE_BY_ID.get(g)!.alloy, amount);
    events.emit({ t: 'smelt', grade: g });
  }
  if (batches > 0) s.stats.smelts = (s.stats.smelts ?? 0) + batches;
}

// ---------- relics ----------

export const relicLevel = (s: GameState, id: string) => s.relics.levels[id] ?? 0;
const relicCurve = new Map<string, CostCurve>();

/** Level L costs 10 x 1.6^L of the relic's alloy; buying level 1 is crafting it. */
export function relicCostCurve(): CostCurve {
  let c = relicCurve.get('all');
  if (!c) {
    c = { base: R.costBase, brackets: [{ from: 0, ratio: R.costGrowth }] };
    relicCurve.set('all', c);
  }
  return c;
}

/** The relic's effect at a level: base x 1.25^(level - 1); nothing at level 0. */
/** A relic's effect at a level: base x 1.25^(level - 1), x1.02 a level past 300. A Decimal: Merchant deals can push levels past where a number would overflow. */
export function relicEffect(def: RelicDef, level: number): Decimal {
  if (level <= 0) return ZERO;
  // a save from before the cap may hold more levels: they count up to the cap
  level = Math.min(level, def.maxLevel ?? R.maxLevel);
  const early = Math.min(level, R.effectKnee) - 1;
  const late = Math.max(0, level - R.effectKnee);
  return D(def.base).mul(D(R.effectGrowth).pow(early)).mul(D(R.effectGrowthLate).pow(late));
}

export const relicAlloy = (def: RelicDef) => GRADE_BY_ID.get(def.grade)!.alloy;

export function relicPlan(s: GameState, id: string): PurchasePlan {
  const def = RELIC_BY_ID.get(id)!;
  const level = relicLevel(s, id);
  // crafting is always one level; levelling follows the buy amount
  const amount = level === 0 ? 1 : s.settings.buyAmount === 'next' ? 1 : s.settings.buyAmount;
  return planLimited(relicCostCurve(), level, cur(s, relicAlloy(def)), amount, s.settings.customBuyAmount, def.maxLevel ?? R.maxLevel);
}

/** Crafts the relic (level 1) or levels it by the buy amount. Newly crafted relics equip if a slot is free. */
export function buyRelic(s: GameState, id: string): boolean {
  const def = RELIC_BY_ID.get(id);
  if (!def || !forgeOpen(s)) return false;
  const plan = relicPlan(s, id);
  if (plan.count <= 0 || !plan.canAfford || !spend(s, relicAlloy(def), plan.cost)) return false;
  const was = relicLevel(s, id);
  s.relics.levels[id] = was + plan.count;
  if (was === 0) {
    s.stats.relics = (s.stats.relics ?? 0) + 1;
    if (s.relics.equipped.length < relicSlots(s)) s.relics.equipped.push(id);
  }
  events.emit({ t: 'purchase', kind: 'relic', id, amount: plan.count });
  return true;
}

/** Adds levels to a crafted relic from a deal or a rare find, never past its cap. Returns how many. */
export function addRelicLevels(s: GameState, id: string, n: number): number {
  const def = RELIC_BY_ID.get(id);
  const level = relicLevel(s, id);
  if (!def || level <= 0) return 0;
  const add = Math.max(0, Math.min(n, (def.maxLevel ?? R.maxLevel) - level));
  s.relics.levels[id] = level + add;
  return add;
}

export const relicSlots = (s: GameState) => Math.floor(stat(s, 'relicSlots').toNumber());

export function equipRelic(s: GameState, id: string): boolean {
  if (relicLevel(s, id) <= 0 || s.relics.equipped.includes(id) || s.relics.equipped.length >= relicSlots(s)) return false;
  s.relics.equipped.push(id);
  return true;
}

export function unequipRelic(s: GameState, id: string): boolean {
  const i = s.relics.equipped.indexOf(id);
  if (i < 0) return false;
  s.relics.equipped.splice(i, 1);
  return true;
}

/** Every relic of this grade crafted: that alloy x2. */
export const collectorDone = (s: GameState, grade: GradeId) => RELICS.every((x) => x.grade !== grade || relicLevel(s, x.id) > 0);


export function registerForge(): void {
  defineStat({ id: 'forgeSpeed', label: 'Smelting speed', base: () => ONE });
  defineStat({ id: 'alloyGain', label: 'Alloy gain', base: () => ONE });
  for (const g of GRADES) defineStat({ id: `alloyGain.${g.id}`, label: `${g.name} alloy gain`, base: () => ONE });
  defineStat({ id: 'relicSlots', label: 'Relic slots', base: () => D(R.slots) });
  registerSources(
    { id: 'forge.speed', stat: 'forgeSpeed', op: 'mul', label: 'Mag-Belt speed', value: (s) => D(F.speedPerLevel).pow(forgeLevel(s, 'speed')), active: (s) => forgeLevel(s, 'speed') > 0 },
    ...GRADES.map((g) => ({
      id: `forge.collector.${g.id}`,
      stat: `alloyGain.${g.id}`,
      op: 'mul' as const,
      label: `Every ${g.name} relic crafted`,
      value: () => D(R.collectorMult),
      active: (s: GameState) => collectorDone(s, g.id),
    })),
    ...RELICS.map((def) => ({
      id: `relic.${def.id}`,
      stat: def.stat,
      op: def.kind === 'add' ? ('add' as const) : ('mul' as const),
      label: `${def.name} (relic)`,
      value: (s: GameState) => {
        const e = relicEffect(def, relicLevel(s, def.id));
        return def.kind === 'add' ? e : def.kind === 'mul' ? e.add(1) : D(1).div(e.add(1));
      },
      active: (s: GameState) => s.relics.equipped.includes(def.id) && relicLevel(s, def.id) > 0,
    })),
  );
  registerSystem({
    id: 'forge',
    order: 32,
    tick: (s: GameState, dt: number, ctx: TickContext) => {
      if (!forgeOpen(s) || (!s.forge.on && s.forge.lanes.length === 0)) return;
      runFurnace(s, dt * ctx.gainScale);
    },
  });
}

