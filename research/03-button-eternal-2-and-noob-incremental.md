# Button Eternal 2 (Roblox, Button: StudiosTM) — with notes on the original Button Eternal

> Research date: 2026-10-10. Purpose: design inspiration for an ORIGINAL space-fantasy web incremental ("Starforge"), not a clone.
> **Source-quality warning:** Button Eternal 2 (BE2) has no wiki, no Trello and almost no written guides. Everything below comes from (a) the Roblox APIs (description, badges with award counts, gamepasses, votes), (b) the developers' patch notes re-posted verbatim in YouTube descriptions (channel "Mine More"), (c) code sites, and (d) my own reading of YouTube storyboard frames / thumbnails (low-res, 341×180 per frame). Anything read off a blurry frame or deduced is marked **(inferred)**. Hard odds/formulas for BE2 are not public; where useful I give genre baselines from sibling button-sims (see the genre H1 at the end).
> Reference images saved to `research/screenshots/`: `be1-button-rows-cost-gain.png`, `be1-floor-upgrade-tree.png`, `be2-storyboard-goals-hud.webp`, `be2-storyboard-mining-interstellar.webp`, `be2-update1-cards-shards.jpg`.

## Snapshot (facts)

| Item | Button Eternal 2 | Button Eternal (original) |
|---|---|---|
| Roblox title (10 Oct 2026) | `[SEASON 2⭐] Button Eternal 2` | `[UPD 11⚡] Button Eternal` |
| Group / devs | Button: StudiosTM — @NoelDevs (scripting/balancing/ideas), @WaterGotLazy (modeling/UI/balancing/ideas) | same |
| Created / last update | 2026-07-06 / 2026-09-02 | 2025-10-12 / 2026-08-06 |
| Visits / favourites | 1,514,612 / 5,685 | 2,977,780 / 50,995 |
| Votes | 3,202 up / 253 down = **92.7 %** | 5,225 / 627 = **89.3 %** |
| CCU | ~50 now, **peak 462** (Rotrends) | ~12 now |
| Avg session | 29.2 min (Rotrends 7-day) | — |
| Server size | 8 | 8 |
| Monetisation | 14 gamepasses, 13 dev products | 11 gamepasses |
| Official tagline | "🔥Buy Buttons! ❌Get higher Multipliers! 🌍Unlock new worlds! 🍀Get Lucky!" — How to play: Buy Buttons → Get higher Multipliers → Roll rare Runes → Unlock new Worlds → Discover a ton of Features. "Like the game and join the group for 10% Rune Luck." | "Buy Buttons to gain Stats – Higher Stats give you alot more Buffs! Open Runes to collect more powerful Buffs! … Inspired by **Anime Eternal • Infinite Mining Incremental • Stat Grinding Simulator 3**" |

**Version history (dev patch notes, verbatim lists condensed):**
- **V1 – Release day (~18 Jul 2026)**: "3 Worlds containing 8 zones in Total, Raids, Mining, Cards, Shards, Chests, Goals, Season Pass, Daily/Playtime Rewards, Divine Runes, 4 Gachas, World Quests" + "21 Button Stats, 7 Rune Packs, 2 Upgrade Trees, 150+ Upgrades, 12 Unique Pickaxes, 14 Unique Ores". A **Pre-Release Event** countdown screen gave timed rewards ("Earn Boosts, Gamepasses and more before Release!", "Play for 50 hours to obtain a Special Title").
- **V2 – Update 1 "Ocean" (~26–30 Jul)**: new Ocean map + Ocean Raid, Volcano King's Quests & rewards, Crimson Tide gacha, Tide's Trial gacha, Ocean chest, 1 new Divine Rune, 3 new Shards, 5 new Button Stats, 1 new Rune, +15 Mining-tree upgrades, 1 very rare ore, extended "Blocks Mined"/"Runes Opened" goals, top "Buttons Pressed" leaderboard, titles for very rare ores; raid key cap 500 → 1,000; "Rune Bulk & Luck Adjuster for mining area".
  - **v2.1 hot-fix (balance retreat)**: "Tide Token Chance from 3.5K – 600" (1/3,500 → 1/600), "Made some Ocean stats easier, as well to afford 2nd zone", "Ocean Rune chances easier", "Volcano World Quest from 20 to 10 Volcano King Quests", "Some new Automation Stats are easier", Tide Tokens now drop depending on raid mode.
- **V3 – Update 2 "Interstellar/Mining" (~1 Aug)**: reworked mining map (now to **5,000 m** depth), pickaxe enchantments ("rare ones with special abilities"), rebalanced mining, **"New Reset Layer Interstellar for Mining"** + **Interstellar Upgrade Tree with 33 unique upgrades** + Interstellar leaderboard, 4 new ores (2 very rare), 2 ore-index reward tiers, **3 new Ranks**, 1 new rune in the Depth Rune Pack, a mine chest, 1 new gamepass, **"Divine Rune Shadow Pity (Every rune has its own pity of 1m)"**, "All Normal Gachas got now a new Animation for rolling", "VIP perk that reduces Gacha cost works now on all Gachas".
- **Season 2 (title change; last update 2 Sep)**: contents unpublished. Newest code is literally `FinalCode` **(inferred: may signal end of active development)**.

**Original Button Eternal (BE1) update notes seen:** v9.75 "Overload Event every 3 hours", Overload Progression Gacha, Overload Potion; v10.0 "New Boost/Level Cap to Overload (Level 1000)", Forge crafts for Overload Tokens, Magic Raid to wave 2,000, swords for damage boost, Infinity Gacha (Gems boost at level 1.5k, raid damage at level 5k), 3 new rarities, Magma buttons with a damage-capped "Magma stat"; v11.0 "2.5M visits" event rune at spawn with 10 runes, "Event Rune Bulk", new buff "Event Rune Clone", "Admin Weather" in shop, "Buffed Gacha Bulk from Spinner from + to x Boost".

## Core loop (first 5 minutes)

1. Spawn in **Grassland (World 1)**. HUD: currency pill top-left (Gems), XP **Level bar** bottom-centre, "Grassland World Quest" tracker on the right. **(observed in storyboard)**
2. Walk along a winding path lined with **round pressure-plate buttons** (red and cyan rows). Each button has a floating label `--#n--` / **cost** / **+gain** (BE1 screenshot: `--#2-- 500 Cash … +1.99e15.19M Multiplier`; `--#1-- 100 Multiplier … +1.32e6.95M Rebirth`). Stepping on it buys it: you spend the lower stat and receive a lump of the higher stat. **Each stat buys the next one up** (Cash → Multiplier → Rebirth → … ), exactly the classic button-sim chain. (BE1 fact from screenshot; BE2 identical layout in storyboard.)
3. Within a minute or two the player reaches the **Basic Rune** altar near spawn (overhead odds list "Common 1/1, Uncommon …, Legendary …") and starts opening runes for stat multipliers. **(observed)**
4. **Goals** panel pays out immediately: "Time I–IV — Play the game for a Rune Luck Boost!", "Runes I–IV — Open Runes for a Rune Bulk Boost!", plus Buttons / Gachas / Mobs Defeated / Blocks Mined tabs, with Easy/Medium difficulty tags and toasts like "Time IV – Claimed!". **(observed)**
5. Players redeem codes for Luck Potions, Drop Potions, Fruit, Food, Tokens and "Level Resets", then grind toward the **World Quest** that gates World 2 ("You are missing the 'Grassland World Quest' to go into the next World!"). **(observed)**

## Currencies / resources

| Resource | How produced | Used for |
|---|---|---|
| **Button stats** (21 at launch, +5 in V2) | Bought on pressure-plate buttons with the previous stat in that world's chain | Buying the next stat; each stat multiplies earlier ones **(inferred, genre standard)** |
| Observed stat names (partly legible) | Grassland: Cash, Multiplier, Rebirth, Prestige, Mythic…; Desert: Sand, Dust, Cactus, Oasis/Pharaoh…; Volcano: Ember, Magma, Obsidian, Titan, Scorch, Flame…; Ocean: Pearl, Coral… **(inferred from frames)** | — |
| **Gems** | Main HUD currency; gachas "Test your luck for more Gems!" | Gachas / upgrades **(inferred)** |
| **Crystals** | Robux shop tab | Premium purchases (shop has Robux / Crystals / Tokens tabs) |
| **Tokens** | Codes (e.g. 25), shop | Token shop |
| **XP / Level** | Playing (Level-Up toasts) | Level rewards; "Level Resets" item exists **(effect unknown)** |
| **Bucks** | Mining | Mining upgrades (Bucks ×1→×1.2, Mining Rune Bulk, Mining Rune Luck +0.6→+0.7) |
| **Ores** (14 → 19) | Mining blocks down to 5,000 m | Pickaxes, Ore Index rewards, titles |
| **Interstellar** | Mining reset layer | 33-node Interstellar tree |
| **Shards** (gem-named: Morganiteno, Amethysto, Citrineno…) | Drops with % chance shown on the loot card (9.5 %, 7.1 %, 5.7 % seen) | Shard boosts ("Shard Boost Gradients"); ×2 Shard Luck pass |
| Raid keys (cap 1,000), **Tide Tokens** (1/600 drop) | Raids | Raid rewards, Tide gachas |
| Fruit (incl. Rainbow, Divine), Food, Potions (Luck, Drop I) | Codes, raids, shop packs | Buffs |
| Chests (Forest, Ocean, Mine) | World chests | Loot |
| Season Pass progress, Daily / Playtime rewards | Time | Rewards |

## Button / upgrade structure

