# Ascender Incremental

> Research file 04 for Starforge (original space-fantasy web incremental). Compiled 2026-10-10.
> Method: official Trello board (exported as JSON, 130+ cards), the community master Google Sheet linked from Trello (exported per tab as CSV), live Roblox API stats, Rolimons, Sportskeeda, YouTube transcripts (5 Ascender videos, 7 Tower videos), DevForum threads on EternityNum, break_eternity.js README.
> Note: the Fandom wiki (`ascender-incremental-roblox-offical.fandom.com`) has been deleted ("This wiki does not exist"); a few numbers survive only as search-engine snippets and are cross-checked against Trello.
> Legend: **(inferred)** = my deduction, not read in a source. Roblox suffixes: K, M, B, T, Qd(1e15), Qn(1e18), Sx(1e21), Sp(1e24), Oc(1e27), No(1e30), De(1e33), UDe(1e36), DDe(1e39) ... Vt(1e63) ... Tg(1e93) ... qg(1e123), Qg(1e153), sg(1e183), Sg(1e213), Og(1e243), Ng(1e273), Ce(1e303), UCe(1e306).

## At a glance

| Field | Value |
|---|---|
| Title (live) | `[EVENT] Ascender Incremental! ⚡` — "v1.1 / UPD 1, Content Update 1, 5M Event" |
| Developer | LZR Games! — akn (building, UI, GFX, managing), Icyy (balancing, co-founder), Cookie (scripting), Ayla (manager). Description credits "@FoundForces – EternityNum". |
| Created / last updated | 2024-04-21 / 2026-09-13 (Roblox API) |
| Visits / favourites | 19,796,596 / 92,484 |
| Votes | 28,091 up / 2,763 down = **91.0%** |
| Server size | 10 players |
| CCU | All-time peak **11,072 on 2025-02-24** (Rolimons); **25** playing on 2026-10-10 |
| Genre tag | Simulation > Incremental Simulator |
| Status | Trello last edited 2025-09-26. A prominent YouTuber made a "Saying Goodbye" video stating the game is discontinued and the devs moved on to an "Upgrade Tree" game. Effectively dead. |
| Built-in perks | Group members x1.5 Energy, +5 walkspeed. Roblox Premium x1.15 Rune Luck. Following each dev's Roblox profile and pressing a purple check button grants a boost: x1.25 Rune Luck, x1.25 Rune Speed, x1.25 Prisms, +1.25 Rune Bulk, x1.25 Rune Bulk, x1.25 All Stats (except Prisms), x1.25 Chromium. The game's favourite count also feeds a small rune-luck bonus (observed on video; exact formula unknown). |
| Don't confuse with | "Ascension Incremental" / "Ascension Incremental 2" (different developer). |

## Core loop (first 5 minutes)

The world is a 3D island hub. Each mechanic is a **"workstation"**: a floating upgrade billboard plus a glowing **floor pad ("button")** you stand on. Progress comes from walking between pads and standing on them.

1. **Energy** is generated passively on a tick. Base tick is **0.25 s**; Gears later cut it to 0.05 s. You buy multipliers on the Energy board.
2. **Tier 1 costs 100 Energy** (first minute). It doubles Energy and unlocks **Flame** and **Realm Points (RP)**.
3. **Flame**: stand on the Flame pad and it continuously converts Energy into Flame (Flame costs 50 Energy). Each Flame adds **+0.5x to the Energy multiplier**. Standing longer gives more Flame; this is the main early accelerator.
4. **RP**: stand on the RP pad for **+1 RP per 1 s cooldown** (base). The RP board buys multipliers for everything, and **RP is never reset by tiers**. Only Challenges and Ascension reset it.
5. A **tier progress bar** spans the top of the screen. At 100% it shows a "You may now Tier Up to N!" banner, and you walk to the Tier Up station.
6. **Tier 2 costs 1M Energy.** One YouTuber reached it after standing about 5 minutes (2M Energy). It unlocks **Power**: a micro-prestige that spends 50+ Flame, **resets Energy and Flame**, and gives Power. Power becomes Damage and buys Power upgrades.
7. Repeat Energy → Flame → Power → Tier. Upgrade boards show a **level milestone: every 15 levels the effect doubles** (observed on the RP board).
8. New players redeem about 30 codes. Most give "Pots" (elixirs), tickets or RTokens; some give permanent x1.1 luck, bulk or speed. These codes jump-start the game.

## Every currency / resource and how it's produced

### Realm 1 ("Overworld": 10 tiers, 6 runes, 9 unique stats, 4 leaderboards)

| # | Stat | Unlock | Produced by | Uses / effect | Reset by |
|---|---|---|---|---|---|
| 1 | **Energy** | start | passive tick 0.25 s (Gears down to 0.05 s; Fast Attack pass −0.04 s) | buys Flame, Gears, Tiers, Ascension, Realm 2 teleporter | Tier, Power, Ascension |
| 2 | **Flame** | T1 | stand on Flame pad, costs Energy (50) | Basic Rune currency; **+0.5x Energy per Flame**; boosts XP after 1M Flame | Tier, Power |
| 3 | **Realm Points (RP)** | T1 | RP pad, 1 s cooldown (divided by the 4th Sphere milestone) | RP upgrades; Color Rune currency | only Challenges and Ascension |
| 4 | **Power** | T2 | convert 50+ Flame (resets Energy and Flame) | becomes Damage; Power upgrades; Accelerator levels | Tier |
| — | **Damage** | T2 | derived from Power × upgrades × runes | kills mobs | — |
| 5 | **Ascender XP / Levels** | T4 | tick-based | level-ups give Energy multipliers | Tier |
| 6 | **Flesh** | T4 | random drops from **Mobs** | Flesh upgrades | Tier |
| 7 | **Prisms** | T5 | every **15 s** base. Standing on the Prism pad gives x2 and halves the cooldown. The Accelerator speeds it up | talents, Polychrome Rune, Chromatizing | only Ascend, Freeze, Chromatize |
| 8 | **Orbs** | T7 | passive, every 1 s | boost almost everything (formulas below) | Tier |
| — | **Cubes** | T8 | "Merger": a cube spawns every 20 s; 3 of the same level merge into level +1 | Energy 3^L, Power 2^L, Orbs 1.5^L (L = highest cube level) | Tier |
| 9 | **Spheres** | T9 | passive, every 0.25 s (Gears) | Sphere upgrades and Sphere milestones; Nature Rune currency (5Oc) | Tier |

**Orb formulas (Trello):** Energy +1x per 20 Orbs; Flame +1x per 500; Power +1x per 10K; RP x Orbs^0.15; Flesh x Orbs^0.75 (from 10Oc Orbs); Rune Bulk +1 each at 1DDe, 1QnVt and 1Ocqg Orbs. There are 3 permanent Orb upgrades: x2 Rune Luck, x2 Rune Speed, +1 Rune Bulk.

### Realm 2 ("Arctic": costs 50No = 1e30 Prisms and requires Ascension; 6 stats, 2 runes, tiers 11–13)

| Stat | Produced by | Effect | Reset by |
|---|---|---|---|
| **Droplets** | passive every 0.5 s (only the Icequake rune lowers it, by up to −0.4 s) | **+1x Spheres per Droplet**; Droplet upgrades; Water; Freeze; the currency for Tiers 11–13 (T11 needs **4.99No Droplets**) | Ice, Icicles, Freeze |
| **Water** | stand on Water pads; costs Droplets | **+0.5x Droplets per Water** | Ice, Icicles |
| **Arctic Points (AP)** | works like RP; unlocked by the 4th R2 talent (needs Freeze 3 and 1DDe Prisms) | AP upgrades; Cryo Rune currency (50 AP) | Ascension, Freeze |
| **Ice** | stand on Ice pads; costs Water; **resets Droplets and Water** | +1x Water per Ice; +0.1x Spheres per Ice (with upgrade); feeds Icicles | Icicles |
| **Chromium** | every 10 s after the first Chromatize | talents; Arctic Rune currency (1M) | — |
| **Icicles** | reset layer: converts Ice to Icicles = **log10(Ice / 100Qn)^5**, resetting Droplets, Water, Ice and Chromium | boosts Droplets x Icicles^2, Water ^1, Prisms ^0.5, Ice ^0.2 | — |

### Late, special and miscellaneous

- **Tickets**: base **1/10,000 chance per rune opened**. Rune Speed raises the rate; Rune Bulk does *not*. Some runes improve the odds (e.g. Antimatter −1/500, down to a −1/2500 cap). Spent on the Ticket Upgrade board, Ticket Perks and Hall-of-Fame event runes.
- **Robux Tokens (RTokens/RT)**: 1 every **6 min online**, cut by up to 5 min (Prime pass −1 min, Premium −30 s, 12 Refraction runes −1 min, Cyclone talent −30 s, 2 Etherborn runes −1 min, 600 Mystery runes −1 min). Also dropped by chests. **1.5 RT = 1 Robux** in the shop. Community math: F2P can earn about 50 RT/h (1,200/day); with Premium about 75 RT/h.
- **Elixirs/"Pots"**: timed buffs from codes, chests or the shop (see Leaderboards / social).
- **Secret Stats**: hidden pickups on the map, each with a **24 h real-time cooldown** (12 h with a pass).
  - **Loot** (T4): +0.05x Energy (max x1K), +0.05x Flesh (max x1K), +0.0075 Rune Bulk (max x3) per pickup.
  - **Hail** (T10): +1.5x Droplets, +1.5x Prisms, +1.15x Rune Speed (uncapped).
  - **Haze** (T13): +3x Droplets, Water and Ice; +1.3x Rune Luck (max x25).
  - **Shine** sits on a mountain top in the Chroma area.
  - **Chroma** and **Light** are "Special Secret Stats", unlocked at Chromatizer level 1000 plus 10Qn Vanguard runes. **Reflection** is a further late stat.
