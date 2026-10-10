# Starforge

A space-fantasy incremental game: tap a dying star, build engines, evolve it through stellar tiers and go Supernova. Chunky Roblox-incremental style UI over a painted deep-space sky.

**Play:** https://ahjhaigh-sketch.github.io/starforge/

Progress saves automatically in your browser. Use Settings → Export to keep a backup code.

## Development

```bash
npm install
npm run dev          # local dev server; add ?dev=1 for the dev panel
npm run typecheck
npx vitest run       # engine tests
npm run e2e          # browser smoke tests (needs: npx playwright install chromium)
npm run build
```

The full plan lives in the "Starforge — Game Plan" doc; `CLAUDE.md` has the rules for Claude Code. `ui-mockup/` holds the playable visual target and `research/` the notes on the games that inspired it.
