# Changelog

## Phase 4: Supernova (the version for friends)
- One generic reset system (`engine/layers.ts`).
  - A layer is data: currency, readiness, gain, the parts it resets (each with what can keep it), what is always kept, and milestones.
  - One function performs every reset. It is deterministic, decides what is kept before changing anything, and clears every cached stat.
- Supernova, the first layer.
  - Needs a Blue Giant and 10M Stardust gathered this run. The first gives exactly 3 shards; after that floor((S / 1e7)^0.4), softcapped above 10,000.
  - Lifetime shards boost every Stardust gain, so spending them never weakens you.
  - The bottom bar comes alive when ready, showing "+N" and "next shard at X".
  - A confirm screen (switchable in Settings) lists what resets and what is kept, straight from the reset function.
  - The cinematic: a flash in the layer colour, a shockwave ring, screen shake, 140 particles and the star collapsing and being reborn. Reduced motion and reduced flashing are respected.
  - The run saves straight away.
- Milestones:
  - 1: the Nova Tree.
  - 2: Auto-Evolve.
  - 3: the Starforge (built in Phase 6) and the Spark Mote auto-buyer.
  - 5: auto-buyers for engines 2 to 5.
  - 8: start 2 tiers below your best.
  - 12: auto-buyers for everything.
  - 20: 1% of your Supernova gain every second.
  - 30: the Nebula appears.
- The Nova Tree: 79 nodes on a three-arm spiral.
  - Arms: Forge-heart (engines), Starstrike (taps and comets), Dreaming (offline, shards, automation).
  - Capstones where arms meet, and six repeatable outer nodes with no cap.
  - The first node of each arm is an escalating pick.
  - Colours mean something (unlock, add, multiply, exponent, change a rule, pick).
- A reusable tree view built for big trees.
  - Drag to pan, wheel or pinch to zoom, + and -, arrow keys between nodes, Enter to buy.
  - A minimap you can click, search by name, "Next to buy", and reveal-as-you-buy with fog one step ahead.
  - Pan and zoom never re-render React. Tested at 200 nodes.
- The Automation hub: every auto-buyer with an on/off switch and a spending limit (all, half, a tenth). They run in the normal tick, so they keep working offline.
- The Ascent: every system as a deck on a vertical star map, Protostar at the bottom, with what the next ones need. Ascent sits at the top of the left rail.
- Balance simulator (`npm run sim`). Its findings:
  - Fixed: the stat cache wasn't cleared by resets.
  - Fixed: "% of Stardust/s per tap" was being multiplied by every tap multiplier. It's now added after them, as the plan says.
  - Fixed: Star Quests could be chain-claimed for 3 minutes of production each right after a reset. Now 30 s, capped at half the run's Stardust.
  - Tuned: shard gain ^0.4, glow ^0.3, constant growth 1.3 to 1.35, tree prices 3 x 7^depth.
  - Result: Nebula at 30 Supernovas, with about 73% of the tree bought.
- Save version 5, with a migration test that loads a real version 4 save.
- Tests:
  - Resets are deterministic.
  - The confirm screen's kept list matches what is kept.
  - The first Supernova gives exactly 3; "next shard at" is exact; the lifetime glow works.
  - Tree prices, picks, repeatables and capstones.
  - Auto-buyers obey their switches, including offline.
  - Browser tests: reaching a first Supernova with only the on-screen buttons (on phone too), the tree at 200 nodes with mouse, keyboard and touch, and the automation switches.

## Phase 3: Early depth
- Cosmic Constants: one reusable infinite-upgrade module.
  - No level cap. Cost is base x g^L, with growth stepping to g^1.1 after Lv 1,000 and g^1.2 after Lv 100,000.
  - Effects are (1 + a x L), doubled every 25 levels to 1,000, then every 100 to 100,000, then every 1,000 (1,930 doublings at a million levels).
  - Bulk cost and Max are closed-form per bracket, so buying a million levels takes under 20 ms.
  - The first set (Stellar) opens at Golden Sun: Gravity (engines), Light (taps), Heat (Lucky comets and buff length), and Orbit (planets) from Blue Giant.
  - The panel previews each effect now and after the purchase.
- A new "Next" buy amount everywhere: up to an engine's next x2 milestone, or a constant's next doubling. Hotkey 6.
- Engine Mastery from Red Supergiant: Bronze, Silver, Gold, Platinum and Cosmic ranks per engine from engines ever bought, each x1.5 for that engine and never lost. Rank pips show on the shop tiles.
- Star Quests from Golden Sun: a board of 3 seeded quests (taps, engines, Stardust, owning more of your best engine, comets, crits, an upgrade, evolving). Each is scaled to your progress and measured from when it appeared. Claiming pays 3 minutes of production, adds +1% production forever, and a new quest takes its place at once.
- Orbitals from Blue Giant:
  - 4 rings (Blue Giant, Red Supergiant, Magnetar, Blazar) with 4, 6, 8 and 10 slots.
  - 5 planet types, each boosting 3 engines by +25% a level, plus +20% for each neighbour of a different type.
  - Changing a planet's type is free.
  - The rings and planets are drawn around the star, passing in front of and behind it.
- A red "!" on rail buttons when something there can be bought or claimed.
- Save version 4, with a migration test that loads a real version 3 save.
- Tests:
  - A million levels cost exactly the three-bracket series sum.
  - Max never overspends across every bracket (property test).
  - The doubling schedule; Mastery surviving a run wipe and reload; quest scaling, claiming and refilling; planet prices, neighbours and free type changes.
  - A browser test that buys a constant, places a planet and claims a quest.

