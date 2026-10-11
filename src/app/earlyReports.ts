import { CONSTANT_SETS, CONSTANTS } from '../content/constants';
import { MASTERY_MULT, MASTERY_RANKS, ORBITALS, PLANET_TYPES, QUESTS } from '../content/early';
import { ENGINE_BY_ID, ENGINES } from '../content/engines';
import { TIERS } from '../content/tiers';
import { cur } from '../engine/state';
import { constantOpen, constantPlan, doublings, effectValue, level, nextDoubling } from '../engine/systems/constants';
import { masteryOpen, masteryRank } from '../engine/systems/mastery';
import { differentNeighbours, levelPrice, planetBonus, planetPrice, ringOpen, slotId } from '../engine/systems/orbitals';
import { questProgress, questReward, questsOpen } from '../engine/systems/quests';
import { reqText } from '../engine/systems/unlocks';
import { format, formatCount, formatMult } from '../ui/format';
import { game } from './game';

/** Ready-to-show read-outs for the Phase 3 panels: Constants, Mastery, Quests, Orbitals. */
const n = () => game.state.settings.notation;

export interface ConstantCard {
  id: string;
  name: string;
  icon: string;
  color: string;
  desc: string;
  open: boolean;
  req: string;
  level: string;
  effects: Array<{ what: string; now: string; next: string }>;
  doubling: string;
  cost: string;
  count: string;
  can: boolean;
  /** The icon and name of the currency it costs. */
  currencyIcon: string;
  currencyName: string;
}

const CURRENCY_ICONS: Record<string, string> = { stardust: 'stardust', essence: 'nebula', shards: 'shard', darkMatter: 'darkmatter', galaxyCores: 'galaxy', chronons: 'chronon' };
const CURRENCY_NAMES: Record<string, string> = { stardust: 'Stardust', essence: 'Essence', shards: 'Nova Shards', darkMatter: 'Dark Matter', galaxyCores: 'Galaxy Cores', chronons: 'Chronons' };

/** One set of Cosmic Constants (Stellar on the Constants panel, Nebula on the Nebula panel). */
export function constantsReport(setId = 'stellar'): { title: string; cards: ConstantCard[] } {
  const s = game.state;
  const set = CONSTANT_SETS.find((x) => x.id === setId) ?? CONSTANT_SETS[0]!;
  const cards = CONSTANTS.filter((c) => c.set === set.id).map((c): ConstantCard => {
    const L = level(s, c.id);
    const plan = constantPlan(s, c);
    const after = L + plan.count;
    return {
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      desc: c.desc,
      open: constantOpen(s, c),
      req: c.req ? reqText(c.req) : reqText(set.req),
      level: `Lv ${formatCount(L, n())}`,
      effects: c.effects.map((e) => ({ what: e.what, now: formatMult(effectValue(e.a, e.doubles, L), n()), next: formatMult(effectValue(e.a, e.doubles, after), n()) })),
      doubling: c.effects.some((e) => e.doubles) ? `x2 at Lv ${formatCount(nextDoubling(L), n())} (${formatCount(doublings(L), n())} so far)` : '',
      cost: format(plan.cost, n()),
      count: `+${formatCount(plan.count, n())}`,
      can: plan.canAfford && constantOpen(s, c),
      currencyIcon: CURRENCY_ICONS[c.currency] ?? 'stardust',
      currencyName: CURRENCY_NAMES[c.currency] ?? 'Stardust',
    };
  });
  return { title: set.name, cards };
}

export interface MasteryCard {
  id: string;
  name: string;
  icon: string;
  color: string;
  rank: string;
  rankColor: string;
  ever: string;
  next: string;
  pct: number;
  mult: string;
}

