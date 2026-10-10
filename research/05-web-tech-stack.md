# 05 — Web Tech Stack & Engineering Patterns for a Browser Incremental (October 2026)

> Research date: **2026-10-10**. Every version number below was read from the npm registry (`npm view <pkg> time dist-tags`) or GitHub Releases on this date, unless marked *(secondary source)*. Sizes marked **measured** were measured locally (minified file, `gzip -9`). Benchmarks marked **measured** ran on Node 24.19.0 / Windows 11.
>
> Scope: STARFORGE. It is a 2D/2.5D space-fantasy clicker with prestige layers, upgrade trees, rune RNG and offline earnings, played on a PC, phone or school Chromebook. It ships as a GitHub Pages link, later as a PWA and a Windows `.exe`. One developer builds it with Claude Code.

---

## 0. TL;DR

- **Engine and UI are separate.** Write a **pure-TypeScript, DOM-free simulation engine** with a fixed 20 Hz tick, wall-clock deltas and break_eternity Decimals. A **DOM UI** (React 19.3 + Zustand 5) pulls a snapshot of primitives/strings at **10–20 Hz**. A **PixiJS 8 WebGL canvas** sits *behind* the DOM and handles starfield, particles, glow and the planet. This is the same pull-based split Antimatter Dimensions uses: Vue components with an `update()` method that copy from a non-reactive `player` object.
- **Numbers:** use `break_eternity.js` 2.1.3 behind your own `num.ts` facade. Format with your own Roblox-style suffix formatter, falling back to `eternal_notations` 1.1.1 for scientific and tetrational notation.
- **Saves:** synchronous `localStorage` as the primary store, under a namespaced key. Pipeline: JSON → fflate zlib (built-in Adler-32 integrity) → base64url → magic prefix with format version. Use two alternating slots plus rolling backups. Validate with zod before *and* after writing, and run numbered forward-only migrations. Save on a 15–30 s interval, on `visibilitychange→hidden`, on `pagehide` and on prestige. Offer an export string from day one.
- **Time:** never trust timers or rAF to tick. All progress comes from `Date.now()` deltas. Any gap over ~60 s goes through the **offline path**: cap, efficiency multiplier, coarse ticks or closed form, then a "While you were away" report.
- **Ship:** GitHub Pages via Actions (Vite `base: '/<repo>/'`). Upload the same build to itch.io with `base: './'`. Add vite-plugin-pwa 2.0.0 with `registerType: 'prompt'`. For a desktop build use **Tauri 2.12** (tiny, WebView2 is already on Win10/11). Switch to Electron 44 + steamworks.js/steamworks-ffi-node only if you go to Steam.
- **Cloud and leaderboards (optional):** Supabase free tier (anonymous sign-in, one `saves` table, one `scores` table that stores `log10(value)` as a double). Be aware that free projects **pause after 7 days of inactivity**.

---

## 1. Big numbers

### 1.1 Library comparison

| | **break_eternity.js** | **break_infinity.js** | decimal.js | Native `number` / `BigInt` |
|---|---|---|---|---|
| Current version | **2.1.3** (npm/GitHub, **2025-12-07**) | **2.2.0** (**2023-02-26**) | 10.6.0 (2025-07-06) | — |
| Representation | `sign`, `layer`, `mag` (layer *n* = a tower of *n* tens with `mag` on top) | mantissa × 10^exponent (exponent is a JS number) | arbitrary precision | double / integer |
| Max magnitude | up to roughly **10^^1.8e308** (README says "as large as 10^^1e308"; exposes `dLayerMax`, `dNumberMax`) | ~**1e9e15** (README: "up to as much as 1e(9e15)") | configurable, slow | 1.8e308 / integers only |
| Size (**measured**) | 55 KB min / **13 KB gz** | 16 KB min / **3 KB gz** | — | 0 |
| TypeScript | bundled `dist/index.d.ts`, default export `Decimal` | bundled `dist/index.d.ts` | bundled | — |
| Notable API | `add sub mul div pow pow_base exp ln log10 log root sqrt cbrt`, `tetrate`, `slog`, `iteratedexp`, `iteratedlog`, `layeradd`, `lambertw`, `ssqrt`, `linear_sroot`, `pentate`, `penta_log`, `linear_penta_root`, `factorial`/`gamma`, trig, `mod` (with "floored" option), **`affordGeometricSeries`, `sumGeometricSeries`, `affordArithmeticSeries`, `sumArithmeticSeries`, `efficiencyOfPurchase`**, `*_tolerance` comparisons, `toJSON()` returns a string, `fromString` (incl. the XFY/hyper-4 forms added in v1.4.0), `fromComponents(_noNormalize)`, `fromValue_noAlloc` | similar arithmetic and series helpers; no hyper-operators | full decimal maths | — |
| Used by | **The Modding Tree / Prestige Tree** (vendored at `js/technical/break_eternity.js`) and most TMT mods | **Antimatter Dimensions** (`break_infinity.js ^2.0.0`), **Synergism** (`^2.2.0`) | AD *before* switching (README: AD script time improved **4.5×** after moving off decimal.js) | Cookie Clicker-era games |

**Micro-benchmark (measured, 500k dependent ops each, Node 24.19.0):**

| op | break_infinity 2.2.0 | break_eternity 2.1.3 | ratio |
|---|---|---|---|
| `add` | 49 ns | 172 ns | 3.5× |
| `mul` | 12 ns | 135 ns | 11× |
| `pow(1.0x)` | 62 ns | 505 ns | 8× |
| `log10` (BI returns a `number`, BE returns a `Decimal`) | 18 ns | 444 ns | 25× |
| `gte` | 4 ns | 17 ns | 4× |

The README claims break_eternity is "within 2x/0.5x" of break_infinity. In this test it was **3–25× slower**. In absolute terms that is irrelevant during live play: 500 Decimal ops per tick × 20 Hz costs about 2 ms/s. It matters a lot for **offline simulation**: 100k ticks × 500 ops × ~200 ns ≈ **10 s**. That is why section 6 says to cap ticks and prefer closed forms.

**Recommendation for STARFORGE:** use **break_eternity.js 2.1.3**. The roadmap (Supernova → Nebula → Singularity → Galactic → Big Crunch → Multiverse) will plausibly want `ee`/tetration-scale late-game numbers, and BE is a drop-in superset of the BI API. Wrap it:

```ts
// src/engine/num.ts — the ONLY file that imports the library
import Decimal, { type DecimalSource } from "break_eternity.js";
export { Decimal, type DecimalSource };
export const D = (x: DecimalSource) => new Decimal(x);
export const ZERO = D(0), ONE = D(1);
// If profiling ever shows BE as a hotspot and the game never exceeds e9e15,
// swap to break_infinity.js here. Saves store Decimals as strings, so both parse them.
```

**Performance rules:**
- Use plain `number` for small things (levels, owned counts, rune stats, timers). Use Decimal only for currencies, multipliers and costs.
- **Cache derived multipliers** behind dirty flags (recompute when an upgrade, rune or prestige changes, not every tick). This is the single biggest win.
- Use `Decimal.affordGeometricSeries` / `sumGeometricSeries` for "Buy Max" and "Buy 10". Never loop purchases.
- Never use JS operators on Decimals. **Verified:** `valueOf()` returns a **string**, so `new Decimal('9e5') < new Decimal('1e10')` evaluates to **`false`** and `a + b` is string concatenation (`"90000010000000000"`). TypeScript strict mode reports both as TS2365. This is one more reason the engine must be TS.
- Revive on load: `JSON.stringify` calls `toJSON()` and gives strings, but `JSON.parse` gives back **strings, not Decimals**. Revive through a schema (§5.5).
- **NaN poisoning:** one `NaN` (from `log` of 0, a 0/0 cost, etc.) spreads through every multiplier and then gets saved. TMT runs a `NaNcheck(player)` that refuses to save and alerts. Do the same, and also keep the last-known-good slot.

### 1.2 Number formatting / notation

| Library | Version (date) | Works with | Status |
|---|---|---|---|
| `@antimatter-dimensions/notations` | **3.2.0** (2022-12-25) | **break_infinity.js only** (peer `^2.0.0`) | Finished/frozen. Scientific, Engineering, Letters, Standard, Emoji, Mixed, Logarithm, Brackets, Infinity, Roman, Dots, Zalgo, Hex, Imperial, Clock, Prime, Bar, Shi, Blind, ALL, plus a community pack. API: `new ADNotations.ScientificNotation().format(value, places, placesUnder1000)` |
| `eternal_notations` (MathCookie17) | **1.1.1** (2024-10-20) | **break_eternity.js only** | Successor to AD notations. About 65 notations and 144 presets, including hyperscientific, tetration-based and SI. `EternalNotations.Presets.Standard.format(x)`; `HTMLPresets` for innerHTML. Typings bundled. MIT. |
| `swarm-numberformat` | 0.4.0 (**2017-12-05**) | numbers / decimal.js | **Stale. Do not use.** |
| `Intl.NumberFormat` (`notation: 'compact'`) | built-in | numbers only | Fine below 1e15 and localized, but suffixes stop at "T" |

