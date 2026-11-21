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

## 💣 6. Collectible Bombs & Emergency Rescue System

1. **Strategic Bomb Spawns (`bombs`)**:
   - Collectible bombs spawn in dedicated corner alcoves/dead-ends away from direct paths.
   - When a hero walks over a bomb:
     - Hero gains `+1 Bomb` (`h.bombs++`).
     - Floating HUD badge appears above the hero's health bar: `💣 x1`.
     - Sparkle effects and pickup chime play.
2. **Tactical Hazard Demolition**:
   - Carrying a bomb allows a hero to destroy lethal traps on contact without taking damage:
     - **Spinning Saw Wheels**: Bomb detonates on contact, permanently vaporizing the saw wheel (`sObj.destroyed = true`), screen shake (`shake = 1.3`), explosion sound, and confetti bursts!
     - **Moving Wall Saws**: Permanently destroyed (`wObj.destroyed = true`).
     - **Laser Barriers**: Destroys emitter generator (`lObj.destroyed = true; lObj.disabled = true;`).
3. **Emergency Rescue Role (Partner Softlock Relief)**:
   - If Character 1 dies before unlocking Character 2's blocker wall:
     - The game **does not immediately trigger defeat** if a bomb is held or collectible on the map.
     - Character 2 can retreat, retrieve the collectible bomb from an alcove, bring it directly to their locked blocker wall, and blast it open (`gate.open = true`)!
     - This breaks the deadlock and allows the living hero to escape!

---

## 🔘 7. Wall-Mounted Switches (`side: "left" | "right" | "top" | "bottom"`)

1. **Wall-Mounted Flush Alignment**:
   - Switches are not random floor tiles; they are industrial consoles bolted flush against the corridor wall.
   - Mounted according to their specified wall side (`sw.side`), complete with metallic conduit cables anchored directly into the wall face.
2. **Off-Path Tactical Placement**:
   - Switches are located in dedicated side pockets/alcoves.
   - If Character 2 rushes straight forward along their corridor without helping Character 1, they will hit their own closed blocker wall.
   - Character 2 must consciously turn around, enter the switch alcove, and flip the wall lever for Character 1. Character 1 can then advance and flip the corresponding switch for Character 2!

---

## 🎆 8. Grand Victory Celebration with Firecrackers

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

## 🎵 9. YouTube Copyright Claim Fix & Safe Upload Workflow

### A. How to Instantly Fix Your Currently Blocked Video in YouTube Studio:
In the YouTube Studio screenshot uploaded:
1. Click the **"Take action"** button next to the claim.
2. Choose one of two safe options:
   - **Option 1: "Replace song"**: Select a free, licensed music track from the YouTube Audio Library. YouTube will replace "NO BATIDÃO" and immediately lift the global block!
   - **Option 2: "Mute song"**: Mutes the music audio while keeping your gameplay sound effects audible.
   - **Option 3: Delete & Re-upload via Mobile App** (Recommended if you want "NO BATIDÃO" on the Short).

### B. Why Was "NO BATIDÃO" Blocked?
- If you add copyrighted music (like "NO BATIDÃO") inside third-party editing software (CapCut, Premiere, InShot) and render it into the MP4, YouTube detects the raw audio file during upload and blocks the video.
- **The Zero-Copyright Method for YouTube Shorts**:
  1. Export your gameplay video from your editor with **ONLY the game sound effects (no music track in the file)**.
  2. Open the **YouTube mobile app** > tap the **"+"** button > create Short > select your video.
  3. Tap **"Add sound"** at the top of the YouTube app.
  4. Search for **"NO BATIDÃO"** and select it from YouTube's official music library!
  5. Tap the volume sliders:
     - **Original audio (Game SFX)**: 90% – 100%
     - **Added sound (Music)**: 40% – 50%
  6. When added through YouTube's official "Add sound" button, YouTube automatically handles the music licensing and your video **WILL NEVER GET CLAIMED OR BLOCKED!**