export function masteryReport(): { open: boolean; cards: MasteryCard[] } {
  const s = game.state;
  const cards = ENGINES.filter((e) => (s.enginesEver[e.id] ?? 0) > 0).map((e): MasteryCard => {
    const r = masteryRank(s, e.id);
    const ever = s.enginesEver[e.id] ?? 0;
    const cur = MASTERY_RANKS[r - 1];
    const next = MASTERY_RANKS[r];
    const from = cur?.at ?? 0;
    return {
      id: e.id,
      name: e.name,
      icon: e.icon,
      color: e.color,
      rank: cur?.name ?? 'Unranked',
      rankColor: cur?.color ?? '#5A5F8F',
      ever: `${formatCount(ever, n())} ever bought`,
      next: next ? `${next.name} at ${formatCount(next.at, n())}` : 'Highest rank',
      pct: next ? Math.floor(((ever - from) / (next.at - from)) * 100) : 100,
      mult: formatMult(MASTERY_MULT ** r, n()),
    };
  });
  return { open: masteryOpen(s), cards };
}

export interface QuestCard {
  index: number;
  text: string;
  progress: string;
  pct: number;
  done: boolean;
}

function questText(kind: string, need: string, engine?: string): string {
  switch (kind) {
    case 'taps':
      return `Tap the star ${need} times`;
    case 'engines':
      return `Buy ${need} engines`;
    case 'comets':
      return `Catch ${need} comet${need === '1' ? '' : 's'}`;
    case 'crits':
      return `Land ${need} crits`;
    case 'upgrades':
      return 'Buy an upgrade';
    case 'evolve':
      return 'Evolve your star';
    case 'own':
      return `Buy ${need} more ${ENGINE_BY_ID.get(engine ?? '')?.name ?? 'engines'}`;
    case 'stardust':
      return `Gather ${need} Stardust`;
    default:
      return kind;
  }
}

export function questsReport(): { open: boolean; cards: QuestCard[]; reward: string; done: string; bonus: string } {
  const s = game.state;
  const cards = s.quests.map((q, index): QuestCard => {
    const pct = questProgress(s, q);
    const need = q.needD ? format(q.needD, n()) : formatCount(q.need, n());
    return {
      index,
      text: questText(q.kind, need, q.engine),
      progress: `${Math.floor(pct * 100)}%`,
      pct: Math.floor(pct * 100),
      done: pct >= 1,
    };
  });
  const done = s.stats.questsDone ?? 0;
  return {
    open: questsOpen(s),
    cards,
    reward: format(questReward(s), n()),
    done: formatCount(done, n()),
    bonus: formatMult(1 + QUESTS.bonusPerQuest * done, n()),
  };
}

export interface SlotView {
  slot: string;
  type: string | null;
  name: string;
  color: string;
  band: string;
  level: number;
  bonus: string;
  neighbours: number;
  levelCost: string;
  canLevel: boolean;
}

export interface RingView {
  index: number;
  open: boolean;
  req: string;
  slots: SlotView[];
}

export function orbitalsReport(): { rings: RingView[]; price: string; canBuy: boolean; types: Array<{ id: string; name: string; color: string; band: string; engines: string }> } {
  const s = game.state;
  const money = cur(s, 'stardust');
  const price = planetPrice(s);
  const rings = ORBITALS.rings.map((r, index): RingView => ({
    index,
    open: ringOpen(s, index),
    req: `Reach ${TIERS[r.tier]?.name ?? ''}`,
    slots: Array.from({ length: r.slots }, (_, i): SlotView => {
      const slot = slotId(index, i);
      const p = s.planets[slot];
      const type = p ? PLANET_TYPES.find((t) => t.id === p.type) : undefined;
      return {
        slot,
        type: p?.type ?? null,
        name: type?.name ?? 'Empty',
        color: type?.color ?? '#2B2558',
        band: type?.band ?? '#2B2558',
        level: p?.level ?? 0,
        bonus: p ? `+${Math.round(planetBonus(s, slot) * 100)}%` : '',
        neighbours: p ? differentNeighbours(s, slot) : 0,
        levelCost: p ? format(levelPrice(p), n()) : '',
        canLevel: !!p && money.gte(levelPrice(p)),
      };
    }),
  }));
  return {
    rings,
    price: format(price, n()),
    canBuy: money.gte(price),
    types: PLANET_TYPES.map((t) => ({ id: t.id, name: t.name, color: t.color, band: t.band, engines: t.engines.map((e) => ENGINE_BY_ID.get(e)?.name ?? e).join(', ') })),
  };
}
