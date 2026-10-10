import { QUEST_TEMPLATES, QUESTS, type QuestKind } from '../../content/early';
import { ENGINES } from '../../content/engines';
import { TIERS } from '../../content/tiers';
import { D, type Decimal } from '../decimal';
import { events } from '../events';
import { nextFloat } from '../rng';
import { gain, type GameState, type QuestState } from '../state';
import { registerSources, stat } from '../stats';
import { registerSystem } from '../tick';

/**
 * Star Quests: 3 goals at a time, scaled to progress when they appear, measured from that moment,
 * and replaced the instant one is claimed. Nothing waits on a clock. Uses the seeded generator.
 */
/** Stardust quests count in Decimals (startD/needD): totals outgrow plain numbers later in the game. */
export type Quest = QuestState;

export const questsOpen = (s: GameState) => s.tier >= QUESTS.tier || s.unlocked.includes('quests');

/** The counter a quest kind watches (Stardust quests use Decimals instead, see questProgress). */
function counter(s: GameState, q: Pick<Quest, 'kind' | 'engine'>): number {
  switch (q.kind) {
    case 'taps':
      return s.stats.taps ?? 0;
    case 'engines':
      return s.stats.enginesBought ?? 0;
    case 'comets':
      return s.stats.comets ?? 0;
    case 'crits':
      return s.stats.crits ?? 0;
    case 'upgrades':
      return s.upgrades.length;
    case 'evolve':
      return s.tier;
    case 'own':
      return s.engines[q.engine ?? 'mote'] ?? 0;
    case 'stardust':
      return 0;
  }
}

/** Highest engine revealed and owned, for "own N" quests. */
function topEngine(s: GameState): string {
  let id = ENGINES[0]!.id;
  for (const e of ENGINES) if ((s.engines[e.id] ?? 0) > 0) id = e.id;
  return id;
}

function pickKind(s: GameState): QuestKind {
  const pool = QUEST_TEMPLATES.filter((t) => {
    if (t.kind === 'comets') return s.tier >= 1;
    if (t.kind === 'crits') return s.tier >= 2;
    if (t.kind === 'evolve') return s.tier < TIERS.length - 1;
    return true;
  });
  const total = pool.reduce((a, t) => a + t.weight, 0);
  let r = nextFloat(s.rng) * total;
  for (const t of pool) if ((r -= t.weight) < 0) return t.kind;
  return pool[0]!.kind;
}

/** A new quest sized to the player's progress right now. */
export function newQuest(s: GameState, avoid: QuestKind[] = []): Quest {
  let kind = pickKind(s);
  for (let i = 0; i < 4 && avoid.includes(kind); i++) kind = pickKind(s);
  const roll = 0.8 + nextFloat(s.rng) * 0.6;
  const q: Quest = { kind, start: 0, need: 1 };
  switch (kind) {
    case 'taps':
      q.need = Math.round(Math.max(50, (s.stats.taps ?? 0) * 0.15) * roll);
      break;
    case 'engines':
      q.need = Math.round(Math.max(10, (s.stats.enginesBought ?? 0) * 0.2) * roll);
      break;
    case 'comets':
      q.need = Math.max(1, Math.round(2 * roll));
      break;
    case 'crits':
      q.need = Math.round(Math.max(10, (s.stats.crits ?? 0) * 0.2) * roll);
      break;
    case 'upgrades':
      q.need = 1;
      break;
    case 'evolve':
      q.need = 1;
      break;
    case 'own': {
      q.engine = topEngine(s);
      const own = s.engines[q.engine] ?? 0;
      q.need = Math.max(5, Math.round(own * 0.25 * roll));
      break;
    }
    case 'stardust':
      // gather about 5 minutes of production
      q.needD = stat(s, 'stardustPerSec').mul(300 * roll).max(1000).floor();
      q.startD = s.totals.all.stardust ?? D(0);
      break;
  }
  q.start = counter(s, q);
  return q;
}

export function questProgress(s: GameState, q: Quest): number {
  if (q.kind === 'stardust' && q.startD && q.needD) {
    return Math.max(0, Math.min(1, (s.totals.all.stardust ?? D(0)).sub(q.startD).div(q.needD).toNumber()));
  }
  return Math.max(0, Math.min(1, (counter(s, q) - q.start) / q.need));
}

export function questReward(s: GameState): Decimal {
  return stat(s, 'stardustPerSec').mul(QUESTS.rewardSeconds).max(stat(s, 'tapPower').mul(QUESTS.minTaps));
}

/** Fills empty slots. Called when the board first opens and after every claim. */
export function fillQuests(s: GameState): void {
  if (!questsOpen(s)) return;
  while (s.quests.length < QUESTS.slots) s.quests.push(newQuest(s, s.quests.map((q) => q.kind)));
}

export function claimQuest(s: GameState, index: number): Decimal | null {
  const q = s.quests[index];
  if (!q || questProgress(s, q) < 1) return null;
  const reward = questReward(s);
  gain(s, 'stardust', reward);
  s.stats.questsDone = (s.stats.questsDone ?? 0) + 1;
  s.quests[index] = newQuest(s, s.quests.map((x) => x.kind));
  events.emit({ t: 'milestone', id: `quest.${q.kind}` });
  return reward;
}

export function registerQuests(): void {
  registerSources({
    id: 'quests.prod',
    stat: 'productionMult',
    op: 'mul',
    label: 'Star Quests',
    value: (s) => D(1 + QUESTS.bonusPerQuest * (s.stats.questsDone ?? 0)),
    active: (s) => (s.stats.questsDone ?? 0) > 0,
  });
  registerSystem({ id: 'quests', order: 85, tick: (s) => s.quests.length < QUESTS.slots && fillQuests(s) });
}
