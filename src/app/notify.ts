import { BELT_TIER_REWARDS, DEPTH_LAYERS, RARITIES } from '../content/belt';
import { GOAL_BY_ID, MEDAL_BY_ID } from '../content/medals';
import { SYSTEM_BY_ID } from '../content/systems';
import { TIERS } from '../content/tiers';
import { events } from '../engine/events';
import { layer, resetsDone } from '../engine/layers';
import { format } from '../ui/format';
import { game } from './game';
import { snapshotStore } from './uiSnapshot';

/**
 * Turns engine events into player-facing toasts. The engine itself never writes UI copy.
 * Medals (and unlocks) earned close together share one toast, so a burst of them never pushes out news
 * that matters more (a new tier, an unlock).
 */
const MEDAL_BATCH_MS = 400;

export function installNotifications(): void {
  let medals: string[] = [];
  let goals: string[] = [];
  let level = 0;
  let unlocks: string[] = [];
  /** The tier just reached: its toast already names what it opens, so those unlocks stay quiet. */
  let tierNews = { tier: -1, at: 0 };
  let rare: string[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flushMedals = () => {
    timer = null;
    const opened = unlocks.map((id) => SYSTEM_BY_ID.get(id)).filter((x) => x !== undefined);
    unlocks = [];
    const [sys] = opened;
    if (sys) {
      const names = opened.map((x) => x.name);
      const title = names.length === 1 ? `Unlocked: ${sys.name}` : `Unlocked: ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
      events.emit({ t: 'toast', title, body: names.length === 1 ? sys.blurb : 'New on the rails. Open them from there.', icon: sys.icon });
    }
    if (level > 0) {
      events.emit({ t: 'toast', title: `Starsmith Level ${level}`, body: 'A perk point to spend in the Level panel.', icon: 'level' });
      level = 0;
    }
    if (rare.length > 0) {
      const names = rare.map((id) => RARITIES.find((r) => r.id === id)?.name ?? id);
      events.emit({ t: 'toast', title: rare.length === 1 ? `${names[0]} asteroid!` : `${rare.length} rare asteroids`, body: rare.length === 1 ? 'A rare find from the Belt.' : `${names.slice(0, 3).join(', ')}${rare.length > 3 ? ' and more' : ''}.`, icon: 'belt' });
      rare = [];
    }
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
      tierNews = { tier: e.tier, at: performance.now() };
    } else if (e.t === 'unlock') {
      const req = SYSTEM_BY_ID.get(e.feature)?.req;
      if (req?.kind === 'tier' && req.tier === tierNews.tier && performance.now() - tierNews.at < 2000) return;
      unlocks.push(e.feature);
      timer ??= setTimeout(flushMedals, MEDAL_BATCH_MS);
    } else if (e.t === 'reset') {
      const def = layer(e.layer);
      if (!def) return;
      events.emit({ t: 'toast', title: `${def.name}!`, body: `+${format(e.gain, snapshotStore.getState().notation)} ${def.currency === 'shards' ? 'Nova Shards' : def.currency}.`, icon: 'shard' });
      const done = resetsDone(game.state, def);
      const m = def.milestones.find((x) => x.at === done);
      if (m) events.emit({ t: 'toast', title: `Milestone: ${m.at} ${def.name}${m.at === 1 ? '' : 's'}`, body: `${m.text}.`, icon: 'trophy' });
    } else if (e.t === 'achievement') {
      medals.push(e.id);
      timer ??= setTimeout(flushMedals, MEDAL_BATCH_MS);
    } else if (e.t === 'milestone' && e.id.startsWith('level.')) {
      level = Math.max(level, Number(e.id.slice(6)));
      timer ??= setTimeout(flushMedals, MEDAL_BATCH_MS);
    } else if (e.t === 'harvest' && (e.rarity === 'prismatic' || e.rarity === 'void')) {
      rare.push(e.rarity);
      timer ??= setTimeout(flushMedals, MEDAL_BATCH_MS);
    } else if (e.t === 'milestone' && e.id.startsWith('beltTier.')) {
      const T = Number(e.id.slice(9));
      events.emit({ t: 'toast', title: `Belt Tier ${T}`, body: `x2 ore and XP.${BELT_TIER_REWARDS[T - 1] ? ` ${BELT_TIER_REWARDS[T - 1]}.` : ''}`, icon: 'belt' });
    } else if (e.t === 'milestone' && e.id.startsWith('core.')) {
      const depth = Number(e.id.slice(5));
      const reached = DEPTH_LAYERS.find((l) => l.from === depth && depth > 0);
      if (reached) events.emit({ t: 'toast', title: `Reached the ${reached.name}`, body: `Tougher cores, richer ore, and a new mastery: ${reached.oreName}.`, icon: 'drill' });
    } else if (e.t === 'milestone' && e.id.startsWith('goal.')) {
      goals.push(e.id);
      timer ??= setTimeout(flushMedals, MEDAL_BATCH_MS);
    }
  });
}