- **Buttons**: fixed cost → fixed lump gain, gain scaled by multipliers (gamepass "x2 Button Stats" doubles all button gains; BE1 tree node "Button Multis (#31) +1 Button Stats"). Cost curves not published; genre norm is that each successive button costs far more per unit gained (see BS:ED table in the genre section) **(inferred)**.
- **Upgrade trees**: 2 trees + 150+ upgrades at launch; Mining tree +15 nodes in V2; **Interstellar tree = 33 hexagonal nodes** with a "Total Boost" summary box (e.g. "+0.01 Bucks, +0.1 Mining Speed, +0.1 Drops"). BE1 trees were **physical floor tiles** linked by neon lines, each tile titled with a pun + index + level ("Goldon! (#24) ×2.5 Gold Cash", "Gems Wow! (#23) ×1.5 Gems", "+1.1 Rune Speed"). **(observed)**
- Purchases fire a top-centre toast "Bought Upgrade (x1)" / "(x8)" — bulk buying is supported. **(observed)**
- **Additive luck upgrades** in mining: "Mining Rune Luck +0.6 → +0.7" (additive +0.1 per level) **(observed)**.
- Softcaps: not documented. BE1 had explicit caps ("Overload Level 1000", "Highered Damage Cap for Magma Stat").

## Reset / prestige layers (in order)

BE2's main reset layers are **not documented**; what is evidenced:

1. **Button-stat chain** — buying a higher stat consumes the lower one, so every step is a mini-reset of the stat below (BS:ED/BSM convention) **(inferred)**. "Rebirth" and "Prestige" appear as *stats* on overhead labels rather than menus **(inferred from frames)**.
2. **World unlocks** — gated by a per-world **World Quest** (Volcano required 20 → 10 "Volcano King Quests" after v2.1). Badge funnel shows how hard each gate is (see Pacing).
3. **Mining "Interstellar" reset** — "New Reset Layer Interstellar for Mining": resets mining progress (depth/ores/Bucks — **inferred**) for Interstellar points spent on the 33-node tree; has its own leaderboard.
4. **Ranks** — "3 New Ranks" in V3 (mining-side). BE1 had **Ranks 1–7** with badges: Rank 1 = 32,179 owners, Rank 2 = 9,309, Rank 3 = 3,177, Rank 4 = 324, Rank 5 = 104, Rank 6 = 63, Rank 7 = 38 (of 415,596 who got "Welcome!").
5. **Level Resets** — a consumable from codes; suggests the XP level can be reset for value **(inferred; effect unpublished)**.
6. BE1 extras: Overload levels (cap 1,000), "Sacrifice" (gamepass "Sacrifice God"), Forge crafting.

## RUNES / RNG systems

- **Rune Packs**: 7 at launch, +1 (Ocean Rune) in V2, +1 rune added to the **Depth Rune Pack** in V3 → roughly one pack per world/zone plus mining packs. Ocean Rune tiers visible: "Shiny 1/1 … Leviathan … Sea King …" **(odds illegible)**.
- **Divine Runes**: ultra-rare per-map runes; descriptions hidden until you unlock the map that drops them (V2: "only Visible if you unlock the Maps they can be obtained from"). **Pity: "Every rune has its own pity of 1m"** — a guaranteed drop after 1,000,000 opens of that pack (V3).
- **Luck sources**: +10 % (group + like); Goals "Time I–IV" (permanent Rune Luck); Luck gamepass ladder — **Luck 50 R$, Super Luck 150 R$, Ultra Luck 450 R$, Divine Luck 700 R$**; Luck Potion; mining Rune Luck upgrades (additive). BE1: code "ButtonEternalVerifyyy" = permanent **+0.25 Luck** (additive), Lucky / Ultra Lucky passes, Admin Weather (global luck events, **inferred**).
- **Bulk / speed**: Goals "Runes I–IV" give Rune Bulk; **Fast Runes** pass (450 R$); "Rune Bulk & Luck **Adjuster**" setting lets players *lower* their own bulk/luck in the mining area (same trick Noob Incremental uses to farm luck-immune runes).
- **Gachas**: 4 at launch (incl. a **Flame** gacha with randomized "Boost Ranges"), Crimson Tide and **Tide's Trial** in V2, new roll animation in V3, VIP reduces gacha cost. Spin passes: **Multi Spin 270 R$, Faster Spin 550 R$**.
- **Tide's Trial (card-pick)**: "Choose a Card — every card uses the same 0.1% success chance", reward = more Button Stats & Raid Damage. Pure illusion-of-choice RNG with 4 face-down cards.
- **Shards**: drop with displayed % chances (9.5 / 7.1 / 5.7 % seen on red-framed loot cards); "×2 Shard Luck" pass 350 R$; Drop Potion, "More Drops" pass 270 R$, "Auto Collect" pass 150 R$ → drops are physical pickups on the map **(inferred)**.
- **Mining RNG**: ores by depth, 2 "very rare" ores per update with titles for finders, Ore Index reward tiers, pickaxe enchantments (rare tiers with special abilities; "Enchantments are not a Gacha" — i.e. deterministic or capped **(inferred)**).
- **Clone / bulk events (BE1)**: "Cloner" pass (duplicate rune drops), "Event Rune Bulk", "Event Rune Clone" buffs, Infinity Gacha, Overload Progression Gacha.
- **Odds**: not published for BE2. Genre baselines (BSM/BSG2): common 1/1–1/1.6, rare ~1/10, epic 1/35–1/50, legendary 1/100–1/1k, mythic 1/2k–1/10k, secret 1/100k–1/10M, divine 1/10M+.
- **Index/collection**: Ore Index (reward tiers), Goals act as an achievement index; a rune index is **not evidenced**.

## Worlds / zones

| # | World | Notes |
|---|---|---|
| 1 | **Grassland** | Neon-green, mushrooms, pink trees; Basic Rune; Forest Chest; Grassland World Quest |
| 2 | **Desert** | Sand/Dust/Cactus chain; Desert Rune; Automation rows "Auto Sand / Auto Dust / Auto Cactus" |
| 3 | **Volcano** | Ember/Magma/Obsidian/Titan/Scorch; Volcano King area + quests (gate) |
| 4 | **Ocean** (V2) | Ocean Raid, Crimson Tide + Tide's Trial gachas, Ocean Rune, Ocean chest; badge "World 4" (plus "World 4 [OLD]" → world was re-done) |
| — | **Mines** | Separate map down to 5,000 m, Bucks, ores, Interstellar layer |

3 worlds held **8 zones** at launch, so each world has 2–3 sub-zones unlocked in place ("Successfully unlocked Zone!" toast). Each world brings its own stat chain (~5 stats), rune pack, quest and automation list. V2 "Buffed World 1–2 Stat Buffs" → older worlds' stats keep mattering as multipliers.

## Automation unlocks

- **Automation panel** (hotbar button): per-world list of "Auto <Stat>" rows, each with a progress bar toward a threshold *in the next stat* (e.g. "Auto Titan 0/100Sx Scorch", "Auto Ember …/1000Ea Magma", "Auto Sand … Dust") and an **Unlock** button, plus **Unlock All**. Reaching the higher stat lets the lower stat be bought automatically. **(read off storyboard frames; numbers approximate)**
- Passes: **Auto Collect** (drops), **Remote Access** 500 R$ (use buttons/runes from anywhere — **inferred** from name; BE1 had the same pass), VIP 400 R$.

## Offline / idle progress

No evidence of offline earnings. Idle play = staying AFK in a server with automation running **(inferred)**; time is rewarded via Goals (Time I–IV → Rune Luck), Daily/Playtime rewards, Season Pass, and the pre-release "play 50 hours for a title".

## Number scale and notation

- BE1 labels show **double-exponent notation with a suffixed exponent**: `+1.99e15.19M Multiplier` = 10^(15,190,000); `+1.32e6.95M Rebirth` = 10^(6,950,000). So BE1 reached ~e1.5e7 by UPD 11.
- BE2 automation thresholds use short suffixes ("100Sx", "1000Ea"?) **(partly illegible)**; same engine → same notation **(inferred)**.

## Pacing

- **World-unlock funnel (badge award counts, BE2):** World 1 = 222,070 → **World 2 = 43,428 (19.6 %)** → **World 3 = 15,952 (7.2 %)** → **World 4 = 4,203 (1.9 %)**. Gamepass badges ~0.2–1.9 % conversion (Luck pass 8,158 owners; x2 Button Stats 6,005).
- Peak 462 CCU at launch → ~50 CCU after ~3 months; session 29 min. Content is consumed in days–weeks, then updates every ~1–2 weeks (V1 18 Jul, V2 ~28 Jul, V3 ~1 Aug).
- v2.1 cut Tide Token odds 1/3,500 → 1/600 and halved a quest requirement within days of release → launch tuning was too grindy **(inferred)**.

## UI / visual style

- **Logo**: chunky 3D bevelled logotype — gold/orange "BUTTON", purple→cyan glossy "ETERNAL", big gold "2", a red arcade push-button as the "B" ornament.
- **World**: saturated low-poly; neon grass, red/pink foliage, lava orange; buttons are glowing round pads (red = cheap stat, cyan/blue = next stat); every button has a floating billboard in the stat's colour (Cash = green, Multiplier = red/pink, Rebirth = cyan).
- **HUD layout**: top-left Gems pill + 2×3 grid of square menu icons (shop, codes, etc.); bottom-centre hotbar (Inventory, Automation, Goals, Season, Settings, potions) above a green XP bar "Level N (x/y XP)"; right-side dark translucent World Quest tracker; top-right player list; "Boosts" button bottom-left; active-buff icons with timers above the hotbar.
- **Panels**: dark charcoal with orange/gold title tab, red square ✕, rows with progress bars and green "Unlock"/"Upgrade" pills. Toasts centre-top: "Bought Upgrade (x1)", "Time IV – Claimed!", "Gacha – Not enough currency!" (red), "Successfully unlocked Zone!", "Level Up!".
- **Loot cards**: square red-framed cards showing icon, quantity "x1" and % chance; Tide's Trial uses four blue "?" cards.
- **Trees**: BE1 = physical tiles on the floor; BE2 Interstellar = hex grid, nodes coloured by state (green owned / grey locked / purple special) with a "Total Boost" sidebar.

## What players praise and complain about

