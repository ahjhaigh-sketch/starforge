# Everything Upgrade Tree (EUT)

> Research date 2026-10-10. Primary source: the community MediaWiki at eutwiki.com (protected pages, v0.6.1 era, edited Feb–Jul 2026). The Fandom wiki returned HTTP 402 and Reddit was blocked, so player-sentiment notes come from ratings, changelogs, the wiki FAQ and badge counts. Formulas are written as the wiki gives them, typos included. Anything marked **(inferred)** is my reading or my own simulation, not a sourced fact.

**Meta.** Developer: Omegauspicious Games (Roblox group 33959123). Original creator 39821PASA ("ASAP"); the current owner is unby6. Released 2 Nov 2024 (v0.1.0α). Current version v0.6.1β (9 Feb 2026); "v1.0.0 The Gardening Update" is listed with no date. Stats: 42.7M visits, 146.6k favourites, 87.5% like ratio (50,920 up / 7,262 down), all-time peak 8,718 CCU on 31 Aug 2025, about 300–400 CCU now, 48 players per server. Average session is 15.5 min (Rolimons) or 18.2 min (Rotrends). Monetisation is 2 gamepasses and 23 dev products. The wiki counts 17 baseplates, 230+ upgrades, 5 leveling systems, 12 main currencies and 3 bonus currencies. Inspired by *Not JJT Upgrade Tree* and *Difficulty Upgrade Tree*. Autoclickers are allowed; macros and alts get an unappealable ban.

## Core loop (what you click/collect, first 5 minutes)
- The game is a 3D Roblox world. Each progression layer is a physical **baseplate** (a floating platform) holding an upgrade tree, plus buildings for the side systems. You walk your avatar between the plates and click upgrade objects. Walkspeed and jump-power upgrades are recurring rewards: 20+ nodes give "+N walkspeed". Upgrades are physical objects: in the *Get Funky* challenge "Point Upgrades move quickly around the baseplate". The exact node rendering (lines or beams between parts) is **(inferred)**.
- Upgrade **#1 "Generic beginning"** is free and gives +1 ₽/s. You spend ₽ on the Points tree, then reset ₽ into λ at the Research Center. Each later reset unlocks a new baseplate with its own currency and tree. Side systems (Mining, Cards, Astronomy, Periodic Table, Black Hole) produce multipliers back into almost every currency.
- **First 5 minutes (inferred, my greedy sim from wiki costs with no manual clicking):**
  - 5 s: #2 (5₽, ×2)
  - 11 s: #3 (12₽, ×3)
  - 15–25 s: #4 ×3 levels (25/40/55₽, +0.5× each)
  - 31 s: #5 (100₽, ₽ × ₽^0.21)
  - 34 s: #9 Boombox (100₽)
  - 46 s: #6 (500₽, ×1.2 compounding per upgrade owned)
  - 52 s: #7 (1k₽, +7 cap on #4)
  - about 85 s: 10k₽, the requirement for #8, which unlocks the Research Center
  - about 95 s: 20k₽, the minimum for the first Research
  - about 3 min: #10 (125k₽, ×4)
  - about 5 min: 1M₽ for #12, whose first purchase unlocks the Prestige Baseplate
  - Rate is about 190/s at 1 min and about 11k/s at 5 min, before any research.
- The Boombox music player sits behind spawn. Unlocking it within the first minute is a deliberate early "nice thing".

