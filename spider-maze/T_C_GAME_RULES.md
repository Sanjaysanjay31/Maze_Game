# Tom & Cherry Maze Challenge — Future Level & Asset Rules Guide

Main project root: `C:\Skills\Youtube\MAZE_GAME\spider-maze`

> **Strict Separation Rule**: Keep original Spider-Man Maze (`index.html`, `game.js`, `assets.js`, `style.css`, `levels/level1.js..level5.js`) completely untouched so running `index.html` always launches the original Spider-Man game, while `T_C_index.html` launches Tom & Cherry Maze.

---

## 1. Prop Assets (`T_C_Props/` & `tc_assets.js`)

All custom props are pre-processed as clean transparent RGBA PNGs in `T_C_Props/` and encoded as lossless RGBA WebP inside `tc_assets.js`:

| Asset Key | Processed File | Specs | Role |
|---|---|---|---|
| `switch_red` | `T_C_Props/switch_red.png` | `228x512` RGBA, white/silver mounting bar with bold black border flush at `x=0`, light highlight strip & outer glow removed | Wall switch in **CLOSED** state (`sw.active === false`) |
| `switch_green` | `T_C_Props/switch_green.png` | `443x512` RGBA, white/silver mounting bar with bold black border flush at `x=0`, light highlight strip & outer glow removed | Wall switch in **OPEN** state (`sw.active === true`) |
| `shield_cap` | `T_C_Props/shield_cap.png` | `512x512` RGBA, bottom drop-shadow removed, tight circle crop | Captain America shield floor pickup & directional equipped shield |
| `bomb_evil` | `T_C_Props/bomb_evil.png` | `512x512` RGBA, bottom drop-shadow removed, fuse tip normalized at `(0.976, 0.175)` | Blue evil-face bomb (floor pickup, hero-carried, and thrown spinning projectile) |

---

## 2. Wall Switch Rules (`Red = Closed`, `Green = Open`)

- **Color Meanings**:
  - **Red Switch (`sw.active === false`, `IM.switch_red`)**: Linked barrier gates, lasers, and opposing Zigzag Spikes are **CLOSED / LOCKED / ARMED**.
  - **Green Switch (`sw.active === true`, `IM.switch_green`)**: Linked barrier gates, lasers, and opposing Zigzag Spikes are **OPEN / CLEARED**.
- **Flush Wall Mounting**:
  - Because `cen(i, j) = [3*i + 2, 3*j + 2]` sits at the center of a **2-tile-wide corridor** (`[3*i+1 .. 3*i+3]`), never hardcode `+0.5*B` wall offsets.
  - `tc_game.js` scans outward from `(sw.x, sw.y)` up to `1.85` tiles in the `sw.side` direction (`"left"`, `"right"`, `"top"`, `"bottom"`) until hitting a solid wall tile (`solid()`), then bolts the black bracket `-2px` flush against the wall face and rotates/mirrors the sprite so the button protrudes perpendicularly into the corridor.
- **Open & Close Toggling**:
  - Set `"toggle": true` on switches meant for reversible open/close gating. Triggering works on entry edge (`sw._inside` `Set`) so standing near a switch does not rapidly flicker it.
  - Before toggling Green -> Red (closing), the engine checks that no living hero stands inside the target gate blocks or spike barrier (`"Clear the route before closing!"`).
- **Level Rule — Off-Route / Need-Driven Placement**:
  - Do **NOT** place mandatory switches blindly along the unobstructed forward path. Place them attached to walls inside **side branches, co-op alternate corridors, or dead-end alcoves** so characters encounter a locked gate or Zigzag Spike barrier first and need a teammate (or need to backtrack/detour) to press the Red switch and turn it Green.

---

## 3. Captain America Shield & Bomb Carrying Rules (Face Visibility + 3s Intro Hook)

- **3-Second Opening Hook Lock (`T < 3000`)**:
  - During the first `3000ms` of any level, shields and bombs do **not** equip so Tom & Jerry's portraits stay cleanly visible on camera for the opening hook.
  - Also place `shields` and `bombs` well away from spawn tiles (`>= 10` tiles / far apart across the level) rather than clustered close together.