**Recommendation:** write a ~60-line `fmt(d: Decimal)` that matches the Roblox look (`1.23K, 45.6M, 7.89B, …, Dc, UDc …`, then `1.23e45`, then `ee`/`F` forms). Clean suffix formatting is a stated design pillar. Use `eternal_notations` only as the "notation" option in Settings and for extreme layers. Always format into a **string in the UI snapshot** (§3.3) so components compare primitives.

---

## 2. Rendering

### 2.1 Options

| | **PixiJS** | Phaser | Plain Canvas 2D | Three.js |
|---|---|---|---|---|
| Version | **8.22.0** (2026-10-01) | **4.2.1** (2026-07-09; v4.0.0 2026-04-10) | built-in | **0.186.1** (r186, 2026-09-24) |
| Full bundle (**measured**) | `pixi.min.js` 820 KB / **231 KB gz** (tree-shakes smaller) | `phaser.min.js` 1.34 MB / **343 KB gz** | 0 | `three.module.min.js` + `three.core.min.js` ≈ **188 KB gz** (WebGL); `three.webgpu.min.js` + core ≈ **300 KB gz** |
| Fit for STARFORGE | **Best.** A renderer, not a framework. Pairs with a DOM UI. GPU filters, ParticleContainer, meshes and shaders. | A full game framework (scenes, physics, input, cameras). Overkill when the UI is DOM. v4 "Filters" replace FX/BitmapMask; 4.2 adds Mesh2D, Stencil and a Spine backend. | OK for a simple starfield. `shadowBlur` glow and thousands of particles get slow on Chromebooks. No shader bloom. | Only for real 3D. The vision doc says "no heavy 3D engine". |

**PixiJS 8 facts:**
- The default renderer priority in code is **`["webgl", "webgpu", "canvas"]`** (read from `autoDetectRenderer.mjs` in 8.22.0). The docs say the WebGPU renderer is "feature complete" but recommend **WebGL for production**. v8.16 added an **experimental Canvas 2D renderer** (`preference: 'canvas'`). v8.18 allows `preference` arrays. v8.21 added TS 6/7 support and lazy `WebGLLoader`/`WebGPULoader`/`CanvasLoader` extensions. v8.22 changed **Tab to activate the accessibility layer by default** (set `activateOnTab: false` if Tab must not trigger it).
- **ParticleContainer + Particle** (v8). The blog claims 1,000,000 particles at 60 fps on an M3 MacBook Pro, against 200k Sprites. Only `position` is dynamic by default; turn on `scale`, `rotation`, `color` (and so on) through `dynamicProperties`. Use one texture source (an atlas). There is **no built-in emitter**. **Behaviour changes:** v8.19 makes ParticleContainer respect inherited blend modes, and v8.20 makes particles inherit ancestor tint and alpha.
- **pixi-filters 6.1.5** (2025-11-29; v6 = Pixi v8) includes `AdvancedBloomFilter`, `BloomFilter`, `GlowFilter`, `GodrayFilter`, `ShockwaveFilter`, `CRTFilter`, `TwistFilter`, `ZoomBlurFilter`, `RGBSplitFilter`, `OldFilmFilter`, `KawaseBlurFilter`, `BackdropBlurFilter`, `SimplexNoiseFilter`, `ColorOverlayFilter`, `OutlineFilter`, `DropShadowFilter` and more. Import per filter (`pixi-filters/glow`). The built-in Pixi filters are Alpha, Blur (new halving scheme since 8.17; `legacy: true` restores the old output), ColorMatrix, Displacement and Noise.
- **Particle emitters for v8.** `@pixi/particle-emitter` **5.0.10** was published 2026-01-08 but still declares peers `@pixi/* >=6.0.4 <8.0.0`, so it is **not v8-compatible on npm**. Alternatives:
  1. **Write a ~150-line emitter on `ParticleContainer`** (recommended: full control, fastest).
  2. **revolt-fx 1.3.6** (2026-05-05; peer `pixi.js ^7.4 || ^8`), which has an online effect editor.
  3. `@spd789562/particle-emitter` on JSR, a fork of the upstream emitter on ParticleContainer. Low adoption.
- Ecosystem: `@pixi/react` **8.0.5** (2025-12-01; peers `pixi.js ^8.2.6`, `react >=19`), `@pixi/ui` 2.4.1 (2026-10-01), `@pixi/layout` 3.2.1 (Yoga), `@pixi/sound` 6.0.1 (2024-07-27), `svelte-pixi` 8.0.1 (2025-12-22), `@esotericsoftware/spine-pixi-v8` 4.3.13.

### 2.2 Recommended scene architecture

```
<body>
  <canvas id="fx">  ← PixiJS 8 (position:fixed; z-index:0; pointer-events:none except the tap target)
     layers: parallax starfield (3 TilingSprites at different speeds) → nebula (noise shader)
             → Star Core / planet (Mesh + custom shader) → ParticleContainer (stardust bursts)
             → AdvancedBloom/Glow on the core layer only (filters are per-container; keep them small)
  <div id="ui">     ← React DOM (z-index:1): panels, buttons, numbers, tooltips (crisp text, a11y, CSS animation)
```

- Drive Pixi imperatively from a small `render/` module. It reads the engine snapshot, and the engine never knows Pixi exists. `@pixi/react` is optional. Imperative Pixi avoids reconciliation cost and makes "spawn 40 particles on click" trivial.
- Cap the resolution: `resolution: Math.min(devicePixelRatio, 2)`, and lower it to 1 on low-end devices, with a "Reduce effects" setting. Pause the Pixi ticker on `visibilitychange→hidden`.
- **Spinning planet without Three.js.** Write a fragment shader on a Pixi `Mesh` quad that does sphere UV mapping (`uv → sphere normal → lon/lat → texture lookup + rotation offset`), plus a rim-light/atmosphere term. It is about 40 lines of GLSL, costs 0 KB of extra libraries, and looks 3D. Alternatives are a pre-rendered sprite-sheet rotation or a baked video texture.
- **If you really want Three.js** (e.g. a lit, rotating glTF planet), lazy-load it (`import('three')`) into a **separate canvas layered under** the Pixi canvas, use `WebGLRenderer` (about 188 KB gz), render at 30 fps and pause when hidden. `WebGPURenderer` (`three/webgpu`) auto-falls back to WebGL2, but you must `await renderer.init()` before the first render, the bundle is about 300 KB gz, and Linux/Firefox black-canvas reports exist *(secondary)*. Not worth it for a background.

---

## 3. UI framework and architecture

### 3.1 The architecture that works (AD, TMT and Synergism all converge on it)

```
src/
  engine/        PURE TS, no DOM/React/Pixi imports. Unit-testable in Node.
    num.ts       Decimal facade
    state.ts     GameState type + defaultState()
    content/     data tables: layers, upgrades, runes, achievements (IDs never change!)
    formulas.ts  production/cost functions (memoized behind dirty flags)
    tick.ts      tick(state, dtSeconds, ctx) — the only place time advances
    offline.ts   simulateOffline(state, ms) → OfflineReport
    rng.ts       seedable PRNG whose state is stored in the save
    save/        serialize.ts, migrate.ts, schema.ts (zod), storage.ts (adapter)
  app/           clock.ts (rAF + hidden fallback), uiSnapshot.ts (10–20 Hz), commands.ts (buy/prestige)
  render/        Pixi scene (reads snapshot + an event queue: "burst at x,y", "supernova")
  ui/            React components (read the snapshot, dispatch commands)
  platform/      web | tauri | electron storage and Steam adapters
```

- **Engine state is NOT framework state.** Do not put the `GameState` (with Decimal instances and large arrays) into React state, Vue `reactive()` or Svelte deep `$state`. Proxies on hot objects are slow and confusing. AD keeps `player` non-reactive. Each Vue component has an `update()` method that copies the values it shows (`this.resourceValue.copyFrom(...)`) at the user-set update rate (default `updateRate: 33` ms).
- **UI snapshot at 10–20 Hz.** A `uiSnapshot.ts` builds a flat object of **pre-formatted strings, booleans and small numbers** (`dustStr`, `dustPerSecStr`, `canAfford.engine3`, `progress.supernova` …) and publishes it to a store. Components subscribe to fields. Strings compare by value, so unchanged numbers do not re-render.
- **Commands, not mutations, from the UI**: `commands.buy('engine3', 'max')`. The engine validates and mutates; the next snapshot reflects it. Click feedback (number punch, particles) comes from an **event queue** the engine fills (`events.push({type:'gain', amount, x, y})`), which render and UI drain each frame.

### 3.2 Framework comparison (for hundreds of numbers updating at 10–20 Hz)

