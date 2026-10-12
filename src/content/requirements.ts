/**
 * Every unlock condition in the game is an amount the player earns, never a timer.
 * Systems, upgrades, achievements and goals all describe their condition with this one type.
 */
export type Requirement =
  | { kind: 'none' }
  | { kind: 'tier'; tier: number }
  | { kind: 'engine'; id: string; count: number }
  /** A counter in state.stats (taps, comets, supernovas...), with the noun for the text. */
  | { kind: 'count'; stat: string; count: number; noun: string }
  /** All-time total of a currency. */
  | { kind: 'total'; currency: string; amount: number }
  /** Stardust per second right now. */
  | { kind: 'rate'; amount: number }
  | { kind: 'upgrades'; count: number }
  | { kind: 'medals'; count: number }
  /** 1.2.0: every one of these at once (combination medals). */
  | { kind: 'all'; of: readonly Requirement[] }
  /** 1.2.0: one system unlocked, or this many systems unlocked. */
  | { kind: 'system'; id: string; name: string }
  | { kind: 'systems'; count: number };
