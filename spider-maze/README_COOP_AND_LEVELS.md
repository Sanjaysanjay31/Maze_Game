# Spider-Man & Ghost Spider: Cooperative Arcade Maze & Level System

A complete technical and gameplay guide for the **Cooperative Duo System**, **Wall Switch & Gate Mechanics**, **Level Select Flow**, and **High-Definition Visual Engine** built for **Global Games with SK**.

---

## 🕷️ 1. Characters & Cooperative Gameplay

### Character Roster:
- **Hero 1**: **Spider-Man** (`images/Spider_man_card_1024.png`)
- **Hero 2**: **Ghost Spider (Gwen Stacy)** (`images/Ghost_Spider_card_1024.png`)

### Cooperative Architecture:
- In **Level 2 (Co-op Duo)**, both heroes are placed on the maze grid simultaneously:
  - **Spider-Man Start**: Corridor Column 1, Row 0 (`[1, 0]`).
  - **Ghost Spider Start**: Corridor Column 5, Row 0 (`[5, 0]`).
- Both characters work together to overcome impossible obstacles:
  - Spider-Man is initially trapped behind **Gate 1** and a death laser.
  - Ghost Spider dodges spinning saw blades in her corridor to reach **Wall Switch 1**.
  - Hitting Switch 1 blows open Gate 1 and disables the laser for Spider-Man!
  - Spider-Man then pushes through to **Wall Switch 2**, blowing open Gate 2 for Ghost Spider!
  - Both heroes navigate to the shared exit at the bottom (`[3, 12]`) to complete the mission!

---

## 🎮 2. Hero Controls & Switching System

As requested, **no numbers ("1" or "2") appear on the game screen** to ensure the recording remains 100% clean and cinematic for YouTube Shorts.

| Input | Action | Feedback on Screen |
|---|---|---|
| **Press `1`** | Selects **Spider-Man** | Spider-Man avatar in top bar and in-game token gets a glowing golden pulse halo. |
| **Press `2`** | Selects **Ghost Spider** | Ghost Spider avatar in top bar and in-game token gets a glowing golden pulse halo. |
| **Click Avatar** | Clicking on Spider-Man or Ghost Spider's card in the header instantly switches to that hero. | Smooth camera pan to selected character. |
| **Mouse / Touch Drag** | Dragging up, down, left, or right directs the **currently active hero**. | Active hero moves along corridors with dust particles. |
| **WASD / Arrow Keys** | Move active hero using physical keys. | Responsive smooth corridor navigation. |

---

## 🚪 3. Wall Switches & Dynamic Gate Mechanics

Inspired by classic cartoon slapstick mazes (Tom & Jerry style):

### 1. Wall Switch (`switches`):
- Mounted on corridor walls with a 3D brushed metal plate and riveted rim.
- **Unpressed**: Neon emerald green LED button (`#00e676`) with an expanding ambient aura pulse.
- **Pressed**: Recessed crimson red button (`#ff1744`), playing an arcade mechanical click sound.
- Positioned in block coordinates:
  - `sw1`: `[20, 14]` (Ghost Spider's sector). Opens `gate1` & shuts down `laser1`.
  - `sw2`: `[8, 20]` (Spider-Man's sector). Opens `gate2`.

### 2. Security Vault Gates (`gates`):
- Heavy steel security shutters with high-contrast yellow & black caution diagonal hazard chevrons and cyan status rim.
- Impassable wall blocks while closed (`WALL[y][x] = 1`).
- When unlocked by a switch:
  - **Explosion & Smoke Puff**: Spawns cartoon smoke dust clouds (`VFX.add("cloud", ...)`) and explosive sparks (`VFX.add("spark", ...)`).
  - Screen shake effect (`shake = 0.85`).
  - Converts gate blocks into passable floor (`WALL[y][x] = 0`).
  - Real-time dynamic shadow map rebuilds automatically.

---

## 📺 4. Menu & Level Selection Flow

The start modal (`#ov`) now features a clean two-step selection flow:

1. **Step 1: Screen Aspect Ratio Selection**:
   - 📱 **Portrait (9:16)**: Formatted for YouTube Shorts and mobile screen recording.
   - 🖥️ **Landscape (16:9)**: Formatted for YouTube long-form desktop video.
   - Tap **"Select Level ➔"** to proceed.

2. **Step 2: Mission / Level Select**:
   - **Level 1**: *Solo Escape (15 Stars Challenge)* — Spider-Man solo survival against saw blades & lasers.
   - **Level 2**: *Spider-Man & Ghost Spider (Co-op Duo)* — 2-Hero switch maze with wall buttons and secret gates.
   - **"← Back to Screen Ratio"** button allows easily changing video aspect ratios.

3. **In-Game Access**:
   - Pressing the top menu hamburger button (`#mn`) re-opens the Level Selection screen anytime without refreshing.
   - On Win or GameOver, players can choose **"Play Again"** or **"Choose Level"**.

---

## 💎 5. Ultra-High Visual Clarity Engine

To ensure recordings are crystal clear and never blurry:
1. **Target 1080p Internal Render Buffer**:
   - In `resize()`, the canvas resolution is scaled to at least **1080px wide** for 9:16 and **1920px wide** for 16:9:
     ```javascript
     const minW = ratio === "9:16" ? 1080 : 1920;
     const dpr = Math.max(window.devicePixelRatio || 1, minW / s.clientWidth, 2.25);
     cw = cv.width = Math.round(s.clientWidth * dpr);
     ch = cv.height = Math.round(s.clientHeight * dpr);
     ```
2. **Native 1024×1024 Sprite Cards**:
   - Spider-Man and Ghost Spider tokens use official 1024×1024 PNG assets (`Spider_man_card_1024.png` and `Ghost_Spider_card_1024.png`).
3. **Beveled 3D Wall Blocks**:
   - High-contrast specular bevels, metallic rivets, and corner bolts rendered at native high resolution.
4. **Neon Bloom Lasers**:
   - Multi-layer glow with electric white-hot center core.

---

## 📋 6. Adding More Cooperative Levels in Future

To create a new level with switches and gates:
1. Create `levels/level3.js`.
2. Define start positions:
   ```javascript
   start: [1, 0],   // Hero 1 (Spider-Man)
   start2: [5, 0],  // Hero 2 (Ghost Spider)
   exit: [3, 12],
   ```
3. Add switch and gate objects:
   ```javascript
   switches: [
     { id: "sw1", x: 20, y: 14, color: "#00e676", targets: ["gate1"], msg: "Door 1 Opened!" }
   ],
   gates: [
     { id: "gate1", blocks: [[4, 12], [5, 12]], open: false }
   ]
   ```
4. Include `<script src="levels/level3.js"></script>` in `index.html` and add a level card in `#step-levels`.
