import { BALANCE } from '../content/balance';
import { CARD_RARITIES, CARD_WORDS, CARDS, SPECTRAL, type CardEffect } from '../content/nebulaExtras';
import { D } from '../engine/decimal';
import { cur } from '../engine/state';
import { afterglowShare, colorOpen, energyOf, focusRate, oom, spectralLevel, spectralOpen, spectralPlan, violetOoM } from '../engine/systems/spectral';
import { deckSlots, packPlan, packRarity, resolveDeck, tarotOpen } from '../engine/systems/tarot';
import { format, formatMult, formatCount } from '../ui/format';
import { game } from './game';

/** Read-outs for Spectral Focus and Tarot of the Void. */
const n = () => game.state.settings.notation;
const SP = BALANCE.spectral;

// ---------- Spectral Focus ----------

export interface ColorRow {
  id: string;
  name: string;
  color: string;
  open: boolean;
  focused: boolean;
  energy: string;
  oom: number;
  bonus: string;
  next: string;
  share: number;
  lock: string;
}

export interface SpectralReport {
  open: boolean;
  req: string;
  rate: string;
  glow: string;
  colors: ColorRow[];
  lens: { level: number; count: number; cost: string; can: boolean };
  afterglow: { level: number; max: number; count: number; cost: string; can: boolean };
}

export function spectralReport(): SpectralReport {
  const s = game.state;
  const lens = spectralPlan(s, 'lens');
  const glow = spectralPlan(s, 'afterglow');
  return {
    open: spectralOpen(s),
    req: `${SP.nebulas} Nebulas`,
    rate: format(focusRate(s), n()),
    glow: `${Math.round(afterglowShare(s) * 100)}%`,
    colors: SPECTRAL.map((c, i) => {
      const e = energyOf(s, c.id);
      const k = oom(e);
      const bonus =
        c.id === 'violet'
          ? `+${violetOoM(s)} orders of magnitude for Supernova and Nebula gains (one per ${SP.violetEvery} of Violet)`
          : `${formatMult(D(c.per).pow(k), n())} ${c.what} (x${c.per} each order of magnitude)`;
      const within = e.gt(0) ? e.log10().toNumber() - k : 0;
      return {
        id: c.id,
        name: c.name,
        color: c.color,
        open: colorOpen(s, c.id),
        focused: s.spectral.focus === c.id,
        energy: format(e, n()),
        oom: k,
        bonus,
        next: format(D(10).pow(k + 1), n()),
        share: k === 0 ? Math.min(1, e.toNumber() / 10) : Math.max(0, Math.min(1, within)),
        lock: i === 0 ? '' : `Opens at ${formatCount(SP.unlockAt, n())} ${SPECTRAL[i - 1]!.name} energy`,
      };
    }),
    lens: { level: spectralLevel(s, 'lens'), count: lens.count, cost: format(lens.cost, n()), can: lens.canAfford },
    afterglow: { level: spectralLevel(s, 'afterglow'), max: SP.afterglowMax, count: glow.count, cost: format(glow.cost, n()), can: glow.canAfford },
  };
}

// ---------- Tarot of the Void ----------

function effectText(fx: readonly CardEffect[], counts: number): string {
  const by = new Map<string, number>();
  const add = new Map<string, number>();
  for (const e of fx) {
    if (e.op === 'mul') by.set(e.stat, (by.get(e.stat) ?? 1) * e.v ** counts);
    else add.set(e.stat, (add.get(e.stat) ?? 0) + e.v * counts);
  }
  const parts = [...by].map(([stat, v]) => `${formatMult(D(v), n())} ${CARD_WORDS[stat] ?? stat}`);
  for (const [, v] of add) parts.push(`+${formatCount(v / 3600, n())} h offline cap`);
  return parts.join(', ');
}

export interface DeckSlot {
  slot: number;
  id: string;
  name: string;
  color: string;
  active: boolean;
  acts: string;
  counts: number;
  now: string;
  text: string;
}

export interface TarotReport {
  open: boolean;
  req: string;
  essence: string;
  packCount: number;
  packCost: string;
  canPack: boolean;
  packFrom: string;
  owned: number;
  total: number;
  slots: number;
  nextSlot: string;
  gamble: string;
  deck: DeckSlot[];
  /** 1.3.0: everything the deck gives together, as one line. */
  deckTotal: string;
  rarities: Array<{ name: string; color: string; cards: Array<{ id: string; name: string; owned: boolean; text: string; inDeck: boolean }> }>;
}

export function tarotReport(): TarotReport {
  const s = game.state;
  const plan = packPlan(s);
  const r = packRarity(s);
  const left = r === null ? 0 : CARDS.filter((c) => c.rarity === r && !s.tarot.owned.includes(c.id)).length;
  const next = BALANCE.tarot.slotCards.find((x) => s.tarot.owned.length < x);
  return {
    open: tarotOpen(s),
    req: `${BALANCE.tarot.nebulas} Nebulas`,
    essence: format(cur(s, 'essence'), n()),
    packCount: plan.count,
    packCost: format(plan.cost, n()),
    canPack: plan.canAfford && plan.count > 0,
    packFrom: r === null ? 'Every card is yours.' : `Packs now give ${CARD_RARITIES[r]!.name} cards (${left} left to find).`,
    owned: s.tarot.owned.length,
    total: CARDS.length,
    slots: deckSlots(s),
    nextSlot: next ? `Slot ${deckSlots(s) + 1} at ${next} cards` : '',
    gamble: s.tarot.gamble === 1 ? 'not rolled yet' : `x${s.tarot.gamble}`,
    deckTotal: effectText(resolveDeck(s).flatMap((v) => v.effects.map((e) => ({ ...e, v: e.op === 'mul' ? e.v ** v.counts : e.v * v.counts }))), 1) || 'Nothing yet: put cards in the deck.',
    deck: resolveDeck(s).map((v, slot) => ({
      slot,
      id: v.card?.id ?? '',
      name: v.card?.name ?? '',
      color: v.card ? CARD_RARITIES[v.card.rarity]!.color : '#2B1F6E',
      active: v.active,
      acts: v.card?.rule === 'mirror' ? (v.acts ? `Acting as ${v.acts.name}` : 'Nothing to copy') : '',
      counts: v.counts,
      now: v.card ? (v.active ? effectText(v.effects, v.counts) || 'No boost here' : 'Disabled') : '',
      text: v.card?.text ?? '',
    })),
    rarities: CARD_RARITIES.map((rar, i) => ({
      name: rar.name,
      color: rar.color,
      cards: CARDS.filter((c) => c.rarity === i).map((c) => {
        const owned = s.tarot.owned.includes(c.id);
        return { id: c.id, name: owned ? c.name : '???', owned, text: owned ? c.text : '', inDeck: s.tarot.deck.includes(c.id) };
      }),
    })),
  };
}
