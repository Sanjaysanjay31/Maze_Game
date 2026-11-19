# Spider Maze

Open `index.html` in a browser (double-click). Fonts load from Google Fonts when online and fall back to system fonts offline.

## Files
- `index.html`, `style.css` – page, start menu (9:16 or 16:9) and styling.
- `game.js` – the engine. It is level-independent: it plays whatever is in `window.LEVELS`.
- `assets.js` – character images by name.
- `levels/level1.js` – Level 1 data. More levels are added the same way.
- `tools/make_level.py` – makes a new level file (needs Python 3).
- `assets/spider.png` – the Spider-Man tile.
- `audio/` – `audio.js` (sound engine), `sfx/*.wav` (17 sound effects), `music/calm.wav` and `music/action.wav` (adaptive music loop), `audio-data.js` (generated bundle used by the game).
- `vfx/vfx.js` – all visual effects (dust cloud, star burst, rings, plus signs, floating text, confetti, flashes).

## Controls
Hold an arrow key or WASD to run and let go to stop. On touch screens press and drag on the maze (or hold the arrow pad). Sound can be switched off with the speaker button.

## Add a new level
1. `cd tools`
2. `python3 make_level.py --name "Level 2" --cols 8 --rows 15 --lasers 4 --saws 4 --wall-blades 4 --friends spiderman --enemies venom --out ../levels/level2.js`
3. Add `<script src="levels/level2.js"></script>` after level1 in `index.html`. After Level 1 the game offers "Next level".

Options: `--cols --rows --lasers --saws --wall-blades --shields --heals --seed`. Use `--seed N` to keep a layout you like.

## Characters on the top bar
Each level lists its characters (1 to 6 in total). Friends are shown on the left and enemies on the right. "VS" appears only when both sides exist: one character, or only friends, shows no "VS".
Put each name in `assets.js` with an image. Enemies patrol back and forth and cost health on contact. A character that is out of health gets a red cross.

## Hazards and pickups
Blades patrol corridors. Wall blades slide out of a wall, go through it and come out in the next corridor, so wait until they are gone. Lasers switch on and off. Green + gives health. A blue shield blocks all damage for 8 seconds. Health bar colours: green 61 to 100, yellow 31 to 60, red 1 to 30.

## Sound and effects
- The sounds are synthesised by `tools/make_audio.py` (needs numpy and scipy). Edit a function, run `python3 make_audio.py`, and it rewrites the WAV files and `audio/audio-data.js`. You can also replace any WAV with your own recording of the same name and run the script's bundling step (see `build()`), or just re-run after swapping files.
- Stars play a rising scale when you collect them quickly. Blades, wall blades and lasers get louder and pan left or right as you get close. The music is calm when Spider-Man stands still and becomes energetic when he runs. A heartbeat and red screen edge warn you at 1 health.
- `vfx/vfx.js` works in any level: `VFX.add("ring", x, y, T)`, `VFX.text(x, y, "+1", T)`, `VFX.flash("255,40,60", T)`.