- **Shield Side-Edge Positioning (`shield_cap`)**:
  - While shielded (`T < h.shield`), `IM.shield_cap` is rendered at the leading side/edge along `h.p.look` so the hero's face remains unobstructed:
    - Horizontal (`left` / `right`): `sx = px ± 0.44*S`, `sy = drawY + 0.04*S`, oval size `0.62*S × 0.78*S`.
    - Vertical (`up` / `down`): `sx = px ± 0.18*S`, `sy = drawY ± 0.45*S`, oval size `0.74*S × 0.54*S`.
- **Level Rule — Side-Route & Wide Spacing**:
  - Keep Shields and Bombs sparse and far apart across alternate branches or dead-end alcoves (`1–2` shields and `1–2` bombs per level), never crowded next to each other or straight on unobstructed spawn corridors.

---

## 4. Blue Evil-Face Bomb Rules (`bomb_evil`)

- **Animated Top Fire & Side Hold**:
  - `drawEvilBombWithFire(ctx, cx, cy, sz, rot)` renders `IM.bomb_evil` with an animated radial heat glow + flickering yellow flame at `(0.445*sz, -0.315*sz)`.
  - When carried (`h.p.holdingBomb`), the bomb is scaled cleanly (`0.94*B`) and held out on the leading side/edge (`±0.48*S` horizontally or `(0.34*S, ±0.45*S)` vertically) so the hero's face remains visible.
- **Usage**:
  - Floor pickup (`Press 7`, unlocked after `T >= 3000`), Throw (`Press 8`), or contact destroys saws, lasers, gates, and Zigzag Spikes (`R <= 4.2` AOE) and stuns Bosses (`5s`).

---

## 5. Opposing Black 3D Zigzag Cone Spikes (`G.spikes`)

- **Level Schema Entry & Strict 2-Wall / Non-Adjacent Gate Rules**:
  ```json
  { "id": "sp1", "x": 5, "y": 29, "dir": "v" }
  ```
  - Zigzag Spikes MUST ALWAYS be placed strictly between **2 opposite solid walls**: `dir: "v"` on `'UD'` vertical corridors (left & right walls) or `dir: "h"` on `'LR'` horizontal corridors (top & bottom walls), never on corners or open junctions.
  - **No Adjacent Gate Wall Blocks**: Keep every spike barrier at least `>= 4.0` tiles away from any `gate.blocks` so locked wall gates and Zigzag Spikes never sit side-by-side.
- **Obsidian Black Metallic Cones & Chunky Base**:
  - `getSpikeWallColors()` renders high-contrast dark metallic **black** 3D cones (`coneW = 0.90*B`, wide mountain triangle bases flush to opposite walls with steel oval socket rims and warm center tip sparks) so spikes stand out clearly against blue, purple, and emerald walls.
- **Exact 3 Crossing Methods**:
  1. **Active Shield (`T < h.shield`)**: Walk safely straight through closed Zigzag Spikes with shield-block spark VFX/SFX and `"smug"` hero emotion.
  2. **Press Red Switch -> Green (`sw.targets` contains `sp.id`)**: Pressing the linked Red switch turns it Green and retracts `sp.open = true` into the walls.
  3. **Bomb Blast (`throwHeroBomb` / AOE / carrying contact)**: Destroys the spikes (`sp.destroyed = true`) with fireblast VFX.
  - **No Bypass Without One of the 3 Methods**: Unprotected contact triggers `hitHero` (1 HP damage + bounce back) AND explicitly clamps movement back even during `600ms` invulnerability frames so heroes cannot glitch through closed spikes.

---

## 6. Side-Route & Level Design Verification Checklist

Before finalizing any future level in `tc_levels.js`:
1. Ensure every tile coordinate in `coins`, `shields`, `bombs`, `bubbles`, `switches`, and `spikes` sits on open floor (`walls[y][x] === "0"`), with zero uncarved `deg = 0` rooms.
2. Verify every switch has a real adjacent solid wall (`"1"`) matching its `"side"` direction (`"left"`, `"right"`, `"top"`, `"bottom"`).
3. Place `shields`, `bombs`, and mandatory `switches` in off-spine / dead-end / backtracking alcoves rather than straight on unobstructed forward lanes.
4. Run `python tools/update_tc_levels.py` (BFS solvability + 2-wall & gate-distance check) and `node tools/verify_tc_and_spider.js` (headless Chrome live test across all 8 levels + under-50s Auto-Play run on Level 8).

---

## 7. Switch Twist & Optional Auto-Play Mode (`Level 8+`)

