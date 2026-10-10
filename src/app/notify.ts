import { GOAL_BY_ID, MEDAL_BY_ID } from '../content/medals';
import { SYSTEM_BY_ID } from '../content/systems';
import { TIERS } from '../content/tiers';
import { events } from '../engine/events';

/**
 * Turns engine events into player-facing toasts. The engine itself never writes UI copy.
 * Medals earned close together share one toast, so a burst of them never pushes out news
 * that matters more (a new tier, an unlock).
 */
const MEDAL_BATCH_MS = 400;

export function installNotifications(): void {
  let medals: string[] = [];
  let goals: string[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flushMedals = () => {
    timer = null;
    const defs = medals.map((id) => MEDAL_BY_ID.get(id)).filter((m) => m !== undefined);
    const tiers = goals.map((id) => id.split('.')).filter(([, g]) => GOAL_BY_ID.has(g ?? ''));
    medals = [];
    goals = [];
    if (tiers.length > 0) {
      const last = tiers[tiers.length - 1]!;
      const g = GOAL_BY_ID.get(last[1]!)!;
      const title = tiers.length === 1 ? `Goal: ${g.name} ${last[2]}` : `${tiers.length} Goal tiers`;
      events.emit({ t: 'toast', title, body: `More Rune Luck and Bulk, and +${tiers.length}% Stardust.`, icon: g.icon });
    }
    const [first] = defs;
    if (!first) return;
    if (defs.length === 1) {
      events.emit({ t: 'toast', title: `Medal: ${first.name}`, body: `${first.desc} +1% Stardust.`, icon: 'trophy' });
      return;
    }
    const names = defs.map((m) => m.name);
    const shown = names.slice(0, 3).join(', ');
    const more = names.length > 3 ? ` and ${names.length - 3} more` : '';
    events.emit({ t: 'toast', title: `${names.length} new medals`, body: `${shown}${more}. +${names.length}% Stardust.`, icon: 'trophy' });
  };

  events.on((e) => {
    if (e.t === 'tierUp') {
      const tier = TIERS[e.tier];
      if (tier) events.emit({ t: 'toast', title: `${tier.name}!`, body: `Everything x2. New: ${tier.unlocks}.`, icon: 'stardust' });
    } else if (e.t === 'unlock') {
      const sys = SYSTEM_BY_ID.get(e.feature);
      if (sys) events.emit({ t: 'toast', title: `Unlocked: ${sys.name}`, body: sys.blurb, icon: sys.icon });
    } else if (e.t === 'achievement') {
      medals.push(e.id);
      timer ??= setTimeout(flushMedals, MEDAL_BATCH_MS);
    } else if (e.t === 'milestone' && e.id.startsWith('goal.')) {
      goals.push(e.id);
      timer ??= setTimeout(flushMedals, MEDAL_BATCH_MS);
    }
  });
}
