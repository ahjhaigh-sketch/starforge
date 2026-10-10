# Starforge: project rules for Claude Code

Starforge is a space-fantasy incremental game (Cookie Clicker loop, Roblox-incremental chunky UI, six reset layers, about 50 systems), built as a static web app (Vite + React + TypeScript + PixiJS) and deployed to GitHub Pages.

## The plan lives in one doc
**Starforge — Game Plan:** https://claude.ai/artifact/3h73quHF3TSQtZQe4m6QcP

- Read it with the Claude Docs connector (it's a doc, not a web page; never web-fetch it).
- Tabs: Overview · Game design · Build phases · Ideas menu · Math and balance · UI style · Tech and architecture · Research.
- When the user says "start Phase N": read the Build phases tab ("How every phase works" + "Phase N"), then the tabs that phase names.
- The user can edit the doc, so re-read it at the start of every phase rather than relying on memory.
- If the plan changes during a build, update the doc (targeted edits), not a local copy.

Also in this folder:
- `ui-mockup/index.html`: the playable visual target. Screenshots are in `ui-mockup/screenshots/`.
- `research/`: full notes on the 8 Roblox games and the tech stack (start with `research/00-INDEX.md`).

## Commands (after Phase 0)
- `npm run dev`: dev server (`?dev=1` opens the dev panel).
- `npm run typecheck` · `npm test -- --run` · `npm run e2e` · `npm run build`.
- `npm run sim`: balance simulator. It counts purchases and resets, not minutes; compare its output with the Math and balance tab.

## Non-negotiable rules
1. `src/engine/**` never imports the DOM, React or PixiJS.
2. Every currency amount is a break_eternity `Decimal`. Never use `<`, `>`, `+`, `*` or `==` on Decimals (`valueOf()` is a string); use `.lt() .gt() .add() .mul() .eq()`. Only small counts (owned, levels) are numbers.
3. Content is data in `src/content/`. Content IDs never change once released. Every tunable number lives in `src/content/balance.ts`.
4. Every multiplier goes through the stat pipeline (base + add → × mul → ^ pow → softcaps).
5. The UI reads only the 10 Hz snapshot of formatted strings and calls commands. Publish the snapshot immediately after every command. Zustand selectors return primitives.
6. All resets go through the one reset function. All randomness uses the seeded RNG saved with the game.
7. **No timers gate progress.** Every unlock and reset requirement is an amount the player earns. Time comes only from real-clock differences; gaps over 60 s go through the offline simulation.
8. **Every repeatable purchase supports x1 / x10 / x100 / x1,000 / Max / a typed amount**, with the total previewed. Bulk cost and Max are closed-form, so a million levels is one calculation.
9. **Infinite upgrades (Cosmic Constants) use the one reusable module.** **Big trees use the one reusable tree view**, which must stay smooth at 200+ nodes.
10. **Rune spend scales with every rune rolled.** Spend per second = price per rune × runes per second (10 per rune at 10M RPS = 100M per second). Auto-roll slows to what the player can afford and never goes negative; a slider caps the roll rate. In code, never loop roll by roll: use expected hits per tick, with Poisson draws below about 1,000 hits, so the *computer's* work at RPS e30 equals RPS 1 while the *currency* cost scales fully.
11. **New systems appear on the teaser rails and the Ascent map before they unlock**, showing their requirement and a progress ring.
12. Saves:
    - Keys are prefixed `starforge:`.
    - Format is `STARFORGE1:` + base64url(fflate zlib(JSON)).
    - Validate (round-trip + zod + broken-number scan) before every write, and never overwrite the good slot.
    - Shape changes need a new `SAVE_VERSION` + a forward-only migration + an old-save fixture test.
    - Refuse saves from newer builds.
13. UI follows the UI style tab: build from `ui/kit`, take colours from theme tokens, use Baloo 2 tabular digits for live counters, and send every number through `format()`. One panel open at a time. No emoji icons. Respect reduced motion and reduce flashing.
14. Sound only through `src/audio`; particles only through `src/render/particles.ts`.
15. No monetisation, ads, premium currency, or anything one player must buy for another.

## Definition of Done (every phase)
- typecheck, tests and build pass, plus the e2e smoke test from Phase 2.
- No console errors in a 2-minute playtest at 1400×900 and 390×844.
- Migration + fixture if the save shape changed.
- Sim table pasted from Phase 4.
- New systems are on the rails and the Ascent map.
- No timers.
- Changelog updated, committed and pushed to `main`.
- End with a short summary.
