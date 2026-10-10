# Research 02: Untitled Upgrade Tree, Grass Incremental Simulator, and Grass Cutting Incremental

Purpose: mine the design, math and pacing of these games for an original space-fantasy web incremental (Starforge). Nothing here is to be cloned.

Research date: 2026-10-10. Stats come from the Roblox public APIs and Rolimons on that date.

**How the sources are marked**
- **Plain statements** come from sources I actually read: the fan wikis, the Roblox APIs, the game source code, and YouTube transcripts and comments.
- **"(inferred)"** marks my own deduction.
- **Video timestamps** are positions in the video, not real play time.

---

# Untitled Upgrade Tree (UUT)

**Quick facts**
- **Developer:** group "Very Serious Games, Trust omg omg omg ohio". The owner is cool22hamstek, who goes by SauceDeBlanc on Discord.
- **Created:** 2025-09-06. Last updated 2026-10-10, and the title is currently "[UPD 5]".
- **Reach:** 12,733,642 visits and 45,479 favourites. 26,777 likes vs 3,892 dislikes (87.3%).
- **Concurrency:** all-time peak CCU 4,906 on 2026-02-23, the week after the Void/World 2 update. About 1,500 playing on the research date.
- **Sessions:** max 12 players per server; Rolimons average playtime is 28.2 minutes.
- **Genre and platforms:** Simulation > Incremental Simulator. PC, mobile and console.
- **Store description:** "upgrade tree incremental… multiple reset layers, currently 6… Each reset grants powerful boosts… over 12 hours of content, long-term goal 20+ hours." It carries an epilepsy warning and credits Everything Upgrade Tree (EUT) and Grass Cutting Incremental (GCI) as inspiration.
- **"6 layers" is outdated.** By Update 5 there are about 16 worlds and more than 15 reset/milestone systems. The original six were probably Prestige, Evil, Loop, Supernova, God Offer and Big Bang (inferred). Those are the full resets the wiki lists next to Rifts.
- **Update cadence (from badge creation dates and the wiki):**

| Date | Content added |
|---|---|
| 2026-01-06 | Prestige → Supernova badges |
| 2026-01-25 | Genesis, Tower, God Offer |
| 2026-02-08 | Big Bang |
| 2026-02-22 | Void, World 2 |
| 2026-05-17 | Major Update 4: Space, Cycles 6–10, Challenges |
| 2026-07-17 | Mini-update: new RNGs, roll upgrades, Tower softcap |
| 2026-10-05 | Major Update 5: Xenos, Forge, Rifts, Cycles 11–14, full visual rework, Hell and Cat worlds reworked |

## Core loop (first 5 minutes)

