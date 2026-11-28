const { spawn } = require('child_process');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_DIR = path.resolve(__dirname, "..");
const SPIDER_URL = "file:///" + path.join(BASE_DIR, "index.html").replace(/\\/g, "/");
const TC_URL = "file:///" + path.join(BASE_DIR, "T_C_index.html").replace(/\\/g, "/");

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getWsUrl(port) {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const data = await res.json();
      if (data && data.length > 0 && data[0].webSocketDebuggerUrl) {
        return data[0].webSocketDebuggerUrl;
      }
    } catch (e) {
      await sleep(200);
    }
  }
  throw new Error("Failed to get CDP WebSocket URL");
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
    this.errors = [];
  }
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = err => reject(err);
      this.ws.onmessage = msg => {
        const data = JSON.parse(msg.data);
        if (data.method === "Runtime.exceptionThrown") {
          this.errors.push(JSON.stringify(data.params));
        }
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text + " " + JSON.stringify(res.exceptionDetails.exception));
    }
    return res.result ? res.result.value : undefined;
  }
}

async function runPageCheck(url, port, fn) {
  const proc = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    "--allow-file-access-from-files",
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1080,1920",
    url
  ]);
  try {
    const wsUrl = await getWsUrl(port);
    const client = new CDPClient(wsUrl);
    await client.connect();
    await client.send("Runtime.enable");
    for (let i = 0; i < 40; i++) {
      await sleep(250);
      const ready = await client.eval(`typeof IM !== "undefined" && document.readyState === "complete"`).catch(() => false);
      if (ready || client.errors.length > 0) break;
    }
    if (client.errors.length > 0) {
      throw new Error(`Runtime exceptions on ${url}: ${client.errors.join("; ")}`);
    }
    await sleep(400);
    await fn(client);
    if (client.errors.length > 0) {
      throw new Error(`Runtime exceptions on ${url}: ${client.errors.join("; ")}`);
    }
  } finally {
    proc.kill();
  }
}

