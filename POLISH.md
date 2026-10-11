# Polish pass (Phase 17)

Every row of the UI style tab's motion table, checked in code, plus every sound. "Added" means this pass built it; "Checked" means it was already there and works as the table says.

## Motion

| Moment | What the table asks for | Status | Where |
|---|---|---|---|
| Hover any button | Scale 1.06, 140 ms, back-out | Checked | `.pop:hover` in `src/ui/theme.css` |
| Press | Scale 0.94 in 50 ms, then spring back | Checked | `.pop:active` in `src/ui/theme.css` |
| Panel opens | Scale 0.6 → 1 in 250 ms, background blur 10 px | Checked | `.modal.open`, `.scrim.open` in `src/ui/theme.css` |
| Number changes | Punch 1 → 1.08 → 1 in 180 ms, at most 10 a second per number | Checked | `src/ui/kit/Num.tsx`, `@keyframes punch` |
| Tap the star | Squash to 0.9 and spring back, 6 particles, "+N" rises and fades over 0.9 s | Checked | `src/render/star.ts` (squash), `src/render/stage.ts` (6 particles), `.float-num` in `src/ui/game.css` |
| Purchase | Row punches, cost chip flashes green, rising chime on repeated buys | **Added** the punch and the green flash (the chime was there) | `src/ui/kit/boughtFx.ts`, `.bought-fx` in `src/ui/crunch.css`; engine, Mirror and Echo rows |
| Tier up | 60-particle burst in the new colour, the star grows, toast | Checked | `src/render/stage.ts`, `src/app/notify.ts` |
| Unlock a system | Its teaser button breaks its padlock, glows and pulses until opened | **Added** the padlock break (the glow and pulse were there) | `RailButton` in `src/ui/screens/Rails.tsx`, `.lock-break` in `src/ui/crunch.css` |
| Resets | Full-screen flash in the layer colour, shockwave, shake, 140 particles, the star collapses | **Fixed**: the flash, ring and particles were always pink and orange; now each layer's own colour | `src/ui/screens/ResetFx.tsx` (`--fx`), `src/render/stage.ts` |
| The Big Crunch | Implosion to a point, white flash, expansion; reduced motion shows a fade | **Added** | `.crunch-implode` in `src/ui/crunch.css`; the particles wait for the flash |
| Rune roll | Slot-machine cycling for about 1 s | **Added**: a reel of rarities that slows over about a second, then lands | `RollCard` in `src/ui/screens/NebulaPanels.tsx` |
| Always | Starfield at 3 depths, twinkle, corona rays | Checked | `src/render/starfield.ts`, `src/render/star.ts` |
| Reduced motion | Removes shake, drift, roll cycling and bursts | Checked, and the new pieces follow it (no reel, no padlock break, no implosion, no row punch) | `.reduced-motion` rules |
| Caps | Floating numbers at most 30, particles at most 400 | Checked | `MAX_FLOATERS` in `src/ui/screens/StarStage.tsx`, `ParticlePool(400)` in `src/render/particles.ts` |
| Echo resets | Small resets inside the Echo boards | **Added**: no full-screen cinematic or toast, a soft chime instead | `isEchoLayer` checks in `ResetFx`, `stage.ts`, `notify.ts` |

## Sound

All synthesised in `src/audio/index.ts`; music in `src/audio/music.ts`.

| Event | Status |
|---|---|
| Tap, crit, purchase (rising chime), denied, tier up, comet, catching a comet, medal, harvest, unlock | Checked |
| Automated purchases (auto-buyers, Eternity) | **Fixed**: they chimed several times a second; now silent (`auto` flag on purchase events) |
| Supernova, Nebula, Singularity, Galactic Rebirth | **Added**: each its own chord and sweep |
| Big Crunch | **Added**: a falling whoosh, then a boom and a rising chord when the universe comes back |
| Echo Supernova, Echo Nebula | **Added**: a soft three-note chime (throttled) |
| Big news (galaxy explored, the Mirror Key, the Mythical Merchant) | **Added**: a short fanfare, skipped when a reset or tier sound just played |
| Rare rune, aura, Wyrm hatch, tarot card, Black Hole stage, shrine star, alloy smelted, first mutation | **Added**, each throttled so floods stay pleasant |
| Music | **Added**: three soundtracks (Starlight, Deep Void, Nebula) or off, a music volume, an instrument for each layer reached, paused while the tab is hidden |

## Text

| Problem | Fix |
|---|---|
| Requirement and milestone text pluralised by adding "s": "2 Singularitys", "5 galaxys", "Big Crunchs" | `plural()` in `src/engine/words.ts` (Singularities, galaxies, Big Crunches, people, species) |
| The offline report said "Went supernova 3 times" (the layer id) | Now "3 Supernovas", from the layer's name |

## Found while building (engine)

| Problem | Fix |
|---|---|
| The Echo boards' shards and Essence multiplied echo output by their full amount, so the boards fed themselves and ran to e235,000 in the simulator | Log-scale boosts inside the boards: x(1 + log10(1 + shards))^2 and x(1 + log10(1 + Essence))^3 |
| Starships delivered up to 1,000 trips a tick one by one, slowing late games and dropping trips | Every trip ending in a tick pays at once; rare finds are one draw (`deliver` in `src/engine/systems/ships.ts`) |
| Max buying could step down one purchase at a time for millions of steps | A binary search (`largestFitting` in `src/engine/cost.ts`) |
| The Void and Galactic shrines cost the currency they boost and reached x1e29 (e78 Galaxy Cores in one Crunch run) | Late shrines' multipliers on Dark Matter, Galaxy Cores and Chronons are damped (`smallStatPow` in `src/content/balance.ts`) |
| Expansion, Arms and Lattice ("as a power") compounded their own exponent (e213 Galaxy Cores) | Capped at x3, x2 and x2, like Reactor strength |
| Later Big Crunches came minutes apart (Eternity automation plus everything a Crunch keeps) | Each Crunch in a universe needs two more galaxies explored, up to all 20 |
| From Singularity milestone 10 ("a Nebula resets nothing"), an auto-Nebula kept this run's shards, so it was ready again the next tick and paid its full gain twenty times a second | A Nebula always starts the run's shards over (as the Supernova already did with Stardust); the same for a Singularity's Essence and a Galactic Rebirth's Dark Matter |
