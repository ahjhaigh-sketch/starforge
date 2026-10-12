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
    date: '12 October 2026',
    title: 'Music, and numbers that add up',
    notes: [
      'Engines now show what all of them make together (the green number under how many you own) and exactly what your next purchase adds, for the amount you have picked: "+0.1/s", or "+1.1/s" when that purchase reaches a milestone that doubles them all. The Antimatter Mirror and the Echo board show the same.',
      'Seven new songs, one for each stage of the game: Starlight, Ember Forge, Nebula, Deep Void, Spiral Arms, Eternity and Many Worlds. Each is a full song with an intro, verses, choruses and a bridge, and its melody changes a little every time round.',
      'Journey (the music setting you already had) now moves to a new song each time you reach a new reset layer. You can also pick any one song in Settings.',
      'Big moments have their own music: every evolve has a fanfare that climbs higher with each Star Tier, and every reset, medal, new system, alchemy recipe, Planet Defense best and hidden sigil has its own theme, with the soundtrack dipping underneath.',
      'This update log, in Settings.',
      'Nothing about your save changes: it carries on exactly where it was.',
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
