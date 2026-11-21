# Spider-Man & Ghost Spider: Cooperative Arcade Maze & Level System

A complete technical and gameplay guide for the **Cooperative Duo System**, **Wall Switch & Gate Mechanics**, **Multi-Color Wall Themes**, **10-Star Balancing**, and **YouTube Shorts Safe Recording Guidelines** built for **Global Games with SK**.

---

## 🕷️ 1. Characters & Cooperative Gameplay

### Character Roster:
- **Hero 1**: **Spider-Man** (`images/Spider_man_card_1024.png`)
- **Hero 2**: **Ghost Spider (Gwen Stacy)** (`images/Ghost_Spider_card_1024.png`)

### Cooperative Mechanics:
- Both heroes are placed on the maze grid simultaneously:
  - **Level 2 (Co-op Duo)**:
    - **Spider-Man Start**: Corridor Column 1, Row 0 (`[1, 0]`).
    - **Ghost Spider Start**: Corridor Column 5, Row 0 (`[5, 0]`).
    - Spider-Man is initially barricaded behind Gate 1. Ghost Spider navigates through saw corridors to press **Wall Switch 1**, unlocking Gate 1 and deactivating Laser 1.
    - Spider-Man then hits **Wall Switch 2**, unlocking Gate 2 for Ghost Spider.
    - Together they hit **Wall Switch 3**, unlocking the final reinforced security vault into the exit.
  - **Level 3 (Matrix Gauntlet)**:
    - High-density matrix maze with 3 active laser fences, cross-corridor saw blades, and dual switches.
    - Spider-Man disables the western laser fence to let Ghost Spider access Switch 2.
    - Ghost Spider opens the southern corridor vault gate for Spider-Man to reach the extraction zone.

---

## 🎮 2. Hero Controls & Switching System

**No intrusive numbers ("1" or "2") appear on the game recording area**, keeping the video 100% clean and cinematic for YouTube Shorts:

| Input | Action | In-Game Visual Feedback |
|---|---|---|
| **Press `1`** | Selects **Spider-Man** | Spider-Man card in header highlights with golden aura; in-game hero glows with bright selector ring. |
| **Press `2`** | Selects **Ghost Spider** | Ghost Spider card in header highlights with golden aura; in-game hero glows with bright selector ring. |
| **Click Avatar** | Clicking either hero card in the top bar | Instantly switches active control and smoothly centers the camera. |
| **Mouse / Touch Drag** | Dragging up, down, left, right | Drives the currently active hero through corridors with dynamic dust particles. |
| **WASD / Arrow Keys** | Physical keyboard movement | Smooth, responsive grid-aligned corridor navigation. |

---

## 🚪 3. Wall Switches & Dynamic Gate Mechanics

Inspired by classic cartoon slapstick mazes (Tom & Jerry style):

### 1. Wall Switch (`switches`):
- Mounted on corridor walls with a 3D brushed metallic plate and brass rivets.
- **Unpressed**: High-luminance neon emerald green LED button (`#00e676`) with an expanding ambient aura pulse.
- **Pressed**: Recessed crimson red button (`#ff1744`), triggering an arcade mechanical click sound.

### 2. Security Vault Gates (`gates`):
- Heavy steel security shutters with yellow & black diagonal caution hazard chevrons and cyan status rim.
- Impassable wall blocks while locked (`WALL[y][x] = 1`).
- When unlocked by a switch:
  - **Explosion & Smoke Puff**: Spawns cartoon smoke dust clouds (`VFX.add("cloud", ...)`) and explosive sparks (`VFX.add("spark", ...)`).
  - Screen shake effect (`shake = 0.85`).
  - Converts gate blocks into passable floor (`WALL[y][x] = 0`).
  - Real-time dynamic shadow map rebuilds automatically.

---

## 🎨 4. Multi-Color Wall Themes & Block Variety

Walls are no longer a single flat color. Each level features a distinct theme and rich block variations:

