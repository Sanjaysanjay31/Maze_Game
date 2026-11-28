# Tom & Cherry Maze — Extracted Sound Effects & Character Scene Guide

All sound clips in this folder (`T_C_Sounds/`) were extracted from the two reference gameplay videos (`44.1 kHz`, 16-bit stereo `.wav`), spectrally cleaned to suppress the background Phonk music, fade-trimmed for click-free playback, and peak-normalized (`-0.5 dBFS`) so they punch clearly in future **Tom & Cherry Arcade Maze** levels.

---

## 1. Source Videos Referenced

| ID | Source Video | Duration | Characters Shown |
|---|---|---|---|
| **V1** | `Tom_and_jerry_maze_challenge_with_crazy_twist___#tomandjerry_#animation_(2).mp4` | `25.61s` | **Tom**, **Jerry (Cherry)**, **Red Fox**, **Black Fox (Butch)**, **Buff Tom (`💪`)** |
| **V2** | `TOM_AND_JERRY_MAZE_CHALLENGE_-_Quacker's_BIG_MISTAKE..._The_WHOLE_TEAM_Almost_DIED_#tomandjerry.mp4` | `39.02s` | **Tom**, **Jerry (Cherry)**, **Bulldog (Spike)**, **Quacker**, **Buffalo**, **Black Fox**, **Red Fox** |

---

## 2. Complete Sound Clip Catalog & Scene Mapping

### A. Hero Damage, Panic & Scream Sounds

| File | Source & Timestamp | Duration | Character | Scene in Reference Video | Recommended Future Game Event |
|---|---|---|---|---|---|
| `tom_laser_scream.wav` | V1 `0.92s – 1.56s` | `0.64s` | **Tom** | Tom touches the active blue laser fence (`1.0s`) and gets shocked. | Tom hits a laser or saw blade (`hitHero` for Tom). |
| `tom_pain_scream.wav` | V1 `2.48s – 3.36s` | `0.88s` | **Tom** | Tom takes a heavy hit near the blue laser as Red Fox enters (`2.5s – 3.3s`). | Tom critical / low-HP hit (`hp <= 2`) or Tom knocked out. |
| `tom_surrounded_scream.wav` | V2 `37.32s – 37.78s` | `0.46s` | **Tom** | Tom is at low HP, cornered by Buffalo, Black Fox & Red Fox on the *"HELP TOM? YES / NO"* screen (`37.4s`). | Mission Failed / Defeat (`triggerDefeat`) or Boss ambush at 1 HP. |
| `tom_buff_roar.wav` | V1 `23.74s – 24.58s` | `0.84s` | **Buff Tom** | Powered-up Buff Tom (`💪`) charges straight through the red laser barrier (`23.8s – 24.5s`). | Throwing a bomb (`throwHeroBomb`), smashing a hazard, or Buff Power-Up attack. |

---

### B. Hero Reactions, Laughs & Confusion Cues

| File | Source & Timestamp | Duration | Character | Scene in Reference Video | Recommended Future Game Event |
|---|---|---|---|---|---|
| `jerry_happy_laugh.wav` | V1 `6.46s – 7.18s` | `0.72s` | **Cherry (Jerry)** | Jerry laughs joyfully after Red Fox gets blown into smoke (`6.5s`). | Cherry collects star coin, opens gate, or wins/escapes (`escaped`). |
| `jerry_hehe.wav` | V1 `22.64s – 22.90s` | `0.26s` | **Cherry (Jerry)** | Quick mischievous *"Hehe!"* right after Tom grabs the Muscle Power-Up (`22.6s`). | Cherry presses a wall switch or collects a star coin. |
| `jerry_chase_laugh.wav` | V1 `16.60s – 17.92s` | `1.32s` | **Cherry (Jerry)** | Jerry weaves past spinning saw blades while Black Fox chases (`16.6s – 17.9s`). | Narrowly dodging a saw/boss or stunning a villain with a bomb. |
| `quacker_giggle.wav` | V2 `5.64s – 6.02s` | `0.38s` | **Quacker / Cherry** | Playful high-pitched giggle in the corridor before the Quacker/Jerry split (`5.6s`). | Cute hero pickup, healing bubble (`heal`), or Quacker hero action. |
| `cartoon_uh_oh.wav` | V1 `7.84s – 8.18s` | `0.34s` | **Cherry / Tom** | Classic *"Uh-oh!"* when approaching a red trap / switch junction (`7.9s`). | Laser warning (`lWarn`), locked gate notice, or bomb throw warning. |
| `cartoon_what_pop.wav` | V1 `11.60s – 11.86s` | `0.26s` | **Cherry (Jerry)** | Quick surprised *"Wha?!"* pop as Jerry passes the `?` mystery bubble (`11.6s`). | Mystery `?` pickup or bomb pickup prompt (`Press 7`). |
| `cartoon_huh_confused.wav` | V2 `3.18s – 3.44s` | `0.26s` | **Tom** | Confused *"Huh?!"* right after Bulldog gets blasted by the red laser (`3.2s`). | Hero hits a locked barrier or teammate goes down. |
| `cartoon_huh_double.wav` | V2 `3.74s – 4.32s` | `0.58s` | **Tom** | Double *"Huh? Huh?!"* while navigating the wind-trap corridor (`3.8s – 4.3s`). | Sudden trap activation or boss entering line of sight. |
| `cartoon_huh_sharp.wav` | V2 `22.26s – 22.54s` | `0.28s` | **Cherry (Jerry)** | Sharp startled *"Huh?!"* when Black Fox & Red Fox ambush Jerry (`22.3s`). | Villain ambush / boss enters `hunt` mode near hero. |

