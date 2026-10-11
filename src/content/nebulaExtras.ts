/**
 * The Nebula stage's last two systems (Game design: "More mid systems"): Spectral Focus (seven
 * colours of the nebula, one focused at a time, a bonus per order of magnitude) and Tarot of the
 * Void (60 cards in a 5 to 7 slot deck where position matters). IDs never change.
 */

// ---------- Spectral Focus ----------

export interface SpectralColor {
  id: string;
  name: string;
  color: string;
  /** Stats boosted once per order of magnitude of this colour's energy. Violet has none: it adds orders of magnitude to reset formulas. */
  stats: readonly string[];
  /** Multiplier per order of magnitude. */
  per: number;
  what: string;
}

export const SPECTRAL: readonly SpectralColor[] = [
  { id: 'red', name: 'Red', color: '#FF5640', stats: ['productionMult'], per: 1.1, what: 'Stardust' },
  { id: 'orange', name: 'Orange', color: '#FF8A3D', stats: ['shardGain'], per: 1.08, what: 'Nova Shards' },
  { id: 'yellow', name: 'Yellow', color: '#FFC83D', stats: ['essenceGain'], per: 1.05, what: 'Essence' },
  { id: 'green', name: 'Green', color: '#5FD39B', stats: ['oreGain', 'alloyGain'], per: 1.1, what: 'ore and alloy' },
  { id: 'blue', name: 'Blue', color: '#4FB6FF', stats: ['runeBulk'], per: 1.1, what: 'rune bulk' },
  { id: 'indigo', name: 'Indigo', color: '#6E5CC4', stats: ['wyrmXp', 'emberGain'], per: 1.1, what: 'Wyrm XP and Embers' },
  { id: 'violet', name: 'Violet', color: '#B06BFF', stats: [], per: 1, what: 'orders of magnitude for Supernova and Nebula gains' },
];

export const SPECTRAL_BY_ID: ReadonlyMap<string, SpectralColor> = new Map(SPECTRAL.map((c) => [c.id, c]));

// ---------- Tarot of the Void ----------

export const CARD_RARITIES = [
  { id: 'common', name: 'Common', color: '#C9C2F2' },
  { id: 'uncommon', name: 'Uncommon', color: '#5FD39B' },
  { id: 'rare', name: 'Rare', color: '#4FB6FF' },
  { id: 'epic', name: 'Epic', color: '#B06BFF' },
  { id: 'legendary', name: 'Legendary', color: '#FFC83D' },
  { id: 'void', name: 'Void', color: '#FF4F6E' },
] as const;

/**
 * Position rules (exactly as the card text says):
 * - mirror: copies the card on its left (acting as that card, in this slot) and disables the card on its right.
 * - herald: x3 Essence in the leftmost slot, x1.5 anywhere else.
 * - chariot: x4 rune bulk in the last slot, x1.5 anywhere else.
 * - hermit: x5 shards when both neighbouring slots are empty (or the deck's edge), else x1.2.
 * - lovers: the cards on either side count twice (their multipliers are squared).
 * - tower: x8 Stardust, and disables the cards on either side.
 * - fool: x2 taps for every empty slot in the deck.
 * - gambler: Essence x4 or x0.44, rolled again each Nebula (44% for x4).
 */
export type CardRule = 'mirror' | 'herald' | 'chariot' | 'hermit' | 'lovers' | 'tower' | 'fool' | 'gambler';

export interface CardEffect {
  stat: string;
  op: 'mul' | 'add';
  v: number;
}

export interface CardDef {
  id: string;
  name: string;
  rarity: number;
  effects: readonly CardEffect[];
  rule?: CardRule;
  text: string;
}

const m = (stat: string, v: number): CardEffect => ({ stat, op: 'mul', v });
const WORD: Record<string, string> = {
  productionMult: 'Stardust',
  shardGain: 'shards',
  cometRate: 'comet rate',
  runeBulk: 'rune bulk',
  runeLuck: 'rune luck',
  essenceGain: 'Essence',
  oreGain: 'ore',
  alloyGain: 'alloy',
  emberGain: 'Embers',
  tapPower: 'taps',
  wyrmXp: 'Wyrm XP',
  mutationLuck: 'mutation luck',
  auraLuck: 'aura luck',
};
const say = (effects: readonly CardEffect[]) => effects.map((e) => (e.op === 'add' ? `+${e.v / 3600} h offline cap` : `x${e.v} ${WORD[e.stat] ?? e.stat}`)).join(', ');

function card(id: string, name: string, rarity: number, effects: CardEffect[], rule?: CardRule, text?: string): CardDef {
  return { id: `card.${id}`, name, rarity, effects, ...(rule ? { rule } : {}), text: text ?? `${say(effects)}.` };
}