- **Praise (evidence-based)**: 92.7 % like ratio; dense feature list for a 2-dev team; fast patch cadence; devs listening (pity added, mining "spread no longer mines below you… this change is actually huge", performance optimisations, rare-ore titles). **(inferred from notes)**
- **Complaints (evidence-based)**: launch grind (immediate v2.1 nerfs to requirements and odds), "UPDDelay#1" code (delays), steep world-gate drop-off (only 1.9 % reach World 4), heavy pass monetisation (14 passes incl. a 4-tier luck ladder up to 700 R$) **(inferred)**, CCU collapse after launch.

## Steal-worthy ideas

- **Cost→gain billboards on every "button"**: show `#n · cost · +gain` floating over each purchasable; for Starforge, "beacons" on a star map that show what you pay and what you get.
- **Goals that grant permanent RNG stats**: time-played tiers → +Luck, items-opened tiers → +Bulk. Achievements become the luck progression track.
- **Per-item pity at 1,000,000 opens** for the top "Divine" tier — a visible counter per shard type ("Celestial pity 734,120 / 1,000,000").
- **Luck/Bulk adjuster setting** — let players dial luck down to farm luck-immune or low-tier items (pairs with Noob Incremental's Noobinial trick).
- **Tide's-Trial style "pick a card, every card 0.1 %"** micro-gamble for bonus stats — cheap to build, high tension.
- **Side-activity with its own reset layer** (mining → Interstellar tree with 33 nodes and a leaderboard) — e.g. "Asteroid Drilling → Wormhole reset".
- **Automation unlocked by reaching a threshold of the *next* stat** ("Auto Ember unlocks at 1000 Magma") — automation as a reward for pushing forward.
- **Per-world quest gates** with counters ("10 Volcano King quests") instead of pure currency gates.
- **Visible-%-loot cards** for drops (shards) and hidden Divine-rune descriptions until the world is reached — curiosity hooks.
- **Milestone event runes** tied to community visit milestones (1M/2M/2.5M) with special clone/bulk buffs.

---

# Noob Incremental (Roblox, Ghoulax Games)

> Primary sources: the **official community Trello "Noob Incremental Trello"** (run by the game's testers; 200 cards, last active ~7 Aug 2026), the **tester team's guide spreadsheet** linked from the "OFFICIAL GUIDE" video, the **noob-incremental.fandom.com Runes page** (in-game screenshots of every rune card and altar), Roblox APIs, Rotrends, and dev-team-run YouTube guides. Several SEO "wiki" sites (noobincremental.wiki, noobincrementalcalc.online, noob-incremental.wiki) contradict the Trello (e.g. "4 layers", "Tickets roll runes", "Layer Bonus = 1.5× + Noobs×0.01") — **treat them as unreliable**; I only use them where they match primary data.
> Reference images saved: `ni-basic-rune-altar-odds.webp`, `ni-super-rune-altar-odds.webp`, `ni-rune-card-celestial.webp`, `ni-rune-card-atomic-noobinial.webp`, `ni-fire-upgrades-board.webp`, `ni-rune-sacrifice-panel.webp`, `ni-ui-prism-tree-map.webp`, `ni-starter-upgrade-tree-map.webp` (plus the existing `noob-incremental-upgrade-boards.png`).

## Snapshot (facts)

| Item | Value |
|---|---|
| Title | `[UPD 4🌊] Noob Incremental` |
| Group / team | Ghoulax Games (verified). @GhoulaxDev owner & programmer, @Tehleat builder, @0hxsn UI designer, @Zyfley & @komconnor balancers, @lucky_666 programmer, @0wknh VFX, @PurpleDevMusic music |
| Created / last update | 2026-03-30 / 2026-10-10. Public launch ≈ late May 2026 (Trello created 29 May; first "Mini Update 1" on 1 Jun; geode "Azure Glyph" given to those who played within 24 h of release) **(inferred date)** |
| Visits / favourites | **48,807,235 / 77,142** |
| Votes | 74,125 up / 2,932 down = **96.2 %** |
| CCU | ~4,100 now; **peak 22.6k** |
| Avg session | **30.3 min** (98th percentile, Rotrends) |
| Server size | 6 |
| Monetisation | 8 gamepasses — Noobs Master 499, Luck Master 499, Minion Master 599, Prism Master 599, Rune Master 699, Card Master 699, Miner Master 699, Swords Master 699 R$; **127 dev products**; Roblox Plus = +10 % Oof & +10 % Prism; group+like = +10 % Rune Speed; community server = +10 % Rune Luck |
| Description | "A massive Incremental game with hundreds of Upgrades, dozens of Stats, multiple Prestige layers… Buy Noobs and make Oof! Buy Upgrades and be Stronger! Roll Runes and Level them up! Prestige and unlock new content! Reach the top and become the ultimate Noob!" |

**Update cadence:** Mini Update 1 (Prism Tree, Cooking Station) 1 Jun → Lab Update (Hacker tree, Minions, +1 prestige) 7 Jun → **Update 1 Snow Realm** (Realm 2, +3 prestiges, guild rewards) 21 Jun → Football (World Cup) Event 3 Jul → **Update 2 Realm 3 Desert** (P12–14) 21 Jul → **Update 3 Realm 4 Moon/Space** (P15–17) 4 Aug → **Update 4 sea-themed** ~3 Oct (no patch notes; players report P19–21+, "Yin/Yang", Chips, Cards, Masteries — **unverified**).

## Core loop (first 5 minutes)

(From the tester guide "Prestige 0–1" tab + in-game screenshots.)
1. Spawn on a tropical island. A **Starter Noob** (classic yellow-head / blue-shirt Roblox avatar) stands on a pad and produces **Oof every tick**.
2. Spend Oof upgrading the Noob itself and on the **Oof Upgrades board** (3 cards):
   - **More Oof** — milestone doubling: "getting 15 upgrades to double the multiplier" (later screenshot: 41/100, ×885 → ×1.04k for 41.3B Oof).
   - **Faster Noobs** — 5 levels, −0.1 s tick interval each (3/5: −0.3 s → −0.4 s for 1T Oof).
   - **More Rebirth** (unlocked at P1; 20/20 = ×6.73 MAX).
3. At **10k Oof**, Rebirth Points start accruing; amount "scales on the amount of oof you have". Rebirth board has 2 upgrades: **More Oof** (6 levels) and **More Rebirth** — "focus the rebirth points on 'more oof' and the rest on 'more rebirth', then repeat".
4. **UI Prism Tree** opens: "in x seconds you generate x prisms" — buy *Prism Generation Speed* then *Prism Multiplier*.
5. Redeem codes (`THANKS4JOINING` = permanent +10 % luck; tickets, potions, enchant shards).
6. "It's possible to prestige once you have 5/6 or 6/6 upgrades on the 'More Oof' in the rebirth upgrade" → reach **5T Oof → Prestige 1**, which unlocks **Fire** and the **Basic Rune** (the real game begins).

## Every currency / resource and how each is produced

| Resource | Unlock | Produced by | Main sinks |
|---|---|---|---|
| **Oof** | start | Noobs per tick (15 Noob types: Starter, Cooker, Farmer, Archer, Soldier, Fisherman, Knight, Explorer, Magician, Merchant, Mummy, Pharaoh, Alien, Demon, Astronaut) | Noob upgrades, Oof board, **Prestige gate** |
| **Rebirth points** | 10k Oof | Rebirth conversion (scales with Oof); auto-gain at P2 | Rebirth board |
| **Prism** | start | Passive per tick/minute (UI Prism tree), expeditions (94–98 % of rolls), guild chests | UI Prism Tree, Prism Upgrade Tree (500M), **Equipment market**, Cosmic Prism Rune (~2.5 Prism/open), minion capsules (1B / 7.5B / 125B), guild creation |
| **Tickets** (soft-premium) | start | +passive every **15 min** played; daily quests 60–70/day (12 each); weekly 350–380/week (70 each); codes; trial boxes → ~770/week F2P | **Gamepasses & potions** (e.g. Minion Pack 299 Robux *or* Tickets) |
| **Enchant Tokens/Shards** | start (used P4+) | Codes, expeditions (50–100/day), quests (500–700/week), Robux | Noob enchant rerolls |
| **Fire** | P1 | Stand on Fire button (auto at P4) | Fire upgrades, Basic Rune (50 Fire/open base), Campfire levels |
| **Blaze** | P2 | Blaze reset at **100k Fire** (more Fire → more Blaze); auto at P6 | Blaze upgrades, Awakened Rune (8.3e214 Blaze/open) |
| **Cash** | P3 | Tycoon droppers → upgraders → furnace; mutated cubes | Cash upgrades, Tycoon resets, Factories, **Tiers** (50 Oc first roll), Super Rune (~20.7k/open), wheat plots, Mutations (25M) |
| Wheat → **Bread** | P6 | Field slots (walk/hover to harvest) → converter (3 wheat/bread; tree node makes it 2) | Bread upgrades, Chickens (100M), **Advanced Rune** (~20.7/open) |
| Milk / Eggs → **Coins** | P7 | Cows (500M Wheat) / Chickens (100M Bread) → Coin Exchanger | Coin upgrades, **Coin Milestones** (deposit → Rune Bulk/Luck/Speed, Tier Luck, Milk/Egg) |
| **Hacker Points** | P8 | Hacker Noobs in Noob Lab | Hacker (Lab UI) tree, Hacker Rune (~352/open), capsules unlock (250k) |
| Water, **Ice** | R2 / P8+ | Water pump button → 12 Ice conversion buttons | Water Buckets, Snowy Rune |
| Wood, Planks, **Ash** | P9 | Axes on trees (planted with Water); Plank board; Campfire | Axes, Wood Ranks, Ash Milestones, Snow tree |
| Minerals → **Gems**, Dice | P10 | Pickaxes on 16 ore types (loot tables) | Pickaxes, Gem tree/board, Deepcore Rune; **Dice → Aura rolls** |
| Meat, Bones, Souls, Sand | R3 (P11–14) | Mob kills; Meat converter; 2-min rituals; digging layers | Boards, milestones, Dunes Rune (Bones), Sunfire Rune (Sand) |
| Stars, Space Points, Moons, Planets, Blackholes, Alien Cash, Knowledge | R4 (P15–17) | Collect stars; Space XP; **reset 1Sp Stars → Moons**; buy planets; Alien dropper; research | Boards, 2 Realm-4 trees, Starlight Rune (Moons), Cosma Rune (Knowledge) |
| Goals, Trophies | Football event | Football Noobs & kicks | Football Rune, ranks, trophies |
| Guild Points | P3 | Every Noob tick of guild members (≤15 members) | Guild leaderboards, chest milestones |

## Button / upgrade structure: cost scaling, effect formulas, softcaps

- **Boards** (in-world billboards, 3 cards each): level/cap counter, preview "×1 → ×1.25", cost, **Buy** (red) and **Max** (magenta) buttons; **milestone doubling** printed on the card — e.g. Fire board: *More Fire* 0/60 "[x2 every 15 upgrades]" ×1→×1.25 for 20 Fire; *More Oof* 0/25 ×1→×1.75 for 15 Fire; *More Rebirth* 0/25 "[x2 every 10 upgrades]" ×1→×1.5 for 15 Fire. Cost growth is not published; geometric per level is implied by 41.3B Oof at More Oof level 41 **(inferred)**.
- **Trees** (~13): UI Prism, Starter, Tycoon, Coin/Farm, Prism (500M Prism entry), Hacker/Lab, Snow/Ice, Mine/Gem, Meat/Bone, Sand/Desert/Pyramid, Space, Galaxy, Football. Nodes are one-shot or capped ("Prism Multiplier 8.6x max"). Starter tree path: More Oofs 1.5× → New Oof upgrades → More Oofs 5× / Faster Oofs 1.5× → More Rune Speed 1.25× / More Rune Luck 1.5× → **MEGA RUNE UPGRADE (1.5× Speed, Luck, Bulk)** → **Free Oof Auto** ("Oof upgrades no longer use Oofs") → … → **Unlock Noobinials** → More Tier Bulk 5×. UI Prism tree nodes include *Rune Price decrease 1.1x*, *Rune Clone for runes <1/100k*, *Better Enchants Pity −500 pity counter*, *More Offline Expedition time +100 min*, *Buff Equipments Multiplier 2.8x*, *−1 Wheat for Bread*, *+25 Walkspeed*, *Unlock Prism tree*.
- **Milestone ladders**: Ash Milestones each cost **1000× the previous** (1K, 1M, 1B, 1T, 1Qd, 1Qn, 1Sx, 1Sp Ash) and give capped boosts (15× Water, 6× Wood, 12× Planks, 3× Oof, 1.8× Rune Bulk, 1.8× Rune Luck…). Oof Milestones (×1.5 Oof, ×1.75 Meat, ×2 Bones, ×1.5 Souls, ×1.5 Sand, **×100 Tier Luck**, ×2 Rune Bulk, ×1.25 Prism…), Bone, Depth, Prism and Coin milestones.
- **Equipment** (bought with Prisms in the Market; keep through prestige): 15 Rings (equip 3; Rune Speed + Oof; 25k → 850Qd Prisms, Base→Max e.g. Ash +×1.25→×1.45 Rune Speed), 15 Necklaces (equip 3; Cash + Prism; 10k → 325Qd), 5+1 Geodes (equip 2), 11 Specials (equip 1). Item prices rise ~4.6–4.8× per tier early, then ~30× **(computed)**.
- **Noob Enchants** (P4): reroll traits per Noob with shards; tiers Oof/Speed I (+5 %) → II (+15 %) → III (+25 %) → Powerful/Rapid (+50 %) → Balanced/Wealth → Ethereal (+100 % Oof, +10 % Stats) → Deity → Godly (+250 % gen, +75 % speed, +150 % Oof, +10 % Stats) → Almighty (+50 % Stats) → **Transcendent** (+500 % Oof gen, +150 % speed, +300 % Oof, +10 % Rune Bulk, +100 % Stats). **1 % double-enchant** chance; pity counter (tree reduces it by 500).
- **Factories** (P4): Cash raises Tier-1 factories/sec; **5 of tier n merge into 1 of tier n+1** (T7 = 15,625 T1). Each tier boosts stats up to a cap reached at a specific count (T1 ×500 Oof @100k; T3 ×3 Rune Luck @200; T4 ×1.1 Prism @4, ×1.5 Rune Speed @40; T5 ×2.5 Rune Bulk @8; T7 ×5 Mutation Luck @766…). Guide: "set the factory bulk merge to at least 10 %" so lower tiers keep their buffs.
- **Tycoon mutations**: cubes roll a mutation with level caps that **shrink as rarity rises** — Rainbow L50 (4× Cash, 3.75× Oof), Candy L30, Magma L25, Phantom L20, Shocked L15 (+1.3× Rune Speed), Glitched L10 (+3× Rune Luck), Cosmic L5 (31× Cash, 21× Oof, 6× Rune Bulk, 1.3× Prism).
- **Cooking**: Cake (400 milk + 100SpDe bread; cap at ~40k cakes → ×100 Tier Bulk, ×10k Bread), Cheese (×50 Tier Luck at ~1.96k; ×1B Oof at 1 cheese!), Cookie (cap 40 → ×3 Prism, ×1.75 Rune Bulk).
- **Softcaps**: the game uses **hard caps everywhere** ("[MAX]" labels on runes, factory counts, cooking, equipment base→max) instead of mathematical softcaps; growth continues by unlocking new systems **(inferred design read)**.

## Reset / prestige layers IN ORDER

### Main spine: Rebirth → Prestige 1…17 (official) → 18–21+ (community)

- **Rebirth**: needs ≥10k Oof; points scale with Oof; spent on the Rebirth board. Automated (gain + upgrades) at P2 "(no more resets)".
- **Prestige** "resets most of your progress… Runes, Equipments, Minions, Tickets, Prisms, UI Upgrade Tree etc. will not be reset." Factories and Mutations also persist; Starter tree, Tycoon, Tiers/Awakenings, Water Buckets, Wood Ranks reset (guides repeatedly say "max your tier awakening as it resets on prestige", "grind your water buckets back") until later prestiges automate keeping them (P15 "Keep Wood Rank on Prestige").

| P | Oof requirement | Oof mult (cumulative) | Unlocks (+ automation) |
|---|---|---|---|
| 1 | 5T (1e12.7) | ×1 → ×5 (Rebirth ×2) | Basic Rune, Fire + Fire upgrades, More Rebirth, Max Noobs; auto first-Noob upgrades; Soccer event |
| 2 | 25No (1e31.4) | ×30 (Fire ×3, Rebirth ×10) | Starter Upgrade Tree, Blaze; auto Rebirth gain + upgrades |
| 3 | 10OcDe (1e58) | ×300 | Cash, Tycoon, Super Rune, Guilds; auto Cooker Noob |
| 4 | 25UTg (1e97.4) | ×5k | Factories, Easy Expedition, Tycoon tree, Noob Enchants; auto Fire gain + upgrades |
| 5 | 1e240 | ×25k | Tiers + Awakening, Equipment/Market; auto Farmer Noob, Cash upgrades |
| 6 | 1e505 | ×500k (Tier Bulk ×2, Luck ×3) | Wheat/Bread, Advanced Rune; auto Blaze gain |
| 7 | 1e640 | ×1.55M | Animals, Cooking, Farm tree, Medium Expedition, Coins + milestones; auto Archer Noob, Blaze upgrades (launch max) |
| 8 | 1e1,100 | ×67M | Noob Lab, Hacker Points, Lab UI tree, Minions; auto Soldier Noob |
| 9 | 1e1,710 | ×210M | Wood, Axes, Planks, Ash, Ice tree, Water Buckets; auto Tycoon, Fisherman, Farm tree, Wheat slots |
| 10 | 1e2,650 | ×450M | Mine, Pickaxes, Gems, Deepcore Rune, Super Capsule, Auras, Buckets 6–10; auto wheat/bread, Knight, Animals |
| 11 | 1e3,125 | ×900M | Magician Noob, Bucket 11; auto Explorer, Planks |
| 12 | 1e4,175 | ×19B | Merchant Noob, Bones, Oof Milestones, first Realm-3 rune, Desert tree; auto Magician, Axes |
| 13 | 1e4,715 | ×390B | Mummy Noob, Souls, Bone milestones, Sword enchants; auto Merchant, Ice |
| 14 | 1e5,200 | ×39T | Pharaoh Noob, 2nd R3 rune, Ancient Capsule, Sand, Depth milestones, Excavation Rank, Pyramid tree; auto Mummy, Pickaxes, Campfire |
| 15 | 1e7,444 | ×5Qd (Tier Bulk ×200 / Luck ×225) | Alien Noob, Moons, Planets, Space tree, first Space Rune; auto Pharaoh, Coins, Water, keep Wood Rank |
| 16 | 1e8,400 | ×75Qd | Demon Noob, Blackhole, **Spaceship Reset**; auto Alien, Meat, Bones |
| 17 | 1e9,000 | ×5Qn (Tier Bulk ×250 / Luck ×300) | Astronaut Noob, Alien Tycoon & Technology, Galaxy tree, Prism Milestones, 2nd Space Rune & Capsule; auto Demon, Souls, Sand |
| 18–21+ | unpublished | — | Realm 4 rebuild, Research, Chips, Yin/Yang (**community, unverified**) |

Each prestige also multiplies ~10–15 secondary currencies (Fire, Blaze, Rebirth, Cash, Coins, Water, Ice, Wood, Gems, Meat, Bones, Souls, Sword Damage…). **Key read:** requirement exponents grow ~linearly-to-quadratically (12 → 9,000) while the Oof reward exponent only goes 0.7 → 18.7, so **prestige is primarily an unlock + automation gate, not a multiplier source** **(computed)**.

### Sub-layers (each a mini-prestige inside a system)

| Layer | Trigger / cost | Reward | Resets |
|---|---|---|---|
| **Blaze** | 100k Fire | Blaze currency for Blaze upgrades | Fire upgrades |
| **Tycoon Reset** 1–5 | 10k → 1M → 10T → 10Sx → 50De Cash | Cash ×5 each: ×5, ×25, ×125, ×625, ×3.13k | Tycoon (mutations never reset) |
| **Tier Awakening** 1–6 | Tier 15 / 30 / 50 / 150 / 190 / 320 | Unlocks Cash, Fire, **Rune Bulk**, Coin, Hacker Point, Gem boosts; Tier Bulk ×2,×2,×2,×2,×2,×3 and Tier Luck ×3,×6,×9,×12,×15,×20 | (resets on prestige) |
| **Water Buckets** 1–11 | 100k, 25M, 2.17B, 12.5Qd, 14.9Qn, 2.2Sp, 5.35Oc, 501.99No, 750De, 250UDe, 1.75SxDe Water | Stacking multiplicatively, e.g. #2 = ×15 Water, ×25 Oof, ×2 Rune Bulk; #5 = ×50B Oof, ×2 Rune Luck; #10 = ×100T Oof | Water, Ice + their upgrades |
| **Wood Ranks** 1–6 | 250k, 1B, 5Qd, 100Sx, 2.25No, 267DDe Wood | Wood ×2→×5→×12→×30→×75→×175; Planks/Ash ladders; R6 = ×100QnDe Oof | Tree level, Wood, Planks, Ash + upgrades, Ash milestones |
| **Excavation Ranks** | Sand | Permanent multipliers | Sand, sand upgrades, shovel level, depth milestones |
| **Moons** | reset 1Sp Stars | Moons (Starlight Rune, moon board) | Stars |
| **Spaceship Reset** (P16) | — | — | — (unpublished) |
| **Football Ranks** 1–6 (event) | 1Sp → 6.09NoDe Goals | e.g. Rank 6: ×60.3k F.Rune Bulk, ×9.11k F.Rune Luck, plus Oof/Fire/Cash/Prism/Tier boosts | Goals |
| **Rune Sacrifice** (R3) | Burn huge copy counts of a Noobinial | Permanent stat level | Only "the required rarities" |

## RUNES / RNG systems in depth

### Mechanics (official Trello unless noted)
- **Opening**: stand on a rune altar; each "tick" opens *Bulk* runes; **Rune Speed** = ticks per second; **"You do NOT get more runes for the price of ONE rune open!"** — cost scales with bulk. Quest tip: stand on a rune you have **0.05 s speed** for → ~20 ticks/s floor **(inferred cap)**. Altars show **"You can roll for ∞"** or **"You can roll for 2h 3m"** (how long current currency lasts at current speed×bulk) and "Instant roll available". A lifetime counter ("26.5DVt Opened" ≈ 2.65e64) sits on the left info panel.
- **Two rune classes**: **Basic** runes are affected by Rune Luck; **Noobinial** runes are **not** — they depend purely on runes-per-second (RPS). "It is recommended to set your Rune Luck to 1, since that increases your chance of getting a Noobinal Rune… This was tested and confirmed." (Luck re-weights the table toward Basic rares, so at max luck Noobinials appear less often **(inferred)**.)
- **Targeting rule of thumb (official)**: "don't go for runes if you have less than 1000× the chance in RPS… Example: 400DDe RPS+ for a 400TDe Rune" → expected ≈1,000 s (~17 min) per copy.
- **Levels**: each rune levels up (duplicates feed levels — guides say "after you get 1 Immortal, get it to level 2"; Sacrifice bars count copies) **(level cost formula unpublished)**. **Max level falls with rarity**: Basic family Rookie 500 → Learner 400 → Trained 300 → Skilled 200 → Expert 150 → Master 115 → Grandmaster 95 → Celestial 75 → Immortal 50; Noobinials 3–40; the cheap Prism rune Lucent caps at 5,000.
- **Rune Clone**: on drop, get 2 instead of 1; UI Prism tree node #1 for runes with **base chance rarer than 1/100k**, node #2 for Noobinials.
- **Rune Sacrifice (Realm 3)**: e.g. Chronos Core panel "×1 Tier Bulk → ×1.1 Tier Bulk, Level 0, 0/1000Qd, *You Will Only Lose The Required Rarities*, [Sacrifice]". Sacrificable: Chronos Core, Oblivion Sigil, Aetherion, Ultimate Shard, Everfrost.
- **Separate luck pools**: Cosmic Prism rune uses **P.Rune Luck/Speed/Bulk**; Football rune uses **F.Rune Luck/Bulk**; Hacker rune odds in screenshots are not luck-compressed → also separate **(inferred)**.
- **Potions**: 2× Rune Luck / Rune Speed / Rune Bulk potions (codes, expeditions 0.25–0.62 %/min); also Expedition-Luck, Capsule-Luck, Drops-Luck potions.

### Observed luck math (my analysis of a late-game altar screenshot)
The Basic Rune altar shows *displayed* odds next to the cards' *base* odds:

| Rune | Base (card) | Displayed with player's luck | base^(1/10) |
|---|---|---|---|
| Rookie | 1/1.25 | 1/1.25 | — (already common) |
| Learner | 1/6.67 | 1/6.67 | — |
| Trained | 1/33.29 | **1/10** | 1.42 → floored |
| Skilled | 1/200 | **1/10** | 1.70 → floored |
| Expert | 1/50k | **1/10** | 2.95 → floored |
| Master | 1/1M | **1/10** | 3.98 → floored |
| Grandmaster | 1/40M | **1/10** | 5.76 → floored |
| Celestial | 1/625B | **1/15.1** | **15.12** ✓ |
| Immortal | 1/500Sp (5e26) | **1/468** | **467.9** ✓ |
| Omnipotent (Super) | 1/12.5Oc | 1/645 | 645 ✓ |
| Universal (Super) | 1/20Qn | 1/85.1 | 85.1 ✓ |
| Infinite (Adv.) | 1/17.5Oc | 1/667 | 667 ✓ |
| Divine (Adv.) | 1/200Qd | 1/53.7 | 53.7 ✓ |

→ **Luck acts as a root on the denominator, not a divisor**: displayed = max(base^(1/k), min(base, 10)) with k = 10 for that player (k is presumably derived from total Rune Luck, e.g. log10 — **inferred**). Rarities are compressed logarithmically and **can never become better than 1/10** (a floor), while already-common runes are untouched. Noobinials (Shadow 1/2.5Sx, Phantom 1/2.5Oc, Atomic 1/300QdDe, Chronos Core 1/3.5QnDe) display at base odds. This is the single most transferable piece of math in this research.

### Rune families (unlock, cost currency, contents)

| Family | Unlock | Cost | Tiers (base odds where known) |
|---|---|---|---|
| **Basic** | P1 | Fire (50 base; 41.4 after discounts) | Rookie 1/1.25, Learner 1/6.67, Trained 1/33.29, Skilled 1/200, Expert 1/50k, Master 1/1M, Grandmaster 1/40M, Celestial 1/625B, Immortal 1/500Sp · *Noobinials*: Shadow 1/2.5Sx, Phantom 1/2.5Oc, Atomic 1/300QdDe, Chronos Core 1/3.5QnDe |
| **Super** | P3 | Cash (~20.7k) | Initiate 1/1.11, Adept, Veteran, Elite, Champion, Ascended, Transcendent, Universal 1/20Qn, Omnipotent 1/12.5Oc · *Noob.*: Eclipse 1/250Sx, Void 1/2.5No, Primordial 1/5UDe, Oblivion Sigil 1/300QnDe |
| **Advanced** | P6 | Bread | Little 1/1.01, Lesser, Standard, Greater, Superior, Prime, Apex, Ethereal, Divine 1/200Qd, Infinite 1/17.5Oc · *Noob.*: Abyss 1/25Sp, Enigma 1/2.5De, Seraphim's Tear 1/100TDe, Aetherion 1/12.5SxDe |
| **Cosmic Prism** | late R1 | Prism (~2.49) | Lucent 1/2.5, Chroma 1/4, Fractal 1/20, Refraction 1/100, Tessellation 1/200, Hyperlight 1/333, Prism God 1/1k, Voidglass 1/1M · *Noob.*: Godshard 1/100M, Ultimate Shard 1/250B |
| **Hacker** | P8 | Hack Points (~352) | Script 1/1.01, Protocol 1/50.1, Cipher 1/158, Exploit 1/501, Kernel 1/1k, Root 1/2k, Backdoor 1/3.98k, Glitched 1/5.3No, Firewall 1/2.12DDe, Connor Hacked It 1/7.95QnDe, Anti-Cheat ~1/212SxDe (partly legible) · *Noob.*: Rootkit 1/10Oc, Masterkey 1/20Oc, Stuxnet 1/52.4No, Unstoppable Virus 1/5DVt (last 5 basics unlocked via R3 upgrades) |
| **Awakened** | P8 | Blaze (8.3e214) | Potential 1/1.01, then 10 tiers each **×1e9 rarer**: Limitless 1/109DDe, Incomparable 1/109QnDe, Unfathomable 1/109OcDe, Unmatched 1/109UVt, Unbelievable 1/109QdVt, Untouchable 1/109SpVt, Unstoppable 1/109Tg, Unrivaled 1/1.1e104, Unconquerable 1/1.1e113, Unforgettable 1/1.1e122; Otherworldly 1/25UTg |
| Snowy | R2 | Ice | 12 runes incl. Noobinials Whiteout, Icebound, Everfrost |
| Deepcore | P10 | Gems | 12 runes (WIP) |
| Dunes / Sunfire | R3 | Bones / Sand | — |
| Starlight / Cosma | R4 | Moons / Knowledge | — |
| Football (event) | event | Goals | F.Rune Luck/Bulk boosted by trophies & ranks |

### Rune stat bonuses (MAX values from cards)
| Rune (class, odds, max lvl) | Bonuses at MAX |
|---|---|
| Rookie (B, 1/1.25, L500) | ×101 Oof, ×51 Rebirth |
| Learner (B, 1/6.67, L400) | ×61 Rebirth, ×1.5 Rune Luck |
| Trained (B, 1/33.29, L300) | ×151 Oof, ×61 Rebirth, ×46 Fire, **+5 Rune Bulk** |
| Skilled (B, 1/200, L200) | ×501 Oof, ×51 Fire, ×1.75 Rune Luck |
| Expert (B, 1/50k, L150) | ×751 Oof, ×114 Fire, ×1.5 Rune Speed, ×3 Rune Bulk |
| Master (B, 1/1M, L115) | ×1.73k Oof, ×576 Rebirth, ×116 Fire, ×24 Blaze, +10 Rune Bulk |
| Grandmaster (B, 1/40M, L95) | ×4.75k Oof, ×72.3 Blaze, ×1.5 Rune Speed, ×4 Rune Bulk |
| Celestial (B, 1/625B, L75) | ×56.3k Oof, ×1.12k Fire, ×5.63k Rebirth, ×151 Blaze, ×21 Rune Bulk, ×4 Rune Luck |
| Immortal (B, 1/500Sp, L50) | ×125k Oof, ×2.5k Fire, ×12.5k Rebirth, ×251 Blaze, ×31 Rune Bulk, ×6 Rune Luck |
| Shadow (N, 1/2.5Sx, **L5**) | ×501 Oof, ×76 Blaze, ×1.25 Prism, ×3.5 Coin, ×51 Rune Bulk, ×26 Bread |
| Phantom (N, 1/2.5Oc, L20) | ×20k Oof, ×1k Fire, ×2k Cash, ×1.35 Prism, ×3 Rune Luck, ×501 Rune Bulk, ×101 Bread |
| Atomic (N, 1/300QdDe, L20) | ×20k Oof, ×2k Fire, ×5k Cash, ×1.25 Prism, ×51 Tier Luck, ×26 Tier Bulk, ×101 Bread |
| Chronos Core (N, 1/3.5QnDe, **L3**) | ×3k Fire, ×1.05k Cash, ×1.14 Prism, ×41 Rune Bulk, ×61 Tier Bulk, ×4 Hack Points, ×16 Wheat |
| Universal (B, 1/20Qn, L75) | ×901 Oof, ×1.12k Fire, ×901 Cash, ×4.5 Rune Luck, ×8.5 Rune Bulk, ×51 Tier Luck, ×5.5 Coin |
| Omnipotent (B, 1/12.5Oc, L50) | ×2k Blaze, ×2.25k Fire, ×2k Cash, ×7 Rune Luck, ×16 Rune Bulk |
| Oblivion Sigil (N, 1/300QnDe, L10) | ×1M Oof, ×201 Tier Luck, ×2.5 P.Rune Speed, ×1.1 Prism, ×3 Rune Speed, ×151 Tier Bulk, ×31 Wheat, ×3.5 Coin |
| Seraphim's Tear (N, 1/100TDe, L6) | ×60k Oof, ×3k Rebirth, ×601 Fire, ×19 Tier Luck, ×13 Tier Bulk, ×31 Wheat, ×19 Bread |
| Divine (B, 1/200Qd, L75) | ×601 Fire, ×939 Cash, ×2.63k Oof, ×151 Blaze, ×5 Coin, ×7 Rune Bulk, ×5 Rune Luck |
| Infinite (B, 1/17.5Oc, L50) | ×2.5k Oof, ×2k Rebirth, ×501 Fire, ×751 Cash, ×151 Blaze, ×11 Rune Bulk, ×6 Rune Luck, ×26 Bread |
| Aetherion (N, 1/12.5SxDe, L4) | ×40k Oof, ×4k Fire, ×3 Hack Points, ×1.14 Prism, ×101 Tier Bulk, ×61 Tier Luck, ×5 Coin |
| Ultimate Shard (N, 1/250B, L25) | ×1.5 Prism, ×1.25k Cash, ×25M Oof, ×51 Bread, ×13.5 Coin, ×2.25 Rune Bulk, ×51 Tier Luck |
| Unstoppable Virus (N, 1/5DVt, L40) | ×21 Oof, ×51 Hack Points, ×81 Souls, ×11 Tier Luck, ×1.3 Prism, ×2.25 Rune Bulk, ×1.75 P.Rune Bulk, ×21 P.Rune Luck |
| Lucent (Prism B, 1/2.5, **L5,000**) | ×250k Oof, ×250k Cash, ×5k Bread |
| Script (Hacker B, 1/1.01, L600) | ×7.5 Hack Points, ×1.2k Oof, ×4 Wheat |

Patterns: (1) every rune boosts 2–8 stats; (2) almost every rune also boosts a **rune meta-stat** (Luck/Bulk/Speed) or **cross-family stat** (Tier Luck, Prism), creating loops; (3) **older families stay relevant** because their runes feed later currencies (Bread, Coin, Wheat, Hack Points); (4) Prism multipliers are tiny (×1.1–1.5) → Prism is the scarce, tightly-tuned resource.

### Other RNG systems
- **Tiers** (P5): stand on the Tier button (50 Oc Cash initially); Tier Luck & Tier Bulk scale from awakenings, prestiges, runes, equipment, cheese (×50 Tier Luck), Oof milestones (×100).
- **Auras** (P10, rolled with Dice in the cave): Foggy 21 % (+5 % Oof), Ice 18 %, Disco 13 %, Cloudy 10 %, Fire 8 % (+10 % Stats), Toxic 6 %, Rainy 5 %, Divine 4 %, Lightning 3 %, Deadly 1/1k, Elemental 1/2k, Void 1/5k, Galaxy 1/10k, Demon 1/25k, Angel 1/50k, Celestial 1/100k, Cosmic 1/166k, Eternal 1/625k, Eclipsera 1/900k, **Stellar 1/1.75M** (+500 % Stats & Rune Bulk, +300 % Rune Luck…). Gem tree upgrade = +50 % to every aura's boosts.
- **Minion capsules** (equip 2 / 3 with tree / 4 with pass): Classic (1B Prism) Poor 64 %, Zombie 26.9 %, Baddie 7.16 %, Rich 1.57 %, **Magician 0.4 % → 28.4 % with all capsule-luck multipliers**, King 0.01 % → 0.67 %, Galaxy 0.001 %. Super capsule (7.5B) same curve ending Vampire 0.0004 %. Capsule luck **redistributes mass onto one target tier** rather than shifting the whole curve.
- **Expeditions** (send a Noob away; it stops producing): per-minute reward rolls — Easy (1e125 Oof/tick): 97.5 % prisms, 1 % shard, 0.25 % luck potion, 0.25 % speed potion, ??? geodes; Medium (1e350), Hard (1e1,300), Extreme (1e6,690), Galaxy (1e10,500) with rarer equipment.
- **Mobs** (R3): 13 mobs, HP 25 → 10Sx; weapon drops 12.5 %→0.5 %; **Mob Index**: kills (max 10k each) give a per-mob multiplier (Meat, Bones, Souls, Rune Luck, Rune Bulk, Tier Luck, Tier Bulk, Prism, Minion Capsule Luck). Weapons merge 5→1 (normal → golden → rainbow). Weapon enchants mirror Noob enchants.
- **Ores**: each ore = fixed loot table (e.g. Coal ore 75 % coal / 25 % copper; Uranium 55/25/15 % + 5 % dice; Infinity ore 350No HP: 100 % crystal, 2 % for 100 dice, 0.5 % for 5 enchant tokens, ??? Golden Dice / Wizard Staff).
- **Time Trials**: open every 30 min, 60 s to enter, 20 min long, 7 enemies/room, room HP growth ×1.35 / ×1.50 / ×1.75 (Easy 152k, Medium 750M, Hard 94T base HP), chests capped 3/5/8.
- **Pity / guarantees**: enchant pity counter (reducible by 500 via tree); no rune pity documented (luck root + clone + sacrifice replace it).
- **Index/collection bonuses**: Mob Index (kill counts), Oof/Bone/Depth/Prism/Coin milestones; rune collection itself has no index bonus — runes *are* the bonus.

## Worlds / zones and what changes between them

| Realm | Prestiges | Theme / systems |
|---|---|---|
| **Realm 1** | P0–P8 | Tropical island + farm + Noob Lab: Oof, Rebirth, Fire/Blaze, Tycoon/Cash, Factories, Tiers, Wheat/Bread, Animals/Coins/Cooking, Hacker Points, Equipment market, guild area |
| **Realm 2** | P8–P11 | Snow biome + Mines: Water/Ice/Buckets, Wood/Planks/Ash/Campfire, Pickaxes/Minerals/Gems, Auras, Super Capsule, Snowy & Deepcore runes (gate changed to **1Sx Coins** in Update 1) |
| **Realm 3** | P11–P14 | Desert: combat (mobs, weapons, rituals), Meat/Bones/Souls/Sand, Time Trials, Excavation, Dunes & Sunfire runes, Ancient capsule |
| **Realm 4** | P15–P17+ | Moon/space: Stars, Space XP/Points, Moons, Planets, Blackholes, Alien Tycoon/Cash, Knowledge/Research, Starlight & Cosma runes, Spaceship reset |
| Realm 5 | P19+? | Sea (Update 4) — **unverified** |
| Football World | event | Goals, Football Noobs, trophies, ranks, World Cup minions (David → Ronaldo), Football capsule |

Each realm adds **a whole new resource graph (4–7 currencies) with its own boards, tree, rune and mini-reset**, and it feeds multipliers back into Realm 1 (Oof, Rune stats, Prism). Some trees are **location-locked** ("Lab UI tree… only accessible within the laboratory").

## Automation unlocks

- **Pattern:** a system is introduced manual at prestige *n* and automated at *n+1…n+2* (table above): Noob upgrades P1; Rebirth P2; Cooker Noob P3; Fire P4; Farmer Noob + Cash upgrades P5; Blaze gain P6; Archer + Blaze upgrades P7; Soldier P8; Tycoon, Fisherman, Farm tree, Wheat slots P9; wheat/bread, Knight, Animals P10; Explorer, Planks P11; Magician, Axes P12; Merchant, Ice P13; Mummy, Pickaxes, Campfire/Ash P14; Pharaoh, Coins, Water, keep Wood Rank P15; Alien, Meat/Bones P16; Demon, Souls, Sand/Shovel P17.
- Tree nodes: **"Free Oof Auto — Oof Upgrades no longer use Oofs"**; tycoon "once you get maxed upgrades in the Tycoon, it will automate itself"; Water Pump Noob (1.25k Ice upgrade) automates Water but costs you a Noob slot ("not recommended to use your best Noob").
- Manual chores left on purpose: walking between boards, wheat harvesting (players use auto-clickers/macros), quests ("Buy Upgrades" quest done by Blaze-resetting with a 2 s autoclicker).

## Offline / idle progress behaviour

- No documented offline Oof. Idle = AFK in a live server (Update 1 fixed "anti-AFK rejoin" behaviour; quests reward Play Time) **(inferred)**.
- **Expeditions continue offline up to a cap** — UI Prism tree node "More Offline Expedition time +100 minutes max" **(inferred: base cap + 100 min)**.
- Tickets accrue every 15 min *while playing*; prisms per tick.

## Number scale reached and notation

- Short-scale suffixes to ~1e100: K, M, B, T, Qd, Qn, Sx, Sp, Oc, No, De, UDe, DDe, TDe, QdDe, QnDe, SxDe, SpDe, OcDe, NoDe, Vt, UVt, DVt … QdVt, SpVt, Tg, UTg; then scientific (`1.0e240`, `8.3e214 Blaze`, `1/1.1e122`), then **suffixed exponents** (`1.0e1.100k` = 1e1,100; P17 = `1.0e9.000k`; Galaxy Expedition `1.0e10.500k Oof/Tick`).
- Opened-rune counters reach ~1e64 ("26.5DVt Opened"); Noobinial odds ~1e48–1e66; Awakened rune odds 1e122.

## Pacing: rough time to each layer

- **Prestige 1**: a few rebirth cycles; fan sites say 30–60 min **(unverified)**.
- At launch P7 was max; YouTubers posted "MAX PRESTIGE" videos 13 Jun and 22 Jun → **P0→P7 ≈ 2–3 weeks of heavy play** **(inferred)**.
- Official guide video chapter lengths mirror effort: P0–1 0:35, P1–2 1:14, P2–3 0:43, P3–4 0:54, P4–5 1:48, P5–6 1:29, P6–7 1:11, **P7–8 4:21, P8–9 7:37**, P9–10 2:39, P10–11 3:17. Tester guide: "getting to prestige 8 will take a while, prepare to grind"; viewer comment: "prestige 8 is very slow".
- Late game is gated by rune hunting at RPS ≥ odds/1000 (~17 min/target) and by Prism scarcity ("prism gain is very scarce… only through runes such as Atomic, Ultimate Shard, Stuxnet").
- Live-ops: 1–3 new prestiges every 1–3 weeks; median session ~30 min.

## UI / visual style

- **Logo**: chunky 3D bevelled text — glossy gold "NOOB" over violet "INCREMENTAL"; promo art = expressive Roblox noob characters (ninja, wizard, smug noob) over painterly backgrounds.
- **World**: bright stylised low-poly island (palm trees, mushrooms, waterfalls), physical stations: upgrade billboards next to stand-on pads, rune altars, tycoon conveyor, factory, market.
- **Upgrade boards**: near-black rounded panels, currency counter pill on top (icon + "1.67B"), title in the currency's colour ("Fire Upgrades" red, "Oof Upgrades" gold, "Cash Upgrades" green), 3 cards with white bold title, level "0/60", note "[x2 every 15 upgrades]", big icon, "x1 → x1.25", cost in currency colour, **red Buy + magenta Max** pills; floating "+6.46 Fire" damage-number style gains.
- **Rune altar**: octagonal platform with glowing cracks + floating crystal monolith in the family colour (white Basic, red Super, blue Advanced, cyan Cosmic Prism, neon green Hacker, deep blue Awakened); floating title + cost; left "Rune Info" panel (opened count, roll-time remaining); right "Rune Content" list with each rune name in its own colour/gradient and "1/X".
- **Rune cards**: portrait card, background colour = tier (grey Rookie, green Learner, blue Trained, purple Skilled, gold Expert, red Master, orange Grandmaster, violet Celestial, teal Immortal; **Noobinials = rainbow gradient with yellow "Noobinial" label**), name, class, odds in lime green, cyan level bar "LVL 75 / MAX", stat lines "x56.3k Oof [MAX]" with each stat name in its colour (Oof gold, Rebirth pink, Fire red, Blaze blue, Cash green, Prism cyan, Rune Luck green, Rune Speed light-blue, Rune Bulk orange, Bread/Coin orange, Tier Luck green, Hack Points green).
- **Trees**: node graphs on dark backgrounds (community diagrams use rounded rectangles/hexagons with "×N max").
- **Sacrifice panel**: big gradient title, "×1 → ×1.1" preview, level, wide progress bar "0/1000Qd", red warning line, green slanted "Sacrifice" button.
- Colour coding is consistent **per currency** across boards, cards, text and altars — the strongest UI lesson.

## What players praise and complain about

- **Praise**: 96.2 % rating, 77k favourites, 30-min sessions, peak 22.6k CCU; "massive" depth (hundreds of upgrades, 13 trees, 10+ rune families); very fast content cadence; a volunteer tester team maintaining a Trello, a guide spreadsheet and community tools (2 rune calculators, factory calculator, Hacker/Prism tree overviews) → strong theory-crafting appeal; F2P path to gamepasses via Tickets.
- **Complaints** (evidenced by code names and guide notes): server shutdowns/restarts (`SORRYSHUTDOWN67/68/69`, `SHUTDOWNBECAUSEOFNOOBS`), bugs (`SORRYWEIRDANDANNOYINGBUGS!!`, `HOPERUNESFIXEDONG!`, a Rune Speed mutation that slowed instead of sped), update delays (`BIGDELAYSORRY`), Update 4 shipped with no patch notes; grind walls at P7→8 and P8→9; manual chores that push players to auto-clickers/macros; late-game Prism scarcity; monetisation pressure (127 dev products; Luck pass matters for enchants; minion pack) **(inferred)**; information sprawl (dozens of SEO sites with wrong numbers).

## Steal-worthy ideas (for a space-fantasy web incremental)

- **Root-based luck with a floor** → "Constellation Shards": effective odds = base^(1/k(luck)), never better than 1/10. Lets odds span 1e3…1e120 while Luck stays meaningful forever; show base and effective odds side by side.
- **Luck-immune "anomaly" tier** (Noobinial analogue → "Void Anomalies") that only scales with rolls/sec, plus a **luck slider** in settings — a real strategic choice between rarity and throughput.
- **Rarer = lower max level, more stats**: commons cap at L500 with 2 stats; anomalies cap at L3–20 with 6–8 stats; every shard also boosts a meta-stat (luck/bulk/speed) to create loops.
- **Altar UX**: "Shard Content" list with colour-coded names and live odds; "You can roll for 2h 3m"; lifetime "Opened" counter; in-UI hint "Recommended when your rolls/sec ≥ odds/1000 (≈17 min per hit)".
- **Sacrifice**: burn astronomically many duplicates of a top shard for a permanent +10 % per level ("Supernova a shard").
- **Prestige = unlock + automate** rather than big multiplier; automate last tier's chores one prestige later ("Free Oof Auto"-style nodes).
- **Nested mini-prestiges per system** with crisp geometric ladders (Tycoon ×5 per reset at 10k/1M/10T/10Sx/50De; Wood Ranks; Water Buckets) — each realm gets its own.
- **Milestone boards at ×1000 steps** with capped boosts; **5:1 merge factories** with per-tier capped bonuses (→ "Star Foundries").
- **Capsule luck that funnels probability into one target tier** (0.4 % → 28.4 %) — great for companion/"familiar" capsules.
- **Per-currency colour language** everywhere (text, icons, card frames, altar glow) — makes 40+ currencies legible.

---

# Roblox "button simulator" genre (BS:ED, Button Simulator Mania, BSG2, Button Simulator Ultimate)

> Context for Button Eternal: the genre's stat-chain math. Sources: Button Simulator:ED fandom wiki (game by Quantack, released 17 Aug 2021, "one of (if not) the most popular button simulator"), Button Simulator Mania fandom (BSM; its Daily Runes are named Tehleatite/Nemarite/Nymouxite/Ghoulaxite and its final rune boosts "Tehleat"/"Ghoulax" → the **Noob Incremental team's lineage** **(inferred)**), Button Simulator Grind 2 (BSG2) fandom, and the Button Simulator Ultimate Roblox description.

## The chain (multiplier → rebirth → ultrabirth …)

- **BS:ED main world**: Cash is the only auto-generated stat — **+1 Cash every 0.25 s** base. **Cash → Multiplier → Rebirths → Stone → White Gems …**; "Rebirths multiplies Multiplier by 2", "Stone ×2 Rebirths" — each next stat multiplies the previous one ×2 and is *bought with* it. Every button press has a **"✨CRITICAL✨ (1 in 500)"** bonus-drop roll.
- **Spawn button prices (BS:ED)** — Multiplier buttons: 1 for 12 Cash, 3/50, 5/100, 10/500, 45/10k, 100/75k, 300/1M, 500/30M, 1k/100M, 5k/1B, 20k/5B, 60k/30B, 120k/200B, 300k/700B, 1M/3T, 4M/10T, 10M/50T, 50M/120T, 80M/400T, 200M/1Qd, 1B/5Qd, 4B/25Qd, 10B/100Qd → across 23 buttons the gain grows ≈ ×2.85 per button while the price grows ≈ ×5.3, so **price per unit rises ≈ ×1.86 per button** (12 → 10,000,000 Cash per Multiplier) **(computed)**. Rebirth buttons: 1 for 2k Multiplier … 100M for 50Qd. Stone: 1 for 30k Rebirths, 3 for 30M, 6 for 600M. VIP gives ×1.5 gain; 25 %/30 % discount upgrades.
- **Craftable stats**: **Ultrabirth** = 10 Rebirths + 1No Cash → ×8 Cash (2nd of 10 craftables).
- **BSM Spawn World chain**: **Yen → Multiplier → Rebirth → Super Rebirth → Ultra → Champion**; **10k Champion unlocks Desert**. 11 worlds (Spawn, Desert, Snow, Space, Volcano, Magic Forest, City, Floating Islands, Graveyard, Dimension 2, The End) × 4–7 stats each (Sand → Sun → Oasis → Tropical → Aqua → Snow → Ice → Glacial → Frost → Arctic → Rocket → Fuel → Planet → Travel → LightYear → Lava …).
- **BSG2 ladder**: Multiplier → Super → Ultra → Extreme → Omega → Ultimate → Hyper → Insane → Supreme → Godly → Omni → Ascended → Transcended.
- **Button Simulator Ultimate**: "Get a multiplier, buy new stats, make a **Mega**, get into the tops"; max stat "Flower" as of v0.8.
- Notation goes absurd: BS:ED stat gradients go to `999.99…NoNgNiMcNoNgNiMiNoNgNi`.

## Runes in the genre

- **BSM**: per-world runes with **1/X odds and additive "×0.05 Stat" bonuses**; e.g. Basic: Common 1/1.59 (×0.05 Yen), Uncommon 1/4, Rare 1/10 (×0.05 Multiplier), Epic 1/50, Legendary 1/1k (×0.2 Rebirth, ×2.5 Multiplier), Mythic 1/10k, Secret 1/100k (×4 Ultra, ×2 Champion, ×0.5 Tokens); Volcanic tops out at MegaEruption 1/500M; Floating Islands Zephyer 1/6B; "Thank You For Playing" 1/100M, "From The Devs" 1/10B. **Runes are deleted on tier-up except those rarer than 1/1M** (bold "saving" runes); "Runes below 1/25M are deleted after sacrifice". **Limited event runes ignore luck**. Gem upgrades: **Rune bulk +1 per upgrade, rune cooldown −0.05 s per upgrade, Luck ×0.25 per upgrade**. Token upgrades include **token pity ×0.25/upgrade**. Daily Rune: 70 % +1 % stats, 20 % +5 %, 8.6 % +10 %, 1.2 % +50 %, 0.2 % +100 %. Passives machine (keys; regular luck doesn't apply): Lucky/Strong 35–2.9 % … Reaper 1/100 … Star Entity / Ghoul 1/1M.
- **BSG2**: rune buttons auto-roll while you stand on them, "consuming buttons"; bulk raises cost per roll; most runes **add**, **secret runes multiply**; variants **Shiny 1/100, Rainbow 1/750, Void 1/2,500** layered on top of the base roll; milestone runes (5K/50K/100K/…/1M) for community milestones; "Huge Sun = same boost as your best rune".
- **Automation rule (BSM)**: "Auto stats" are bought with Tokens and require *possessing* a threshold of the next stat (Auto Multiplier needs 4.5k Rebirth; Auto Rebirth 225 Super Rebirth; Auto Champion 10k Sand … Auto Planet 52.5T Travel) — exactly what BE2's Automation panel does.

## Steal-worthy genre ideas

- **Stat ladder where each tier is bought with the previous and multiplies it** (×2 in BS:ED): "Stardust → Nebulae → Stars → Constellations → Galaxies".
- **Price/gain tables that diverge** (each successive button: price ×5.3 vs gain ×2.85 → cost per unit ×1.86) — a natural soft wall without explicit softcaps.
- **Critical procs** on every purchase (1 in 500) with a big shout message.
- **Rune variants** (Shiny/Rainbow/Void multipliers) as a second RNG layer on top of rarity.
- **"Saving" threshold**: only items rarer than X survive a tier-up — makes ultra-rares feel permanent.
- **Gem-shop meta upgrades**: +1 bulk / −0.05 s cooldown / ×0.25 luck per level — simple, legible luck economy.

## Sources

Primary / API:
- https://www.roblox.com/games/81853095802293/Button-Eternal-2
- https://www.roblox.com/games/76911729991355/Noob-Incremental
- https://apis.roblox.com/universes/v1/places/81853095802293/universe (and /76911729991355/, /80184918744223/)
- https://games.roblox.com/v1/games?universeIds=10459868986,9965411707,8927449218
- https://games.roblox.com/v1/games/votes?universeIds=10459868986,8927449218,9965411707
- https://badges.roblox.com/v1/universes/10459868986/badges?limit=100&sortOrder=Asc
- https://badges.roblox.com/v1/universes/8927449218/badges?limit=100&sortOrder=Asc
- https://apis.roblox.com/game-passes/v1/universes/10459868986/game-passes?passView=Full&pageSize=100 (also 8927449218, 9965411707)
- https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=10459868986,8927449218,9965411707&countPerUniverse=10&size=768x432&format=Png
- https://trello.com/b/OZj7yj10/noob-incremental-trello (board JSON + card attachments: Fire board, Rune Sacrifice, Oof Milestones, Starter tree, UI Prism tree, Update 1)
- https://docs.google.com/spreadsheets/d/1zpyeGXBA2_l6-BzxUb2fjRzJ73j1Cih-CciZYEkbYFA (tester guide: Prestige 0–10+, Prism, Runes, Tiers, Enchant Shards, Quests, Minions, Tycoons, Guild tabs)
- https://noob-incremental.fandom.com/wiki/Runes (and its rune/altar screenshots via the MediaWiki API)
- https://www.youtube.com/watch?v=6X-A9i94fIA (OFFICIAL GUIDE TO NOOB INCREMENTAL — description/chapters)
- https://www.youtube.com/watch?v=zIUE12W3tQY, https://www.youtube.com/watch?v=F7ZmHLx7VDs, https://www.youtube.com/watch?v=3ujuZyqkrhk, https://www.youtube.com/watch?v=e8G9H2iOYmA, https://www.youtube.com/watch?v=pcOUwJwF66E, https://www.youtube.com/watch?v=WaCJYarZ2gM, https://www.youtube.com/watch?v=z8EOkN3lDMI, https://www.youtube.com/watch?v=Y3FeBkpbT6g (titles/dates/descriptions)
- https://www.youtube.com/watch?v=RV7YT_rp-uI (BE2 V1 release notes + storyboard frames)
- https://www.youtube.com/watch?v=foXjAPlqp6Q (BE2 V2/v2.1 notes + storyboard frames)
- https://www.youtube.com/watch?v=30xyTCropQM (BE2 V3 notes + storyboard frames)
- https://www.youtube.com/watch?v=yKcSEsEwfxA (BE2 Update 1 thumbnail: Tide's Trial, shards)
- https://www.youtube.com/watch?v=VRc8kpGKato, https://www.youtube.com/watch?v=RRqtt6fXByI, https://www.youtube.com/watch?v=aPDmCdwU_z0 (BE1 v11 / v10 / v9.75 notes)
- https://www.youtube.com/watch?v=t1Hc5RMJG_Q (BE2 "resource guide" — title only)

Fan / analytics sites (used with caution):
- https://rotrends.com/game/9965411707 ; https://rotrends.com/game/10459868986
- https://creatorexchange.io/roblox-game/8927449218/button-eternal
- https://noob-incremental.com/ ; https://noob-incremental.com/articles/noob-incremental-prestige-guide/ ; https://noob-incremental.com/articles/noob-incremental-runes-guide/ ; https://noob-incremental.com/articles/noob-incremental-tiers-awakening-guide/ ; https://noob-incremental.com/articles/noob-incremental-factory-guide/ ; https://noob-incremental.com/articles/noob-incremental-gamepasses-guide/ ; https://noob-incremental.com/articles/beginner-progression-route/
- https://noob-incremental.org/guides/ ; https://noob-incremental.org/wiki/runes/ ; https://noob-incremental.org/wiki/oof/ ; https://noob-incremental.org/wiki/prestige/ ; https://noob-incremental.org/wiki/realm-5/ ; https://noob-incremental.org/wiki/cards/ ; https://noob-incremental.org/updates/ ; https://noob-incremental.org/sources/
- https://noobincremental.wiki/ ; https://www.noob-incremental.wiki/ ; https://noobincrementalcalc.online/prestige-guide ; https://robloxcalc.com/games/noob-incremental/guides/prestige-priority/ (unreliable; contradict Trello)
- https://gachapocket.com/button-eternal-2-codes/ ; https://tryhardguides.com/button-eternal-2-codes/

Genre:
- https://button-simulatored.fandom.com/wiki/Button_Simulator:ED_Wiki ; https://button-simulatored.fandom.com/wiki/Cash ; https://button-simulatored.fandom.com/wiki/Multiplier ; https://button-simulatored.fandom.com/wiki/Rebirths ; https://button-simulatored.fandom.com/wiki/Ultrabirth ; https://button-simulatored.fandom.com/wiki/Spawn ; https://button-simulatored.fandom.com/wiki/Boosts
- https://button-simulator-mania.fandom.com/wiki/Runes ; https://button-simulator-mania.fandom.com/wiki/Passives ; https://button-simulator-mania.fandom.com/wiki/Daily_Rune ; https://button-simulator-mania.fandom.com/wiki/Tokens,_Gems_and_Upgrades ; https://button-simulator-mania.fandom.com/wiki/Spawn_World ; https://button-simulator-mania.fandom.com/wiki/Worlds ; https://button-simulator-mania.fandom.com/wiki/Dimension_2
- https://button-simulator-grind-2.fandom.com/wiki/Runes