| | **React 19.3** | **Svelte 5** | **SolidJS** | **Preact 11** | Vue 3.5 |
|---|---|---|---|---|---|
| Version (date) | **19.3.0** (2026-09-09) | **5.57.2** (2026-10-06) | **1.9.17** stable (2026-10-07); **2.0.0-rc.14** (`next`, RC since 2026-08) | **11.0.1** (2026-10-08; 11.0.0 on 2026-09-30) | 3.5.43 (3.6 in RC) |
| Update model | VDOM re-render per subscribed component; React Compiler 1.0 (2025-10-07) auto-memoizes | compiled, fine-grained runes (`$state`, `$derived`, `$state.raw`) | fine-grained signals, no VDOM | VDOM, tiny; `@preact/signals` 2.11.3 bypasses VDOM for text | proxy reactivity, fine-grained-ish |
| Runtime size (approx.) | ~60 KB gz (react + react-dom) | a few KB | ~7 KB | ~4–5 KB | ~35 KB |
| Perf with this pattern | **Fine** with field-level selectors plus a `textContent` escape hatch for hot counters | Excellent by default | Excellent | Excellent with signals | Good (AD, TMT and Prestige Tree are Vue 2) |
| Claude Code fluency | **Highest**: most training data and the fewest syntax mix-ups | Good. LLMs sometimes emit Svelte 4 syntax (`export let`, `$:`), so put "Svelte 5 runes only" in CLAUDE.md | Medium. 1.x vs 2.0 API split right now | High (React-compatible) | High |
| Pixi binding | `@pixi/react` 8.0.5 | `svelte-pixi` 8.0.1 | none official | via compat | `vue3-pixi` (community) |
| New/notable | 19.3: `<ViewTransition>` **stable**, `addTransitionType`, Fragment refs stable, `use(browser())` | runes are mature | 2.0 RC: async as first-class, `For keyed={false}` replaces `Index`, `onSettled` | 11: Object.is hook deps, refs as props, IE11 dropped, TS ≥ 5.1 | — |

**Pick React 19.3 + Zustand 5** as the default. With Claude Code doing most of the typing, the ecosystem and LLM fluency matter more than raw re-render cost, and the snapshot pattern removes the cost anyway. **Svelte 5 is an equally valid choice** if you prefer its built-in transitions and lower overhead. Avoid Solid until 2.0 is stable (the API is in flux right now). Preact 11 shipped stable only on 2026-09-30, so wait a minor or two.

### 3.3 State plumbing (React)

- `zustand` **5.0.15** (2026-08-13). Use the **vanilla** `createStore` for the snapshot and `useStore(store, selector)` in components.
- **Zustand 5 gotcha:** a selector that returns a *new object or array* each call causes an infinite re-render loop ("Maximum update depth exceeded"). Return primitives, or wrap with `useShallow`.
- Escape hatch for the 5–10 hottest counters (the main currency, per-second rate):

```tsx
// ui/LiveText.tsx — writes textContent directly; React renders it once.
export function LiveText({ pick }: { pick: (s: Snapshot) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => snapshotStore.subscribe((s) => {
    const t = pick(s);
    if (ref.current && ref.current.textContent !== t) ref.current.textContent = t;
  }), [pick]);
  return <span ref={ref} className="num" />;
}
```

- Alternatives: `jotai` 3.0.1 (2026-09-29), `valtio` 2.3.2, `nanostores` 1.5.5, `@preact/signals-react` 3.12.0, `@tanstack/store` 0.11.2. None is needed.
- UI motion: CSS transitions/keyframes for pop and punch, `motion` **14.1.0** (2026-10-09) for panel springs, and React 19.3 `<ViewTransition>` for tab swaps.

---

## 4. Game loop and background-tab behaviour

### 4.1 What browsers actually do (verified)

| Situation | Behaviour | Source |
|---|---|---|
| Tab hidden | `requestAnimationFrame` **stops entirely** | Chrome timer-throttling post |
| Tab hidden < 5 min (or chain count < 5, or WebRTC active) | `setTimeout`/`setInterval` checked **once per second** | Chrome 88 post |
| Tab hidden > 5 min **and** chain count ≥ 5 **and** silent ≥ 30 s **and** no WebRTC | **Intensive throttling: timers checked once per *minute*** | Chrome 88 post |
| Page played audible sound in the last 30 s | Exempt (minimal throttling). A silent track does **not** count | Chrome 88 post |
| Chrome **133+ with Energy Saver on** (Chrome turns it on automatically at 20% battery) and the tab hidden and silent > 5 min and "CPU-intensive" | Tab is **frozen**: timers, events and promise callbacks pause; `freeze`/`resume` events fire. Workers in the frozen group are paused too | Chrome "freezing on Energy Saver" post |
| Tab discarded (memory pressure) | No event at all. On reload, `document.wasDiscarded === true` | Page Lifecycle API |
| Laptop sleep / phone background | Nothing runs | — |

**Conclusion:** no timer strategy (Worker timers, audio hacks) is reliable. Synergism uses the `worker-timers` package (8.0.34) on web and desktop to dodge main-thread throttling. On mobile it detects a >60 s wall-clock gap and runs `calculateOffline(gap)`. Freezing and discarding defeat worker timers anyway, so **design so throttling only reduces granularity, never correctness:** every advance is computed from **`Date.now()` deltas**, and big gaps go through the offline path.

### 4.2 Loop pattern (fixed-timestep accumulator, Gaffer-style, wall-clock driven)

```ts
// app/clock.ts
const SIM_MS = 50;                 // 20 Hz simulation (AD's base rate is also 50 ms)
const MAX_STEPS_PER_FRAME = 8;     // spiral-of-death guard
const OFFLINE_GAP_MS = 60_000;     // AD "hibernation catch-up" also triggers at > 60 s
let acc = 0;
let lastWall = Date.now();

export function frame() {
  const now = Date.now();
  let gap = now - lastWall;
  lastWall = now;
  if (gap < 0) gap = 0;                                   // system clock moved backwards
  if (gap > OFFLINE_GAP_MS) { runOffline(gap); acc = 0; } // §6: capped, reported
  else {
    acc += gap;
    let n = 0;
    while (acc >= SIM_MS && n < MAX_STEPS_PER_FRAME) { engine.tick(SIM_MS / 1000); acc -= SIM_MS; n++; }
    if (acc >= SIM_MS) { engine.tick(acc / 1000); acc = 0; } // fold the backlog into one larger step
  }
  render.frame(acc / SIM_MS);        // interpolation alpha for smooth visuals
  snapshot.maybePublish(now);        // 10–20 Hz UI snapshot
  state.lastTick = now;              // persisted; offline time = Date.now() - lastTick on load
}

// rAF while visible; a 1 s interval keeps coarse progress while hidden (throttling only hurts granularity)
const loop = () => { frame(); rafId = requestAnimationFrame(loop); };
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { saveNow("hidden"); hiddenTimer = setInterval(frame, 1000); }
  else { clearInterval(hiddenTimer); frame(); /* the gap is handled inside frame() */ }
});
```

- The engine `tick(dt)` must be **dt-correct**: `amount += rate * dt`. Discrete things (autobuyer cadence, rune-roll cooldowns) use accumulators inside the state, never `setInterval`.
- For "how long was I away", use `Date.now()`. `performance.now()` is monotonic but resets per page and does not survive reloads.
- AD handles in-session hibernation explicitly: if a single loop gap exceeds 60 s, it stops the interval and calls `simulateTime(gap)`. TMT runs `setInterval(…, 50)` with `diff = (Date.now() - player.time)/1000` and a `maxTickLength()` cap.

---

## 5. Saving

### 5.1 Storage choice

| | `localStorage` | IndexedDB (`idb-keyval` **6.3.0**, 2026-07-08; `idb` 8.0.4; `localforage` 1.10.0, **2021**, stale) |
|---|---|---|
| API | **synchronous**: a write completes before `pagehide` returns | async. A write started in `visibilitychange`/`pagehide` **may not finish** before the page dies |
| Quota | ~**5 MiB per origin** (MDN). Throws `QuotaExceededError` | large (Chrome up to 60% of disk) |
| Use for | the **primary save** (compressed saves are 5–50 KB) | rolling backup history, large blobs, cloud-sync queue |

Call `navigator.storage.persist()` after the first meaningful interaction. Chromium and Safari grant or deny silently based on engagement, and Firefox prompts. Persisted origins are skipped by LRU eviction.

### 5.2 Eviction and shared-origin traps (all verified)