- **It is a 3D Roblox world, not a GUI tree.** Each upgrade is a flat clickable tile lying on a coloured "baseplate", with grey paths drawn between tiles to form the tree. You walk to a tile and click it, and new tiles and baseplates appear as branches unlock.
- **Opening sequence (Superior's fresh save, Feb 2026):**

| Video time | What happens |
|---|---|
| 0:30 | Click the free "Let's get started" tile, which gives +1 Point/s. A tutorial walks you through the first tiles. |
| ~1:40 | About 24k points. The next tiles cost in the thousands. |
| ~2:00 | The Clicker board appears: click a board for Clicks. A "double clicks" tile, then an auto-clicker tile at about 30k Clicks. |
| | A ×3 Points tile costs 30k. |
| ~3:30 | Tiles costing 5B points and click upgrades costing 1T. Unlocks Playtime, movement speed, and Daily Rewards (at 1 Qa points). |
| ~4:30 | Prestige unlocks at 1B points. The first Prestige gives 50 PP. |

- **Levels/EXP are the hidden spine.** A Levels board converts EXP into Levels. Levels first boost Points; later upgrades extend them to Clicks, Galaxy Points and Rocks.
- **Levels drive every early reset.** Prestige and Evil gains both scale with Levels.
- **The loop:** generate Points/s → buy tiles (×mult, ^exponent, "unlock branch") → click for Clicks → reset for a layer currency → buy that layer's tiles, which unlock more tiles in earlier trees → repeat.
- **Upgrades reach back into earlier trees.** The Prestige tree adds new Points and Clicks tiles, so after every reset you re-max the earlier board faster. Superior: "you can only buy one upgrade each time when you prestige… so you can't really just skyrocket off" (designed gating).

## Currencies and resources (about 35, each with its own tree)

- **Naming convention:** a "$" suffix on abbreviations (P$, PP$, EP$, GP$, DE$, SP$, U$, TP$, CM$, BM$, E$, HP$).
- **Colour coding:** each currency has a signature colour, for example yellow PP, red EP, pink GP, orange DPE.

| World | Currency | Produced by / notes |
|---|---|---|
| Overworld | Points (P$) | Free "Let's get started" tile, then +/s and ×/^ tiles. 20 Points tiles. |
| | Clicks | Clicking the Clicker board. 11 Click tiles. The Clicks tree is mandatory to unlock Prestige. |
| | Levels / EXP | EXP from Points-tree tiles; Levels on the Levels board. They boost Points, then Clicks, GP and Rocks. They drive PP/EP gain and later Loop requirements. |
| | Prestige Points (PP$) | Prestige reset; scales with Levels. 12 tiles. |
| | Evil Points (EP$) | Evil reset; scales with Levels. 10 tiles. |
| | Portal Fragments | 3 integer items, one bought in each of the Points, Clicks and Prestige trees. Spent to repair the Broken Portal to the Galaxy. |
| | Rolls | RNG board, 5 roll upgrades. |
| | Daily Points (DP$) | 2 per 12 h claim (+1 VIP, +2 VIP+). 4 boards × 25 levels of ×1.5 (Points, Clicks, PP, EXP). |
| | Bonus/joke currencies | Alpha α, Beta β ("Da useless tree" badges), Bubbles (titles, cat and dog tools), Robux-donated tree, Gambling Money $ (Plinko), Skill Points from Player Level. |
| Galaxy | Galaxy Points (GP$) | 14 tiles. |
| | Rocks | 8 tiles; drills produce them. One tile squares Rocks gain. |
| | Steel | Factory, unlocked at Loop 6; 6 tiles. Holds EXP^1.2, needed for Loop 9. |
| | Loops | Integer milestone count, gained by full reset. |
| Black Hole | Dark Energie DE$ (19 tiles) → Dark Prestige DPE$ (14) → Tokens (4) → Dark Evil DEE$ (9) | 46 tiles in total. First world where currencies boost themselves. |
| Anti-World | Anti-Points AP$ (17) | |
| | Anti-Levels | Each level grants a token, spent on 5 boost lines. |
| | Anti-Prestige APP$ (9) | |
| | Anti-Evil AEP$ (7) | 5 milestones. |
| Supernova | Supernova count (max 8) | Milestones. |
| | SP$ | 8 board upgrades + 18 tree upgrades. |
| | Supernova Levels | ×1.5 SP$ each. |
| Genesis | Units U$ (22) | |
| | Blocks (8 tiles) | Block Level 1–8 changes the block's colour. |
| | Tower Points TP$ (13) | |
| | Tower Prestige TPP$ (5) | |
| | Tower Stages | Milestones. |
| God Offer | Wishes | 1 per reset. |
| Big Bang | Mini copies of P$, PP$, EP$, Loops, Supernova | Mini-boards that replay the earlier layers. |
| | Memories | 4 upgrades. |
| | Big Bangs | 5 milestones. |
| Void | Ø ("empty sets", also called Omega) | 9 + 11 upgrades. Gain increases with time spent in the Void. |
| World 2 | Orbs ◎ (25 tiles), Coins £ | |
| | Ascend Tokens AT$ (11) | |
| | Shards (10) | |
| | Rocket Parts | |
| | Cycles | 14 milestones. |
| Space | Cosmic Matter CM$ (29) | |
| | Stars (6) | |
| | Planets 1–7 (9 Solar System tiles) | |
| Xenos | Biomass BM$, DNA | DNA is a fixed integer supply from the 5 Mother Bloom stages. |
| Forge | Energy E$, Star Cores | 28 forges, a fixed supply. |
| Rifts | Time Shards | 6 in total; every Time upgrade costs 0.2. |
| Extra worlds | Hell Points HP$, Hecker Credits, Pearls (Abyss), Cats/Kitties (Cat World) | |

Wiki tile counts:
- **Per world:** Overworld 103, Galaxy 28, Black Hole 46, Anti-World 38, Supernova 26, Genesis 48, Big Bang 36, World 2 53, Space 44, Hell 23, Hecker 22.
- **Total:** about 470 or more (inferred).

## Upgrade structure

**How tiles unlock**
- Buying a tile reveals its children along the drawn paths.
- Some tiles unlock tiles in other trees, for example the Prestige tree adds Points tiles.
- Some unlock whole baseplates ("Unlock First Reset", "Lil bro thinks he's tuff" → Evil, "Even more upgrades" → Broken Portal) or portals to new worlds.

**Single vs multi-level tiles**
- Most tiles are one-off purchases.
- Repeatable tiles have "layers", meaning levels. Examples: ×1.5 Points (5 layers); Daily Points ×1.5 (25 layers); Void #3 ×2 Ø (10 layers, extendable to 15).

**Cost scaling.** Costs are hand-placed per tile and jump by orders of magnitude, so the curve is effectively exponential by design (inferred):

| Stage | Tile costs |
|---|---|
| Early tiles | 30k, 5B, 1T, 1Qa |
| Pre-Galaxy | 100 Oc, 150 Oc, 500 QaD |
| World 2 | 5M ◎ for Battles, 100 Qa ◎ for Ascend, 1.5M AT$ for Cycles |
| Shards board | Each tile costs 10× the previous one (#10 costs 200M Shards) |
| Void | #9 costs 500M Ø; #20 costs "quintillions" |
| Hell portal | 1e400,000 Points |

Exact per-level multipliers are not documented (inferred: roughly geometric, about ×2 to ×10 per layer).

**Effect vocabulary** (from the full Big Bang Points-tree listing and others):

| Type | Examples |
|---|---|
| Additive | +1 Point/s; +10 Health / +2 Damage per layer |
| Multiplicative | ×1.5, ×2, ×5, ×10, ×25, ×100, ×1,000, ×1e9 ("1Bx EXP"), ×1e14 ("100Tx Points" at Loop 1) |
| Exponent | ^1.1 (SP power), ^1.2, ^1.25, ^1.3, ^1.5, ^2, ^10 (Memory OP Boost #1) |
| Self-boost | P^0.02; (Ø+1)^0.1; U$^0.05; ◎ × (Ø+1)^0.04; (Shards+1)^0.05; Stars^0.15 |
| Structural | "Every 5 bought upgrades ×2 Ø"; "every digit in Ø gives +20%"; "the less Ø you have, the stronger Ø/s, up to ×10"; "Void Surge: every 10 s gain 5 s of Ø"; "multipliers from Void upgrades are 20%/30% stronger" |
| QoL | buy-max, "X no longer resets", "keep levels on Evil reset", auto-gain |

**Exponent gates.** The Loop chain is gated by EXP-exponent tiles hidden in side worlds:
- **Factory (Galaxy):** Steel buys EXP^1.2, required for Loop 9.
- **Black Hole:** Dark Evil buys the "Loop 10" EXP exponent. The wiki gives ^1.2 on the world page and ^1.3 in the FAQ (conflicting). You cannot leave the Black Hole without buying the exit tile.
- **Anti-World:** Anti-Evil buys the "Loop 11" EXP exponent. The Currencies page says ^1.25, the Anti-World page says ^1.2.
- **After Loop 6, Loops require Levels.** The wiki says "200 levels for one loop". Players report walls such as "need Level 600 to loop" and "on Loop 9, need Level 800, I'm at 630".

**Softcaps, hardcaps and nerfs**

| Cap | Detail |
|---|---|
| Old hardcap | Numbers were capped at "1e1Qa" (1e(1e15)). Autoclicking Dark Prestige hit about e669T–e670T and wrapped back to e15.13. The patch removed the cap and the Dark Prestige self-squaring; Dark Evil self-multiplication now decays. |
| Tower softcap | Since 2026-07-17, Tower upgrades cost Tower Points, so stage gain converges. TP plateaus around e301.5k while the next stage for top players costs 6.73e1.12M. Top-10 stage leaderboard spots are effectively frozen. |
| "Inf Tower Points" | Capped at 100,000 levels (×2^100,000 to Units); raised from 10,000. |
| Wish #5 | ×2 all currencies, capped at 100 purchases. The wiki says this totals 10^200, but 2^100 ≈ 1.27e30, so the wiki's number is suspect. |
| Supernova 8 | "Supernova no longer resets but gives /50 the original amount" (a reset-free trickle). |
| Roll luck | Capped at 30,375× (1.5^5 × 2^2 × 1000), which makes the 8 commonest RNG buffs impossible to roll. Roll cooldown bottoms out at 1/2560 s. |
| Leaderboard display | Inflated values show wrongly: displayed 1.69e437.29k vs actual 9.86e436.4k. |

## Reset and prestige layers, in order

| # | Layer (world) | Unlock | Resets | Keeps | Reward / formula | Key milestones and notes |
|---|---|---|---|---|---|---|
| 1 | Prestige (Overworld, grey) | Clicks-tree tile "Unlock First Reset"; reset possible at about 1B Points | Points, Levels, Clicks and their tiles | Useless trees, DP, Rolls (inferred) | PP scales with Levels (exact formula undocumented); the first reset gave 50 PP. ×2 PP tile for 128 PP. | PP tree adds Points/Clicks tiles, the RNG board (about 10T), a portal fragment, passive PP generation, and the Evil unlock. |
| 2 | Evil (Overworld, red) | PP tile "Lil bro thinks he's tuff" (about 50B PP) | Points, Levels, Prestige, Clicks | Same | EP scales with Levels; the first reset gave ~2.44. | Tiles: keep Levels on Evil reset, keep faster autoclicker. "Even more upgrades" → Broken Portal (3 fragments) → Galaxy. Loop 9 adds new Evil tiles that lead to the Black Hole. |
| 3 | Loop (Galaxy, black) | Galaxy tile "Anti Points" | Everything before it (not useless trees) | | Loops count; any number, but there are 11 milestones. From Loop 6, Loops need Levels (about 200 levels per loop). | **L1:** ×10 all, ×1e9 EP. **L2:** ×1e14 Points, new RNGs. **L3:** Prestige & Evil no longer reset (autoclick them), and ×2 EXP per loop from L3 to L12. **L4:** keep Levels and autoclicker. **L5:** ×1e9 EXP, keep the auto-buyer tree. **L6:** Factory, new Galaxy tiles. **L7:** ×2 GP/Rocks/Steel per loop. **L8:** ×2 Steel speed per loop, drill time /4. **L9:** Evil tiles → Black Hole. **L10:** Anti-World, ×1,000 roll luck. **L11:** Supernova. (L12 "Obbies" was removed in Update 4.) |
| 3a | Black Hole sub-layers | Loop 9 + Evil tile; it sucks you in | | | DE → Dark Prestige (first inner reset) → Tokens (integer reset). Token shop: ×1e6 DE, "Dark Prestige no longer resets", ×1,000 DPE, unlock Dark Evil. | The Dark Evil EXP exponent ("Loop 10") and the exit tile. Advice: buy Dark Evil last. |
| 3b | Anti-World sub-layers | Loop 10 | | | AP → Anti-Levels (token per level) → Anti-Prestige → Anti-Evil (5 milestones) | **AE1:** ×5 AP/APP. **AE2:** keep Anti-Levels; RNG affects Anti currencies. **AE3:** Anti-Prestige resets nothing. **AE4:** keep Anti-Levels on AE. **AE5:** Anti-Evil no longer resets. EXP^1.25 → Loop 11. |
| 4 | Supernova (own world) | Loop 11 | All previous progress | Milestone keeps | Supernova count (max 8) + SP$. 8 board upgrades with compounding ×2 SP$, ×10 DE, ×10 AP, ×5 APP/AEP, ×5 DPE/DEE, ×100 Rocks, ×1,000 Steel, ×100 GP per buy. 18-tile tree; SP$ ^1.1. | **SN0 (free):** keep Loop 6. **SN1:** RNG boosts Black Hole; ×5 BH and AW currencies. **SN2:** SP upgrades, keep AE5. **SN3:** SN Levels (×1.5 SP each). **SN4:** ×3 SP. **SN5:** keep Tokens and Overworld tiles. **SN6:** SN tree. **SN7:** keep Galaxy tiles and Loop 10. **SN8:** no longer resets, but gain is /50. The last tree tile opens the Genesis portal. |
| 5 | Genesis + Tower | SN tree end | | | Units → Blocks (Block Level 1–8) → Tower Points → Tower Prestige → Tower Stages | **Stages:** 1 leaderboard; 2 new Tower tiles; 3 new Unit tiles; 5 ×100 Units; 8 ×500 Units; 10 Tower Prestige; 13 buy-max; 15 ×10 Units per stage up to 100; **20 God Offer**; 100 Genesis Extension (the Abyss). |
| 6 | God Offer | Stage 20 | Progress so far | | +1 Wish per reset. **Wishes:** #1 nothing resets except Loops and God Offer; #2 ×100 then ^2 all currencies; #3 instantly all 8 loops, milestones and 20 stages; #4 free VIP; #5 ×2 all (cap 100); #6 unlock Big Bang (costs 3). | Optimal orders "2136"/"2316", or "3126" after a Rift. |
| 7 | Big Bang (5 mini-baseplates) | Wish #6 | | | Speed-replay of Points (12 tiles), Prestige (10), Evil (10), Loops (5 milestones: L1 ×2, L2 ×1,000 P / ×5 PP, L3 ×10 EP, L4 P&E no reset, L7 Supernova), Supernova (4: ×3 all; ×20 PP / ×100 EP; instant loops; Memories) | Full Points tree: +1/s; ×1.5 (5 layers); ^2; ×10 (3); ×2 (2); new tiles; ^1.5; self-boost P^0.02; ×2 (3); ×25; ×5; unlock Prestige. |
| 7a | Memories | BB Supernova 4 | The 5 BB mini-plates | | 1 Memory per reset. OP Boost #1 (^10 all pre-BB currencies, 0.5 Mem); Automation (0.5 Mem); OP Boost #2 (×5 BB currencies, 1 Mem); Big Bang reset (1 Mem). | |
| 8 | Big Bang reset | Memory upgrade | All progress except Memory upgrades | | 5 milestones | **BB1:** ×10 BB currencies; all Supernovas and Wishes instantly. **BB2:** instant BB loops/supernovas; auto-collect Blocks. **BB3:** Wishes and BB resets no longer reset. **BB4:** BB no longer resets. **BB5:** Void. |
| 9 | Void | BB5 | | | Ø: #1 0.1 Ø/s; #2 gain grows with time in the Void; #3 ×2 (10 layers); #4 (Ø+1)^0.1; #5 ×2 speed; #6 total upgrades boost; #7 #3 max +5; #8 Ø^1.2; #9 World 2 (500M Ø) | The quickest world (about 20 minutes). Cycle 7 adds #10–#20; #20 unlocks Cycle 8. |
| 10 | Ascend (World 2) | 100 Qa ◎ | World 2 | | +1 AT$ per reset; buy-max; boosts ◎/Attack/Health/£/Shards | Battle Stages need Attack/Health raised with £. **Milestones:** 1 +0.1× ◎/stage; 4 £ per battle; 10 ×1,000 ◎; 15 ×4 AT; 20 ×10 AT; 30 ×5 shards; 50 ×25 AT; 100 ×2.5 ◎. "Cycles" tile costs 1.5M AT$. |
| 11 | Cycles | 1.5M AT$ | Void + World 2 (until milestones stop it) | | 1 Cycle per reset, 14 milestones | **C1:** ×5 Void/W2. **C2:** auto battles. **C3:** +1M HP, +200k damage, ×10 shards. **C4:** Void kept. **C5:** Ascend kept. **C6:** Challenges. **C7:** new Void tiles. **C8:** Rocket. **C9:** World 2 kept; Solar System. **C10:** Xenos milestone (×2 CM, ×3 Stars). **C11:** ×2 Energy. **C12:** ×3 Biomass/Energy. **C13:** ×3 W2/Space/Xenos/Forge currencies + 3 challenge branches. **C14:** the board shatters → Rift. |
| 12 | Rocket Part | Cycle 8 + W2 tiles | World 2 | | 1 part per reset; 4–5 resets build the rocket | A launch cutscene longer than 20 s takes you to Space. |
| 13 | Stars (Space) | CM$ tree | Only the CM$ amount; upgrades are kept | | Star tiles: ×2 CM (5 layers); CM 2× faster (5); Stars ×2 cheaper (5); new tiles; ×10 CM (5); CM × Stars^0.15 | **Planets:** P1 ×2 CM; P2 +1.5× CM per planet; P4 ×5 CM and clicking gives ^2 CM; P6 auto-generate Stars/s; P7 ×10 CM → Xenos. |
| 14 | Xenos, Forge | C10/P7, C11 | | | Biomass + DNA (Mother Bloom, 5 stages, fixed supply); Energy + Star Cores (28 forges, fixed supply; automated by C11) | Fixed-supply "complete the tree" currencies. |
| 15 | Rift | Cycle 14 (max Space, Xenos and Forge) | Every upgrade in the game except permanent and useless ones | Roll upgrades #4/#5 | Time Shards (6 in total); each Time tile costs 0.2, chosen among direct boosts, automation, or "Rift no longer resets area X" | A true "New Game+". Resets Black Hole Time Spent. |

**Badge funnel.** Share of the 3.60M "Welcome!" holders who reached each layer (badges.roblox.com):

| Layer | Players | Share |
|---|---|---|
| Prestige | 2.07M | 57% |
| Evil | 1.08M | 30% |
| Galaxy | 828k | 23% |
| Loop | 747k | 21% |
| Black Hole | 560k | 16% |
| Anti-World | 484k | 13% |
| Supernova | 385k | 11% |
| Genesis | 253k | 7.0% |
| Tower | 243k | 6.7% |
| God Offer | 219k | 6.1% |
| Big Bang | 112k | 3.1% |
| Void | 102k | 2.8% |
| World 2 | 101k | 2.8% |
| Space (badge added May 2026) | 40k | 1.1% |
| All challenges | 2.1k | 0.06% |

## Side mechanics and how they feed multipliers

- **RNG baseplate** (unlocked from the Prestige tree; more buffs at Loop 2). You roll a "title" buff and keep only the current one.
  - **Buff table:**

| Buff | Effect | Odds |
|---|---|---|
| Novice | ×1.5 P | 42% |
| Grass | ×1.4 EXP & PP | 20% |
| Roll Master | ×2 luck next roll | 20% |
| Levels God | ×1.5 EXP | 7.5% |
| Rich | ×1.2 all | 7.5% |
| Evil | ×2 EP | 2% |
| God | ×50 luck next roll | 1% |
| Master | ×2 P/EXP | 0.5% |
| Supernova | ×1.5 OW/Galaxy/BH/AW | 0.1% |
| Galactic | ×2 OW/Galaxy/BH/AW | 1 in 10k |
| Blackhole | ×2.5 OW/Galaxy/BH/AW | 1 in 100k |
| Divine | ×3 OW/Galaxy/BH/AW | 1 in 3M |
| Gambling | ×3 + ×2 luck + Plinko area | 1 in 77.77M |
| Infinity | ×1.1 every currency | 1 in 1B |
| Singularity | ×1.25 every currency | 1 in 500B |
| Origin | ×1.5 every currency | 1 in 2T |

  - **Roll upgrades:** ×1.5 luck (5 levels); −0.1 s cooldown; Auto Roll with a keep/skip filter per buff in Settings; ×2 luck (2 levels); cooldown /4 (4 levels, down to 1/2560 s).
  - The top roll count is 11.25B. You need 365M rolls just to get on the leaderboard.
- **Gambling area (Plinko):** unlocked by the Gambling RNG. Balls multiply or divide your $, and there is a hidden ×100 drop. 100k $ earns a badge.
- **Daily Points:** a 12 h claim of 2 DP. Spent on 25-layer ×1.5 boards for Points, Clicks, PP and EXP. Players say to invest in EXP first, because Levels boost 6 currencies. DP also buys bridges and extras (5 DP for the Underwater world).
- **Skill tree:** Player Level (activity XP, shown as a number next to your name) gives skill points. They buy walk speed (16–81), jump, sprint, a pizza tool and the "Sigma" title. Cosmetic.
- **Challenges (Cycle 6+):** gimmick debuffs with compounding ×2 rewards.
  - **Void branch (10), cumulative ×1,024 Ø:** −30% Ø; low walk speed; 95% blindness; 1 FPS; cats cover the screen; ^20 Ø (a joke challenge); upgrades scattered across 9 worlds in order; −99.8% Ø with constantly moving tiles; start at 0.01 Ø/s.
  - **Big Bang branch (8), ×256 ◎:** reach Evil/Loop/Supernova/Memories under 50–70% debuffs.
  - **World 2 branch (7), ×128 ◎:** reach Ascend/Cycles under up to 95% ◎ and 90% AT debuffs.
  - **Update 5 branches:** Whole-game (9), Xenos (5, ×32 Biomass), Forge (5, ×32 Energy).
- **Extra worlds:**
  - **Hell:** a 1e400k-Points tile and a Devil cutscene. Six "pact" lines × 3 levels × ×2 for Points, Clicks, PP, EP, EXP and CM. "Lord of Hell" gives ×4 HP$ and doubles the pacts.
  - **Hecker Mode:** a Settings toggle that drops you under the map. A joke tree with 22 tiles rewards a drivable Jeep and a title. Also an escape hatch from the Black Hole.
  - **Cat World:** stack two cat tools and stand on them, and "You feel too many cats" teleports you. Click wandering cats for Kitties. The final tile gives ×1.01 every currency plus a badge.
  - **The Abyss:** collect 5 coloured fragments hidden at the edges of 5 worlds and buy a tile behind the Tower (needs Stage 100). A cutscene socket the gems into a portal. Pearls tree → 100 DP, the Blink teleport tool, a title and a badge.
- **Secrets and jokes:**
  - A Secret Upgrade inside the Overworld house and a Sneaky Upgrade (white text in dark water in the Big Bang).
  - "Da useless tree" Alpha/Beta trees, the Bubbles tree, and a hidden "Lil Rat" button.
  - A Supernova tile whose description is a long trig/log identity that evaluates to "5 more SP$".
- **Titles and badges:** 28 badges and about 18 titles (Top 1–50 leaderboard titles, VIP, Tester, Abyssal…).
- **Leaderboards:** 21 boards across Points, Clicks, PP, EP, GP, Rocks, SP, Levels, Time, Rolls, Alpha, Robux, DE, DPE, DEE, BH time, AP, APP, AEP, Tower Stages and Gambling.
- **Creative Mode:** a separate sandbox place with 91 placeable objects. Players build their own currency/upgrade trees with a choice of 52 Roblox fonts.

## Automation unlocks (rough order)

1. **Minutes 2–5:** Clicker auto-clicker tile (about 30k Clicks). Real autoclickers are tolerated and expected.
2. **Before Evil:** Auto-Buyer baseplate (later renamed "Peak Upgrade Tree"). At 100 Oc it auto-buys and unlocks the first 4 Points tiles; the full auto-buyer tree costs about 100 Sp. A PP tile adds passive PP generation.
3. **Evil tiles:** keep Levels and keep the faster auto-clicker on Evil reset.
4. **Loop milestones 3–5:** Prestige/Evil no longer reset (spam-click the reset buttons). Keep Levels, the autoclicker and the auto-buyer tree.
5. **Inner layers:** the Tokens shop ("Dark Prestige no longer resets") and Anti-Evil milestones 2–5 progressively stop resets.
6. **Supernova 5/7/8:** keep Overworld and Galaxy tiles; Supernova stops resetting.
7. **Buy-max:** Tower Stage 13, Big Bang Prestige #3, and an Ascend tile.
8. **Wishes:** Wish #1 (nothing resets) and Wish #3 (instant loops, milestones and stages).
9. **Memory "Automation"** (0.5 Memory): auto-buy every tile in Galaxy, Black Hole and Anti-World, and auto-complete Tower stages. BB2 auto-collects Blocks; BB3 means Wishes never reset.
10. **Late game:** Cycle 2 auto-battle (toggleable); Cycles 4/5/9 stop resets; Planet 6 gives auto-Stars/s; the Forge auto-forges at C11.
11. **Rift Time Shards:** explicitly offer automation as one of three choices.
12. **Monetised skips:** "Skip <reset>" developer products (19–249 R$) perform a reset grind for you. Examples: Skip Prestige 29, Skip Loop 99, Skip Supernova 149, Skip God Offer 199, Skip Big Bang 249, Skip Cycle 129. There are also 15-minute currency boosts (45/99 R$).

## Offline and idle behaviour

- **No offline progress is documented** on the wiki or in videos (inferred: none). Progress only happens while you are in a server.
- **Idle in play is supported by:** per-second generators; autoclickers on reset buttons once layers stop resetting; auto-roll; Planet 4 (clicking the ground gives CM^2, so "use your autoclicker to AFK here").
- **Time-gated items:** the 12 h Daily Points claim, and Void gain that grows with time spent in the Void.
- **Leaderboards reward time:** Total Time Spent and Black Hole Time Spent both have boards.

## Number scale and notation

- **Early game uses short-scale suffixes:** K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, De, UDe…, and the vigintillion family. Players read "UVG", "DVG", "TVG", "QTVG" aloud near the Galaxy unlock, which is about 1e63–1e75 (inferred from the suffixes).
- **Later it switches to e-notation with suffixed exponents:** "e437.29k", "6.73e1.12m", "e301.56k", "1e3qa" (= 10^(3e15)). Tetration-ish values appear too: "1e19.92e203314" Units.
- **Reference values:**

| Milestone | Value |
|---|---|
| World 2 reached | About 1e400k Points (player report) |
| Hell gate | 1e400,000 Points |
| Old hardcap | 1e(1e15) |
| Top Points | 9.86e436,400 |

- **Big-number library:** must handle the log-of-log range. A Roblox port of something like OmegaNum/ExpantaNum (inferred).

## Pacing

**Opening hour (Superior's fresh save, video time):**

| Video time | Milestone |
|---|---|
| ~4:30 | First Prestige |
| ~7:20 | 1 Qa points, Daily Points unlocked |
| ~21:00 | First Evil reset |
| ~23:00 | RNG board |
| ~34:00 | Broken Portal |
| ~38:00 | Galaxy |

So roughly 30–60 real minutes to the second world (inferred).

**Player-reported totals:**

| When | Report |
|---|---|
| Feb 2026, content up to God Offer | "Finished the game in like 3–4 hours"; "maxed the game in 5h" |
| Feb–Mar 2026 | "Big Bang in 12 hours"; "about 12 hours and just got World 2"; "beat all of it in 14 hours, all badges"; "finally free after 15 hours"; "16 hours of gameplay, never AFK" |
| Update 5 | Dev claims 12+ hours, targeting 20+. With Xenos/Forge/Rift plus all challenges, likely 20–30 h (inferred). |

**Known walls (from comments):**
- Supernova ("the most annoying thing to go through", the top comment with 14 likes).
- Level requirements for Loops 9–11 ("Level 584, need 600").
- Genesis Units before buying the right tiles ("spent over 5 hours").
- Void Challenge 10 (pure waiting).
- Maxing all challenges, described as the second-longest part of the game.

## UI and visual style

**World layout**
- Low-poly Roblox 3D. Each world is a floating island or "baseplate" with colour-coded sub-plates:
  - Overworld: grass green; Auto-buyer: dark green; Prestige: grey/white tiles; Evil: red.
  - Broken Portal: magenta; Galaxy: purple with drills; Black Hole: black/purple.
  - Anti-World: blue with a hexagon floor, cyan trees and a mirrored upgrade pattern in the sky.
  - Supernova: yellow/orange with "candles" and sun motifs; Genesis: green with flowers.
  - God Offer: a white/gold palace with goblets, statues and a halo; Void: very dark purple with chains and horns.
  - Hell: crimson with lava cracks; Space: an invisible platform with planets and satellites.
- **Upgrade tiles** are flat rectangles on the floor, joined by grey "wires" to form the tree. A screenshot shows about 40 tiles on the Overworld plate, with cyan tiles for the Clicks branch and coloured plates in a row behind. Text is rendered on the tiles (SurfaceGui). One player complained that Roblox text rendering made the tile text glitchy or invisible.
- **Boards** are vertical signs for Levels, Milestones, Stats, Loops, Supernova and leaderboards. Update 5 framed them in stone/wood with neon edge lines, a floating themed gem or object on top (infinity sign for Loops, clock for Cycles, coin, crossed swords, trophy), and side shards.
- **Portals** are the main spectacle: spiral vortices per destination, with orbiting asteroids, rotating rings and crystal claws. The Hell portal has a demon face. There is a teleporter menu with a thumbnail per world, plus an "Extra" section.

**HUD and menus**
- Menu buttons: Stats, Settings, Shop, Achievements, Skill tree, Teleporter.
- Settings include Hecker Mode, walk speed (16–81) and per-buff auto-roll keep/skip toggles.
- Titles display under the player name, and the Player Level number sits beside the name.

**VFX and audio**
- The store page carries an epilepsy warning (flashing effects).
- Update 5 added animated water tides, seagrass, floating particles, shooting comets, spinning constellation rings and a sky-wide crimson portal in Hell.
- **Cutscenes:**
  - The Black Hole sucks you in.
  - Devil dialogue unlocks Hell.
  - The 5 fragments socket into the Abyss portal.
  - The rocket launch runs over 20 s.
  - At Cycle 14 the clock hands speed up and the Cycles board explodes into a space-time rift.
- **Audio:** an in-world boombox with 4 track buttons (a "Music" tile unlocks it). A YouTuber said "whoever chose the songs is absolutely cooking".
- **Fonts:** Creative Mode exposes 52 Roblox fonts (Fredoka One, Gotham, Builder Sans, Michroma, SciFi…). The main game's tile font isn't documented; likely Fredoka/Gotham (inferred).

## What players praise and complain about

**Praise**
- The satisfying, beginner-friendly start: "the tutorial just seems to make me extremely overpowered", "very structured progression".
- The sheer number of worlds and resets, each of which feels like a new game.
- The music.
- The Update 5 visual rework ("Best update ever!?").
- Secrets and easter eggs (Cat World, Abyss fragments, Sneaky upgrade).
- Leaderboards for grinders.
- The game is completable; videos titled "INSANE PROGRESS" and "I turned PRO".

**Complaints**
- Supernova is tedious, and Level walls around Loops 9–11 leave people "barely gaining EXP".
- Getting stuck in the Black Hole (fixed via the Hecker Mode exit).
- Hard-to-find secrets that need maximum screen brightness.
- Text rendering bugs.
- Leaderboard bugs and inflation: Black Hole boards are only reachable by hackers; the Tower softcap froze the top-10.
- Nerfs mid-progress (Wish #5 cap, Black Hole self-squaring removed).
- Removed content (Loop 12 obby, teamwork servers).
- "Sadly this game dying" (a lull between updates).

## Steal-worthy ideas (space-fantasy translation)

1. **The tree is the map.** Lay the upgrade tree out as a pannable star chart. Each reset layer gets its own coloured "constellation plate", and new plates and portals physically appear as you progress. Seeing the map grow is a reward in itself, and the chart doubles as navigation.
2. **Exponent keys gate the milestone ladder.** Make the main reset (for example "Warp Jumps", our Loop) need a rising threshold. Each next threshold can only be met by buying one exponent upgrade hidden in a side realm (Black Hole → "Event Horizon", Anti-World → "Mirror Nebula"). This is a clean design for introducing optional-looking worlds that are actually mandatory.
3. **Milestones that delete chores.** Each milestone either multiplies, unlocks a world, or says "X no longer resets" / "keep Y". Players feel automation as earned relief: Loop 3 makes Prestige and Evil reset-free, and Supernova 8 is a reset that "no longer resets but gives /50".
4. **Integer "choice" currencies.** Tokens, Wishes, Memories and Time Shards (0.2 each) are scarce picks where order matters; the community debates "2136 vs 3126". Use this for "Star Wishes" or "Relic Cores" at each big reset.
5. **Compressed replay layer.** The Big Bang rebuilds the first five layers as tiny 10–12-tile boards you speedrun with new numbers (+1/s, ×1.5×5, ^2, ×10×3, P^0.02 self-boost…). It is cheap content that feels nostalgic. Example: "Universe Rebirth: replay the Forge in miniature".
6. **Gacha "Omens" with a luck economy.** Rarities run from 42% to 1 in 2T. Luck multipliers come from upgrades and milestones (×1,000 at Loop 10). Add an auto-roll keep/skip filter, plus a luck cap that makes commons impossible, which is a fun late-game feel.
7. **Gimmick challenges with compounding ×2 rewards.** Examples: blindness (a fog-of-war nebula), 1 FPS (a "time dilation" stutter), moving tiles (drifting asteroids), tiles scattered across all worlds (a scavenger hunt), ^20 (a joke freebie).
8. **Hidden fragments → secret realm.** Five coloured shards tucked at the edges of earlier worlds unlock an "Abyss" side realm. Add joke trees (the "useless tree") that pay out only badges and titles, and one hidden tile per world.
9. **Rift as a true New Game+.** Shatter the final milestone board in a cutscene and reset everything. Give 6 Time Shards spent at 0.2 each on boosts, automation, or "realm X no longer resets". This hands the player authorship over which grind they skip.
10. **Fixed-supply "complete the tree" currencies** (DNA, Star Cores, Portal Fragments). The exact number needed to finish a tree gives clean closure. Starforge example: 28 "Star Cores" forged one at a time.
11. **Playful flavour.** The "$"-suffixed currency names and over-the-top tile names ("Lil bro thinks he's tuff", "Heck Da Game") give personality cheaply. A space-fantasy equivalent: whimsical tile names over a serious math backbone.

---

# Grass Incremental Simulator (GIS)

**Quick facts**
- **Title and developer:** "[🌱] Grass Incremental Simulator", by the verified group Unequal Games.
- **Created:** 2025-05-14. Updated 2026-10-01, and the store page still says "Early access".
- **Reach:** 41,353,420 visits and 610,797 favourites. 137,907 likes vs 5,821 dislikes (95.95%).
- **Concurrency:** peak CCU 10,435 on 2025-09-27; about 250 playing on the research date.
- **Sessions:** max 7 players per server; average playtime 17.0 minutes.
- **Genre:** Simulation > Incremental Simulator.
- **Store description:** "A relaxing lawn-trimming simulator 🌿… [🔪] Trim the grass! [🚀] Upgrade for faster trimming! [🔥] Unlock new islands and upgrades! … Join the Unequal Games group for in-game boosts!"
- **Badges:** only one ("Welcome", awarded 17.59M times), so there is no badge funnel.
- **Monetisation is heavy:**
  - **Gamepasses:** 2× Walkspeed 29, 2× Rebirths 99, 2× Grass Luck 99, 2× EXP 99, 2× Bronze 199, "[OP] Giant Trimmer" 2,500 R$.
  - **Developer products:** stackable ×2…×16,368 Grass (49–1,199 R$), ×2…×2,048 Bronze/Silver/Muscle/Wood, ×2…×64 Seeds; "Auto Trim" 39; "Auto Click" 39; "Auto Collect Seeds" 39; Diamonds premium currency (10 for 39 up to 1,000 for 1,799); single stat upgrades (EXP 4 R$, Pop 7, Muscle 14, Growth Rate 14, Silver Chance 29); "Skip Stat Refund Timer" 5; "Skip Restock Timer" 9.
- **Name confusion:** guides call it "Grass Incremental". There is an unrelated "Grass Incremental" by Speedora, and the far deeper "Grass Cutting Incremental" by LethalDolphin.

## Core loop (first 5 minutes)

- **Setup:** you spawn on Island 1 next to a dirt plot, holding a saw/trimmer. Grass blades spawn on the plot at the growth-rate interval, up to a cap.
- **Walking into grass cuts it automatically.** The blade has a radius drawn as a spinning disc around you. Each blade gives Grass currency plus EXP, and the plot regrows.
- **Spend Grass on the Grass Upgrades board:**
  - Grass Value (worth per blade)
  - Grass Amount (cap on the plot)
  - Growth Rate (spawn speed)
  - Blade Radius
- **Rare mutated blades** spawn randomly and are worth far more. Quacks' fresh save: normal blade 5, Silver 50, "dude, gold is worth so much", "Mega/Super" blades worth 50, and a "mega super blue" worth 19,000.
- **Levels:** EXP per blade raises your Level. Level 5 unlocks the Rebirth board; a Level 15 gate blocks an area. Rank titles change with level ("Rocky" around Lvl 5, "Mythic" around Lvl 89).
- **Rebirth** is "1,000 grass = 1 rebirth" (×3 with early boosts). Superior: "One rebirth is 1k grass and it just stacks up." Rebirth points buy the rebirth upgrades: ×2 grass (up to ×64), growth rate, expanded blade.
- **Grass upgrade prices don't reset on rebirth:** "these grass upgrades stay the same price even though we're rebirthing." You re-buy cheaply and quickly.
- **Island 2 costs 100 rebirths.** Fresh F2P players reach it in about 5–6 minutes.

## Currencies and resources

| Currency | How it's produced | Spent on |
|---|---|---|
| Grass | Cutting blades: Value × mutation × multipliers | Grass board, island pads, Tiers, Bronze threshold |
| EXP → Level | EXP per blade (2× EXP pass) | Level gates; Pops per click scale with Level; code × Level; Stat points (1 per level, Island 3+) |
| Rebirths / rebirth points | Convert Grass at a fixed rate (1k = 1, multiplied). Tier 4 grants 10% per second. | Rebirth board; Island 2 (100); pads (25k, 10M, 100M, 500M, 1 Qn for Bronze) |
| Pops | Click the "pop cat" on Island 2; Pops per click = Level (e.g. 24 at Lvl 24); auto-click levels | Pop upgrades (×2/×4/×8 grass value, rebirth value); hiring/upgrading Programmers (100k pops) |
| Code | Programmers type code per second (first one 5/s) | Invested into Grass Value / Rebirth Value / Code Value sinks with "very large diminishing returns"; 100M code unlocks Tiers |
| Tier (1–6) | Spend 100T grass (T1) … about 225T (T5) and 10 Qa to board the balloon | Each tier resets progress and multiplies all stats by tier |
| Bronze (points) | Island 3: "reset progress except Tiers and Level for one Bronze point"; needs 1 Qn rebirths; Boosters raise bronze per reset 4→8→16 | Bronze board (×5 everything, auto-code, auto-pop, stats, merchant, boosters) |
| Stat points | 1 per Level after "unlock stats" (Bronze) | EXP, Pop, Muscle, Growth Rate, Silver Chance (max levels); full refund every 5 min (paid skip) |
| Island keys | Island 4 key: 0.1% drop per blade once you own 10 Sx grass | Opening Island 4 |
| Silver | Island 4: 0.25% chance per trimmed blade; Silver Chance upgrades ×5 → 1.25% | Silver board, mythical merchant (5k silver) |
| Wood | Stand inside a circle next to a tree and it auto-chops; wood per chop is multiplied by Muscle | Wood board (×10 wood/silver; ×100 wood + ×10 silver at 5M; completion at about 1–2B wood) |
| Muscle | Bench press: click or autoclick "workouts"; workout time doesn't reset on Island 5 | Multiplies wood per chop |
| Seeds | Island 5: collect seeds that spawn in the field (Auto Collect Seeds product) | Seed upgrades (×4 seed, ×4 spawn, ×2 seed spawn rate, ×2/×100 silver, ×100 bronze); filling the "golden grass gauge" |
| Mutation tier | Island 5: the gauge at 100% plus a 25 Oc grass upgrade promotes the base mutation silver→gold→diamond→ruby (4 times) | Each promotion resets Island 5 (grass, rebirths, bronze, silver, wood) and gives +×3 silver |
| Diamonds | Robux only (inferred: premium shop / merchant currency) | |

**Mutations:** Silver, Gold, Diamond, then Ruby on Island 5. Reported values conflict:
- **Quacks:** silver ×10 over a normal blade.
- **ImCadeBlox:** silver 2,000 and gold 10,000 when normal was low, and a diamond gave 30,000.
- **Island 5 guide:** "ruby probably 10× silver".
- Extra rarity names show up as "mega", "super", "blue" and "pink" grass.
- **Model:** roughly ×5–×10 per rarity step, with luck upgrades and a 2× Grass Luck pass raising odds (inferred).

## Upgrade structure

- **Boards:** big wall boards per island (Grass Upgrades, Rebirth Upgrades, Pop Upgrades, Programmers, Code sinks, Tiers, Bronze, Stats, Silver, Wood, Seeds). Each line is a levelled upgrade with Buy / Buy-Max.
  - Commenters note "you can get way more upgrades than intended if you spam the max button with an autoclicker" (a bug).
  - Upgrades have hard max levels, e.g. "max level with ×64", "Level 25/25".
- **Numbered pads:** a linear chain of walk-on pads labelled island-index ("1-1 … 1-11", "2-27", "3-5", "3-14"). You step on a pad to buy it ("plop our butts on this button"). Each pad has one price and one effect:

| Pad / board | Cost | Effect |
|---|---|---|
| Island 2 pad | 500k grass | ×3 grass |
| | 2.5M | rebirths boost grass value |
| | 7M | walk speed |
| | 25k rebirths | ×2 rebirths |
| | | "grass and rebirth boosted by playtime" |
| | 100M rebirths | ×3 pops |
| | 500M rebirths | unlock Programmers |
| | 3B grass | ×3 pops |
| | 50B grass | ×5 pops & ×5 code + new upgrades |
| Code/pop sinks | 1B | third code upgrade |
| | 100M code | Tiers board |
| Late pads | 25 "SP" | ×2 grass |
| | 37.5 SP | ×5 grass |
| | 10k bronze | merchant luck |
| | 5k bronze | half restock time |
| | 3 Qd plus 1 N rebirths | "silver multiplied by pops" |

- **Cross-multiplier web** (Island 2 economy):
  - Pops × programmer typing speed.
  - Code × number of auto-clickers.
  - Code × Level.
  - Manual pops ×100.
  - "Programmer upgrades 90% cheaper" (later 99.9%).
  - Quacks: "Everything is multiplying everything. I don't know what's going on anymore." That confusion is part of the appeal.
- **Cost scaling:** not documented. Prices observed: 160 → 320 grass for early upgrades (×2 steps); 100k → 110k pops per programmer level (+10%). Geometric costs with per-upgrade ratios around 1.1–2 (inferred).
- **Diminishing returns:** code investment is sublinear ("very large diminishing returns").
- **Hard caps:** max levels per upgrade and merchant items capped at 25/25.
- **Gamepass value fades:** "2× rebirths basically useless past island 3".

## Reset layers, in order

| # | Layer | Unlock | Resets | Keeps | Reward |
|---|---|---|---|---|---|
| 1 | Rebirth | Level 5 (board) | Grass and grass-upgrade purchases (prices unchanged) | Level, Pops (Cade: "rebirthing doesn't reset my pops") | Rebirths at 1,000 grass each × multipliers. Tier 4 auto-gains 10%/s. |
| 2 | Island travel | Island 2: 100 rebirths; Island 3: Tier 6 (hot-air balloon, about 10 Qa grass); Island 4: key (0.1% per blade at 10 Sx); Island 5: final update (Oct 2025) | Nothing | | Each island is a new pad chain and new boards |
| 3 | Tier (6 steps) | 100M code unlocks; T1 costs 100T grass | "Resets everything" except Level (and Tier) | | All stats ×Tier. **T1:** ×2 stats, pop upgrades pricier. **T2:** pops, growth rate and code × tier; programmer upgrades "super cheap". **T4:** auto +10% rebirths/s. **T5:** auto-buy grass and rebirth upgrades without spending. **T6:** board the balloon to Island 3. |
| 4 | Bronze | Island 3; needs 1 Qn rebirths | Everything except Tiers and Level | | +1 Bronze point (Boosters: 4→8→16 per reset). First upgrades: ×5 everything; auto-add code; auto-buy pop upgrades; "begin each bronze with one programming skill and one auto-click"; unlock stats; 25 bronze → ×1.25 stats; auto-buy pads 1-1, 1-2, 1-4. |
| 5 | Island 5 mutation promotion | Gauge 100% + 25 Oc grass | Island 5 currencies (grass, rebirths, bronze, silver, wood) | Muscle workout time | Base mutation silver→gold→diamond→ruby; +×3 silver each; "Ruby = completed the game". |

## Side mechanics and how they feed multipliers

- **Pop cat** (a clicker minigame on Island 2): Pops buy ×2/×4/×8 grass value and rebirth value, and feed Programmers.
- **Programmers** (an idle converter): pops in, code per second out, and code goes into multiplier sinks.
- **Merchant:** a dancing NPC on Island 3/4 with randomised limited stock (XP, growth rate, muscle, silver chance…).
  - It restocks every 2 minutes, and upgrades halve the timer and add "merchant luck".
  - A "mythical merchant" appears at 5k silver.
  - Items cap at a max level, giving a check-back loop.
- **Stats / talent tree:** points from levels go into EXP, Pop, Muscle, Growth Rate and Silver Chance. They are refundable every 5 minutes, so you respec between "grass mode" and "bronze mode" (Superior's strategy).
- **Bench press and tree:** AFK stations. Stand in a circle to chop wood; autoclick the bench for Muscle, which multiplies wood.
- **Free daily chest:** on a small island left of spawn, requires joining the group. It pays grass "usually equal to double your current grass amount" (Deltia's Gaming). Group members also get permanent boosts.
- **Leaderboards:** "Most grass" and "Daily most levels". Top levels about 205; 88 put Quacks at roughly 36th in Jan 2026.
- **Hidden shortcuts and secrets:** an "obby" jump between islands, an upgrade that "literally gives you nothing" and costs 0 bronze, and bunnies and fox critters roaming the plot.
- **Giant Trimmer** (2,500 R$): a massive blade disc. "It just looks stupid… but 10 Sx" (Cade).

## Automation unlocks

| When | Automation |
|---|---|
| Island 2 | Auto-click levels on the pop cat (3 clicks/s and up) |
| Tier 4 | Passive 10% rebirths/s |
| Tier 5 | Auto-buy grass and rebirth upgrades for free |
| Bronze | Auto-add code, auto-buy pop upgrades, auto-buy programmers (1T code), auto-buy pads 1-1/1-2/1-4 |
| Island 4 | Auto wood chopping by standing in the circle |
| Free (also sold) | "Auto Trim" (aim-assist: it steers you to grass within range, "literally aimbot but for grass"), also sold for 39 R$ |
| Paid | Auto Click (39 R$), Auto Collect Seeds (39 R$) |

Cade: "it's pretty much just a race of how fast can you automate everything." By the end of Island 3: "I don't even need to cut grass anymore… touch this, click, click, run around."

## Offline and idle behaviour

- **No offline progress was found** (inferred none). An unreliable blog says "no true offline progression."
- **Idling happens in-server:** Tier-4 passive rebirths, programmers' code per second, autoclicked pops and bench press, Auto Trim, and AFK wood circles.
- **Auto-reconnect:** "this game's got auto reconnect… auto rejoin after 20 minutes" (Superior). That supports long AFK sessions (inferred: deliberate retention/CCU design).

## Number scale and notation

- **Short-scale suffixes all the way up:** K, M, B, T, Qa, Qn/Qi, Sx, Sp, Oc, N(o), De, U/D/T…-vigintillion ("UNVG" appears on the Most-grass leaderboard, about 1e90 (inferred)).
- **Cut popups are raw:** floating per-cut numbers render as raw comma or e+ strings ("1,0,652,…,572e+26" on an Island 5 thumbnail).
- **Reference values:**

| Context | Values |
|---|---|
| Endgame snapshot (Quacks, Jan 2026) | 6 Oc rebirths, 1 Sx grass, Level 88 |
| Island 5 promotion cost | 25 Oc grass |
| Superior at "max" | Level 147, 229 stat points, rebirths in the Oc–N range |

The scale is far smaller than UUT, at most about 1e30–1e90.

## Pacing

**Fresh free-to-play save (Superior, "all in real time"):**

| Time | Milestone |
|---|---|
| ~1:30 | Level 5, Rebirth board |
| ~3:00 | First rebirth |
| ~5:40 | Island 2 (100 rebirths) |
| ~11:20 | 1,000 rebirth points (rebirth board maxed) |
| ~13:00 | Pop cat |
| ~16:30 | Programmers |
| ~21:15 | Tiers unlocked |
| ~22:40 | Tier 1 |

**Later stages:**
- **Tier 6 and Island 3:** "relatively easy… about half an hour, maybe 40 minutes" (Superior, with some passes).
- **Islands 3–4:** a few hours with Robux multipliers (inferred from 25-minute edited videos by Cade and Quacks, who bought ×4–×64 grass).
- **Island 5:** "basically all you have to do is grind like half an hour of grass" per promotion, ×4 (silver→ruby).

**Total:** commenters say "pretty fast to complete" and "quite easy to complete without buying anything". One player said "beat the game with island 5, took me 2 months" (casual sessions). A content-farm blog claims 20–40 hours (unverified). Realistic F2P full clear is about 6–15 hours (inferred).

**Average session:** 17 minutes (Rolimons). The game is built for short, relaxing bursts.

## UI and visual style

**World and avatar**
- Bright, saturated Roblox: lime-green grass blades (pink on Island 5) on brown dirt plots and floating islands.
- A big silver circular saw blade on a pole, held first-person or third-person. The blade disc grows with Blade Radius, and with the Giant Trimmer it dwarfs the player.

**Upgrade presentation**
- Upgrades sit on large in-world boards (SurfaceGui walls) with Buy / Max buttons.
- Walk-on pads are labelled "1-11" and similar.
- Gated walls and areas show requirements: "Level 15 to unlock", "Tier 6".
- The hot-air balloon is the visual tease for Island 3. Players repeatedly mention it as motivation: "I must know where that hot air balloon takes me."

**Feedback and juice**
- Number popups on every cut, and a crunchy cutting sound. Quacks: "This is so satisfying… the sound. All the numbers popping up. All the blades getting absolutely obliterated."

**HUD**
- Grass, rebirth and level counters, a Shop button with a red "!" badge, and a "free daily redeems" prompt.
- Gamepass purchase pop-ups were added in a later update and are a frequent complaint: "I wish you could turn them off."

**Characters**
- The merchant NPC flosses, a programmer NPC types at a desk, and a cat sits on the pop board.
- Bunnies and a fast fox roam the plot. Other players run around with their own saws and can "chop you into bits".

## What players praise and complain about

**Praise**
- Relaxing and satisfying: cutting feel, sounds, number popups.
- Fast early progress, "quite a quick game in comparison to other incrementals".
- Completable without paying, with clear goals (balloon, islands).
- "Most popular incremental on Roblox at the moment" (Superior, Sept 2025).
- The calm vibe, and a 96% like ratio.

**Complaints**
- Gamepass pop-ups are intrusive. Monetisation is aggressive (stackable ×16,368 grass products) and passes become useless later.
- Too short or easy for incremental veterans: "try [AWAKENING] Grass Cutting Incremental instead, it's 1000× better" and "there's a harder one, but it has better graphics".
- Unclear onboarding for late systems: "how do you get silver?", "how to get the Island 4 key?", "Key 4 doesn't work", "what do boosters do?", "how did you get 2-27?".
- Waiting for content after Island 5 ("I guess we just have to wait for a brand new update").
- An exploit: spamming Max with an autoclicker overbuys.

## Steal-worthy ideas (space-fantasy translation)

1. **Harvest field → "stardust/asteroid field".**
   - Nodes spawn at a growth interval up to a cap on a canvas.
   - The player's harvester has a visible collection radius (a tractor beam or orbiting blade ring) that auto-collects on contact.
   - The four starter upgrades map one-to-one: Value, Amount (cap), Growth Rate (spawn interval), Radius.
   - Keep the "upgrade prices don't reset on rebirth" rule so re-buying is snappy.
2. **Rarity mutations on harvested nodes.** Silver, Gold, Diamond, Ruby become Iron, Gold, Prismatic, Void-touched asteroids at about ×5–×10 each, with Luck upgrades. Add a late "mutation promotion" prestige: fill a gauge by collecting seeds/fragments, then promote the base rarity so every node is one tier higher.
3. **Rebirth as a fixed-rate exchange** (1,000 grass = 1 rebirth) rather than a √ formula. It is easy to read, and Starforge can still layer multipliers on the rate. Pair it with "rebirths also boost value".
4. **Island chain with numbered pads.** Each new star system is a linear chain of labelled nodes ("2-27"). Each one costs one resource and gives one punchy effect (×3, walk speed, a new unlock). Gate jumps with a visible teaser (a balloon, or "a derelict warp gate glowing on the horizon").
5. **Coupled mini-economies.** A clicker pet (the pop cat becomes a "Star Kitten" that purrs Pulsars) feeds an idle converter (programmers become "Astro-Scribes" writing Runes/Code). Converted output is dumped into diminishing-returns multiplier sinks. Cross-multipliers like "Code × autoclickers" or "Pulsars × typing speed" create that "everything multiplies everything" joy.
6. **A six-step mini-prestige ("Tiers")** where each step multiplies all stats by tier and unlocks one automation (passive rebirth per second, then auto-buy). It ends in a concrete physical unlock: the next island or system.
7. **Respec-able stat points from levels.** Allow a refund every N minutes (5 min in GIS) so players swap builds per goal, e.g. "mining build" vs "smelting build".
8. **Restocking merchant** (a wandering trader ship) with limited stock, a 2-minute restock, max-level items, "merchant luck" and restock-time upgrades. Add a rarer "mythical merchant" tier.
9. **AFK stations:** stand in a ring to auto-harvest a resource (wood becomes Nebula Gas), and a workout/charge station whose output multiplies it (Muscle becomes Reactor Charge). Design these idle spots explicitly.
10. **Rare key drops:** a 0.1% drop per node once a threshold is met gates the next region. That creates a lottery moment inside the grind; add pity timers to avoid frustration (inferred improvement).
11. **Daily chest worth "2× your current amount"**, which scales with progress.
12. **Do NOT copy** the intrusive purchase pop-ups or the pay-to-skip stacks. The ad-free web version is a selling point (inferred).

---

# Grass Cutting Incremental (GCI), brief

**Which game is which.**
- **GCI is the Roblox game "[AWAKENING] 🌱 Grass Cutting Incremental 🌱"** by LethalDolphin. Created 2022-04-06; 29.99M visits, 82,126 favourites, max 8 players, currently v0.9 "Awakening".
- **MrRedShark77's web game is "Really Grass Cutting Incremental" (RGCI).** It is a fan web adaptation "inspired by Grass Cutting Incremental (Roblox)", playable at mrredshark77.github.io/Really-Grass-Cutting-Incremental.
  - Per the GCI wiki it reached v0.5.3, was "rewritten to a UI game in November 2024", and was delisted from GitHub Pages in June 2026.
  - An "extended" fork by aarextiaokhiao is on GitHub; the formulas below come from that source.
- **UUT (a Roblox game) almost certainly means the Roblox GCI** (inferred). A board in UUT's World 2 reads "Ty GCI and UTI".

**Core loop**
- **Roblox GCI:** walk over grass to cut it.
- **RGCI (web):** grass squares spawn on a canvas. You hover the mouse and a square "cut range" box (base 50 px) cuts every blade it touches. Each cut gives Grass, XP, and later TP (tier points).
- **Starting stats:** cap 10 blades, spawn every 2.5 s. The store page boasts "numbers go up!!!"

**Core formulas (RGCI source, js/main.js and js/upgrades.js)**
- **Grass per cut** = 5 × GrassValue × 2^Tier × (many layer multipliers); exponent upgrades apply late.
- **XP per cut** = 3 × XPupgrade × 2^Tier × …
- **Grass cap** = 10 + MoreGrass levels + perks…, max 4,000.
- **Spawn interval** = 2.5 s ÷ speed multipliers, clamped to 0.0002–10 s.
- **Auto-cut:** every 5 s, −1 s per level. Costs 1e3 × 10^i grass.
- **Grass upgrades:**

| Upgrade | Cost | Max level | Effect |
|---|---|---|---|
| Value | 10 × 1.2^i | 1000 | (i+1) × 2^floor(i/25), i.e. doubled every 25 levels |
| More Grass | 25 × 1.4^i | | +1 cap |
| Grow Speed | 100 × 1.75^i | 250 | +10% |
| XP | 1e3 × 1.3^i | | Same shape as Value |
| Range | 1e4 × 2^i | 5 | +10 px |

- **Perks:** 1 per Level, at 1 perk each: Value Perk +20% × Level, Cap +10, Grow +25%, XP +20% × Level, Range +10.
- **Level requirement** = 50 × 2.7^(L^0.75) XP. Extra scaling starts at L200, L700 and L1e5.
- **Tier requirement** = 100 × 3^(T^1.2) TP. Tier multiplier = 2^T on grass and XP.
- **Reset gains:**
  - **Prestige** (RGCI at Level 30; Roblox at Level 31): PP = 1.1^(L−29) × (L−29) × ∛max(bestGrass/1e9, 1). The Roblox wiki gives floor(9 × 1.4^(L/10) × 1.15^n), where n is orders of magnitude of grass since the reset.
  - **Crystallize** (Level 100/101): Crystals = 1.1^(T+1) × (T+1) × ∛max(bestPP/1e7, 1).
- **Platinum:** white grass with a 0.5% chance per spawn (Tier 3+), with its own currency and upgrades. Moonstone is 0.5% of platinum blades.

**Reset layers (Roblox GCI, Universe 1)**
- **Order:** Prestige (L31, unlocks Tiers) → Crystallize (L101, then Accomplishments on the 3rd) → Grasshop (L201, milestones to GH64; the requirement rises +1 level per hop to GH8, then +10) → Steelie (GH8 + L221).
- **Steelie unlocks the Factory:** Foundry, Generator, Charger, Assembler, Decelerator (Anti Realm), Refinery, Rocket Launch Pad, Oil Drilling Rig, Star Accumulator.
- **Then:** Anonymity / Liquefy (Anti Realm) → Rocket Part → Galactic (Space; Stars, Star Chart) → Grass-Skip → Funify → Sacrifice (Dark Matter) → Normality → Form Ring → Astrolabe → Quadrant → Planetary → Grass Jump → Constellation → Supernova → Sunrise → Sunset → Twilight… → **Loop**, the final Universe-1 layer (v0.8), followed by Universe 2.
- **Scale:** the fan wiki has 411 pages. A YouTube title calls GCI the "longest game on ROBLOX".

**Automation (RGCI):**

| Upgrade | Cost |
|---|---|
| Autocut, from grass | 1e3 |
| Autocut Value / Amount | PP |
| Grass Upgrade Autobuy | 1e3 PP |
| Keep perks on Prestige | 1e4 PP |
| Prestige Autobuy | 50 Crystals |
| "EL": Grass upgrades no longer spend grass | 150 Crystals |
| Keep perks on Crystallize | 500 Crystals |
| Passive PP 1%/s | 1e40 PP |
| Passive Crystals 1%/s | 1e42 PP |

**Offline:** Roblox GCI has "OFFLINE progress after buying a certain upgrade!" (store description).

**UI (RGCI)**
- A 7×7 grid "map" of panels navigated with WASD or arrow keys. Grass Field is the centre; Auto, Prestige/Crystal, Grasshop, Challenges, Stats, Options and Time are neighbouring cells, with a separate "space" map later.
- Top bars show Level (cyan) and Tier (yellow) with percentages, plus "+X/cut" and "cap/max (+N/s)" readouts.
- Grass colour changes with Tier (green, pale green, red, orange, yellow… then a hue cycle).
- Hotkeys for resets (P = Prestige).

**Steal-worthy ideas from GCI/RGCI**
1. Hover-to-harvest canvas with a visible cut box. It is the most natural web translation of a walk-and-collect game (stardust field + cursor tractor beam).
2. Node colour encodes tier/prestige depth, so the field visibly evolves.
3. "No longer spends" (EL) upgrades as a distinct automation tier between auto-buy and full idle.
4. Effects that double every 25 levels inside an upgrade, giving mini-milestones within one line.
5. Perks: 1 point per level into small fixed-cost perks, kept or lost on reset by toggle.
6. Spatial panel-map navigation with WASD, which fits the "ship travelling between stations" theme.
7. Offline progress as an unlockable upgrade, which turns a QoL feature into a reward.
8. A rare off-colour node (Platinum) with its own mini-economy.

---

## Sources

**Untitled Upgrade Tree**
- https://www.roblox.com/games/113814738390716/Untitled-Upgrade-Tree
- https://games.roblox.com/v1/games?universeIds=7699580568,8646444640 (Roblox API: description, visits, created/updated, max players)
- https://games.roblox.com/v1/games/votes?universeIds=7699580568,8646444640
- https://badges.roblox.com/v1/universes/8646444640/badges (badge names, descriptions, award counts)
- https://apis.roblox.com/game-passes/v1/universes/8646444640/game-passes
- https://apis.roblox.com/developer-products/v2/universes/8646444640/developerproducts
- https://www.rolimons.com/game/113814738390716
- https://untitled-upgrade-tree-roblox.fandom.com/ (official fan wiki, read via api.php wikitext). Pages read: Main Page, FAQ, Overworld, Currencies, Baseplates, Milestones, Galaxy, Blackhole, Anti-World, Supernova, Genesis, Offer to God, Big Bang, Void, World 2, Cycles, Space, RNG Buffs, Challenges, The Abyss, Hell World, Hecker Mode, Cat World, Leaderboard, Fonts, All objects in Creative Mode
- https://untitled-upgrade-tree.fandom.com/ (old wiki, read via api.php). Pages read: Badges, Baseplates, Basic Baseplate, Values, Worlds, Titles, RNG Boosts
- https://static.wikia.nocookie.net/untitled-upgrade-tree-roblox/images/0/07/Screenshot_2026-09-12_at_09.46.51.png (Overworld layout screenshot)
- https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=8646444640 (store thumbnails)
- https://www.youtube.com/watch?v=Vvf0vTU3D6Y (Superior, "I turned PRO in Roblox Untitled Upgrade Tree"; transcript and comments)
- https://www.youtube.com/watch?v=yQOGB8eaMg8 (Noid/AxoFoundYou, "Top 5 mistakes"; transcript and comments)
- https://www.youtube.com/watch?v=XwNaQU2za8E (comments)
- https://www.youtube.com/watch?v=LtZNo-zOv50 (comments)
- https://www.youtube.com/watch?v=GKUgR2Pfa9s (comments)
- https://www.youtube.com/results?search_query=untitled+upgrade+tree+roblox (video titles)
- https://rowatcher.com/games/6749892429/everything-upgrade-tree (EUT context)

**Grass Incremental Simulator**
- https://www.roblox.com/games/133086043677134/Grass-Incremental-Simulator
- https://games.roblox.com/v1/games?universeIds=7699580568,8646444640
- https://badges.roblox.com/v1/universes/7699580568/badges
- https://apis.roblox.com/game-passes/v1/universes/7699580568/game-passes
- https://apis.roblox.com/developer-products/v2/universes/7699580568/developerproducts
- https://www.rolimons.com/game/133086043677134
- https://deltiasgaming.com/roblox-grass-incremental-a-beginners-guide/
- https://deltiasgaming.com/roblox-grass-incremental-codes/
- https://www.rosenberryrooms.com/grass-incremental/ (low reliability; used only with caveats)
- https://www.ofzenandcomputing.com/grass-incremental-tips-tricks/ (low reliability; island thresholds and mutation multipliers contradicted by videos, so not relied on)
- https://www.youtube.com/watch?v=xIZ4kiV6-MY (Superior, "Starting Over as a NOOB in Roblox Grass Incremental"; transcript)
- https://www.youtube.com/watch?v=Zrn25ctEdiQ (Superior, "I turned PRO in Roblox Grass Incremental"; transcript and comments)
- https://www.youtube.com/watch?v=vJUspPHhSck (Quacks, "I Unlocked MAX LEVEL Grass Cutter in Roblox!"; transcript and comments)
- https://www.youtube.com/watch?v=mcmTqq99Y5c (ImCadeBlox, "I cut 1 million blades of grass…"; transcript and comments)
- https://www.youtube.com/watch?v=3DwCzHQFI2k ("Grass Incremental | Island-5 Update and Guide"; transcript)
- https://www.youtube.com/watch?v=aX1P6whmem8 (Leggitte, Island 5; thumbnail only, transcript is music)
- https://www.youtube.com/watch?v=mhBB7GtMrFg (Island 4; transcript is music only)
- https://i.ytimg.com/vi/aX1P6whmem8/maxresdefault.jpg (UI and popup notation glimpse)
- https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=7699580568

**Grass Cutting Incremental / Really Grass Cutting Incremental**
- https://games.roblox.com/v1/games?universeIds=3478678937,6749892429 (GCI and EUT store descriptions and stats)
- https://roblox-grass-cutting-incremental.fandom.com/ (via api.php). Pages read: Roblox Grass Cutting Incremental Wiki (main), Reset Layers, Really Grass Cutting Incremental, Prestige, Grass, plus the full page list
- https://github.com/aarextiaokhiao/Really-Grass-Cutting-Incremental (branch "extended"). Files read: js/main.js, js/upgrades.js, js/features/grass.js, js/features/pp.js, js/features/crystal.js, js/calc.js, js/reset.js, js/map.js, README.md
- https://api.github.com/users/MrRedShark77/repos (to confirm MrRedShark77's repo list; RGCI is no longer listed there)
- https://www.youtube.com/watch?v=-2AkaHY-CbA (description: GCI place link)