## Currencies / resources and how each is produced
| Sym | Name | Production / formula (as written) | Spent on |
|---|---|---|---|
| ₽ | Points | +1/s base (#1) × multipliers | Points tree (#1–#40), Basements, Hardcore |
| λ | Research Points | Research reset: (₽/20k)^0.75, min 20k₽. Passive: 1%/s of gain (#6p), +1%/s per lvl up to 100% (#18a/#19a) | Research Center |
| ₹ | Prestige Points | (₽/10Qd)^0.16+prestiges, min 10Qd (1e16)₽. Passive 0.1%/s per lvl via #5qa-4 | Prestige tree |
| ฿ | Bits | Passive (points_gain^0.01)/s after #1a. Exponent +0.0025 twice; #2bg squares the ₽ input | Automation tree |
| ₽X | Point-X | Convert ALL ₽ → +₽^0.04 (#1x, with cooldown). Resets on any λ/₹/τ reset | #x tree, Offline tree |
| XP | Experience | Clicking the Leveling Center button; autoclicker transformer at 3→6→18 clicks/s | Level milestones |
| AXP | Abyssal XP | Convert all XP → floor(XP^0.2) (#1xb) | Abyssal level milestones |
| ☉ | Solar Mass | Black Hole passive: (₽^0.01)·(λ^0.01)·0.01. Resets on ₽X or AXP conversion | #bh tree, Point-X Basement |
| τ | Transcend Points | (₹/1B)^0.12+transcends, min 1B₹. Passive τ windows after Sacrifice | Transcend tree, card packs, Synchronizer |
| EXP | Everything Levels | Passive: total τ^0.3 per s (exponent **(inferred)** from garbled render) | EXP milestones |
| Λ | Ions | Periodic Table: +1/s base after Hydrogen | Periodic Table elements |
| Ψ | Qubits | Convert ฿ → (฿/1B)^0.5, min 1B฿. #30t later generates 1000 Ψ/s | Qubits automation tree |
| € | Euros | Selling ores (Stone 0.01€ … Cosmic Steel 6000€) | Mining dummies, mastery boosts |
| ores, Fragments, MXP, mastery XP, depth (m) | Mining resources | Mining ores with a pickaxe or dummies; depth 3.33 m/s base | #mr upgrades, forge, enchanting |
| γ | Gamma | Passive in Astronomy, × constellation bonus | Stars, Star Modifier/Booster |
| Φ | Star Dust | +1 per Star Score level | Star Tree |
| ¤ | Ultimate Currency | 1/s after #9h (1e255₽) | Everything Board (21 ×500-level boosts) |
| α β 🥭 🚩 ◐ $ G | Bonus currencies | Isolated "Bonus progression". Never boosts main currencies | Bonus, Beta, Lingo, ATM, Donation plates |

## Upgrade tree structure (unlocks, cost scaling, effect formulas, caps)
- **IDs encode the layer.** `#N` points, named Research nodes, `#Np` prestige, `#Na`/`#Nbg` automation/bits, `#Nx`/`#Nbh` point-X/black hole, `#Nt` transcend, `#Nm`/`#Nmr` mining one-shot/repeatable, `#Nqa-k` qubit branches, `#Nxt` offline, `#Nh` hardcore, `#Nas`/`#Nst` astronomy/star tree, `#N+` basements, `#Nb` bonus. Many nodes are tagged **[PERMANENT]** (they survive resets).
- **Node archetypes:**
  - **Flat:** ×2, ×3, ×4, ×5.
  - **Additive per level:** #4 gives +0.5× ₽ per level.
  - **Compounding:** #12 gives ×1.3^lvl; #4p gives ×2^lvl λ.
  - **Self-feeding:** #5 is ₽ × ₽^0.21 (Gold version ^0.22, later +0.05 exponent); #14bh is ☉ × ☉^0.025.
  - **Cross-currency:** #11 ₽ × λ^0.18; #24 ₽ × (₹+5)^0.4; #29 ₽ × ฿^0.04; #15bh ×log100(☉).
  - **Post-multiplier exponents:** #25 ^1.05 ₽; #31 ^1.05 λ; #34 ^1.1 ₽X; #22p ^1.5 XP.
  - **Formula improvers:** #18p +^0.01 to the ₽X formula per level; #4bh +0.005 to the ₽ exponent in ☉ gain.
  - **Time-based:** #27 ×(time^0.65/30+1), never reset; #11t ₹ ×(log((t^0.75)/6+1)+1).
  - **Cost cutters:** #13 divides #12's cost growth by 50^lvl; #14p −5% compounding; #4x ÷1.5 compounding.
  - **Cap extenders:** #4's cap goes 3 → +7 (#7) → +30 (#15) → +250 (#30) → +750 (#1h) = 1040.
  - **Unlocks:** new baseplates, buildings and branches. Research "Left Side" and "Right Side" are free and open the two halves of the Points tree.
- **Gold/Diamond tiers (partly inferred).** Research "Materialize" nodes add +1 max level to Points nodes (Materialize: #1; M2: #2,#3; M3: #5,#6; M4: #4,#7,#8; M5: #10 and +5 on #12; M1B: #1 again). The extra level is a "Gold" (then "Diamond") purchase with its own expensive cost and bonus effect. Example: #2 Gold costs 25Qd₽ for ×1.5₽; #1 Gold ×1.5₽ ×1.25λ, Diamond ^1.02 λ.
- **Cost scaling is piecewise and gets steeper per bracket.** Examples:
  - #4: 25+15L (L1–3) → 100L (4–10) → 50M·L (11–40) → 100M·L·1.25^L (41–290) → 1e120·2.5^(L−291) (292–1041)
  - #12: 1M·10^L; beyond cap 20: 3.2e90·1e20^(L−20)
  - Research Point Gain: 0.2(1+L)λ → 100B(1+L)·2^L → 1e95(1+L)·5^L
  - #2p: 0.05(L+1)₹ to L50, then 1De·0.05(L+1)·1.35^(L−50)
  - #14t: floor(30^((1.01^L)(0.1L+1.4))+133)
  - Mining repeatables: base·(1.5–5)^L paid in specific ores
  - #29p: (10^(100·5^L))/2^(seconds this transcension), so the cost halves every second of the run
- **Softcaps/hardcaps.** The wiki lists no named softcaps. Growth is restrained by hard level caps, min-1 floors (max(1, x^k)), small exponents (0.01–0.4) on cross-boosts, and piecewise cost brackets. Challenges and the opt-in #22t (×4 τ, no automation) give extra knobs.
- **Joke/secret nodes.** Research "Hidden" costs 1e10000 α. #-1b is an April Fools fake. "The Upgrade That Does Nothing" has a cap of 100,000,000.

## Reset / prestige layers IN ORDER
| # | Layer | Unlock | Reward formula | Resets | Kept | Notable upgrades / milestones |
|---|---|---|---|---|---|---|
| 1 | **Research** (Research Center building) | #8 (req. 10k₽) | λ = (₽/20k)^0.75, min 20k₽ | All Point upgrades and ₽ | λ and Research nodes, [PERMANENT] nodes | Point Gain 1–6/X/1B; Extender; Darkness 1; Materialize 1–5/1B |
| 2 | **Prestige** (Prestige Baseplate) | Buy #12 once (1M₽) | ₹ = (₽/10Qd)^0.16+prestiges, min 1e16₽ | Everything below except [PERMANENT]; Levels reset on prestige+ | #3p tree expansion, #5p buy-max (free), automation unlocks | #1p Mystic Obelisk (250₹); #6p 1% λ/s (2.5₹); #9p Automation plate (7.5₹); #17p Point-X (500k₹); #12p (25k₹) unlocks Transcend; #29p time-decaying cost |
| 2a | **Point-X conversion** (sub-layer) | #17p 500k₹ | ₽X = +₽^0.04 (all ₽ converted, cooldown); AXP = floor(XP^0.2) | ₽ (and ☉/#bh on conversion) | — | #2x ×2 λ compounding (starts ×15); #3x ×2 ₹; #10x Black Hole; #9x Abyssal Levels; #14x ×0 ₽X & AXP but ×4 ₽/λ/₹/XP |
| 2b | **Qubits conversion** | Helium (30Λ) | Ψ = (฿/1B)^0.5 | ฿ | — | Five automation branches qa-1…qa-5 |
| 3 | **Transcend** | #12p (25k₹, first time) | τ = (₹/1B)^0.12+transcends, min 1B₹ | Everything below except [PERMANENT]; prestige-challenge levels (unless Synchronized) | Permanent unlocks, Synchronizer levels | #1t Periodic Table; #3t Mining (free); #4t Everything Levels (15τ); #12t Cards (1kτ); #13t Synchronizer; #17t Astronomy (5kτ); #19t Fusion (50kτ); #25t Sacrifice (2.5Mτ) |
| 3a | **Mining depth reset** | #12mr (cost: all depth) | ×3 depth gain, permanent | Depth | — | Layers at 100m, 1km, 10km … 1Sx m (11 layers) |
| 4 | **Sacrifice** (one-time) | #25t 2.5Mτ | Flat permanent ×25 ₽, ×20 λ, ×10 ₹, ×5 ฿, ×10 ₽X, ×10 τ, ×3 Ψ, ×3 ore, ×3 mastery XP | All post-Transcend content and all currencies; all challenges except "Other" | Hardcore & Qubits plates, bought cards, Synchronizer, Mining (except mastery levels) | #26t passive τ 0.1%/s for 10 min → 0.25%/15 min → 0.35%/60 min → 0.75%/10 h → 1.25%/s permanent; #29t Star Tree (10Mτ); #40t Static Noise pack |
| 5 | **Hardcore / post-game** | #40 (10Qnqg₹ = 1e140₹) | No reset; ¤ at 1/s from #9h | — | — | #1h (1e130₽) … #9h Everything Board (1e255₽) … **#10h "For the Worthy" (100Ce₽ = 1e305₽)**, the final upgrade and hardest badge |
| B | Bonus layers (isolated) | #18, #13b, #15b … | β via "Generation Beta" (resets α); Gold = ($/1k)^0.95 | α, $ trees | — | Never feed main currencies |

The wiki's "progression baseplate" order is Points → Prestige → Automation → Point-X → Transcend → Mining → Qubits → Offline → Hardcore → Astronomy → Sacrifice.

**Milestone tables (examples):**
- **Level milestones (Leveling Center):**
  - L1: ₽ ×(1+0.1L), later 0.175L
  - L5: ₽ ×1.1^(L−4)
  - L10: λ ×(1+0.1(L−9))
  - L15: ₹
  - L20: ฿
  - L30: ₽ ×1.15^(L−29)
  - L35: ₽X ×1.1^(L−34)
  - L100: Ψ
- **AXP milestones:**
  - 0: XP ×(3+2L)
  - 1: level-XP requirement ÷1.3^ceil(L/2)
  - 5: ☉ ×(1+0.5L)
  - 7: point-upgrade cost ÷(L−5)
  - 15: prestige cost ÷
  - 50: EXP ×
- **EXP milestones:** levels 1–13 each add a compounding boost to one currency, e.g. L1 ×1.25^elvl to XP/AXP/₽; L8 ×1.4^(elvl−7) to Λ; L13 ×2^(elvl−12) to γ.
- **Mining Level milestones (every 5 MXP levels, 5–60):** dmg ×1.5, speed ×1.35, respawn ×1.25, MXP ×2, mastery ×2, ₽ ×3, ore ×1.85, € ×2.25, depth ×2.2, Ψ ×2, τ ×2, Λ ×2.

**Challenges (Mystic Obelisk, unlocked by #1p).** Entering a challenge resets you and applies debuffs. Most goals are "Prestige for 0₹" or "Transcend for 0τ".
- **Point Deduction (15 levels).** Debuff ₽^(0.9−0.1L). Reward ×3 ₽ compounding per level, ×4.5 with #23p. Levels 10–15 need the Mega Deduction star upgrade.
- **Extinction of Science (3).** λ capped, then banned. Reward ×1.5 ₹ per level (×3 with #26p).
- **Double Trouble (3).** ₽ ×0.9/0.75/0.6 and λ ×0.5/0.2/banned. Reward ×2 ₽ and ×2 λ per level.
- **Change of Pace (3)** and **Everything Deduction (3).** Debuffs of the form currency^(0.7–0.9 − 0.1–0.3·L). Rewards ×2/×1.5/×1.2 per level.
- **Fast Transcend.** Transcend within a 5-minute timer, ranked by time:

  | Rank | Time | ₹ multiplier |
  |---|---|---|
  | D | <5:00 | ×1.5 |
  | C | <4:00 | ×2.25 |
  | B | <3:00 | ×3.75 |
  | A | <2:00 | ×5.06 |
  | AA | <1:00 | ×7.59 |
  | S | <30s | ×11.39 |
  | SS | <15s | ×17.09 |
  | Q | <5s | ×25.62 |

  The time hard-caps at 0.2 s.
- **Fusion.** Stack up to 3–4 challenges. The score multiplier per level is ×1.6 (PD, EoS), ×2 (DT) or ×2.5 (CoP, ED). Reward ₽ ×(1+score^0.6), ₹ ×(1+score^0.2), τ ×(1+score^0.1). Speed bonus ×(1+log10[1+100/(t+1)^0.75]). Max score is 403.23k.
- **Hardcore Challenge (3).** Debuffs as low as ₽^0.06 and ☉^0.0125. Reward up to ×8 ₽, ×15.62 λ, ×8 ₹.
- **Get Funky.** Automation off, upgrades fly around the plate, rainbow screen tint, target 1k₹. Reward +1 walkspeed and the Coffee Mug.
- **Real Timed Challenge.** A joke that can't be completed. The record run is 35 days.
- **Synchronizer (#13t).** Buy challenge levels with τ (e.g. PD L9 250kτ, L15 375Bτ) so that Transcend doesn't wipe them.

## Every named side-mechanic and how it feeds multipliers
- **Research Center.** A "machine" building, not a plate: "An upgrade tree, but in a machine!" It is the first reset.
- **Automation Baseplate.** See Automation below.
- **Leveling Center (#16, 100B₽).** Click a button for XP; levels feed the milestones above. Level Transformers are equippable gadgets:
  - Automator: 3 clicks/s → 6/s → 18/s
  - Cube: clickable, XP ×(1+clicks)^0.2
  - Booster: ×1.5
  - Coffee Mug: halves click cooldown
  - Booster-₽: XP ×(₽gain^0.01)
  - Ultimate Level Transformer (#8h)
- **Black Hole and Point-X Basement (☉).**
  - 50 #bh upgrades. The hole **grows and changes colour**: yellow → blue (#7bh) → purple (#12bh) → red (#19bh) → green (#24bh) → pink (#28bh) → black (#32bh) → rainbow (#41bh, ×10 ₽X/AXP). #49bh lets you pick the colour.
  - The pull radius is shown as a red sphere. Touching it kills you, and a death counter sits next to the ☉ display. You can disable this in settings. #10bh gives ×1.5 ☉ but also ×1.5 radius.
  - #17bh "carves a hole" down to the basement.
  - #50bh unlocks the **Prism**: convert up to 80% of ₽ gain and use a colour wheel to share it out as boosts to 8 currencies. Max boosts: ฿ ×2.6, ☉ ×4.81, ₹ ×6.72, XP ×4.05, Ψ ×2.14, τ ×2.52, λ ×2.92, γ ×4.81.
- **Periodic Table (#1t; Λ).** 54 element nodes, H (free) → Xe (750QdΛ).
  - Each element is a cross-system perk. Examples: He unlocks Qubits; Na unlocks Offline; Mg ×1.5 ore; Zn triples automator clicks; Cd ×2 γ and +1 constellation; In ×2 to XP/AXP/EXP/MXP; Xe converts crit chance above 100% into crit damage.
  - Some perks count completed rows: Ag ×1.5 forging per row; #31bh +1× ₹ per row; the Periodic Law card multiplies Λ by your highest row.
- **Everything Levels (#4t; EXP).** Passive, from total τ. Thirteen compounding milestones touch every currency.
- **Mining Baseplate (#3t).** The wiki calls it "99% of progress is done here!" It is the deepest system:
  - **Ores and layers:** 40+ ores in rarity tiers: Common → Uncommon → Unique → Rare → Mythical → "Totally Evil" (Evil Rock, 1/66,666.6) → Relic → Treasured. Each ore has HP and Defense%, and some have "Super Defense" that caps damage at log_x(dmg). There are 11 depth layers (Shallow 0 m → Dimensional Rift 1Sx m; Abundant Cave at 10Sp m) with respawn times of 1.5–10 s.
  - **Mastery:** every ore has its own mastery track with cost base 2–6^lvl. Milestones boost ₽, ₹, τ, Λ, γ, card slots (Bloodstone +2, Tetratyx +1), Fusion slots and so on.
  - **Status effects:** 🔥 Fire (1/5 dmg every 0.25 s), 🤢 Poison (1/3 dmg/s, melts defense), 🧊 Frozen, ⭐ Enchanted (×2.5 ores, ×2 fragments).
  - **Enchanting Table:** costs Fragments. Nine enchants with Roman-numeral caps (Power C, Haste XL…) and 9 random "specials" (Strengthened 29.4% … LEGENDARY 0.44%).
  - **Forge:** 5 s smelts up to a 500,000 s (5.78-day) Cosmic Steel craft. Pickaxes go Pickaxe (1 dmg/1 s) → Starglass (7.5 dmg/0.6 s, 3.48 days to forge).
  - **Hiring Center:** auto-mining "dummies" bought with €: Eren, Miner Noob, Fire/Poison/Ice Wizards, Drill, Enchanter, Developer ASAP.
  - **Other:** Ore Selling (€); 21 repeatable #mr upgrades paid in specific ores; Mining Levels.
  - It feeds ₽/₹/τ/Λ/Ψ/γ/€ through masteries and milestones.
- **Cards (#12t, 1kτ).**
  - **Packs:** bought with τ, at prices that rise each buy. Each buy gives a random card from the **highest rarity not yet completed**, with no duplicates. You must finish a rarity before the next unlocks.
  - **Pack list:** Static, Static+, Foodaholic, Developer, Creative, "Seven" Sins, Otherworldly.
  - **Deck:** about 6–7 slots.
  - **Effects:** mostly ×N to one currency (Points ×3₽, Research ×3λ, Golden Ratio ×1.62₹, Euler's Formula ×2.72☉), plus rule-benders:
    - Bad Apple copies the card to its left and disables the card to its right.
    - Nightstar Grimoire gives ×2.5 to a random stat every 30 s, or ×3 EXP if placed leftmost.
    - Boundary of Destruction: on reset, a 44% chance of ×4 conversion, otherwise ×0.44.
    - The Sun: ×10 ☉ with a 0.1%/s chance to shatter and wipe your ☉.
    - Gula: every minute it "consumes" your stats to boost them by your ₽.
    - Luxuria: moves 50% of offline gain into online gain.
    - Couch Potato / Acedia: +4 h / +12 h offline cap.
- **Astronomy (#17t; γ).**
  - The Telescope (100kτ) teleports you to **outer space**. The first star is free; later stars cost 20^(lvl^1.1) γ, up to 100.
  - Stars get random **Mass, Temperature, and Distance** from the central star "Sylthaz". **Linking stars into constellations** multiplies γ by total linked distance. More constellations cost 1M·1M^lvl γ.
  - **Star Modifier:** mass/temperature/max-distance genetics.
  - **Star Booster:** ×1.25^L to ₽X/AXP/☉ and ×1.75^L to EXP; cap 25.
  - **Star Score** = floor((log10(10+γ/s)^3)·4^stars). Its milestones boost γ, ₽, star cost and τ, and each Star Score level gives 1 Star Dust Φ.
  - **Star Tree** (10 Φ nodes) includes "GO DEEPER" (a new mining layer) and "MEGA DEDUCTION" (PD levels 10–15).
  - A **Keypad** with 15 secret codes leads to a "your did it" star.
- **Qubits Baseplate.** Mostly automation (below).
- **Offline Baseplate.** See below.
- **Hardcore Baseplate.**
  - #1h–#10h raise caps hugely; for example #1h adds 750 levels to #4 and gives ×1.5 ₽ per 50 levels above 300.
  - **Upgradelings** #7.1–7.4h: ×1.5 ₽/λ, ×1.4 ₹, ×1.25 γ per level.
  - **Everything Board:** 21 ¤ upgrades, each with a 500-level cap, costing base·(1.15–10)^lvl, giving ×1.05–×3 to one currency.
  - #6h costs **1,000,000 Evil Rocks**, the 1/66,666 ore.
- **Bonus / "brainrot" content (isolated, never boosts main currencies).**
  - **α/β trees:** #2b cost is 10^(L^1.009), with an effective cap of about 2.54e16 levels.
  - **Stud tower:** #5b grows a stud tower up to 2048, then a golden stud.
  - **Gravesite:** ×2 α per player grave, max 100.
  - **ATM machines and Chips; a drivable Roblox JEEP.**
  - **Beta Baseplate:** Mango Tree with 11 mango rarities (1/2 → 1/10k "Horsed Mango"); Minesweeper up to 50×50 with its own 🚩 upgrade board; Harry's 4-stage button puzzle; a **Lingo** word game (111 puzzles).
  - **Donation Baseplate:** $ and a "Goldify" reset. It is optional and "does not benefit the main game in any way".
  - **Leaderboard Baseplate:** 13 boards, mostly of *current* holdings.

## Automation unlocks (auto-buyers, auto-resets) and when
- **Prestige layer (first ₹):**
  - #5p "fast and furious" (free): Points upgrades **buy max on click**.
  - #6p (2.5₹): passive 1%/s of λ gain.
  - #9p (7.5₹): unlocks the **Automation Baseplate**.
- **Automation Baseplate (paid in ฿).** Upgrades are written like code:
  - `start_auto()` (free)
  - `automate(1, 5)` 50฿; `automate(6, 8)` 175฿; `r_upg(pg)` 500฿; `automate(9, 15)` 10k฿
  - `ultra = true` buy-max (35k฿); `automate(16, 20)` 100k฿ … `automate(26, 30)` 50M฿
  - `+1p%/s` (λ passive up to 100%; 5M–10M฿)
  - `delay /= 2` (75M฿; doubles the level-click automator)
  - `hold(true)` (500M฿)
- **Qubits Baseplate (Ψ; needs Helium, i.e. post-Transcend).**
  - qa-1: research nodes.
  - qa-2: Points upgrades #31–35 and basements.
  - qa-3: Black Hole colour tiers (5 Ψ → 100TΨ "I Am Legend", which adds the rainbow tier).
  - qa-4: Prestige #1p–#29p, plus "Q. Superpos." +0.1% ₹/s per level up to 11k levels.
  - qa-5: #x upgrades, plus +0.01% ₽X/s per level.
- **Auto-reset/auto-complete:** #2.5t auto-completes prestige challenges when the goal is reached. Sacrifice #26t–#42t generates τ passively (permanent at 1.25%/s).
- **Other automation:**
  - The Mining dummies auto-mine (Eren is unlocked with #1m), and the Mango Autocollector collects mangoes.
  - Offline #7xt keeps automation running offline.
  - The opt-in **#22t "22ne"** disables all automation except ₽ upgrades for ×4 τ.

## Offline / idle progress behaviour
- Offline gains only exist after the **Offline Baseplate**, which is unlocked by Sodium (1.25kΛ, post-Transcend) and paid for in ₽X. Before it there are no offline gains **(inferred)**. Online play is already idle-friendly through passive % generation.
- **Cap and timing:**
  - #1xt (1Qd₽X) unlocks offline with a **2h cap**. "Only discovered stats count."
  - #2xt adds +5 min per level (×6) and #6xt +15 min per level (×5), so the cap tops out at about 3h45m from upgrades alone **(inferred)**.
  - Efficiency "reaches 100% at 2 hours".
  - Cards push the cap further: Couch Potato +4h and Acedia +12h. With Bad Apple copying, the 100% point is at **30h**.
- **Per-currency efficiency:** separate upgrades for ₽, λ, ₹, ฿, ₽X, ☉, Λ, EXP, depth and γ, each up to 100%. "#27 time" caps at 1% and ¤ at 5%.
- **Other offline nodes:** #7xt runs automation offline and #8xt runs forging offline. The Bonus nodes #16b/#18b give α offline at 100% and β at 0.1%.
- **Trade-off card:** Luxuria converts 50% of offline gain into online gain but halves offline gain.

## Number scale reached and notation
- **Notation:** "illion" suffixes in groups of three: k, M, B, T, Qd, Qn, Sx, Sp, Oc, No, De, UDe, DDe, TDe, QdDe … NoDe, Vt (1e63), Tg (1e93), qg (1e123), Qnqg (1e138), Qg (1e153), sg (1e183), Sg (1e213), Og (1e243), Ng (1e273), Ce (1e303), Du (1e603) … Mi (1e3003) … Mc (1e3,000,003). These compose, e.g. "1DTgTrα" = 1e1000 α. Scientific notation is a settings toggle. Ore input fields accept "6e7" and "41%".
- **Scale:**
  - The main game ends at about **1e305 ₽** ("For the Worthy"), just under the double limit of 1.79e308.
  - Bonus content goes far past that: Research "Hidden" costs 1e10000 α; #19b costs 1e25000 α; #17.4b costs **1e1,000,000 α**.
  - The Suffixes page mentions **EternityNum**, a Roblox big-number library, which is likely used in-game **(inferred)**. No tetration-level layers are documented.

## Pacing (time to each layer, total content)
- **Badge funnel (Rolimons award counts; % relative to the Research badge):**

  | Badge | Awards | % of Research |
  |---|---|---|
  | Research | 3.18M | 100% |
  | Prestige | 1.71M | 54% |
  | Automation | 1.07M | 33% |
  | Conversion (Point-X) | 872k | 27% |
  | Transcension | 601k | 19% |
  | Quantum Computers | 539k | 17% |
  | Supermassive Black Hole (100k☉) | 422k | 13% |
  | New Life (first star) | 240k | 7.5% |
  | Patience of Steel (PD 9) | 229k | 7.2% |
  | Sacrifice | 201k | 6.3% |
  | Star Tree | 176k | 5.5% |
  | Enthusiast (**72 h playtime**) | 17.9k | 0.56% |
  | For the Worthy (endgame) | 9.9k | 0.31% |

- **Built-in time walls:**
  - #29p's cost halves every second you stay in one transcension. Level 1 is free after about 5m32s, L2 27m41s, L3 2h18m, L4 11h32m, L5 **57h40m**.
  - Forge crafts take up to 3.48 and 5.78 days. Steelwire takes a fixed 15 min.
  - Sacrifice τ windows grow from 10 min to 10 h, then become permanent.
- **Rough time to each layer (inferred):**
  - Research: about 1.5–2 min.
  - Prestige plate visible: about 5 min. First Prestige (1e16 ₽): about 15–45 min.
  - Point-X/Automation: first hour.
  - Transcend (1B ₹): several hours.
  - Sacrifice: tens of hours.
  - For the Worthy: very likely 100+ h, since fewer players hold it than the 72h-playtime badge.
- **Total content:** roughly 100–300+ h for completionists **(inferred)**.
- **Update cadence:** v0.1 (Nov 2024) → v0.2 Prestige (Nov) → v0.3 Automation and global chat (Dec) → v0.3.1 Point-X and gold (Dec) → v0.4 Mining, Transcend, Qubits, Periodic Table (Feb 2025) → v0.4.1 Offline and Beta (Mar) → v0.5 Hardcore, Lingo, Astronomy, Cards (May) → v0.6 "The Update That Makes the Game Fun": Sacrifice, Star Tree, rebalance (23 Aug 2025; the CCU peak came 8 days later) → v0.6.1 (Feb 2026).

## UI / visual style
- **World:** each plate is themed. The wiki taglines include "Where it all begins…" for Points, "Now do it all over again (but blue!)" for Transcend, and "Now ACTUALLY do it all over again…" for Sacrifice. v0.3.1 was the "Purple Update" (Point-X). Hardcore has a "glowing tree" and a building topped by a chair with a daunting aura. Basements sit under plates. Developer houses, a gravesite and a Leaderboard plate fill out the world.
- **Diegetic buildings:** Research Center machine, Leveling Center button, Mystic Obelisk, Telescope that teleports you into space, Periodic Table board, Forge, Enchanting Table, Hiring Center and Keypad.
- **Black Hole:** physically grows, cycles through 8 colours, and can kill you.
- **Ores:** modelled 3D rocks; Bismuth shifts colour on High graphics. Status emoji 🔥🤢🧊⭐ appear in the UI.
- **Writing tone:** heavy humour and memes. Examples: "TOO MANY LEVELS", "Absolute FRENZY", "GIVE UP ALREADY", "Okay stop screaming"; Automation nodes styled as code; Qubit nodes as quantum-physics puns; "brainrot" mango names.
- **Warnings:** the game carries a flashing-imagery/epilepsy warning, and Get Funky adds a rainbow tint.
- **Sound:** the Boombox has 12 soundpacks, including Toby Fox, Laura Shigihara, Kubbi, Tobu/NCS, Limbus Company, the **Balatro** OST, Freedom Planet 2, Parry Gripp, and dev originals by Encythe. Custom soundpacks unlock late. The Bonus plate has a honking jeep.
- **Social:** global chat with flairs, removed 10 Oct 2025 under Roblox policy.

## What players praise and complain about
Reddit and YouTube comments could not be retrieved. Everything below comes from metrics, changelogs and wiki text, and is partly **(inferred)**.
- **Praise:**
  - Strong ratings: 87.5% across 58k votes, 146k favourites, 42.7M visits.
  - An active fan wiki (164+ pages) and Discord.
  - YouTube titles celebrate breadth and updates: "INSANE PROGRESS…", "I turned PRO…", "DISCOVERING ASTRONOMY… + HARDCORE!!!", "The Sacrifice Baseplate".
  - The "grows larger and larger" promise of constant new mechanics, plus humour and secrets (Keypad, Harry's Puzzle, hidden badges).
- **Complaints/pain points:**
  - **Steep drop-off and short sessions.** Only 19% of Research earners reach Transcend, and the average session is 15–18 min.
  - **Grind-heavy mid/late game.** Mining is "99% of progress" and has multi-day forges.
  - **Opaque optimal path.** The progression guide says the path is "nonlinear and layered" and that rushing upgrades can hurt.
  - **Confusing negative interactions.** FAQ entries cover "stats dropping" (Gula card) and Abyssal level dropping (#13x).
  - **Prior pacing complaints.** Naming v0.6 "The Update That Makes the Game Fun" with a "progression rebalance" suggests earlier pacing problems **(inferred)**.
  - Loss of global chat, an unappealable ban policy, and the flashing-imagery warning.

## Steal-worthy ideas (for a space-fantasy web incremental)
- **A living Black Hole / Singularity generator.** It physically grows, passes through 8 colour stages as you buy its tree, has a "danger radius" that grows with greedy upgrades, and ends in a **Prism colour wheel** that re-routes up to 80% of main income into boosts for 8 currencies, weighted by colour.
- **Constellation linking.** Procedurally roll stars (mass/temp/distance) and let players draw links, with gain = f(total linked distance). Feed a Star Score = log(income)^3 × 4^stars into a "Stardust" mini-tree. This translates almost directly into the theme.
- **A Periodic Table / nucleosynthesis board.** Each element node is a cheap-to-absurd cross-system perk (H → Fe in stellar cores, heavier elements via supernova layers), with "row complete" bonuses.
- **Gold/Diamond re-tiering of early nodes** through a later layer. Old nodes become fresh purchases with new effects, which keeps the first tree relevant for hours.
- **Rarity-gated card packs with positional rules.** Pack draws follow "highest unfinished rarity, no dupes". Rule-benders include copy-left/disable-right, a leftmost bonus, and "devil-deal" Sins cards with a nerf attached. Theme it as a Tarot of the Void or a Relic deck.
- **A ranked speed challenge** (Fast Transcend D→Q, ×1.5 → ×25.62) plus **Fusion**, which stacks challenge debuffs for a multiplicative score. Both are cheap to build and add mastery play.
- **A one-time Sacrifice/Supernova.** A single dramatic reset that hands out flat ×3–×25 permanent multipliers and visibly transforms the world.
- **Decaying-cost "patience" nodes** (cost halves every second of the run) and **timed passive windows** (auto-gain for the first N minutes of each run, growing to permanent). Both reward long runs and make short runs snappy.
- **Code-styled automation as its own currency/tree** (`automate(1,5)`, `ultra = true`). It is charming and makes QoL a satisfying purchase.
- **A depth-based mining layer** with ore HP/defense, elemental status effects, hireable auto-miners and per-ore mastery tracks. It works as an "asteroid belt / void-mine" sub-game that feeds every main currency.

---

# Upgradex

> Primary source: community MediaWiki **upgxwiki.com** (Miraheze, 118 articles, edited up to 10 Oct 2026). **upgradex.wiki** looks like a generic or SEO fan site: it misnames currencies as "Points/lambda" and contradicts itself. I use it only where it is flagged.

**Meta.** Developer: **orthogon studios** (Roblox group 32953855), owned by ASAP, the EUT founder. The listing says it is "heavily inspired by Everything Upgrade Tree" and made by the team "known from" EUT. Place 128718594394791; there is also an alternate listing, 129343547756529.
- **Timeline:** 50-hour public beta 26–28 May 2026. **v1.0 on 5 Jul 2026, 20:00.** **v1.1 "Ascension" on 1 Aug 2026.** The Roblox listing now shows "RELEASE 1.2". Rotrends gives a "release" of 5 Jul 2025, which probably reflects the place's creation date **(inferred)**.
- **Stats:** 2.49M visits, 27.1k favourites, 88.2% like ratio (7,787 / 1,041), peak 3,467 CCU on 18 Jul 2026, about 1,050 CCU now, **average session 39.5 min**, 48 per server. Monetisation is 2 gamepasses and 11 dev products. Music is licensed CC BY 4.0.

## Core loop (what you click/collect, first 5 minutes)
- You start on the **Main Baseplate**. Upgrades are in-world objects that you click or tap: a v1.0 patch made mobile purchases fire "on finger lift" rather than on camera rotation. Bigger structures use proximity prompts ("Hold F").
- **The opening tree:**
  - #1 "New shore" (free): +1 €/s.
  - #2 Addition: +1 €/s per level, cap 3, extendable to 15.
  - #3 Stronger addition: +3/s per level, 25×(lvl+1)€.
  - #4 ×2 € (50€), "applied after additions".
  - #5 Synergism: ×1.1 € per Credits upgrade owned (250€).
  - #6 Extender: 125×2^lvl.
  - #7 Full potential (500€).
  - #3B Decorator (100€), #2B Bonus Baseplate (1k€), #D Donation (free), **#RSC Research (1k€)**.
- **First 5 minutes (inferred sim, assuming #2 costs 10×(lvl+1); the wiki lists that cost as missing):** about 10–60 s to buy #2/#3/#4/#5/#6. About **75 s to reach 500€**, enough for the first possible Research (1 Đ). About 100 s to #RSC. About 4 min to 10k€ without resetting. Early research buys **#1RB Buy Max (1 Đ, permanent)**, #2RB Shortcuts, #3RB Computer, and #CR Core/Energy.
- **The loop:** € → Research (Đ + Energy) → focus Wavelengths at the Core and click the **Cube** → Prestige (₽) → challenges at the **Pyramid** → Ascension (❖) with Ascension Tiers. Side zones (Bonus, Void, Fish Island) are self-contained.

## Every currency / resource and how each is produced
| Sym | Name | Production (as written) | Notes |
|---|---|---|---|
| € | Credits | +1/s from #1, then additive → multiplicative → exponent | Main run currency |
| Đ | Data | RESEARCH reset, ≥500 €: (€/500)^0.25. Passive +1%/s per level (#7A, cap 100) | Research Baseplate |
| ⊕ | Energy | Each Research gives ⊕ equal to Đ gained. Passive +0.25%/s (#9R, Energetic) | Core; unlocks Wavelengths |
| ♢ | Wavelength energy (Red/Orange/Yellow/Green) | Generated while a wavelength is "focused" (Red unlocks at 10⊕, Orange 1k⊕, Yellow 100k⊕). #5P ×time^0.25 focused | Thresholds give boosts per order of magnitude |
| clicks | Cube Clicks | Clicking the Cube (#CB 50k€); 5% crit chance at 25 clicks | Boosts €/Đ/₽ |
| ₽ | Prestige | (€/1B)^0.25 | Prestige Baseplate |
| ❖ | Ascension | (₽/1k)^0.25 × 100; **first ascension uses ^0.08** | Called "Fragments" pre-release |
| CXP | Challenge XP | From Energy during Ascension challenges (formula not given) | Feeds the Autochallenger |
| α, Studs, β | Alpha/Beta (Bonus) | α: 1 per click on #1α with a 3 s cooldown. Studs from the stud tower. β: "Sigma pay" reset converts α + Studs | Isolated: "Bonus progression should not influence Main" |
| 🐟 | Fish Points | Selling caught fish | Fish Island |
| ▣ / ▩ | Void / Dark Matter | ▣ 1/s from #-1. ▩ from the "Big Rip" reset (≥1T ▣) | The Void (Nowhere) |
| ¥ / Auras | Yen | RNG Machine lever rolls | Void sub-zone |
| $ / Δ / ☒ | Cash / Fuel / Nuclear | $ costs 1 Δ/s. Δ from Robux or a free 12h daily. ☒ = (€·Đ·₽)^0.025 | Donation Baseplate (optional) |

## Upgrade tree structure (unlocks, cost scaling, effect formulas, caps)
- **Layers inside baseplates.** Main has Layer 1 (22 nodes), Layer 2 "Credits+" (11), and Layer 3 "Credits★" (12). New layers are bought as upgrades: #AG adds a Main layer, #AT a Research layer, #5AS/#7AS more. Research has R (16), A automation (12), and A+ (≈17).
- **Colour tags have fixed meanings** (the Upgrade Tags page):

  | Colour | Meaning |
  |---|---|
  | Blue | Unlocks a new area or a big step |
  | Green | Additive |
  | Orange | Multiplicative |
  | Red | Modifies other upgrades (caps, conditions, keeps) |
  | Purple | Mechanics or exponentiation |
  | Cyan | Each Cyan bought multiplies the other Cyan costs (×1k or ×1M) |

  Cyan works as a soft "pick your build" system: #6+ cube, #7+ main stats, #8+ mobility, #6AS-2a/b. #6AS-2 GREED grants one extra pick.
  Other tags: Risky, Mutated, X-side, NJUT (paid in studs), B-side/C-side.
- **Description order.** Text explicitly states the order of application: "Applied to the base amount" → "Applied after additions" → "^1.1 € gain. Applied after multipliers".
- **Cost scaling examples:**
  - Linear: 25×(lvl+1).
  - Geometric: 125×2^lvl, 25k×2^lvl, 10B×8^lvl, 50×(10^lvl).
  - Sub-exponential: 3000×5^(lvl^0.9); 15^(1+0.2lvl); 175+(40lvl)^1.125.
  - Piecewise: #13 is 5M×1.35^lvl to L100, then ×1.5^(lvl−100).
  - Self-tuning: #6P+ ENDGAME reduces **#5+ Infinity**'s cost exponent to ^(2−0.02lvl). #5+ is an ∞-level ×1.025 € node.
  - "Neatness" jumps: #7A costs 5k×1.25^(lvl+5n)×(1+n), where n = lvl//5+lvl//10+lvl//25+lvl//50, so prices jump at round levels.
  - Upgradelings: each one bought makes the others ×1.1.
- **Effect formula examples:**
  - Conditional: #6R Welfare ×4 € if below 1M €; #8R Devotion ×2 €/Đ if the research run is over 30 s; #11P ZEAL ×1.25 if the prestige run is over 180 s, versus #6AS-6 WRATH ×1.5 if under 180 s.
  - Unspent currency: #2P ×(log10(₽+1)+1.5); #3P ×(log20(₽+1)+1.25); #13AS ×((❖/100)^0.3+1.25).
  - Sigmoid retention: #3+ keeps Welfare's buff weakly (max ×4).
  - Uncapping with sqrt dampening: #3* uses sqrt(value/cap)·cap.
  - Additive-to-multiplicative conversion: #7* Rebalance.
- **Softcaps:** the Cube has a softcap threshold (#10* doubles it). The v1.0 patch notes mention "reset softcaps". #5* says "prices past level 10 get expensive". Otherwise growth is controlled by caps and piecewise costs.

## Reset / prestige layers IN ORDER
| # | Layer | Unlock | Reward formula | Resets | Kept | Notables |
|---|---|---|---|---|---|---|
| 1 | **Research** | #RSC (1k€) and the RESEARCH button; ≥500€ | Đ = (€/500)^0.25; ⊕ += Đ | Credits and Main-plate upgrades **(inferred)**; #10's growth | #-RB (permanent QoL); A-layer automation survives Prestige | #3R Innovate (×2 then +0.5× per level, cap 100); #8R time-condition; #CR Core; #12R Core upgrades |
| 2 | **Prestige** | #PRS (500M€ + 300Đ) | ₽ = (€/1B)^0.25 | Research and below (except #-A) | Layer-2 automation, #-P+ (through Ascension) | #1P RESURGE (×5 € at L1); #AG/#AT extra layers; **#PYR Pyramid challenges** (5₽); #CT Cube Transformers (500₽); **#ASC** (1k₽) |
| 3 | **Ascension** | #ASC (1k₽) | ❖ = (₽/1k)^0.25×100; first run ^0.08 | Prestige and below; upgradelings (unless saved) | #-P+, #-A+, Tier perks | **Ascension Tier**: each tier needs 100×2^tier ❖ in one run. T1 start with 3₽ (doubling to T5); T2 ×2.5 € and ×2 Đ per tier to T10; T3 ×1.5 ₽ per tier to T12; **T4 keep automation**; T5 save 1 upgradeling per tier (all by T11). #9AS "First Wind": passive ₽ 0.25%/s for the first 5 min (upgradable to 0.5%/s and 7 min) |
| B1 | β "Sigma pay" (Bonus) | #7αb | Converts α + Studs → β | α tree, Mastery | #5β keeps 0–8 studs; #1Ωβ keeps mastery levels | — |
| B2 | Big Rip (Void) | #-20 / ≥1T ▣ | ▣ → ▩ Dark Matter | ▣ progress | — | Dark-matter nodes extend earlier nodes and add "Mutated" variants |

**Challenges (Pyramid).** Entering one performs a reset and applies a debuff; completion removes it and grants a per-level buff.

| Challenge | Category | Levels | Debuff | Goal | Buff |
|---|---|---|---|---|---|
| Credit Deduction | Prestige | 9 | € ^(1−0.1·lvl); Yellow♢ off | Prestige | ×2^lvl € |
| Environmentalism | Prestige | 1 | Credits/Research upgrades become addition-only | Prestige | +250/s and ×1.25 € |
| **Homefinder** | Prestige | 1 | Sandstorm with hit-points projectiles; € ×0, recovering exponentially; cube ×0.01; Core and automation off; 4.5 min limit; single sitting | Prestige for 1k₽ | ×1.25 ❖ and ₽ |
| Cyclic Dependency | Ascension | 3 | Auto-reset every (50−10·lvl) s | Ascend | ×1.5^lvl CXP and ₽ |
| Out of Stock | Ascension | 5 | Only (32−4·lvl) unique upgrades, −2 per Prestige | Ascend | ×1.25^lvl ❖ |
| Studs to Space | Bonus | uncapped | 60 s timer | Grow the stud tower | +0.01× β per stud past 40 |

- **#AC (free):** auto-completes a challenge when its goal is reached.
- **#AC+ Autochallenger (500B Đ):** sets next Ascension's challenge levels from the CXP earned in the previous one. #AC2 adds +(⊕^0.75)/100 to the CXP exponent; #AC3 keeps 0–10% of CXP.

## Every named side-mechanic and how it feeds multipliers
- **Cube (#CB).**
  - Boosts: € ×[0.25+(clicks/10)^0.175]; Đ ×[0.125+(clicks/100)^0.125]; ₽ ×[0.075+(clicks/250)^0.075] (needs 10k clicks and #6P).
  - Crits unlock at 25 clicks, and S.CRIT comes later.
  - **Cube Transformers** (3 slots, expandable) are equippable modifiers with minigames:
    - **Neon Headphones:** a rhythm "Note Highway" over the cube. Miss ×0.5, Ok ×2, Great ×5, "Cubetastic!!" ×25. A combo above 25 buffs €/Đ/₽ up to ×4 €.
    - **D20 Die:** every 20 s rolls one of 20 effects for 10 s, from "inverts Credits gain" to ×3 everything.
    - **Valentine:** a heartbeat meter. Keep it high but ≤200 BPM for up to ×10; overshooting stuns at ×0.1 for 5 s.
    - **Dunce Cap:** ×1.2 € per empty slot.
    - **Book:** ×1.5 Đ but no ⊕.
    - **Cat Ears:** mobility.
    - **Los Cubalitos:** ×(1+log3(total main levels)/5).
- **Core / Energy / Wavelengths.** Focus one wavelength at a time to build its ♢. Thresholds are per order of magnitude (OoM):
  - **Red:** +20/s € per OoM of Red♢; +20 cap on #3; Welfare+; from 25B, ×1.02 ❖ and again every ×5.
  - **Orange:** +0.1× € and +0.05× Đ per OoM.
  - **Yellow:** adds "effective OoM of Credits" to the Research (+1 per OoM) and Prestige (+2 per OoM) **formula inputs**.
  - **Green:** added in v1.1.
  - **Core upgrades:** Energetic (+0.25%/s ⊕), **Sunlit** (♢ × based on the gap between your highest and current wavelength), Infrared (+1/s base ♢).
- **Pyramid challenges and Autochallenger.** See above.
- **Computer (#3RB).** An in-game desktop with selectable wallpaper and taskbar colour. Apps:
  - *Arithmetism*: scores number properties such as palindromic and strobogrammatic.
  - *baldi basics v2*: a timed math quiz with 3 lives and a combo.
  - *Innovative Clicker Game*: awards the "Perfect Key" gear.
  - A placeholder "Read Me".
- **Ascension Upgradelings (#6AS "Sigils").** Seven "sin" nodes are hidden around the map (PRIDE, GREED, GLUTTONY, SLOTH, DESIRE, WRATH, ENVY). Each tweaks a rule, e.g. SLOTH ×2.5 passive Đ but ×0.5 walkspeed, or DESIRE 100% crit. Each purchase raises the others' cost ×1.1, and #6AS-R gives a free respec.
- **Bonus Baseplate.**
  - α is a cooldown clicker with self-upgrades.
  - **Stud tower:** #1αb up to 65,536 levels; studs buy NJUT nodes.
  - **The Mastery:** 6 α multipliers that read main-game stats: ×(1+0.125·main upgrades), studs, ×log10(cube clicks+10), ×√(resets+1), ×(1+challenge levels²), ×(1+log(session time+1)).
  - β reset; Jerry NPC; the Gateway to the Void; a painting that leads to the **Paper Dimension**, a hangout area themed on *Fundamental Paper Education*.
- **The Void / Nowhere (▣).** Generator nodes with **"Mutated" variants** and luck/risk mechanics:
  - #-13: a coin flip every 3 s; heads ×1.5 stacking, tails resets.
  - #-14 "Warped Time" (Risky): each streak adds 2 s to the flip delay.
  - Hollow Clovers: 5% per tick for ×10. Golden Σ: 1% for ×100.
  - #-8.1: a multiplier that slowly approaches Φ ×1.618.
  - #-2.2: ×(|sin t|+1).
  - #-11: ×(1.5+0.25·players), capped at ×10, plus purchasable fake players.
  - "Big Rip" converts to Dark Matter.
  - **RNG Machine (¥):** 15 aura rarities, from Common (1/2, 1¥) through Godly++ (1/9999, 25k¥), including RGB (1/255), Lucky (1/777) and Binary (1/1010). Pity: every 10th roll ×1.5 luck. Auras are themselves a currency for #AU nodes.
- **Fish Island (🐟).**
  - Fishing minigame taught by a Mermaid NPC.
  - Rods: Fishing, Advanced, Momentum, plus a Pistol. About 12 baits (Worm, Moss, Pizza, Dynamite, Gravity/Speed/Fusion/Regen Coils, Teddy Bear…) and 20+ fish.
  - Market, Enchanting (Momentum, Strength, Fortune, Ultra; slot count scales with fish value), and Entries (+0.1× 🐟 each).
  - It feeds only bonus currencies (α, and RPS via β).
- **Donation Baseplate.**
  - **Fuel:** from Robux (5–10k R$ tiers, 1 R$ = 1 Fuel) or a **free daily claim** (12h cooldown; the streak resets after 48h; the amount scales with Achievement Rating).
  - Fuel burns at 1 Δ/s to print $. An Ice Cube throttles burn from −80% to +180%, and a Nuclear Plant runs on (€·Đ·₽)^0.025.
  - It "contributes nothing to progression outside the baseplate".
- **Achievements and Achievement Rating (AR).** 10 tiered lifetime-total achievements, 9 tiers each, +1 AR per tier. Example: Credits tiers run 1k € → 25No €. Progression achievements give +1 to +5 AR. AR scales the daily Fuel.
- **Cosmetic and social extras.** Decorator (buy decorations for each plate), Boombox albums with lyric display, trampolines and Cube Teleporters between zones, ridable jetskis, developer and community NPC houses (27+ named NPCs), and a collab portal to *OPERATION: Solar Crescent*.

## Automation unlocks (auto-buyers, auto-resets) and when
- **First research (1 Đ):** #1RB Buy Max, then #2RB Shortcuts.
- **Research Layer 2 (Đ; survives Prestige):**
  - #1A `start()` at 1kĐ automates #1 at 3 upgrades/s.
  - "Chips" `sync(2,3)`, `sync(4,5)` … `sync(12,13)` at 3k–50kĐ.
  - #7A `gen(data)`: passive Đ +1%/s per level.
  - #10A `click(CB)`: cube autoclick 1/s.
  - #11A `speed += x`: +1 upgrade/s per level, cap 7.
  - #12A `buymax()`.
- **Autobuy Settings:** a physical rack where each bought automation **installs a model chip on a shelf**. Toggles: Autobuy upgrades / Buymax / Autoclick cube / Passive data, plus a filter by tag (€, B, α, R, P, $, A, Void, β).
- **Research Layer 3, A+ (1B–400BĐ; survives Ascension):** automates the Research nodes. #9A+ adds passive ⊕, #CRA+ automates the Core and gives passive ♢, #AC/#AC+ handle challenge automation.
- **Ascension:** #4AS makes automation ×100 cheaper, and **Tier 4 keeps automation** through Ascension.
- **Bonus:** Alpha automation (#1Aα–#11Aα, paid in β), plus α self-upgrade (#4α every 6–7 s).
- **Gamepass "Modifiers" (199 R$):** start-of-save rules (CLICKERCORE manual credits, JUMPSCARE, TAXES € ^0.8 → ^0.1, HANDICAP ×2 → ×25). Modded saves are excluded from leaderboards.

## Offline / idle progress behaviour
- The wiki documents no offline-earnings system **(inferred: none, or not documented)**. Idle play inside a server relies on %/s passive generation: #7A Data, #9R/Energetic Energy, #9AS ₽ at the start of each Ascension, #CRA+ wavelengths. #10/#4P+ is a "grows over time" €/s² node.
- Progress is stored in private save files: Main Menu → PLAY → Private. Saves are flagged for leaderboards, modifiers and streaming mode (upcoming).
- The Donation daily claim (12h cooldown, 48h streak window) is the only scheduled "come back" hook.

## Number scale reached and notation
- The scale is far smaller than EUT's. The top achievement tiers show the intended ceiling: Credits **25No € (2.5e31)**, Data and Energy 10Qd (1e16), Prestige 100M ₽, Ascension 125k ❖, Alpha 1e34, Void 10Oc (1e28), Yen 1B.
- Notation uses the same suffix family (k, M, B, T, Qd, Qn, Sx, Sp, Oc, No, De) with a scientific-notation display (fixed 4 Aug 2026).

## Pacing (time to each layer, total content)
- **Average session 39.5 min**, about 2.5× EUT's. Rotrends puts it at the 98th percentile.
- **Badge funnel (Rolimons):**

  | Badge | Awards | % of Research |
  |---|---|---|
  | RESEARCH | 584k | 100% |
  | PRESTIGE | 249k | 43% |
  | ASCENSION | 70k | 12% |
  | HOMEFINDER | 34.5k | 5.9% |
  | HOMEFINDER 1.0 (legacy) | 10.6k | — |
  | UNREALITY (endgame) | 0 | 0% |

- **Intended loop lengths (inferred from time-conditioned nodes):** research runs of 30 s or more (#8R); prestige runs around 180 s, where you choose ZEAL (slow) or WRATH (fast); Ascension's "First Wind" window of 5–7 min.
- **Time to each layer (inferred):** Research about 1–2 min. First Prestige (needs 1B € plus #PRS's 500M € and 300 Đ) about 30–60 min; upgradex.wiki claims "30–90 minutes for beginners" (low reliability). Ascension: several hours. Total content in v1.1: tens of hours plus bonus-zone grinding **(inferred)**. The Total Playtime achievement tops out at 90 days.
- **Cadence:** beta → v1.0 → v1.1 in about 9 weeks, with near-daily hotfix batches. v1.1 added 88 upgrades, 3 challenges, 15 RNG rarities, 10 fish and 5 baits.

## UI / visual style
- The Roblox listing pitches "a **sleek** new look". Upgrades are 3D in-world objects with clear **colour-coded tags**.
- **Upgrade Panel:** tabs including a **BOOSTS** tab that shows Cube boosts and milestones.
- **Menu:** Statistics (pinnable stats; v1.1 added more), Achievements (medal progress bars), Settings, Server, Shortcuts, and Shop (gamepasses, including unreleased ones).
- **Settings:** Buy-max toggle under "Unlocks", Increased Motion, "Bumpscosity", Freecam, Stud Lookahead, lyrics toggle, default music looping.
- Custom cursors. Console support covers the title screen and menus; mobile has a dedicated cast button.
- **Title screen:** PLAY → Join / Private / Public; a CREDITS screen where hovering a name highlights that person's avatar in the 3D background; rare random events on join (Connor sign 25%, a "Free Admin Panel" button 2% that turns into "gullible"). Menu music is the *Rivals of Aether* main theme.
- **Diegetic structures:** Pyramid behind the Prestige plate, Core, the Computer desktop, the automation chip shelf, RNG Machine lever, Fish Island Chest/Market, terriac's house, NPC houses.
- **Characters everywhere:** a Mermaid as the Fish currency personified, Jerry, Connor the warning sign, Sword from *PHIGHTING!*.
- **Sound:** Boombox albums by the staff (e.g. Void Vapor, Naomi's WIRED Mix, Prefer not to say) with lyrics display. The Homefinder sandstorm and the rhythm-game note highway get their own audio.

## What players praise and complain about
Sentiment is inferred from metrics and changelogs; no Reddit access.
- **Praise:**
  - 88.2% like ratio and long sessions (39.5 min).
  - A peak of 3.5k CCU in week 2.
  - The polish and "sleek" UI cited in the pitch, plus the semantic colour tags.
  - Lots of personality: NPCs, minigames, music.
  - The low-reliability fan review also praises onboarding and satisfying compounding.
- **Complaints:**
  - **Homefinder difficulty.** Originally it was mandatory for Ascension. Players criticised it, so v1.0 renamed it "Very Optional Homefinder". v1.1 removed it as a requirement, rebalanced it and split its badge.
  - Beta saves were not carried over.
  - **Save files failed to load at the v1.1 launch.** The devs blamed a tight deadline.
  - "Balancing changes aimed at casual players" in v1.1 point to early difficulty complaints **(inferred)**.
  - Nerfs to Momentum Rod, Moss and UNREALITY.
  - A strict anti-macro policy (save wipes).
  - The fan review flags a mid-game complexity spike (low reliability).

## Steal-worthy ideas (for a space-fantasy web incremental)
- **Semantic node colours.** Blue unlock, Green +, Orange ×, Purple ^/mechanic, Red "modifies another node", Cyan "linked picks". Players learn to read the tree at a glance; map these to star-class colours.
- **Spell out the order of application** in node text ("applied after additions/multipliers"). It is cheap and makes the math legible.
- **Playstyle-conditional nodes.** ×2 if the run lasted over 30 s, or a choice between ZEAL (slow runs) and WRATH (fast runs). They reward deliberate pacing choices without a separate mode.
- **Cyan "escalating picks"** (each pick ×1M the others' cost). A soft build choice that never hard-locks the player, e.g. choosing a ship doctrine.
- **Transformer/relic slots on a clickable core with micro-minigames.** Rhythm highway, heartbeat-don't-overload, a d20 chaos die every 20 s. Theme them as a "Reactor Heart" or "Star Engine" with attunements.
- **Wavelength focus.** Channel one spectrum band at a time; per-OoM thresholds; Yellow adds "effective orders of magnitude" to reset-formula inputs. A natural "spectrograph/nebula tuning" mechanic.
- **An Ascension Tier ladder** with geometric requirements (100×2^tier) whose rewards are mostly *reset-pain removal*: keep automation at T4, save hidden upgrades at T5+. Pair it with a **reduced first-reset exponent** (^0.08) so the first run's reward is normalised.
- **Hidden "upgradelings" scattered across the explorable map.** Each one raises the others' cost and there is a free respec. In a web game: hidden nodes in far corners of a star map or derelict stations.
- **Diegetic automation.** Each auto-buyer installs a visible "chip" in a rack, with per-tag autobuy filters.
- **Risk/luck nodes in an optional void zone.** Coin-flip streak multipliers, per-tick clover procs, a multiplier that asymptotes to φ, sine-wave income, an RNG aura gacha with pity. Plus **save-file Modifiers** (TAXES ^0.8 → ^0.1, HANDICAP ×2–×25) as NG+ or custom-difficulty seeds kept off the main leaderboard.

---

## Sources
Pages actually read in this session.

**Everything Upgrade Tree: eutwiki.com (official-community MediaWiki)**
- https://eutwiki.com/
- https://eutwiki.com/Special:AllPages
- https://eutwiki.com/Everything_Upgrade_Tree_(game)
- https://eutwiki.com/Points_Baseplate
- https://eutwiki.com/Research_Center
- https://eutwiki.com/Prestige_Baseplate
- https://eutwiki.com/Automation_Baseplate
- https://eutwiki.com/Point-X_Baseplate
- https://eutwiki.com/Point-X_Basement
- https://eutwiki.com/Transcend_Baseplate
- https://eutwiki.com/Mining_Baseplate
- https://eutwiki.com/Qubits_Baseplate
- https://eutwiki.com/Offline_Baseplate
- https://eutwiki.com/Hardcore_Baseplate
- https://eutwiki.com/Astronomy_Baseplate
- https://eutwiki.com/Sacrifice_Baseplate
- https://eutwiki.com/Points_Basement
- https://eutwiki.com/Leveling_Center
- https://eutwiki.com/Everything_Leveling
- https://eutwiki.com/Periodic_Table
- https://eutwiki.com/Cards
- https://eutwiki.com/Guide:Cards
- https://eutwiki.com/Guide:Mining
- https://eutwiki.com/Guide:Evil_Rock
- https://eutwiki.com/Guide:Main_Progression
- https://eutwiki.com/Guide:FAQ
- https://eutwiki.com/Challenges
- https://eutwiki.com/Point_Deduction
- https://eutwiki.com/Extinction_of_Science
- https://eutwiki.com/Double_Trouble
- https://eutwiki.com/Change_of_Pace
- https://eutwiki.com/Everything_Deduction
- https://eutwiki.com/Fast_Transcend
- https://eutwiki.com/Fusion
- https://eutwiki.com/Hardcore_Challenge
- https://eutwiki.com/Get_Funky
- https://eutwiki.com/Real_Timed_Challenge
- https://eutwiki.com/Cash_Challenge
- https://eutwiki.com/Currencies
- https://eutwiki.com/Suffixes
- https://eutwiki.com/Update_Log
- https://eutwiki.com/Badges
- https://eutwiki.com/Baseplates
- https://eutwiki.com/Boombox
- https://eutwiki.com/Bonus_Baseplate
- https://eutwiki.com/Beta_Baseplate
- https://eutwiki.com/Donation_Baseplate
- https://eutwiki.com/Goldify
- https://eutwiki.com/Leaderboard_Baseplate
- https://eutwiki.com/Analytics (admin-only; no data)

**Upgradex: upgxwiki.com (community MediaWiki)**
- https://upgxwiki.com/wiki/Main_Page
- https://upgxwiki.com/Special:AllPages
- https://upgxwiki.com/Upgradex
- https://upgxwiki.com/Upgradex_(game)
- https://upgxwiki.com/Main_Baseplate
- https://upgxwiki.com/Research_Baseplate
- https://upgxwiki.com/Research
- https://upgxwiki.com/Prestige_Baseplate
- https://upgxwiki.com/Prestige
- https://upgxwiki.com/Ascension_Baseplate
- https://upgxwiki.com/Ascension
- https://upgxwiki.com/Upgrade_Tags
- https://upgxwiki.com/Upgrades
- https://upgxwiki.com/Cube
- https://upgxwiki.com/Core
- https://upgxwiki.com/Challenges
- https://upgxwiki.com/Homefinder
- https://upgxwiki.com/Computer
- https://upgxwiki.com/Autobuy_Settings
- https://upgxwiki.com/Achievements
- https://upgxwiki.com/Bonus_Baseplate
- https://upgxwiki.com/The_Mastery
- https://upgxwiki.com/The_Void
- https://upgxwiki.com/RNG_Machine
- https://upgxwiki.com/Fish_Island
- https://upgxwiki.com/Fishing
- https://upgxwiki.com/Paper_Dimension
- https://upgxwiki.com/Donation_Baseplate
- https://upgxwiki.com/Gamepasses
- https://upgxwiki.com/Menu
- https://upgxwiki.com/Main_Menu
- https://upgxwiki.com/Update_Log
- https://upgxwiki.com/Upcoming_Content

**Upgradex: upgradex.wiki (low reliability; generic/SEO-style fan site, used only where flagged)**
- https://upgradex.wiki/
- https://upgradex.wiki/review/
- https://upgradex.wiki/controls/ui-guide/
- https://upgradex.wiki/guides/beginner/
- https://upgradex.wiki/guides/ascension/

**Roblox listings and stat trackers**
- https://www.roblox.com/games/122809141833750/Everything-Upgrade-Tree
- https://www.roblox.com/games/128718594394791/Upgradex
- https://www.roblox.com/games/129343547756529
- https://rotrends.com/game/6749892429
- https://rotrends.com/game/8079278639
- https://www.rolimons.com/game/122809141833750
- https://www.rolimons.com/game/128718594394791

**YouTube (only titles came back from search; the video pages returned no description or comments)**
- https://www.youtube.com/watch?v=F-llAhRF0UI
- https://www.youtube.com/watch?v=A2C4a_sSd9k
- Titles seen in search results: "INSANE PROGRESS in Roblox Everything Upgrade Tree (EUT)", "I turned PRO in Roblox Everything Upgrade Tree (EUT)", "The Sacrifice Baseplate", "DISCOVERING ASTRONOMY… + HARDCORE!!!", "ENTERING THE DELUSION DIMENSION!!", "I got all mining upgrades".

**Attempted but not accessible**
- everything-upgrade-tree.fandom.com (HTTP 402)
- asapgames.fandom.com (HTTP 402)
- reddit.com / old.reddit.com (blocked)
- YouTube search results page (empty)