- **Chests**: each mob kill has a 1/10K chance to become a chest; runes improve this to as good as 1/250. Average yield goes from 12 chests/h (17.8 RT/h, 1.85 elixirs/h) to 48/h (71 RT/h, 7.4 elixirs/h) with everything maxed.

## Upgrade structure (cost scaling, effect formulas, softcaps)

- **Boards per workstation** (Energy, Flame, RP, Power, Flesh, Orbs, Spheres, Droplets, AP, Ticket, Freeze, Accelerator, Merger). Each upgrade has a level cap. **Power-upgrade caps rise by +100 at Tiers 7, 8, 9 and 10 (stacking)**, so tiers raise the ceiling on old boards. Boards scroll horizontally and new tiers add upgrades to old boards. The guide reminds players to scroll right after each tier.
- **Level milestones:** the effect doubles every 15 levels (observed on the RP board). The general formula is not published.
- **Gears:** 8 levels, each −0.025 s on the Energy/XP/Sphere tick (0.25 → 0.05 s).
- **Accelerator (T9):** +0.1x Prism spawn speed and +0.05x Cube spawn speed per level. 30 levels (+3x / +1.5x); a talent adds 30 more.
- **Merger milestones:**
  - L10: unlocks the +1 Rune Bulk permanent upgrade.
  - L20: halves the cube cooldown.
  - L35 and L55: each unlocks a talent.
  - L400: Prisms boost themselves ^0.25.
  - L1350: unlocks a talent.
  - L1450: unlocks a Power upgrade.
  - Orbs can buy a higher cube base level and a faster spawn rate.
- **Mobs:** spawn every 3 s from level 1. **Kill 15 mobs of a level to unlock the next level** (more HP, more Flesh). A red pad freezes auto-levelling and a green pad resumes it. Players keep the level at a one-hit kill to farm chests.
- **Talent trees:**
  - **R1 tree:** 30+ upgrades, bought with Prisms, **not reset by Tier**. Includes auto-kill for mobs, auto-energy and auto-flame.
  - **R2 tree:** 30+ upgrades plus 2 **mega talents**:
    - **Chromatizer** (needs Freeze 4; costs 49.99TDe Prisms + 25 Refraction runes). Levelling it gives buffs but resets the talent trees. Rune Bulk rises with each level up to 150; level 7 unlocks the Arctic Rune; 750 unlocks Galactic; 850 gives x1.25 RT; 1000 unlocks the Chroma Tree.
    - **Rune Starring** (see Rune RNG systems).
  - **Hidden/Secret talents** are physical objects hidden in the map (behind trees, in caves, on floating islands), unlocked by owning certain hidden runes.
- **Challenges (T10, all mandatory):** entering resets everything except runes, tickets and products, and you must climb back to T10 between challenges.
  - **C1** — reach T6 with Energy/Flame/Power/RP ^0.425. Reward: x1T Energy and Flame, x1M Orbs, x2 Prisms.
  - **C2** — reach T8 with all rune effects ^0.33. Reward: x20 all stats.
  - **C3** — reach 1e393 Energy with no RP or Flame gain. Reward: ^1.1 Energy, Flame and Orbs.
  - **C4** — reach 1e96 Energy with all stats ^0.5. Reward: x15 Prisms.
- **Rune effect math (per copy owned):**
  - **Additive-linear:** e.g. Basic "Basic" rune gives +0.002x Energy each, so the multiplier is 1 + 0.002·n.
  - **Capped:** e.g. Unknown rune +0.25x Rune Luck per copy, **[MAX x3]**. Almost every utility bonus has a hard cap, which is the main softcap tool.
  - **Exponential:** e.g. Immortality **x1.0005^n Rune Bulk (max x1B)**, Hyper Finality 1.00025^n Rune Speed (max x1T), Vanta 1.000015^n, Overlord 1.01^n Energy (max x1NoNg = 1e300), Superstar x1,000,000^n Energy (max 50 copies), Monarch x2^n Energy.
  - **Power caps:** Oscillion ^1.3 Bulk, Cyclone ^1.2 Bulk, Planet ^1.035 Bulk.
  - **"Dual exponential":** Zephyr 1.000000000000001^(n/15)^(n/37.5) Rune Bulk (max x1M), which shows almost nothing until about 400 copies and maxes at 418.
- **Monetised upgrade levels:** x1.1 Rune Luck pass (stacks 0/20, 99 R$), x1.05 Rune Speed (0/25, 59 R$), +0.25x Rune Bulk (0/8, 179 R$), +0.5x Secret Stats (0/2). Some RT-priced upgrades have 250 levels and climb to about 20 RT per level (complaint video).
- **Donation formula:** +0.25x All Stats × log10(total donated), +0.15x Rune Luck × log10, +0.15x Rune Speed × log10. So 10 R$ gives 1.25x/1.15x/1.15x; 1,000 R$ gives 1.75x/1.45x/1.45x.

## Reset / prestige layers (in order)

| # | Layer | Requirement | Resets | Keeps | Reward |
|---|---|---|---|---|---|
| 0 | **Power** (micro) | 50+ Flame | Energy, Flame | everything else | Power (Damage, Power board) |
| 1 | **Tier 1–10** (R1) | Energy thresholds (below) | "everything" | **Runes, Products, Tickets, RP, AP**, talents, Prisms | Stepped multipliers plus feature unlocks (below) |
| 2 | **Challenges C1–C4** | be at T10 | all stats except Runes, Tickets, Products | — | Permanent multipliers (above) |
| 3 | **Ascension One** (the only ascension shipped) | T10 + an unstated Energy amount; all challenges done | all progress, plus **all runes rarer-than-common below 1/100M odds** (Global/Ultra runes exempt) | Products, Tickets, Global/Ultra runes, runes rarer than 1/100M | x3 Prisms, x10 RP, x50K Orbs, x2 Rune Luck (R1), +10 Rune Bulk (R1). Unlocks Polychrome Rune, 5 RP upgrades, 3 talents, 3 cube milestones, 6 sphere milestones, Realm Teleporter. Challenges must be redone, but are easier. |
| 4 | **Tier 11–13** (R2) | Droplet thresholds (T11 = 4.99No Droplets) | as Tier | as Tier | see table |
| 5 | **Freeze 1–9** (R2 sub-prestige, redone after each tier) | Droplets | R1 workstations, R1 talent area | — | F2 unlocks Ice; F3 unlocks Cryo Rune and AP; F4 mega talent (Chromatizer); new talents and ticket perks |
| 6 | **Icicles** | 100Qn+ Ice | Droplets, Water, Ice, Chromium | — | Icicles = log10(Ice/1e20)^5 |
| 7 | **Chromatize (levels)** | Chromium/Prisms | T1 and T2 talent areas, Prisms | — | Chromium levels (Bulk to 150, Arctic Rune at 7, Galactic at 750 ...) |
| 8 | **Rune Starring** | T13 + Chromium 10 + Freeze 9 | sacrifices the rarest runes of a type; **deletes all runes of that type on the final star rank** | — | Rune-stat boosts; **reveals hidden runes** (Bloom, Aether, Vexed, Blizzard) |

**Tier table (official Trello)**

| Tier | Cost | Energy mult | Other boosts | Unlocks |
|---|---|---|---|---|
| 1 | 100 Energy | x1 → x2 | — | Flame, RP |
| 2 | 1M (1e6) | x2 → x4 | Flame x2 | Power |
| 3 | 5B (5e9) | x4 → x20 | Flame x5, Power x2 | Gears, **Basic Rune** |
| 4 | 2.5Qd (2.5e15) | x20 → x80 | Flame x15, Power x4, RP x1.25 | XP/Levels, Mobs + Flesh, Loot secret stat |
| 5 | 750Sx (7.5e23) | x80 → x500 | Flame x30, Power x16, Rune Luck x1.25, RP x1.5, Flesh x2.5 | **Talent Tree** + Prisms |
| 6 | 10DDe (1e40) | x500 → x5K | Flame x200, Power x80, RP x3, Flesh x10, Prisms x1.5 | Prism pad, 2 talents, **Color Rune** |
| 7 | 100Vt (1e65) | x5K → x75K | Flame x2.5K, Power x250, RP x9, Flesh x250, Prisms x2, Rune Speed x1.25 | **Orbs**, 4 talents (incl. auto energy/flame), +100 Power caps |
| 8 | 1Qg (1e153) | x75K → x2.5M | Flame x100K, Power x10K, RP x27, Orbs x4, +1 Rune Bulk | **Merger/Cubes**, +100 caps |
| 9 | 1UNg (1e276) | x2.5M → x25M | Flame x1.5M, Power x750K, Flesh x5M, Orbs x50 | **Spheres**, Accelerator, **Nature Rune**, 3 talents, +100 caps |
| 10 | 1QnVtTr (**1e978**) | x25M → x50B | Flame x500M, Power x50M, Flesh x2.5B, Orbs x5K, Spheres x25, +3 Rune Bulk | **Challenges**, **Ascension**, 3 talents, Hail secret stat |
| 11 (R2) | 4.99No Droplets | — | Droplets x3, Water x1.5 | Freeze, 2 talents, **playtime streak rewards** |
| 12 (R2) | Droplets | — | Droplets x250, Water x10, Ice x3, AP x1.5 | 3 Freeze tiers, **Global Goals** |
| 13 (R2) | Droplets | — | Droplets x40K, AP x5, Chromium x4 | 3 Freeze tiers, Icicles, Haze secret stat, 3 talents |

