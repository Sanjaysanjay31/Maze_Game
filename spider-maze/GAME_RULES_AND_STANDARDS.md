# 🎮 Spider Maze: Official Game Rules, Architecture & Level Design Standards

This document establishes the official game mechanics, coordinate mathematics, cooperative puzzle logic, hazard balancing, and video recording standards for all present and future levels of **Spider Maze** on the channel **Global Games with SK**.

---

## 📐 1. Grid Coordinate Mathematics

The game world operates on a discrete grid where each logical corridor cell `(i, j)` expands into a $3 \times 3$ block sub-grid:

| Component | Coordinate Formula | Explanation |
|---|---|---|
| **Cell Center (Hero Pos)** | $X = 3 \times i + 2$, $Y = 3 \times j + 2$ | Center point where heroes, stars, switches, and items reside. |
| **Cell Interior (Free Path)** | $x \in [3i + 1, 3i + 2], y \in [3j + 1, 3j + 2]$ | 2-block wide clear walkable corridor floor (`WALL = 0`). |
| **Horizontal Wall (Row Gate)** | $y = 3j + 3$, spanning $x \in [3i + 1, 3i + 2]$ | 2 blocks separating cell `(i, j)` and cell `(i, j+1)`. |
| **Vertical Wall (Col Gate)** | $x = 3i + 3$, spanning $y \in [3j + 1, 3j + 2]$ | 2 blocks separating cell `(i, j)` and cell `(i+1, j)`. |

---

## 🚪 2. Blocker Wall & Dynamic Gate Standards

### Unified Normal Walls vs. Distinct Blocker Walls:
1. **Normal Maze Walls**:
   - Across all levels, all normal maze walls maintain the identical Cobalt Blue metallic aesthetic (`theme: "blue"`), matching Level 1 and ensuring consistent visual branding.
2. **Specific 2-Block Route Gates (`gates`)**:
   - The 2 blocks that block a hero's path to the next section **MUST NEVER** look like regular walls.
   - **Visual Appearance**:
     - Heavy dark iron base (`#0c1322`).
     - Diagonal high-visibility hazard caution stripes (`#ffd23f` warning yellow and dark slate).
     - Bold glowing crimson security frame (`#ff3b30`).
     - Pulsing central red LED electronic lock beacon.
   - **Rendering Rule**:
     - Gate blocks are excluded from normal wall tile drawing (`if (!isGate)`).
     - When locked (`gate.open = false`), the gate blocks are drawn with high-contrast barrier graphics.
     - When unlocked by a switch (`gate.open = true`):
       - Explosion dust cloud (`VFX.add("cloud", ...)`) + sparks (`VFX.add("spark", ...)`).
       - Screen shake (`shake = 0.85`).
       - Blocks convert to passable floor (`WALL[gy][gx] = 0`).
       - The blocked route vanishes, revealing a clear, open corridor!

---

## 🔀 3. Asymmetric Route Design (Character 1 vs Character 2)

Hero 1 (Spider-Man) and Hero 2 (Ghost Spider) **must never have identical or symmetric gameplay**:

1. **Spider-Man's Path**:
   - Trapped initially behind Gate 1.
   - Vertical drops, sharp corner zig-zags, and timed laser corridors.
   - Task: Reach Switch 2 to unlock Gate 2 for Ghost Spider.
2. **Ghost Spider's Path**:
   - Starts free in upper right sector.
   - Long sweeping horizontal galleries, moving wall saw blades, and shield bubble timing.
   - Task: Reach Switch 1 to unlock Gate 1 for Spider-Man; later reach Switch 3 to unlock the extraction vault.
3. **Mutual Co-op Interdependence**:
   - Neither character can beat the level alone.
   - Progression relies on passing the baton: Player switches between heroes to open routes for one another!

---

## ⚡ 4. Hazard Balancing & Fair Gameplay Standards