async function main() {
  // 1. Verify original Spider-Man index.html is completely intact
  await runPageCheck(SPIDER_URL, 9231, async (c) => {
    const info = await c.eval(`(() => ({
      title: document.title,
      levels: window.LEVELS.length,
      hasSpider: Boolean(IM.spiderman && IM.spiderman.complete && IM.spiderman.naturalWidth > 0),
      heroId: G.p1.id,
      heroName: G.p1.name,
      faceAlt: document.getElementById("face").alt
    }))()`);
    console.log("Spider-Man index.html:", JSON.stringify(info));
    if (info.title !== "Spider-Man Arcade Maze" || info.levels !== 5 || !info.hasSpider || info.heroId !== "spiderman") {
      throw new Error("Spider-Man index.html verification failed!");
    }
  });

  // 2. Verify Tom & Cherry T_C_index.html
  await runPageCheck(TC_URL, 9232, async (c) => {
    const assetsCheck = await c.eval(`(() => {
      const keys = Object.keys(IM);
      const broken = keys.filter(k => !IM[k].complete || IM[k].naturalWidth === 0);
      const props = ["switch_red", "switch_green", "shield_cap", "bomb_evil"].map(k => ({
        key: k,
        ok: Boolean(IM[k] && IM[k].complete && IM[k].naturalWidth > 0),
        w: IM[k] ? IM[k].naturalWidth : 0,
        h: IM[k] ? IM[k].naturalHeight : 0
      }));
      return {
        title: document.title,
        levels: window.LEVELS.length,
        assetCount: keys.length,
        broken,
        props,
        faceAlt: document.getElementById("face").alt
      };
    })()`);
    console.log("T_C_index.html assets:", JSON.stringify(assetsCheck));
    if (assetsCheck.broken.length > 0 || assetsCheck.levels !== 14 || assetsCheck.assetCount < 34 || assetsCheck.props.some(p => !p.ok)) {
      throw new Error("T_C_index.html asset/level/prop check failed!");
    }

    // Test all 14 levels load and render cleanly
    for (let i = 0; i < 14; i++) {
      const lvlInfo = await c.eval(`(() => {
        loadLevel(${i});
        state = "play";
        draw();
        return {
          idx: ${i},
          name: L.name,
          heroes: [G.p1?.id, G.p2?.id, G.p3?.id].filter(Boolean),
          bosses: (G.bosses || []).map(b => b.id),
          castCount: document.querySelectorAll(".ct").length,
          crowded: document.getElementById("cast").classList.contains("crowded")
        };
      })()`);
      console.log(`Level ${i + 1}:`, JSON.stringify(lvlInfo));
    }

    // Test scene-based emotion transitions and immediate revert to normal!
    const emoResult = await c.eval(`(() => {
      loadLevel(5); // Level 6 with Tom, Cherry, Bulldog + Buffalo, Black Fox, Red Fox
      state = "play";
      // Place heroes away from hazards for clean normal baseline
      G.p1.i = 0; G.p1.j = 0; G.p1.bi = 0; G.p1.bj = 0; G.p1.t = 0;
      G.p2.i = 2; G.p2.j = 0; G.p2.bi = 2; G.p2.bj = 0; G.p2.t = 0;
      G.p3.i = 1; G.p3.j = 0; G.p3.bi = 1; G.p3.bj = 0; G.p3.t = 0;
      G.bosses.forEach(b => { b.x = 17; b.y = 32; });
      T = 5000;
      G.p1.lastMoveT = T; G.p2.lastMoveT = T; G.p3.lastMoveT = T;
      ui();
      const base = {
        tom: getHeroEmotionName(G.p1),
        cherry: getHeroEmotionName(G.p2),
        bulldog: getHeroEmotionName(G.p3),
        hudTom: document.querySelector('.ct[data-n="tom"] img').dataset.emoKey
      };

      // Hit Tom -> dizzy (1.2s) -> sad (1.2s) -> immediate normal
      hitHero(G.p1, "Ouch");
      ui();
      const tomJustHit = getHeroEmotionName(G.p1);
      const hudJustHit = document.querySelector('.ct[data-n="tom"] img').dataset.emoKey;

      T += 1300; // inside second phase (sad)
      ui();
      const tomPhase2 = getHeroEmotionName(G.p1);
      const hudPhase2 = document.querySelector('.ct[data-n="tom"] img').dataset.emoKey;

      T += 1200; // past 2.4s -> immediate normal
      ui();
      const tomAfterHit = getHeroEmotionName(G.p1);
      const hudAfterHit = document.querySelector('.ct[data-n="tom"] img').dataset.emoKey;

      // Verify Cherry shield uses wide-eyed laugh (no closed-eye wink) & Bulldog stays happy after 10s idle
      T += 10000;
      ui();
      const bulldogIdle = document.querySelector('.ct[data-n="bulldog"] img').dataset.emoKey;

      // Shield pickup -> laugh for Cherry (2s) -> immediate normal
      setHeroEmotion(G.p2, "smug", 2.0, 5);
      ui();
      const cherryShield = document.querySelector('.ct[data-n="cherry"] img').dataset.emoKey;
      T += 2100;
      ui();
      const cherryAfterShield = document.querySelector('.ct[data-n="cherry"] img').dataset.emoKey;

      // Check HUD sizes (+30% larger cast portraits, narrower brand-strip width)
      const hudRects = {
        ctW: document.querySelector('.ct').getBoundingClientRect().width,
        brandW: document.getElementById('brand-strip').getBoundingClientRect().width,
        frameW: document.getElementById('frame').getBoundingClientRect().width,
        brandH: document.getElementById('brand-strip').getBoundingClientRect().height
      };

      // Boss stun -> sad_cry for 5s -> immediate normal
      G.bosses[0].stunnedUntil = T + 5000;
      G.bosses[0].mode = "patrol";
      ui();
      const bufStun = document.querySelector('.ct[data-n="buffalo"] img').dataset.emoKey;
      T += 5100;
      ui();
      const bufAfterStun = document.querySelector('.ct[data-n="buffalo"] img').dataset.emoKey;

      // Victory -> joy
      state = "won";
      G.p1.escaped = true; G.p2.escaped = true; G.p3.escaped = true;
      draw(); ui();
      const winEmos = {
        tom: document.querySelector('.ct[data-n="tom"] img').dataset.emoKey,
        cherry: document.querySelector('.ct[data-n="cherry"] img').dataset.emoKey,
        bulldog: document.querySelector('.ct[data-n="bulldog"] img').dataset.emoKey
      };

      return { base, tomJustHit, hudJustHit, tomPhase2, hudPhase2, tomAfterHit, hudAfterHit, bulldogIdle, cherryShield, cherryAfterShield, hudRects, bufStun, bufAfterStun, winEmos };
    })()`);
    console.log("Emotion verification:", JSON.stringify(emoResult, null, 2));
    if (
      emoResult.base.tom !== "normal" ||
      emoResult.hudJustHit !== "tom_dizzy" ||
      emoResult.hudPhase2 !== "tom_sad_cry" ||
      emoResult.hudAfterHit !== "tom_happy" ||
      emoResult.bulldogIdle !== "bulldog_happy" ||
      emoResult.cherryShield !== "cherry_laugh" ||
      emoResult.cherryAfterShield !== "cherry_happy" ||
      emoResult.bufStun !== "buffalo_sad_cry" ||
      emoResult.bufAfterStun !== "buffalo_normal_scared" ||
      emoResult.winEmos.tom !== "tom_happy" ||
      emoResult.winEmos.cherry !== "cherry_happy" ||
      emoResult.winEmos.bulldog !== "bulldog_happy"
    ) {
      throw new Error("Emotion transition assertion failed!");
    }

    // Capture Level 4 HUD screenshot (with Cherry dead to verify red cross without red background!)
    await c.eval(`(() => {
      loadLevel(3);
      document.getElementById("frame").classList.add("playing");
      document.getElementById("ov").hidden = true;
      state = "play";
      T = 10000;
      G.dead.add("cherry");
      ui(); draw();
    })()`);
    await sleep(300);
    const shot = await c.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1080, height: 600, scale: 1 } });
    require("fs").writeFileSync("C:/Users/katta/.gemini/antigravity/brain/c2be85bd-3af4-4ab7-a6e9-b6613e7ab5fa/scratch/tc_hud_verify.png", Buffer.from(shot.data, "base64"));

    // Verify Props, Red->Green Switch Open/Close Toggle, Shield Directional/Spikes Pass, & Bomb Blast Spikes
    const mechanicsCheck = await c.eval(`(() => {
      loadLevel(0); // Level 1 (blue theme)
      document.getElementById("frame").classList.add("playing");
      document.getElementById("ov").hidden = true;
      state = "play";
      T = 5000;

      // 1. Switch starts Red (closed), spikes start closed
      const sw = G.switches[0];
      const sp1 = G.spikes.find(s => s.id === "sp1");
      const initSwActive = sw.active;
      const initSpOpen = sp1.open;

      // 2. Unprotected hero tries to cross sp1 ([20,32], cell (6,10)) -> loses 1 HP and stays blocked even during inv frames!
      const hpBefore = G.p1.hp;
      G.p1.i = 6; G.p1.j = 9; G.p1.bi = 6; G.p1.bj = 10; G.p1.t = 0.7; G.p1.last = [6, 9];
      update(16);
      const hpAfterSpike1 = G.p1.hp;
      const blockedOnInv = (G.p1.t === 0 && (G.p1.j !== 10));
      // Try again immediately while invulnerable: must still block and NOT increment j to 10
      G.p1.i = 6; G.p1.j = 9; G.p1.bi = 6; G.p1.bj = 10; G.p1.t = 0.7;
      update(16);
      const hpOnInv = G.p1.hp;
      const blockedSecondTime = (G.p1.t === 0 && G.p1.j === 9);

      // 3. Shield allows passing straight through closed Zigzag Spikes unharmed
      G.p1.shield = T + 8000;
      G.p1.look = [1, 0];
      G.p1.i = 6; G.p1.j = 10; G.p1.bi = 6; G.p1.bj = 10; G.p1.t = 0;
      update(16);
      const hpWithShield = G.p1.hp;

      // 4. Press Red Switch -> turns Green (open) and opens spikes! Step away & press again -> closes (Red)!
      G.p1.i = 1; G.p1.j = 0; G.p1.bi = 1; G.p1.bj = 0; G.p1.t = 0; // switch at [5, 2]
      update(16);
      const swAfterFirstPress = sw.active;
      const spAfterFirstPress = sp1.open;

      G.p1.i = 2; G.p1.j = 0; G.p1.bi = 2; G.p1.bj = 0; G.p1.t = 0; // step away
      update(16);
      G.p1.i = 1; G.p1.j = 0; G.p1.bi = 1; G.p1.bj = 0; G.p1.t = 0; // step back in -> toggle closes
      update(16);
      const swAfterToggleClose = sw.active;
      const spAfterToggleClose = sp1.open;

      // 0. Verify 3-second intro hook lock (T < 3000 blocks shield pickup)
      G.p1.shield = 0;
      T = 1500;
      G.p1.i = 2; G.p1.j = 10; G.p1.bi = 2; G.p1.bj = 10; G.p1.t = 0; // on L1 shield [8, 32]
      update(16);
      const shieldBlockedUnder3s = (G.p1.shield === 0 && !G.shields[0].got);
      T = 5000;
      update(16);
      const shieldWorksAfter3s = (G.p1.shield > T && G.shields[0].got === 1);
      G.p1.shield = 0;

      // 5. Bomb throw blasts closed Zigzag Spikes (sp1)
      G.p1.i = 6; G.p1.j = 9; G.p1.bi = 6; G.p1.bj = 9; G.p1.t = 0;
      G.p1.look = [0, 1];
      G.p1.bombs = 1; G.p1.holdingBomb = true;
      throwHeroBomb(G.p1);
      const projCountAfterThrow = G.projectiles.length;
      const projTargetType = G.projectiles[0] ? G.projectiles[0].targetType : null;
      T += 1000;
      update(16);
      const sp1DestroyedByBomb = sp1.destroyed;

      return {
        initSwActive, initSpOpen,
        hpBefore, hpAfterSpike1, blockedOnInv, hpOnInv, blockedSecondTime,
        hpWithShield,
        swAfterFirstPress, spAfterFirstPress,
        swAfterToggleClose, spAfterToggleClose,
        shieldBlockedUnder3s, shieldWorksAfter3s,
        projCountAfterThrow, projTargetType, sp1DestroyedByBomb
      };
    })()`);
    console.log("Props & Spikes Mechanics:", JSON.stringify(mechanicsCheck, null, 2));
    if (
      mechanicsCheck.initSwActive !== false ||
      mechanicsCheck.initSpOpen !== false ||
      mechanicsCheck.hpAfterSpike1 !== mechanicsCheck.hpBefore - 1 ||
      !mechanicsCheck.blockedOnInv ||
      mechanicsCheck.hpOnInv !== mechanicsCheck.hpAfterSpike1 ||
      !mechanicsCheck.blockedSecondTime ||
      mechanicsCheck.hpWithShield !== mechanicsCheck.hpAfterSpike1 ||
      mechanicsCheck.swAfterFirstPress !== true ||
      mechanicsCheck.spAfterFirstPress !== true ||
      mechanicsCheck.swAfterToggleClose !== false ||
      mechanicsCheck.spAfterToggleClose !== false ||
      !mechanicsCheck.shieldBlockedUnder3s ||
      !mechanicsCheck.shieldWorksAfter3s ||
      mechanicsCheck.projTargetType !== "spike" ||
      mechanicsCheck.sp1DestroyedByBomb !== true
    ) {
      throw new Error("Props / Spikes / Switch / Shield / Bomb mechanics assertion failed!");
    }

    // Scene Screenshot A: Level 2 showing flush Red switch, Shield half-over hero, Bomb w/ fire, & Blue 3D Zigzag Cones
    await c.eval(`(() => {
      loadLevel(1); // Level 2 Co-op Duo
      document.getElementById("frame").classList.add("playing");
      document.getElementById("ov").hidden = true;
      state = "play";
      T = 6000;
      G.active = 1;
      G.p1.i = 1; G.p1.j = 8; G.p1.bi = 1; G.p1.bj = 8; G.p1.t = 0; // [5, 26]
      G.p1.look = [0, 1];
      G.p1.shield = T + 8000;
      G.p1.holdingBomb = true;
      G.p1.bombs = 1;
      camX = 5; camY = 24;
      ui(); draw();
    })()`);
    await sleep(300);
    const sceneA = await c.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1080, height: 1400, scale: 1 } });
    require("fs").writeFileSync("C:/Users/katta/.gemini/antigravity/brain/c2be85bd-3af4-4ab7-a6e9-b6613e7ab5fa/scratch/tc_props_scene_blue.png", Buffer.from(sceneA.data, "base64"));

    // Scene Screenshot B: Level 6 (purple theme) showing Green wall switch, side-pocket Bomb, Shield half-over hero & Purple 3D Zigzag Cones!
    await c.eval(`(() => {
      loadLevel(5); // Level 6 Villain Trio Showdown (purple)
      document.getElementById("frame").classList.add("playing");
      document.getElementById("ov").hidden = true;
      state = "play";
      T = 7000;
      // Show sw6 active GREEN on wall at [11, 41], side-pocket bomb at [14, 38], Purple cones at [11, 44], and Bulldog wearing Shield RIGHT
      G.switches[5].active = true;
      G.active = 3;
      G.p3.i = 2; G.p3.j = 12; G.p3.bi = 2; G.p3.bj = 12; G.p3.t = 0; // [8, 38]
      G.p3.look = [1, 0];
      G.p3.shield = T + 8000;
      G.bosses.forEach(b => { b.x = 2; b.y = 5; });
      camX = 11; camY = 41;
      ui(); draw();
    })()`);
    await sleep(300);
    const sceneB = await c.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1080, height: 1400, scale: 1 } });
    require("fs").writeFileSync("C:/Users/katta/.gemini/antigravity/brain/c2be85bd-3af4-4ab7-a6e9-b6613e7ab5fa/scratch/tc_props_scene_purple.png", Buffer.from(sceneB.data, "base64"));
    // Scene Screenshot C: Level 7 (Tom & Cherry only) showing side-shifted Shield (face visible!), white-and-black Green Switch & wide Black 3D Cones!
    await c.eval(`(() => {
      loadLevel(6); // Level 7: Matrix Blitz (Tom & Cherry only)
      document.getElementById("frame").classList.add("playing");
      document.getElementById("ov").hidden = true;
      state = "play";
      T = 7000;
      G.switches[1].active = true; // Green switch at [2, 20]
      G.active = 2;
      G.p2.i = 2; G.p2.j = 5; G.p2.bi = 2; G.p2.bj = 5; G.p2.t = 0; // [8, 17]
      G.p2.look = [-1, 0];
      G.p2.shield = T + 8000;
      G.p1.i = 1; G.p1.j = 8; G.p1.bi = 1; G.p1.bj = 8; G.p1.t = 0; // [5, 26]
      G.p1.look = [0, 1];
      G.p1.holdingBomb = true;
      G.p1.bombs = 1;
      camX = 6; camY = 23;
      ui(); draw();
    })()`);
    await sleep(300);
    const sceneC = await c.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1080, height: 1400, scale: 1 } });
    require("fs").writeFileSync("C:/Users/katta/.gemini/antigravity/brain/c2be85bd-3af4-4ab7-a6e9-b6613e7ab5fa/scratch/tc_level7_scene.png", Buffer.from(sceneC.data, "base64"));

    // Level 8: Emerald Trio Twist — Verify UI Ratio -> Auto-Play Option -> Level 8 click + Full Auto-Play Run (< 50s, 10/10 stars, 3/3 escaped!)
    await c.eval(`(() => {
      // Verify UI click flow: Quality/Ratio -> Auto-Play Option -> Level 8 click!
      showMenu("ratio");
      document.getElementById("btn-to-levels").click();
      document.getElementById("btn-autoplay-opt").click();
      document.querySelector('.lvl-card[data-lvl="7"] .lvl-btn[data-lvl="7"]').click();
      if (GameRecorder.recording) GameRecorder.stop();
      // Frame a clear Level 8 Emerald + Black Spikes + Green White-Plate Switch + Side Shield scene for visual check
      loadLevel(7);
      run(true);
      if (GameRecorder.recording) GameRecorder.stop();
      T = 7000;
      G.switches[1].active = true; // sw2 GREEN at [14, 20]
      G.active = 2;
      G.p2.i = 6; G.p2.j = 7; G.p2.bi = 6; G.p2.bj = 7; G.p2.t = 0; // [20, 23] above Black Spikes [20, 26]
      G.p2.look = [0, 1];
      G.p2.shield = T + 8000;
      camX = 18; camY = 23;
      ui(); draw();
    })()`);
    await sleep(300);
    const sceneL8Start = await c.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1080, height: 1400, scale: 1 } });
    require("fs").writeFileSync("C:/Users/katta/.gemini/antigravity/brain/c2be85bd-3af4-4ab7-a6e9-b6613e7ab5fa/scratch/tc_level8_emerald.png", Buffer.from(sceneL8Start.data, "base64"));

    const l8AutoResult = await c.eval(`(async () => {
      await initTcSounds();
      const tcBufKeys = Object.keys(GameAudio.buf || {}).filter(k => k.startsWith("tc_"));
      loadLevel(7);
      run(true);
      await new Promise(r => setTimeout(r, 60));
      let hookCleanAt2s = null;
      let twistTriggered = false;
      let cherryShieldPassedSpikes = false;
      let cherryConfrontedSpikesBeforeShield = false;
      let bulldogConfrontedSpikesBeforeSwitch = false;
      let tomZappedByLaser = false;
      let tomLaughedAfterBlast = false;
      const dt = 30;
      for (let step = 0; step < 2500 && state === "play"; step++) {
        update(dt);
        if (Math.abs(T - 2010) < 20) {
          hookCleanAt2s = (!G.p1.holdingBomb && G.p1.shield === 0 && G.p2.shield === 0);
        }
        if (G.p1 && G.p1.hp < 5 && G.p1.emo === "dizzy") tomZappedByLaser = true;
        if (G.lasers[0] && G.lasers[0].destroyed && G.p1 && G.p1.emo === "laugh") tomLaughedAfterBlast = true;
        if (G.p2 && G.p2.i === 6 && G.p2.j === 7 && G.p2.shield === 0) cherryConfrontedSpikesBeforeShield = true;
        if (G.p3 && G.p3.i === 3 && G.p3.j === 8 && !G.switches[2].active) bulldogConfrontedSpikesBeforeSwitch = true;
        const gTrap = G.gates.find(g => g.id === "gate_tom_trap");
        if (G.switches[1].active && gTrap && !gTrap.open) twistTriggered = true;
        if (G.p2 && G.p2.i === 6 && G.p2.j === 9 && T < G.p2.shield) cherryShieldPassedSpikes = true;
      }
      if (GameRecorder.recording) GameRecorder.stop();
      return {
        state,
        elapsedSec: Number((G.t / 1000).toFixed(2)),
        score: G.score,
        totalCoins: L.coins.length,
        escaped: [G.p1?.escaped, G.p2?.escaped, G.p3?.escaped],
        deadCount: G.dead.size,
        tomHp: G.p1?.hp,
        laserDestroyedByBomb: Boolean(G.lasers[0]?.destroyed),
        hookCleanAt2s,
        twistTriggered,
        cherryConfrontedSpikesBeforeShield,
        bulldogConfrontedSpikesBeforeSwitch,
        cherryShieldPassedSpikes,
        tomZappedByLaser,
        tomLaughedAfterBlast,
        tcBufCount: tcBufKeys.length,
        tcPlayedSounds: G.tcPlayedSounds || []
      };
    })()`);
    console.log("Level 8 Auto-Play (<50s) Result:", JSON.stringify(l8AutoResult, null, 2));
    const expectedSounds = [
      "switch_pop", "cartoon_uh_oh", "shield_energy_slash", "shield_slap_hit",
      "cartoon_what_pop", "tom_buff_roar", "smoke_poof", "tom_laser_scream",
      "cartoon_huh_confused", "powerup_sparkle_chime", "jerry_chase_laugh", "buff_transform_chime"
    ];
    const missingSounds = expectedSounds.filter(s => !l8AutoResult.tcPlayedSounds.includes(s));
    if (
      l8AutoResult.state !== "won" ||
      l8AutoResult.elapsedSec >= 50 ||
      l8AutoResult.elapsedSec < 25 ||
      l8AutoResult.score !== 10 ||
      !l8AutoResult.escaped.every(Boolean) ||
      l8AutoResult.deadCount !== 0 ||
      !l8AutoResult.hookCleanAt2s ||
      !l8AutoResult.twistTriggered ||
      !l8AutoResult.cherryConfrontedSpikesBeforeShield ||
      !l8AutoResult.bulldogConfrontedSpikesBeforeSwitch ||
      !l8AutoResult.cherryShieldPassedSpikes ||
      !l8AutoResult.tomZappedByLaser ||
      !l8AutoResult.laserDestroyedByBomb ||
      !l8AutoResult.tomLaughedAfterBlast ||
      l8AutoResult.tcBufCount !== 22 ||
      missingSounds.length > 0
    ) {
      throw new Error("Level 8 Auto-Play / Sound verification failed! Missing sounds: " + missingSounds.join(","));
    }

    // Verify 9:16 + Audio progressive MP4 GameRecorder output decodes cleanly with bright non-black frames
    await c.eval(`(() => {
      GameRecorder.lastBlob = null;
      document.querySelector('.lvl-card[data-lvl="7"] .lvl-btn.auto-btn').click();
      if (!GameRecorder.recording) GameRecorder.start();
    })()`);
    await sleep(2800);
    const mp4Check = await c.eval(`(async () => {
      const mime = GameRecorder.recorder ? GameRecorder.recorder.mimeType : "";
      GameRecorder.stop();
      for (let i = 0; i < 60 && !GameRecorder.lastBlob; i++) await new Promise(r => setTimeout(r, 100));
      const blob = GameRecorder.lastBlob;
      if (!blob) return { err: "No MP4 blob produced", mime };
      const vid = document.createElement("video");
      vid.muted = true;
      vid.src = URL.createObjectURL(blob);
      const loadState = await new Promise(res => {
        vid.onloadeddata = () => res("loaded");
        vid.onerror = () => res("error");
        setTimeout(() => res("timeout"), 5000);
      });
      const vErr = vid.error ? (vid.error.code + ":" + vid.error.message) : null;
      vid.currentTime = Math.min(1.0, (vid.duration || 2) * 0.4);
      await new Promise(r => { vid.onseeked = r; setTimeout(r, 1200); });
      const probe = document.createElement("canvas");
      probe.width = 160; probe.height = 280;
      const pctx = probe.getContext("2d");
      pctx.drawImage(vid, 0, 0, 160, 280);
      const data = pctx.getImageData(0, 0, 160, 280).data;
      let nonBlack = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] + data[i+1] + data[i+2] > 40) nonBlack++;
      }
      const nonBlackPct = Math.round(nonBlack * 100 / (data.length / 4));
      return { loadState, mime, blobSize: blob.size, vErr, w: vid.videoWidth, h: vid.videoHeight, duration: Number((vid.duration || 0).toFixed(2)), nonBlackPct };
    })()`);
    console.log("MP4 Studio Recorder Verification:", JSON.stringify(mp4Check));
    if (mp4Check.loadState !== "loaded" || mp4Check.vErr || mp4Check.w !== 1080 || mp4Check.h !== 1920 || mp4Check.nonBlackPct < 85) {
      throw new Error("MP4 Studio Recorder non-black decode verification failed!");
    }

    // Verify 4K UHD (2160x3840 Shorts & 3840x2160 Landscape) Studio Recorder Support
    await c.eval(`(() => {
      const sel = document.getElementById("sel-rec-res");
      sel.value = "4k";
      sel.dispatchEvent(new Event("change"));
      GameRecorder.lastBlob = null;
      document.querySelector('.lvl-card[data-lvl="12"] .lvl-btn.auto-btn').click();
      if (!GameRecorder.recording) GameRecorder.start();
    })()`);
    await sleep(3200);
    const uhd4kCheck = await c.eval(`(async () => {
      const selText = document.querySelector('#sel-rec-res option[value="4k"]')?.textContent || "";
      const btnLabelWhileRec = document.querySelector("#btn-record .rec-label")?.textContent || "";
      const recBadge4kCheck = GameRecorder.getResSpec();
      GameRecorder.stop();
      for (let i = 0; i < 80 && !GameRecorder.lastBlob; i++) await new Promise(r => setTimeout(r, 100));
      const blob = GameRecorder.lastBlob;
      const modalBadge = document.getElementById("rec-badge")?.textContent || "";
      const specRes = document.getElementById("spec-res")?.textContent || "";
      const dlName = document.getElementById("btn-rec-download")?.download || "";
      const closeBtn = document.getElementById("btn-rec-close");
      if (closeBtn) closeBtn.click();
      // Also check 16:9 4K dimension calculation
      ratio = "16:9";
      GameRecorder.prepareCanvas();
      const landW = GameRecorder.rw, landH = GameRecorder.rh;
      // Restore 9:16 and 1080p for fast remaining tests
      ratio = "9:16";
      const sel = document.getElementById("sel-rec-res");
      sel.value = "1080p";
      sel.dispatchEvent(new Event("change"));
      if (!blob) return { err: "No 4K blob produced" };
      const vid = document.createElement("video");
      vid.muted = true;
      vid.src = URL.createObjectURL(blob);
      const loadState = await new Promise(res => {
        vid.onloadeddata = () => res("loaded");
        vid.onerror = () => res("error");
        setTimeout(() => res("timeout"), 6000);
      });
      const vErr = vid.error ? (vid.error.code + ":" + vid.error.message) : null;
      vid.currentTime = Math.min(0.8, (vid.duration || 1.5) * 0.4);
      await new Promise(r => { vid.onseeked = r; setTimeout(r, 1200); });
      const probe = document.createElement("canvas");
      probe.width = 160; probe.height = 284;
      const pctx = probe.getContext("2d");
      pctx.drawImage(vid, 0, 0, 160, 284);
      const data = pctx.getImageData(0, 0, 160, 284).data;
      let nonBlack = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] + data[i+1] + data[i+2] > 40) nonBlack++;
      }
      const nonBlackPct = Math.round(nonBlack * 100 / (data.length / 4));
      return {
        selText,
        btnLabelWhileRec,
        specBps: recBadge4kCheck.videoBps,
        loadState,
        vErr,
        w: vid.videoWidth,
        h: vid.videoHeight,
        landW,
        landH,
        modalBadge,
        specRes,
        dlName,
        nonBlackPct
      };
    })()`);
    console.log("4K UHD Studio Recorder Verification:", JSON.stringify(uhd4kCheck));
    if (
      uhd4kCheck.loadState !== "loaded" ||
      uhd4kCheck.vErr ||
      uhd4kCheck.w !== 2160 ||
      uhd4kCheck.h !== 3840 ||
      uhd4kCheck.landW !== 3840 ||
      uhd4kCheck.landH !== 2160 ||
      uhd4kCheck.specBps !== 35000000 ||
      !uhd4kCheck.modalBadge.includes("4K 2160P") ||
      !uhd4kCheck.dlName.includes("Level_13_2160x3840") ||
      uhd4kCheck.nonBlackPct < 85
    ) {
      throw new Error("4K UHD Studio Recorder verification failed!");
    }

    // Verify manual mode button keeps autoPlay=false for Level 8
    const manualOk = await c.eval(`(() => {
      if (autoPlayMode) document.getElementById("btn-autoplay-opt").click();
      document.querySelector('.lvl-card[data-lvl="7"] .lvl-btn:not([data-auto])').click();
      const res = { autoPlayMode, gAuto: G.autoPlay, state, lvlIdx: li };
      if (GameRecorder.recording) GameRecorder.stop();
      return res;
    })()`);
    console.log("Level 8 Manual Launch Check:", JSON.stringify(manualOk));
    if (manualOk.autoPlayMode || manualOk.gAuto || manualOk.state !== "play" || manualOk.lvlIdx !== 7) {
      throw new Error("Level 8 manual mode check failed!");
    }

    // Verify Level 9 launches automatically on Play click & completes parallel co-op + boss fights under 50s
    const l9AutoResult = await c.eval(`(async () => {
      await initTcSounds();
      if (autoPlayMode) document.getElementById("btn-autoplay-opt").click();
      document.querySelector('.lvl-card[data-lvl="8"] .lvl-btn').click();
      const launchGAuto = G.autoPlay;
      const launchIdx = li;
      if (GameRecorder.recording) GameRecorder.stop();
      let simultaneousMoveFrames = 0;
      let tomZapped = false;
      let cherryProtected = false;
      let sawRetracted = false;
      let cherryFreed = false;
      let bulldogFreed = false;
      let bossesInitiallyIdle = (G.bosses || []).every(b => !b.awake);
      const swSeenInFrame = [];
      const swCaptured = new Set();
      window.__l9Shots = [];
      const snap = (tag) => {
        draw();
        GameRecorder.renderFrame();
        window.__l9Shots.push({ t: Math.round(T), tag, dataUrl: GameRecorder.recCv.toDataURL("image/jpeg", 0.72) });
      };
      GameRecorder.prepareCanvas();
      const dt = 30;
      for (let step = 0; step < 3000 && state === "play"; step++) {
        const before = [G.p1, G.p2, G.p3].map(p => pos(p));
        update(dt);
        cam(dt);
        const after = [G.p1, G.p2, G.p3].map(p => pos(p));
        const movedCount = [0, 1, 2].filter(k => Math.hypot(after[k][0] - before[k][0], after[k][1] - before[k][1]) > 1e-4).length;
        if (movedCount >= 2) simultaneousMoveFrames++;
        if (G.p1.hp < 5) tomZapped = true;
        if (G.p2.shield > 0) cherryProtected = true;
        if (G.saws[0] && G.saws[0].destroyed) sawRetracted = true;
        const gc = G.gates.find(g => g.id === "gate_cherry");
        const gb = G.gates.find(g => g.id === "gate_bulldog");
        if (gc && gc.open) cherryFreed = true;
        if (gb && gb.open) bulldogFreed = true;
        (G.switches || []).forEach(sw => {
          if (sw.active && !swCaptured.has(sw.id)) {
            swCaptured.add(sw.id);
            const inFrame = Math.abs(sw.x - camX) <= 3.9 && Math.abs(sw.y - camY) <= 6.2;
            swSeenInFrame.push({ id: sw.id, t: Math.round(T), inFrame, camX: +camX.toFixed(1), camY: +camY.toFixed(1), x: sw.x, y: sw.y });
            if (sw.id === "sw2" || sw.id === "sw_bulldog" || sw.id === "sw_final") snap(sw.id);
          }
        });
        const shieldFly = (G.projectiles || []).find(p => p.kind === "shield");
        if (shieldFly && (T - shieldFly.t0) >= shieldFly.dur * 0.45 && !window.__capturedShieldFly) {
          window.__capturedShieldFly = true;
          snap("shield_fly");
        }
        if (G.bosses[0] && G.bosses[0].koAt && !window.__capturedRedFoxStun) {
          window.__capturedRedFoxStun = true;
          snap("redfox_stun");
        }
        const bombBlack = (G.projectiles || []).find(p => p.kind !== "shield" && p.targetType === "boss");
        if (bombBlack && (T - bombBlack.t0) >= bombBlack.dur * 0.45 && !window.__capturedBombFly) {
          window.__capturedBombFly = true;
          snap("bomb_fly_blackfox");
        }
        if (G.bosses[1] && G.bosses[1].koAt && !window.__capturedBlackFoxStun) {
          window.__capturedBlackFoxStun = true;
          snap("blackfox_stun");
        }
      }
      if (state === "won") {
        snap("won");
      }
      if (GameRecorder.recording) GameRecorder.stop();
      return {
        launchGAuto,
        launchIdx,
        state,
        elapsedSec: Number((G.t / 1000).toFixed(2)),
        score: G.score,
        totalCoins: L.coins.length,
        escaped: [G.p1?.escaped, G.p2?.escaped, G.p3?.escaped],
        deadHeroes: [G.p1, G.p2, G.p3].filter(p => G.dead.has(p.id)).length,
        simultaneousMoveFrames,
        tomZapped,
        cherryProtected,
        sawRetracted,
        cherryFreed,
        bulldogFreed,
        swSeenInFrame,
        bossesInitiallyIdle,
        bossStates: (G.bosses || []).map(b => ({ id: b.id, hp: b.hp, dead: b.dead, awake: b.awake })),
        tcPlayedSounds: G.tcPlayedSounds || [],
        shotCount: window.__l9Shots.length
      };
    })()`);
    const fs = require("fs");
    for (let idx = 0; idx < (l9AutoResult.shotCount || 0); idx++) {
      const s = await c.eval(`window.__l9Shots[${idx}]`);
      if (s && s.dataUrl) {
        const b64 = s.dataUrl.split(",")[1];
        fs.writeFileSync(`C:/Users/katta/.gemini/antigravity/brain/c2be85bd-3af4-4ab7-a6e9-b6613e7ab5fa/scratch/l9_1v1_${idx}_${s.tag}_${s.t}ms.jpg`, Buffer.from(b64, "base64"));
      }
    }
    delete l9AutoResult.shotCount;
    console.log("Level 9 Automated Co-Op Fight Result:", JSON.stringify(l9AutoResult, null, 2));
    if (
      !l9AutoResult.launchGAuto ||
      l9AutoResult.launchIdx !== 8 ||
      l9AutoResult.state !== "won" ||
      l9AutoResult.elapsedSec < 40 ||
      l9AutoResult.elapsedSec >= 50 ||
      l9AutoResult.score !== 10 ||
      !l9AutoResult.escaped.every(Boolean) ||
      l9AutoResult.deadHeroes !== 0 ||
      l9AutoResult.simultaneousMoveFrames < 40 ||
      !l9AutoResult.tomZapped ||
      !l9AutoResult.sawRetracted ||
      !l9AutoResult.cherryFreed ||
      !l9AutoResult.bulldogFreed ||
      (l9AutoResult.swSeenInFrame || []).length !== 4 ||
      !l9AutoResult.swSeenInFrame.every(s => s.inFrame) ||
      !l9AutoResult.bossesInitiallyIdle ||
      !l9AutoResult.bossStates.every(b => b.dead && b.awake)
    ) {
      throw new Error("Level 9 Automated Linear Story & 1v1 Villain Combat assertion failed!");
    }

    // Verify Level 10 Trio Finale Gauntlet (40-50s, all switches in-frame, trap twist, 3 rotating 1v1 boss duels)
    const l10AutoResult = await c.eval(`(async () => {
      await initTcSounds();
      if (autoPlayMode) document.getElementById("btn-autoplay-opt").click();
      document.querySelector('.lvl-card[data-lvl="9"] .lvl-btn').click();
      const launchGAuto = G.autoPlay;
      const launchIdx = li;
      if (GameRecorder.recording) GameRecorder.stop();
      let tomZapped = false;
      let trapClosed = false;
      let trapOpenedBack = false;
      let bossesInitiallyIdle = (G.bosses || []).every(b => !b.awake);
      const swSeenInFrame = [];
      const swCaptured = new Set();
      window.__l10Shots = [];
      const snap = (tag) => {
        draw();
        GameRecorder.renderFrame();
        window.__l10Shots.push({ t: Math.round(T), tag, dataUrl: GameRecorder.recCv.toDataURL("image/jpeg", 0.72) });
      };
      GameRecorder.prepareCanvas();
      const dt = 30;
      for (let step = 0; step < 3000 && state === "play"; step++) {
        update(dt);
        cam(dt);
        if (G.p1.hp < 5) tomZapped = true;
        const gt = G.gates.find(g => g.id === "gate_trap");
        if (gt && !gt.open) trapClosed = true;
        if (gt && trapClosed && gt.open) trapOpenedBack = true;
        (G.switches || []).forEach(sw => {
          if (sw.active && !swCaptured.has(sw.id)) {
            swCaptured.add(sw.id);
            const inFrame = Math.abs(sw.x - camX) <= 3.9 && Math.abs(sw.y - camY) <= 6.2;
            swSeenInFrame.push({ id: sw.id, t: Math.round(T), inFrame, camX: +camX.toFixed(1), camY: +camY.toFixed(1), x: sw.x, y: sw.y });
            if (sw.id === "sw_mid_trap" || sw.id === "sw_exit") snap(sw.id);
          }
        });
        const shieldFly = (G.projectiles || []).find(p => p.kind === "shield");
        if (shieldFly && (T - shieldFly.t0) >= shieldFly.dur * 0.45 && !window.__l10ShieldFly) {
          window.__l10ShieldFly = true;
          snap("cherry_shield_redfox");
        }
        const bombBoss = (G.projectiles || []).find(p => p.kind !== "shield" && p.targetType === "boss");
        if (bombBoss && bombBoss.targetObj && bombBoss.targetObj.id === "blackfox" && (T - bombBoss.t0) >= bombBoss.dur * 0.45 && !window.__l10BombBlack) {
          window.__l10BombBlack = true;
          snap("bulldog_bomb_blackfox");
        }
        if (bombBoss && bombBoss.targetObj && bombBoss.targetObj.id === "buffalo" && (T - bombBoss.t0) >= bombBoss.dur * 0.45 && !window.__l10BombBuffalo) {
          window.__l10BombBuffalo = true;
          snap("tom_bomb_buffalo");
        }
      }
      if (state === "won") {
        snap("won");
      }
      if (GameRecorder.recording) GameRecorder.stop();
      return {
        launchGAuto,
        launchIdx,
        state,
        elapsedSec: Number((G.t / 1000).toFixed(2)),
        score: G.score,
        totalCoins: L.coins.length,
        escaped: [G.p1?.escaped, G.p2?.escaped, G.p3?.escaped],
        deadHeroes: [G.p1, G.p2, G.p3].filter(p => G.dead.has(p.id)).length,
        tomZapped,
        trapClosed,
        trapOpenedBack,
        swSeenInFrame,
        bossesInitiallyIdle,
        bossStates: (G.bosses || []).map(b => ({ id: b.id, hp: b.hp, dead: b.dead, awake: b.awake })),
        shotCount: window.__l10Shots.length
      };
    })()`);
    for (let idx = 0; idx < (l10AutoResult.shotCount || 0); idx++) {
      const s = await c.eval(`window.__l10Shots[${idx}]`);
      if (s && s.dataUrl) {
        const b64 = s.dataUrl.split(",")[1];
        fs.writeFileSync(`C:/Users/katta/.gemini/antigravity/brain/c2be85bd-3af4-4ab7-a6e9-b6613e7ab5fa/scratch/l10_${idx}_${s.tag}_${s.t}ms.jpg`, Buffer.from(b64, "base64"));
      }
    }
    delete l10AutoResult.shotCount;
    console.log("Level 10 Automated Finale Result:", JSON.stringify(l10AutoResult, null, 2));
    if (
      !l10AutoResult.launchGAuto ||
      l10AutoResult.launchIdx !== 9 ||
      l10AutoResult.state !== "won" ||
      l10AutoResult.elapsedSec < 40 ||
      l10AutoResult.elapsedSec >= 50 ||
      l10AutoResult.score !== 10 ||
      !l10AutoResult.escaped.every(Boolean) ||
      l10AutoResult.deadHeroes !== 0 ||
      !l10AutoResult.tomZapped ||
      !l10AutoResult.trapClosed ||
      !l10AutoResult.trapOpenedBack ||
      (l10AutoResult.swSeenInFrame || []).length !== 4 ||
      !l10AutoResult.swSeenInFrame.every(s => s.inFrame) ||
      !l10AutoResult.bossesInitiallyIdle ||
      !l10AutoResult.bossStates.every(b => b.dead && b.awake)
    ) {
      throw new Error("Level 10 Automated Trio Finale assertion failed!");
    }

    // Verify Level 11 Conditional Protocol + One-by-One Shrinking Exit-to-TopCast Flight (40-50s)
    const l11AutoResult = await c.eval(`(async () => {
      await initTcSounds();
      if (autoPlayMode) document.getElementById("btn-autoplay-opt").click();
      document.querySelector('.lvl-card[data-lvl="10"] .lvl-btn').click();
      const launchGAuto = G.autoPlay;
      const launchIdx = li;
      if (GameRecorder.recording) GameRecorder.stop();
      let tomZapped = false;
      let trapClosed = false;
      let trapOpenedBack = false;
      let sawRetracted = false;
      let bulldogFreed = false;
      let bossesInitiallyIdle = (G.bosses || []).every(b => !b.awake);
      const swSeenInFrame = [];
      const swCaptured = new Set();
      const flyEvents = {};
      const flyPoseSamples = [];
      window.__l11Shots = [];
      const snap = (tag) => {
        draw();
        GameRecorder.renderFrame();
        window.__l11Shots.push({ t: Math.round(T), tag, dataUrl: GameRecorder.recCv.toDataURL("image/jpeg", 0.72) });
      };
      GameRecorder.prepareCanvas();
      const dt = 30;
      for (let step = 0; step < 3000 && state === "play"; step++) {
        update(dt);
        cam(dt);
        if (G.p1.hp < 5) tomZapped = true;
        const gt = G.gates.find(g => g.id === "gate_trap");
        if (gt && !gt.open) trapClosed = true;
        if (gt && trapClosed && gt.open) trapOpenedBack = true;
        const gb = G.gates.find(g => g.id === "gate_bulldog");
        if (gb && gb.open) bulldogFreed = true;
        if (G.saws[0] && G.saws[0].destroyed) sawRetracted = true;
        (G.switches || []).forEach(sw => {
          if (sw.active && !swCaptured.has(sw.id)) {
            swCaptured.add(sw.id);
            const inFrame = Math.abs(sw.x - camX) <= 3.9 && Math.abs(sw.y - camY) <= 6.2;
            swSeenInFrame.push({ id: sw.id, t: Math.round(T), inFrame, camX: +camX.toFixed(1), camY: +camY.toFixed(1), x: sw.x, y: sw.y });
            if (sw.id === "sw_left_twist" || sw.id === "sw_exit") snap(sw.id);
          }
        });
        [G.p1, G.p2, G.p3].forEach(h => {
          if (!h) return;
          if (h.exitFlyStart && !flyEvents[h.id]) {
            flyEvents[h.id] = { id: h.id, flyStart: Math.round(h.exitFlyStart), landedAt: null };
          }
          if (flyEvents[h.id] && h.escaped && flyEvents[h.id].landedAt == null) {
            flyEvents[h.id].landedAt = Math.round(T);
            snap("tick_" + h.id);
          }
          if (h.id === "cherry" && h.exitFlyStart && !h.escaped && GameRecorder.layout) {
            const L = GameRecorder.layout;
            const dst = L.slots.find(sl => sl.kind === "fr" && sl.id === h.id);
            if (dst) {
              const src = h.exitFlySrc || cen(...window.L.exit);
              const sx = L.pad + (((src[0] - camX) * B + cw / 2) / cw) * L.stageW;
              const sy = L.stageY + (((src[1] - camY) * B + ch / 2) / ch) * L.stageH;
              const sW = ((B * 1.95) / cw) * L.stageW;
              const pose = computeExitFlyPose(h, sx, sy, sW, dst.x + L.castW / 2, dst.y + L.castH / 2, L.castW, L.s);
              flyPoseSamples.push({ u: +pose.u.toFixed(2), y: Math.round(pose.y), size: Math.round(pose.size), brandY: L.brandY });
              if (pose.u >= 0.42 && !window.__l11CapturedFlyMid) {
                window.__l11CapturedFlyMid = true;
                snap("cherry_flying_top");
              }
            }
          }
        });
      }
      if (state === "won") {
        snap("won");
      }
      if (GameRecorder.recording) GameRecorder.stop();
      const orderedFly = Object.values(flyEvents).sort((a, b) => a.flyStart - b.flyStart);
      return {
        launchGAuto,
        launchIdx,
        state,
        elapsedSec: Number((G.t / 1000).toFixed(2)),
        score: G.score,
        totalCoins: L.coins.length,
        escaped: [G.p1?.escaped, G.p2?.escaped, G.p3?.escaped],
        deadHeroes: [G.p1, G.p2, G.p3].filter(p => G.dead.has(p.id)).length,
        tomZapped,
        trapClosed,
        trapOpenedBack,
        sawRetracted,
        bulldogFreed,
        swSeenInFrame,
        bossesInitiallyIdle,
        bossStates: (G.bosses || []).map(b => ({ id: b.id, hp: b.hp, dead: b.dead, awake: b.awake })),
        orderedFly,
        flyShrinkOk: flyPoseSamples.length >= 2 && flyPoseSamples[flyPoseSamples.length - 1].size < flyPoseSamples[0].size && flyPoseSamples[flyPoseSamples.length - 1].y < flyPoseSamples[0].y,
        flyCrossedBrand: flyPoseSamples.some(p => p.y <= p.brandY),
        shotCount: window.__l11Shots.length
      };
    })()`);
    for (let idx = 0; idx < (l11AutoResult.shotCount || 0); idx++) {
      const s = await c.eval(`window.__l11Shots[${idx}]`);
      if (s && s.dataUrl) {
        const b64 = s.dataUrl.split(",")[1];
        fs.writeFileSync(`C:/Users/katta/.gemini/antigravity/brain/c2be85bd-3af4-4ab7-a6e9-b6613e7ab5fa/scratch/l11_${idx}_${s.tag}_${s.t}ms.jpg`, Buffer.from(b64, "base64"));
      }
    }
    delete l11AutoResult.shotCount;
    console.log("Level 11 Automated Skyward Protocol Result:", JSON.stringify(l11AutoResult, null, 2));
    const fly = l11AutoResult.orderedFly || [];
    const staggeredOk = fly.length === 3 && (fly[1].flyStart - fly[0].flyStart >= 350) && (fly[2].flyStart - fly[1].flyStart >= 350);
    if (
      !l11AutoResult.launchGAuto ||
      l11AutoResult.launchIdx !== 10 ||
      l11AutoResult.state !== "won" ||
      l11AutoResult.elapsedSec < 40 ||
      l11AutoResult.elapsedSec >= 50 ||
      l11AutoResult.score !== 10 ||
      !l11AutoResult.escaped.every(Boolean) ||
      l11AutoResult.deadHeroes !== 0 ||
      !l11AutoResult.tomZapped ||
      !l11AutoResult.trapClosed ||
      !l11AutoResult.trapOpenedBack ||
      !l11AutoResult.sawRetracted ||
      !l11AutoResult.bulldogFreed ||
      (l11AutoResult.swSeenInFrame || []).length !== 6 ||
      !l11AutoResult.swSeenInFrame.every(s => s.inFrame) ||
      !l11AutoResult.bossesInitiallyIdle ||
      !l11AutoResult.bossStates.every(b => b.dead && b.awake) ||
      !staggeredOk ||
      !l11AutoResult.flyShrinkOk ||
      !l11AutoResult.flyCrossedBrand
    ) {
      throw new Error("Level 11 Automated Skyward Logic Protocol assertion failed!");
    }

    // Verify Level 12 Sacrifice & Revenge Protocol (Blocked-Star Sad + Combat Casualty + 2 Survivors Flight + Open-Eye Happy / Dead Crying)
    const l12AutoResult = await c.eval(`(async () => {
      await initTcSounds();
      if (autoPlayMode) document.getElementById("btn-autoplay-opt").click();
      document.querySelector('.lvl-card[data-lvl="11"] .lvl-btn').click();
      const launchGAuto = G.autoPlay;
      const launchIdx = li;
      if (GameRecorder.recording) GameRecorder.stop();
      let cherrySadBlockedStar = false;
      let bulldogDiedFighting = false;
      let redfoxHit = false;
      const swSeenInFrame = [];
      const swCaptured = new Set();
      const flyEvents = {};
      window.__l12Shots = [];
      const snap = (tag) => {
        draw();
        GameRecorder.renderFrame();
        window.__l12Shots.push({ t: Math.round(T), tag, dataUrl: GameRecorder.recCv.toDataURL("image/jpeg", 0.72) });
      };
      GameRecorder.prepareCanvas();
      const dt = 30;
      for (let step = 0; step < 3000 && state === "play"; step++) {
        update(dt);
        cam(dt);
        if (G.p2 && getCharAssetKey("cherry", getHeroEmotionName(G.p2)) === "cherry_sad" && !window.__l12CherrySadShot) {
          cherrySadBlockedStar = true;
          window.__l12CherrySadShot = true;
          snap("cherry_sad_star");
        }
        if (G.bosses[0] && T < G.bosses[0].stunnedUntil && !redfoxHit) {
          redfoxHit = true;
          snap("redfox_stun_no_name");
        }
        if (G.dead.has("bulldog") && !bulldogDiedFighting) {
          bulldogDiedFighting = true;
          ui();
          snap("bulldog_sacrifice");
        }
        (G.switches || []).forEach(sw => {
          if (sw.active && !swCaptured.has(sw.id)) {
            swCaptured.add(sw.id);
            const inFrame = Math.abs(sw.x - camX) <= 3.9 && Math.abs(sw.y - camY) <= 6.2;
            swSeenInFrame.push({ id: sw.id, t: Math.round(T), inFrame, camX: +camX.toFixed(1), camY: +camY.toFixed(1), x: sw.x, y: sw.y });
          }
        });
        [G.p1, G.p2].forEach(h => {
          if (!h) return;
          if (h.exitFlyStart && !flyEvents[h.id]) {
            flyEvents[h.id] = { id: h.id, flyStart: Math.round(h.exitFlyStart), landedAt: null };
          }
          if (h.exitFlyStart && !h.escaped && h.id === "cherry" && (T - h.exitFlyStart) >= 200 && !window.__l12FlyMid) {
            window.__l12FlyMid = true;
            snap("cherry_fly_top");
          }
          if (flyEvents[h.id] && h.escaped && flyEvents[h.id].landedAt == null) {
            flyEvents[h.id].landedAt = Math.round(T);
          }
        });
      }
      if (state === "won") {
        ui();
        snap("won_survivors");
      }
      if (GameRecorder.recording) GameRecorder.stop();
      return {
        launchGAuto,
        launchIdx,
        state,
        elapsedSec: Number((G.t / 1000).toFixed(2)),
        score: G.score,
        totalCoins: L.coins.length,
        escaped: [G.p1?.escaped, G.p2?.escaped, G.p3?.escaped],
        deadHeroes: [G.p1, G.p2, G.p3].filter(p => G.dead.has(p.id)).map(p => p.id),
        cherrySadBlockedStar,
        bulldogDiedFighting,
        hudKeysWon: {
          tom: document.querySelector('.ct[data-n="tom"] img')?.dataset.emoKey,
          cherry: document.querySelector('.ct[data-n="cherry"] img')?.dataset.emoKey,
          bulldog: document.querySelector('.ct[data-n="bulldog"] img')?.dataset.emoKey
        },
        swSeenInFrame,
        bossStates: (G.bosses || []).map(b => ({ id: b.id, hp: b.hp, dead: b.dead, awake: b.awake })),
        orderedFly: Object.values(flyEvents).sort((a, b) => a.flyStart - b.flyStart),
        shotCount: window.__l12Shots.length
      };
    })()`);
    for (let idx = 0; idx < (l12AutoResult.shotCount || 0); idx++) {
      const s = await c.eval(`window.__l12Shots[${idx}]`);
      if (s && s.dataUrl) {
        const b64 = s.dataUrl.split(",")[1];
        fs.writeFileSync(`C:/Users/katta/.gemini/antigravity/brain/c2be85bd-3af4-4ab7-a6e9-b6613e7ab5fa/scratch/l12_${idx}_${s.tag}_${s.t}ms.jpg`, Buffer.from(b64, "base64"));
      }
    }
    delete l12AutoResult.shotCount;
    console.log("Level 12 Automated Sacrifice & Revenge Result:", JSON.stringify(l12AutoResult, null, 2));
    const fly12 = l12AutoResult.orderedFly || [];
    if (
      !l12AutoResult.launchGAuto ||
      l12AutoResult.launchIdx !== 11 ||
      l12AutoResult.state !== "won" ||
      l12AutoResult.elapsedSec < 40 ||
      l12AutoResult.elapsedSec >= 50 ||
      l12AutoResult.score !== 10 ||
      !l12AutoResult.cherrySadBlockedStar ||
      !l12AutoResult.bulldogDiedFighting ||
      l12AutoResult.deadHeroes.length !== 1 ||
      l12AutoResult.deadHeroes[0] !== "bulldog" ||
      l12AutoResult.escaped[0] !== true ||
      l12AutoResult.escaped[1] !== true ||
      l12AutoResult.escaped[2] === true ||
      l12AutoResult.hudKeysWon.tom !== "tom_happy" ||
      l12AutoResult.hudKeysWon.cherry !== "cherry_happy" ||
      l12AutoResult.hudKeysWon.bulldog !== "bulldog_crying" ||
      (l12AutoResult.swSeenInFrame || []).length !== 5 ||
      !l12AutoResult.swSeenInFrame.every(s => s.inFrame) ||
      !l12AutoResult.bossStates.every(b => b.dead && b.awake) ||
      fly12.length !== 2 ||
      (fly12[1].flyStart - fly12[0].flyStart < 350)
    ) {
      throw new Error("Level 12 Automated Sacrifice & Revenge assertion failed!");
    }

    // Verify Level 13 Swift Sacrifice (<30s Gameplay + <30s Recording Length + Cherry Sacrifice + 2 Survivors Fly)
    const l13AutoResult = await c.eval(`(async () => {
      await initTcSounds();
      if (autoPlayMode) document.getElementById("btn-autoplay-opt").click();
      document.querySelector('.lvl-card[data-lvl="12"] .lvl-btn').click();
      const launchGAuto = G.autoPlay;
      const launchIdx = li;
      const isUnder30sFlag = Boolean(L && L.under30s);
      if (GameRecorder.recording) GameRecorder.stop();
      let cherrySadBlockedStar = false;
      let cherryDiedFighting = false;
      let cherryDeathFlyActive = false;
      let cherryDeathLanded = false;
      const cherryDeathSamples = [];
      const swSeenInFrame = [];
      const swCaptured = new Set();
      const flyEvents = {};
      window.__l13Shots = [];
      const snap = (tag) => {
        draw();
        GameRecorder.renderFrame();
        window.__l13Shots.push({ t: Math.round(T), tag, dataUrl: GameRecorder.recCv.toDataURL("image/jpeg", 0.72) });
      };
      GameRecorder.prepareCanvas();
      const dt = 30;
      for (let step = 0; step < 2500 && state === "play"; step++) {
        update(dt);
        cam(dt);
        if (G.p2 && !G.dead.has("cherry") && getCharAssetKey("cherry", getHeroEmotionName(G.p2)) === "cherry_sad" && !window.__l13CherrySadShot) {
          cherrySadBlockedStar = true;
          window.__l13CherrySadShot = true;
          snap("cherry_sad_star");
        }
        if (G.dead.has("cherry") && !cherryDiedFighting) {
          cherryDiedFighting = true;
          ui();
          cherryDeathFlyActive = Boolean(G.p2 && G.p2.deathFlyStart && !G.p2.deathBadgeReady);
          snap("cherry_sacrifice_start");
        }
        if (G.p2 && G.dead.has("cherry") && G.p2.deathFlyStart && !G.p2.deathBadgeReady && GameRecorder.layout) {
          const lay = GameRecorder.layout;
          const dst = lay.slots.find(sl => sl.kind === "fr" && sl.id === "cherry");
          if (dst) {
            const src = G.p2.deathFlySrc || pos(G.p2);
            const sx = lay.pad + (((src[0] - camX) * B + cw / 2) / cw) * lay.stageW;
            const sy = lay.stageY + (((src[1] - camY) * B + ch / 2) / ch) * lay.stageH;
            const sW = ((B * 1.95 * 1.48) / cw) * lay.stageW;
            const pose = computeCastFlyPose(sx, sy, sW, dst.x + lay.castW / 2, dst.y + lay.castH / 2, lay.castW, G.p2.deathFlyStart, G.p2.deathFlyDur, lay.s, 0.68);
            cherryDeathSamples.push({ u: +pose.u.toFixed(2), y: Math.round(pose.y), size: Math.round(pose.size), brandY: Math.round(lay.brandY) });
          }
          if ((T - G.p2.deathFlyStart) >= 240 && !window.__l13DeathFlyMid) {
            window.__l13DeathFlyMid = true;
            ui();
            snap("cherry_death_fly_top");
          }
        }
        if (G.p2 && G.p2.deathBadgeReady && !cherryDeathLanded) {
          cherryDeathLanded = true;
          ui();
          snap("cherry_death_red_cross");
        }
        (G.switches || []).forEach(sw => {
          if (sw.active && !swCaptured.has(sw.id)) {
            swCaptured.add(sw.id);
            const inFrame = Math.abs(sw.x - camX) <= 3.9 && Math.abs(sw.y - camY) <= 6.2;
            swSeenInFrame.push({ id: sw.id, t: Math.round(T), inFrame, camX: +camX.toFixed(1), camY: +camY.toFixed(1), x: sw.x, y: sw.y });
          }
        });
        [G.p1, G.p3].forEach(h => {
          if (!h) return;
          if (h.exitFlyStart && !flyEvents[h.id]) {
            flyEvents[h.id] = { id: h.id, flyStart: Math.round(h.exitFlyStart), landedAt: null };
          }
          if (h.exitFlyStart && !h.escaped && h.id === "tom" && (T - h.exitFlyStart) >= 200 && !window.__l13FlyMid) {
            window.__l13FlyMid = true;
            snap("tom_fly_top");
          }
          if (flyEvents[h.id] && h.escaped && flyEvents[h.id].landedAt == null) {
            flyEvents[h.id].landedAt = Math.round(T);
          }
        });
      }
      if (state === "won") {
        ui();
        snap("won_survivors");
      }
      if (GameRecorder.recording) GameRecorder.stop();
      const elapsedSec = Number((G.t / 1000).toFixed(2));
      const postWinHoldSec = isUnder30sFlag ? 1.6 : 3.8;
      return {
        launchGAuto,
        launchIdx,
        isUnder30sFlag,
        state,
        elapsedSec,
        totalRecordedSecEst: Number((elapsedSec + postWinHoldSec).toFixed(2)),
        score: G.score,
        totalCoins: L.coins.length,
        escaped: [G.p1?.escaped, G.p2?.escaped, G.p3?.escaped],
        deadHeroes: [G.p1, G.p2, G.p3].filter(p => G.dead.has(p.id)).map(p => p.id),
        cherrySadBlockedStar,
        cherryDiedFighting,
        cherryDeathFlyActive,
        cherryDeathLanded,
        cherryDeathShrinkOk: cherryDeathSamples.length >= 2 && cherryDeathSamples[cherryDeathSamples.length - 1].size < cherryDeathSamples[0].size && cherryDeathSamples[cherryDeathSamples.length - 1].y < cherryDeathSamples[0].y,
        hudKeysWon: {
          tom: document.querySelector('.ct[data-n="tom"] img')?.dataset.emoKey,
          cherry: document.querySelector('.ct[data-n="cherry"] img')?.dataset.emoKey,
          bulldog: document.querySelector('.ct[data-n="bulldog"] img')?.dataset.emoKey
        },
        swSeenInFrame,
        bossStates: (G.bosses || []).map(b => ({ id: b.id, hp: b.hp, dead: b.dead, awake: b.awake })),
        orderedFly: Object.values(flyEvents).sort((a, b) => a.flyStart - b.flyStart),
        shotCount: window.__l13Shots.length
      };
    })()`);
    for (let idx = 0; idx < (l13AutoResult.shotCount || 0); idx++) {
      const s = await c.eval(`window.__l13Shots[${idx}]`);
      if (s && s.dataUrl) {
        const b64 = s.dataUrl.split(",")[1];
        fs.writeFileSync(`C:/Users/katta/.gemini/antigravity/brain/c2be85bd-3af4-4ab7-a6e9-b6613e7ab5fa/scratch/l13_${idx}_${s.tag}_${s.t}ms.jpg`, Buffer.from(b64, "base64"));
      }
    }
    delete l13AutoResult.shotCount;
    console.log("Level 13 Swift Sacrifice (<30s) Result:", JSON.stringify(l13AutoResult, null, 2));
    const fly13 = l13AutoResult.orderedFly || [];
    if (
      !l13AutoResult.launchGAuto ||
      l13AutoResult.launchIdx !== 12 ||
      !l13AutoResult.isUnder30sFlag ||
      l13AutoResult.state !== "won" ||
      l13AutoResult.elapsedSec >= 28 ||
      l13AutoResult.totalRecordedSecEst >= 30 ||
      l13AutoResult.score !== 10 ||
      !l13AutoResult.cherrySadBlockedStar ||
      !l13AutoResult.cherryDiedFighting ||
      !l13AutoResult.cherryDeathFlyActive ||
      !l13AutoResult.cherryDeathLanded ||
      !l13AutoResult.cherryDeathShrinkOk ||
      l13AutoResult.deadHeroes.length !== 1 ||
      l13AutoResult.deadHeroes[0] !== "cherry" ||
      l13AutoResult.escaped[0] !== true ||
      l13AutoResult.escaped[1] === true ||
      l13AutoResult.escaped[2] !== true ||
      l13AutoResult.hudKeysWon.tom !== "tom_happy" ||
      l13AutoResult.hudKeysWon.bulldog !== "bulldog_happy" ||
      l13AutoResult.hudKeysWon.cherry !== "cherry_sad" ||
      (l13AutoResult.swSeenInFrame || []).length !== 4 ||
      !l13AutoResult.swSeenInFrame.every(s => s.inFrame) ||
      !l13AutoResult.bossStates.every(b => b.dead && b.awake) ||
      fly13.length !== 2 ||
      (fly13[1].flyStart - fly13[0].flyStart < 350)
    ) {
      throw new Error("Level 13 Swift Sacrifice (<30s) assertion failed!");
    }

    // Verify Level 14 Bulldog's Stand (~32s Video, 6x10 Compact Grid, Reduced Speed, Bulldog Death-Fly -> Red Cross)
    const l14AutoResult = await c.eval(`(async () => {
      await initTcSounds();
      if (autoPlayMode) document.getElementById("btn-autoplay-opt").click();
      document.querySelector('.lvl-card[data-lvl="13"] .lvl-btn').click();
      const launchGAuto = G.autoPlay;
      const launchIdx = li;
      const gridW = L.W, gridH = L.H;
      const winHoldMs = L.winHoldMs || 2400;
      const maxSpeedMul = Math.max(...L.autoPlan.flatMap(s => s.parallel ? s.parallel.map(p => p.speedMul || 0) : [s.speedMul || 0]));
      if (GameRecorder.recording) GameRecorder.stop();
      let cherrySadBlockedStar = false;
      let bulldogDiedFighting = false;
      let bulldogDeathFlyActive = false;
      let bulldogRedCrossDelayedOk = false;
      let bulldogDeathLanded = false;
      const bulldogDeathSamples = [];
      const swSeenInFrame = [];
      const swCaptured = new Set();
      const flyEvents = {};
      window.__l14Shots = [];
      const snap = (tag) => {
        draw();
        GameRecorder.renderFrame();
        window.__l14Shots.push({ t: Math.round(T), tag, dataUrl: GameRecorder.recCv.toDataURL("image/jpeg", 0.72) });
      };
      GameRecorder.prepareCanvas();
      const dt = 30;
      for (let step = 0; step < 3000 && state === "play"; step++) {
        update(dt);
        cam(dt);
        if (G.p2 && !G.dead.has("cherry") && getCharAssetKey("cherry", getHeroEmotionName(G.p2)) === "cherry_sad" && !window.__l14CherrySadShot) {
          cherrySadBlockedStar = true;
          window.__l14CherrySadShot = true;
          snap("cherry_sad_star");
        }
        if (G.dead.has("bulldog") && !bulldogDiedFighting) {
          bulldogDiedFighting = true;
          ui();
          bulldogDeathFlyActive = Boolean(G.p3 && G.p3.deathFlyStart && !G.p3.deathBadgeReady);
          bulldogRedCrossDelayedOk = !document.querySelector('.ct[data-n="bulldog"]')?.classList.contains("dead");
          snap("bulldog_death_start");
        }
        if (G.p3 && G.dead.has("bulldog") && G.p3.deathFlyStart && !G.p3.deathBadgeReady && GameRecorder.layout) {
          const lay = GameRecorder.layout;
          const dst = lay.slots.find(sl => sl.kind === "fr" && sl.id === "bulldog");
          if (dst) {
            const src = G.p3.deathFlySrc || pos(G.p3);
            const sx = lay.pad + (((src[0] - camX) * B + cw / 2) / cw) * lay.stageW;
            const sy = lay.stageY + (((src[1] - camY) * B + ch / 2) / ch) * lay.stageH;
            const sW = ((B * 1.95 * 1.48) / cw) * lay.stageW;
            const pose = computeCastFlyPose(sx, sy, sW, dst.x + lay.castW / 2, dst.y + lay.castH / 2, lay.castW, G.p3.deathFlyStart, G.p3.deathFlyDur, lay.s, 0.68);
            bulldogDeathSamples.push({ u: +pose.u.toFixed(2), y: Math.round(pose.y), size: Math.round(pose.size), brandY: Math.round(lay.brandY) });
          }
          if ((T - G.p3.deathFlyStart) >= 240 && !window.__l14DeathFlyMid) {
            window.__l14DeathFlyMid = true;
            ui();
            snap("bulldog_death_fly_top");
          }
        }
        if (G.p3 && G.p3.deathBadgeReady && !bulldogDeathLanded) {
          bulldogDeathLanded = true;
          ui();
          snap("bulldog_red_cross");
        }
        (G.switches || []).forEach(sw => {
          if (sw.active && !swCaptured.has(sw.id)) {
            swCaptured.add(sw.id);
            const inFrame = Math.abs(sw.x - camX) <= 3.9 && Math.abs(sw.y - camY) <= 6.2;
            swSeenInFrame.push({ id: sw.id, t: Math.round(T), inFrame, camX: +camX.toFixed(1), camY: +camY.toFixed(1), x: sw.x, y: sw.y });
          }
        });
        [G.p1, G.p2].forEach(h => {
          if (!h) return;
          if (h.exitFlyStart && !flyEvents[h.id]) {
            flyEvents[h.id] = { id: h.id, flyStart: Math.round(h.exitFlyStart), landedAt: null };
          }
          if (h.exitFlyStart && !h.escaped && h.id === "cherry" && (T - h.exitFlyStart) >= 200 && !window.__l14FlyMid) {
            window.__l14FlyMid = true;
            snap("cherry_fly_top");
          }
          if (flyEvents[h.id] && h.escaped && flyEvents[h.id].landedAt == null) {
            flyEvents[h.id].landedAt = Math.round(T);
          }
        });
      }
      if (state === "won") {
        ui();
        snap("won_survivors");
      }
      if (GameRecorder.recording) GameRecorder.stop();
      const elapsedSec = Number((G.t / 1000).toFixed(2));
      return {
        launchGAuto,
        launchIdx,
        gridW,
        gridH,
        maxSpeedMul,
        winHoldMs,
        state,
        elapsedSec,
        totalRecordedSecEst: Number((elapsedSec + winHoldMs / 1000).toFixed(2)),
        score: G.score,
        totalCoins: L.coins.length,
        escaped: [G.p1?.escaped, G.p2?.escaped, G.p3?.escaped],
        deadHeroes: [G.p1, G.p2, G.p3].filter(p => G.dead.has(p.id)).map(p => p.id),
        cherrySadBlockedStar,
        bulldogDiedFighting,
        bulldogDeathFlyActive,
        bulldogRedCrossDelayedOk,
        bulldogDeathLanded,
        bulldogRedCrossOnWonCard: document.querySelector('.ct[data-n="bulldog"]')?.classList.contains("dead"),
        bulldogDeathShrinkOk: bulldogDeathSamples.length >= 2 && bulldogDeathSamples[bulldogDeathSamples.length - 1].size < bulldogDeathSamples[0].size && bulldogDeathSamples[bulldogDeathSamples.length - 1].y < bulldogDeathSamples[0].y,
        bulldogDeathCrossedBrand: bulldogDeathSamples.some(p => p.y <= p.brandY),
        hudKeysWon: {
          tom: document.querySelector('.ct[data-n="tom"] img')?.dataset.emoKey,
          cherry: document.querySelector('.ct[data-n="cherry"] img')?.dataset.emoKey,
          bulldog: document.querySelector('.ct[data-n="bulldog"] img')?.dataset.emoKey
        },
        swSeenInFrame,
        bossStates: (G.bosses || []).map(b => ({ id: b.id, hp: b.hp, dead: b.dead, awake: b.awake })),
        orderedFly: Object.values(flyEvents).sort((a, b) => a.flyStart - b.flyStart),
        shotCount: window.__l14Shots.length
      };
    })()`);
    for (let idx = 0; idx < (l14AutoResult.shotCount || 0); idx++) {
      const s = await c.eval(`window.__l14Shots[${idx}]`);
      if (s && s.dataUrl) {
        const b64 = s.dataUrl.split(",")[1];
        fs.writeFileSync(`C:/Users/katta/.gemini/antigravity/brain/c2be85bd-3af4-4ab7-a6e9-b6613e7ab5fa/scratch/l14_${idx}_${s.tag}_${s.t}ms.jpg`, Buffer.from(b64, "base64"));
      }
    }
    delete l14AutoResult.shotCount;
    console.log("Level 14 Bulldog's Stand (32s) Result:", JSON.stringify(l14AutoResult, null, 2));
    const fly14 = l14AutoResult.orderedFly || [];
    if (
      !l14AutoResult.launchGAuto ||
      l14AutoResult.launchIdx !== 13 ||
      l14AutoResult.gridW !== 19 ||
      l14AutoResult.gridH !== 31 ||
      l14AutoResult.maxSpeedMul > 0.78 ||
      l14AutoResult.state !== "won" ||
      l14AutoResult.totalRecordedSecEst < 30.0 ||
      l14AutoResult.totalRecordedSecEst > 34.0 ||
      l14AutoResult.score !== 10 ||
      !l14AutoResult.cherrySadBlockedStar ||
      !l14AutoResult.bulldogDiedFighting ||
      !l14AutoResult.bulldogDeathFlyActive ||
      !l14AutoResult.bulldogRedCrossDelayedOk ||
      !l14AutoResult.bulldogDeathLanded ||
      !l14AutoResult.bulldogRedCrossOnWonCard ||
      !l14AutoResult.bulldogDeathShrinkOk ||
      !l14AutoResult.bulldogDeathCrossedBrand ||
      l14AutoResult.deadHeroes.length !== 1 ||
      l14AutoResult.deadHeroes[0] !== "bulldog" ||
      l14AutoResult.escaped[0] !== true ||
      l14AutoResult.escaped[1] !== true ||
      l14AutoResult.escaped[2] === true ||
      l14AutoResult.hudKeysWon.tom !== "tom_happy" ||
      l14AutoResult.hudKeysWon.cherry !== "cherry_happy" ||
      l14AutoResult.hudKeysWon.bulldog !== "bulldog_crying" ||
      (l14AutoResult.swSeenInFrame || []).length !== 4 ||
      !l14AutoResult.swSeenInFrame.every(s => s.inFrame) ||
      !l14AutoResult.bossStates.every(b => b.dead && b.awake) ||
      fly14.length !== 2 ||
      (fly14[1].flyStart - fly14[0].flyStart < 350)
    ) {
      throw new Error("Level 14 Bulldog's Stand (32s) assertion failed!");
    }
  });
  console.log("ALL BROWSER VERIFICATIONS PASSED!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
