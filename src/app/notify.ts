import { SYSTEM_BY_ID } from '../content/systems';
import { TIERS } from '../content/tiers';
import { events } from '../engine/events';

/** Turns engine events into player-facing toasts. The engine itself never writes UI copy. */
export function installNotifications(): void {
  events.on((e) => {
    if (e.t === 'tierUp') {
      const tier = TIERS[e.tier];
      if (tier) events.emit({ t: 'toast', title: `${tier.name}!`, body: `Everything x2. New: ${tier.unlocks}.`, icon: 'stardust' });
    } else if (e.t === 'unlock') {
      const sys = SYSTEM_BY_ID.get(e.feature);
      if (sys) events.emit({ t: 'toast', title: `Unlocked: ${sys.name}`, body: sys.blurb, icon: sys.icon });
    }
  });
}