- **Switch Betrayal / Lock Twist (`closeTargets`)**:
  - A wall switch can include `"closeTargets": ["gate_id", ...]` so activating it opens `targets` while simultaneously slamming shut trap gates/spikes (`WALL = 1`, scared hero emotion, screen shake).
  - Pre-open trap gates should set `"open": true, "initialOpen": true`.
- **Optional Auto-Play Mode (`🤖 Auto-Play Bot`)**:
  - Players can toggle **Auto-Play** ON (`#btn-autoplay-opt` / `#ext-autoplay-btn`) before selecting a level or click **`🤖 Auto-Play (<50s)`** on Level 8; keeping it OFF lets the player control characters manually.
  ## 8. Level Styling, Wall Thickness & Confront-First Logic (`Level 8+`)

- **Level 3 Blue Wall Palette Always (`theme: "blue"`)**:
  - New levels MUST always use Level 3's classic blue wall palette (`"theme": "blue"`) so visual identity matches the series.
- **Outer 2-Layer Border + Single-Layer Inner Walls**:
  - The game board renders a 2-tile outer wall perimeter (`WALL` border + `solid()` boundary), while **every internal wall inside the maze MUST remain single-tile (`1` block) thick** between carved `2x2` corridor rooms (all `CW × CH` cells carved cleanly — never leave uncarved multi-tile solid chunks inside the playable grid).
- **Need-Driven Backtracking (`Confront -> Backtrack -> Solve`)**:
  - Characters MUST **never** head straight into a side-pocket to grab a Bomb/Shield or press a Switch preemptively.
  - Both level flow and `autoPlan` choreography require a character to walk their route forward first, **confront the blocked obstacle** (Zigzag Spikes or locked Twist Gate), and THEN **backtrack/detour** into the off-route alcove to collect the Shield/Bomb or press the Red->Green switch.
- **Auto-Play Pacing**:
  - Auto-Play moves at `~0.58x` normal movement speed with deliberate reaction pauses so every switch/twist beat reads clearly for viewers while finishing within `50` seconds (`~35–45s`).

---

## 9. Dynamic Character Emotion Rules

- Heroes default to `"happy"` on HUD cards and start tiles (`tom_happy`, `cherry_happy`, `bulldog_happy`).
- Proximity triggers `"scared"` (within `3.0` tiles of active Saws, Lasers, or closed Zigzag Spikes, or `4.5` tiles of active Bosses — unless shielded).
- Carrying a bomb shows `"angry"` while moving (`"smug"` on shield blocks); blasting/destroying a hazard triggers **`"laugh"`** (`tom_laugh`, `cherry_laugh`, `bulldog_laugh`, `2.0s` priority `8`); taking damage triggers timed `"dizzy"`/`"sad"`/`"cry"`; escaping displays `"joy"`.
- Defeated hero HUD portraits render ONLY a crisp red **X** overlay (`::after` cross) with **NO full-tile red background tint**.

---

## 10. Dramatic Setbacks, Hazard Reactions & Spare Bomb Rules (`Level 8+`)

- **Setback -> Reaction -> Recovery Storytelling (Never a Flat Clean Run)**:
  - Levels and `autoPlan` runs should include dramatic/comedic setbacks instead of uninterrupted smooth runs:
    1. **Hazard Zap / Hit Setback (`touchLaser: true` + `waitLaserOn`)**: A hero (e.g., Tom) walks into an active Laser/Saw/Spike timing hazard, loses `1` HP, bounces back (`dizzy` -> `sad`), and then either waits for the safe OFF window OR backtracks to grab a Bomb.
    2. **Backtrack Bomb -> Destroy Hazard -> Laugh**: After backtracking into an alcove for a Bomb, the hero returns, throws it (`key: "8"`) onto the blocking Laser, Saw, Spike barrier, or Twist Gate, obliterates it (`fireblast`), and switches to **`"laugh"`**.
    3. **Spare / Unused Bomb Consumption**: If an extra Bomb is not strictly required to beat a gate/spike, heroes may freely spend it to blast an active Laser/Saw/Spike (or toss it playfully) — unused bombs never block completion.
- **Auto-Play Timing Guard (`waitLaserOn` + `touchLaser`)**:
  - `stepAutoPlay()` waits until `(T + k * 700) % 3000` is inside the active ON window (`< 2500ms`) so the hero reliably contacts the live laser, detects the HP drop (`h.hp < st.initHp`) to complete `touchLaser`, pauses briefly for reaction visibility, and moves to the backtrack step while keeping total level duration strictly **under 50 seconds**.

