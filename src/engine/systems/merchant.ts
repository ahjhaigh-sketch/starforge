import { BALANCE } from '../../content/balance';
import { ELEMENTS } from '../../content/elements';
import type { DealKind } from '../../content/extras';
import { GRADES, RELIC_BY_ID } from '../../content/forge';
import { planLimited, type PurchasePlan } from '../buy';
import type { CostCurve } from '../cost';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import { onAnyReset } from '../layers';
import { nextFloat, nextInt } from '../rng';
import { cur, type Deal, gain, type GameState, spend } from '../state';
import { stat } from '../stats';
import { registerSystem } from '../tick';
import { addRelicLevels, batchAlloy, batchSeconds, crucibles, forgeOpen, relicLevel } from './forge';
import { levelInfo, addXp } from './starsmith';
import { rawShardGain } from './supernova';

/**
 * The Wandering Merchant: a trader ship with four deals, sized from your economy the moment each
 * appears (so they stay fair at any stage). A bought deal is replaced at once; a new ship docks with
 * fresh deals after every Supernova; rerolling costs shards. Merchant Luck makes deals bigger and
 * the rare Mythical Merchant (x100) more likely. It rolls from its own random stream.
 */
const M = BALANCE.merchant;

export const merchantOpen = (s: GameState) => (s.stats.supernovas ?? 0) >= M.supernovas || s.unlocked.includes('merchant');

const luckCurve: CostCurve = { base: M.luck.base, brackets: [{ from: 0, ratio: M.luck.growth }] };
export const luckPlan = (s: GameState): PurchasePlan => planLimited(luckCurve, s.merchant.luck, cur(s, 'shards'), s.settings.buyAmount, s.settings.customBuyAmount, M.luck.max);
export const rerollCost = (s: GameState): Decimal => D(M.rerollBase).mul(D(M.rerollGrowth).pow(s.merchant.rerolls));
export const mythicalChance = (s: GameState) => M.mythicalChance + M.mythicalPerLevel * s.merchant.luck;

/** Kinds that make sense right now (a relic deal needs a relic, a Codex deal a found element). */
function kinds(s: GameState): DealKind[] {
  const k: DealKind[] = ['shards', 'ore', 'xp', 'frenzy'];
  if (forgeOpen(s)) k.push('alloy');
  if (Object.keys(s.relics.levels).some((id) => relicLevel(s, id) > 0 && relicLevel(s, id) < (RELIC_BY_ID.get(id)?.maxLevel ?? BALANCE.relics.maxLevel))) k.push('relic');
  if (Object.values(s.codex).some((n) => n > 0)) k.push('codex');
  return k;
}

const atLeast = (x: Decimal, min: number) => x.max(min).floor();

/** A new deal from the merchant's own random stream. */
export function makeDeal(s: GameState): Deal {
  const r = s.merchant.rng;
  const list = kinds(s);
  const kind = list[nextInt(r, 0, list.length - 1)]!;
  const roll = nextFloat(r);
  const quality: Deal['quality'] = roll < mythicalChance(s) ? 'mythical' : roll < mythicalChance(s) + M.rareChance ? 'rare' : 'common';
  const v = (1 + M.luck.value * s.merchant.luck) * (quality === 'mythical' ? M.mythicalMult : quality === 'rare' ? M.rareMult : 1);
  const sps = stat(s, 'stardustPerSec').max(1);
  const shardRate = rawShardGain(s).max(1);
  // sized from rates, never from lifetime totals: a deal that pays a share of everything you have ever
  // made would make the next one bigger, and buying them back to back would grow without limit
  const oreRate = stat(s, 'oreValue').mul(stat(s, 'beltSpawn').div(BALANCE.belt.spawnSeconds)).max(1);
  switch (kind) {
    case 'shards':
      return { kind, quality, pay: { currency: 'stardust', amount: atLeast(sps.mul(300), 1e4) }, get: { currency: 'shards', amount: atLeast(shardRate.mul(0.04 * v), 1) } };
    case 'ore':
      return { kind, quality, pay: { currency: 'shards', amount: atLeast(shardRate.mul(0.01), 1) }, get: { currency: 'ore', amount: atLeast(oreRate.mul(600 * v), 500) } };
    case 'alloy': {
      const i = [0, 0, 0, 1, 1, 2, 3, 4][nextInt(r, 0, 7)]!;
      const g = GRADES[i]!;
      // ten minutes of what the furnace could make of this grade
      const perMinute = batchAlloy(s, g.id).mul((crucibles(s) * 60) / batchSeconds(s));
      return { kind, quality, pay: { currency: 'ore', amount: atLeast(oreRate.mul(300).add(1000 * (1 + 2 * i)), 1000) }, get: { currency: g.alloy, amount: atLeast(perMinute.mul(10 * v / (1 + i)), 1) } };
    }
    case 'relic': {
      const owned = Object.keys(s.relics.levels).filter((id) => relicLevel(s, id) > 0 && relicLevel(s, id) < (RELIC_BY_ID.get(id)?.maxLevel ?? BALANCE.relics.maxLevel));
      const id = owned[nextInt(r, 0, owned.length - 1)]!;
      const count = M.relicLevels[quality === 'mythical' ? 2 : quality === 'rare' ? 1 : 0]!;
      return { kind, quality, pay: { currency: 'shards', amount: atLeast(shardRate.mul(0.02), 5) }, get: { id, count } };
    }
    case 'codex': {
      const found = ELEMENTS.filter((e) => (s.codex[e.id] ?? 0) > 0);
      const e = found[nextInt(r, 0, found.length - 1)]!;
      return { kind, quality, pay: { currency: 'stardust', amount: atLeast(sps.mul(600), 1e5) }, get: { id: e.id, count: Math.max(1, Math.round(2 * v)) } };
    }
    case 'xp': {
      const need = levelInfo(s).need;
      return { kind, quality, pay: { currency: 'ore', amount: atLeast(oreRate.mul(120), 200) }, get: { currency: 'xp', amount: atLeast(need.mul(0.3 * v), 10) } };
    }
    default:
      return { kind: 'frenzy', quality, pay: { currency: 'shards', amount: atLeast(shardRate.mul(0.005), 2) }, get: { count: Math.min(3600, Math.round(60 * v)) } };
  }
}

