# Spider-Man Arcade Maze Game

An arcade-style 2D physics maze escape game built with HTML5 Canvas, Web Audio API, and custom vector/sprite animations. Optimized specifically for **YouTube Shorts (9:16 vertical video)** and long-form **YouTube landscape video (16:9)** on the channel **Global Games with SK**.

---

## 🎮 Key Features & Recent Enhancements

1. **YouTube Shorts Copyright-Safe Audio Architecture**:
   - **Zero Embedded Background Music**: To prevent automated YouTube Content ID global blocks (such as copyright claims on commercial tracks like *NO BATIDÃO* by ZXKAI), the game engine runs in **SFX-Only Mode**.
   - **Boosted Sound Effects (+50% to +85% RMS Volume)**: Hit attacks (`hit.wav`), health pickups (`heal.wav`), stage wins (`win.wav`), shields (`shield.wav`), and star pickups (`coin.wav`) are mastered with high gain and routed through a Web Audio dynamic compressor limiter (`threshold: -3dB`, `ratio: 12`, `attack: 2ms`) to punch through loud background music when you add trending music via YouTube's official **"Add sound"** button.

2. **9:16 Recording Frame & Dimension Control**:
   - High-definition vertical resolution with a hard minimum constraint of **495 × 880 px** (exact 9:16 integer multiple: $55 \times 9 = 495, 55 \times 16 = 880$).
   - Sharp $90^\circ$ square white outer recording boundary (`border: 3.5px solid #ffffff`) for pixel-perfect cropping and screen recording in OBS / screen capture tools.

3. **Optimized Character Scale & Corridor Clearance**:
   - Spider-Man player token scale set to $S = 1.95B$ within $3.0B$ corridors, guaranteeing $>0.5B$ clear margin on both sides with zero wall clipping or overlap artifacts.
   - 3D beveled metallic blue wall blocks with corner rivets and diagonal interior accent lines.

4. **Channel Header & HUD**:
   - Prominent Spider-Man avatar badge ($88\text{px}$).
   - Channel brand title: **Global Games** in solid black (`#000000`), **SK** in vivid arcade red (`#ff2233`).
   - Clean star counter displaying strictly collected stars out of 10 (`★ 0 / 10`).

5. **3 Progressive Maze Levels & Dynamic Multi-Color Wall Themes**:
   - **Level 1 (Solo Escape)**: Cobalt Blue Theme with 10 stars and laser traps.
   - **Level 2 (Co-op Duo)**: Cyberpunk Purple Theme with 10 stars, 3 wall switches, and animated security gates.
   - **Level 3 (Matrix Gauntlet)**: Matrix Emerald Theme with 10 stars, high-voltage laser arrays, and dual-hero coordination.
   - **Dual-Hero Escape & Green Tick**: Both heroes must reach the exit in co-op mode; victorious heroes receive an animated Green Tick (`✔`) badge without intrusive modal popups ruining the recording frame.

---

## 📹 YouTube Shorts Upload & Audio Workflow (Zero Copyright Strike Method)

To get viral reach and avoid copyright blocks on YouTube Shorts:
1. **Screen Record Gameplay**:
   - Align your screen recording software (OBS, phone screen recorder, or desktop capture) to the white square border of the game.
   - Record the video with in-game sound effects (SFX) enabled.
2. **Upload via YouTube App / YouTube Studio**:
   - On mobile: Tap **+** $\rightarrow$ **Create a Short** $\rightarrow$ select your recorded video.
   - Tap **"Add sound"** at the top.
   - Search for **"NO BATIDÃO"** (or any trending audio on YouTube).
   - In the volume settings, set:
     - **Original Audio (Game SFX)**: 90% – 100%
     - **Added Sound (Background Music)**: 40% – 60%
   - This ensures full monetization and 100% immunity from Content ID blocks because YouTube pays the music license directly to the artist.

---

## 📝 Viral YouTube Shorts Metadata (Copy & Paste)

### Title Options:
1. `Can Spider-Man Escape The Impossible Saw Blade Maze? 😱🕷️ #shorts`
2. `Only 1% Can Collect All 15 Stars! ⭐️ Spider-Man Maze Escape #gaming`
3. `Spider-Man vs Death Lasers! 💀⚡️ Will He Make It Out Alive? #shorts`

### Video Description:
```text
Can Spider-Man survive the deadly spinning saw blades, electric lasers, and wall traps to collect all 15 stars and escape? Watch till the end to find out! 🕷️⚡️

🎮 Game: Spider-Man Arcade Maze
👤 Channel: Global Games with SK
⭐️ Target: Collect 15 Stars & Reach the Goal

🔔 Subscribe to Global Games with SK for more intense gaming challenges, arcade mazes, and superhero action every single day!
👍 Like, Share, and Comment your favorite part below!

#SpiderMan #MazeGame #GamingShorts #Arcade #GlobalGamesWithSK #MobileGaming #TrendingShorts #GamingChallenge #GamingCommunity #Shorts
```

### Tags:
`spiderman, maze game, spiderman maze, arcade game, gaming shorts, global games with sk, impossible maze, spiderman game, shorts, viral gaming, mobile games, escape maze, obstacle course`

---

## 🛠️ Project File Structure
- `index.html`: Main HTML entry with responsive viewport and overlay screens.
- `style.css`: Clean arcade styling, 9:16 square recording border, typography, and HUD styling.
- `game.js`: Core physics, collision detection, corridor pathfinding, and rendering pipeline.
- `assets.js`: Base64 and vector asset registry.
- `levels/level1.js`: Level 1 layout data (15 stars, wall blades, circular saws, lasers, health bubbles, shields).
- `audio/audio.js`: Web Audio API SFX engine with dynamics compression and spatial panning.
- `audio/audio-data.js`: Bundled base64 audio data for SFX.
- `tools/make_audio.py`: Procedural audio generation script.
- `tools/make_level.py`: Python CLI tool for generating procedural maze layouts.