| Level | Theme Name | Primary Palette | Accent Bevels | Block Patterns |
|---|---|---|---|---|
| **Level 1** | **Cobalt Blue** | `#1e3a8a` / `#172554` | `#38bdf8` (Cyan Neon) | Beveled steel, Riveted alloy, Energy cut |
| **Level 2** | **Cyberpunk Purple** | `#581c87` / `#3b0764` | `#c084fc` / `#f59e0b` (Gold rivets) | Reinforced vault, 3D cross-cut, Neon rim |
| **Level 3** | **Matrix Emerald** | `#064e3b` / `#022c22` | `#34d399` (Matrix Glow) | Cyber circuit, Energy grid, Titanium brace |

The wall generation engine (`buildTiles()`) renders 6 distinct block variants:
1. **Classic Beveled Metal**: Inner shadow with specular light highlights.
2. **Energy Line Inset**: High-tech diagonal laser cut through the core.
3. **Reinforced Alloy Plate**: Heavy dark center plate with dual contrast borders.
4. **Vault Security Bars**: Triple horizontal steel bars with illuminated grooves.
5. **Heavy Riveted Flange**: Quad corner bolts for industrial vault realism.

---

## ⭐ 5. Strictly 10 Stars & Safe Item Spacing

- **Balanced Collection**: Exactly **10 Stars** are placed per level, spread far apart across distinct corridors.
- **Zero Item Overlap**: Stars and Shield Bubbles never spawn on the same cell, ensuring clear gameplay readability.
- **Progress Counter**: Header cleanly shows `★ X / 10` aligned with channel branding.

---

## 🏆 6. Dual-Hero Exit & Green Tick Celebration

To ensure screen recordings are never ruined by sudden popup dialogs:
1. **Both Living Heroes Must Escape**: In co-op levels, both Spider-Man and Ghost Spider must reach the exit cell `[3, 12]`.
2. **Green Tick (`✔`) Avatar Badges**:
   - As each hero reaches the exit, their header card lights up with an animated emerald border and a bold glowing **Green Tick (`✔`)**.
3. **No Win Modal Popups**:
   - Victory triggers directly on the canvas with vibrant confetti showers, golden star bursts, and floating victory banners (`ALL HEROES ESCAPED!`).
   - The recording screen remains completely clean without modal overlays blocking the view.

---

## 🎵 7. YouTube Shorts Audio & Copyright Guide

### Why Did "NO BATIDÃO" Get Globally Blocked?
When you add copyrighted commercial music (like "NO BATIDÃO - ZXKAI") directly into video editing software (CapCut, Premiere, InShot) and render it into the video file, **YouTube's automated Content ID system scans the audio file on upload**. If the copyright holder does not allow third-party MP4 uploads with their audio, YouTube applies an immediate **Global Block**.

### How to Fix the Current Blocked Short:
1. Open **YouTube Studio** on your computer.
2. Click **Content** > find the blocked video **"Spider Man Maze Game"**.
3. Hover over the red **"Blocked"** status and click **"See Details"**.
4. Click the **"Take Action"** button:
   - **Option A (Instant Unblock)**: Click **"Mute song only"**. YouTube will automatically mute the background song while preserving the video, instantly removing the global block.
   - **Option B**: Click **"Replace song"** and choose a royalty-free track from the YouTube Audio Library.

### How Top Creators Legally Use "NO BATIDÃO" on YouTube Shorts:
To use trending songs **without copyright claims and with full monetization**:
1. **Record the Game Video with ONLY Sound Effects**:
   - The game code has background music disabled by default.
   - Record the gameplay with crisp arcade SFX (hits, shield pickups, star dings, laser hums).
2. **Export Video WITHOUT Background Song**:
   - Keep your exported MP4 video audio clean (only game SFX).
3. **Add the Song INSIDE the YouTube Mobile App**:
   - Open YouTube on your phone and tap **"+" > "Create a Short"**.
   - Select your recorded video.
   - Tap **"Add sound"** at the top of the screen.
   - Search for **"NO BATIDÃO - ZXKAI"** in the YouTube Shorts Audio Library.
   - Align the music drop with your gameplay moments.
   - Adjust the **Volume Balance**: Set original game sound to **80%** and added music to **60%**.
   - Tap **Next** and publish!
4. **Why this works**: YouTube pays license royalties directly to music artists for tracks selected through the in-app "Add sound" library, granting creators 100% copyright clearance!
