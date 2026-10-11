import { BELT_TIER_REWARDS, DEPTH_LAYERS, RARITIES } from '../content/belt';
import { GOAL_BY_ID, MEDAL_BY_ID } from '../content/medals';
import { SECTOR_BY_ID } from '../content/extras';
import { RUNE_BY_ID, SHRINE_BY_ID } from '../content/runes';
import { AURA_BY_ID, MUTATION_BY_ID } from '../content/runeDepth';
import { WYRM_BY_ID } from '../content/wyrms';
import { CARD_BY_ID } from '../content/nebulaExtras';
import { BH_STAGES } from '../engine/systems/blackhole';
import { SYSTEM_BY_ID } from '../content/systems';
import { TIERS } from '../content/tiers';
import { events } from '../engine/events';
import { isEchoLayer, layer, resetsDone } from '../engine/layers';
import { plural } from '../engine/words';
import { format, formatFifths } from '../ui/format';
import { game } from './game';
import { snapshotStore } from './uiSnapshot';

/**
 * Turns engine events into player-facing toasts. The engine itself never writes UI copy.
 * Medals (and unlocks) earned close together share one toast, so a burst of them never pushes out news
 * that matters more (a new tier, an unlock).
 */
const MEDAL_BATCH_MS = 400;
const CURRENCY_NAMES: Record<string, string> = { shards: 'Nova Shards', essence: 'Nebula Essence', darkMatter: 'Dark Matter', galaxyCores: 'Galaxy Cores', chronons: 'Chronons', sparks: 'Multiverse Sparks' };
/** Each layer's toast wears its currency's icon. */
const CURRENCY_ICONS: Record<string, string> = { shards: 'shard', essence: 'nebula', darkMatter: 'darkmatter', galaxyCores: 'galaxy', chronons: 'chronon', sparks: 'spark' };

