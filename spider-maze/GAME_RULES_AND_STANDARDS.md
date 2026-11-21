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

## 💣 6. Interactive 3D Bomb System (Key 7 to Pick, Key 8 to Throw)

1. **Pick Up / Carry with Key `7`**:
   - Bombs sit on the floor in strategic alcoves with an animated flickering fuse spark.
   - When the active hero is within range ($\le 1.8$ cells), pressing **`7`** triggers the **3D Carrying Animation**:
     - The hero visibly carries the 3D spherical bomb out in front with both gloved hands (Spider-Man red web gloves / Ghost Spider white & cyan gloves).
     - The carried bomb realistically bobs with hero footsteps (`sin(T / 80)`).
     - Burning fuse spark flickers and casts hot glowing particles.
2. **Aim & Throw with Key `8` (Fiery Hazard Obliteration)**:
   - When standing in front of or adjacent to a locked blocker gate, saw wheel, wall blade, or laser, pressing **`8`** throws the bomb forward:
     - The bomb travels along a smooth 3D parabolic arc over $320\text{ms}$, casting an animated shadow below.
     - **On Impact**: Detonates with an intense, blazing **Fire Blast (`VFX.fireblast`)**:
       - Screen flashes in hot fiery orange (`255, 100, 20`).
       - Concentric fiery shockwave blast rings expanding rapidly.
       - Billowing smoke clouds and burning spark embers.
       - Deep explosion crunch sound.
       - **Strict Rule**: **NO CELEBRATION / CONFETTI ON TRAP BLAST!** The explosion is purely tactical combat.
       - Instantly obliterates the target obstacle (unlocks gate, vaporizes saw wheel, wall blade, or laser generator).
3. **Emergency Rescue Role (Partner Softlock Relief)**:
   - If Character 1 dies before unlocking Character 2's blocker wall:
     - The game **does not trigger defeat** if a bomb is held or collectible on the map.
     - Character 2 can retreat, pick up a bomb with **`7`**, bring it to the locked gate, and blast it open with **`8`** to escape alone!

---

## 🔘 7. 3D Wall-Mounted Switches (Cartoon Trapezoid Design)

1. **Exact Reference Matching (Tom & Jerry Reference)**:
   - Switches are mounted flush on the corridor wall boundary according to `sw.side` (`right`, `left`, `top`, `bottom`).
   - Features a matte steel mounting plate with corner bolts anchored to the wall.
   - Protruding into the corridor is a bold **3D cartoon lime-green trapezoidal button** with beveled perspective shading and thick black cartoon border.
2. **Mechanical State Feedback**:
   - **Unpressed (`active = false`)**: Trapezoid button protrudes $0.45\text{B}$ out into the corridor.
   - **Pressed (`active = true`)**: Depresses flush into the wall housing ($0.1\text{B}$ depth), lights up with an illuminated cyan/green indicator and mechanical click audio, unlocking the linked route gates!

---

## 🎆 8. Grand 3D Victory Celebration Plaque & Solo Survivor Status

1. **Dynamic Exit Condition**:
   - All surviving (living) heroes must reach the green extraction zone.
   - If one hero is eliminated (`G.dead.has(hero.id)`), the surviving hero can still reach the exit alone to win.
2. **On-Canvas 3D Celebration Plaque**:
   - Deep royal midnight-blue curved banner with 3D beveled metallic gold frame and inner glow trim.
   - **Channel Branding**: `"GLOBAL GAMES"` in diamond white and `"SK"` in radiant scarlet red (`#ff1744`).
   - **Dynamic Headline & Subheader**:
     - **Both Heroes Survived**: `"ALL HEROES ESCAPED!"` with `"★★★ GRAND VICTORY ★★★"` in glowing emerald green (`#22c55e`).
     - **Solo Survivor (Spider-Man)**: `"SPIDER-MAN ESCAPED!"` with `"★★★ SOLO SURVIVOR ★★★"` in glowing cyan (`#38bdf8`).
     - **Solo Survivor (Ghost Spider)**: `"GHOST SPIDER ESCAPED!"` with `"★★★ SOLO SURVIVOR ★★★"` in glowing pink (`#f472b6`).
   - **Enlarged Rectangular Character Portrait Cards**:
     - **Card Dimensions**: Replaced circular avatars with bold **rounded rectangular cards** (`2.3B × 2.5B` with `0.28B` corner radius) — over 2.5× the display area!
     - **Clear Unobscured Faces**: No badges or ticks are placed over the characters' faces.
     - **Escaped Hero Card**: Glowing 3D emerald border (`#22c55e`), full vibrant colors, hero name, and a stylish **`✔ ESCAPED`** green pill badge underneath.
     - **Eliminated Hero Card**: Glowing crimson red border (`#ef4444`), grayscale + 55% dimmed silhouette with red tint, hero name, and a **`❌ ELIMINATED`** red pill badge underneath.
   - **Cascading 3D Paper Confetti Shower**:
     - 42 fluttering paper confetti rectangles in festive colors (cyan, magenta, yellow, neon green, orange, royal blue, purple, white, red).
     - Gentle 3D perspective tumbling (`scaleY = Math.cos(flip)`) cascading across the screen at half the density of the reference image, keeping the victory plaque clean and celebratory.

---

## 🎯 9. Precise Movement Controls (25% Tap vs Smooth Full-Speed Hold)

1. **Single Click / Tap Directional Quantum ($25\%$)**:
   - When tapping or clicking any directional control (arrow buttons, keys, or mouse swipe), the character advances by **at most 25% ($0.25$ of a corridor tile)**.
   - Prevents overshooting corridors or sliding unintentionally into hazards.
2. **Continuous Hold with Zero Lag ($SPEED = 8.5$)**:
   - When holding a directional control continuously past $75\text{ms}$, the character transitions seamlessly into full-speed ($8.5$) continuous running with **ZERO pause, ZERO hitch, and ZERO lag**.
3. **Instant Stop**:
   - The exact moment input is released (`pointerup`, `keyup`), movement halts immediately with **zero drift, sliding, or residual inertia**.

---

## 💣 10. Bomb Throw & Full Area-of-Effect (AOE) Hazard Obliteration

1. **Long-Range Line-of-Sight Aiming with Key `8` (2–3 Steps Reach)**:
   - When facing any saw wheel, wall blade, laser, or locked gate, pressing **`8`** targets it directly along the hero's corridor line of sight up to **$8.5\text{ blocks}$ ($2\text{ to }3\text{ full corridor steps}$)** away!
   - Even from 2 steps back, the bomb flies in an arched parabolic trajectory directly to the target obstacle.
   - If no target is present, the bomb travels 2 steps forward ($6.0\text{ blocks}$) down the hallway until it hits a solid wall.
2. **Full Area-of-Effect (AOE) Detonation ($R \le 4.2\text{ blocks}$)**:
   - Upon impact, detonates with intense fiery blast rings, smoke puffs, and screen shake.
   - Obliterates ALL hazards within the $4.2\text{-block}$ blast radius:
     - Circular saws and wall blades marked `destroyed = true` and vanished immediately from canvas, collisions, and minimap.
     - Laser generators blown up and disabled.
     - Locked blocker gates blown open with wall tiles demolished and shadows rebuilt.
3. **Emergency Rescue Role**:
   - If Character 1 dies before unlocking a gate, Character 2 can pick up a bomb with `7`, approach from 2 steps away, and throw with `8` to blast through to the exit!

---

## 🎵 11. YouTube Copyright Claim Fix & Safe Upload Workflow

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