---

## 11. Progressive MP4 Studio Recording Rules

- `remuxFMP4ToProgressive` MUST dynamically inspect each `trak`'s `tkhd.track_ID`, `hdlr.handler_type` (`'vide'` vs `'soun'`), `mdhd.timescale`, `mvex/trex` defaults, and paired `moof`->`mdat` sample offsets — NEVER assume track ID `1` is always Video or hardcode timescales (`30000`/`48000`).
- Offscreen recording canvas `recCv` MUST stay inside the rendered viewport bounds (`left: 0; top: 0; width: 2px; height: 2px; opacity: 0.01; z-index: -100`) so headless/desktop Chromium GPU compositors never cull `captureStream(60)` frames into black video.

---

## 12. Extracted Character & SFX Audio Rules (`Level 8+` via `T_C_Sounds/`)

- **Bundle (`audio/tc-audio-data.js`)**: Generated via `python tools/make_tc_sounds.py` from `T_C_Sounds/*.wav` (22 clips), decoded into `GameAudio.buf["tc_<name>"]` so audio routes through `GameAudio` and records cleanly into the MP4 Shorts Audio stream.
- **Level 8 Onwards Scope (`li >= 7`)**: Levels 1–7 keep legacy audio unchanged; Level 8+ (`isTcAudioV2()`) uses `T_C_Sounds/` clips:
  - **Star Coins**: Keeps the classic ascending `"coin"` chime at reduced volume (`0.62 + 0.015 * combo`) so character voices cut through cleanly.
  - **Tom**: `tom_laser_scream` (standard/laser hit), `tom_pain_scream` (low HP `<= 2`), `tom_surrounded_scream` (defeat), `tom_buff_roar` (bomb throw), `cartoon_huh_double` (betrayal trap slam / Tom confrontation).
  - **Cherry & Bulldog**: `cartoon_uh_oh` (Cherry confronts spikes), `cartoon_huh_sharp` (Cherry hit), `cartoon_huh_confused` (Bulldog hit / spike confrontation), `jerry_hehe` / `jerry_chase_laugh` / `jerry_happy_laugh` (Cherry bomb throw, escape, victory celebration), `quacker_giggle` (full-HP bubble).
  - **Props & Villains**: `switch_pop` (wall switches), `shield_energy_slash` (shield pickup), `shield_slap_hit` (shield block), `cartoon_what_pop` (bomb pickup), `smoke_poof` (bomb blasts), `powerup_boing` (level start / Bulldog escape), `powerup_sparkle_chime` (health bubble heal), `buff_transform_chime` (victory fanfare), `villain_evil_laugh` & `villain_growl_clash` (boss hunt & power bomb).

---

## 13. Reference Video Analysis & Beat Timing Breakdown (`25.60s` Multi-Hero Fight Study)

Measured from the `720x1280` `60fps` reference gameplay video (`Tom_and_jerry_maze_challenge_with_crazy_twist___#tomandjerry_#animation_(4).mp4`):