### 1. Saw Blades & Circular Saws:
- **No Corridor Chokehold**: Saws must never sweep across 100% of a corridor without giving the player a way to survive.
- **Mandatory Safe Dodge Alcoves**: Every saw blade corridor MUST feature at least one **1-cell side nook/pocket** where the player can tuck in, wait for the blade to roll past, and then advance.
- **Anti-Cheese Invulnerability (0.6s)**:
  - When hit, the player receives only **$600\text{ms}$** of invulnerability (just enough to recover from hit shake).
  - The hero is knocked back to their last safe grid intersection (`h.last`).
  - Players **cannot hold forward and abuse invulnerability** to run through blades without dodging!

### 2. Laser Beams:
- **Corridor-Bound Emitters**:
  - Lasers must span strictly from wall to wall across open corridors ($\text{span} = 1.05$ blocks).
  - Lasers **MUST NEVER** be placed inside solid wall blocks or across closed gate barriers (eliminates blinking wall bugs).
- **Exact Hitboxes**:
  - Horizontal laser at $(x_0, y_0)$: Hit if $|px - x_0| \le 1.25$ and $|py - y_0| \le 0.8$.
  - Vertical laser at $(x_0, y_0)$: Hit if $|px - x_0| \le 0.8$ and $|py - y_0| \le 1.25$.

---

## 🔄 5. Hero Switching & Auto-Switch on Death

1. **Invisible Controls (Zero Numbers on Screen)**:
   - Pressing `1` selects Spider-Man.
   - Pressing `2` selects Ghost Spider.
   - Clicking top avatar cards switches hero and smoothly centers the camera.
   - **No numbers ("1" or "2") appear on the game screen** to maintain 100% clean video recording.
2. **Automatic Death Switching**:
   - If the currently active hero runs out of health ($\text{HP} \le 0$):
   - Control **automatically transfers to the next living hero in order**.
   - Camera instantly shifts focus to the living partner.

---

## 💔 6. Cooperative Softlock & Defeat System

1. **Deadlock / Softlock Detection**:
   - If a hero dies before pressing a switch required to unlock an impassable gate for their partner:
   - The living partner is permanently trapped and cannot escape alone.
   - The game detects this immediately and triggers the **Defeat Sequence**:
     - Sets `state = "over"`.
     - Plays arcade defeat sound `Snd.sfx("lose")`.
     - On-canvas emotional failure screen:
       - Gloomy dark vignette overlay.
       - Floating bold crimson text: `"MISSION FAILED"`.
       - Sub-banner: `"PARTNER LOST — TRAPPED FOREVER! 💔"`.
2. **Zero Modal Popups**:
   - **NO "Try Again" / "Choose Level" popup dialogs.**
   - **NO "Collected X of Y Stars" modal prompts.**
   - Screen stays completely clean for screen recording.

---

## 🎆 7. Grand Victory Celebration with Firecrackers

1. **Dual Living Heroes Exit Rule**:
   - All surviving heroes must reach the green extraction zone.
   - As each hero arrives, their top avatar card receives an animated glowing **Green Tick (`✔`)**.
2. **On-Canvas Firecracker Spectacular**:
   - Continuous multi-colored firecracker bursts (`VFX.cracker`) across the screen:
     - Popping sparks in red, gold, green, cyan, and violet.
     - Expanding sparkle rings, smoke bursts, and confetti.
   - Glowing on-canvas victory banners:
     - `"ALL HEROES ESCAPED!"`
     - `"★★★ VICTORY! ★★★"`

---

## 🎵 8. YouTube Shorts Safe Audio Workflow

1. **SFX-Only Recording**:
   - Game engine outputs boosted, compressor-limited sound effects (hits, laser hums, shield pickups, star dings, victory firecrackers).
   - Zero copyrighted background music is embedded in the game.
2. **Viral Music via YouTube Mobile App ("Add sound")**:
   - Record gameplay video with game SFX.
   - Upload via YouTube mobile app > tap **"Add sound"** > search for **"NO BATIDÃO - ZXKAI"** (or any trending audio).
   - Balance volume: Game SFX at 85%, Music at 55%.
   - **Immune to Content ID global blocks!**