**Design note (inferred):** in log10 terms the tier costs are 2, 6, 9.7, 15.4, 23.9, 40, 65, 153, 276, 978. The exponent itself grows about 1.5–3.5x per tier, which is super-exponential pacing. Each tier's "Energy multiplier" step is small (x2 to x2,000 per tier) compared with the cost growth. The gap is closed by new *systems* (Orbs, Merger, Spheres) whose formulas are polynomial or exponential in other stats.

## Rune RNG systems (rarities, odds, luck, speed, collection bonuses)

**Core math (from the community calculator source):**
- **RPS (runes per second) = Rune Speed × Rune Bulk.**
- Expected time for a 1/N rune = **N / RPS**.
- Rune Speed = rolls per second while standing on the pad. Rune Bulk = runes per roll (an additive base plus multipliers plus exponents).
- **Rune Luck** shifts rolls toward rarer results. Players **turn luck OFF in Settings** to farm cheaper commons they still need. So luck works as a "skip commons" shift, not a free bonus (inferred mechanism).
- Hidden runes are effectively unaffected by luck; the guide says to turn luck off for the late game. **Galactic runes are explicitly immune to luck.**
- Tickets drop from openings (1/10K per opening, scaled by Rune Speed only).
- **Rune Clone** (product, 8 levels from 199 to 1,399 R$, 5,192 R$ total) **duplicates every rune easier than** 1/1K, 1/10K, 1/100K, 1/1M, 1/10M, 1/100M, 1/10B, 1/1T at levels 1–8.
- Runes stack forever. **Each copy adds to a bonus, usually with a max cap.** There is no separate "index" bonus: the collection *is* the bonus.

**Rune pads (cost per opening → where):**

| Rune | Unlock | Cost/opening | Visible pool (odds → per-copy effect) | Hidden runes ([H]) |
|---|---|---|---|---|
| **Basic** | T3 | 1K Flame | Basic 50% (+0.002x Energy) · Unique 30% (+0.005x Energy) · Rare 18% (+0.005x Flame) · Ascendant 1.98% (+0.025x Energy, +0.004x Flame) · Exotic 0.05% = 1/2K (+1x Energy, +0.6x Flame, +0.5x Power) · Unknown 1/2.5M (+2.5x RP, +5x Damage, +0.25x Luck, max x3) | Mystery 1/1T, Hyper Finality 1/750No, Shyft 1/75SpDe, Array 1/1Qdqg, Disarray 1/7.5SpQg, Apex 1/250Nosg, Strix 1/25QdOg, Nexus 1/1Ce |
| **Color** | T6 | 25K RP | Tinted 55% · Colorful 25% · Radiance 17% · Neon 2.5% · Chrome 0.5% (+0.15x Prisms, max x2) · Rainbow 1/30K (+0.04x Luck, max x1.2) · Vibrance 1/50M (+24x Energy ... +0.25x Rune Speed, max x2) | Bloom 1/7.5B, Gleam 1/100QdDe, Vanta 1/700Tg, Whirl 1/1Spsg, Onyx 1/125UOg |
| **Nature** | T9 | 5Oc Spheres | Oak 60% · Moss 20% · Dew 15% · Skylight 4.75% · Nightshade 1/400 · Wavecaller 1/10K · Thunderstorm 1/250K · Earthvein 1/3M · Emberglow 1/250M (+1 Bulk, max +5) · Dreamscape 1/1.25B (+50Kx Energy, +10Kx Spheres) | Thorn 1/10T, Squid 1/15Dqg, Cyclone 1/250Qnqg, Bolt 1/175NoQg, Riptide 1/15Spsg, Torrent 1/2.5QnSg, Hurricane 1/10Ce |
| **Polychrome** | after Ascension | 1Qd Prisms | Glow 99% · Shimmer 1/50K · Iridium 1/5M · Spectrum 1/750M (**auto-buys talents every 60 s**) · Prismatic 1/5B · Refraction 1/1T (+10x Prisms, −5 s RT cooldown, **auto-gains RP**) | Aether 1/15B, Vexed 1/50B, Abyssium 1/125Qn, Oscillion 1/3.3Oc, Oblivion 1/50TVt, Zephyr 1/500Dsg, Raze 1/75QdNg |
| **Cryo** (R2) | Freeze 3 | 50 AP | Mist 99% · Breeze 1/500K · Shiver 1/75M · Frigid 1/250B · Icequake 1/7.5T | (meme names) 1/1TDe, Stray 1/10DQg, Buff 1/2TSg, Bozo, Mommy 1/75Ce, Soup 1/25UCe |
| **Arctic** (R2) | Chromium lvl 7 | 1M Chromium | Snowflake 99% · Snow 1% · Icy 1/250K · Avalanche 1/150M · Hailstorm 1/25B · Frostveil 1/5T · Subzero 1/250T | Blizzard 1/100B, Mirror 1/7.5NoDe, Frostbite 1/30TTg, Glint 1/333SpNg |
| **5M Beginner** (event, Hall of Fame) | — | 1 Ticket | Noob 95% · Intermediate 5% · Experienced 1/2K · Master 1/500K · Champion 1/10M · Legend 1/750M · Elite 1/50B | Superstar 1/25B (x1M^n Energy, max 50), Overlord 1/50OcDe, Sorcerer 1/1SpSg, Vanguard 1/6.66OcOg, Hyperion 1/5UCe |
| **5M Royal** (event) | — | 50 Tickets | Gilded 99% · Royalty 1/250K · Crown 1/75M · Throne 1/10B · Monarch 1/2T · Imperial 1/100T · Sovereign 1/2.5Qd | Kingslayer 1/250B, Divinity 1/75Qd, Prosperity 1/25Sx, Immortality 1/20SxVt, Odyssey 1/15QnTg, Destiny 1/50NoTg, Triarch 1/1.5QdQg, Liberty 1/35QdOg |
| **Galactic** (event) | Chromium 750 | 500 Tickets | Cosmic Dust 1/1Ocsg · Star 1/25Ocsg · Constellation 1/25TSg · Planet 1/30OcSg · Rocket 1/150QnOg · Axium 1/1UCe · Galaxy 1/15Ce (all luck-immune) | — |
| **Global** (Robux, given to **everyone online in every server**, never reset, R1 stats only) | 59 / 499 / 3,999 / 25K R$ bundles | — | Lightmatter 95% · Darkmatter 4.9% (+0.25x all, max x12.5) · Antimatter 1/1K (+0.1x Luck, +0.5x Bulk, −1/500 ticket chance) | Etherborn 1/10K (+1x Rune Speed max x25, −30 s RT) |
| **Ultra** (Robux, global, R2 stats) | same prices | — | Omniscient 90% · Omnipotent ~9% · Almighty 0.88% · Boundless 1/1K · Primordial 1/5K | Eternal 1/17.5K |
| **Ancient** / **Madness** (Robux, global) | — | — | Dust 83% · Bone 15% · Glyph 1.8% · Sigil 0.175% · Ankh 1/4K (+0.25 Rune Speed, max x10K) | Omen 1/33K; Madness → Malevolence |

**Hidden-rune ladder (community "Rune Order", 50+ steps):** Bloom 1/7.5B → Aether 1/15B → Superstar → Vexed → Blizzard → Kingslayer 1/250B → Mystery 1/1T → Thorn → Divinity 1/75Qd → Abyssium → Prosperity 1/25Sx → Oscillion → Hyper Finality 1/750No → ... → Oblivion 1/50TVt → Immortality 1/20SxVt → Vanta 1/700Tg → ... → Nexus 1/1Ce → Hurricane 1/10Ce → Galaxy 1/15Ce → Mommy 1/75Ce → Axium 1/1UCe → Hyperion 1/5UCe → Soup 1/25UCe → **Paracosm 1/40UCe ("The End")**.

The final odds (4e307) sit right at the double-precision ceiling. Each hidden rune usually grants **Rune Speed, Rune Bulk or Ticket multipliers** (so it makes the next hidden rune reachable) and often **unlocks a secret talent or ticket perk**. Each has a **max count** (e.g. Kingslayer 400, Hyper Finality 110.5K, Odyssey 9.5M, Triarch 67B).

**"Ticket-gated":** Hall-of-Fame runes cost Tickets. Once RPS outruns ticket income you are gated, so the meta alternates between runes that boost RPS and runes that boost Tickets.

**Rune Starring** (R2 workstation across from the teleporter): feed the rarest rune of Color, Polychrome, 5M Royal or Arctic for star ranks (e.g. Odyssey starring at 250, 2,500, 500K and 1T copies). Starring boosts rune stats and reveals hidden runes. The final rank deletes all runes of that type, so you re-farm them.