| Timestamp | Duration | Characters Active | Action, Asset & Combat Beat |
|---|---|---|---|
| `0.00s – 1.50s` | `1.50s` | **Tom, Cherry, Red Fox** | Parallel entry; **Tom** steps into active Laser (`~1.00s`), gets shocked (`0.50s` setback), spots **Captain Shield** behind him while **Cherry** holds the switch lane and **Red Fox** enters below. |
| `1.50s – 4.00s` | `2.50s` | **Tom + Cherry + Red Fox** (Simultaneous) | **Tom** backtracks right (`0.5s`) to equip **Captain Shield** (`shield_energy_slash`), charges straight left through the live laser beam (`~1.5s`, `shield_slap_hit`), while **Red Fox** simultaneously chases **Cherry** in the lower hallway. |
| `4.50s – 6.50s` | `2.00s` | **Tom & Cherry vs Red Fox** | **Hero vs Villain Fight #1 (`2.0s`)**: **Tom** drops down behind **Red Fox** (`0.5s`), throws **Captain Shield** (`~0.5s` flight) -> starburst explosion (`6.00s`) + smoke poof KO (`6.50s`, `smoke_poof`) while **Tom** switches to `laugh` and **Cherry** reunites. |
| `8.00s – 11.50s` | `3.50s` | **Tom & Cherry** (Co-Op Follow) | **Cherry** follows/shadows **Tom** in parallel (`8.00s–10.50s`); **Tom** hits Wall Switch (Green -> Red, `0.5s`), then both run side-by-side past spinning saw blades toward the cyan `?` Bubble (`1.0s`). |
| `12.00s – 14.50s` | `2.50s` | **Tom + Bubble Cherry** (Protection) | **Friend Protection**: **Cherry** grabs the `?` Bubble (`12.50s`) gaining an energy protection aura, weaves past the saw blades (`13.50s`), and catches up to **Tom** (`14.00s–14.50s`) to escort and shield him. |
| `15.00s – 20.00s` | `5.00s` | **Tom & Cherry vs Black Fox** | **Black Fox** ambushes from top (`15.00s`); **Cherry** toggles switch, lures **Black Fox** past spinning saws (`16.00s–18.00s`, `~2.0s` chase), then **Tom & Cherry** trap & blast **Black Fox** in smoke (`18.50s–20.00s`, `1.5s` KO beat). |
| `20.50s – 25.60s` | `5.10s` | **Tom** (`💪` Climax) | **Muscle Power-Up** spawns (`0.5s`), **Tom** transforms (`~1.5s` roar charge) and plows full-speed through red lasers (`~2.6s`) to finish cleanly. |

---

## 14. Level 9+ Linear Zone Story, Prison Rescue & In-Frame Activation Rules

- **Full Auto-Play (`alwaysAuto: true`) Under 50 Seconds**: Quality (`1080p`/`2K`) and aspect ratio (`9:16`/`16:9`) selection works normally beforehand; pressing Play on **Level 9+** runs the complete automated choreography **under 50 seconds** (`~26–42s`).
- **Linear Single-Camera Thread + In-Frame Activation (`waitForFrame: true`)**:
  - Do NOT split heroes across distant off-screen side corridors. Place the whole story along one continuous winding camera path inside `9:16` view (`GameRecorder` shows **Heroes + `VS` + Villains** in the top HUD bar).
  - Trapped teammates (`Cherry`, `Bulldog`) sit inside **3-wall + 1-locked-gate prison alcoves** right along the active path, remaining stationary until unlocked **and inside the live camera viewport**, then step out to follow/protect the lead hero (`"follow"` keeps `1`-cell spacing with zero overlap).
  - Villains (`Red Fox` `hp: 1`, `Black Fox` `hp: 2` with `waitForFrame: true`) stay dormant until they enter the live camera frame (`<= 6.2` tiles from `(camX, camY)`), preventing off-screen attacks/roars.
- **Saw Retraction, Shield Deflect & Cartoon Fight Clouds**:
  - Wall switches (`sw.targets`) can include rotating saw IDs (5th item `[x0, y0, x1, y1, "saw_mid"]`) to **retract saw blades** after a shielded ally crosses first, allowing unshielded teammates to reunite safely.
  - Hero-vs-Villain clashes (`throwHeroShield` `1 dmg`, `throwHeroBomb` `2 dmg`, or Shield Deflect `2.2s` stun) trigger `shield_slap_hit`, `villain_growl_clash`, `smoke_poof`, and a multi-puff **Cartoon Fight Cloud**, marking KO'd Villains with a crisp red `✕` on the top HUD.

---

## 15. Strict 1v1 Fight Staging, Teammate Queueing & Projectile Visibility Rules

- **Sequential One-Enemy-at-a-Time Focus**: Never run two simultaneous fights against different enemies in the same frame (`Zone 1 Red Fox` resolves before `Zone 3 Black Fox` wakes up).
- **No Teammate Interference — Line Up Behind One Another**: During a Hero-vs-Villain fight, all non-fighting friends MUST stay **lined up cleanly `1` cell behind one another** watching from behind (`(1, 3)` behind Tom during Red Fox fight; `(2, 5)` + `(2, 6)` behind Tom during Black Fox fight) — NEVER piling onto the enemy's tile with the fighter.
- **Open Distance & Two-Stage Shield/Bomb KO**: Keep `2.6–6` tiles of open corridor between the attacking hero and the bounded Villain (`boss.bounds`, kept `>= 2.5` tiles away so `near(..., 1.25)` never triggers false contact knockback) with projectiles drawn **on top of heroes and bosses** (`tc_game.js`). Spinning **Captain Shield (`580–820ms`)** and **Blue Evil Bomb (`540–760ms`)** fly visibly across the hall BEFORE impact stun (`480–540ms` starburst + dizzy face) and delayed **Cartoon Smoke Cloud KO (`smoke_poof`)**. Boss-targeted throws use `envBlastRadius = 2.2` so downstream spike traps remain intact for later switch reveals.