- **Safari's 7-day rule.** With cross-site tracking prevention on (the default), an origin with no user interaction in the last 7 days *of Safari use* has **all script-written storage deleted** (MDN). A friend who stops playing for a week on iPhone Safari loses the save. Mitigations: export string, cloud save, and a home-screen PWA install (the WebKit team has said home-screen apps have their own usage counter, but MDN does not confirm an exemption, so do not rely on it).
- **GitHub Pages:** every project site under `https://<user>.github.io/<repo>/` shares **one origin**, so localStorage keys and the 5 MiB quota are shared with all your other Pages projects. Namespace keys (`starforge:save:A`).
- **itch.io:** HTML5 games are served from shared CDN hosts (`html-classic.itch.zone` / `html.itch.zone`). Forum reports show **localStorage shared across unrelated games**, key collisions (e.g. a generic `gameJSON` key) and `QuotaExceededError` caused by *other* games' data. On iPad Safari with "Prevent cross-site tracking", **storage inside itch's iframe doesn't work** (an itch moderator says this is by design). Use a unique key prefix, keep saves small, wrap writes in try/catch and show an error, and push export/import.

### 5.3 Encoding pipeline

| Option | Version (date) | Notes |
|---|---|---|
| **fflate** (`zlibSync`/`unzlibSync`) | **0.8.3** (2026-05-16) | ~21 KB min ESM (tree-shakes to a few KB for zlib only). **zlib's Adler-32 means corrupted data fails to inflate**, which gives free integrity checking |
| lz-string (`compressToBase64`) | 1.5.0 (2023-03-04) | ~1 KB gz. Used by Synergism and many incrementals. **No checksum**: corrupt input returns `null` or garbage |
| pako | 3.0.2 (2026-09-12) | What AD uses (deflate). Heavier than fflate |
| Native `CompressionStream('deflate')` | Baseline widely available since **May 2023** | 0 KB, but **async** (Streams), which makes the synchronous last-gasp save awkward. Good for export/cloud |
| `Uint8Array.prototype.toBase64({alphabet:'base64url', omitPadding:true})` | Baseline **2025** (newly available, Sept 2025) | Replaces the `btoa(String.fromCharCode(...))` dance. Feature-detect and fall back |

**Measured** on a synthetic 31 KB STARFORGE-like save (60 currencies, 120 generators, 300 upgrades, 200 runes): lz-string base64 gave **12.7 KB** (5.9 ms encode / 2.6 ms decode). fflate zlib + base64 gave **10.9 KB** (5.3 ms / 2.0 ms).

```ts
// engine/save/serialize.ts
const MAGIC = "STARFORGE1:";                // a prefix that identifies the game AND the encoding version
export function encode(s: GameState): string {
  const json = JSON.stringify({ v: SAVE_VERSION, t: Date.now(), d: s });   // Decimals → strings via toJSON()
  const z = zlibSync(strToU8(json), { level: 6 });
  return MAGIC + toB64Url(z);                // base64url: no + / = (AD strips these so double-click selects the whole string)
}
export function decode(str: string): RawSave {
  const s = str.trim();
  if (!s.startsWith(MAGIC)) throw new SaveError("not a Starforge save");
  return JSON.parse(strFromU8(unzlibSync(fromB64Url(s.slice(MAGIC.length)))));  // throws on corruption
}
```

### 5.4 Corruption protection and autosave policy

1. **Validate before writing.** Run `NaNcheck` / `schema.safeParse(state)`. If it fails, **do not overwrite** good data; log it and toast. Synergism calls `playerJsonSchema.parse(player)` (zod 4) on every save.
2. **Round-trip check.** `decode(encode(state))` must succeed before the write (cheap at these sizes).
3. **Two alternating slots:** `starforge:save:A` / `:B` plus `starforge:save:latest = 'A'|'B'`. On load, try latest, then the other. Pick the newest *valid* one by the embedded `t`.
4. **Rolling backups** in IndexedDB, AD-style. AD keeps 9 auto-backup slots per save slot: "online" every 1 min / 5 min / 20 min / 1 h of play, "offline" ones taken on load after >10 min / >1 h / >5 h away (so a bad offline simulation can be undone), and a reserve slot. Keys are `backupSave-{slot}-{id}` with timers in `backupTimes-{slot}`.
5. **When to save.** Every **15–30 s** (AD defaults to `autosaveInterval: 30000`, TMT to 5 s), on `visibilitychange→hidden`, on `pagehide`, immediately after prestige/reset, and after importing. Per Chrome's Page Lifecycle guidance, **do not use `beforeunload`** as the save hook: it is unreliable on mobile, needs prior user interaction and can hurt the bfcache. TMT still uses `onbeforeunload`, which is a legacy pattern.
6. **Export/import UI from day one:** copy to clipboard, download as `.txt`, paste to import. Before import, back up the current save and show a preview ("Layer: Nebula, Stardust 1.2e450, saved 3 h ago").

### 5.5 Versioning and migrations

```ts
// engine/save/migrate.ts — forward-only, numbered, never edited after release
export const SAVE_VERSION = 4;
const migrations: Record<number, (d: any) => void> = {
  2: (d) => { d.runes ??= []; },
  3: (d) => { d.stardust = d.dust; delete d.dust; },
  4: (d) => { d.settings.notation ??= "suffix"; },
};
export function migrate(raw: RawSave): RawSave {
  if (raw.v > SAVE_VERSION) throw new SaveError("save from a newer build"); // stale PWA cache! back it up, don't load
  for (let v = raw.v + 1; v <= SAVE_VERSION; v++) migrations[v]?.(raw.d);
  return { ...raw, v: SAVE_VERSION };
}
// then: deepMerge(defaultState(), raw.d), then schema.parse(...) with z.string().transform(s => new Decimal(s)) for Decimal fields
```

- AD uses the same structure: `migrations.patches = {1: fn, 2: fn, …}` applied by `player.version`, with `firstRealityMigration: 13`, separate `patchPreReality` / `patchPostReality` passes, then a deep-merge onto `Player.defaultStart`.
- TMT runs `Object.assign(getStartPlayer(), JSON.parse(...))` plus `versionCheck()`.
- Schema libraries: `zod` **4.6.5** (2026-09-13) or `valibot` **1.5.0** (2026-09-09, smaller bundle).
- **Never rename or reuse content IDs** (upgrade, rune and achievement IDs). Store them as stable strings, not array indices.

### 5.6 How Antimatter Dimensions structures saves (read from source, `src/core/storage/`)

- **One localStorage key**, `dimensionSave` (`dimensionTestSave` in dev), holds `{ current, saves: {0,1,2} }`: **three player slots** in one root object.
- **Serializer** (`serializer.js`, `GameSaveSerializer`) applies these steps in order:
  1. `JSON.stringify` with a replacer (`Infinity → "Infinity"`, `Set → Array`)
  2. `TextEncoder`
  3. **`pako.deflate`**
  4. bytes to a binary string
  5. `btoa`
  6. strip `=`, then replace `0→0a`, `+→0b`, `/→0c` (so double-click selects the whole string)
  7. append `"EndOfSavefile"`
  8. prefix with `"AntimatterDimensionsSavefileFormat" + "AAB"` (a 3-letter encoding version compared with string `>=`)
- **Decode** runs the steps in reverse when the magic prefix is present; otherwise it falls back to plain `atob` for legacy saves. The same machinery encodes automator scripts and glyph filters, each with its own magic string.
- **Backups** use 9 auto-backup slots (see §5.4). **Cloud saves** use Firebase (`cloud-saving.js`, with conflict modals for load and save). Integrity uses `js-sha512` in the dependency list.
- **Relevant defaults** in `player.js`: `updateRate: 33`, `autosaveInterval: 30000`, `offlineProgress: true`, `offlineTicks: 1e5`, `hibernationCatchup: true`.

---

## 6. Offline progress

### 6.1 Algorithms

