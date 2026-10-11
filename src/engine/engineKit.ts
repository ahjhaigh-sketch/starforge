import type { Bracket, CostCurve } from './cost';
import { bulkCost } from './cost';
import { D, type Decimal, ZERO } from './decimal';
import { events } from './events';
import { gain, type GameState, spend } from './state';
import { defineStat, registerSources, stat } from './stats';
import { registerSystem, type TickContext } from './tick';

/**
 * One engine layer, defined by data (Tech tab: "the Mirror reuses the Stardust layer's code with
 * different data"). The Stardust layer's 15 engines are the first instance; the Antimatter
 * Mirror's 10 are the second. The kit owns:
 * - bracketed geometric prices per engine (closed-form bulk cost and Max);
 * - the "???" reveal rule (an engine shows once the one before it has ever been owned);
 * - buying with the layer's currency and price multiplier stat;
 * - milestones at owned counts, which either double output (Stardust) or are already folded
 *   into the price brackets (the Mirror, where milestones slow price growth instead);
 * - the per-second stat (the sum of every engine x its own multiplier x the layer multiplier)
 *   and the production tick, offline included.
 */
export interface KitEngine {
  id: string;
  name: string;
  baseCost: number;
  baseProd: number;
}

export interface EngineLayerDef {
  id: string;
  currency: string;
  engines: readonly KitEngine[];
  /** Price brackets every engine shares (ratio per purchase, stepping at owned counts). */
  brackets: readonly Bracket[];
  /** Owned and ever-owned counts in the save. */
  owned: (s: GameState) => Record<string, number>;
  ever: (s: GameState) => Record<string, number>;
  /** Stat ids: per-engine multiplier prefix, the layer multiplier, per second, price multiplier. */
  stats: { engineMult: string; layerMult: string; perSec: string; costMult: string; milestoneBase?: string };
  /** Output milestones (owned counts that multiply that engine's output by milestoneBase). */
  milestones?: (s: GameState) => readonly number[];
  /** Whether the layer produces right now (the Mirror only once it's open). */
  open?: (s: GameState) => boolean;
  /** Runs after a purchase (XP, counters). */
  onBuy?: (s: GameState, id: string, count: number) => void;
  /** Tick order of the production system. */
  order: number;
  label: string;
}

export interface EngineLayer {
  def: EngineLayerDef;
  byId: ReadonlyMap<string, KitEngine>;
  curve(id: string): CostCurve;
  owned(s: GameState, id: string): number;
  milestones(s?: GameState): readonly number[];
  milestonesReached(n: number, s?: GameState): number;
  milestoneSpan(n: number, s?: GameState): { from: number; to: number } | null;
  each(s: GameState, id: string): Decimal;
  revealed(s: GameState, index: number): boolean;
  price(s: GameState, id: string, count: number): Decimal;
  buy(s: GameState, id: string, count: number): boolean;
  register(): void;
}

export function makeEngineLayer(def: EngineLayerDef): EngineLayer {
  const byId = new Map(def.engines.map((e) => [e.id, e]));
  const curves = new Map<string, CostCurve>();
  const none: readonly number[] = [];
  const milestones = (s?: GameState) => (def.milestones ? def.milestones(s as GameState) : none);
  const layer: EngineLayer = {
    def,
    byId,
    curve(id) {
      let c = curves.get(id);
      if (!c) {
        const e = byId.get(id);
        if (!e) throw new Error(`Unknown engine ${id}`);
        c = { base: e.baseCost, brackets: def.brackets };
        curves.set(id, c);
      }
      return c;
    },
    owned: (s, id) => def.owned(s)[id] ?? 0,
    milestones,
    milestonesReached(n, s) {
      let m = 0;
      for (const at of milestones(s)) if (n >= at) m++;
      return m;
    },
    milestoneSpan(n, s) {
      const ms = milestones(s);
      for (let i = 0; i < ms.length; i++) if (n < ms[i]!) return { from: i === 0 ? 0 : ms[i - 1]!, to: ms[i]! };
      return null;
    },
    each(s, id) {
      const e = byId.get(id)!;
      return D(e.baseProd).mul(stat(s, `${def.stats.engineMult}${id}`)).mul(stat(s, def.stats.layerMult));
    },
    revealed(s, index) {
      if (index === 0) return true;
      const prev = def.engines[index - 1];
      return !!prev && (def.ever(s)[prev.id] ?? 0) > 0;
    },
    price(s, id, count) {
      return bulkCost(layer.curve(id), layer.owned(s, id), count).mul(stat(s, def.stats.costMult));
    },
    buy(s, id, count) {
      if (count < 1 || !byId.has(id) || (def.open && !def.open(s))) return false;
      const index = def.engines.findIndex((e) => e.id === id);
      if (!layer.revealed(s, index)) return false;
      if (!spend(s, def.currency, layer.price(s, id, count))) return false;
      const own = def.owned(s);
      const ever = def.ever(s);
      own[id] = (own[id] ?? 0) + count;
      ever[id] = (ever[id] ?? 0) + count;
      def.onBuy?.(s, id, count);
      events.emit({ t: 'purchase', kind: def.id === 'stardust' ? 'engine' : `${def.id}.engine`, id, amount: count });
      return true;
    },
    register() {
      registerSources(
        {
          id: `${def.id}.engines.sum`,
          stat: def.stats.perSec,
          op: 'add',
          label: 'Engines',
          value: (s) => {
            let total = ZERO;
            for (const e of def.engines) {
              const n = layer.owned(s, e.id);
              if (n > 0) total = total.add(D(e.baseProd).mul(n).mul(stat(s, `${def.stats.engineMult}${e.id}`)));
            }
            return total;
          },
        },
        { id: `${def.id}.layer.mult`, stat: def.stats.perSec, op: 'mul', label: 'Production multiplier', value: (s) => stat(s, def.stats.layerMult) },
      );
      for (const e of def.engines) {
        defineStat({ id: `${def.stats.engineMult}${e.id}`, label: `${e.name} multiplier`, base: () => D(1) });
        const base = def.stats.milestoneBase;
        if (base && def.milestones) {
          registerSources({
            id: def.id === 'stardust' ? `milestones.${e.id}` : `${def.id}.milestones.${e.id}`,
            stat: `${def.stats.engineMult}${e.id}`,
            op: 'mul',
            label: 'Milestones',
            value: (s) => stat(s, base).pow(layer.milestonesReached(layer.owned(s, e.id), s)),
          });
        }
      }
      registerSystem({
        id: `${def.id}.production`,
        order: def.order,
        tick: (s: GameState, dt: number, ctx: TickContext) => {
          if (def.open && !def.open(s)) return;
          const rate = stat(s, def.stats.perSec);
          if (rate.gt(0)) gain(s, def.currency, rate.mul(dt * ctx.gainScale));
        },
      });
    },
  };
  return layer;
}
