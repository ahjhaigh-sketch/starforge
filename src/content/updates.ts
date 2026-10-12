/** The update log in Settings (newest first). Keep it in step with CHANGELOG.md, in plain words. */
export interface UpdateNote {
  version: string;
  date: string;
  title: string;
  notes: readonly string[];
}

export const UPDATES: readonly UpdateNote[] = [
  {
    version: '1.2.0',
    date: '13 October 2026',
    title: 'Bigger, louder, clearer',
    notes: [
      '15 new engines after the Void Lantern, from the Magnetar Coil to the Infinity Engine, each with its own auto-buyer.',
      'About 100 new upgrades: every engine now has four doublers (at 5, 40, 100 and 200 owned), and the tap, comet, offline and Stardust lines go much further.',
      'Buy all: one button buys every upgrade you can afford (from your first Supernova), and every tree but the Spark choices has one too (from 5 Supernovas).',
      'Tree auto-buyers, earned by playing (the Nova Tree at just 5 Supernovas, the Nebula Tree at 5 Nebulas, and so on). They start switched off: turn them on in Automation.',
      'Supernova is automatic from 10 Supernovas: it goes as soon as one is ready (switch it off in Automation to save up a bigger one). Auto-Belt (15 Supernovas) buys Belt upgrades and Belt Tiers; Auto-Constants (20 Supernovas) steps every constant up to its next doubling once a minute, and waits a minute whenever you buy one yourself.',
      'Supernovas take a real run now: each needs at least 30 seconds of the Stardust per second you had at your last one, so they no longer come round instantly as your economy grows. A Nebula (or any bigger reset) starts this over.',
      'The Nebula pays for your shards: Essence follows the shards you gathered this run, starting at 10 million shards (it was 100,000), and the very first Nebula pays that way too instead of a flat 2.',
      'The Starforge can smelt every grade at once: pick All grades and each kind of ore you have gets its own crucible.',
      'Settings: the size of the whole interface (80% to 130%), parts of the screen you can hide (boosts, Coming up, focus cards, the bars that run themselves, the Evolve button, tap numbers and more), a switch for the reset animations (the resets still happen), and ships-home pop-ups, now off unless you switch them on.',
      'Menus: hide any menu from the rails in Settings (all but the Starforge, Nova Tree and Fusion). Menus that run themselves (Automation once every auto-buyer is set up, Orbitals with Auto-planets, the Belt with Auto-Belt, Constants with Auto-Constants, Upgrades with its auto-buyer) tuck away by themselves; show them again in Settings, or open any of them from the Ascent.',
      'The engine list shrinks to one line once every engine buys itself (Show opens it again, or choose Full, Compact or Minimized in Settings), and the big things are large at the side: a system you just unlocked, and the next one or two you are closest to, with how far along you are.',
      'The Wardrobe is in the Medals menu now, and it has far more to wear: 16 new star skins, 12 new cursor trails, 9 new backgrounds, and two new kinds, tap sparks and menu colour (75 choices in all, every one earned in play).',
      '91 new medals: further milestones for every part of the game, 14 combinations that need several things at once, 10 for unlocking systems, and 12 secrets that show as "???" until you find them (poke around).',
      'The Ascent shows more: how much of the map is open, each stage\'s progress, where you are, and a card for every system with what it does and what it needs. Menus you hid can be opened from here.',
      'A permanent reset in Settings, behind three confirmations (and a backup of your game kept in Backups, just in case).',
      'A new x5 buy amount, and the Orbitals panel levels planets in bulk at any buy amount.',
      'Auto-planets, earned at 5 Supernovas: it fills empty orbit slots (choosing types its neighbours lack) and levels your lowest planets, with a tenth of your Stardust until you change it in Automation.',
      'The Wandering Merchant is much less generous: each ship brings 3 deals, a deal you take stays sold, and a new ship docks every 15 minutes of play (it used to refill at once and come back after every Supernova). Swapping the unsold deals still costs Nova Shards.',
      'Planets look far more varied: craters, cloud bands and storms, ice caps, oceans, magma seams, rings, an atmosphere glow, a night side and little moonlets on high-level planets. The new engines are boosted by planets too.',
      'The star has a new look at every tier: a boiling, granulated surface, a bright rim, sunspots, flares and softer rays.',
      'Every menu has its own backdrop and a faint watermark of its symbol.',
      'More balance work: the new content is priced so the game is no faster than before, and the late doublers deepen the late game instead of shortening the middle.',
      'Engines now show what all of them make together (the green number under how many you own) and exactly what your next purchase adds, for the amount you have picked: "+0.1/s", or "+1.1/s" when that purchase reaches a milestone that doubles them all. The Antimatter Mirror and the Echo board show the same.',
      'Every upgrade, system and medal has its own symbol: the subject plus a badge for what it does, or the milestone it marks.',
      'Seven new songs, one for each stage of the game: Starlight, Ember Forge, Nebula, Deep Void, Spiral Arms, Eternity and Many Worlds. Each is a full song with an intro, verses, choruses and a bridge, and its melody changes a little every time round.',
      'Journey (the music setting you already had) now moves to a new song each time you reach a new reset layer. You can also pick any one song in Settings.',
      'Big moments have their own music: every evolve has a fanfare that climbs higher with each Star Tier, and every reset, medal, new system, alchemy recipe, Planet Defense best and hidden sigil has its own theme, with the soundtrack dipping underneath.',
      'This update log, in Settings.',
      'Your save carries straight over and keeps everything. (The Merchant clears its old counter once and docks a new ship.)',
    ],
  },
  {
    version: '1.1.0',
    date: '12 October 2026',
    title: 'Six new systems',
    notes: [
      'The Wardrobe (10 medals): star skins, cursor trails, backgrounds and Photo Mode.',
      'Starlight Alchemy (12 Supernovas): find 12 recipes in the cauldron and drink elixirs for big boosts.',
      'Space Weather (first Supernova): meteor showers, solar flares, eclipses and more, and a Weather Beacon to summon your own.',
      'Ship Customizer: hulls, engines, cargo pods and scanners for every starship, with Best fit.',
      'Planet Defense (3 Singularities): turrets around your planets against endless void swarms, with auto-defend.',
      'Hidden Sigils: seven secrets hidden in the big trees, each bending a rule.',
    ],
  },
  {
    version: '1.0.0',
    date: '12 October 2026',
    title: 'Release',
    notes: ['Installable app and Windows app, saves kept safe, accessibility, and speed budgets on every device.'],
  },
];
