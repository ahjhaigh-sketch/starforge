# Starforge

A space-fantasy incremental game: tap a dying star back to life, build engines, evolve it through twelve stellar tiers, then forge it through six reset layers (Supernova, Nebula, Singularity, Galactic Rebirth, the Big Crunch and the Multiverse), with runes, Wyrms, a Black Hole, galaxies, megastructures and Omni Constants along the way. Chunky Roblox-incremental style UI over a painted deep-space sky.

**Play:** https://ahjhaigh-sketch.github.io/starforge/

Progress saves automatically. Use Settings → Export to keep a backup code.

## Install it

- **As an app (any browser that supports it, e.g. Chrome or Edge):** open the game, then Settings → Install Starforge (or the install icon in the address bar). After one visit it plays offline. When a new version comes out, a banner offers it; taking it saves first.
- **Windows:** download `Starforge_*_x64-setup.exe` from the [latest release](https://github.com/ahjhaigh-sketch/starforge/releases/latest) and run it (no administrator rights needed). It isn't code-signed, so Windows SmartScreen may warn: choose More info, then Run anyway. The Windows app keeps its own save (and a copy in a save file in your AppData folder); move a game between the browser and the app with Export and Import.

## Development

```bash
npm install
npm run dev          # local dev server; add ?dev=1 for the dev panel
npm run typecheck
npx vitest run       # engine tests
npm run e2e          # browser smoke tests (needs: npx playwright install chromium)
npm run build
npm run sim          # balance bot (SIM_SEED=n for another seed; SIM_MULTIVERSES=n to play that far)
node scripts/soak.mjs 120   # 2-minute playtest of the build (run npx vite preview --port 4173 first)
npm run budgets      # the speed budgets on the build (same preview server)
node scripts/icons.mjs      # redraw the app icons from public/icons/icon.svg
```

**Releasing:** set the version in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml` (a test checks they agree), add a CHANGELOG entry, then push a tag `vX.Y.Z`. The Release workflow builds the Windows installer and attaches it to a GitHub Release. Pushes to `main` deploy the web version to GitHub Pages.

The full plan lives in the "Starforge — Game Plan" doc; `CLAUDE.md` has the rules for Claude Code. `ui-mockup/` holds the playable visual target and `research/` the notes on the games that inspired it.