## Production chains (stat web)

Ascender has no physical crafting chain. It is a **dense multiplicative stat web**:

```
Energy ──(stand on Flame, spend Energy)──► Flame ──(+0.5x per Flame)──► Energy
Flame ──(Power reset)──► Power ──► Damage ──► Mobs ──► Flesh (+ chests → RTokens/elixirs)
RP pad ──► RP board (never resets) ──► multipliers everywhere; Color Rune
Prism pad ──► Prisms ──► Talent tree; Polychrome Rune; Realm 2 gate (1e30)
Orbs (1/s) ──► Energy/Flame/Power/RP/Flesh + Rune Bulk milestones
Merger cubes ──► Energy 3^L, Power 2^L, Orbs 1.5^L
Spheres ──► Nature Rune; Droplets ──(+1x per Droplet)──► Spheres
Droplets ──► Water (+0.5x Droplets) ──► Ice (+1x Water; resets both) ──► Icicles (^2 Droplets, ^0.5 Prisms)
Runes (every pad) ──► multipliers on all of the above + Rune Speed/Bulk/Luck + Tickets ──► more runes
```

Each new stat boosts an *older* stat, and the older stats pay for the new rune pads. The loop closes on runes, where RPS compounds itself.

## Automation unlocks

- **T6–T7 talents:** mob auto-attack, attack speed, spawn cooldown, mob auto-level; **auto-Energy and auto-Flame generation** (so you no longer need to stand on the Flame pad).
- **Rune effects:** Spectrum auto-buys talents every 60 s. Refraction "automatically gains RP" (a patch swapped Refraction's autobuy for auto-RP, which players disliked).
- **Passive stats:** Orbs, Spheres, Droplets, Prisms, Chromium and cubes all tick on their own.
- **Rune opening:** opening is passive while you stand on a pad. The endgame is standing on one rune pad for hours or overnight. A Settings **Rune Luck on/off** toggle is the only "rune filter".
- **No buy-max automation for boards** is documented. Players redo boards after each tier; "redo all upgrades other than the RP board each time you tier up" (guide). (inferred: no auto-buyers for boards)

## Offline / idle progress behaviour

- **No offline progress is documented** (Trello, guide and videos never mention it). (inferred: progress only while in a server)
- Idling = **AFK inside a server** standing on a pad; players leave the game running overnight.
- Several systems use **real-time clocks** that reward being online:
  - RTokens every 6 min.
  - Secret stats every 24 h (12 h with a pass).
  - Playtime streak rewards (T11).
  - Global runes and Global/Server elixirs bought by *other* players only reach you if you're online.

## Number scale reached and notation used

- **Scale:**
  - Tier 10 costs **1e978** Energy; Challenge 3 targets 1e393.
  - Endgame players show Energy around **e304,000** and Chromium "around the number limit squared" (Velvetliner).
  - Hidden-rune odds go down to 1/4e307.
  - Some stats are still plain doubles: the guide notes **some numbers become "E(inf)1" past 1e308**. The final rune odds were capped near 1e308, and that cap was blamed for content stalling.
- **Notation:** Roblox-style short suffixes (K, M, B, T, Qd, Qn, Sx, Sp, Oc, No, De, UDe, DDe ... Vt, Tg, qg, Qg, sg, Sg, Og, Ng, Ce, UCe ...).
  - Past Ce: compound suffixes such as **DeCe (e333), VtCe (e363) ... NoNgCe (e600), Du (e603), Tr (e903), Qa, Qi, Se, Si, Ot, Ni, Mi (e3003), Mc (e3,000,003), Na, Pi, Fm, At, Zp, Yc, Xo**, then 100+ more.
  - The Trello hosts a downloadable suffix list.
  - An in-game toggle switches to scientific notation (seen on video).
  - The Galactic cost string reads `1QnVtTr`, showing compounding suffix parts.

### EternityNum (FoundForces) and how it maps to break_eternity.js

- **EternityNum** is a free Roblox (Luau) module by **FoundForces**, credited in Ascender's description. Its successor/predecessor relation: DevForum says "BigNum is the predecessor of EternityNum".
- **Header** (from a copied source): numbers up to **10↑↑2^1024**, i.e. a power tower of about 1.79e308 tens. Config fields include an exponent limit, a derived **layer-down** value, **max significant digits (100)** and an overflow toggle. Those fields match break_eternity's `sign / layer / mag` normalisation. That it is a *port* of break_eternity is the brief's claim and consistent with the fields, but **I could not confirm it from a primary source** (inferred).
- **API seen in DevForum threads:**
  - `require(module)`, `convert(x)` (to EternityNum), `pow`, `short(x)` (suffix display only), `bnumtostr(x)` (serialise to string for storage).
  - `lbencode(x)` / `lbdecode(x)` (order-preserving integer encode for **OrderedDataStore leaderboards**, which accept only integers).
  - A rival lib (GammaNum) benchmarks EternityNum at about 1.6–3.8 µs per multiply and notes it **lacks tetration and integer division**.
- **break_eternity.js** (what Starforge will use):
  - Stores `Decimal.fromComponents(sign, layer, mag)` = sign·10^10^…^mag (layer tens). sign ∈ {−1, 0, 1}, layer is a non-negative integer.
  - Normalises: if mag > 9e15, then mag = log10(mag) and layer++. If mag < ~15.954 and layer > 0, it steps back down.
  - Range is about **10↑↑1e308**.
  - API: `add sub mul div pow root log10 ln exp slog tetrate iteratedexp layeradd10 cmp max min floor ...`
  - Immutable; you can't use JS operators on it.
  - Strings accepted: `M`, `eX`, `MeX`, `eeX`, `X^^N`, `NpX`.
- **Takeaways for Starforge:**
  1. Use one bignum type for *every* stat from day one. Ascender's mixed doubles hit 1e308 walls and killed content.
  2. Leaderboards need an order-preserving encoding (e.g. `layer*1e6 + log10-ish mag` packed into an int or sortable string).
  3. Keep display formatting (suffixes up to about e3003, then `e1.23e4567`, then `ee`/`F` notation) separate from serialisation.

## Pacing (rough time to each layer, F2P, early-2025 balance)

| Milestone | Time | Source |
|---|---|---|
| Tier 1 | < 1 min | 100 Energy |
| Tier 2 | ~5 min of standing | SMG Infinity video |
| Tier 5 | ~1 h 20 min | same |
| Tier 6 (1e40) | the creator planned "6–10 h" | same |
| Tier 9 | **~12 h** played | same |
| Tier 10 | **~24 h** (barely) | same ("24 hours noob to pro") |
| Ascension One + 4 challenges | further hours to days; challenges must be redone after Ascension | guide |
| Realm 2 (1e30 Prisms) | overnight AFK on Polychrome typical | guide |
| Tier 13 + Rune Starring | "takes a while", ~days | Superior video |
| Hidden-rune ladder | **24+ h on hidden runes alone; one player had 12 days of playtime**; ">300 h and still not able to reach the next stage" (complaint) | Velvetliner videos |

The curve runs fast, then much slower, then a wall. Each later step is roughly 10x longer than the previous (inferred from the above).

## UI / visual style

(From video frames and descriptions.)

- **World:** bright, saturated low-poly fantasy islands. Green grass, cyan crystal clusters, giant yellow and white mushrooms, floating islands linked by paths, Hall of Fame and leaderboard plaza. Realm 2 is an icy biome; secrets are hidden in caves and on floating islets.
- **Workstations:**
  - A dark, rounded **billboard board** floating above the ground with a coloured header (e.g. ENERGY UPGRADE, FLAME UPGRADE, RP UPGRADE).
  - Icon plus multiplier text ("x2.5 → x5") and **green "Upgrade" and magenta "Max" buttons**.
  - A glowing **circular pad** (pink/purple ring) on the floor to stand on.
  - A large currency billboard (e.g. "REALM POINTS (RP) 25.44, x2.5 RP") in purple and pink.
- **HUD:**
  - A **top-centre tier progress bar** with a "You may now Tier Up to 2!" banner.
  - A **left vertical stack of circular icon buttons** (shop, runes/stats, settings, players, stats graph).
  - **Right-edge buttons** (purple check = claim dev-follow boosts; search).
  - Bottom-left **event-buff list in bold gradient text with black outline** (e.g. "5M EVENT – x1.25 RTokens, x1.25 Rune Bulk, x3 Rune Speed, x2.5 Global & x2 Ultra runes").
  - **Floating pop-up numbers** ("+2.5 Realm Points") rise from the pad.
- **Rune UI:** rarity names and colours, counts, "RPS" readout. Rune results are instant, with no opening animation (a complaint compared to pet-egg games).
- **Fonts:** chunky rounded display fonts with heavy stroke (typical of the Roblox simulator genre).

## Leaderboards / social features

- **4 leaderboards** in the Overworld Hall of Fame. The exact stats are not documented (inferred: Energy, RPS, playtime, Robux donated).
- **Shared purchases:**
  - **Global / Ultra / Ancient / Madness runes:** one buyer gives runes to *everyone online globally*, with server announcements ("X bought 20 global runes").
  - **Server Elixir** (79 R$): x1.5 all stats, x1.75 Rune Speed for 60 min for everyone in the server; durations stack.
  - **Global Elixir** (219 R$): x1.5 Luck, +3 Bulk for 15 min for everyone globally.
- **Global Goals** (T12) and **playtime streak rewards** (T11).
- **Social hooks:**
  - Group-join perk; follow-each-dev boosts.
  - Favourite count gives rune luck.
  - "Meet a Developer" badge.
  - Discord-first codes and **hidden codes written on the map** (GoodEyes, plainsight, NotTooHidden, InsaneView ...).
  - Gift versions of every gamepass.
- **Monetisation catalogue:**
  - Gamepasses: 3x Energy 39, Sprint 39, x3 Damage 249, x2 Prisms 299, Prime 499 (x1.5 all, +7 walkspeed, −1 min RT), x2 Rune Speed 299, x2 Luck 349, Faster Attack 349, 2x Stats 399, Grinder Bundle 1,999 (all passes + 100 tickets).
  - Products: +1 Bulk 49 (or 399 for +10, infinitely repeatable), x2 Chromium 299, Faster Secret Stats 449, Rune Clone (5,192 total), Infinite Elixirs 5,499 (100K of each elixir, about 33,000 h).
  - Elixirs: 2x Stats 49, x2 Luck 39, x2 Speed 39.

## What players praise and complain about

**Praise**
- 91% like ratio and a peak of 11K CCU.
- "Everything plays into each other": a deep, legible web of stats.
- **Hidden runes and secret stats/talents/codes in the world.** One creator called hidden runes something he had never seen in another incremental, and said they kept players around.
- A strong community: a Trello, a 27-tab guide sheet, a rune calculator website.
- A satisfying exponential take-off ("starts slow then sky-rockets").
- A polished "high quality game".

**Complaints**
- **Pay-to-win / cash grab:**
  - The shop is described as bigger than Pet Simulator 99's.
  - **Global runes are effectively mandatory**; "impossible to progress without global runes".
  - One player estimated his donated ultra/ancient/global runes at about $7,000 of other players' Robux.
  - **RToken-gated upgrades**: hundreds of levels at about 20 RT each.
- **Dead-game problem:** once whales leave, nobody buys global runes, so late progress becomes impossible.
- **Monotony:** "sitting on the same button for hours, then switching to another button" (Velvetliner).
- **Balance walls:** 300+ h stalls; ticket-gating; challenges that wipe all stats.
- **Tech debt:** values capped at 1e308 and E(inf) bugs; a reported Rune Luck pass bug; lag.
- **Nerfs that force grind** (Refraction autobuy swapped to auto-RP).
- **Discontinuation:** players felt abandoned when devs moved to a new game.

## Steal-worthy ideas (for a space-fantasy web incremental)

1. **Workstation = pad + board.** Translate it to a **star-chart of "stations"**: click a station to dock your ship there, and only the docked station "channels" (Flame pad becomes "Plasma Siphon", Prism pad becomes "Lens Array"). Choosing where to dock is the core micro-decision, without 3D walking.
2. **Converter stat that boosts its source** (Flame: spend Energy, get +0.5x Energy per Flame). Use it as the first 60 seconds of Starforge: *Stardust → Ignite → Plasma (+x Stardust per Plasma)*.
3. **Tier table with stepped multipliers plus unlocks**, using a super-exponential cost curve (log10 cost: 2, 6, 10, 15, 24, 40, 65, 153 ...). Here this is **"Ascension Ranks" of your Starforge**. Each rank adds one new system rather than a bigger number.
4. **Rune pads as "Constellation Rolls".** Each pad costs a different currency and has a visible pool plus **hidden [H] results at absurd odds** that unlock secret talents. Use RPS = speed × bulk, show "time to next" = N / RPS, and let players **toggle luck off**. A collection that stacks forever, with per-entry caps, works as the softcap knob.
5. **Exponential-per-copy late runes** (x1.0005^n with a max) create long, mathematically smooth "chase" goals that a bignum lib makes trivial.
6. **Rune Starring = sacrifice for stars:** feed a stack of rare items to rank up a pool and reveal its hidden entries. It's a great reset-flavoured collection sink ("Supernova a constellation").
7. **Secret stats hidden in the world on a 24 h real-time cooldown.** Do this web-native: hidden clickable stars in the parallax background, nebula easter eggs, and a code-word engraved in a planet texture.
8. **Merger mechanic** (3 cubes of level L make L+1, boost = 3^L): a mini idle merge board, e.g. "Comet Fusion".
9. **Challenges with exponent debuffs** (^0.425, ^0.33, ^0.5) and permanent multiplier rewards. These are cheap to build and replay content.
10. **Avoid:**
    - Paid content that other players must buy for you to progress.
    - Premium-currency-gated upgrade tracks.
    - Plain-double stats.
    - Any reset that destroys collection items without a clear preview.

**Social translation:** an *opt-in* "Global Boon" (e.g. a shared community goal meter, not a purchase) keeps the "someone else lit a beacon and everyone benefits" moment ethically.

---

# Tower Incremental

## At a glance

| Field | Value |
|---|---|
| Title (live) | `[UPD6] Tower Incremental` (earlier titled `[⭐GLYPHS] Tower Incremental`) |
| Developer | Lucky CStudios (the developer comments on YouTube videos) |
| Created / last updated | **2026-09-04** / 2026-10-08 (six updates in about 5 weeks; UPD4 around 2026-10-04) |
| Visits / favourites | 2,986,494 / 44,459 (Roblox API, 2026-10-10). A fan site cited 1.4M visits around 2026-10-05, so visits are roughly doubling weekly. |
| CCU | **9,152** playing at fetch time |
| Votes | 6,365 up / 738 down = **89.6%** |
| Server size | 8 players |
| Description | Buy a stair, buy another; every step leads to the next income source. Activities: roll Glyphs, mine metals, smelt iron, mine crystals, chop wood, forge metals, train dragons, upgrade. "REACH THE TOP!" ("Forge Metals" and "Train Dragons" were added to the description after launch.) |
| Codes | `RELEASE` = 1.5x Gold Potion for 10 min (the only code; redeemed in Settings → Enter Code) |
| Wikis | `towerincrementalgame.wiki` is SEO filler with no numbers (it states it won't publish drop rates). `towerincremental.wiki` describes a tower-defence game, which is wrong. No official Trello was found. All real data below comes from gameplay videos. |

## Core loop (first 5 minutes)

**Premise:** you spawn at the bottom of a giant hollow tower (a dungeon you must escape) and **build a spiral staircase stair by stair**.

1. **Gold** drips passively: +5 per tick at about 1 s. Each purchase plays a very satisfying placement sound, often praised.
2. The **ground-floor board** sells More Gold (+5 → +8 → ...), Faster Gold (tick 1 s → 0.5 s → **0.2 s**) and Walk Speed. Each has max levels and a **"maximum purchase" toggle**.
3. **Stairs** are the main spend: the first stairs cost **13, 14, 16 gold**. A run of stairs completes a **Floor**, and every few floors there is a **room** (a new income source) you unlock with gold.
4. **Floor 1 room, "Lava Glyphs":** 100 gold to unlock. Stand inside and it **auto-rolls glyphs** (about 100 gold per roll, roughly 1 roll/s at first). Each glyph is a stacking buff (Gold/Silver/Luck x). Its in-room board buys glyphs per roll, roll speed, rarer pools and glyph luck.
5. Around floor 3 the **next stair costs about 2.5K**. You drop back down to buy board upgrades.
6. **The Mine:** "Floor 3 required", 1,500 gold. You physically swing a pickaxe at silver ore veins. The **Silver** board buys silver per ore, mine speed and **gold multiplier**. An **auto-mine toggle** sits on the left of the HUD.
7. **The trail shop** (cosmetic plus multiplier): Brick 1.1x gold first, Ember, Copper (25 silver), Magma 1.5x.
8. By about minute 5 you have three gold sinks (stairs, ground board, glyph board), two currencies (Gold, Silver) and an AFK spot (the glyph room). The next room is visible up the stairs.

## Every currency / resource and how it's produced

Tower 1 has 160 floors; Tower 2 was added by UPD6.

| Resource | Unlocks at (approx.) | Produced by | Spent on |
|---|---|---|---|
| **Gold** | start | passive tick (amount × speed); multiplied by glyphs, trails, silver/crystal/wood/essence boards, rebirths, potions, totems | stairs, rooms, ground board, glyph rolls, merchants, rebirths (1B for R1), perma upgrades |
| **Silver** | Mine, floor ~3 | mining silver ore veins. The mine **resets every ~40 s** (a "skip mine reset" upgrade exists). Silver per ore grew 18 → 74 → 1,800 → 7,000 and later to tens of thousands per ore | mine board, gold-multiplier room (x1.5 gold for 100 silver, then 200 ...), upgrade tree section 1, trails, Galactic tree nodes |
| **Iron ore → Iron ingots** | Smeltery, floor 10 | iron ore appears in the mine after the smeltery opens. Deposit ore, which rides a conveyor to the smelter, then a hammer, and comes out as **ingots** | upgrade tree (about 20K ingots per node mid-game), silver multiplier, perma upgrades (75K / 150K / 400K / 500K / 2.5M iron), Starforge input |
| **Crystals** | Crystal mine, floor ~25 | harvest crystal nodes by proximity or click. Nodes **regrow** on a timer; nodes are per-player, so you don't steal others' | crystal board (yield, regrow, range for 100K, "multiplies all gold"), Upgrade Tree 2 (200K for the first node), trail merchant (Storm 15K), **prize wheel 100K per spin**, potion merchant (150K), perma upgrades, **Prism Refractor input** |
| **Wood** | Lumber yard, floor ~60–75 | chop trees (about **20 s regrow**); yield 10 → 15 → 245 → 20K per tree with upgrades and range | Galactic/second tree nodes (100K wood), perma upgrades, **Rebirth 5 (50K wood + 19Sx gold)**, final trail (5M wood) |
| **Essence** | Essence field, floor ~100 | glowing **essence orbs spawn** in a field; walk through or within range to collect. Upgrades: per orb, spawn rate, range. An upgrade-tree capstone **auto-collects** | upgrade trees 3–4 (up to millions), essence glyph room (100K per roll), **Rebirth 6 (~400K)**, **Rebirth 7 (750K)**, later **floors cost essence** (1.5B per floor) |
| **Star Metal** | **Starforge**, after R7 | **deposit iron ingots** into the Starforge, which converts them over time. Upgrades: star-metal multiplier, capacity | star-metal trail merchant, **Rebirth 8 (5,000 star metal)** |
| **Prisms** | **Prism Refractor** (costs ~2.4B, saved as essence), after R8 | feed **crystals** in; outputs prisms every **3 s** cycle. Upgrades: amount per cycle, cycle time | **Rebirth 9 (25,000 prisms)**, a 1M-prism upgrade, the Gateway |
| **Embers** | **Dragon Roost**, first room after R9 | stand in the roost to gain embers; upgrades boost ember production | **hatching dragons** (each dragon raises ember output; the final dragon reached about 4.5M/s), **floors now cost embers**, "Dragon Slayer" **crucible** (storage cap upgrade) |
| **Pearls** | **Tower 2** (UPD6) | **feed gold into Pearl Beds**, which output pearls (auto-collected) | Tower 2 stairs |
| **Luck** (stat) | — | glyph buffs, upgrade tree, trails, totems, passes | glyph rarity |
| **Potions** | Merchant, floor ~16 | bought for gold (later for crystals), or from the prize wheel and codes | timed x1.5–x2 boosts (10–20 min): gold, iron, ... |
| **Trails** | ground floor + merchants | bought with gold, silver, iron, crystals, wood, essence or star metal; specials via group/like or the prize wheel | permanent multipliers: Brick 1.1x, Magma 1.5x gold, Gilded 1.75x gold (75 iron), Aurora (500 iron), Crown, Storm (15K crystals), Celestial, Divinity, Rainbow, a final colour-shifting trail (24M essence + 5M wood). **"Collect trail" for owning every shop trail: 3x gold, 3x silver, 2x luck, 2x iron.** Trails persist through rebirth. |
| **Totems** | shrine room, after R6 | bought | per-resource boosts for Gold, Silver, Iron, Luck, Crystal, Wood, Essence, Star Metal, Prisms; a "2x all totems" upgrade |

## Upgrade structure (cost scaling, effect formulas, softcaps)

- **Boards per room**, each with a **fixed max level** and a "MAX" label. Players ask to "max this out" constantly, so boards are short finite tracks, not infinite. Boards:
  - Ground (gold amount, gold speed, walk speed)
  - Mine (silver/ore, mine speed, gold multi, ore density, iron per ore, iron chance, skip reset)
  - Glyph board (glyphs per roll, roll speed, rarer pools, luck)
  - Smeltery (deposit bin capacity starting about 40 ore, belt speed, **bulk smelt**, more ingots, silver multi, deposit from anywhere for 30M gold)
  - Crystal (yield, regrow, range)
  - Lumber (yield, regrow, range)
  - Essence (per orb, spawn, range)
  - Starforge (multiplier, capacity)
  - Refractor (amount, time)
  - Dragons (ember production, crucible size)
- **Upgrade Tree rooms** (physical "skill tree" hallways with nodes):
  - Tree 1 (silver, then iron) **extends when you reach floor milestones** (floors 10, 15, 25, 30, 50).
  - Tree 2 costs crystals.
  - The "Galactic" tree (silver, wood, essence) has star-connection visuals.
  - Tree 4 costs millions of essence.
  - Nodes include gold, silver, luck and walkspeed multis, crystal x2, bulk smelt, more ingots, glyph bulk and "multiplies all gold".
- **Perma Upgrade rooms 1–9+:** buy with gold plus a secondary resource. They make **specific boards or tree sections survive rebirth**, e.g.:
  - "Section 1 of upgrade tree won't reset" (110B gold + 75K iron).
  - "Upgrade board 1 won't reset".
  - "Lava glyphs and glyph board won't reset" (~150K iron).
  - "Save water glyphs".
  - "Section 2 ..." (13T gold + 500K iron).
  - "Board 3" (2.5M iron).
  - Later rooms cost crystals, wood or essence.
- **Stair cost escalation** (floor numbers approximate):

| Point | Stair cost |
|---|---|
| floor 1 | 13–16 gold |
| floor 3 | 2.5K |
| floor 4–8 | 300K |
| floor 10–16 | 68M |
| floor 11 (post-R1 run) | 1.4B |
| floor ~28–35 | 260–334B |
| floor ~40s | quadrillions |
| floor ~50 | ~265 quintillion (Qn) gold in hand |
| floor ~90 | 710T gold per glyph room |
| floor ~140 | 600 duodecillion |
| floor ~150 | floors start costing **essence** (1.5B per floor), later **embers**, then **pearls** in Tower 2 |

  Growth is roughly x1.1–1.5 per stair early (inferred from 13 → 14 → 16, then 2.5K by floor 3), with steep step-ups at section boundaries. Switching the stair currency at late floors acts as a **hard softcap**: the gold economy can't brute-force late floors.
- **Multiplier magnitudes seen:** glyph gold multi 20x (water) → 626x (wind) → 41,000x (crimson) → **9–10 million x** after R4. Glyph luck 21x → 520 → 1,700 → 60,000 → **~1M**. Silver multi 1.22x → 5x → hundreds.
- **Softcaps:** finite board maxes; per-glyph **count caps** (e.g. "200/200" then MAX); rebirth-required doors; and currency switches for floors.

## Reset / prestige layers (in order)

**Rebirth** is the only layer in Tower 1. It is placed **physically in the tower as rooms**, and later floors show "Unlock room – Rebirth N required", so you must rebirth to continue. Each rebirth multiplies income and saves more floors and systems. After the last rebirth comes the **Gateway**, a meta-reset into **Tower 2**.

| # | Where / requirement | Reward | Kept after it |
|---|---|---|---|
| R1 | floor 16 room; **1B gold** | **x40 gold, x3 silver, x3 iron** | no floors yet; lava glyphs and glyph board kept (perma); trails always kept |
| R2 | floor ~40, after crystal mine and trail merchant | **x80 gold** | section 1, **floors 1–20** |
| R3 | "Rebirth 3 required" to pass | x80 gold, x3 silver, **x10 iron**; adds crystal yield | **floors 1–40** |
| R4 | after lumber yard | big multipliers | **sections 1–3, floors 1–60** (players restart around floor 60–78) |
| R5 | **50,000 wood + 19Sx gold** | — | then floor 100 and its "doors" |
| R6 | essence (~400K was enough) | — | later rebirths save **floors 1–100** |
| R7 | **750K essence** | — | unlocks Starforge region |
| R8 | **5,000 star metal** | — | unlocks Prism Refractor |
| R9 | **25,000 prisms** | — | unlocks Dragon Roost |
| R10 | after dragons and Perma room | — | reach the Gateway |
| **Gateway** | **contribute a large amount of *every* currency** (prisms last, about 4M) | opens a portal | **Tower 2** (Pearl Beds; stairs cost Pearls) |

**Within a rebirth:** a **per-room glyph progress reset** also happens. Perma upgrades decide which glyph rooms keep their counts.

## Rune/Glyph RNG systems (rarities, odds, luck, roll speed, collection)

- **Glyph rooms** sit along the staircase (one per biome tier). Unlock costs rise: Lava 100 gold (floor 1), Water 3.6M (or about 160K with passes), Poison ~310M ... Sakura **710T gold** ... the essence room costs **100K essence per roll**.
- **Room order seen:** Lava → Water → Poison → Wind → Electric → Crimson → Earth → Sakura → Radiant → Void → Flicker/late → Inferno.
- **Standing inside auto-rolls.** Each roll costs currency. Each room has **10 glyphs** with fixed odds; the HUD panel lists them as "Name 1/N", plus a "Buffs" panel showing the resulting multipliers.
- **Lava pool** (read off a video frame, base odds): Cinder 1/1 · Ember 1/50 · Ash 1/100–1/500 (blurry) · Scorch 1/1,500 · Basalt 1/5,000 · Magma 1/10K · Molten 1/50K · Pyre 1/100K · Inferno 1/500K · Volcan(o) 1/1M. With early luck, Ember showed 1/45 → 1/41.
- **Water pool:** Dew, Drip, Moist, Frost, Tide, Surge, Abyss, Geyser, Vortex, **Tsunami 1/2M**.
- **Other names seen:** Poison (Venom, Miasma, Plague), Wind (Typhoon), Electric (Spark), Crimson (Ruby, Rose, Cardinal, Blood Moon), Earth (Pebble, Emerald), late (Constellation, Imperion, Eternal Bloom, Kit).
- **Buffs:** each glyph adds a multiplier to one or more of Gold, Silver, Iron, **Luck**, Crystal, Wood, Essence or Prisms. **Each glyph has a max count** (e.g. 200; "x/200 collected"); then the glyph is MAX and stops adding. The room shows "MAX" next to its name once every glyph is capped. This **collection-completion cap** is the core softcap and the "index" goal.
- **Luck feedback loop:** some glyphs give Luck, which makes rarer glyphs (which give bigger Luck) appear sooner. One RussoPlays video went from **Luck 270 to 60,000 after one rare roll**. Players climb to the highest room and roll for luck, then go back down to clear lower rooms in seconds.
- **Roll speed and bulk:** glyphs per roll went 1 → 3 → 6 → 9 → 14 → 24; passes add **+5 glyph bulk**. Roll interval upgrades and **"rarer pools"** upgrades (inferred: removes the bottom entries of the pool). A **2x glyph luck** pass exists.
- **Prize wheel:** 100K crystals per spin. Rewards seen: 2x gold for 10 min, 2x iron for 10 min, exotic trails.
- **RNG within RNG:** glyph odds × luck, and a wheel on top.

## Production chains (mine → smelt → forge; wood; crystals; dragons) and the vertical climb

```
GOLD (passive tick) ──► stairs ──► floors ──► rooms (each = a new income source)
   ▲  multipliers from every chain below
MINE (pickaxe/auto-mine; vein resets ~40 s)
   ├─► Silver ─► mine board, gold multi, tree §1, trails
   └─► Iron ore (after floor 10) ─► Deposit bin (cap ~40→…) ─► conveyor belt (speed) ─► smelter ─► hammer
                                    ─► IRON INGOTS (bulk smelt, more ingots, remote/auto deposit)
                                          ├─► upgrade tree, perma rooms, silver multi
                                          └─► STARFORGE (deposit ingots) ─► STAR METAL ─► trails, Rebirth 8
CRYSTAL MINE (nodes regrow) ─► CRYSTALS ─► tree 2, wheel, merchants, perma
                                     └─► PRISM REFRACTOR (3 s cycles) ─► PRISMS ─► Rebirth 9, Gateway
LUMBER YARD (trees regrow 20 s) ─► WOOD ─► galactic tree, perma, Rebirth 5, top trail
ESSENCE FIELD (orb spawns, range) ─► ESSENCE ─► trees 3–4, essence glyphs, floors, Rebirth 6–7
DRAGON ROOST (stand) ─► EMBERS ─► hatch DRAGONS (↑ember rate) ─► crucible storage ─► ember-priced floors
GATEWAY (sink ALL currencies) ─► TOWER 2 ─► PEARL BEDS (feed gold) ─► PEARLS ─► Tower 2 stairs
```

**How the climb structures progression:**
- **The tower is the tech tree.** Every room sits on the spiral at a specific floor, so the next income source is always physically visible above you.
- Floor milestones also **extend existing upgrade trees** (floors 10, 15, 25, 30, 50).
- **Rebirth rooms are physical doors** in the climb ("Rebirth N required").
- **Biome bands** change the mood every 20–40 floors: warm brick dungeon with lava glow → library section → **"galaxy stage"** (floor ~92) → nebula → top ("Starfire" on the teleport list).
- The teleport menu lists every room. Other players climbing above you act as visible goals.
- **Late floors swap the stair currency** (gold → essence → embers → pearls), so new chains become mandatory instead of optional.

## Automation unlocks

- **Auto Run:** auto-climbs and auto-buys stairs. It is **unlocked by joining the developer's Roblox group**, which is a social gate.
- **Auto-mine:** a toggle on the left of the HUD (mines where you stand). The 280 R$ **"Auto Mine Anywhere"** pass mines regardless of location. The developer had to explain in a YouTube comment that the free toggle exists.
- **Deposit iron from anywhere** (30M gold) gives an auto-deposit to the smeltery, and the smeltery processes on its own (belt, bulk smelt).
- **Glyph rooms auto-roll** while you stand in them. Starforge, Refractor and Pearl Beds process over time. A tree capstone auto-collects essence. Dragons multiply ember output.
- **Retention automation:** Perma Upgrades preserve boards, tree sections and glyph rooms; rebirths **save floors** (1–20 → 1–40 → 1–60 → 1–100), so each rebirth skips more of the climb.
- **Demand signal:** third-party script hubs advertise Auto Climb, Stairs, Doors, Rebirth, Glyphs, Mine, Smelt, Starforge, Gather Crystals/Wood/Essence, Upgrade, Tree, Shop Potions/Trails/Totems and Claim Rewards, plus ore/crystal/tree/essence-orb ESP. Players want *every* manual chore automated eventually.

## Offline / idle progress behaviour

- No offline progress is documented (inferred: Roblox session-only).
- Idle play means **standing in a glyph room** ("I can just AFK here"), auto-mining and letting the smeltery, refractor and dragons run.
- Manual "regrow" resources (crystals, wood, essence) are **active-play** loops and the main friction point.

## Number scale reached and notation used

- Tower 1 gold reaches **quadrillions by floor ~40, quintillions to septillions by floor ~90–100, and ~600 duodecillion (6e41) near floor 140**.
- Secondary currencies stay in the millions to billions (essence 24M, wood 5M, prisms 4M, embers 250M).
- Multipliers reach about 1e7 (gold) and 1e6 (luck).
- Notation: Roblox short suffixes (K, M, B, T, Qd, Qn, Sx, Sp, Oc, No, De, UDe, DDe ...).
- **Probably plain doubles** (inferred). The scale is modest compared with Ascender; the depth is in breadth of systems, not exponent size.

## Pacing (rough time to each layer)

| Milestone | Time | Source |
|---|---|---|
| First room (lava glyphs) | < 1 min | all videos |
| Mine | ~2–3 min | — |
| Smeltery (floor 10) | ~8–15 min | — |
| **Rebirth 1** (floor 16, 1B gold) | ~15–30 min of real play (inferred; videos are edited: Form ~9 min with VIP, Bax ~11 min, Russo ~14 min) | — |
| Floor 60 / Rebirth 3 | ~1–2 h | Form, with all passes |
| Floor 100 | "~10 h of recording" (Russo, with VIP, many detours); AstravoBlox F2P faster | — |
| **Tower 1 complete (160 floors, R10, Gateway)** | **~4 h** (Bax, early version), **"beat the game in 6 h"** (commenter), "a few hours, fully F2P" (AstravoBlox) | — |
| Tower 2 | UPD6 (2026-10-08), RussoPlays "I made it to Tower 2" | — |

The game is **content-gated, not number-gated**: a ~4–6 h first tower, then updates every ~5 days add the next band.

## UI / visual style

(From video frames.)

- **Font:** a **pixel/retro bitmap font** for HUD and panels ("Floor 4", "Lava Glyphs", "Buffs"), white with a black outline.
- **Panels:** dark brown/black translucent rectangles with **gold/orange headers**. Rarity rows are coloured (red/orange shades in Lava).
- **Top centre:** **"Floor N"** with a thin **progress bar** and a cyan **"Auto Run: Off/On"** button; the player name tag floats below.
- **Bottom centre:** a hotbar of **6 square icon buttons** (red shop, brown chest/inventory, blue glyph index, camera/teleport, gear settings, coloured rebirth/stats).
- **Bottom left:** stacked **currency pills** (silver coin, gold coin), with a "+N" popup for the latest income.
- **Right side:** a small **leaderboard list**; potion/totem buff icons bottom right.
- **3D world:**
  - Hollow tower interior in **warm brick with orange lava light**, red banners with shield crests, blue banners, wall torches.
  - **Glowing neon wall signage** naming each room ("Upgrade Tree", "Lava").
  - The **spiral of individually placed stairs** (each purchase spawns a stair with a sound).
  - Visible **machines**: conveyor, smelter, hammer, Starforge, refractor.
  - Regrowing crystal and tree nodes; an essence field with floating orbs; a dragon roost.
- **Late biomes:** **"galaxy stage"** with a space skybox and a **constellation-style skill tree with star connections**, then nebula.
- **Trails are the main VFX flex:** rainbow/sparkle, colour-shifting top trail.
- **Teleport menu** lists every room up to the top. **Red badges/exclamation marks** mark sections with unfinished upgrades, and a "Sections" toggle filters menus. A **Stats panel** shows speed, gold/s and luck multi.

## Leaderboards / social features

- **Per-area leaderboards** ("just this part [the mine] has its own leaderboard"), plus a global list in the HUD.
- **8-player servers.** You see others' stairs and climbs ("there are people right up there"), which works as social proof of how high the tower goes. Crystal nodes are per-player, so there is no griefing.
- **Group-join unlocks Auto Run.** A free "like/group" trail exists (the game can't verify the like, so it's free).
- Codes come via the Discord and Roblox group.

**Monetisation:**
- Starter Pack (2x gold, 2x silver; ~40 R$).
- **"Everything is 40 Robux"** for the 2x passes: 2x gold, 2x silver, 2x glyph luck, +5 glyph bulk, 2x mining speed (~160 R$ quoted), Auto Mine Anywhere (280 R$), 2x iron, 2x crystals, 2x wood, 2x essence, 2x star metal, 2x prisms.
- **VIP bundle** = all current *and future* passes.
- No gamepasses appear in the public API list; they are sold in-game.

## What players praise and complain about

**Praise**
- Many called it "the best incremental game on Roblox" (RussoPlays, 2.85M subs).
- 89.6% rating and 9K CCU five weeks in.
- **Constant novelty:** a new system every few floors; "there's so much stuff here".
- The **visible tower** as a goal and progress bar.
- The **stair-placing sound**; good-looking biomes ("props to the dev ... suffer with style").
- Glyph "RNG within RNG"; AFK-friendly glyph rooms.
- **Perma upgrades make rebirths fast**; completable F2P.
- An engaged developer.

**Complaints**
- **Crystals are "pure torture"**; wood and essence grinds are long. The regrow-timer resources are the most-hated part.
- **Rebirth gates** you can't skip ("Rebirth 2 required"), and redoing silver and smelting after each rebirth is "annoying".
- Glyph bad luck streaks.
- Stair prices balloon.
- Tower 1 is **short (4–6 h)** with an anticlimactic top. Bax reached the top and "you still can't escape".
- Monetisation pressure (many passes; the auto-mine pass is misunderstood).
- Bugs needing a rejoin.
- Gamepasses trivialise rooms (a glyph room maxed "in 10 seconds" with VIP).
- Widespread script use.

## Steal-worthy ideas (for a space-fantasy web incremental)

1. **The Orbit Ladder / Space Elevator.**
   - The main currency buys **rungs one at a time**; every N rungs is a **Deck** that hosts a new income source.
   - The whole ladder is drawn as a vertical scroll from planet surface to deep space; locked decks are visible but greyed.
   - Biome bands: atmosphere → orbit → asteroid belt → nebula → "Starforge Crown".
   - **Floor milestones extend old skill trees.**
2. **Mine → Smelt → Forge as a visible conveyor:**
   - **Asteroid Rig** (ore veins respawn on a timer) → **Ore Hopper** (capacity) → **Mag-Belt** (speed) → **Stellar Furnace** (bulk smelt) → **Ingots** → **Starforge** (ingots to Star-Metal over time).
   - Capacity, belt speed and bulk are the three knobs. Show the ingots physically moving (a cheap, satisfying web animation).
3. **Parallel regrow lanes, without the tedium:**
   - Crystals → **Comet Ice**; Wood → **Void-Kelp/Starwood**; Essence orbs → **Aether Wisps**.
   - Use click-to-harvest early, then *buyable* range, auto-harvest and drones, so the hated chore becomes an automation goal.
4. **Converter machines with cycles:** Prism Refractor (crystals → prisms every 3 s) becomes **"Lens of Refraction"**. Upgrades: output per cycle, cycle time.
5. **Dragon Roost → Star-Wyrm Hatchery:** stand/dock to generate **Embers → hatch Star-Wyrms**, each raising ember rate. Floors beyond use Embers. This adds a pet-collection flavour without gacha.
6. **Glyph rooms = Constellation Shrines:**
   - Each deck has a 10-entry pool (1/1 → 1/1M) that **auto-rolls while docked** and costs currency per roll.
   - Every entry has a **count cap (e.g. 200)** with a visible "MAX" (a finite collection goal and natural softcap).
   - Some entries give **Luck**, enabling the runaway "one lucky roll changes everything" moment.
   - Higher shrines make lower ones trivial (nice backfill).
7. **Rebirths as physical doors on the ladder** ("Ascent N required").
   - Each **saves rungs 1–20/40/60/100** and **Perma Upgrade decks** let you choose which boards or shrines survive.
   - This makes each reset feel like a shortcut, not a loss.
   - Show a preview: "x40 Stardust, x3 Ore; keeps: ...".
8. **Currency-switch softcap:** after a band, rungs stop costing the base currency and cost a chain product (Essence, then Embers, then Pearls). This forces engagement with new chains and caps brute-forcing.
9. **Gateway meta-reset:**
   - A portal that consumes a quota of **every** currency, then opens **Tower 2 (a second ladder, e.g. "the Abyssal Spire")**.
   - Its new base currency is produced by feeding the old one ("Pearl Beds" become "Singularity Pools": feed Stardust, get Dark Pearls).
10. **Trails → Ship wakes/engine trails** that stack multipliers. Add a **"Collector" bonus for owning every trail in a shop** (3x/3x/2x/2x). Totems become **Shrine Relics**, one per resource, plus a "x2 all relics" upgrade.

**Cross-game combos**
- Combine Tower's **visible vertical climb + room-per-income** with Ascender's **converter-boosts-source math, super-exponential tier costs, and hidden-result RNG tables**.
- Keep Ascender's **break_eternity-scale numbers** for late game, but adopt Tower's **content-gated pacing** (new system every 5–15 min early) and **automation-as-reward** for every manual chore.

## Sources

**Ascender Incremental**
- https://www.roblox.com/games/17236692255/Ascender-Incremental (game page)
- https://apis.roblox.com/universes/v1/places/17236692255/universe ; https://games.roblox.com/v1/games?universeIds=5897843522,10765067592 ; https://games.roblox.com/v1/games/votes?universeIds=5897843522,10765067592 ; https://badges.roblox.com/v1/universes/5897843522/badges (live stats, votes, badges)
- https://www.rolimons.com/game/17236692255 (peak CCU 11,072 on 2025-02-24)
- https://trello.com/b/lzyE4eCL (official Ascender Incremental Trello; read in full via its public JSON export)
- https://docs.google.com/spreadsheets/d/1FWuPcp1QvIn-TAJkD1nRPtZnVwotBHcqR17xOR8SkHg/htmlview (community master guide; tabs Codes, Chests, RTokens, Tier Guide, Rune Order, Late Game Guide, Roblox Numbers, Secret Stats, Hidden Talents, Credits exported as CSV)
- https://truthuntold.github.io/ai-rune-calc/ (community rune calculator; JS source read for the RPS and time formulas)
- https://www.sportskeeda.com/roblox-news/ascender-incremental-a-beginner-s-guide
- https://ascender-incremental-roblox-offical.fandom.com/wiki/Tier_statistics and /wiki/Basic_Rune (now deleted; only search-engine snippets seen, cross-checked with Trello)
- YouTube transcripts and descriptions: https://www.youtube.com/watch?v=0qVZXHGcW1g (Superior, "Ultimate Pro Guide"), https://www.youtube.com/watch?v=srfBMXe7HqE (Superior, "Noob to Pro Ep 1"), https://www.youtube.com/watch?v=fDtPH1fos_I (SMG Infinity, "24 hours F2P"), https://www.youtube.com/watch?v=qg8AXpXzccE (Velvetliner, "Is THE Grind"), https://www.youtube.com/watch?v=DizxRBeZTDc (Velvetliner, "Saying Goodbye"); YouTube search results for "ascender incremental" roblox

**EternityNum / break_eternity**
- https://devforum.roblox.com/t/how-to-use-eternitynum/2853584
- https://devforum.roblox.com/t/how-does-eternitynum-work/1874317
- https://devforum.roblox.com/t/eternitynum-leaderboards/3932047
- https://devforum.roblox.com/t/gammanum-up-to-100x-faster-than-eternitynum/3906397
- https://github.com/Patashu/break_eternity.js/ (README)
- Search snippet of a Scribd copy of the EternityNum source header (https://www.scribd.com/document/870287412/message-7; the page body itself was truncated)

**Tower Incremental**
- https://www.roblox.com/games/75766778174856/Tower-Incremental (game page) and the Roblox API endpoints above (universe 10765067592)
- https://robloxden.com/game-codes/tower-incremental ; https://tryhardguides.com/tower-incremental-codes/ ; https://urgametips.com/tower-incremental-codes/ ; https://gamerant.com/tower-incremental-codes-roblox/ ; https://gachapocket.com/tower-incremental-codes/
- https://towerincrementalgame.wiki/ plus /guides/getting-started/, /guides/glyphs-guide/, /guides/mining-and-smelting/, /guides/rebirth-guide/, /updates/upd4-notes/ (fan site; confirmed to have no numeric data)
- https://newgame.co.jp/metaverse/en/roblox/75766778174856/tower-incremental/ (early stats and original description)
- https://deltascriptroblox.com/script/tower-incremental-script-barrage-hub-auto-climb-auto-mine-auto-upgrade/ (feature names only, used as an automation-demand signal)
- YouTube transcripts, descriptions and comments: https://www.youtube.com/watch?v=raPCFkSP6Ew (Bax, full Tower 1 run, ~41 min; plus two video frames and a developer comment), https://www.youtube.com/watch?v=14ovj_3pYBY (RussoPlays ep 1), https://www.youtube.com/watch?v=PDtcRXNVcyU (RussoPlays, floor 100), https://www.youtube.com/watch?v=N_gFyB9FYkc (Form Roblox, all gamepasses), https://www.youtube.com/watch?v=LkngL9Y4W0c (AstravoBlox, finishing Tower 1 through to Tower 2), https://www.youtube.com/watch?v=4wphyEz07w4 (Dats, "all 160 floors"; description only), https://www.youtube.com/watch?v=oav1YgsuzGY (8bitgamer tips), https://www.youtube.com/watch?v=JPDKRk28kgw (RussoPlays, Tower 2; title and description only); YouTube search results for "tower incremental" roblox