const SUITS_1: Array<[string, string, string]> = [
  ['dust', 'Dust', 'productionMult'],
  ['shards', 'Shards', 'shardGain'],
  ['comets', 'Comets', 'cometRate'],
  ['runes', 'Runes', 'runeBulk'],
];
const SUITS_2: Array<[string, string, string]> = [
  ['essence', 'Essence', 'essenceGain'],
  ['ore', 'Ore', 'oreGain'],
  ['alloy', 'Alloy', 'alloyGain'],
  ['embers', 'Embers', 'emberGain'],
];
const SUITS_3: Array<[string, string, [string, string]]> = [
  ['stars', 'Stars', ['productionMult', 'tapPower']],
  ['void', 'the Void', ['shardGain', 'essenceGain']],
  ['wyrms', 'Wyrms', ['wyrmXp', 'emberGain']],
];

export const CARDS: readonly CardDef[] = [
  // Common: Two, Three and Ace of four suits
  ...SUITS_1.flatMap(([id, suit, stat]) => [card(`two.${id}`, `Two of ${suit}`, 0, [m(stat, 1.15)]), card(`three.${id}`, `Three of ${suit}`, 0, [m(stat, 1.2)]), card(`ace.${id}`, `Ace of ${suit}`, 0, [m(stat, 1.3)])]),
  // Uncommon: Four, Five and Six of four more suits
  ...SUITS_2.flatMap(([id, suit, stat]) => [card(`four.${id}`, `Four of ${suit}`, 1, [m(stat, 1.4)]), card(`five.${id}`, `Five of ${suit}`, 1, [m(stat, 1.5)]), card(`six.${id}`, `Six of ${suit}`, 1, [m(stat, 1.6)])]),
  // Rare: the courts of three suits, two stats each
  ...SUITS_3.flatMap(([id, suit, [a, b]]) =>
    (
      [
        ['page', 'Page', 1.75],
        ['knight', 'Knight', 2],
        ['queen', 'Queen', 2.25],
        ['king', 'King', 2.5],
      ] as const
    ).map(([cid, court, v]) => card(`${cid}.${id}`, `${court} of ${suit}`, 2, [m(a, v), m(b, v)])),
  ),
  // Epic: the Major Arcana that care where they sit
  card('magician', 'The Magician', 3, [], 'herald', 'x3 Essence in the leftmost slot, x1.5 anywhere else.'),
  card('lovers', 'The Lovers', 3, [], 'lovers', 'The cards on either side count twice (their boosts are squared).'),
  card('chariot', 'The Chariot', 3, [], 'chariot', 'x4 rune bulk in the last slot, x1.5 anywhere else.'),
  card('hermit', 'The Hermit', 3, [], 'hermit', 'x5 shards when both neighbouring slots are empty, else x1.2.'),
  card('mirror', 'The Mirror', 3, [], 'mirror', 'Copies the card on its left and disables the card on its right.'),
  card('gambler', 'The Gambler', 3, [], 'gambler', 'Each Nebula rolls Essence x4 (44%) or x0.44.'),
  card('tower', 'The Tower', 3, [m('productionMult', 8)], 'tower', 'x8 Stardust, but disables the cards on either side.'),
  card('fool', 'The Fool', 3, [], 'fool', 'x2 taps for every empty slot in your deck.'),
  // Legendary: plain, large boosts
  card('star', 'The Star', 4, [m('essenceGain', 5)]),
  card('sun', 'The Sun', 4, [m('productionMult', 10)]),
  card('world', 'The World', 4, [m('productionMult', 3), m('tapPower', 3), m('shardGain', 3), m('essenceGain', 3)]),
  card('judgement', 'Judgement', 4, [m('shardGain', 5)]),
  card('temperance', 'Temperance', 4, [m('alloyGain', 4), m('oreGain', 4)]),
  card('strength', 'Strength', 4, [m('tapPower', 8)]),
  card('death', 'Death', 4, [m('essenceGain', 6), m('productionMult', 0.5)]),
  card('emperor', 'The Emperor', 4, [m('runeLuck', 4)]),
  card('justice', 'Justice', 4, [m('mutationLuck', 3), m('auraLuck', 3)]),
  // Void: the Seven Sins, each a devil's deal
  card('pride', 'Pride', 5, [m('productionMult', 20), m('essenceGain', 0.5)]),
  card('greed', 'Greed', 5, [m('shardGain', 10), m('alloyGain', 0.5)]),
  card('gluttony', 'Gluttony', 5, [m('essenceGain', 10), m('tapPower', 0.25)]),
  card('sloth', 'Sloth', 5, [{ stat: 'offlineCap', op: 'add', v: 4 * 3600 }, m('productionMult', 0.8)]),
  card('desire', 'Desire', 5, [m('runeLuck', 10), m('runeBulk', 0.5)]),
  card('wrath', 'Wrath', 5, [m('tapPower', 20), m('productionMult', 0.5)]),
  card('envy', 'Envy', 5, [m('emberGain', 3), m('wyrmXp', 3), m('shardGain', 0.7)]),
];

export const CARD_BY_ID: ReadonlyMap<string, CardDef> = new Map(CARDS.map((c) => [c.id, c]));
export const CARD_WORDS = WORD;