## Phase 2: Saves, offline earnings and variety
- Welcome back: any time away over a minute is simulated in at most 2,000 steps. A progress bar shows if that takes a moment, then a "Welcome back" screen shows time away, time counted, efficiency and gains. Offline starts at 2 hours and 50%.
- Backups: a rolling backup in the browser database every 5 minutes of play and before catching up after 10+ minutes away (10 kept). Settings lists them with a two-step Restore. If both save slots are unreadable, the newest readable backup loads.
- Import shows a preview (tier, Stardust, playtime, save date) before loading and refuses junk with the reason. Imports and restores back up the current game first.
- Comets from Red Dwarf: one every 60 to 120 s (sooner with upgrades), catchable for 9 s by click or the C key. Frenzy (x7 engines, 30 s, 60%), Lucky (15% of your Stardust, at most 15 minutes of production, 30%), Tapstorm (x50 taps, 10 s, 9%), Wish (engines half price, 30 s, 1%). Buff chips in the top bar. Buffs run on game time, so offline and online agree, and no comets spawn during catch-up.
- 60 upgrades:
  - 30 engine doublers and 10 tap upgrades (+1, per-mote, x2, a share of Stardust/s, crits, combo).
  - 6 production, 6 engine-synergy, 5 comet and 3 offline upgrades.
  - Available ones sit as glowing tiles above the shop; the Upgrades panel shows every one, bought, available or locked with its requirement.
  - Tooltips say when each effect applies.
- 102 medals, each +1% Stardust. Five Goals of 10 tiers each (taps, comets, engines, crits, Stardust), each tier +2% Rune Luck, x1.05 Rune Bulk and +1% Stardust. Medal toasts arrive in batches.
- Stats screen: every stat broken down by source in pipeline order, plus all-time totals.
- Settings: autosave interval (5/15/30/60 s), mute, master and effects volume, ask before resets, pop-up messages, and hotkeys (T tap, E evolve, 1 to 5 buy amounts, C catch, M mute).
- Sound effects made in code: taps (brighter on crits), purchases rising in pitch, tier-up chord, comet whoosh and catch, medal and unlock chimes.
- Save version 3, with a migration test that loads a real version 2 save. Medals already earned are granted on first load.
- Tests:
  - Offline equivalence: 1 h offline matches 1 h played within 1%.
  - Every medal unlocks exactly once.
  - Comet odds, buffs, export/import identity, junk import and upgrade effects.
  - Browser tests: welcome back after 2 hours (including the backup), a purchase surviving a closed tab, junk import, one panel at a time, catching a comet, and buying an upgrade tile.

## Phase 1: The Star, Engines and Tiers
- The Star Core is a PixiJS shader: shaded sphere, churning plasma, corona rays, ink outline and gloss, with a look per tier (Pulsar beams, Quasar and Blazar jets, rainbow fringes on Magnetar and White Hole). It squashes on every tap and eases into each new tier.
- Sky: three depths of drifting, twinkling stars. A pool of 400 particles drives every burst. Spark Motes orbit the star, passing in front of and behind it.
- Tapping: floating "+N" numbers, crits from Golden Sun (5% for x10), a combo meter (x1.5, x2, x3 at 10, 25 and 50 taps in a row), keyboard tapping (Space or Enter on the star), and a cap of 30 taps a second.
- 15 engines with x1.15 costs (x1.25 past 200 owned), output doubling at 12 milestones, and "???" rows until you own the engine before. Buying supports x1, x10, x100, x1K, Max and a typed amount, and every row previews its total cost. On phones the shop is a drawer.
- 12 Star Tiers from Protostar to White Hole, priced 1,000 x 50^(k - 2). Each one is x2 everything, plays a burst and a toast, and names what it unlocks.
- Teaser rails: the left rail holds this stage's systems; a "Coming up" stack under the shop holds later layers. Each locked system shows a padlock, its requirement and a progress ring; further ones are "???" silhouettes. Unlocks are permanent once earned. The Supernova bar shows its requirement.
- 17 new chunky SVG icons.
- Save version 2, with a migration test that loads a real version 1 save.
- Tests: bracketed cost maths, a property test that Max never overspends or comes up short, 100 taps = 100 x tap power, combo steps, the tap cap, crit rate, milestones, tier costs, unlocks, and browser tests for tapping, buying, evolving, buy amounts and rail tooltips. 60 fps with 400 particles at both sizes.

## Phase 0: Foundations
- Vite 8 + React 19 + TypeScript 6 project with pinned versions; strict type checking.
- Engine core: Decimal helpers (bulk cost, max affordable, softcap), game state, stat pipeline (add, multiply, power, softcap) with breakdowns, event bus, seeded RNG saved with the game, fixed 20 Hz real-clock loop, offline/hidden-tab catch-up in at most 2,000 steps.
- Save system: `STARFORGE1:` codes (zlib + base64url), zod validation, broken-number scan, A/B slots under `starforge:` keys, newer-build refusal, migrations scaffold, export, download, import, load from file.
- App layer: 10 Hz UI snapshot (Zustand), commands that publish immediately, autosave every 15 s and on tab hide/close.
- UI kit: chunk recipe, buttons, currency pills with live counters, panels (one at a time, pop + blur, Esc), tooltips, progress bars, toasts, buy-amount control (x1, x10, x100, x1K, Max, typed), number formatting (suffix, scientific, engineering).
- Dev panel (`?dev=1`), GitHub Pages deploy workflow, unit tests and browser smoke tests.