---

## 16. 40–50s Video Pacing, In-Frame Switch Focus & Bold Red `✕` Rules (`Level 9+`)

- **Strict 40–50 Second Automated Video Target (`40s <= elapsedSec < 50s`)**:
  - Every automated level (**Level 8**, **Level 9**, **Level 10+**) MUST pace movement (`~0.40–0.46x` hero speed) and dramatic reaction/reveal holds (`650–1800ms`) so downloaded gameplay completes inside **`40 to 50 seconds`** (`~42–46s` sweet spot — never rushed under `40s` and never over `50s`).
- **Zero Off-Screen Actions — Hold Other Characters & Center Switch+Target (`camFocus`)**:
  - Whenever **any** character (Tom, Cherry, or Bulldog) moves to press a Red->Green wall switch, unlock a cage, or trigger an obstacle on the side of the board, **HOLD/STOP all other heroes** so they never drag the camera away in opposite directions.
  - Use `syncActiveHeroCamera()` (which smoothly pans during `G.autoPlay` instead of jarring teleports) together with `step.camFocus = [fx, fy]` centering **both** the switch-pressing hero **and** the affected gate/saw/spikes inside the `9:16` viewport, plus a `1100–1800ms` post-switch reveal pause.
  - Automated browser checks (`verify_tc_and_spider.js`) enforce that every switch activation records `inFrame === true` (`|sw.x - camX| <= 3.9 && |sw.y - camY| <= 6.2`).
- **Large Crisp Red `✕` Death Overlay**:
  - Defeated heroes and defeated Villains render a large, high-contrast vector diagonal red `✕` (`72–84%` of portrait box size with dark outline stroke in `GameRecorder.renderFrame()`, and enlarged `.ct.dead::after` in `T_C_index.html`), preserving the character face cleanly with no opaque red box fill.

---

## 17. One-by-One Shrinking Exit-to-TopCast Flight & Conditional Puzzles (`Level 11+`)

- **Sequential One-by-One Exit Arrival (`L.exitFly: true`)**:
  - At the end of Level 11+, teammates step onto `L.exit` **strictly one by one** (never piling on the Exit cell together; next hero waits 1 cell back until the previous launch begins).
  - The instant a hero reaches Exit, they vanish from the maze floor (`draw()` skips heroes with `h.exitFlyStart`) so nobody lingers motionless on the Exit portal.
- **Fast Shrinking Flight Above Channel Strip Into Green Tick (`~460ms`)**:
  - Both `GameRecorder.renderFrame()` and `#fly-layer` call `computeExitFlyPose()` to launch a snappy `460ms` parabolic upward flight from the Exit tile, crossing cleanly above the `GLOBAL GAMES SK` channel bar into that hero's matching top cast box.
  - Size progressively shrinks (`startMazeSize -> 70% castBoxSize`) as the portrait nears its top slot, and its **green border + green `✔`** (`h.escaped = true`) triggers on arrival (`T >= exitFlyStart + 460ms`) so top ticks light up sequentially **1 -> 2 -> 3** with zero wasted time, followed immediately by Grand Victory (`allEscaped`).
- **Conditional Multi-Hero Dependencies**:
  - Levels use logical lock-and-key chains: e.g., Cherry disabling Tom's upper laser, Tom freeing Bulldog in-frame, Cherry crossing spinning saws shielded to retract blades for Bulldog's Bomb #1 vs Red Fox, and Cherry springing a left betrayal gate that requires Tom's outside rescue switch before Black Fox & Buffalo 1v1 duels.

---

## 18. Enemy Clean-Frame, Blocked-Star Sad Emotions & End-State Portrait Rules (`Level 12+`)

