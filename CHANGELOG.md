# Changelog

## Phase 0: Foundations
- Vite 8 + React 19 + TypeScript 6 project with pinned versions; strict type checking.
- Engine core: Decimal helpers (bulk cost, max affordable, softcap), game state, stat pipeline (add, multiply, power, softcap) with breakdowns, event bus, seeded RNG saved with the game, fixed 20 Hz real-clock loop, offline/hidden-tab catch-up in at most 2,000 steps.
- Save system: `STARFORGE1:` codes (zlib + base64url), zod validation, broken-number scan, A/B slots under `starforge:` keys, newer-build refusal, migrations scaffold, export, download, import, load from file.
- App layer: 10 Hz UI snapshot (Zustand), commands that publish immediately, autosave every 15 s and on tab hide/close.
- UI kit: chunk recipe, buttons, currency pills with live counters, panels (one at a time, pop + blur, Esc), tooltips, progress bars, toasts, buy-amount control (x1, x10, x100, x1K, Max, typed), number formatting (suffix, scientific, engineering).
- Dev panel (`?dev=1`), GitHub Pages deploy workflow, unit tests and browser smoke tests.
