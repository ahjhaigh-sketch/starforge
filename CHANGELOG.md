# Changelog

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
