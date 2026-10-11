import type { Decimal } from './decimal';

/** Everything the engine announces. UI, audio and the renderer listen; systems never call them directly. */
export type GameEvent =
  | { t: 'tap'; amount: Decimal; crit: boolean; x?: number; y?: number }
  | { t: 'purchase'; kind: string; id: string; amount: number }
  | { t: 'tierUp'; tier: number }
  | { t: 'reset'; layer: string; gain: Decimal }
  | { t: 'unlock'; feature: string }
  | { t: 'achievement'; id: string }
  | { t: 'milestone'; id: string }
  | { t: 'comet'; kind: string }
  /** `hand`: swept by the player (drones harvest quietly). */
  | { t: 'harvest'; rarity: string; hand: boolean }
  /** A batch (or several) of this alloy grade came out of the furnace. */
  | { t: 'smelt'; grade: string }
  /** A Mythic-or-rarer rune (or a hidden rune or Anomaly) was rolled. */
  | { t: 'rune'; shrine: string; id: string; first: boolean }
  /** A Celestial Aura was rolled (`first`: never found before). */
  | { t: 'aura'; id: string; first: boolean }
  /** The first of a kind of mutation: a rune or an asteroid grade. */
  | { t: 'mutation'; target: 'rune' | 'asteroid' | 'wyrm' | 'nursery'; id: string; mut: string; firstOfKind: boolean }
  /** Eggs hatched: how many, and the rarest species among them. */
  | { t: 'hatch'; count: number; best: string }
  /** A shrine gained a star. */
  | { t: 'star'; shrine: string; stars: number }
  /** `priority`: big news (a new tier, a reset) that smaller toasts must never push out. */
  | { t: 'toast'; title: string; body: string; icon?: string; priority?: boolean }
  | { t: 'saved'; slot: string }
  | { t: 'saveError'; message: string }
  | { t: 'loaded'; source: string };

type Listener = (e: GameEvent) => void;

class EventBus {
  private listeners = new Set<Listener>();

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(e: GameEvent): void {
    for (const fn of this.listeners) {
      try {
        fn(e);
      } catch (err) {
        console.error('Event listener failed', err);
      }
    }
  }
}

export const events = new EventBus();