export function installNotifications(): void {
  let medals: string[] = [];
  let goals: string[] = [];
  let level = 0;
  let unlocks: string[] = [];
  /** The tier just reached: its toast already names what it opens, so those unlocks stay quiet. */
  let tierNews = { tier: -1, at: 0 };
  let rare: string[] = [];
  let ships: string[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flushMedals = () => {
    timer = null;
    const opened = unlocks.map((id) => SYSTEM_BY_ID.get(id)).filter((x) => x !== undefined);
    unlocks = [];
    const [sys] = opened;
    if (sys) {
      const names = opened.map((x) => x.name);
      const list = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
      // a long list goes in the body, so the title stays one line
      const title = names.length === 1 ? `Unlocked: ${sys.name}` : names.length <= 3 ? `Unlocked: ${list}` : `${names.length} systems unlocked`;
      const body = names.length === 1 ? sys.blurb : names.length <= 3 ? 'New on the rails. Open them from there.' : `${list}. Open them from the rails.`;
      events.emit({ t: 'toast', title, body, icon: sys.icon });
    }
    if (ships.length > 0) {
      const where = SECTOR_BY_ID.get(ships[0]!)?.name ?? 'a far sector';
      events.emit({ t: 'toast', title: ships.length === 1 ? `Ship home from ${where}` : `${ships.length} ships home`, body: 'Ore, alloy and shards in the hold.', icon: 'ship' });
      ships = [];
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
      if (tier) events.emit({ t: 'toast', title: `${tier.name}!`, body: `Everything x2. New: ${tier.unlocks}.`, icon: 'stardust', priority: true });
      tierNews = { tier: e.tier, at: performance.now() };
    } else if (e.t === 'unlock') {
      const req = SYSTEM_BY_ID.get(e.feature)?.req;
      if (req?.kind === 'tier' && req.tier === tierNews.tier && performance.now() - tierNews.at < 2000) return;
      unlocks.push(e.feature);
      timer ??= setTimeout(flushMedals, MEDAL_BATCH_MS);
    } else if (e.t === 'reset') {
      const def = layer(e.layer);
      // the Echo boards' small resets show on their own panel, not as big news
      if (!def || isEchoLayer(e.layer)) return;
      events.emit({ t: 'toast', title: `${def.name}!`, body: `+${(def.currency === 'sparks' ? formatFifths : format)(e.gain, snapshotStore.getState().notation)} ${CURRENCY_NAMES[def.currency] ?? def.currency}.`, icon: CURRENCY_ICONS[def.currency] ?? 'shard', priority: true });
      const done = resetsDone(game.state, def);
      const m = def.milestones.find((x) => x.at === done);
      if (m) events.emit({ t: 'toast', title: `Milestone: ${m.at} ${plural(def.name, m.at)}`, body: `${m.text}.`, icon: 'trophy' });
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
    } else if (e.t === 'milestone' && e.id.startsWith('fusion.')) {
      const lvl = Number(e.id.slice(7));
      if (lvl >= 3) events.emit({ t: 'toast', title: `Level ${lvl} comet!`, body: 'Your best comet multiplies Stardust and taps.', icon: 'comet' });
    } else if (e.t === 'milestone' && e.id === 'merchant.mythical') {
      events.emit({ t: 'toast', title: 'The Mythical Merchant!', body: 'One absurd deal is waiting at the Merchant.', icon: 'merchant', priority: true });
    } else if (e.t === 'milestone' && e.id.startsWith('ship.')) {
      ships.push(e.id.slice(5));
      timer ??= setTimeout(flushMedals, MEDAL_BATCH_MS);
    } else if (e.t === 'rune' && e.first) {
      const r = RUNE_BY_ID.get(e.id);
      if (r) events.emit({ t: 'toast', title: `New rune: ${r.name}`, body: `${r.hidden ? 'A hidden' : r.anomaly ? 'An Anomaly' : 'A ' + r.rarity} rune from the ${SHRINE_BY_ID.get(r.shrine)?.name ?? 'shrine'}.`, icon: 'rune' });
    } else if (e.t === 'aura' && e.first) {
      const a = AURA_BY_ID.get(e.id);
      if (a) events.emit({ t: 'toast', title: `New aura: ${a.name}`, body: 'Wear it in the Celestial Auras panel.', icon: 'aura' });
    } else if (e.t === 'mutation' && e.firstOfKind) {
      // one toast per kind of mutation; the Index keeps count of the rest
      const m = MUTATION_BY_ID.get(e.mut);
      const body = e.target === 'rune' ? `A ${m?.name} copy of ${RUNE_BY_ID.get(e.id)?.name ?? 'a rune'} counts as ${m?.mult} copies.` : `A ${m?.name} ${e.id} asteroid gives x${m?.mult} ore and XP.`;
      if (m) events.emit({ t: 'toast', title: `First ${m.name} mutation`, body, icon: 'mutation' });
    } else if (e.t === 'bhStage') {
      const st = BH_STAGES[e.stage - 1];
      if (st) events.emit({ t: 'toast', title: `The Black Hole turns ${st.name}`, body: st.perk + '.', icon: 'blackhole', priority: true });
    } else if (e.t === 'milestone' && e.id === 'singularity.key') {
      events.emit({ t: 'toast', title: 'The Event Horizon key', body: 'Gather a million Essence this run, then fall into the Singularity.', icon: 'darkmatter', priority: true });
    } else if (e.t === 'card') {
      const c = CARD_BY_ID.get(e.id);
      // Legendary and Void cards are news; the rest show in the pack row
      if (c && c.rarity >= 4) events.emit({ t: 'toast', title: `${c.rarity === 5 ? 'A Sin' : 'A Legendary card'}: ${c.name}`, body: c.text, icon: 'card' });
    } else if (e.t === 'hatch') {
      const w = WYRM_BY_ID.get(e.best);
      // only the notable hatches: everyday ones show in the hatchery itself
      if (w && w.rank >= 8) events.emit({ t: 'toast', title: `A rare Wyrm hatched: ${w.name}`, body: 'Put it on your team in the Void Wyrms panel.', icon: 'wyrm' });
    } else if (e.t === 'star') {
      events.emit({ t: 'toast', title: `${SHRINE_BY_ID.get(e.shrine)?.name ?? 'Shrine'}: ${e.stars} star${e.stars === 1 ? '' : 's'}`, body: 'Its runes are stronger.', icon: 'starrank', priority: true });
    } else if (e.t === 'milestone' && e.id.startsWith('codex.')) {
      const fresh = Number(e.id.slice(6));
      events.emit({ t: 'toast', title: `${fresh} new element${fresh === 1 ? '' : 's'}`, body: 'Added to the Codex in the Starforge.', icon: 'atom' });
    } else if (e.t === 'milestone' && e.id.startsWith('codexRow.')) {
      events.emit({ t: 'toast', title: 'Codex row complete', body: 'Every element in a row of the table: a x1.5 bonus.', icon: 'atom' });
    } else if (e.t === 'milestone' && e.id.startsWith('goal.')) {
      goals.push(e.id);
      timer ??= setTimeout(flushMedals, MEDAL_BATCH_MS);
    }
  });
}