| Approach | How | Pros / cons | Who |
|---|---|---|---|
| **Simulate N ticks with a larger dt** | `ticks = min(seconds*20, offlineTicksSetting, ms/33)`; each tick uses `dt = remainingTime / remainingTicks`; run async in chunks with a progress bar plus "Speed up" (halves remaining ticks) and "Skip" | Exact for all mechanics (autobuyers, challenges). Can take seconds with break_eternity | **AD** `simulateTime()`: base 50 ms ticks, max ticks `clampMax(floor(ms/33), 1e6)`, default 1e5. Gaps < 50 s use a "fast" mode of 50 ticks. Snapshots `playerStart` (deep merge) for the report |
| **Banked catch-up time** | Store `offTime.remain = gap` (capped). Each live tick adds `max(remain/10, diff)` extra time, so the game fast-forwards visibly over a few seconds | Trivial to implement, no modal. Coarse | **TMT** (`player.offTime`, cap `modInfo.offlineLimit` hours) |
| **Closed form** | Constant rate: `A += r·t`. For a generator chain where tier *k* produces tier *k−1* at rate *rₖ*: `G₀(t) = Σⱼ Gⱼ(0)·(Π_{i≤j} rᵢ)·tʲ/j!` (exact while multipliers are constant). Buying uses `affordGeometricSeries` | Instant, exact for the "pure generator" part | Common in mobile idlers (Pecorella's "Math of Idle Games") |
| **Hybrid (recommended)** | Split the offline window into **K segments** (e.g. K = 200–2000, or one per autobuyer interval). Within each segment, use closed-form production; at segment boundaries, run discrete logic (autobuyers, unlock checks, rune auto-roll). Yield to the UI every ~16 ms (`await scheduler.yield?.()` or `setTimeout 0`) with a progress bar | Fast and close to exact. Easy to cap | — |

### 6.2 Design rules

- **Cap** offline time (e.g. 8 h base, upgradeable to 24 h or more). Apply an **efficiency multiplier** (e.g. 50%, upgradeable). Both are good progression rewards and also guard against clock-cheat abuse.
- Treat **any** gap > 60 s (reload, sleep, a frozen tab returning, Tauri app reopened) the same way, so there is one code path.
- **Offline report modal:** time away (and the capped amount), currencies gained (`after − before`, formatted), levels and tiers reached, autobuyer purchases, runes rolled, and a "Collect" button (optionally "Watch it happen" for a TMT-style catch-up). Snapshot only the fields the report shows; do not deep-clone the whole state each time.
- **Determinism:** the PRNG state lives in the save, and offline rune rolls draw from it, so reload-scumming the offline report changes nothing. Use `pure-rand` **8.4.2** (2026-07-10) or an inline `sfc32`/`xoshiro128**`. `seedrandom` 3.0.5 (2019) is stale. (Synergism uses `fast-mersenne-twister`.)
- Clock tampering: clamp negative deltas to 0. Optionally ignore gaps larger than the cap. Anti-cheat beyond that is pointless for a game played among friends.

```ts
export async function simulateOffline(s: GameState, gapMs: number, onProgress?: (p: number) => void) {
  const capped = Math.min(gapMs, s.offline.capMs);
  const effMs = capped * s.offline.efficiency;
  const before = reportSnapshot(s);
  const K = Math.min(2000, Math.max(1, Math.floor(effMs / 1000)));   // ≤ 2000 segments
  const segSec = effMs / K / 1000;
  for (let i = 0; i < K; i++) {
    produceClosedForm(s, segSec);        // generators: exact polynomial/linear step
    runDiscreteSystems(s, segSec);       // autobuyers, unlock checks, rune auto-roll (seeded RNG)
    if ((i & 63) === 0) { onProgress?.(i / K); await yieldToUI(); }
  }
  return diffReport(before, reportSnapshot(s), gapMs, capped);
}
```

---

## 7. Hosting and distribution

### 7.1 GitHub Pages via Actions (official Vite workflow, current action majors)

Action versions verified on GitHub on 2026-10-10:
- `actions/checkout` **v7** (v7.0.1, 2026-07-20)
- `actions/setup-node` **v7** (v7.1.0, 2026-10-08)
- `actions/configure-pages` **v6** (v6.0.0, 2026-03-25)
- `actions/upload-pages-artifact` **v5** (v5.0.0, 2026-04-10)
- `actions/deploy-pages` **v5** (v5.0.1, 2026-09-01)

Node: `lts/*`, which is **24.21.0 "Krypton"** (2026-09-07). Node 26 is not LTS yet.

```yaml
# .github/workflows/deploy.yml   (Settings → Pages → Source: "GitHub Actions")
name: Deploy to Pages
on: { push: { branches: [main] }, workflow_dispatch: {} }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  deploy:
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: lts/*, cache: npm }
      - run: npm ci
      - run: npm test -- --run            # vitest: never deploy a broken save migration
      - run: npm run build
        env: { BASE_PATH: "/${{ github.event.repository.name }}/" }
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with: { path: ./dist }
      - id: deployment
        uses: actions/deploy-pages@v5
```

(Vite's docs pin each action to a commit SHA with a version comment. Pinning SHAs is the more secure choice.)

```ts
// vite.config.ts
export default defineConfig({
  base: process.env.BASE_PATH ?? "./",    // '/starforge/' on Pages project sites; './' for itch.io / Tauri / Electron
  plugins: [react(), VitePWA({ /* §7.3 */ })],
});
```

- **The base-path trap:** a project site lives at `/<repo>/`, so the default `base: '/'` produces 404s for every asset. Reference files in `public/` via `import.meta.env.BASE_URL`, not hard-coded `/`. Bundled imports are rewritten automatically.
- **Case sensitivity:** Windows is case-insensitive, while GitHub Pages and itch are not. `Star.png` vs `star.png` works locally and 404s in production. Enforce lowercase asset names with a lint or test.
- **Pages limits:** published site ≤ **1 GB**, soft bandwidth **100 GB/month**, 10-minute deploy timeout. Not allowed as free hosting for commercial SaaS or e-commerce (a free game is fine).
- **Alternatives:**
  - **Cloudflare Pages** (free: 500 builds/month, 20,000 files/site, 25 MiB per file; no bandwidth limit listed)
  - **Netlify** (free plan is now **credit-based, 300 credits**; bandwidth costs 20 credits/GB)

  Both give you your own origin, which avoids the shared `github.io` localStorage namespace.

### 7.2 itch.io HTML5

- Upload a **ZIP with `index.html`** at the top level. Limits: ≤ **1,000 files**, ≤ **500 MB** extracted, ≤ **200 MB** per file, paths ≤ 240 chars, **case-sensitive** names, relative paths only.
- Build with `vite build --base=./`. Embed options: "Click to launch in fullscreen" (no fixed size needed), "Mobile friendly" flag, auto fullscreen button.
- Storage caveats (shared origin, iPad iframe) are in §5.2. Set "Click to play" on so the AudioContext unlocks on that click.
- `vite-plugin-singlefile` 2.3.3 can inline everything into one HTML file. itch accepts a single `.html`, but then it "cannot reference other uploaded files". Not worth it with audio and atlases.

### 7.3 PWA (installable and offline)

- **`vite-plugin-pwa` 2.0.0** (2026-10-03). Peers: `vite ^3…^8`, `workbox-build`/`workbox-window` **7.4.1**, optional `@vite-pwa/assets-generator ^1 || ^2` (v2.0.0 2026-09-12). Requires **Node ≥ 20.19**. The 2.0 major's only flagged breaking change is the assets-generator v2 peer.
- Use **`registerType: 'prompt'`**, not `autoUpdate`. Show an "Update available" toast, **save first**, then call `updateSW(true)`. An auto-reload mid-session is jarring and can race an autosave.
- The default precache `globPatterns` is **`**/*.{js,css,html}`** only. Add `png,webp,svg,woff2,mp3,ogg,json` explicitly (and include js/css/html again when overriding). Workbox skips files larger than `maximumFileSizeToCacheInBytes` (**2 MiB default**), so music tracks need a raise or runtime caching.
- Manifest: `display: 'standalone'`, `orientation: 'any'`, maskable icons (the assets generator makes them), and `start_url`/`scope` matching `base`.
- A stale service worker can serve an old build against a newer save. That is exactly why `migrate()` refuses `raw.v > SAVE_VERSION` and keeps a backup (§5.5).

### 7.4 Desktop `.exe`

| | **Tauri 2** | Electron | Neutralinojs |
|---|---|---|---|
| Version | `tauri` crate **2.12.2** (2026-10-09), `@tauri-apps/cli` **2.12.1** (2026-09-30), `@tauri-apps/api` 2.12.2. (v3 is alpha; `tauri-action` **v1.0.0**, 2026-06-29) | **44.7.0** (2026-10-07; Chromium 152.0.7977.130, Node 24.21.0). 45 in beta. Forge 8.0.1, electron-builder 26.15.3 | framework **6.10.0** (2026-10-06), `neu` CLI 11.8.0 |
| Engine on Windows | **WebView2** (Edge/Chromium), part of the OS on Win10 (April 2018+) and Win11 | bundled Chromium | OS webview |
| Size | "a minimal Tauri app can be less than **600KB**" (Tauri docs). Default installer mode `downloadBootstrapper` adds **0 MB**; `embedBootstrapper` +1.8 MB; `offlineInstaller` +127 MB; `fixedVersion` +180 MB | Runtime zip `electron-v44.7.0-win32-x64.zip` is **158 MB** (measured from release assets). Installers typically land around 80–150 MB *(secondary)* | "~2MB uncompressed / ~0.5MB compressed" (its own claim) |
| Saves | Write the save to a file with `@tauri-apps/plugin-fs` 2.7.0 / `plugin-store` 2.5.0, or keep localStorage (persists in the app data dir) | `electron-store` 11.0.2 or a file via IPC; Steam Cloud | localStorage / file API |
| Steam | No official binding. Use the Rust `steamworks` crate **0.13.1** (2026-05-05) via a custom command. Community `tauri-plugin-steamworks` 0.1.0 (2026-07, very low adoption) | **steamworks.js 0.4.0** (2024-08-06; Synergism ships with it on Electron 39) or **steamworks-ffi-node 0.11.3** (2026-09-24; Koffi FFI, no C++ build). Call from the **main process** via IPC, not the renderer with `nodeIntegration` | none |
| Verdict | **Use for the friends' `.exe`.** Same Vite build (`base: './'`), tiny download, auto-updater plugin available | **Use only if going to Steam** (best-trodden path: Synergism went to Steam on 2026-02-21 *(secondary)*; AD has Steam build modes) | Skip: smallest ecosystem |

Desktop gotcha: browser and desktop are **different origins**, so saves do not carry over. Use the export string, or a "cloud" import. Tauri v2 on Windows serves from `http://tauri.localhost` by default. Changing the scheme (`useHttpsScheme`) or the bundle identifier later **resets localStorage**.

Mobile later: Synergism uses **Capacitor 8** (`@capacitor/core` 8.5.3, 2026-10-07) to wrap the same web build for Android and iOS.

---

## 8. Optional cloud saves and friend leaderboards

| Service | Free tier (verified on pricing pages 2026-10-10) | Fit |
|---|---|---|
| **Supabase** (`@supabase/supabase-js` **2.117.3**, 2026-10-07) | **2 active projects**, **500 MB DB**, 5 GB egress (+5 GB cached), **50k MAU**, 1 GB file storage, 500k Edge Function invocations, 200 concurrent realtime connections, 2M realtime messages. **Projects pause after 1 week of inactivity** | **Best fit.** Postgres plus Row-Level Security. Anonymous sign-in (then link email) means friends don't need passwords. Tables `saves(user_id pk, updated_at, version, blob text)` and `scores(user_id, name, layer, log10_best double precision, updated_at)`. Sort by `log10_best`, because Decimals don't fit SQL numerics; use `slog` for eternity-scale values. Keep it awake with a GitHub Actions cron ping, or accept the occasional "wake-up" delay |
| **Firebase** (`firebase` **13.0.0**, 2026-10-07) | Spark: Firestore **1 GiB**, **50k reads / 20k writes / 20k deletes per day**, 10 GiB/month egress. Auth **50k MAU**. Hosting 10 GB storage, 360 MB/day transfer. **Cloud Storage not included on Spark**; Cloud Functions need Blaze | Fine (AD uses Firebase for cloud saves). Daily quotas are generous for friends. Never pauses |
| **PocketBase** (server **v0.40.5**, 2026-10-08; JS SDK **0.28.1**) | Free software: a single Go binary with SQLite. You need a host (VPS, home server). Managed **PocketHost** pricing is unclear and conflicting for 2026 *(secondary)* | Simplest self-hosted backend, but pre-1.0 (breaking changes) and you run the server |

**Patterns:**
- Cloud save is "upload the same export string". Resolve conflicts by `t` plus a progress metric, with a "keep local / keep cloud" modal as AD does.
- Throttle uploads to about once per minute and on prestige. Synergism throttles Steam Cloud sync to 60 s.
- Never block gameplay on the network.

---

## 9. Testing

| Tool | Version (date) | Use |
|---|---|---|
| **Vitest** | **5.0.3** (2026-09-30; 5.0.0 on 2026-09-03). Requires **Node ≥ 22.12, Vite ≥ 6.4** | Engine maths, formulas, migrations, save round-trip, offline equivalence. v5 notes *(secondary)*: mocks are cleared before each test by default; **un-awaited async assertions now fail**; reporter output moves to `.vitest/`; browser mode locators match text exactly by default; the WebdriverIO package was removed |
| **fast-check** | **4.10.2** (2026-09-19) | Property tests: `sumGeometricSeries(afford(x)) ≤ x`, `decode(encode(s)) ≡ s`, "offline(2h) ≈ 72,000 live ticks within 1%", "no NaN after any command sequence" |
| **@playwright/test** | **1.64.0** (2026-10-07) | Smoke tests against `vite preview` (with the real `base`). Cover boot, tap, buy, prestige, export → clear storage → import, reload persistence. **`page.clock`** (install / fastForward / setSystemTime) tests the offline modal deterministically |
| `@vitest/browser-playwright` | 5.0.3 | Optional: run Pixi/DOM component tests in a real Chromium |

High-value tests for an incremental:
1. **Golden-master balance sim.** Seed the RNG, run a greedy bot (always buy the best `efficiencyOfPurchase`) for N simulated hours, and snapshot time-to-Supernova and time-to-Nebula. Any formula change that moves pacing shows up in the diff.
2. **Migration fixtures.** Commit a real save string from every released version (`fixtures/saves/v1.txt` …) and assert that each loads, migrates and validates.
3. **Offline equivalence.** `simulateOffline(s, 1h)` vs 72,000 × `tick(0.05)` within a tolerance (with efficiency = 1).

Lint/format (optional): `oxlint` 1.87.0, `@biomejs/biome` 2.5.15, `eslint` 10.12.0 + `typescript-eslint` 8.71.1.

---

## 10. Audio

- **howler.js 2.2.4** (released **2023-09-19**; last repo push about Nov 2025 *(secondary)*). It is in **maintenance mode but stable** and still widely used (about 800k weekly downloads *(secondary)*). Measured at **9 KB gz**. It gives you Web Audio with HTML5 Audio fallback, **audio sprites**, automatic mobile/autoplay unlock, and pooling. Types: `@types/howler` 2.2.13.
- **@pixi/sound 6.0.1** (2024-07-27, peer `pixi.js ^8`) is an alternative if you'd rather keep everything in Pixi.
- **Raw Web Audio** is about 100 lines: one `AudioContext`, `decodeAudioData` buffers, `GainNode` buses (master, sfx, music), and `context.resume()` on the first pointerdown. Choose it if you want zero dependencies and pitch-randomised click sounds (`playbackRate = 0.95 + rand*0.1`), which you'd want for "juice" anyway.
- **Recommendation:** Howler for v1, behind a 30-line `audio.ts` facade (`play('click', {rate})`, `setVolume('music', v)`) so it can be swapped. Use MP3 or AAC for universal support. Limit concurrent instances of the same SFX (e.g. max 4) so autoclickers don't produce a wall of noise.
- Note that a page playing *audible* sound is exempt from Chrome's intensive throttling. Don't rely on that, because Energy Saver freezing still applies and it drains batteries.

---

## 11. Fonts and the chunky "Roblox incremental" UI

Google Fonts metadata was read on 2026-10-10. Digit-width analysis was **measured** with opentype.js on the official TTFs from `google/fonts`.

| Font | Status on Google Fonts | Axes / weights | **Tabular digits?** | Role |
|---|---|---|---|---|
| **Fredoka** | Current family name. Designers Milena Brandão, Hafontia. Last modified 2025-09-11 | **variable `wght` 300–700, `wdth` 75–125** | **No** (no `tnum`, proportional digits) | Headings and buttons at weight 600–700. This is the web stand-in for Roblox's `Enum.Font.FredokaOne` |
| "Fredoka One" | **No longer listed** (absent from the metadata). Superseded by variable Fredoka | — | — | Use Fredoka 600–700 |
| **Lilita One** | listed (Display) | 400 only | No | Big titles and logo |
| **Luckiest Guy** | listed (Display, Astigmatic) | 400 only | No | Cartoon headline / "SUPERNOVA!" popups |
| Titan One | listed (Display) | 400 only | No | Alternative headline |
| **Baloo 2** | listed (Ek Type) | **variable `wght` 400–800** | **Yes (`tnum`)** | **Number counters** (`font-variant-numeric: tabular-nums`) |
| Nunito | listed | variable `wght` 200–1000 | **Yes** (all digits 600 units by default) | Body text and numbers |
| Rubik | listed | variable 300–900 | **Yes (`tnum`)** | Alternative numbers font |

- **Number jitter gotcha:** Fredoka, Lilita One, Luckiest Guy and Titan One all have **proportional digits**, so a counter updating at 10–20 Hz wiggles horizontally. Render counters in **Baloo 2 800** or **Nunito 900** with `font-variant-numeric: tabular-nums`, or give each number a fixed-width right-aligned box. AD sidesteps this with a monospace "Typewriter" font.
- **Self-host the fonts** (offline PWA, Tauri, no third-party requests) with Fontsource, all **5.3.0** (2026-07-19): `@fontsource-variable/fredoka`, `@fontsource/lilita-one`, `@fontsource/luckiest-guy` (plus `@fontsource-variable/baloo-2` or `@fontsource-variable/nunito`). Subset to Latin and preload the one used above the fold.

Roblox-style recipe translated to CSS (from the project's Roblox UI conventions: fill, vertical gradient, 3 px dark stroke, white label with ink outline, pop scale):

```css
.btn {
  --c: #ffb020;
  background: linear-gradient(180deg, color-mix(in oklab, var(--c), white 15%), color-mix(in oklab, var(--c), black 15%));
  border: 3px solid color-mix(in oklab, var(--c), black 55%);
  border-radius: 14px;
  box-shadow: inset 0 3px 0 rgb(255 255 255 / .35), 0 4px 0 color-mix(in oklab, var(--c), black 60%);
  font: 700 1.1rem/1 "Fredoka Variable", system-ui;
  color: #fff;
  paint-order: stroke fill;
  -webkit-text-stroke: 4px #1b1030;            /* text outline; paint-order keeps the fill crisp */
  transition: transform .08s ease-out;
}
.btn:hover  { transform: scale(1.06); }
.btn:active { transform: scale(.94); }
.num { font: 800 1.4rem "Baloo 2 Variable"; font-variant-numeric: tabular-nums; }
@keyframes punch { 50% { transform: scale(1.08); } }   /* throttle number punches to ≤10 Hz */
```

---

## Recommended stack (with pinned versions)

| Concern | Choice | Pin | Released |
|---|---|---|---|
| Runtime (dev/CI) | Node.js LTS "Krypton" | **24.21.0** | 2026-09-07 |
| Language | TypeScript (strict). *TS 7.0.2 (Go-native, 2026-07-08) has **no programmatic API yet**; `typescript-eslint` peers `<6.1.0` and `svelte-check` peers `^5 \|\| ^6`, so pin 6.x for tooling and optionally run TS 7 `tsc` for speed* | **typescript@6.0.3** | 2026-04-16 |
| Build | Vite (Rolldown + Oxc; Vite 8.0 GA 2026-03-12) | **vite@8.3.4** | 2026-10-08 |
| UI | React + React DOM | **react@19.3.0**, **react-dom@19.3.0** | 2026-09-09 |
| Vite React plugin | Oxc-based Refresh (no Babel) | **@vitejs/plugin-react@6.1.2** | 2026-10-05 |
| UI state (snapshot) | Zustand vanilla store + selectors | **zustand@5.0.15** | 2026-08-13 |
| *Alt UI* | Svelte 5 runes + plugin | svelte@5.57.2, @sveltejs/vite-plugin-svelte@7.3.1 | 2026-10-06 / 2026-09-23 |
| Big numbers | break_eternity.js (behind `num.ts`) | **break_eternity.js@2.1.3** | 2025-12-07 |
| Notation (optional) | Eternal Notations | **eternal_notations@1.1.1** | 2024-10-20 |
| 2D renderer | PixiJS v8, WebGL preference | **pixi.js@8.22.0** | 2026-10-01 |
| Filters (bloom/glow/godray/shockwave) | pixi-filters v6 | **pixi-filters@6.1.5** | 2025-11-29 |
| Particles | Own emitter on `ParticleContainer` (built in). *Alt:* revolt-fx | (built-in) / revolt-fx@1.3.6 | — / 2026-05-05 |
| 3D (only if ever needed, lazy-loaded) | three.js `WebGLRenderer` | three@0.186.1 | 2026-09-24 |
| UI animation | CSS + Motion | **motion@14.1.0** | 2026-10-09 |
| Compression | fflate zlib (Adler-32 integrity) | **fflate@0.8.3** | 2026-05-16 |
| Save validation | zod v4 (or valibot 1.5.0) | **zod@4.6.5** | 2026-09-13 |
| Backup history store | idb-keyval | **idb-keyval@6.3.0** | 2026-07-08 |
| RNG | pure-rand (or inline sfc32) | **pure-rand@8.4.2** | 2026-07-10 |
| Audio | howler.js behind a facade | **howler@2.2.4** (+ @types/howler@2.2.13) | 2023-09-19 |
| Fonts (self-hosted) | Fredoka (UI), Baloo 2 (numbers), Lilita One / Luckiest Guy (titles) | **@fontsource-variable/fredoka@5.3.0**, @fontsource/lilita-one@5.3.0, @fontsource/luckiest-guy@5.3.0 | 2026-07-19 |
| PWA | vite-plugin-pwa (+ workbox 7.4.1) | **vite-plugin-pwa@2.0.0** | 2026-10-03 |
| Unit/property tests | Vitest + fast-check | **vitest@5.0.3**, **fast-check@4.10.2** | 2026-09-30 / 2026-09-19 |
| E2E smoke | Playwright (with `page.clock`) | **@playwright/test@1.64.0** | 2026-10-07 |
| Lint (optional) | oxlint | oxlint@1.87.0 | 2026-10-05 |
| Web hosting | GitHub Pages via Actions | checkout@v7, setup-node@v7, configure-pages@v6, upload-pages-artifact@v5, deploy-pages@v5 | 2026 |
| Secondary host | itch.io ZIP (`--base=./`); Cloudflare Pages for an own origin | — | — |
| Desktop `.exe` | Tauri 2 (WebView2, NSIS) | **@tauri-apps/cli@2.12.1**, tauri crate 2.12.2, @tauri-apps/api@2.12.2, tauri-action v1.0.0 | 2026-09-30 / 2026-10-09 / 2026-06-29 |
| Steam (only if) | Electron + Steamworks binding | electron@44.7.0 + steamworks-ffi-node@0.11.3 (or steamworks.js@0.4.0) | 2026-10-07 / 2026-09-24 |
| Cloud saves / leaderboard (optional) | Supabase free tier | **@supabase/supabase-js@2.117.3** | 2026-10-07 |

---

## Gotchas

1. **Shared-origin storage.** All `<you>.github.io/*` project sites share one localStorage namespace and its ~5 MiB quota. itch.io games share `html-classic.itch.zone` with *every other itch game* (key collisions and other games filling the quota have been reported). Namespace every key, catch `QuotaExceededError` and *tell the player*.
2. **Saves can vanish.**
   - Safari deletes script-written storage after **7 days without interaction** (ITP).
   - iPad Safari blocks storage inside itch's iframe.
   - LRU eviction affects non-persisted origins.

   Ship **export/import strings in the MVP**, call `navigator.storage.persist()`, and offer cloud save later.
3. **Timers and rAF are not a clock.**
   - rAF stops in hidden tabs.
   - Timers drop to 1/s, then **1/min** after 5 min hidden.
   - Chrome 133+ **freezes** CPU-heavy hidden tabs under Energy Saver (auto-on at 20% battery), workers included.
   - Discarded tabs get no event at all.

   Compute everything from `Date.now()` deltas and route gaps > 60 s through the offline path.
4. **Don't save on `beforeunload`.** It is unreliable on mobile and needs prior interaction. Save synchronously to localStorage on `visibilitychange→hidden` and `pagehide`, plus an interval and every prestige. An async IndexedDB write started at that moment may never finish.
5. **break_eternity costs real CPU offline.** It is 3–25× slower than break_infinity per op (measured), and it allocates on every op. Cache multipliers behind dirty flags. Use closed-form or segmented offline simulation (≤ ~2000 segments) instead of 100k ticks. Yield to the UI with a progress bar.
6. **Decimal foot-guns.**
   - `valueOf()` returns a string, so `<` and `+` silently compare or concatenate as strings (verified). Use TS strict mode.
   - `JSON.parse` returns strings, so revive Decimals via the schema.
   - One `NaN` poisons everything and then gets saved. Validate (zod/NaN-check) before overwriting the good slot.
7. **Versioning traps.** A stale PWA service worker can load an *older* build against a *newer* save. Refuse saves with `v > SAVE_VERSION` (and back them up), use `registerType: 'prompt'`, and save before reloading. Migrations are forward-only and immutable. Content IDs are never renamed.
8. **Reactivity overload.** Do not put engine state into React state, Vue `reactive` or Svelte deep `$state`. Publish a 10–20 Hz snapshot of formatted *strings*. Zustand 5 selectors that return new objects cause infinite render loops; use `useShallow` or primitives.
9. **`@pixi/particle-emitter` 5.0.10 is not PixiJS-8 compatible** (peer `<8.0.0`) despite its 2026-01 publish date. Use `ParticleContainer`/`Particle` or revolt-fx. Note the 8.19/8.20 behaviour changes (blend mode, inherited tint/alpha).
10. **TypeScript 7 tooling gap.** TS 7.0 ships no programmatic API. `typescript-eslint` (peer `<6.1.0`) and `svelte-check` (`^5 || ^6`) need TS 6. Pin `typescript@6.0.3`.
11. **Vite base path and case sensitivity.** Use `/<repo>/` on Pages project sites and `./` for itch, Tauri and Electron. Use `import.meta.env.BASE_URL` for `public/` files. Windows hides filename-case bugs that 404 on Pages and itch.
12. **Fonts jitter.** Fredoka, Lilita One, Luckiest Guy and Titan One have no tabular digits (measured). Use Baloo 2, Nunito or Rubik with `tabular-nums` for counters.
13. **PWA precache defaults** cover only `js/css/html`, and Workbox skips files over 2 MiB. Audio, atlases and fonts are otherwise *not* available offline.
14. **Desktop builds have their own origin.** Web saves don't appear in the Tauri/Electron build. Changing Tauri's identifier or scheme resets storage. Plan import/export or file-based saves.
15. **Supabase free projects pause after 7 days idle.** Firebase Spark has no Cloud Storage or Functions. For leaderboards, store `log10(value)` (or `slog`) as a double, never the Decimal.
16. **Audio unlock.** An `AudioContext` needs a user gesture. Keep itch's "Click to play" on and resume the context on the first `pointerdown`. Cap concurrent instances of the same SFX.
17. **Three.js WebGPU** needs `await renderer.init()`, costs about 300 KB gz, and has reported black-canvas issues on some Linux/Firefox setups. Prefer a Pixi shader "fake 3D" planet.
18. **Electron + Steam native modules** belong in the **main process** via IPC. Enabling `nodeIntegration` in the renderer (as some examples do) weakens the sandbox. `steamworks.js` hasn't released since 2024-08; `steamworks-ffi-node` is the actively maintained option.

---

## Sources

**Big numbers and notation**
- break_eternity.js README and releases: https://github.com/Patashu/break_eternity.js · https://github.com/Patashu/break_eternity.js/releases
- break_infinity.js README: https://github.com/Patashu/break_infinity.js
- Eternal Notations: https://github.com/MathCookie17/Eternal-Notations
- AD Notations: https://github.com/antimatter-dimensions/notations
- npm registry (all versions and dates; queried via `npm view <pkg> time dist-tags`): https://registry.npmjs.org/
- break_eternity type definitions (API surface): https://unpkg.com/break_eternity.js@2.1.3/dist/index.d.ts

**Reference implementations (source read directly)**
- Antimatter Dimensions source:
  - repo: https://github.com/IvarK/AntimatterDimensionsSourceCode
  - `src/core/storage/serializer.js`: https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/storage/serializer.js
  - `src/core/storage/storage.js`: https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/core/storage/storage.js
  - `src/game.js` (`gameLoop`, `simulateTime`): https://raw.githubusercontent.com/IvarK/AntimatterDimensionsSourceCode/master/src/game.js
  - `src/core/intervals.js`, `src/core/storage/migrations.js`, `src/core/player.js`, `package.json`
- The Modding Tree:
  - repo: https://github.com/Acamaeda/The-Modding-Tree
  - `js/utils/save.js`: https://raw.githubusercontent.com/Acamaeda/The-Modding-Tree/master/js/utils/save.js
  - `js/game.js`
- Synergism:
  - repo: https://github.com/Pseudo-Corp/SynergismOfficial
  - `package.json`
  - `src/Synergism.ts`
  - `src/Timers.ts`
- Kongregate/Pecorella, "The Math of Idle Games, Part I": https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i

**Timing and lifecycle**
- Chrome timer throttling (Chrome 88): https://developer.chrome.com/blog/timer-throttling-in-chrome-88
- Chrome tab freezing on Energy Saver (Chrome 133): https://developer.chrome.com/blog/freezing-on-energy-saver
- Page Lifecycle API: https://developer.chrome.com/docs/web-platform/page-lifecycle-api
- Glenn Fiedler, "Fix Your Timestep!": https://gafferongames.com/post/fix_your_timestep/

**Storage**
- MDN, storage quotas and eviction: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- MDN, CompressionStream: https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream
- MDN, `Uint8Array.prototype.toBase64`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toBase64
- itch.io forum, shared localStorage: https://itch.io/t/1158456/html5-local-storage-seems-to-be-shared-between-multiple-games · https://itch.io/t/2661408/local-storage-is-shared-between-games
- itch.io forum, iPad storage: https://itch.io/t/2636350/localstorage-doesnt-work-for-html5-games-on-ipad-by-default
- itch.io CDN change devlog: https://brushmen.itch.io/fwmwip/devlog/581886/itchios-cdn-change-may-affect-your-saved-progress-if-in-browser-only

**Rendering**
- PixiJS blog: https://pixijs.com/blog
- PixiJS releases: https://github.com/pixijs/pixijs/releases
- ParticleContainer post: https://pixijs.com/blog/particlecontainer-v8
- Renderers guide: https://pixijs.com/8.x/guides/components/renderers
- `autoDetectRenderer` source: https://unpkg.com/pixi.js@8.22.0/lib/rendering/renderers/autoDetectRenderer.mjs
- pixi-filters: https://github.com/pixijs/filters
- particle-emitter: https://github.com/pixijs-userland/particle-emitter · https://jsr.io/@spd789562/particle-emitter
- RevoltFX README: https://cdn.jsdelivr.net/npm/revolt-fx@1.3.6/README.md
- Phaser 4.2 announcement: https://phaser.io/news/2026/06/phaser-v4-2-0-released
- Phaser 4.2.0 changelog: https://unpkg.com/phaser@4.2.1/changelog/v4/4.2/CHANGELOG-v4.2.0.md
- three.js WebGPURenderer manual: https://threejs.org/manual/en/webgpurenderer
- three.js PR #32240 (bundle sizes): https://github.com/mrdoob/three.js/pull/32240
- Utsubo WebGPU migration guide *(secondary)*: https://www.utsubo.com/blog/webgpu-threejs-migration-guide
- Library sizes measured from unpkg/jsDelivr builds: `phaser@4.2.1`, `pixi.js@8.22.0`, `three@0.186.1`, `pixi-filters@6.1.5`, `howler@2.2.4`, `fflate@0.8.3`, `lz-string@1.5.0`

**UI frameworks and build**
- React 19.3 post: https://react.dev/blog/2026/09/09/react-19-3
- React blog index (React Compiler v1.0): https://react.dev/blog
- Vite 8 announcement: https://vite.dev/blog/announcing-vite8
- Vite static deploy guide: https://vite.dev/guide/static-deploy
- Solid releases: https://github.com/solidjs/solid/releases · InfoQ on Solid 2.0: https://www.infoq.com/news/2026/05/solidjs-2-async/
- Preact 11 beta: https://www.infoq.com/news/2025/09/preact-11-beta
- TypeScript 7 release *(secondary)*: https://infoq.com/news/2026/08/typescript-7-released/
- Nx TypeScript 7 guide: https://nx.dev/docs/technologies/typescript/guides/typescript-7

**Hosting and distribution**
- GitHub Pages limits: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Netlify pricing: https://www.netlify.com/pricing/
- itch.io HTML5 docs: https://itch.io/docs/creators/html5
- vite-plugin-pwa: https://vite-pwa-org.netlify.app/guide/ · https://vite-pwa-org.netlify.app/guide/static-assets.html · https://github.com/vite-pwa/vite-plugin-pwa/releases/tag/v2.0.0
- GitHub Releases API (action majors, Tauri, Electron, Neutralino, PocketBase, Vitest, Howler)
- Tauri start: https://v2.tauri.app/start/
- Tauri Windows installer: https://v2.tauri.app/distribute/windows-installer/
- Electron releases (Chromium/Node per version): https://releases.electronjs.org/releases.json
- Electron v44.7.0 assets: https://github.com/electron/electron/releases/tag/v44.7.0
- Neutralinojs: https://neutralino.js.org/
- steamworks.js: https://www.npmjs.com/package/steamworks.js
- steamworks-ffi-node: https://raw.githubusercontent.com/ArtyProf/steamworks-ffi-node/main/README.md
- crates.io (`steamworks`, `tauri`, `tauri-plugin-steamworks`): https://crates.io/
- Better Stack Tauri vs Electron comparison *(secondary)*: https://betterstack.com/community/guides/scaling-nodejs/tauri-vs-electron-vs-deno-vs-electrobun/
- Synergism on Steam *(secondary)*: https://nerdschalk.com/synergism-on-steam-what-is-the-free-incremental-game-everyones-noticing/

**Backend**
- Supabase pricing: https://supabase.com/pricing
- Firebase pricing: https://firebase.google.com/pricing
- PocketHost pricing *(conflicting)*: https://pockethost.io/pricing
- PocketBase releases: https://github.com/pocketbase/pocketbase/releases

**Testing**
- Vitest 5 changes *(secondary)*: https://blog.openreplay.com/vitest-5-changes/
- Vitest releases: https://github.com/vitest-dev/vitest/releases

**Audio**
- howler.js: https://github.com/goldfire/howler.js
- JS audio libraries comparison, Aug 2026 *(secondary)*: https://www.pistack.xyz/posts/2026-08-23-javascript-audio-libraries-howler-tonejs-wavesurfer-comparison/

**Fonts**
- Fredoka specimen: https://fonts.google.com/specimen/Fredoka
- Google Fonts metadata: https://fonts.google.com/metadata/fonts
- Font binaries for the digit analysis: https://github.com/google/fonts (`ofl/fredoka`, `ofl/lilitaone`, `apache/luckiestguy`, `ofl/baloo2`, `ofl/nunito`, `ofl/rubik`, `ofl/titanone`)
- Fontsource packages on npm
