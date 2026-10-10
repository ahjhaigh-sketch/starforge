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
  | { t: 'toast'; title: string; body: string; icon?: string }
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