- **No Floating Enemy Name / Stunned Bars**: Never draw text bars (`RED FOX`, `BLACK FOX`, `BUFFALO`, or `STUNNED!`) above enemy boss cards on the board (`tc_game.js`); communicate enemy stun visually through their `sad_cry`/`scared` face and spinning golden dizzy stars only.
- **Conditional Blocked-Goal / Blocked-Star Sad Emotion**:
  - When a hero (`Cherry`, `Tom`, `Bulldog`) stands adjacent to a locked barrier/gate (`!gate.open`) trying to reach a nearby uncollected Star Coin or blocked route (`isHeroBlockedForGoal(h)` or scripted `step.emo: "sad"`), show `"sad"` (`cherry_sad`, `tom_sad_cry`, `bulldog_sad`) until a teammate unlocks the gate, then flip to `"laugh"` / `"happy"` on collection.
- **Alive vs Fallen End Portraits (No Sleepy Eyes on Victory!)**:
  - Alive green-tick heroes (`escaped === true`) MUST always render wide-open bright **happy** portraits (`tom_happy`, `cherry_happy`, `bulldog_happy`), never closed-eye laughing/sleepy variants (`bulldog_laugh`, `cherry_joy`).
  - Fallen teammates (e.g., **Bulldog** dying heroically fighting **Black Fox** in **Level 12**) render their **sad/cry** expression (`bulldog_crying` / `cherry_sad` / `tom_sad_cry`) + a **large bold vector Red `✕`** across both the Top Cast Strip and the `"2 HEROES ESCAPED!"` Survivors Victory Banner, while surviving teammates show brief grief (`"sad"`) before avenging them and escaping one by one.

## 19. 4K UHD Recording & Sub-30s Fast Shorts Protocol (Level 13+)
- **4K UHD Recorder Export (`#sel-rec-res = "4k"`)**:
  - `GameRecorder` supports **`1080p` (`1080×1920` / `1920×1080`, 9 Mbps)**, **`2k` (`1440×2560` / `2560×1440`, 24 Mbps)**, and **`4k` (`2160×3840` `9:16` Shorts / `3840×2160` `16:9` UHD, 35 Mbps)**.
  - Codec priority negotiates H.264 High Profile Level 5.2 (`video/mp4;codecs=avc1.640034,mp4a.40.2`) with clean fallback to L5.1 (`avc1.640033`), standard H.264, or VP9/WebM, producing crisp `2x` studio typography, Top Cast headers, emerald checkmarks, and exit-flight trails.
- **Strictly Under-30-Second Automated Shorts (`under30s: true`, Level 13+)**:
  - Levels flagged `under30s: true` (starting with **Level 13: Swift Sacrifice (<30s)**) use a compact `7 × 10` (`W=22, H=31`) full-carved 1-layer inner-wall maze, faster hero speed multipliers (`0.88–1.10`), tight dramatic pauses, and a shortened **`1600ms` post-victory recorder hold** so **both automated gameplay time and total downloaded MP4 duration stay strictly `< 30 seconds`** while preserving every story rule (blocked-star sad reaction, 100% in-frame switches, strict 1v1 combat, heroic teammate sacrifice with bold Red `✕`, teammate grief & revenge, and staggered one-by-one Exit-to-TopCast flight into open-eyed Happy portraits).

## 20. Big-Crying Death-to-Red-Cross Flight & Compact 32s Pace (Level 14+)
- **Death-to-Red-Cross Flight (`deathFly`, enabled automatically alongside `exitFly` and explicitly on Level 14+)**:
  - Right when a friendly hero falls in combat (`h.hp <= 0`), instead of jumping straight to a static Red `✕`, a **large crying portrait** (`~1.48×` normal hero scale, crimson glow border `#ff1e38`, using `"cry"` emotion asset e.g. `cherry_sad` or `bulldog_crying`) spawns at the combat spot and flies smoothly upward across the `GLOBAL GAMES SK` channel bar while steadily shrinking down into the hero's Top Cast card (`~640ms`), stamping the bold vector **Red `✕`** only on landing (`h.deathBadgeReady = true`).
- **Smooth Natural Pace Compact Grid (`Level 14: Bulldog's Stand (32s)`)**:
  - Uses a reduced `6 × 10` (`W=19, H=31`) maze with smoother hero speed multipliers (`0.60–0.66`, vs faster L13 speed) and `winHoldMs: 2800` so the full gameplay (`~29.07s`) + post-victory hold (`2.8s`) records cleanly around **`~32 seconds` (`31.87s`)**, featuring **Bulldog's** heroic combat sacrifice against Black Fox (`bulldog_crying` shrinking flight -> Red `✕`) followed by **Tom**'s revenge and **Cherry -> Tom** one-by-one Exit-to-TopCast victory flight.