/** A new deal for a slot; a Mythical one is news. */
function nextDeal(s: GameState): Deal {
  const d = makeDeal(s);
  if (d.quality === 'mythical') events.emit({ t: 'milestone', id: 'merchant.mythical' });
  return d;
}

/** Fills the empty slots (a new ship docks with all four). */
export function restock(s: GameState): void {
  while (s.merchant.deals.length < M.deals) s.merchant.deals.push(nextDeal(s));
}

export function canAfford(s: GameState, d: Deal): boolean {
  return cur(s, d.pay.currency).gte(d.pay.amount);
}

export function buyDeal(s: GameState, index: number): boolean {
  const d = s.merchant.deals[index];
  if (!merchantOpen(s) || !d || !canAfford(s, d) || !spend(s, d.pay.currency, d.pay.amount)) return false;
  switch (d.kind) {
    case 'relic':
      addRelicLevels(s, d.get.id!, d.get.count ?? 1);
      break;
    case 'codex':
      s.codex[d.get.id!] = (s.codex[d.get.id!] ?? 0) + (d.get.count ?? 1);
      break;
    case 'xp':
      addXp(s, d.get.amount!);
      break;
    case 'frenzy':
      s.buffs.frenzy = Math.max(s.buffs.frenzy ?? 0, s.playtime) + (d.get.count ?? 60);
      break;
    default:
      gain(s, d.get.currency!, d.get.amount!);
  }
  s.merchant.deals[index] = nextDeal(s);
  s.stats.deals = (s.stats.deals ?? 0) + 1;
  events.emit({ t: 'purchase', kind: 'merchant', id: d.kind, amount: 1 });
  return true;
}

export function reroll(s: GameState): boolean {
  if (!merchantOpen(s) || !spend(s, 'shards', rerollCost(s))) return false;
  s.merchant.rerolls += 1;
  s.merchant.deals = [];
  restock(s);
  return true;
}

export function buyLuck(s: GameState): boolean {
  const plan = luckPlan(s);
  if (!merchantOpen(s) || !plan.canAfford || !spend(s, 'shards', plan.cost)) return false;
  s.merchant.luck += plan.count;
  events.emit({ t: 'purchase', kind: 'merchant', id: 'luck', amount: plan.count });
  return true;
}

export function registerMerchant(): void {
  // the first ship docks when the Merchant opens
  registerSystem({ id: 'merchant', order: 70, tick: (s: GameState) => {
    if (merchantOpen(s) && s.merchant.deals.length < M.deals) restock(s);
  } });
  // a new ship docks after every Supernova: fresh deals, rerolls back to their first price
  onAnyReset((s, layer) => {
    if (layer !== 'supernova' || !merchantOpen(s)) return;
    s.merchant.rerolls = 0;
    s.merchant.deals = [];
    restock(s);
  });
}