---

### C. Villain & Boss Sounds (Red Fox, Black Fox, Buffalo)

| File | Source & Timestamp | Duration | Character | Scene in Reference Video | Recommended Future Game Event |
|---|---|---|---|---|---|
| `villain_evil_laugh.wav` | V1 `4.68s – 5.26s` | `0.58s` | **Red Fox** | Red Fox taunts Tom with a sinister cartoon chuckle before clashing (`4.7s – 5.2s`). | Boss (`Buffalo` / `Black Fox` / `Red Fox`) spots hero and starts hunting (`hunt` mode). |
| `villain_growl_clash.wav` | V1 `5.22s – 6.02s` | `0.80s` | **Red Fox / Tom** | Angry beast growl into cartoon crash & smoke burst (`5.2s – 6.0s`). | Boss throws a Power Bomb (`boss.lastAttack`) or collides with shielded hero. |

---

### D. Power-Ups, Shields, Switches & Explosions

| File | Source & Timestamp | Duration | Character / Object | Scene in Reference Video | Recommended Future Game Event |
|---|---|---|---|---|---|
| `shield_slap_hit.wav` | V1 `1.96s – 2.38s` | `0.42s` | **Shield / Laser** | Sharp slap/deflect impact right before Tom takes the shield (`2.0s`). | Shield blocking a trap (`shield_block`) or heavy wall bounce. |
| `shield_energy_slash.wav` | V1 `14.16s – 15.14s` | `0.98s` | **Bubble Shield** | Metallic shimmer deflection as Jerry rolls in the bubble shield past Black Fox (`14.2s – 15.1s`). | Picking up Energy/Bubble Shield (`shield`) or deflecting boss hit. |
| `switch_pop.wav` | V1 `4.14s – 4.38s` | `0.24s` | **Wall Switch** | Crisp cartoon pop when activating shield/switch (`4.2s`). | Pressing a wall switch (`switches`) or UI button click. |
| `smoke_poof.wav` | V1 `18.46s – 18.88s` | `0.42s` | **Smoke Cloud** | Cartoon explosion smoke puff in the lower corridor (`18.5s`). | Gate blown open, bomb explosion, or character eliminated puff. |
| `powerup_boing.wav` | V1 `18.92s – 19.65s` | `0.73s` | **Power-Up Spawn** | Bouncy cartoon spring *"Boing!"* as the Muscle (`💪`) orb appears (`19.0s`). | Power-up spawn, bounce pad, or mystery bubble trigger. |
| `powerup_sparkle_chime.wav` | V1 `19.84s – 20.46s` | `0.62s` | **Muscle / Health Orb** | Ascending magical chime glissando on the glowing power-up (`19.8s – 20.4s`). | Health bubble pickup (`heal`) or 10/10 star combo celebration. |
| `buff_transform_chime.wav` | V1 `21.50s – 22.44s` | `0.94s` | **Buff Tom (`💪`)** | Rising heroic shimmer when Tom picks up the Muscle Power-Up (`21.5s – 22.4s`). | Activating Muscle/Invincibility Power-Up or Super Shield mode. |

---

## 3. Quick Integration Guide for Future Levels (`audio/audio.js` & `tc_game.js`)

When ready to wire these into future Tom & Cherry levels:
1. Copy the desired `.wav` files from `T_C_Sounds/` into `audio/sfx/` (or build a dedicated `tc_audio-data.js` bundle with a Python script similar to `tools/make_audio.py`).
2. Trigger character-specific sounds based on `h.id` and scene state:
   - **Tom Hit**: `tom_laser_scream` (normal hit) -> `tom_pain_scream` (low HP) -> `tom_surrounded_scream` (defeat).
   - **Cherry Actions**: `jerry_hehe` (switch/star) -> `jerry_happy_laugh` (escape/win) -> `cartoon_uh_oh` (danger/laser warning).
   - **Bulldog / Quacker**: `quacker_giggle` (pickup/heal), `cartoon_huh_confused` / `cartoon_huh_sharp` (ambush/locked gate).
   - **Villains (Buffalo, Black Fox, Red Fox)**: `villain_evil_laugh` (entering `hunt` mode), `villain_growl_clash` (bomb attack / stun clash).
   - **Power-Ups & Traps**: `powerup_boing` + `powerup_sparkle_chime` (item spawn/heal), `buff_transform_chime` + `tom_buff_roar` (Muscle power-up), `shield_energy_slash` + `shield_slap_hit` (shield pickup/block), `smoke_poof` (gate unlock / bomb blast).
