"use strict";
const LV = window.LEVELS, A = window.ASSETS, M = 3, SS = 28, SPEED = 8.5, MAXHP = 5;
let li = 0, L, W, H, CW, CH, WALL;
const solid = (x, y) => x < 0 || y < 0 || x >= W || y >= H || WALL[y][x] === 1;
const nbrs = (i, j) => {
  const o = [];
  if (i < CW - 1 && !WALL[3 * j + 1][3 * i + 3]) o.push([1, 0]);
  if (i > 0 && !WALL[3 * j + 1][3 * i]) o.push([-1, 0]);
  if (j < CH - 1 && !WALL[3 * j + 3][3 * i + 1]) o.push([0, 1]);
  if (j > 0 && !WALL[3 * j][3 * i + 1]) o.push([0, -1]);
  return o;
};
const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const rnd = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const hs = (x, y) => ((Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
const $ = id => document.getElementById(id), cv = $("c"), ctx = cv.getContext("2d");
const IM = {}; for (const k in A) { IM[k] = new Image(); IM[k].src = A[k]; }
const tomImg = IM.tom_happy; if ($("face")) $("face").src = A.tom_happy || A.tom;
const CHAR_NAMES = {
  tom: "Tom",
  cherry: "Cherry",
  bulldog: "Bulldog",
  buffalo: "Buffalo",
  blackfox: "Black Fox",
  redfox: "Red Fox"
};
const EMOTION_KEYS = {
  tom: {
    normal: "tom_happy",
    happy: "tom_happy",
    laugh: "tom_laugh",
    joy: "tom_happy",
    wink: "tom_wink",
    smug: "tom_smug",
    angry: "tom_angry",
    scared: "tom_scared",
    dizzy: "tom_dizzy",
    sad: "tom_sad_cry",
    cry: "tom_sad_cry"
  },
  cherry: {
    normal: "cherry_happy",
    happy: "cherry_happy",
    laugh: "cherry_laugh",
    joy: "cherry_happy",
    wink: "cherry_laugh",
    smug: "cherry_laugh",
    curious: "cherry_curious",
    angry: "cherry_curious",
    scared: "cherry_scared",
    dizzy: "cherry_sad",
    sad: "cherry_sad",
    cry: "cherry_sad"
  },
  bulldog: {
    normal: "bulldog_happy",
    happy: "bulldog_happy",
    laugh: "bulldog_happy",
    joy: "bulldog_happy",
    wink: "bulldog_happy",
    smug: "bulldog_skeptical",
    curious: "bulldog_skeptical",
    angry: "bulldog_angry",
    scared: "bulldog_skeptical",
    dizzy: "bulldog_sad",
    sad: "bulldog_sad",
    cry: "bulldog_crying",
    sleepy: "bulldog_sleepy"
  },
  buffalo: {
    normal: "buffalo_normal_scared",
    angry: "buffalo_angry",
    sad: "buffalo_sad_cry",
    cry: "buffalo_sad_cry"
  },
  blackfox: {
    normal: "blackfox_normal_scared",
    angry: "blackfox_angry",
    sad: "blackfox_sad_cry",
    cry: "blackfox_sad_cry"
  },
  redfox: {
    normal: "redfox_normal_scared",
    angry: "redfox_angry",
    sad: "redfox_normal_scared",
    cry: "redfox_normal_scared"
  }
};

function getCharAssetKey(charId, emoName) {
  const map = EMOTION_KEYS[charId];
  return (map && (map[emoName] || map.normal)) || charId;
}

function getCharImg(charId, emoName) {
  const k = getCharAssetKey(charId, emoName);
  return IM[k] || IM[charId];
}

function setHeroEmotion(h, emo, durationSec, priority = 1) {
  if (!h) return;
  const activeTimed = (h.emo && T < h.emoUntil) || (h.nextEmo && T < h.nextEmoUntil);
  if (activeTimed && priority < (h.emoPri || 0)) return;
  h.emo = emo;
  h.emoUntil = T + durationSec * 1000;
  h.emoPri = priority;
  h.nextEmo = null;
  h.nextEmoUntil = 0;
}

function isHeroInDanger(h) {
  if (!G || state !== "play" || T < h.shield) return null;
  const [px, py] = pos(h);
  for (let k = 0; k < (G.saws || []).length; k++) {
    const sObj = G.saws[k];
    if (sObj.destroyed) continue;
    const [sx, sy] = sawAt(sObj.data, k);
    if (Math.hypot(sx - px, sy - py) <= 3.0) return "trap";
  }
  for (let k = 0; k < (G.wsaws || []).length; k++) {
    const wObj = G.wsaws[k];
    if (wObj.destroyed) continue;
    const [wx, wy] = wsPos(wObj.data);
    if (Math.hypot(wx - px, wy - py) <= 3.0) return "trap";
  }
  for (let k = 0; k < (G.lasers || []).length; k++) {
    const lObj = G.lasers[k];
    if (lObj.destroyed || lObj.disabled) continue;
    if (!lOn(k) && !lWarn(k)) continue;
    const [lx, ly] = lObj.data;
    if (Math.hypot(lx - px, ly - py) <= 2.6) return "trap";
  }
  for (const sp of (G.spikes || [])) {
    if (sp.destroyed || sp.open) continue;
    if (Math.hypot(sp.x - px, sp.y - py) <= 3.0) return "trap";
  }
  for (const boss of (G.bosses || [])) {
    if (boss.dead || T < boss.stunnedUntil) continue;
    if (Math.hypot(boss.x - px, boss.y - py) <= 4.5) return "boss";
  }
  for (const pb of (G.bossBombs || [])) {
    const p = Math.min(1, Math.max(0, (T - pb.t0) / pb.dur));
    const bx = pb.sx + (pb.tx - pb.sx) * p;
    const by = pb.sy + (pb.ty - pb.sy) * p;
    if (Math.hypot(bx - px, by - py) <= 3.5 || Math.hypot(pb.tx - px, pb.ty - py) <= 2.8) return "boss";
  }
  return null;
}

function isHeroBlockedForGoal(h) {
  if (!G || state !== "play" || !h || h.t !== 0) return false;
  const [px, py] = pos(h);
  const nearLockedGate = (G.gates || []).some(g => !g.open && g.blocks.some(([gx, gy]) => Math.hypot(gx + 0.5 - px, gy + 0.5 - py) <= 2.35));
  if (!nearLockedGate) return false;
  const nearbyCoinBlocked = (G.coins || []).some(c => !c.got && Math.hypot(c.x - px, c.y - py) <= 4.5);
  return nearbyCoinBlocked || !(h.holdingBomb || (h.bombs || 0) > 0);
}

function getHeroEmotionName(h) {
  if (!h) return "normal";
  if (G && G.dead && G.dead.has(h.id)) return "cry";
  if (state === "over") return "cry";
  if (h.escaped || state === "won") return "joy";
  if (h.emo && T < h.emoUntil) return h.emo;
  if (h.nextEmo && T < h.nextEmoUntil) return h.nextEmo;
  if (h.emo || h.nextEmo) {
    h.emo = null;
    h.nextEmo = null;
    h.emoPri = 0;
  }
  const danger = isHeroInDanger(h);
  if (danger) {
    if (h.id === "bulldog") return danger === "boss" ? "angry" : "scared";
    return "scared";
  }
  if (isHeroBlockedForGoal(h)) return "sad";
  if (h.holdingBomb) {
    if (h.id === "tom") return "smug";
    if (h.id === "cherry") return "curious";
    return "angry";
  }
  return "normal";
}

function getBossEmotionName(boss) {
  if (!boss) return "normal";
  if (T < boss.stunnedUntil) return "cry";
  if (state === "over") return "angry";
  if (state === "won") return "cry";
  if (boss.emo && T < boss.emoUntil) return boss.emo;
  if (boss.emo) boss.emo = null;
  if (boss.mode === "hunt") return "angry";
  return "normal";
}

function drawEvilBombWithFire(g, cx, cy, sz, rot = 0) {
  g.save();
  g.translate(cx, cy);
  if (rot) g.rotate(rot);
  if (IM.bomb_evil && IM.bomb_evil.complete) {
    g.drawImage(IM.bomb_evil, -sz / 2, -sz / 2, sz, sz);
  }
  const fx = sz * 0.445, fy = -sz * 0.315;
  const flR = sz * (0.13 + 0.045 * Math.sin(T / 32));
  const spG = g.createRadialGradient(fx, fy, 0, fx, fy, flR * 2.4);
  spG.addColorStop(0, "#ffffff");
  spG.addColorStop(0.28, "#fef08a");
  spG.addColorStop(0.65, "#f97316");
  spG.addColorStop(1, "rgba(239,68,68,0)");
  g.fillStyle = spG;
  g.beginPath(); g.arc(fx, fy, flR * 2.4, 0, 7); g.fill();
  g.fillStyle = "#fde047";
  g.beginPath();
  g.moveTo(fx - flR * 0.55, fy + flR * 0.15);
  g.quadraticCurveTo(fx + Math.sin(T / 45) * flR * 0.35, fy - flR * 1.45, fx + flR * 0.55, fy + flR * 0.15);
  g.closePath();
  g.fill();
  g.restore();
}

function findWallEdge(sw) {
  const side = sw.side || "right";
  const sx = Math.floor(sw.x), sy = Math.floor(sw.y);
  if (side === "right") {
    for (let wx = sx; wx < W; wx++) if (solid(wx, sy)) return wx;
    return sw.x + 1;
  }
  if (side === "left") {
    for (let wx = sx; wx >= 0; wx--) if (solid(wx, sy)) return wx + 1;
    return sw.x - 1;
  }
  if (side === "top") {
    for (let wy = sy; wy >= 0; wy--) if (solid(sx, wy)) return wy + 1;
    return sw.y - 1;
  }
  for (let wy = sy; wy < H; wy++) if (solid(sx, wy)) return wy;
  return sw.y + 1;
}

let cw, ch, B, floorT, wallT, sawS, cloudS, shadow, G, camX = 0, camY = 0, shake = 0, T = 0, last = 0, state = "ready", ratio = innerWidth > innerHeight ? "16:9" : "9:16", mini, hudB = 0;

const isTcAudioV2 = () => li >= 7; // Level 8 onwards uses T_C_Sounds clips
const STAR_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
let tcSoundsPromise = null;
function initTcSounds() {
  if (tcSoundsPromise) return tcSoundsPromise;
  tcSoundsPromise = GameAudio.begin().then(() => {
    const ac = GameAudio.getAudioContext ? GameAudio.getAudioContext() : null;
    const raw = window.TC_AUDIO_DATA || {};
    if (!ac || !GameAudio.buf) return;
    const jobs = Object.keys(raw).map(k => {
      if (GameAudio.buf["tc_" + k]) return Promise.resolve();
      const b = atob(raw[k]), u = new Uint8Array(b.length);
      for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
      return new Promise(ok => ac.decodeAudioData(u.buffer, d => { GameAudio.buf["tc_" + k] = d; ok(); }, () => ok()));
    });
    return Promise.all(jobs);
  });
  return tcSoundsPromise;
}
function tcPlay(clip, opts) {
  const o = opts || {};
  if (G) {
    if (!G.tcPlayedSounds) G.tcPlayedSounds = [];
    G.tcPlayedSounds.push(clip);
  }
  const key = "tc_" + clip;
  if (GameAudio.buf && GameAudio.buf[key]) return GameAudio.play(key, o);
  return o.fallback ? GameAudio.play(o.fallback, o) : null;
}
function playHeroHitSound(h) {
  if (!isTcAudioV2()) { GameAudio.play("hit", { rand: .06 }); return; }
  if (h && h.id === "tom") tcPlay(h.hp <= 2 ? "tom_pain_scream" : "tom_laser_scream", { vol: 1.05, fallback: "hit" });
  else if (h && h.id === "cherry") tcPlay("cartoon_huh_sharp", { vol: 1.0, fallback: "hit" });
  else tcPlay("cartoon_huh_confused", { vol: 1.0, fallback: "hit" });
}
function playShieldBlockSound() {
  if (isTcAudioV2()) tcPlay("shield_slap_hit", { min: .25, rand: .05, vol: 1.0, fallback: "shield_block" });
  else GameAudio.play("shield_block", { min: .2, rand: .08 });
}
function playBombPickupSound() {
  if (isTcAudioV2()) tcPlay("cartoon_what_pop", { vol: 1.0, fallback: "coin" });
  else GameAudio.play("coin", { vol: 1.4 });
}
function playBombThrowSound(h) {
  if (isTcAudioV2()) tcPlay(h && h.id === "cherry" ? "jerry_hehe" : "tom_buff_roar", { vol: 0.92, fallback: "coin" });
  else GameAudio.play("coin", { vol: 1.2, rand: .1 });
}
function playExplosionSound() {
  if (isTcAudioV2()) tcPlay("smoke_poof", { vol: 1.05, fallback: "lose" });
  else { GameAudio.play("lose", { vol: 1.4 }); GameAudio.play("hit", { vol: 1.4 }); }
}
function playStarCoinSound() {
  if (!isTcAudioV2()) { GameAudio.coin(); return; }
  if (G) {
    const n = (T - (G.starComboT || -9000) < 1250) ? Math.min((G.starCombo || 0) + 1, STAR_SCALE.length - 1) : 0;
    G.starCombo = n; G.starComboT = T;
    // Keep classic star chime for Level 8+ with lower volume so T_C_Sounds voices stand out clearly
    GameAudio.play("coin", { rate: Math.pow(2, STAR_SCALE[n] / 12), vol: 0.62 + 0.015 * n });
  } else {
    GameAudio.play("coin", { vol: 0.62 });
  }
}

const Snd = {
  sfx: (k, h) => {
    if (k === "hit") playHeroHitSound(h);
    else if (k === "heal") {
      if (isTcAudioV2()) tcPlay(h && h.hp >= MAXHP && h.id === "cherry" ? "quacker_giggle" : "powerup_sparkle_chime", { vol: 0.95, fallback: "heal" });
      else GameAudio.play("heal", { rand: .03 });
    } else if (k === "shield") {
      if (isTcAudioV2()) tcPlay("shield_energy_slash", { vol: 0.95, fallback: "shield" });
      else GameAudio.play("shield");
    } else if (k === "win") {
      GameAudio.duck(2);
      if (isTcAudioV2()) {
        tcPlay("buff_transform_chime", { vol: 0.95, fallback: "win" });
        setTimeout(() => { if (state === "won") tcPlay("jerry_happy_laugh", { vol: 0.95 }); }, 450);
      } else {
        GameAudio.play("win", { vol: 2.2 });
      }
    } else if (k === "lose") {
      if (isTcAudioV2()) tcPlay("tom_surrounded_scream", { vol: 1.05, fallback: "lose" });
      else GameAudio.play("lose");
    }
  },
  music: p => { if (p) initTcSounds().then(() => { if (state === "play") GameAudio.musicStart(); }); else GameAudio.musicStop(); },
  unlock: () => initTcSounds(),
  get on() { return GameAudio.on; },
  toggle() { GameAudio.toggle(); sdIcon(); }
};
const SVG_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const SVG_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM17 9l5 6M22 9l-5 6"/></svg>';
function sdIcon() { const b = $("sd"); b.innerHTML = Snd.on ? SVG_ON : SVG_OFF; b.setAttribute("aria-pressed", String(Snd.on)); }

function loadLevel(i) {
  L = LV[li = i]; W = L.W; H = L.H; CW = (W - 1) / 3; CH = (H - 1) / 3;
  WALL = L.walls.map(r => Uint8Array.from(r, Number));
  $("tot").textContent = L.coins.length;
  buildCast();
  resize();
  newGame();
  shadow = buildShadow();
}

const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
function blur(a, w, h, r) {
  const t = new Float32Array(a.length), n = 2 * r + 1;
  for (let y = 0; y < h; y++) { let s = 0; const o = y * w; for (let x = -r; x <= r; x++) s += a[o + clamp(x, 0, w - 1)]; for (let x = 0; x < w; x++) { t[o + x] = s / n; s += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[clamp(y, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { a[y * w + x] = s / n; s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
}
function buildShadow() {
  const w = (W + 2 * M) * SS, h = (H + 2 * M) * SS, c = mk(w, h), g = c.getContext("2d"); g.fillStyle = "#000";
  for (let y = -M; y < H + M; y++) for (let x = -M; x < W + M; x++) if (solid(x, y)) g.fillRect((x + M) * SS, (y + M) * SS, SS, SS);
  const d = g.getImageData(0, 0, w, h), a = new Float32Array(w * h); for (let i = 0; i < a.length; i++) a[i] = d.data[i * 4 + 3];
  for (let k = 0; k < 2; k++) blur(a, w, h, Math.round(SS * .35));
  // Clean, high-clarity ambient occlusion (max 28% darkness, never dirty black fog)
  for (let i = 0; i < a.length; i++) d.data[i * 4 + 3] = Math.min(72, Math.round(a[i] * 0.7));
  g.putImageData(d, 0, 0); return c;
}

function buildTiles() {
  floorT = [...Array(8)].map((_, v) => {
    const c = mk(B, B), g = c.getContext("2d");
    // Luminous, vibrant warm golden arcade floor tile
    const gr = g.createRadialGradient(B * .5, B * .5, B * .1, B * .5, B * .5, B * .75);
    gr.addColorStop(0, "#ffd554"); gr.addColorStop(0.65, "#f6a724"); gr.addColorStop(1, "#e69418");
    g.fillStyle = gr; g.fillRect(0, 0, B, B);

    // Crisp inner beveled border (lighting from top-left)
    g.strokeStyle = "rgba(255, 255, 255, 0.38)"; g.lineWidth = Math.max(1, B * 0.025);
    g.beginPath(); g.moveTo(0, B); g.lineTo(0, 0); g.lineTo(B, 0); g.stroke();

    g.strokeStyle = "rgba(150, 75, 0, 0.25)";
    g.beginPath(); g.moveTo(B, 0); g.lineTo(B, B); g.lineTo(0, B); g.stroke();

    // Subtle brushed arcade floor sheen
    g.fillStyle = "rgba(255, 255, 255, 0.05)"; g.fillRect(B * 0.15, B * 0.15, B * 0.7, B * 0.7);

    // Subtle corner accents
    const cr = B * 0.035; g.fillStyle = "rgba(180, 85, 0, 0.22)";
    [[B * .12, B * .12], [B * .88, B * .12], [B * .12, B * .88], [B * .88, B * .88]].forEach(([cx, cy]) => {
      g.beginPath(); g.arc(cx, cy, cr, 0, 7); g.fill();
    });
    return c;
  });

  const theme = (L && L.theme) || "blue";
  const Palettes = {
    blue: {
      bg: "#040c2b", topBevel: "#3d66e8", botBevel: "#06123a",
      grad: ["#1f41ab", "#142b78", "#091748"],
      scratch: "rgba(145,190,255,.65)",
      border: "rgba(165,200,255,.45)",
      rivet: ["#e2eeff", "#7292d5", "#1b2d56"],
      accentGrad: ["#2d57d0", "#18328c", "#0c1a4d"]
    },
    purple: {
      bg: "#18042b", topBevel: "#a855f7", botBevel: "#180628",
      grad: ["#581c87", "#3b0764", "#200638"],
      scratch: "rgba(244,114,182,.75)",
      border: "rgba(232,121,249,.55)",
      rivet: ["#fffbeb", "#ffd23f", "#b45309"],
      accentGrad: ["#7e22ce", "#4c1d95", "#2e1065"]
    },
    emerald: {
      bg: "#022415", topBevel: "#10b981", botBevel: "#031d12",
      grad: ["#064e3b", "#022c22", "#011712"],
      scratch: "rgba(110,231,183,.75)",
      border: "rgba(52,211,153,.55)",
      rivet: ["#f0fdf4", "#34d399", "#065f46"],
      accentGrad: ["#047857", "#064e3b", "#022c22"]
    }
  };
  const P = Palettes[theme] || Palettes.blue;

  wallT = [...Array(6)].map((_, v) => {
    const c = mk(B, B), g = c.getContext("2d");
    g.fillStyle = P.bg; g.fillRect(0, 0, B, B);
    const p = B * .05;
    g.fillStyle = P.topBevel; g.beginPath(); g.moveTo(0, 0); g.lineTo(B, 0); g.lineTo(B - p, p); g.lineTo(p, p); g.lineTo(p, B - p); g.lineTo(0, B); g.closePath(); g.fill();
    g.fillStyle = P.botBevel; g.beginPath(); g.moveTo(B, 0); g.lineTo(B, B); g.lineTo(0, B); g.lineTo(p, B - p); g.lineTo(B - p, B - p); g.lineTo(B - p, p); g.closePath(); g.fill();
    const ip = B * .13, iw = B - 2 * ip;
    const isAccent = (v === 2 || v === 4);
    const useGrad = isAccent ? P.accentGrad : P.grad;
    const gr = g.createLinearGradient(ip, ip, B - ip, B - ip);
    gr.addColorStop(0, useGrad[0]); gr.addColorStop(.45, useGrad[1]); gr.addColorStop(1, useGrad[2]);
    g.fillStyle = gr; rrect(g, ip, ip, iw, iw, B * .06); g.fill();

    if (v === 1 || v === 3) {
      g.strokeStyle = P.scratch; g.lineWidth = Math.max(1.2, B * .026); g.lineCap = "round"; g.lineJoin = "round"; g.beginPath();
      const cx = B * .5, ox = (v % 2 === 0 ? 1 : -1) * B * .04;
      g.moveTo(cx - B * .08 + ox, B * .28); g.lineTo(cx + B * .06 + ox, B * .46); g.lineTo(cx - B * .03 + ox, B * .62); g.lineTo(cx + B * .07 + ox, B * .74); g.stroke();
    } else if (v === 4) {
      // Reinforced Vault Bar
      g.strokeStyle = P.scratch; g.lineWidth = Math.max(1, B * .03);
      g.beginPath(); g.moveTo(ip + B * .06, B * .5); g.lineTo(B - ip - B * .06, B * .5); g.stroke();
    }
    g.strokeStyle = P.border; g.lineWidth = Math.max(1, B * .028); rrect(g, ip, ip, iw, iw, B * .06); g.stroke();

    const rv = B * .038, offs = [[ip * .52, ip * .52], [B - ip * .52, ip * .52], [ip * .52, B - ip * .52], [B - ip * .52, B - ip * .52]];
    offs.forEach(([rx, ry]) => {
      g.fillStyle = "rgba(0,0,20,.65)"; g.beginPath(); g.arc(rx + .8, ry + 1.2, rv * 1.2, 0, 7); g.fill();
      const rg = g.createRadialGradient(rx - rv * .35, ry - rv * .35, rv * .1, rx, ry, rv);
      rg.addColorStop(0, P.rivet[0]); rg.addColorStop(.6, P.rivet[1]); rg.addColorStop(1, P.rivet[2]);
      g.fillStyle = rg; g.beginPath(); g.arc(rx, ry, rv, 0, 7); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(rx - rv * .3, ry - rv * .3, rv * .32, 0, 7); g.fill();
    });
    return c;
  });
  sawS = (() => {
    const D = Math.ceil(B * 2.5), c = mk(D, D), g = c.getContext("2d"), m = D / 2; let gr;
    if (g.createConicGradient) { gr = g.createConicGradient(0, m, m); for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, i % 2 ? "#718096" : "#f1f5f9"); }
    else { gr = g.createRadialGradient(m, m, 0, m, m, m); gr.addColorStop(0, "#ffffff"); gr.addColorStop(.5, "#cbd5e1"); gr.addColorStop(1, "#475569"); }
    g.fillStyle = gr; g.strokeStyle = "#1e293b"; g.lineWidth = D * .015; g.beginPath();
    for (let i = 0; i < 48; i++) { const a = i * Math.PI / 24, r = i % 2 ? D * .4 : D * .485; g.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r); }
    g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = D * .02; g.beginPath(); g.arc(m, m, D * .35, 0, 7); g.stroke();
    g.strokeStyle = "rgba(30,41,59,.6)"; g.lineWidth = D * .02; g.beginPath(); g.arc(m, m, D * .28, 0, 7); g.stroke();
    g.fillStyle = "#0f172a"; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.arc(m + Math.cos(a) * D * .22, m + Math.sin(a) * D * .22, D * .05, 0, 7); g.fill(); }
    const hubG = g.createRadialGradient(m - D * .03, m - D * .03, 0, m, m, D * .12);
    hubG.addColorStop(0, "#ff4d4d"); hubG.addColorStop(0.7, "#dc2626"); hubG.addColorStop(1, "#7f1d1d");
    g.fillStyle = hubG; g.beginPath(); g.arc(m, m, D * .11, 0, 7); g.fill();
    g.strokeStyle = "#ffffff"; g.lineWidth = D * .015; g.stroke(); return c;
  })();
  cloudS = (() => {
    const D = Math.ceil(B * 3), c = mk(D, D), g = c.getContext("2d"), P = [[.5, .55, .26], [.3, .6, .2], [.7, .6, .2], [.4, .4, .2], [.62, .42, .2], [.5, .7, .18]];
    g.fillStyle = "#ece8dc"; g.strokeStyle = "#b7b1a0"; g.lineWidth = D * .016; for (const [x, y, r] of P) { g.beginPath(); g.arc(x * D, y * D, r * D, 0, 7); g.fill(); g.stroke(); }
    for (const [x, y, r] of P) { g.beginPath(); g.arc(x * D, y * D, r * D * .96, 0, 7); g.fill(); } return c;
  })();
}

function rrect(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }

function resize() {
  const r = ratio === "16:9" ? 16 / 9 : 9 / 16;
  let w, h;
  const f = $("frame");
  if (f && f.classList.contains("studio-1080p")) {
    h = innerHeight;
    w = Math.round(h * r);
  } else if (ratio === "9:16") {
    const availW = Math.min(innerWidth * .96, innerHeight * .96 * r);
    w = Math.max(380, Math.round(availW / 9) * 9);
    h = Math.round(w * 16 / 9);
  } else {
    const availH = Math.min(innerHeight * .96, (innerWidth * .96) / r);
    h = Math.max(380, Math.round(availH / 9) * 9);
    w = Math.round(h * 16 / 9);
  }
  if (f) {
    f.style.width = w + "px"; f.style.height = h + "px";
    f.style.setProperty("--u", clamp(Math.min(w / 495, h / 880), .8, 1.8));
  }
  const s = $("stage");
  // HIGH-RESOLUTION RENDER TARGET: at least 1080px wide for crystal-clear recording clarity
  const targetW = ratio === "9:16" ? 1080 : 1920;
  const dpr = Math.max(window.devicePixelRatio || 1, targetW / s.clientWidth, 2.5);
  cw = cv.width = Math.round(s.clientWidth * dpr);
  ch = cv.height = Math.round(s.clientHeight * dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  B = Math.round(clamp(Math.min(cw / 8.4, ch / (r > 1 ? 8 : 10.5)), 90, 280));
  buildTiles(); buildMini();
}

function buildMini() {
  mini = mk(W * 3, H * 3); const g = mini.getContext("2d"); g.fillStyle = "#f2b13a"; g.fillRect(0, 0, W * 3, H * 3); g.fillStyle = "#17307f";
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (WALL[y][x]) g.fillRect(x * 3, y * 3, 3, 3);
  hudB = 0;
}

function buildCast() {
  const c = $("cast"), fr = L.cast.friends.slice(0, 6), en = L.cast.enemies.slice(0, 6 - fr.length), tot = fr.length + en.length; c.innerHTML = "";
  c.classList.toggle("quad", tot === 4);
  c.classList.toggle("crowded", tot >= 5);
  const add = (n, k) => {
    const d = document.createElement("div"); d.className = "ct " + k + (tot === 1 ? " solo" : ""); d.dataset.n = n;
    const i = new Image(); const initKey = getCharAssetKey(n, "normal"); i.src = A[initKey] || A[n] || ""; i.dataset.emoKey = initKey; i.alt = CHAR_NAMES[n] || n; d.appendChild(i);
    // Clicking hero avatar switches active character!
    d.addEventListener("click", () => {
      if (n === "tom" && !G.dead.has("tom")) {
        G.active = 1;
        G.p1.lastMoveT = T;
        const [nx, ny] = pos(G.p1); camX = nx; camY = ny;
        ui();
      } else if (n === "cherry" && G.p2 && !G.dead.has("cherry")) {
        G.active = 2;
        G.p2.lastMoveT = T;
        const [nx, ny] = pos(G.p2); camX = nx; camY = ny;
        ui();
      } else if (n === "bulldog" && G.p3 && !G.dead.has("bulldog")) {
        G.active = 3;
        G.p3.lastMoveT = T;
        const [nx, ny] = pos(G.p3); camX = nx; camY = ny;
        ui();
      }
    });
    c.appendChild(d);
  };
  fr.forEach(n => add(n, "fr"));
  if (fr.length && en.length) { const v = document.createElement("div"); v.className = "vs"; v.textContent = "VS"; c.appendChild(v); }
  en.forEach(n => add(n, "en"));
}

function drawMini() {
  const mh = Math.min(ch * .2, B * 2.4), mw = mh * W / H, mx = cw - mw - B * .2, my = hudB + B * .15, q = mw / W, r = Math.max(2.5, q * 1.6); ctx.save();
  rrect(ctx, mx - 4, my - 4, mw + 8, mh + 8, B * .15); ctx.fillStyle = "rgba(8,18,56,.9)"; ctx.fill(); ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 3; ctx.stroke(); ctx.clip(); ctx.drawImage(mini, mx, my, mw, mh);
  const P = (x, y) => [mx + x * q, my + y * q], dot = (x, y, rr, c, s) => { const [a, b] = P(x, y); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(a, b, rr, 0, 7); ctx.fill(); if (s) { ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.stroke(); } };
  (G.lasers || []).forEach(lObj => { if (lObj.destroyed || lObj.disabled) return; const l = lObj.data, [a, b] = P(l[0], l[1]); ctx.fillStyle = l[2] === "h" ? "#ff2d44" : "#2f8cff"; ctx.fillRect(a - r, b - r, r * 2, r * 2); });
  (G.saws || []).forEach((sObj, k) => { if (!sObj.destroyed) { const [x, y] = sawAt(sObj.data, k); dot(x, y, r * 1.2, "#d6dce8", "#222"); } });
  (G.wsaws || []).forEach(wObj => { if (!wObj.destroyed) { const [x, y] = wsPos(wObj.data); dot(x, y, r * 1.3, "#ff7a1a", "#5a2a00"); } });
  L.enemies.forEach((s, k) => { const [x, y] = sawAt(s, k + 9); dot(x, y, r * 1.3, "#e5243a", "#fff"); });
  (G.bombs || []).forEach(b => { if (!b.got) dot(b.x, b.y, r * 1.1, "#f59e0b", "#000"); });
  G.shields.forEach(s => { if (!s.got) dot(s.x, s.y, r * 1.1, "#58b8ff", "#fff"); });
  G.bub.forEach(s => { if (!s.got) { const [a, b] = P(s.x, s.y); ctx.fillStyle = "#19b94a"; ctx.fillRect(a - r * 1.3, b - r * .4, r * 2.6, r * .8); ctx.fillRect(a - r * .4, b - r * 1.3, r * .8, r * 2.6); } });
  (G.spikes || []).forEach(sp => { if (!sp.open && !sp.destroyed) dot(sp.x, sp.y, r * 1.3, "#38bdf8", "#0f172a"); });
  (G.switches || []).forEach(sw => { dot(sw.x, sw.y, r * 1.2, sw.active ? "#00e676" : "#ff1744", "#fff"); });
  dot(cen(...L.exit)[0], cen(...L.exit)[1], r * 1.6, "#2bd9a4", "#fff");
  (G.bosses || []).forEach(b => {
    if (b.dead) return;
    const cFill = b.id === "blackfox" ? "#1e293b" : (b.id === "redfox" ? "#ea580c" : "#a855f7");
    const cStroke = b.id === "blackfox" ? "#ef4444" : (b.id === "redfox" ? "#fde047" : "#22c55e");
    dot(b.x, b.y, r * 1.5, cFill, cStroke);
  });
  const [px, py] = pos(G.p); dot(px, py, r * 1.5, "#ffd23f", "#0a1536");
  if (G.p2) { const [gx, gy] = pos(G.p2); dot(gx, gy, r * 1.4, "#ff4081", "#ffffff"); }
  if (G.p3) { const [mx, my] = pos(G.p3); dot(mx, my, r * 1.4, "#eab308", "#ffffff"); }
  ctx.restore();
}

const star = (g, x, y, r) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); };
const cen = (i, j) => [3 * i + 2, 3 * j + 2];

function newGame() {
  clearExitFlyOverlay();
  const [si, sj] = L.start;
  const p1 = { i: si, j: sj, bi: si, bj: sj, t: 0, last: [si, sj], hp: MAXHP, id: "tom", name: "Tom", shield: 0, sh1: 0, bombs: 0, holdingBomb: false, inv: 0, blk: -1e9, look: [0, 1], pp: null, dt: 0, emo: null, emoUntil: 0, emoPri: 0, nextEmo: null, nextEmoUntil: 0, lastMoveT: 0 };
  let p2 = null, p3 = null;
  if (L.start2) {
    const [s2i, s2j] = L.start2;
    p2 = { i: s2i, j: s2j, bi: s2i, bj: s2j, t: 0, last: [s2i, s2j], hp: MAXHP, id: "cherry", name: "Cherry", shield: 0, sh1: 0, bombs: 0, holdingBomb: false, inv: 0, blk: -1e9, look: [0, 1], pp: null, dt: 0, emo: null, emoUntil: 0, emoPri: 0, nextEmo: null, nextEmoUntil: 0, lastMoveT: 0 };
  }
  if (L.start3) {
    const [s3i, s3j] = L.start3;
    const heroId = L.hero3 || "bulldog";
    const heroName = CHAR_NAMES[heroId] || "Bulldog";
    p3 = { i: s3i, j: s3j, bi: s3i, bj: s3j, t: 0, last: [s3i, s3j], hp: MAXHP, id: heroId, name: heroName, shield: 0, sh1: 0, bombs: 0, holdingBomb: false, inv: 0, blk: -1e9, look: [0, 1], pp: null, dt: 0, emo: null, emoUntil: 0, emoPri: 0, nextEmo: null, nextEmoUntil: 0, lastMoveT: 0 };
  }
  const defaultWaypoints = [
    [11, 17], [17, 17], [17, 23], [11, 23], [5, 23], [5, 17],
    [11, 29], [17, 29], [17, 35], [11, 35], [5, 35], [5, 29]
  ];
  const bosses = [];
  if (L.cast && L.cast.enemies && L.cast.enemies.length) {
    L.cast.enemies.forEach((eid, idx) => {
      const bDef = (L.enemies || []).find(e => typeof e === "object" && !Array.isArray(e) && e.id === eid);
      if (bDef || eid === "buffalo") {
        const d = bDef || { x: 11, y: 17, speed: 2.2 };
        bosses.push({
          id: eid,
          name: CHAR_NAMES[eid] || d.name || eid,
          x: d.x,
          y: d.y,
          speed: d.speed || 2.2,
          hp: d.hp != null ? d.hp : Infinity,
          maxHp: d.hp != null ? d.hp : Infinity,
          dead: false,
          bounds: d.bounds || null,
          waitForFrame: Boolean(d.waitForFrame),
          awake: !d.waitForFrame,
          stunnedUntil: 0,
          lastAttack: 1800 + idx * 1200,
          look: [0, 1],
          wpIdx: 0,
          waypoints: d.waypoints || defaultWaypoints,
          emo: null,
          emoUntil: 0,
          mode: "patrol"
        });
      }
    });
  }
  G = {
    dead: new Set(),
    p1,
    p2,
    p3,
    bosses,
    bossBombs: [],
    active: 1, // 1: Tom, 2: Cherry, 3: Bulldog
    get p() {
      if (this.active === 3 && this.p3) return this.p3;
      if (this.active === 2 && this.p2) return this.p2;
      return this.p1;
    },
    score: 0,
    t: 0,
    switches: (L.switches || []).map(s => ({ ...s, active: !!s.initialOpen, _inside: new Set() })),
    gates: (L.gates || []).map(g => ({ ...g, open: !!g.initialOpen })),
    coins: L.coins.map((c, k) => ({ x: c[0], y: c[1], got: 0, ph: k })),
    bombs: (L.bombs || []).map(b => ({ x: b[0], y: b[1], got: 0, prompted: false })),
    projectiles: [],
    bub: L.bubbles.map(b => ({ x: b[0], y: b[1], got: 0 })),
    shields: L.shields.map(b => ({ x: b[0], y: b[1], got: 0 })),
    saws: (L.saws || []).map(s => ({ data: s, destroyed: false })),
    wsaws: (L.wsaws || []).map(w => ({ data: w, destroyed: false })),
    lasers: (L.lasers || []).map(l => ({ data: l, disabled: false, destroyed: false })),
    spikes: (L.spikes || []).map(sp => ({ ...sp, open: !!sp.initialOpen, destroyed: false })),
    autoPlay: autoPlayMode,
    autoIdx: 0,
    autoWaitUntil: 0
  };
  // Re-lock gates (or keep open when initialOpen=true for Twist traps)
  G.gates.forEach(g => {
    g.blocks.forEach(([gx, gy]) => { if (WALL[gy]) WALL[gy][gx] = g.open ? 0 : 1; });
  });
  T = 0; VFX.clear(); GameAudio.stopLoops(); winConfetti = null;
  const [x, y] = pos(G.p); camX = x; camY = y;
  ui();
}

function pos(p) {
  p = p || G.p; const a = cen(p.i, p.j), b = cen(p.bi, p.bj);
  return [a[0] + (b[0] - a[0]) * p.t, a[1] + (b[1] - a[1]) * p.t];
}

const wsPos = (w) => { const u = (T + w[4]) % 4800; let e = u < 900 ? 0 : u < 2400 ? (u - 900) / 1500 : u < 3300 ? 1 : 1 - (u - 3300) / 1500; e = e * e * (3 - 2 * e); return [w[0] + w[2] * 3 * e, w[1] + w[3] * 3 * e]; };
const lOn = (k) => (T + k * 700) % 3000 > 1600, lWarn = (k) => { const t = (T + k * 700) % 3000; return t > 1250 && t <= 1600; };
const sawAt = (s, k) => { const t = (Math.sin(T * .0011 + k * 1.9) + 1) / 2; return [s[0] + (s[2] - s[0]) * t, s[1] + (s[3] - s[1]) * t]; };
const near = (cx, cy, r, px, py, h = .78) => { const dx = Math.max(Math.abs(cx - px) - h, 0), dy = Math.max(Math.abs(cy - py) - h, 0); return dx * dx + dy * dy < r * r; };

let toastT;
function toast(m) {
  const t = $("toast"); t.textContent = m; t.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 1600);
}

function ui() {
  $("sc").textContent = Math.min(G.score, L.coins.length);
  document.querySelectorAll(".ct").forEach(e => {
    const id = e.dataset.n;
    const isDead = G.dead.has(id);
    const heroObj = id === "tom" ? G.p1 : (id === "cherry" ? G.p2 : (id === "bulldog" ? G.p3 : null));
    const isEscaped = !!(heroObj && heroObj.escaped && !isDead);
    const showDeadCross = isDead && (!heroObj || !heroObj.deathFlyStart || heroObj.deathBadgeReady);
    e.classList.toggle("dead", showDeadCross);
    e.classList.toggle("escaped", isEscaped);
    const isHero1 = id === "tom" && G.active === 1;
    const isHero2 = id === "cherry" && G.active === 2;
    const isHero3 = id === "bulldog" && G.active === 3;
    e.classList.toggle("active-hero", (isHero1 || isHero2 || isHero3) && !isDead && !isEscaped);
    const img = e.querySelector("img");
    if (img) {
      let emo = "normal";
      if (heroObj) emo = getHeroEmotionName(heroObj);
      else {
        const bossObj = (G.bosses || []).find(b => b.id === id);
        if (bossObj) emo = bossObj.dead ? "cry" : getBossEmotionName(bossObj);
      }
      const key = getCharAssetKey(id, emo);
      if (img.dataset.emoKey !== key && A[key]) {
        img.dataset.emoKey = key;
        img.src = A[key];
      }
    }
  });
}

function fx(type, x, y) { VFX.add(type, x, y, T); }

function clearExitFlyOverlay() {
  const layer = $("fly-layer");
  if (layer) layer.innerHTML = "";
}

function computeCastFlyPose(srcCx, srcCy, srcW, dstCx, dstCy, dstW, startT, dur, s, endScale = 0.70) {
  const u = clamp((T - startT) / (dur || 460), 0, 1);
  const swerve = (srcCx > dstCx ? -1 : 1) * 34 * (s || 1);
  const posAt = (tU) => {
    const tu = clamp(tU, 0, 1);
    const te = 1 - Math.pow(1 - tu, 2.2);
    return {
      x: srcCx + (dstCx - srcCx) * te + Math.sin(tu * Math.PI) * swerve,
      y: srcCy + (dstCy - srcCy) * te - Math.sin(tu * Math.PI) * 48 * (s || 1),
      size: srcW + (dstW * endScale - srcW) * te
    };
  };
  const cur = posAt(u);
  const trails = [0.09, 0.17].map(off => posAt(u - off)).filter((_, i) => u > (i + 1) * 0.08);
  return { u, x: cur.x, y: cur.y, size: cur.size, trails };
}

function computeExitFlyPose(actor, srcCx, srcCy, srcW, dstCx, dstCy, dstW, s) {
  return computeCastFlyPose(srcCx, srcCy, srcW, dstCx, dstCy, dstW, actor.exitFlyStart, actor.exitFlyDur || 460, s, 0.70);
}

function getActiveCastFlights() {
  if (!G) return [];
  const out = [];
  [G.p1, G.p2, G.p3].forEach(h => {
    if (!h) return;
    if (h.exitFlyStart && !h.escaped && !G.dead.has(h.id)) {
      out.push({
        key: `exit:${h.id}`, hero: h, kind: "exit",
        startT: h.exitFlyStart, dur: h.exitFlyDur || 460,
        src: h.exitFlySrc || cen(...L.exit), emo: "joy",
        scaleMul: 1.0, endScale: 0.70, bg: "#0c1844",
        border: "#22c55e", glow: "rgba(34, 197, 94, 0.9)",
        trailA: "rgba(34, 197, 94, 0.38)", trailB: "rgba(255, 210, 63, 0.28)"
      });
    } else if (h.deathFlyStart && !h.deathBadgeReady && G.dead.has(h.id)) {
      out.push({
        key: `death:${h.id}`, hero: h, kind: "death",
        startT: h.deathFlyStart, dur: h.deathFlyDur || 640,
        src: h.deathFlySrc || pos(h), emo: "cry",
        scaleMul: 1.48, endScale: 0.68, bg: "#260812",
        border: "#ff1e38", glow: "rgba(255, 30, 56, 0.95)",
        trailA: "rgba(255, 30, 56, 0.44)", trailB: "rgba(255, 110, 80, 0.30)"
      });
    }
  });
  return out;
}

function updateExitFlyOverlay() {
  const layer = $("fly-layer");
  const frameEl = $("frame");
  if (!layer || !frameEl || !G || !cw || !ch) return;
  const flights = getActiveCastFlights();
  if (!flights.length) {
    if (layer.childElementCount) layer.innerHTML = "";
    return;
  }
  const fRect = frameEl.getBoundingClientRect();
  const cRect = cv.getBoundingClientRect();
  if (!fRect.width || !cRect.width) return;
  const activeKeys = new Set(flights.map(f => f.key));
  Array.from(layer.children).forEach(el => {
    if (!activeKeys.has(el.dataset.flyId)) el.remove();
  });
  flights.forEach(f => {
    const h = f.hero;
    const card = document.querySelector(`.ct[data-n="${h.id}"]`);
    if (!card) return;
    const tRect = card.getBoundingClientRect();
    const cvX = (f.src[0] - camX) * B + cw / 2;
    const cvY = (f.src[1] - camY) * B + ch / 2;
    const sx = (cRect.left - fRect.left) + (cvX / cw) * cRect.width;
    const sy = (cRect.top - fRect.top) + (cvY / ch) * cRect.height;
    const sW = ((B * 1.95 * f.scaleMul) / cw) * cRect.width;
    const dx = (tRect.left - fRect.left) + tRect.width / 2;
    const dy = (tRect.top - fRect.top) + tRect.height / 2;
    const pose = computeCastFlyPose(sx, sy, sW, dx, dy, tRect.width, f.startT, f.dur, cRect.width / 495, f.endScale);
    let node = layer.querySelector(`[data-fly-id="${f.key}"]`);
    if (!node) {
      node = document.createElement("div");
      node.dataset.flyId = f.key;
      node.style.cssText = `position:absolute;border-radius:14px;border:3px solid ${f.border};box-shadow:0 0 20px ${f.glow};overflow:hidden;background:${f.bg};will-change:transform,width,height;`;
      const im = document.createElement("img");
      im.src = A[getCharAssetKey(h.id, f.emo)] || A[h.id] || "";
      im.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
      node.appendChild(im);
      layer.appendChild(node);
    }
    const sz = Math.max(24, pose.size);
    node.style.width = sz + "px";
    node.style.height = sz + "px";
    node.style.left = (pose.x - sz / 2) + "px";
    node.style.top = (pose.y - sz / 2) + "px";
    node.style.opacity = pose.u > 0.92 ? String(clamp((1 - pose.u) / 0.08, 0.35, 1)) : "1";
  });
}

function showMenu(mode) {
  clearExitFlyOverlay();
  GameAudio.stopLoops();
  GameAudio.stopWin();
  $("frame").classList.remove("playing");
  $("ov").hidden = false;
  $("step-ratio").hidden = (mode !== "ratio");
  $("step-levels").hidden = (mode !== "levels");
  $("step-results").hidden = (mode !== "results");
}

function show(title, msg, stars, mode) {
  $("ot").textContent = title; $("om").textContent = msg; $("st").textContent = stars;
  showMenu(mode || "results");
}

function triggerDefeat(reason) {
  if (state === "over" || state === "won") return;
  state = "over"; Snd.music(false); Snd.sfx("lose");
  G.defeatMsg = reason || "CANNOT ESCAPE ALONE!";
  ui();
  toast("MISSION FAILED!");
  if (GameRecorder.recording) {
    setTimeout(() => { GameRecorder.stop(); }, 2800);
  }
}

function checkCoopDefeat() {
  if (!G.p2 && !G.p3) return false;
  const living = [G.p1, G.p2, G.p3].filter(p => p && !G.dead.has(p.id));
  if (living.length === 0) {
    triggerDefeat("ALL HEROES OUT OF HEALTH!");
    return true;
  }
  const hasBomb = living.some(h => (h.bombs || 0) > 0);
  const bombAvailable = (G.bombs || []).some(b => !b.got);
  if (hasBomb || bombAvailable) {
    return false; // Can collect a bomb and blow open the blocker wall!
  }
  for (const gate of (G.gates || [])) {
    if (!gate.open) {
      const sw = (G.switches || []).find(s => s.targets && s.targets.includes(gate.id));
      if (sw && !sw.active && sw.hero && G.dead.has(sw.hero)) {
        triggerDefeat("PARTNER LOST — TRAPPED FOREVER! 💔");
        return true;
      }
    }
  }
  return false;
}

function hitHero(h, msg) {
  if (state !== "play") return;
  if (T < h.shield) {
    if (T - (h.blk || -1e9) > 300) {
      h.blk = T; playShieldBlockSound();
      const q = pos(h); VFX.add("ring", q[0], q[1], T, { c: "#7fd0ff" });
      setHeroEmotion(h, "smug", 1.5, 5);
    }
    return;
  }
  if (T < h.inv) return;
  h.hp--; h.inv = T + 600; shake = 1; Snd.sfx("hit", h); VFX.flash("255,40,60", T); GameAudio.duck(1.3);
  fx("cloud", ...pos(h)); if (navigator.vibrate) navigator.vibrate(70);
  if (h.id === "tom") {
    h.emo = "dizzy";
    h.emoUntil = T + 1200;
    h.emoPri = 10;
    h.nextEmo = "sad";
    h.nextEmoUntil = T + 2400;
  } else if (h.id === "cherry") {
    setHeroEmotion(h, "sad", 2.2, 10);
  } else {
    setHeroEmotion(h, h.hp <= 2 ? "cry" : "sad", 2.2, 10);
  }
  const deathPos = pos(h);
  h.i = h.last[0]; h.j = h.last[1]; h.bi = h.i; h.bj = h.j; h.t = 0;
  if (h.hp <= 0) {
    G.dead.add(h.id);
    if (L && (L.exitFly || L.deathFly)) {
      h.deathFlyStart = T;
      h.deathFlyDur = 640;
      h.deathFlySrc = deathPos;
      h.deathBadgeReady = false;
    }
    toast(`${h.name} is down!`);
    fx("cloud", ...deathPos);
    const living = [G.p1, G.p2, G.p3].filter(p => p && !G.dead.has(p.id));
    living.forEach(mate => setHeroEmotion(mate, "sad", 2.4, 9));
    if (checkCoopDefeat()) { ui(); return; }
    if (living.length === 0) {
      triggerDefeat("ALL HEROES OUT OF HEALTH!");
      ui(); return;
    }
    if (G.p.id === h.id) {
      G.active = living[0].id === "tom" ? 1 : (living[0].id === "cherry" ? 2 : 3);
      toast(`Switched to ${living[0].name}!`);
      if (!G.autoPlay) { const [nx, ny] = pos(G.p); camX = nx; camY = ny; }
    }
    ui(); return;
  }
  toast(msg);
}

function nearSpike(sp, px, py) {
  const horiz = (sp.dir || "h") === "h";
  const along = horiz ? Math.abs(px - sp.x) : Math.abs(py - sp.y);
  const across = horiz ? Math.abs(py - sp.y) : Math.abs(px - sp.x);
  return along <= 1.35 && across <= 1.35;
}

function getSpikeWallColors() {
  // High-contrast obsidian black 3D metallic cones so spikes never blend into blue/purple/emerald walls
  return {
    outline: "#000000",
    baseFill: "#0b0f17",
    baseRim: "#64748b",
    coneGrad: ["#05070b", "#141923", "#4b5563", "#111827", "#030508"],
    tipGlow: "#fde68a"
  };
}

function drawSpikes(X, Y) {
  const pal = getSpikeWallColors((L && L.theme) || "blue");
  for (const sp of (G.spikes || [])) {
    if (sp.destroyed) continue;
    const horiz = (sp.dir || "h") === "h";
    // Find actual opposing corridor wall inner faces around (sp.x, sp.y)
    let negFace = (horiz ? sp.y : sp.x) - 1.0;
    let posFace = (horiz ? sp.y : sp.x) + 1.0;
    for (let d = 0.25; d <= 1.85; d += 0.15) {
      const tx = horiz ? Math.floor(sp.x) : Math.floor(sp.x - d);
      const ty = horiz ? Math.floor(sp.y - d) : Math.floor(sp.y);
      if (solid(tx, ty)) { negFace = (horiz ? ty : tx) + 1; break; }
    }
    for (let d = 0.25; d <= 1.85; d += 0.15) {
      const tx = horiz ? Math.floor(sp.x) : Math.floor(sp.x + d);
      const ty = horiz ? Math.floor(sp.y + d) : Math.floor(sp.y);
      if (solid(tx, ty)) { posFace = horiz ? ty : tx; break; }
    }

    const negPx = horiz ? Y(negFace) : X(negFace);
    const posPx = horiz ? Y(posFace) : X(posFace);
    const centerPx = (negPx + posPx) * 0.5;
    const halfSpan = Math.max(B * 0.5, (posPx - negPx) * 0.5);
    const reach = sp.open ? halfSpan * 0.14 : halfSpan * 0.96;
    const alongCenter = horiz ? X(sp.x) : Y(sp.y);
    const coneW = B * 0.90;
    const rimR = B * 0.105;
    const offsets = [-coneW * 0.94, 0, coneW * 0.94];

    ctx.save();
    for (let idx = 0; idx < 3; idx++) {
      const a0 = alongCenter + offsets[idx];
      // Two opposing 3D cones attached to negative and positive walls
      for (const sideSign of [-1, 1]) {
        const basePos = sideSign < 0 ? negPx : posPx;
        const tipPos = sideSign < 0 ? (negPx + reach) : (posPx - reach);
        const bx = horiz ? a0 : basePos;
        const by = horiz ? basePos : a0;
        const tx = horiz ? a0 : tipPos;
        const ty = horiz ? tipPos : a0;

        // Ground shadow under closed spikes
        if (!sp.open) {
          ctx.fillStyle = "rgba(0,0,0,0.32)";
          ctx.beginPath();
          if (horiz) {
            ctx.moveTo(bx - coneW * 0.48, by);
            ctx.lineTo(tx + B * 0.05, ty + (sideSign < 0 ? B * 0.04 : -B * 0.04));
            ctx.lineTo(bx + coneW * 0.48, by);
          } else {
            ctx.moveTo(bx, by - coneW * 0.48);
            ctx.lineTo(tx + (sideSign < 0 ? B * 0.04 : -B * 0.04), ty + B * 0.06);
            ctx.lineTo(bx, by + coneW * 0.48);
          }
          ctx.closePath();
          ctx.fill();
        }

        // Cone conical body with theme-matched wall metallic gradient
        const grad = horiz
          ? ctx.createLinearGradient(bx - coneW * 0.48, 0, bx + coneW * 0.48, 0)
          : ctx.createLinearGradient(0, by - coneW * 0.48, 0, by + coneW * 0.48);
        grad.addColorStop(0.0, pal.coneGrad[0]);
        grad.addColorStop(0.28, pal.coneGrad[1]);
        grad.addColorStop(0.45, pal.coneGrad[2]);
        grad.addColorStop(0.72, pal.coneGrad[3]);
        grad.addColorStop(1.0, pal.coneGrad[4]);

        ctx.fillStyle = grad;
        ctx.strokeStyle = pal.outline;
        ctx.lineWidth = Math.max(1.8, B * 0.04);
        ctx.lineJoin = "round";
        ctx.beginPath();
        if (horiz) {
          ctx.moveTo(bx - coneW * 0.48, by);
          ctx.lineTo(tx, ty);
          ctx.lineTo(bx + coneW * 0.48, by);
        } else {
          ctx.moveTo(bx, by - coneW * 0.48);
          ctx.lineTo(tx, ty);
          ctx.lineTo(bx, by + coneW * 0.48);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Recessed 3D elliptical wall-mount base rim
        ctx.fillStyle = pal.baseFill;
        ctx.strokeStyle = pal.outline;
        ctx.lineWidth = Math.max(1.5, B * 0.035);
        ctx.beginPath();
        if (horiz) ctx.ellipse(bx, by, coneW * 0.48, rimR, 0, 0, 7);
        else ctx.ellipse(bx, by, rimR, coneW * 0.48, 0, 0, 7);
        ctx.fill();
        ctx.stroke();

        // Inner highlight rim along base ellipse
        ctx.strokeStyle = pal.baseRim;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = Math.max(1, B * 0.02);
        ctx.beginPath();
        if (horiz) ctx.ellipse(bx, by, coneW * 0.36, rimR * 0.58, 0, 0, 7);
        else ctx.ellipse(bx, by, rimR * 0.58, coneW * 0.36, 0, 0, 7);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Bright contact glint between opposing tips when closed
      if (!sp.open) {
        const gx = horiz ? a0 : centerPx;
        const gy = horiz ? centerPx : a0;
        const pulse = 0.65 + 0.35 * Math.sin(T / 110 + idx);
        ctx.fillStyle = pal.tipGlow;
        ctx.shadowColor = pal.tipGlow;
        ctx.shadowBlur = B * 0.22 * pulse;
        ctx.beginPath();
        ctx.arc(gx, gy, B * 0.055 * pulse, 0, 7);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(gx, gy, B * 0.028, 0, 7);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  updateExitFlyOverlay();
}

function hasLineOfSight(x0, y0, x1, y1, isGate) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  if (dist < 0.3) return true;
  const steps = Math.max(4, Math.ceil(dist * 4));
  const maxT = isGate ? Math.max(0.2, (dist - 0.85) / dist) : 0.92;
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    if (t > maxT) break;
    const rx = x0 + (x1 - x0) * t;
    const ry = y0 + (y1 - y0) * t;
    if (solid(Math.floor(rx), Math.floor(ry))) {
      return false;
    }
  }
  return true;
}

function throwHeroBomb(h, preferredBossId) {
  const [px, py] = pos(h);
  // Prioritize active input direction, then character facing direction
  const curIn = held();
  let lk = (curIn && DIR[curIn]) ? DIR[curIn] : (h.look || [0, 1]);
  if (lk[0] === 0 && lk[1] === 0) lk = [0, 1];
  const mag = Math.hypot(lk[0], lk[1]) || 1;
  const nx = Math.round(lk[0] / mag), ny = Math.round(lk[1] / mag);
  h.look = [nx, ny];

  // Default target: throw forward ~2 steps (up to 6.0 blocks) down the corridor
  let maxForward = 6.0;
  for (let s = 1; s <= 6; s++) {
    const cx = Math.floor(px + nx * s);
    const cy = Math.floor(py + ny * s);
    if (solid(cx, cy)) {
      maxForward = Math.max(1.8, s - 0.4);
      break;
    }
  }
  let targetX = px + nx * maxForward;
  let targetY = py + ny * maxForward;
  let targetType = "ground", targetObj = null;

  // Gather potential targets along hero's line of fire (reach up to 8.5 blocks / ~2-3 steps)
  const candidates = [];

  function testCandidate(type, obj, tx, ty, isGate = false) {
    const fwd = (tx - px) * nx + (ty - py) * ny;
    const side = Math.abs((tx - px) * -ny + (ty - py) * nx);
    const maxSide = isGate ? 1.35 : 1.25;
    // Must be in FRONT (fwd >= 0.5), within corridor reach (fwd <= 8.5), inside same hallway (side <= maxSide),
    // and have a direct unobstructed line of sight (no solid walls blocking the path)
    if (fwd >= 0.5 && fwd <= 8.5 && side <= maxSide) {
      if (hasLineOfSight(px, py, tx, ty, isGate)) {
        candidates.push({ type, obj, x: tx, y: ty, dist: Math.hypot(tx - px, ty - py), fwd });
      }
    }
  }

  // 1. Saws
  (G.saws || []).forEach((sObj, k) => {
    if (sObj.destroyed) return;
    const [sx, sy] = sawAt(sObj.data, k);
    testCandidate("saw", sObj, sx, sy, false);
    const s = sObj.data;
    testCandidate("saw", sObj, (s[0] + s[2]) / 2, (s[1] + s[3]) / 2, false);
    testCandidate("saw", sObj, s[0], s[1], false);
    testCandidate("saw", sObj, s[2], s[3], false);
  });

  // 2. Wall Saws
  (G.wsaws || []).forEach(wObj => {
    if (wObj.destroyed) return;
    const [wx, wy] = wsPos(wObj.data);
    testCandidate("wsaw", wObj, wx, wy, false);
  });

  // 3. Lasers
  (G.lasers || []).forEach(lObj => {
    if (lObj.destroyed || lObj.disabled) return;
    const [lx, ly] = lObj.data;
    testCandidate("laser", lObj, lx, ly, false);
  });

  // 4. Locked Gates
  (G.gates || []).forEach(gate => {
    if (gate.open) return;
    for (const [gx, gy] of gate.blocks) {
      testCandidate("gate", gate, gx + 0.5, gy + 0.5, true);
    }
  });

  // 4b. Opposing Zigzag Spikes
  (G.spikes || []).forEach(sp => {
    if (sp.destroyed || sp.open) return;
    testCandidate("spike", sp, sp.x, sp.y, true);
  });

  // 5. Bosses (Buffalo / Black Fox / Red Fox)
  for (const boss of (G.bosses || [])) {
    if (boss.dead) continue;
    const dBoss = Math.hypot(boss.x - px, boss.y - py);
    const fwdBoss = (boss.x - px) * nx + (boss.y - py) * ny;
    const sideBoss = Math.abs((boss.x - px) * -ny + (boss.y - py) * nx);
    if ((preferredBossId && boss.id === preferredBossId && dBoss <= 12.0) || (fwdBoss >= 0.5 && fwdBoss <= 10.5 && sideBoss <= 3.5)) {
      candidates.push({ type: "boss", obj: boss, x: boss.x, y: boss.y, dist: dBoss, fwd: preferredBossId === boss.id ? Math.max(0.5, dBoss) : fwdBoss });
    }
  }

  // Pick closest obstacle in the direct line of fire
  if (candidates.length > 0) {
    candidates.sort((a, b) => a.fwd - b.fwd || a.dist - b.dist);
    const best = candidates[0];
    targetX = best.x;
    targetY = best.y;
    targetType = best.type;
    targetObj = best.obj;
  }

  h.bombs = Math.max(0, (h.bombs || 0) - 1);
  h.holdingBomb = false;

  const throwDist = Math.hypot(targetX - px, targetY - py);
  const flightDur = Math.max(540, Math.min(760, Math.round(throwDist * 130)));

  G.projectiles = G.projectiles || [];
  G.projectiles.push({
    sx: px, sy: py,
    tx: targetX, ty: targetY,
    t0: T, dur: flightDur,
    targetType, targetObj,
    owner: h
  });

  setHeroEmotion(h, "angry", 1.8, 6);
  playBombThrowSound(h);
  toast(`${h.name} threw a Bomb! 💣💥`);
}

function throwHeroShield(h, bossId) {
  if (!h || G.dead.has(h.id)) return;
  const [px, py] = pos(h);
  const bosses = (G.bosses || []).filter(b => !b.dead);
  let targetBoss = bossId ? bosses.find(b => b.id === bossId) : null;
  if (!targetBoss && bosses.length) {
    targetBoss = bosses.slice().sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py))[0];
  }
  const lk = h.look || [1, 0];
  const tx = targetBoss ? targetBoss.x : (px + lk[0] * 4);
  const ty = targetBoss ? targetBoss.y : (py + lk[1] * 4);
  const d = Math.hypot(tx - px, ty - py);
  h.shield = 0;
  h.look = [tx >= px ? 1 : -1, Math.abs(ty - py) > Math.abs(tx - px) ? (ty >= py ? 1 : -1) : 0];
  G.projectiles = G.projectiles || [];
  G.projectiles.push({
    sx: px, sy: py, tx, ty,
    t0: T, dur: Math.max(580, Math.min(820, Math.round(d * 140))),
    targetType: targetBoss ? "boss" : "ground",
    targetObj: targetBoss || null,
    kind: "shield",
    owner: h
  });
  setHeroEmotion(h, "angry", 1.6, 6);
  if (isTcAudioV2()) tcPlay("shield_energy_slash", { vol: 0.95 });
  else Snd.sfx("shield");
  toast(`${h.name} threw the Captain Shield! 🛡️⚡`);
}

const WIN_CONFETTI_COLORS = ["#00f0ff", "#ff0077", "#39ff14", "#ffd23f", "#2563eb", "#ff7700", "#a855f7", "#ffffff", "#ff1744"];
let winConfetti = null;

function initWinConfetti() {
  winConfetti = [];
  const count = 42; // Moderate density (~half of reference image)
  for (let i = 0; i < count; i++) {
    winConfetti.push({
      x: Math.random() * (cw || 500),
      y: Math.random() * (ch || 900),
      w: (B || 36) * (0.24 + Math.random() * 0.16),
      h: (B || 36) * (0.16 + Math.random() * 0.14),
      c: WIN_CONFETTI_COLORS[i % WIN_CONFETTI_COLORS.length],
      vy: (B || 36) * (0.045 + Math.random() * 0.055),
      vx: (Math.random() - 0.5) * (B || 36) * 0.025,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.07,
      flip: Math.random() * Math.PI * 2,
      flipSpeed: 0.05 + Math.random() * 0.06,
      swayFreq: 0.002 + Math.random() * 0.003,
      swayAmp: (B || 36) * (0.015 + Math.random() * 0.02)
    });
  }
}

function updateWinConfetti(dt) {
  if (!winConfetti) initWinConfetti();
  const tf = Math.min(2.5, dt / 16.6);
  for (const p of winConfetti) {
    p.y += p.vy * tf;
    p.x += (p.vx + Math.sin(T * p.swayFreq + p.rot) * p.swayAmp) * tf;
    p.rot += p.rotSpeed * tf;
    p.flip += p.flipSpeed * tf;

    if (p.y > ch + 20) {
      p.y = -20 - Math.random() * 30;
      p.x = Math.random() * cw;
    }
    if (p.x < -20) p.x = cw + 15;
    else if (p.x > cw + 20) p.x = -15;
  }
}

const ctl = {
  key: [], ptr: null, pad: null
};

let autoPlayMode = false;

function held() { return ctl.pad || ctl.ptr || ctl.key[ctl.key.length - 1] || null; }

function autoBfsDir(hero, ti, tj) {
  if (!hero) return null;
  if (hero.i === ti && hero.j === tj) return null;
  const q = [[hero.i, hero.j]];
  const firstDir = new Map();
  const key = (i, j) => i + "," + j;
  firstDir.set(key(hero.i, hero.j), null);
  const dirs = [[1, 0, "right"], [-1, 0, "left"], [0, 1, "down"], [0, -1, "up"]];
  while (q.length) {
    const [ci, cj] = q.shift();
    if (ci === ti && cj === tj) return firstDir.get(key(ci, cj));
    for (const [di, dj, name] of dirs) {
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || ni >= CW || nj < 0 || nj >= CH) continue;
      // Check wall doorway between (ci, cj) and (ni, nj)
      if (!nbrs(ci, cj).some(n => n[0] === di && n[1] === dj)) continue;
      const k = key(ni, nj);
      if (firstDir.has(k)) continue;
      // Avoid closed black Zigzag Spikes unless shielded
      const [wx, wy] = cen(ni, nj);
      const blockedBySpike = (G.spikes || []).some(sp => !sp.destroyed && !sp.open && nearSpike(sp, wx, wy));
      if (blockedBySpike && T >= hero.shield) continue;
      firstDir.set(k, firstDir.get(key(ci, cj)) || name);
      q.push([ni, nj]);
    }
  }
  return null;
}

function syncActiveHeroCamera(heroIdx) {
  if (G.active !== heroIdx) {
    G.active = heroIdx;
    if (G.p) {
      G.p.lastMoveT = T;
      if (!G.autoPlay) {
        const [nx, ny] = pos(G.p);
        camX = nx; camY = ny;
      }
    }
    ui();
  }
}

function applyStepCamera(step, focusIdx, focusPts) {
  if (Array.isArray(step.camFocus) && step.camFocus.length >= 2) {
    G.camFocusPoint = [step.camFocus[0], step.camFocus[1]];
    return;
  }
  const bId = step.camBoss || step.targetBoss;
  const bObj = bId ? (G.bosses || []).find(b => b.id === bId && !b.dead) : null;
  const hMain = getHeroByIdx(focusIdx);
  if (bObj && hMain) {
    const [hx, hy] = pos(hMain);
    G.camFocusPoint = [(hx + bObj.x) / 2, (hy + bObj.y) / 2];
  } else if (step.camTeam && focusPts && focusPts.length) {
    let sx = 0, sy = 0;
    focusPts.forEach(pt => { sx += pt[0]; sy += pt[1]; });
    G.camFocusPoint = [sx / focusPts.length, sy / focusPts.length];
  } else {
    G.camFocusPoint = null;
  }
}

function isNextCellDangerous(h, fd) {
  if (!fd || !h || h.t !== 0 || T < h.shield || h.holdingBomb || (h.bombs || 0) > 0) return false;
  const dv = DIR[fd];
  if (!dv) return false;
  const [nx, ny] = cen(h.i + dv[0], h.j + dv[1]);
  if ((G.lasers || []).some((lObj, k) => !lObj.destroyed && !lObj.disabled && (lOn(k) || lWarn(k)) && Math.hypot(lObj.data[0] - nx, lObj.data[1] - ny) < 1.5)) return true;
  if ((G.saws || []).some((sObj, k) => {
    if (sObj.destroyed) return false;
    const [sx, sy] = sawAt(sObj.data, k);
    return Math.hypot(sx - nx, sy - ny) < 1.95;
  })) return true;
  return false;
}

function getHeroByIdx(idx) {
  return idx === 1 ? G.p1 : (idx === 2 ? G.p2 : (idx === 3 ? G.p3 : null));
}

function execAutoStepTrigger(h, step) {
  if (!h || G.dead.has(h.id)) return;
  if (step.look) h.look = [step.look[0], step.look[1]];
  if (step.emo) setHeroEmotion(h, step.emo, step.emoSec || 1.6, 8);
  if (step.sacrificeToBoss) {
    const boss = (G.bosses || []).find(b => b.id === step.sacrificeToBoss && !b.dead);
    if (boss) {
      boss.hp = Math.max(1, (Number.isFinite(boss.hp) ? boss.hp : 2) - (step.dmg || 1));
      boss.stunnedUntil = T + 1100;
      boss.emo = "cry";
      boss.emoUntil = T + 1200;
      for (const [ox, oy] of [[0, 0], [-0.55, -0.45], [0.55, 0.45]]) fx("cloud", boss.x + ox, boss.y + oy);
      VFX.fireblast(boss.x, boss.y, T);
      if (isTcAudioV2()) {
        tcPlay("villain_growl_clash", { vol: 0.95 });
        tcPlay(h.id === "tom" ? "tom_pain_scream" : (h.id === "cherry" ? "cartoon_huh_sharp" : "cartoon_huh_confused"), { vol: 0.95 });
      }
    }
    h.shield = 0; h.inv = 0; h.hp = 1;
    hitHero(h, `${h.name} Fell Fighting ${boss ? boss.name : "the Enemy"}! 💔`);
    return;
  }
  if (step.key === "7") {
    const [px, py] = pos(h);
    const nearBomb = (G.bombs || []).find(b => !b.got && Math.hypot(b.x - px, b.y - py) < 1.85);
    if (nearBomb) {
      nearBomb.got = 1;
      h.bombs = (h.bombs || 0) + 1;
      h.holdingBomb = true;
      setHeroEmotion(h, "angry", 1.5, 4);
      playBombPickupSound();
      VFX.text(px, py, "💣 CARRYING!", T);
      toast(`${h.name} picked up a Bomb! 💣`);
    }
  } else if (step.key === "8") {
    if (h.holdingBomb || (h.bombs || 0) > 0) throwHeroBomb(h, step.targetBoss);
  } else if (step.key === "shield_throw") {
    throwHeroShield(h, step.targetBoss);
  }
}

function stepAutoPlay() {
  if (!G || state !== "play") return [];
  if (T < (G.autoWaitUntil || 0)) return [];

  // Choreographed plan (Level 8 single-focus OR Level 9+ simultaneous parallel multi-hero moves)
  if (L.autoPlan && L.autoPlan.length) {
    if (G.autoIdx >= L.autoPlan.length) return [];
    const step = L.autoPlan[G.autoIdx];
    const focusIdx = Array.isArray(step.focus) ? step.focus[0] : (typeof step.focus === "number" ? step.focus : (step.h || 1));
    syncActiveHeroCamera(focusIdx);

    if (step.minT && T < step.minT) return [];

    // Parallel multi-hero / friend-follow beat
    if (Array.isArray(step.parallel)) {
      const ps = (G.parallelState ||= {});
      if (ps.idx !== G.autoIdx) {
        ps.idx = G.autoIdx;
        ps.subs = step.parallel.map(s => {
          const hero = getHeroByIdx(s.h);
          return { done: false, started: false, initHp: hero ? hero.hp : 5 };
        });
      }
      const moves = [];
      let fixedCount = 0;
      let fixedDone = 0;
      const focusPts = [];

      step.parallel.forEach((sub, si) => {
        const subSt = ps.subs[si];
        const h = getHeroByIdx(sub.h);
        if (!h || G.dead.has(h.id)) {
          if (!sub.follow) { fixedCount++; fixedDone++; }
          subSt.done = true;
          return;
        }
        focusPts.push(pos(h));
        if (sub.follow != null) {
          const leader = getHeroByIdx(sub.follow);
          if (leader && !G.dead.has(leader.id)) {
            const [hx, hy] = pos(h), [lx, ly] = pos(leader);
            const distCells = Math.abs(h.i - leader.i) + Math.abs(h.j - leader.j);
            const pxDist = Math.hypot(hx - lx, hy - ly);
            if ((distCells > (sub.dist || 1) && pxDist > 2.85) || h.t !== 0) {
              // Target the tile directly behind leader when possible so they stay spaced cleanly
              const goal = (leader.last && (leader.last[0] !== leader.i || leader.last[1] !== leader.j)) ? leader.last : [leader.i, leader.j];
              const fd = autoBfsDir(h, goal[0], goal[1]);
              const nextCellIsLeader = (() => {
                if (!fd || h.t !== 0) return false;
                const dv = DIR[fd];
                return (h.i + dv[0] === leader.i && h.j + dv[1] === leader.j);
              })();
              const safeNext = !nextCellIsLeader && !isNextCellDangerous(h, fd);
              if (fd && safeNext) moves.push({ p: h, dir: fd, dst: goal, speedMul: sub.speedMul || 0.62 });
              else if (h.t > 0) {
                const dx = h.bi - h.i, dy = h.bj - h.j;
                moves.push({ p: h, dir: dx > 0 ? "right" : (dx < 0 ? "left" : (dy > 0 ? "down" : "up")), dst: null, speedMul: sub.speedMul || 0.62 });
              }
            }
          }
          return;
        }

        fixedCount++;
        if (subSt.done) { fixedDone++; return; }
        if (sub.minT && T < sub.minT) return;
        if (sub.waitLaserOn != null && !subSt.started) {
          const lPh = (T + sub.waitLaserOn * 700) % 3000;
          if (!lOn(sub.waitLaserOn) || lPh > 2500) return;
          subSt.started = true;
        }
        if (sub.touchLaser && h.hp < subSt.initHp) {
          subSt.done = true;
          fixedDone++;
          return;
        }
        if (sub.to && (h.t !== 0 || h.i !== sub.to[0] || h.j !== sub.to[1])) {
          if (sub.key && sub.minT && T < sub.minT && h.t === 0 && Math.abs(h.i - sub.to[0]) + Math.abs(h.j - sub.to[1]) <= 1) return;
          const d = autoBfsDir(h, sub.to[0], sub.to[1]);
          if (d) {
            if (!sub.touchLaser && isNextCellDangerous(h, d)) return;
            moves.push({ p: h, dir: d, dst: sub.to, speedMul: sub.speedMul || 0.62 });
          } else if (h.t > 0) {
            const dx = h.bi - h.i, dy = h.bj - h.j;
            moves.push({ p: h, dir: dx > 0 ? "right" : (dx < 0 ? "left" : (dy > 0 ? "down" : "up")), dst: sub.to, speedMul: sub.speedMul || 0.62 });
          }
          return;
        }
        execAutoStepTrigger(h, sub);
        subSt.done = true;
        fixedDone++;
      });

      applyStepCamera(step, focusIdx, focusPts);

      if (fixedCount > 0 && fixedDone >= fixedCount) {
        if (step.pauseMs) G.autoWaitUntil = T + step.pauseMs;
        G.autoIdx++;
      }
      return moves;
    }

    const h = G.p;
    if (!h || G.dead.has(h.id)) { G.camFocusPoint = null; G.autoIdx++; return []; }
    const activePts = [G.p1, G.p2, G.p3].filter(p => p && !G.dead.has(p.id)).map(p => pos(p));
    applyStepCamera(step, focusIdx, activePts);

    const st = (G.autoStepState ||= {});
    if (st.idx !== G.autoIdx) {
      st.idx = G.autoIdx;
      st.initHp = h.hp;
      st.started = false;
    }

    if (step.waitLaserOn != null && !st.started) {
      const lPh = (T + step.waitLaserOn * 700) % 3000;
      if (!lOn(step.waitLaserOn) || lPh > 2500) return [];
      st.started = true;
    }
    if (step.touchLaser && h.hp < st.initHp) {
      if (step.pauseMs) G.autoWaitUntil = T + step.pauseMs;
      G.autoIdx++;
      return [];
    }

    if (step.to && (h.t !== 0 || h.i !== step.to[0] || h.j !== step.to[1])) {
      // Mid-cell wait before stepping onto final pickup cell if minT applies only on trigger
      if (step.key && step.minT && T < step.minT && h.t === 0 && Math.abs(h.i - step.to[0]) + Math.abs(h.j - step.to[1]) <= 1) {
        return [];
      }
      const d = autoBfsDir(h, step.to[0], step.to[1]);
      if (d) return [{ p: h, dir: d, dst: step.to, speedMul: step.speedMul || 0.58 }];
      // Fallback: if currently mid-tile (h.t > 0), keep moving along current heading
      if (h.t > 0) {
        const dx = h.bi - h.i, dy = h.bj - h.j;
        return [{ p: h, dir: dx > 0 ? "right" : (dx < 0 ? "left" : (dy > 0 ? "down" : "up")), dst: step.to, speedMul: step.speedMul || 0.58 }];
      }
      return [];
    }

    execAutoStepTrigger(h, step);
    if (step.pauseMs) G.autoWaitUntil = T + step.pauseMs;
    G.autoIdx++;
    return [];
  }

  // Generic smart BFS Auto-Bot fallback for Levels 1-7 (explore coins/route first -> backtrack to switches/shields only when needed)
  const heroes = [[1, G.p1], [2, G.p2], [3, G.p3]].filter(([, p]) => p && !G.dead.has(p.id) && !p.escaped);
  for (const [idx, hero] of heroes) {
    const targets = [];
    // 1. Collect reachable stars along current open corridors before seeking side switches/shields
    for (const c of (G.coins || [])) if (!c.got) targets.push([Math.floor((c.x - 1) / 3), Math.floor((c.y - 1) / 3)]);
    // 2. Only if path to Exit is currently blocked or stars remain behind gates/spikes, backtrack to switches / shields
    if (!autoBfsDir(hero, L.exit[0], L.exit[1])) {
      for (const sw of (G.switches || [])) {
        if (!sw.active && (!sw.hero || sw.hero === hero.id)) {
          targets.push([Math.floor((sw.x - 1) / 3), Math.floor((sw.y - 1) / 3)]);
        }
      }
      if (T >= 3000) {
        for (const s of (G.shields || [])) if (!s.got) targets.push([Math.floor((s.x - 1) / 3), Math.floor((s.y - 1) / 3)]);
      }
    }
    targets.push([L.exit[0], L.exit[1]]);

    for (const [ti, tj] of targets) {
      const d = autoBfsDir(hero, ti, tj);
      if (d) {
        syncActiveHeroCamera(idx);
        return [{ p: hero, dir: d, dst: null, speedMul: 0.58 }];
      }
    }
  }
  return [];
}

function moveHeroStep(p, dirName, dt, dstCell, speedMul) {
  const v = DIR[dirName];
  if (!v || !p || G.dead.has(p.id)) return;
  p.look = [v[0], v[1]];
  let rem = SPEED * (speedMul || 1.0) * dt / 3000;
  let g = 0;
  while (rem > 1e-6 && g++ < 5) {
    if (p.t === 0) {
      if (!nbrs(p.i, p.j).some(n => n[0] === v[0] && n[1] === v[1])) break;
      p.bi = p.i + v[0]; p.bj = p.j + v[1]; p.t = 1e-7;
    }
    const eu = [p.bi - p.i, p.bj - p.j]; let d;
    if (eu[0] === v[0] && eu[1] === v[1]) d = 1; else if (eu[0] === -v[0] && eu[1] === -v[1]) d = -1;
    else {
      const tn = p.t >= .5 ? [p.bi, p.bj] : [p.i, p.j];
      if (!nbrs(tn[0], tn[1]).some(n => n[0] === v[0] && n[1] === v[1])) break;
      d = p.t >= .5 ? 1 : -1;
    }
    p.t += d * rem;
    p.look = d > 0 ? eu : [-eu[0], -eu[1]];
    p.lastMoveT = T;

    if (p.t >= 1) { rem = p.t - 1; p.last = [p.i, p.j]; p.i = p.bi; p.j = p.bj; p.t = 0; }
    else if (p.t <= 0) { rem = -p.t; p.t = 0; p.bi = p.i; p.bj = p.j; }
    else rem = 0;
    if (p.t === 0 && dstCell && p.i === dstCell[0] && p.j === dstCell[1]) break;
  }
}

function update(dt) {
  if (state !== "play") {
    if (state === "won") {
      updateWinConfetti(dt);
    }
    return;
  }
  T += dt; G.t += dt;
  if (G.autoPlay) {
    const autoMoves = stepAutoPlay();
    if (Array.isArray(autoMoves)) {
      for (const mv of autoMoves) moveHeroStep(mv.p, mv.dir, dt, mv.dst, mv.speedMul);
    }
  } else {
    const curInput = held();
    if (curInput) moveHeroStep(G.p, curInput, dt, null, 1.0);
  }

  // Update thrown bomb projectiles (3D flying arc to target)
  if (G.projectiles && G.projectiles.length) {
    G.projectiles = G.projectiles.filter(pj => {
      const elapsed = T - pj.t0;
      if (elapsed >= pj.dur) {
        const x = pj.tx, y = pj.ty;
        if (pj.kind === "shield") {
          VFX.add("ring", x, y, T, { c: "#38bdf8" });
          fx("spark", x, y);
          shake = 1.1;
          playShieldBlockSound();
        } else {
          // DETONATE WITH INTENSE FIREBLAST (NO CONFETTI / NO CELEBRATION HERE!)
          VFX.fireblast(x, y, T);
          shake = 1.8;
          playExplosionSound();
        }

        // FULL AREA OF EFFECT (AOE) OBLITERATION (R <= 4.2 blocks; tighter 2.2 radius for env hazards when targeting a boss)
        const blastRadius = pj.kind === "shield" ? 2.2 : 4.2;
        const envBlastRadius = pj.targetType === "boss" ? 2.2 : blastRadius;
        let destroyedCount = 0;

        // 1. Saws
        (G.saws || []).forEach((sObj, k) => {
          if (sObj.destroyed) return;
          const [sx, sy] = sawAt(sObj.data, k);
          const s = sObj.data;
          const dCurr = Math.hypot(sx - x, sy - y);
          const dStart = Math.hypot(s[0] - x, s[1] - y);
          const dEnd = Math.hypot(s[2] - x, s[3] - y);
          if (dCurr <= envBlastRadius || dStart <= envBlastRadius || dEnd <= envBlastRadius) {
            sObj.destroyed = true;
            destroyedCount++;
            fx("cloud", sx, sy);
          }
        });

        // 2. Wall Saws
        (G.wsaws || []).forEach(wObj => {
          if (wObj.destroyed) return;
          const [wx, wy] = wsPos(wObj.data);
          if (Math.hypot(wx - x, wy - y) <= envBlastRadius) {
            wObj.destroyed = true;
            destroyedCount++;
            fx("cloud", wx, wy);
          }
        });

        // 3. Lasers
        (G.lasers || []).forEach(lObj => {
          if (lObj.destroyed) return;
          const [lx, ly] = lObj.data;
          if (Math.hypot(lx - x, ly - y) <= envBlastRadius) {
            lObj.destroyed = true;
            lObj.disabled = true;
            destroyedCount++;
            fx("cloud", lx, ly);
          }
        });

        // 4. Gates
        (G.gates || []).forEach(gate => {
          if (gate.open) return;
          let hitGate = false;
          for (const [gx, gy] of gate.blocks) {
            if (Math.hypot(gx + 0.5 - x, gy + 0.5 - y) <= envBlastRadius) {
              hitGate = true;
              break;
            }
          }
          if (hitGate) {
            gate.open = true;
            destroyedCount++;
            for (const [gx, gy] of gate.blocks) {
              if (WALL[gy]) WALL[gy][gx] = 0;
              fx("cloud", gx, gy);
            }
            shadow = buildShadow();
          }
        });

        // 4b. Zigzag Spikes
        (G.spikes || []).forEach(sp => {
          if (sp.destroyed || sp.open) return;
          if (Math.hypot(sp.x - x, sp.y - y) <= envBlastRadius) {
            sp.destroyed = true;
            destroyedCount++;
            fx("cloud", sp.x, sp.y);
          }
        });

        // 5. Bosses Stun / Delayed Two-Stage KO Detonation (Impact Stun -> Smoke Poof KO!)
        const dmgBoss = (b, amt) => {
          if (!b || b.dead || b.koAt) return;
          if (Number.isFinite(b.hp)) {
            b.hp -= amt;
            if (b.hp <= 0) {
              b.koAt = T + (pj.kind === "shield" ? 540 : 480);
              b.stunnedUntil = Math.max(b.stunnedUntil, b.koAt + 200);
              b.emo = "cry";
              b.emoUntil = b.koAt + 200;
              b.koOwner = pj.owner || null;
              VFX.add("ring", b.x, b.y, T, { c: "#ffd23f" });
              fx("spark", b.x, b.y);
              if (isTcAudioV2()) tcPlay("villain_growl_clash", { vol: 0.9 });
              toast(`Direct Hit on ${b.name}! 💥`);
              return;
            }
          }
          b.stunnedUntil = T + 5000;
          VFX.fireblast(b.x, b.y, T);
          toast(`${b.name} Stunned! 💥 (5s)`);
        };
        const hitBosses = new Set();
        for (const boss of (G.bosses || [])) {
          if (!boss.dead && Math.hypot(boss.x - x, boss.y - y) <= blastRadius) {
            hitBosses.add(boss);
            dmgBoss(boss, pj.kind === "shield" ? 1 : 2);
            destroyedCount++;
          }
        }

        // 6. Explicit target fallback
        if (pj.targetObj) {
          if (pj.targetType === "gate" && !pj.targetObj.open) {
            pj.targetObj.open = true;
            destroyedCount++;
            for (const [gx, gy] of pj.targetObj.blocks) {
              if (WALL[gy]) WALL[gy][gx] = 0;
              fx("cloud", gx, gy);
            }
            shadow = buildShadow();
          } else if (pj.targetType === "laser") {
            pj.targetObj.destroyed = true;
            pj.targetObj.disabled = true;
            destroyedCount++;
          } else if (pj.targetType === "spike") {
            pj.targetObj.destroyed = true;
            destroyedCount++;
            fx("cloud", pj.targetObj.x, pj.targetObj.y);
          } else if (pj.targetType === "boss") {
            if (!hitBosses.has(pj.targetObj) && !pj.targetObj.dead) {
              dmgBoss(pj.targetObj, pj.kind === "shield" ? 1 : 2);
              destroyedCount++;
            }
          } else {
            pj.targetObj.destroyed = true;
            destroyedCount++;
          }
        }

        if (pj.kind === "shield") playShieldBlockSound();
        if (pj.owner && !G.dead.has(pj.owner.id) && pj.kind !== "shield") {
          setHeroEmotion(pj.owner, destroyedCount > 0 ? "laugh" : "wink", 2.0, 8);
        }

        toast(destroyedCount > 0 ? "Hazards Obliterated by Bomb! 💥" : "Bomb Detonated! 💥");
        return false;
      }
      return true;
    });
  }

  const heroes = [G.p1, G.p2, G.p3].filter(Boolean);
  for (const h of heroes) {
    if (G.dead.has(h.id)) continue;
    const [px, py] = pos(h);
    // Collectible Bombs (💣 on Floor)
    for (const b of (G.bombs || [])) {
      if (!b.got && Math.hypot(b.x - px, b.y - py) < 1.7) {
        if (!b.prompted && h === G.p && !h.holdingBomb) {
          b.prompted = true;
          setHeroEmotion(h, "curious", 1.5, 2);
          toast("Press 7 to Pick Up Bomb 💣");
        }
      }
    }

    // Hazards (Saw Blades, Wall Saws, Lasers)
    (G.saws || []).forEach((sObj, k) => {
      if (sObj.destroyed) return;
      const [x, y] = sawAt(sObj.data, k);
      if (near(x, y, 1.05, px, py)) {
        if (h.holdingBomb || (h.bombs || 0) > 0) {
          h.bombs = Math.max(0, (h.bombs || 0) - 1);
          h.holdingBomb = false;
          sObj.destroyed = true;
          VFX.fireblast(x, y, T);
          shake = 1.6;
          playExplosionSound();
          setHeroEmotion(h, "smug", 1.8, 6);
          toast("Saw Wheel Destroyed! 💥");
        } else {
          hitHero(h, "Sliced by a blade!");
        }
      }
    });

    (G.wsaws || []).forEach(wObj => {
      if (wObj.destroyed) return;
      const [x, y] = wsPos(wObj.data);
      if (near(x, y, 1.05, px, py)) {
        if (h.holdingBomb || (h.bombs || 0) > 0) {
          h.bombs = Math.max(0, (h.bombs || 0) - 1);
          h.holdingBomb = false;
          wObj.destroyed = true;
          VFX.fireblast(x, y, T);
          shake = 1.6;
          playExplosionSound();
          setHeroEmotion(h, "smug", 1.8, 6);
          toast("Wall Blade Destroyed! 💥");
        } else {
          hitHero(h, "Cut by a wall blade!");
        }
      }
    });

    L.enemies.forEach((s, k) => {
      const [x, y] = sawAt(s, k + 9);
      if (near(x, y, 1.1, px, py)) hitHero(h, "Caught by an enemy!");
    });

    (G.lasers || []).forEach((lObj, k) => {
      if (lObj.destroyed || lObj.disabled || !lOn(k)) return;
      const l = lObj.data;
      const hz = l[2] === "h";
      const inX = hz ? Math.abs(px - l[0]) <= 1.25 : Math.abs(px - l[0]) <= 0.8;
      const inY = hz ? Math.abs(py - l[1]) <= 0.8 : Math.abs(py - l[1]) <= 1.25;
      if (inX && inY) {
        if (h.holdingBomb || (h.bombs || 0) > 0) {
          h.bombs = Math.max(0, (h.bombs || 0) - 1);
          h.holdingBomb = false;
          lObj.destroyed = true;
          lObj.disabled = true;
          VFX.fireblast(l[0], l[1], T);
          shake = 1.6;
          playExplosionSound();
          setHeroEmotion(h, "smug", 1.8, 6);
          toast("Laser Generator Destroyed! 💥");
        } else {
          hitHero(h, "Laser zap!");
        }
      }
    });

    // Star Coins
    for (const c of G.coins) {
      if (!c.got && Math.hypot(c.x - px, c.y - py) < 1.4) {
        c.got = 1; G.score = G.coins.filter(k => k.got).length; playStarCoinSound();
        setHeroEmotion(h, "happy", 1.4, 3);
        fx("spark", c.x, c.y); VFX.text(c.x, c.y, "+1" + (GameAudio.combo > 1 ? " x" + GameAudio.combo : ""), T);
      }
    }
    // Health Bubbles
    for (const b of G.bub) {
      if (!b.got && Math.hypot(b.x - px, b.y - py) < 1.4) {
        b.got = 1; Snd.sfx("heal", h); GameAudio.duck(.65);
        setHeroEmotion(h, h.id === "tom" ? "wink" : "happy", 1.8, 4);
        VFX.add("plus", b.x, b.y, T); if (h.hp < MAXHP) { h.hp++; toast("Health +1"); } else { toast("Full Health!"); }
      }
    }
    // Shields (Keep hero portraits clear during the first 3-second intro hook!)
    for (const s of G.shields) {
      if (T >= 3000 && !s.got && Math.hypot(s.x - px, s.y - py) < 1.4) {
        s.got = 1; Snd.sfx("shield", h); GameAudio.duck(.65);
        setHeroEmotion(h, "smug", 2.0, 5);
        VFX.add("ring", s.x, s.y, T, { c: "#7fd0ff" }); h.shield = T + 8000; h.sh1 = 1; toast("Shield on for 8 seconds");
      }
    }

    // Opposing Zigzag Spikes (3 Crossing Methods: Shield, Bomb, or Red->Green Switch)
    for (const sp of (G.spikes || [])) {
      if (sp.destroyed || sp.open) continue;
      if (isTcAudioV2() && T >= 3000 && !h.escaped && T >= h.shield && !(h.holdingBomb || (h.bombs || 0) > 0) && Math.hypot(sp.x - px, sp.y - py) <= 3.15) {
        if (!sp._confrontedBy) sp._confrontedBy = new Set();
        if (!sp._confrontedBy.has(h.id)) {
          sp._confrontedBy.add(h.id);
          tcPlay(h.id === "cherry" ? "cartoon_uh_oh" : (h.id === "bulldog" ? "cartoon_huh_confused" : "cartoon_huh_double"), { vol: 0.95 });
        }
      }
      if (nearSpike(sp, px, py)) {
        if (h.holdingBomb || (h.bombs || 0) > 0) {
          h.bombs = Math.max(0, (h.bombs || 0) - 1);
          h.holdingBomb = false;
          sp.destroyed = true;
          VFX.fireblast(sp.x, sp.y, T);
          shake = 1.6;
          playExplosionSound();
          setHeroEmotion(h, "smug", 1.8, 6);
          toast("Zigzag Spikes Blasted! 💥");
        } else if (T < h.shield) {
          if (T - (h.blk || -1e9) > 450) {
            h.blk = T;
            playShieldBlockSound();
            VFX.add("ring", px, py, T, { c: "#7fd0ff" });
            setHeroEmotion(h, "smug", 1.5, 5);
          }
        } else {
          const wasInv = T < h.inv;
          hitHero(h, "Blocked by Zigzag Spikes! Need Shield, Bomb, or Switch!");
          if (wasInv) {
            if (Math.hypot(cen(h.i, h.j)[0] - sp.x, cen(h.i, h.j)[1] - sp.y) < 1.35) {
              h.i = h.last[0]; h.j = h.last[1];
            }
            h.bi = h.i; h.bj = h.j; h.t = 0;
          }
        }
      }
    }

    // Wall Switches (Red = Closed -> Green = Open; supports open & close toggle)
    for (const sw of (G.switches || [])) {
      if (!sw._inside) sw._inside = new Set();
      const dSw = Math.hypot(sw.x - px, sw.y - py);
      if (dSw >= 1.6) {
        sw._inside.delete(h.id);
        continue;
      }
      if (dSw < 1.35 && !sw._inside.has(h.id)) {
        if (sw.hero && sw.hero !== h.id) continue;
        sw._inside.add(h.id);
        if (sw.active && !sw.toggle) continue;
        const nextActive = !sw.active;
        // If re-closing, verify no living hero stands inside the target doorway/spikes
        if (!nextActive) {
          let blockedByHero = false;
          for (const tid of (sw.targets || [])) {
            const gate = (G.gates || []).find(g => g.id === tid);
            if (gate) {
              for (const lh of heroes) {
                if (G.dead.has(lh.id)) continue;
                const [lx, ly] = pos(lh);
                if (gate.blocks.some(([gx, gy]) => Math.hypot(gx + 0.5 - lx, gy + 0.5 - ly) < 1.25)) blockedByHero = true;
              }
            }
            const spk = (G.spikes || []).find(sp => sp.id === tid && !sp.destroyed);
            if (spk) {
              for (const lh of heroes) {
                if (G.dead.has(lh.id)) continue;
                const [lx, ly] = pos(lh);
                if (nearSpike(spk, lx, ly)) blockedByHero = true;
              }
            }
          }
          if (blockedByHero) { toast("Clear the route before closing!"); continue; }
        }
        sw.active = nextActive;
        setHeroEmotion(h, "wink", 2.0, 5);
        if (isTcAudioV2()) tcPlay("switch_pop", { vol: 1.0, rand: .04, fallback: "click" });
        else GameAudio.play("click", { vol: 1.3, rand: .05 });
        VFX.add("ring", sw.x, sw.y, T, { c: sw.active ? "#00e676" : "#ff1744" });
        toast(sw.active ? (sw.msg || "Green Switch! Route Open!") : (sw.closeMsg || "Red Switch! Route Closed!"));
        shake = 0.85;
        let wallDirty = false;
        for (const tid of (sw.targets || [])) {
          const gate = (G.gates || []).find(g => g.id === tid);
          if (gate) {
            gate.open = sw.active;
            for (const [gx, gy] of gate.blocks) {
              if (WALL[gy]) WALL[gy][gx] = sw.active ? 0 : 1;
              fx("cloud", gx, gy);
            }
            wallDirty = true;
          }
          const spk = (G.spikes || []).find(sp => sp.id === tid);
          if (spk && !spk.destroyed) {
            spk.open = sw.active;
            fx("cloud", spk.x, spk.y);
          }
          const laserObj = (G.lasers || []).find(l => l.data[3] === tid || l.data.id === tid);
          if (laserObj) { laserObj.disabled = sw.active; }
          const sawObj = (G.saws || []).find(s => s.data[4] === tid);
          if (sawObj) {
            sawObj.destroyed = sw.active;
            const [sx, sy] = sawAt(sawObj.data, 0);
            fx("cloud", sx, sy);
          }
        }
        // Twist support: closing trap gates / closing spikes when switch activates!
        if (sw.active && sw.closeTargets && sw.closeTargets.length) {
          for (const ctid of sw.closeTargets) {
            const cGate = (G.gates || []).find(g => g.id === ctid);
            if (cGate) {
              cGate.open = false;
              for (const [gx, gy] of cGate.blocks) {
                if (WALL[gy]) WALL[gy][gx] = 1;
                fx("cloud", gx, gy);
              }
              wallDirty = true;
            }
            const cSpk = (G.spikes || []).find(sp => sp.id === ctid && !sp.destroyed);
            if (cSpk) { cSpk.open = false; fx("cloud", cSpk.x, cSpk.y); }
          }
          shake = 1.4;
          if (isTcAudioV2()) {
            setTimeout(() => { if (state === "play") tcPlay("cartoon_huh_double", { vol: 1.0 }); }, 160);
          } else {
            GameAudio.play("lose", { vol: 1.25 });
          }
          if (G.p1 && !G.dead.has(G.p1.id)) setHeroEmotion(G.p1, "scared", 2.8, 8);
        }
        if (wallDirty) shadow = buildShadow();
      }
    }

    // Exit reach for individual living heroes
    if (h.i === L.exit[0] && h.j === L.exit[1] && h.t === 0) {
      if (L.exitFly) {
        if (!h.exitFlyStart && !h.escaped) {
          h.exitFlyStart = T;
          h.exitFlyDur = 460;
          h.exitFlySrc = cen(...L.exit);
          h.t = 0;
          VFX.add("ring", h.exitFlySrc[0], h.exitFlySrc[1], T, { c: "#22c55e" });
          fx("spark", h.exitFlySrc[0], h.exitFlySrc[1]);
          if (isTcAudioV2()) tcPlay("switch_pop", { vol: 0.85 });
          else Snd.sfx("win");
        }
      } else if (!h.escaped) {
        h.escaped = true;
        const card = document.querySelector(`.ct[data-n="${h.id}"]`);
        if (card) card.classList.add("escaped");
        const living = [G.p1, G.p2, G.p3].filter(p => p && !G.dead.has(p.id));
        if (living.length > 1 && !living.every(p => p.escaped)) {
          if (isTcAudioV2()) {
            if (h.id === "cherry") tcPlay("jerry_chase_laugh", { vol: 0.9 });
            else if (h.id === "bulldog") tcPlay("powerup_boing", { vol: 0.85 });
          }
          toast(`${h.name} reached Exit!`);
        }
      }
    }

    // Dust particles when moving
    const mv = !!h.pp && Math.hypot(px - h.pp[0], py - h.pp[1]) > 1e-3; h.pp = [px, py];
    if (mv && T > (h.dt || 0)) { h.dt = T + 130; const lk = h.look || [0, 0]; VFX.add("dust", px - lk[0] * .9, py - lk[1] * .9, T); }
  }

  // -------------------------------------------------------------
  // AUTONOMOUS AI BOSSES UPDATE (Buffalo / Black Fox / Red Fox)
  // -------------------------------------------------------------
  for (const boss of (G.bosses || [])) {
    if (boss.dead) continue;
    if (boss.koAt) {
      if (T >= boss.koAt) {
        boss.dead = true;
        boss.koAt = 0;
        boss.emo = "cry";
        G.dead.add(boss.id);
        VFX.fireblast(boss.x, boss.y, T);
        for (const [ox, oy] of [[0, 0], [-0.7, -0.5], [0.7, -0.4], [-0.6, 0.6], [0.7, 0.5]]) {
          fx("cloud", boss.x + ox, boss.y + oy);
        }
        if (isTcAudioV2()) tcPlay("smoke_poof", { vol: 1.0 });
        if (boss.koOwner && !G.dead.has(boss.koOwner.id)) setHeroEmotion(boss.koOwner, "laugh", 2.2, 8);
        if (isTcAudioV2() && G.p2 && !G.dead.has("cherry")) {
          setTimeout(() => { if (state === "play") tcPlay("jerry_happy_laugh", { vol: 0.9 }); }, 220);
        }
        toast(`${boss.name} Defeated! 💥`);
      }
      continue;
    }
    if (!boss.awake) {
      if (Math.abs(boss.x - camX) <= 4.4 && Math.abs(boss.y - camY) <= 4.5) {
        boss.awake = true;
        boss.lastAttack = T;
      } else continue;
    }
    const isStunned = T < boss.stunnedUntil;

    if (isStunned) {
      if (Math.random() < 0.25) {
        fx("cloud", boss.x + (Math.random() - .5) * .8, boss.y + (Math.random() - .5) * .8);
      }
    } else {
      const activeHero = G.p;
      const [px, py] = pos(activeHero);
      const dHero = Math.hypot(px - boss.x, py - boss.y);
      const canSeeHero = dHero < 9.5 && hasLineOfSight(boss.x, boss.y, px, py);

      let targetX, targetY;
      if (canSeeHero) {
        targetX = px;
        targetY = py;
        if (isTcAudioV2() && boss.mode !== "hunt") {
          tcPlay("villain_evil_laugh", { min: 4.5, vol: 0.95 });
        }
        boss.mode = "hunt";
      } else {
        const wp = boss.waypoints[boss.wpIdx % boss.waypoints.length];
        targetX = wp[0];
        targetY = wp[1];
        if (Math.hypot(targetX - boss.x, targetY - boss.y) < 1.0) {
          boss.wpIdx = (boss.wpIdx + 1) % boss.waypoints.length;
        }
        boss.mode = "patrol";
      }

      const angle = Math.atan2(targetY - boss.y, targetX - boss.x);
      const moveDist = boss.speed * (dt / 1000);
      let nextX = boss.x + Math.cos(angle) * moveDist;
      let nextY = boss.y + Math.sin(angle) * moveDist;
      if (boss.bounds) {
        nextX = clamp(nextX, boss.bounds[0], boss.bounds[2]);
        nextY = clamp(nextY, boss.bounds[1], boss.bounds[3]);
      }

      if (!solid(Math.floor(nextX), Math.floor(nextY))) {
        boss.x = nextX;
        boss.y = nextY;
      } else if (!solid(Math.floor(nextX), Math.floor(boss.y))) {
        boss.x = nextX;
      } else if (!solid(Math.floor(boss.x), Math.floor(nextY))) {
        boss.y = nextY;
      }
      boss.look = [Math.cos(angle) >= 0 ? 1 : -1, Math.sin(angle) >= 0 ? 1 : -1];

      // Power Bomb Throw Attack
      if (T - boss.lastAttack > 6500 && dHero <= 10.0 && canSeeHero) {
        boss.lastAttack = T;
        boss.emo = "angry";
        boss.emoUntil = T + 2200;
        if (isTcAudioV2()) tcPlay("villain_growl_clash", { vol: 0.95, fallback: "coin" });
        else GameAudio.play("coin", { vol: 1.3, rand: .1 });
        toast(`${boss.name} threw a Power Bomb! 💣`);
        G.bossBombs = G.bossBombs || [];
        G.bossBombs.push({
          sx: boss.x,
          sy: boss.y,
          tx: px,
          ty: py,
          t0: T,
          dur: Math.max(300, Math.min(520, Math.round(dHero * 55))),
          bossName: boss.name
        });
      }

      // Contact attack with heroes (shielded friend/hero deflects & stuns boss to protect teammates!)
      for (const h of heroes) {
        if (G.dead.has(h.id)) continue;
        const [hx, hy] = pos(h);
        if (near(boss.x, boss.y, 1.25, hx, hy)) {
          if (T < h.shield) {
            boss.stunnedUntil = Math.max(boss.stunnedUntil, T + 2200);
            boss.emo = "cry";
            boss.emoUntil = T + 2200;
            if (isTcAudioV2()) tcPlay("villain_growl_clash", { vol: 0.9 });
            playShieldBlockSound();
            VFX.add("ring", boss.x, boss.y, T, { c: "#7fd0ff" });
            setHeroEmotion(h, "smug", 1.8, 6);
            toast(`${h.name} Shield-Blocked ${boss.name}! 🛡️`);
            break;
          }
          boss.emo = "angry";
          boss.emoUntil = T + 1800;
          hitHero(h, `Caught by ${boss.name}! 💥`);
        }
      }
    }
  }

  // Update Bosses' flying power bombs
  if (G.bossBombs && G.bossBombs.length) {
    G.bossBombs = G.bossBombs.filter(pb => {
      if (T - pb.t0 >= pb.dur) {
        VFX.fireblast(pb.tx, pb.ty, T);
        shake = 1.3;
        playExplosionSound();
        for (const h of heroes) {
          if (G.dead.has(h.id)) continue;
          const [hx, hy] = pos(h);
          if (Math.hypot(hx - pb.tx, hy - pb.ty) <= 2.2) {
            hitHero(h, `Hit by ${pb.bossName || "Boss"}'s Power Bomb! 💥`);
          }
        }
        return false;
      }
      return true;
    });
  }

  // Complete any pending hero death-to-RedCross flights!
  for (const h of [G.p1, G.p2, G.p3]) {
    if (h && G.dead.has(h.id) && h.deathFlyStart && !h.deathBadgeReady && T >= h.deathFlyStart + (h.deathFlyDur || 640)) {
      h.deathBadgeReady = true;
      const card = document.querySelector(`.ct[data-n="${h.id}"]`);
      if (card) card.classList.add("dead");
    }
  }

  // Complete any active Exit-to-TopCast flying animations before victory check
  const living = [G.p1, G.p2, G.p3].filter(p => p && !G.dead.has(p.id));
  for (const h of living) {
    if (h.exitFlyStart && !h.escaped && T >= h.exitFlyStart + (h.exitFlyDur || 460)) {
      h.escaped = true;
      const card = document.querySelector(`.ct[data-n="${h.id}"]`);
      if (card) card.classList.add("escaped");
      if (isTcAudioV2()) {
        if (h.id === "cherry") tcPlay("jerry_chase_laugh", { vol: 0.92 });
        else if (h.id === "bulldog") tcPlay("powerup_boing", { vol: 0.88 });
        else tcPlay("powerup_sparkle_chime", { vol: 0.88 });
      }
      if (!living.every(p => p.escaped)) toast(`${h.name} ✔ Escaped!`);
    }
  }

  // ALL LIVING HEROES MUST REACH EXIT TO WIN!
  const allEscaped = living.length > 0 && living.every(h => h.escaped);
  if (allEscaped && state !== "won") {
    state = "won";
    Snd.music(false);
    Snd.sfx("win");
    toast("★ ALL HEROES ESCAPED! VICTORY! ★");
    const [p1x, p1y] = pos(G.p1);
    VFX.cracker(p1x, p1y, T); VFX.confetti(p1x, p1y, T);
    if (G.p2) { const [p2x, p2y] = pos(G.p2); VFX.cracker(p2x, p2y, T); VFX.confetti(p2x, p2y, T); }
    if (G.p3) { const [p3x, p3y] = pos(G.p3); VFX.cracker(p3x, p3y, T); VFX.confetti(p3x, p3y, T); }
    VFX.add("ring", cen(...L.exit)[0], cen(...L.exit)[1], T, { c: "#22c55e" });
    if (GameRecorder.recording) {
      const winHoldMs = (L && Number.isFinite(L.winHoldMs)) ? L.winHoldMs : ((L && L.under30s) ? 1600 : 3800);
      setTimeout(() => { GameRecorder.stop(); }, winHoldMs);
    }
  }

  if (state === "won") {
    if (T - (G.lastWinVFX || 0) > 280) {
      G.lastWinVFX = T;
      const [ex, ey] = cen(...L.exit);
      const rx = ex + (Math.random() - .5) * 8, ry = ey + (Math.random() - .5) * 6;
      VFX.cracker(rx, ry, T);
      if (Math.random() < 0.65) VFX.confetti(rx, ry, T);
    }
  }

  VFX.update(T); shake = Math.max(0, shake - dt / 350); ui();
}

function cam(dt) {
  const [hx, hy] = pos(G.p), [x, y] = (G && G.camFocusPoint) ? G.camFocusPoint : [hx, hy];
  const k = 1 - Math.pow(.002, dt / 1000), hw = cw / B / 2, hh = ch / B / 2, lk = (!G.camFocusPoint && G.p.look && held()) ? G.p.look : [0, 0];
  camX += (x + lk[0] * 1.4 - camX) * k; camY += (y + lk[1] * 1.4 - camY) * k;
  camX = hw * 2 >= W + 2 ? W / 2 : clamp(camX, hw - 1, W - hw + 1); camY = hh * 2 >= H + 2 ? H / 2 : clamp(camY, hh - 1, H - hh + 1);
}

function draw() {
  const k = reduce ? 0 : shake * B * .18, ox = (Math.random() - .5) * k, oy = (Math.random() - .5) * k, X = x => (x - camX) * B + cw / 2 + ox, Y = y => (y - camY) * B + ch / 2 + oy;
  const x0 = Math.floor(camX - cw / B / 2) - 1, x1 = Math.ceil(camX + cw / B / 2) + 1, y0 = Math.floor(camY - ch / B / 2) - 1, y1 = Math.ceil(camY + ch / B / 2) + 1, bs = Math.ceil(B) + 1;
  ctx.fillStyle = "#f6a21e"; ctx.fillRect(0, 0, cw, ch);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ctx.drawImage(floorT[hs(x, y) % 8], Math.round(X(x)), Math.round(Y(y)), bs, bs);
  {
    const sx = Math.max(0, (x0 + M) * SS), sy = Math.max(0, (y0 + M) * SS), ex = Math.min(shadow.width, (x1 + 1 + M) * SS), ey = Math.min(shadow.height, (y1 + 1 + M) * SS);
    if (ex > sx && ey > sy) ctx.drawImage(shadow, sx, sy, ex - sx, ey - sy, X(sx / SS - M) + B * 0.06, Y(sy / SS - M) + B * 0.08, (ex - sx) / SS * B, (ey - sy) / SS * B);
  }
  ctx.lineCap = "round";

  // 3D Lasers (Volumetric energy glow, metallic wall emitters, and cylindrical 3D beam depth)
  (G.lasers || []).forEach((lObj, k) => {
    if (lObj.destroyed || lObj.disabled) return;
    const l = lObj.data;
    const on = lOn(k), w = lWarn(k); if (!on && !(w && Math.floor(T / 60) % 2)) return;
    const hz = l[2] === "h", col = hz ? "#ff163c" : "#2f8cff", glow = hz ? "#ff4872" : "#6ec3ff";
    const span = 1.05;
    const a = hz ? [X(l[0] - span), Y(l[1])] : [X(l[0]), Y(l[1] - span)];
    const b = hz ? [X(l[0] + span), Y(l[1])] : [X(l[0]), Y(l[1] + span)];
    ctx.save();
    const pl = on ? (1 + .15 * Math.sin(T / 40 + k)) : .4;

    // 1. 3D Volumetric floor glow
    if (on) {
      ctx.save(); ctx.lineCap = "round";
      ctx.strokeStyle = hz ? "rgba(255, 22, 60, 0.16)" : "rgba(47, 140, 255, 0.16)";
      ctx.lineWidth = B * .52 * pl;
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
      ctx.restore();
    }

    // 2. 3D Outer Laser Glow Cylinder
    ctx.lineCap = "round";
    ctx.shadowColor = on ? col : "rgba(255,100,100,.35)";
    ctx.shadowBlur = on ? B * .85 * pl : B * .2;
    ctx.strokeStyle = on ? col : "rgba(255,220,220,.3)";
    ctx.lineWidth = on ? B * .26 * pl : B * .06;
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();

    // 3. 3D Inner Plasma Beam
    if (on) {
      ctx.shadowBlur = B * .35;
      ctx.strokeStyle = glow;
      ctx.lineWidth = B * .13;
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();

      // 4. Razor 3D Core Highlight
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = B * .055;
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();

      // 5. 3D Metallic Wall Emitter Brackets & Searing Lens Hotspots at both ends
      [a, b].forEach(([ex, ey]) => {
        // Metallic emitter housing base
        ctx.fillStyle = "#1e293b";
        ctx.beginPath(); ctx.arc(ex, ey, B * .11, 0, 7); ctx.fill();
        ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = B * .02; ctx.stroke();

        // Chrome emitter ring
        const emG = ctx.createLinearGradient(ex - B * .08, ey - B * .08, ex + B * .08, ey + B * .08);
        emG.addColorStop(0, "#cbd5e1"); emG.addColorStop(0.5, "#475569"); emG.addColorStop(1, "#0f172a");
        ctx.fillStyle = emG;
        ctx.beginPath(); ctx.arc(ex, ey, B * .08, 0, 7); ctx.fill();

        // Glowing core lens
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(ex, ey, B * .045, 0, 7); ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(ex, ey, B * .028, 0, 7); ctx.fill();
      });
    }
    ctx.restore();
  });

  // Saws (Clean spinning steel blades with zero star clutter)
  (G.saws || []).forEach((sObj, k) => {
    if (sObj.destroyed) return;
    const s = sObj.data;
    const [x, y] = sawAt(s, k), px = X(x), py = Y(y), D = sawS.width;
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(px + B * .08, py + B * .16, B * 1.15, B * 1.05, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(px, py); ctx.rotate(T / 420); ctx.drawImage(sawS, -D / 2, -D / 2); ctx.restore();
  });
  (G.wsaws || []).forEach((wObj, k) => {
    if (wObj.destroyed) return;
    const w = wObj.data;
    const [x, y] = wsPos(w), D = sawS.width;
    ctx.save(); ctx.translate(X(x), Y(y)); ctx.rotate(T / 420 * (k % 2 ? -1 : 1)); ctx.drawImage(sawS, -D / 2, -D / 2); ctx.restore();
  });
  L.enemies.forEach((s, k) => { if (!Array.isArray(s)) return; const [x, y] = sawAt(s, k + 9), S = B * 1.8; if (IM[s[4]]) ctx.drawImage(IM[s[4]], X(x) - S / 2, Y(y) - S / 2, S, S); });

  // Shields (Captain America Shield prop)
  for (const s of G.shields) if (!s.got) {
    const px = X(s.x), py = Y(s.y) + Math.sin(T / 280) * B * .06;
    const S = B * 1.48;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.beginPath(); ctx.ellipse(px, Y(s.y) + S * .42, S * .42, S * .15, 0, 0, 7); ctx.fill();
    if (IM.shield_cap && IM.shield_cap.complete) {
      ctx.shadowColor = "rgba(255,255,255,0.55)"; ctx.shadowBlur = B * .22;
      ctx.drawImage(IM.shield_cap, px - S / 2, py - S / 2, S, S);
    }
    ctx.restore();
  }

  // 3D Collectible Bombs (Blue Evil-Face Bomb prop with top fire)
  for (const b of (G.bombs || [])) if (!b.got) {
    const px = X(b.x), py = Y(b.y) + Math.sin(T / 240) * B * .06;
    const sz = B * 1.24;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.38)";
    ctx.beginPath();
    ctx.ellipse(px, Y(b.y) + sz * .38, sz * .38, sz * .14, 0, 0, 7);
    ctx.fill();
    drawEvilBombWithFire(ctx, px, py, sz, 0);
    ctx.restore();
  }

  // Star Coins
  for (const c of G.coins) if (!c.got) {
    const px = X(c.x), py = Y(c.y) + Math.sin(T / 300 + c.ph) * B * .05; ctx.save(); ctx.translate(px, py); ctx.scale(Math.abs(Math.cos(T / 420 + c.ph)) * .55 + .45, 1);
    ctx.lineJoin = "round"; star(ctx, 0, 0, B * .36); ctx.shadowColor = "rgba(255,255,255,.95)"; ctx.shadowBlur = B * .22; ctx.strokeStyle = "#fffdf0"; ctx.lineWidth = B * .15; ctx.stroke(); ctx.shadowColor = "transparent"; ctx.strokeStyle = "#ff8a00"; ctx.lineWidth = B * .08; ctx.stroke(); ctx.fillStyle = "#ffe14d"; ctx.fill(); ctx.restore();
  }

  // Health Bubbles
  for (const b of G.bub) if (!b.got) {
    const px = X(b.x), py = Y(b.y) + Math.sin(T / 260) * B * .07, r = B * .72, g = ctx.createRadialGradient(px - r * .3, py - r * .35, r * .1, px, py, r);
    g.addColorStop(0, "rgba(190,255,250,.95)"); g.addColorStop(.6, "rgba(40,200,210,.7)"); g.addColorStop(1, "rgba(0,120,140,.9)");
    ctx.fillStyle = g; ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = B * .04; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(px - r * .3, py - r * .45, r * .28, r * .14, -.5, 0, 7); ctx.fill();
    const a = r * .5, w = r * .2; ctx.lineJoin = "round"; ctx.lineWidth = B * .1; ctx.strokeStyle = "#fff"; ctx.fillStyle = "#19b94a";
    ctx.beginPath(); ctx.moveTo(px - w, py - a); ctx.lineTo(px + w, py - a); ctx.lineTo(px + w, py - w); ctx.lineTo(px + a, py - w); ctx.lineTo(px + a, py + w); ctx.lineTo(px + w, py + w); ctx.lineTo(px + w, py + a); ctx.lineTo(px - w, py + a); ctx.lineTo(px - w, py + w); ctx.lineTo(px - a, py + w); ctx.lineTo(px - a, py - w); ctx.lineTo(px - w, py - w); ctx.closePath(); ctx.stroke(); ctx.fill();
  }

  // Exit Goal
  {
    const [ex, ey] = cen(...L.exit), px = X(ex), py = Y(ey), pl = .5 + .5 * Math.sin(T / 260), g = ctx.createRadialGradient(px, py, B * .1, px, py, B * 1.4);
    g.addColorStop(0, "rgba(190,255,240,.95)"); g.addColorStop(.55, "rgba(20,200,170," + (.55 + .2 * pl) + ")"); g.addColorStop(1, "rgba(20,200,170,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, B * 1.4, 0, 7); ctx.fill();
    ctx.strokeStyle = "#eafff8"; ctx.lineWidth = B * .08; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(px, py, B * (.35 + i * .2), T / 300 + i * 2, T / 300 + i * 2 + 3.6); ctx.stroke(); }
  }

  // Wall Blocks (normal walls keep consistent unified level styling)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (solid(x, y)) {
        const isGate = (G.gates || []).some(g => !g.open && g.blocks.some(([gx, gy]) => gx === x && gy === y));
        if (!isGate) ctx.drawImage(wallT[hs(x, y) % 4], Math.round(X(x)), Math.round(Y(y)), bs, bs);
      }
    }
  }

  // Dynamic Locked Barrier Gates (Distinct high-contrast locked route styling!)
  for (const gate of (G.gates || [])) {
    if (!gate.open) {
      for (const [gx, gy] of gate.blocks) {
        const px = X(gx), py = Y(gy), S = bs;
        ctx.save();
        // Heavy locked metal base
        ctx.fillStyle = "#0c1322"; ctx.fillRect(Math.round(px), Math.round(py), S, S);
        
        // Hazard caution warning stripes (vibrant yellow and black/crimson)
        ctx.save(); ctx.beginPath(); ctx.rect(Math.round(px), Math.round(py), S, S); ctx.clip();
        ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = S * .24;
        for (let d = -S; d < S * 2; d += S * .48) {
          ctx.beginPath(); ctx.moveTo(px + d, py); ctx.lineTo(px + d + S, py + S); ctx.stroke();
        }
        ctx.restore();

        // Thick distinct security border (glowing red lock border)
        ctx.strokeStyle = "#ff3b30"; ctx.lineWidth = Math.max(3, S * .08);
        ctx.strokeRect(Math.round(px), Math.round(py), S, S);

        // Center electronic lock beacon (pulsing red warning light)
        const pulse = .7 + .3 * Math.sin(T / 120);
        ctx.fillStyle = "#ff1744"; ctx.shadowColor = "#ff1744"; ctx.shadowBlur = S * .4 * pulse;
        ctx.beginPath(); ctx.arc(px + S / 2, py + S / 2, S * .16, 0, 7); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(px + S / 2, py + S / 2, S * .06, 0, 7); ctx.fill();
        ctx.restore();
      }
    }
  }

  // Opposing 3D Zigzag Cone Spikes (Wall-theme colored)
  drawSpikes(X, Y);

  // Wall Switches (Cleaned Red=Closed / Green=Open switch sprites bolted flush to walls)
  for (const sw of (G.switches || [])) {
    const cx = X(sw.x), cy = Y(sw.y);
    const img = sw.active ? IM.switch_green : IM.switch_red;
    if (!img || !img.complete) continue;

    // Auto-detect or snap to exact adjacent solid wall face (corridors are 2 tiles wide!)
    let side = sw.side;
    const scanWall = dir => {
      for (let d = 0.25; d <= 1.85; d += 0.15) {
        if (dir === "left" && solid(Math.floor(sw.x - d), Math.floor(sw.y))) return Math.floor(sw.x - d) + 1;
        if (dir === "right" && solid(Math.floor(sw.x + d), Math.floor(sw.y))) return Math.floor(sw.x + d);
        if (dir === "top" && solid(Math.floor(sw.x), Math.floor(sw.y - d))) return Math.floor(sw.y - d) + 1;
        if (dir === "bottom" && solid(Math.floor(sw.x), Math.floor(sw.y + d))) return Math.floor(sw.y + d);
      }
      return null;
    };
    let faceTile = side ? scanWall(side) : null;
    if (faceTile === null) {
      for (const cand of ["top", "right", "left", "bottom"]) {
        const res = scanWall(cand);
        if (res !== null) { side = cand; faceTile = res; break; }
      }
    }
    if (faceTile === null) { side = side || "right"; faceTile = (side === "left" || side === "right") ? sw.x + (side === "right" ? 1 : -1) : sw.y + (side === "bottom" ? 1 : -1); }

    const btnH = B * 1.16;
    const btnW = btnH * (img.width / img.height);
    const wx = side === "left" ? X(faceTile) - 2 : (side === "right" ? X(faceTile) + 2 : cx);
    const wy = side === "top" ? Y(faceTile) - 2 : (side === "bottom" ? Y(faceTile) + 2 : cy);

    ctx.save();
    ctx.translate(wx, wy);
    if (side === "right") ctx.scale(-1, 1);
    else if (side === "top") ctx.rotate(Math.PI / 2);
    else if (side === "bottom") ctx.rotate(-Math.PI / 2);
    ctx.drawImage(img, 0, -btnH / 2, btnW, btnH);
    ctx.restore();
  }

  // Draw Heroes (Tom, Cherry, Bulldog) with live scene-based emotion images
  const heroList = [
    { p: G.p1, img: getCharImg(G.p1.id, getHeroEmotionName(G.p1)), active: G.active === 1 },
    G.p2 && { p: G.p2, img: getCharImg(G.p2.id, getHeroEmotionName(G.p2)), active: G.active === 2 },
    G.p3 && { p: G.p3, img: getCharImg(G.p3.id, getHeroEmotionName(G.p3)), active: G.active === 3 }
  ].filter(Boolean);

  for (const h of heroList) {
    if (G.dead.has(h.p.id) || h.p.exitFlyStart) continue;
    const [x, y] = pos(h.p), px = X(x), py = Y(y), S = B * 1.95, sh = T < h.p.shield;
    const isMoving = h.p.t !== 0 || (ctl.key && ctl.key.length > 0 && h.active);
    const bob = isMoving ? Math.sin(T / 70) * B * .07 : Math.sin(T / 250) * B * .02;
    const tilt = isMoving ? (h.p.look ? h.p.look[0] * 0.08 : 0) : 0;
    const drawY = py + bob;

    // Contact ground shadow
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.beginPath();
    ctx.ellipse(px, py + S * .46, S * .44, S * .16, 0, 0, 7);
    ctx.fill();
    ctx.restore();

    // Active control focus pulse aura (no numbers on screen!)
    if (h.active) {
      ctx.save();
      const pulseR = S * (.58 + .05 * Math.sin(T / 120));
      ctx.shadowColor = "#ffd23f"; ctx.shadowBlur = B * .4;
      ctx.strokeStyle = "rgba(255, 210, 63, " + (.7 + .3 * Math.sin(T / 120)) + ")";
      ctx.lineWidth = Math.max(2.5, B * .06);
      ctx.beginPath(); ctx.arc(px, drawY, pulseR, 0, 7); ctx.stroke();
      ctx.restore();
    }

    if (!(T < h.p.inv && Math.floor(T / 80) % 2 === 0)) {
      ctx.save();
      ctx.translate(px, drawY);
      if (tilt) ctx.rotate(tilt);
      const br = B * .26;
      ctx.shadowColor = sh ? "rgba(239,68,68,.55)" : "rgba(0,0,0,.55)"; ctx.shadowBlur = sh ? B * .45 : B * .25; ctx.shadowOffsetY = sh ? 0 : B * .08;
      ctx.fillStyle = "#ffffff"; rrect(ctx, -S / 2, -S / 2, S, S, br); ctx.fill();
      ctx.save(); rrect(ctx, -S / 2 + 1, -S / 2 + 1, S - 2, S - 2, br * .95); ctx.clip();
      if (h.img && h.img.complete) ctx.drawImage(h.img, -S * .5, -S * .5, S, S); ctx.restore();
      ctx.strokeStyle = h.active ? "#ffd23f" : (sh ? "#ef4444" : "#1e293b"); ctx.lineWidth = sh ? Math.max(2.5, B * .05) : h.active ? Math.max(2.5, B * .045) : Math.max(1.8, B * .03);
      rrect(ctx, -S / 2, -S / 2, S, S, br); ctx.stroke();
      ctx.restore();
    }
    // Captain America Shield positioned toward hero's direction so hero face remains clearly visible
    if (sh && IM.shield_cap && IM.shield_cap.complete) {
      const lk = h.p.look || [0, 1];
      const mag = Math.hypot(lk[0], lk[1]) || 1;
      const nx = lk[0] / mag, ny = lk[1] / mag;
      const isHoriz = Math.abs(nx) >= Math.abs(ny);
      const sx = isHoriz ? px + (nx >= 0 ? 1 : -1) * S * 0.44 : px + (ny >= 0 ? 1 : -1) * S * 0.18;
      const sy = isHoriz ? drawY + S * 0.04 : drawY + (ny >= 0 ? 1 : -1) * S * 0.45;
      const shW = isHoriz ? S * 0.62 : S * 0.74;
      const shH = isHoriz ? S * 0.78 : S * 0.54;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = B * .18;
      ctx.drawImage(IM.shield_cap, sx - shW / 2, sy - shH / 2, shW, shH);
      ctx.restore();
    }
    const bw = S * .92, bh = B * .2, bx = px - bw / 2, by = drawY - S / 2 - bh - B * .1, f = h.p.hp / MAXHP;
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#0a1536"; ctx.lineWidth = B * .045; rrect(ctx, bx, by, bw, bh, bh / 2); ctx.fill(); ctx.stroke();
    ctx.save(); rrect(ctx, bx, by, bw, bh, bh / 2); ctx.clip(); ctx.fillStyle = f > .6 ? "#2fd150" : f > .3 ? "#ffd21f" : "#ff3b3b"; ctx.fillRect(bx, by, bw * f, bh); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(bx, by, bw * f, bh * .35); ctx.restore();
    if (sh) {
      const sf = (h.p.shield - T) / 8000; ctx.fillStyle = "rgba(10,21,54,.8)"; rrect(ctx, bx, by - bh * .75, bw, bh * .5, bh * .25); ctx.fill();
      ctx.fillStyle = "#58b8ff"; rrect(ctx, bx, by - bh * .75, bw * sf, bh * .5, bh * .25); ctx.fill();
    }
    if ((h.p.bombs || 0) > 0) {
      ctx.save();
      const badgeX = bx + bw + B * .1, badgeY = by + bh / 2;
      ctx.fillStyle = "#0f172a"; ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = Math.max(1.5, B * .03);
      rrect(ctx, badgeX, badgeY - bh * .7, B * .95, bh * 1.4, bh * .4); ctx.fill(); ctx.stroke();
      ctx.font = "900 " + Math.round(bh * .95) + "px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fbbf24";
      ctx.fillText(`💣${h.p.bombs}`, badgeX + B * .47, badgeY + 1);
      ctx.restore();
    }

    // 3D BOMB CARRYING ANIMATION (Hero holding bomb cleanly at side/front edge so face stays visible)
    if (h.p.holdingBomb) {
      ctx.save();
      const lk = h.p.look || [0, 1];
      const mag = Math.hypot(lk[0], lk[1]) || 1;
      const nx = lk[0] / mag, ny = lk[1] / mag;
      const isHoriz = Math.abs(nx) >= Math.abs(ny);
      const isMoving = h.p.t !== 0 || held();
      const bob = Math.sin(T / 80) * (isMoving ? B * .10 : B * .04);
      const bx = isHoriz ? px + (nx >= 0 ? 1 : -1) * S * 0.48 : px + S * 0.34;
      const by = isHoriz ? drawY + S * 0.08 + bob : drawY + (ny >= 0 ? 1 : -1) * S * 0.45 + bob;
      const br = B * .34;

      // 1. Bomb ground shadow
      ctx.fillStyle = "rgba(0,0,0,0.38)";
      ctx.beginPath();
      ctx.ellipse(bx, py + S * .46, br * 1.1, br * .44, 0, 0, 7);
      ctx.fill();

      // 2. Cartoon Paws/Gloves holding the bomb from both sides
      const gloveCol = h.p.id === "tom" ? "#cbd5e1" : (h.p.id === "cherry" ? "#fde68a" : "#94a3b8");
      const gloveStroke = h.p.id === "tom" ? "#334155" : (h.p.id === "cherry" ? "#92400e" : "#1e293b");
      const handW = B * .22, handH = B * .18;

      ctx.save();
      ctx.fillStyle = gloveCol; ctx.strokeStyle = gloveStroke; ctx.lineWidth = Math.max(1.5, B * .035);
      rrect(ctx, bx - br * 1.05, by - handH / 2, handW, handH, handH * .4); ctx.fill(); ctx.stroke();
      rrect(ctx, bx + br * 1.05 - handW, by - handH / 2, handW, handH, handH * .4); ctx.fill(); ctx.stroke();
      ctx.restore();

      // 3. Blue Evil-Face Bomb Sprite with Animated Top Fuse Flame
      drawEvilBombWithFire(ctx, bx, by, B * 0.94, 0);

      ctx.restore();
    }
  }

  // Draw Bosses' Flying Power Bombs
  (G.bossBombs || []).forEach(pb => {
    const p = Math.min(1, Math.max(0, (T - pb.t0) / pb.dur));
    const curX = pb.sx + (pb.tx - pb.sx) * p;
    const curY = pb.sy + (pb.ty - pb.sy) * p;
    const arcH = Math.sin(p * Math.PI) * B * 1.35;
    const px = X(curX), py = Y(curY) - arcH, r = B * .42;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath(); ctx.ellipse(X(curX), Y(curY), r * 0.9, r * 0.38, 0, 0, 7); ctx.fill();

    ctx.translate(px, py);
    ctx.rotate(p * Math.PI * 6);

    const bg = ctx.createRadialGradient(-r * .3, -r * .35, r * .08, 0, 0, r);
    bg.addColorStop(0, "#fecaca"); bg.addColorStop(0.3, "#ef4444"); bg.addColorStop(0.85, "#991b1b"); bg.addColorStop(1, "#450a0a");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.strokeStyle = "#450a0a"; ctx.lineWidth = B * .04; ctx.stroke();

    ctx.fillStyle = "#fef08a"; ctx.shadowColor = "#f97316"; ctx.shadowBlur = B * .35;
    ctx.beginPath(); ctx.arc(0, 0, r * .35, 0, 7); ctx.fill();

    ctx.fillStyle = "#f59e0b"; ctx.fillRect(-r * .15, -r - r * .2, r * .3, r * .22);
    ctx.restore();
  });

  // Draw Autonomous Bosses (Buffalo, Black Fox, Red Fox) with live emotion faces
  for (const boss of (G.bosses || [])) {
    if (boss.dead) continue;
    const px = X(boss.x), py = Y(boss.y);
    const S = B * 2.1;
    const isStunned = T < boss.stunnedUntil;
    const isHunting = boss.mode === "hunt" && !isStunned;
    const bob = isStunned ? 0 : Math.sin(T / 110) * B * .06;
    const drawY = py + bob;

    ctx.save();

    // 1. Ground Shadow
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.beginPath();
    ctx.ellipse(px, py + S * .48, S * .48, S * .18, 0, 0, 7);
    ctx.fill();

    // 2. Menacing Boss Aura Ring
    if (!isStunned) {
      const auraR = S * (.58 + .05 * Math.sin(T / 95));
      ctx.strokeStyle = isHunting ? "rgba(239, 68, 68, 0.85)" : "rgba(220, 38, 38, 0.45)";
      ctx.lineWidth = Math.max(2.5, B * .06);
      ctx.beginPath(); ctx.arc(px, drawY, auraR, 0, 7); ctx.stroke();
    }

    // 3. Boss Character Card (Live Emotion Sprite)
    ctx.save();
    ctx.translate(px, drawY);
    const br = B * .32;
    ctx.shadowColor = isStunned ? "rgba(251,191,36,0.9)" : "rgba(220,38,38,0.9)";
    ctx.shadowBlur = B * .45;
    ctx.fillStyle = "#1a0505";
    rrect(ctx, -S / 2, -S / 2, S, S, br);
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.save();
    rrect(ctx, -S / 2 + 1, -S / 2 + 1, S - 2, S - 2, br * .95);
    ctx.clip();
    const bImg = getCharImg(boss.id, getBossEmotionName(boss));
    if (bImg && bImg.complete) {
      if (isStunned && boss.id === "redfox") {
        ctx.filter = "sepia(60%) brightness(85%)";
      }
      ctx.drawImage(bImg, -S * .5, -S * .5, S, S);
      ctx.filter = "none";
    }
    ctx.restore();

    ctx.strokeStyle = isStunned ? "#f59e0b" : (isHunting ? "#ef4444" : "#b91c1c");
    ctx.lineWidth = Math.max(3, B * .06);
    rrect(ctx, -S / 2, -S / 2, S, S, br);
    ctx.stroke();
    ctx.restore();

    // 4. Spinning Dizzy Stars when stunned (Zero floating names / "STUNNED!" bars!)
    if (isStunned) {
      for (let s = 0; s < 3; s++) {
        const starA = T / 180 + s * (Math.PI * 2 / 3);
        const starX = px + Math.cos(starA) * B * .75;
        const starY = drawY - S / 2 - B * .22 + Math.sin(starA) * B * .22;
        ctx.save();
        ctx.translate(starX, starY);
        ctx.rotate(T / 120);
        star(ctx, 0, 0, B * .16);
        ctx.fillStyle = "#ffd23f";
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // Draw Flying Projectiles ON TOP of Heroes & Bosses so throws are always clearly visible!
  (G.projectiles || []).forEach(pj => {
    const p = Math.min(1, Math.max(0, (T - pj.t0) / pj.dur));
    const curX = pj.sx + (pj.tx - pj.sx) * p;
    const curY = pj.sy + (pj.ty - pj.sy) * p;
    const arcH = Math.sin(p * Math.PI) * B * 1.15;
    const px = X(curX), py = Y(curY) - arcH, sz = B * 1.38;

    // Flight motion trail
    ctx.save();
    const tx0 = X(pj.sx + (pj.tx - pj.sx) * Math.max(0, p - 0.22));
    const ty0 = Y(pj.sy + (pj.ty - pj.sy) * Math.max(0, p - 0.22)) - Math.sin(Math.max(0, p - 0.22) * Math.PI) * B * 1.15;
    ctx.strokeStyle = pj.kind === "shield" ? "rgba(56, 189, 248, 0.72)" : "rgba(249, 115, 22, 0.78)";
    ctx.lineWidth = B * 0.22;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0," + (0.35 * (1 - p * 0.3)) + ")";
    ctx.beginPath(); ctx.ellipse(X(curX), Y(curY), sz * 0.34, sz * 0.14, 0, 0, 7); ctx.fill();
    if (pj.kind === "shield" && IM.shield_cap && IM.shield_cap.complete) {
      ctx.translate(px, py);
      ctx.rotate(p * Math.PI * 8);
      ctx.shadowColor = "rgba(56, 189, 248, 0.98)";
      ctx.shadowBlur = B * 0.45;
      ctx.drawImage(IM.shield_cap, -sz * 0.65, -sz * 0.65, sz * 1.30, sz * 1.30);
    } else {
      drawEvilBombWithFire(ctx, px, py, sz * 1.05, p * Math.PI * 4);
    }
    ctx.restore();
  });

  VFX.draw(ctx, { X, Y, B, T, cloud: cloudS, cw, ch, lowhp: G.p.hp === 1 && state === "play" });
  drawMini();

  // Exit Pointer Arrow
  {
    const [ex, ey] = cen(...L.exit), px = X(ex), py = Y(ey), m = B * .6;
    if (px < 0 || px > cw || py < 0 || py > ch) {
      const a = Math.atan2(py - ch / 2, px - cw / 2); ctx.save(); ctx.translate(clamp(px, m, cw - m), clamp(py, m, ch - m)); ctx.rotate(a);
      ctx.fillStyle = "#2bd9a4"; ctx.strokeStyle = "#053"; ctx.lineWidth = B * .05;
      ctx.beginPath(); ctx.moveTo(B * .42, 0); ctx.lineTo(-B * .28, -B * .3); ctx.lineTo(-B * .1, 0); ctx.lineTo(-B * .28, B * .3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }

  // On-Canvas Victory Banner (Neat, Polished, 3D Celebration Plaque!)
  if (state === "won") {
    ctx.save();
    const font = getComputedStyle(document.body).getPropertyValue("--display") || "sans-serif";
    
    // 1. Subtle dark royal vignette so characters & firecrackers pop
    ctx.fillStyle = "rgba(4, 10, 26, 0.72)";
    ctx.fillRect(0, 0, cw, ch);

    // 2. Centered Curved Plaque / Banner Ribbon
    const bw = Math.min(cw * .96, B * 9.8);
    const bh = B * 6.5;
    const bx = (cw - bw) / 2;
    const by = Math.max(B * 0.35, (ch - bh) / 2);

    // Plaque outer shadow & dark navy base
    ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = B * .5; ctx.shadowOffsetY = B * .15;
    ctx.fillStyle = "#070e24";
    rrect(ctx, bx, by, bw, bh, B * .4); ctx.fill();
    ctx.shadowColor = "transparent";

    // 3D Metallic Gold Border
    const bgGold = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    bgGold.addColorStop(0, "#ffd23f"); bgGold.addColorStop(0.5, "#fffbeb"); bgGold.addColorStop(1, "#d97706");
    ctx.strokeStyle = bgGold; ctx.lineWidth = Math.max(3, B * .1);
    rrect(ctx, bx, by, bw, bh, B * .4); ctx.stroke();

    // Inner glowing trim line
    ctx.strokeStyle = "rgba(255, 210, 63, 0.4)"; ctx.lineWidth = B * .03;
    rrect(ctx, bx + B * .12, by + B * .12, bw - B * .24, bh - B * .24, B * .32); ctx.stroke();

    // 3. Channel Name Header ("GLOBAL GAMES SK")
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const headerY = by + B * .58;
    ctx.font = "900 " + Math.round(B * .44) + "px " + font;
    ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = B * .2;
    ctx.fillStyle = "#ffffff";
    ctx.fillText("GLOBAL GAMES ", cw / 2 - B * .4, headerY);
    ctx.fillStyle = "#ff1744"; ctx.shadowColor = "#ff1744"; ctx.shadowBlur = B * .35;
    ctx.fillText("SK", cw / 2 + B * 1.35, headerY);
    ctx.shadowColor = "transparent";

    // 4. Determine Dynamic Headline & Subtitle based on survivor status
    const allHeroes = [G.p1, G.p2, G.p3].filter(Boolean);
    const escapedHeroes = allHeroes.filter(h => h.escaped && !G.dead.has(h.id));
    let headline = allHeroes.length > 1 ? "ALL HEROES ESCAPED!" : "TOM ESCAPED!";
    let subtitle = "★★★ GRAND VICTORY ★★★";
    let subColor = "#22c55e";

    if (allHeroes.length > 1) {
      if (escapedHeroes.length === allHeroes.length) {
        headline = "ALL HEROES ESCAPED!";
        subtitle = "★★★ GRAND VICTORY ★★★";
        subColor = "#22c55e";
      } else if (escapedHeroes.length === 1) {
        headline = `${escapedHeroes[0].name.toUpperCase()} ESCAPED!`;
        subtitle = "★★★ SOLO SURVIVOR ★★★";
        subColor = "#38bdf8";
      } else {
        headline = `${escapedHeroes.length} HEROES ESCAPED!`;
        subtitle = "★ SURVIVORS VICTORY ★";
        subColor = "#38bdf8";
      }
    }

    // 5. Main Headline
    const titleY = headerY + B * .82;
    ctx.font = "900 " + Math.round(B * .70) + "px " + font;
    ctx.fillStyle = "#78350f";
    ctx.fillText(headline, cw / 2, titleY + B * .06);
    const faceG = ctx.createLinearGradient(0, titleY - B * .4, 0, titleY + B * .4);
    faceG.addColorStop(0, "#ffffff"); faceG.addColorStop(0.35, "#fef08a"); faceG.addColorStop(1, "#f59e0b");
    ctx.fillStyle = faceG;
    ctx.strokeStyle = "#050b1c"; ctx.lineWidth = B * .11;
    ctx.strokeText(headline, cw / 2, titleY);
    ctx.fillText(headline, cw / 2, titleY);

    // 6. Subtitle
    const subY = titleY + B * .65;
    ctx.font = "900 " + Math.round(B * .44) + "px " + font;
    ctx.fillStyle = subColor; ctx.shadowColor = subColor; ctx.shadowBlur = B * .4;
    ctx.strokeStyle = "#050b1c"; ctx.lineWidth = B * .09;
    ctx.strokeText(subtitle, cw / 2, subY);
    ctx.fillText(subtitle, cw / 2, subY);
    ctx.shadowColor = "transparent";

    // 7. Large RECTANGULAR Character Cards with Badges UNDER the image
    const cardTop = subY + B * .45;
    const cardW = allHeroes.length > 2 ? B * 1.65 : B * 2.3;
    const cardH = allHeroes.length > 2 ? B * 1.85 : B * 2.5;
    const cardR = allHeroes.length > 2 ? B * .2 : B * .28;
    const heroes = allHeroes;
    const cardSpacing = heroes.length > 1 ? cardW + B * (heroes.length > 2 ? .3 : .7) : 0;

    heroes.forEach((hero, idx) => {
      const hx = cw / 2 + (idx - (heroes.length - 1) / 2) * cardSpacing;
      const cx = hx - cardW / 2, cy = cardTop;
      const isDead = G.dead.has(hero.id);
      const isEscaped = hero.escaped && !isDead;

      // 1. Rectangular Card Base & Outer Glow Border
      ctx.save();
      if (isEscaped) {
        ctx.fillStyle = "#0a192f";
        ctx.strokeStyle = "#22c55e";
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = B * .36;
      } else {
        ctx.fillStyle = "#1e080a";
        ctx.strokeStyle = "#ef4444";
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = B * .3;
      }
      ctx.lineWidth = B * .075;
      rrect(ctx, cx, cy, cardW, cardH, cardR);
      ctx.fill(); ctx.stroke();
      ctx.shadowColor = "transparent";

      // Inner subtle glow border
      ctx.strokeStyle = isEscaped ? "rgba(34, 197, 94, 0.45)" : "rgba(239, 68, 68, 0.45)";
      ctx.lineWidth = B * .025;
      rrect(ctx, cx + B * .06, cy + B * .06, cardW - B * .12, cardH - B * .12, cardR * .8);
      ctx.stroke();

      // 2. Rectangular Character Image (Wide-eye Happy when Alive, Sad/Cry + Large Red X when Died!)
      ctx.save();
      rrect(ctx, cx, cy, cardW, cardH, cardR);
      ctx.clip();
      const img = getCharImg(hero.id, isDead ? "cry" : "happy");
      if (img && img.complete) {
        if (isDead) {
          ctx.filter = "grayscale(40%) brightness(82%)";
        }
        const pad = B * .08;
        ctx.drawImage(img, cx + pad, cy + pad, cardW - pad * 2, cardH - pad * 2);
        ctx.filter = "none";
      }
      ctx.restore();
      if (isDead) {
        const xPad = cardW * 0.16;
        ctx.save();
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(40, 4, 8, 0.92)";
        ctx.lineWidth = Math.max(6, cardW * 0.15);
        ctx.beginPath();
        ctx.moveTo(cx + xPad, cy + xPad); ctx.lineTo(cx + cardW - xPad, cy + cardH - xPad);
        ctx.moveTo(cx + cardW - xPad, cy + xPad); ctx.lineTo(cx + xPad, cy + cardH - xPad);
        ctx.stroke();
        ctx.strokeStyle = "#ff1e38";
        ctx.shadowColor = "rgba(255, 20, 45, 0.9)";
        ctx.shadowBlur = B * 0.25;
        ctx.lineWidth = Math.max(4, cardW * 0.09);
        ctx.beginPath();
        ctx.moveTo(cx + xPad, cy + xPad); ctx.lineTo(cx + cardW - xPad, cy + cardH - xPad);
        ctx.moveTo(cx + cardW - xPad, cy + xPad); ctx.lineTo(cx + xPad, cy + cardH - xPad);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // 3. Hero Name (Clean, placed underneath rectangular card)
      const nameY = cy + cardH + B * .26;
      ctx.font = "800 " + Math.round(B * (heroes.length > 2 ? .24 : .28)) + "px " + font;
      ctx.fillStyle = isEscaped ? "#f8fafc" : "#94a3b8";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(hero.name || CHAR_NAMES[hero.id] || hero.id, hx, nameY);

      // 4. Status Badge UNDER the card (below name)
      const badgeY = nameY + B * .38;
      const pillW = heroes.length > 2 ? B * 1.45 : B * 1.9, pillH = B * .44;
      const bx0 = hx - pillW / 2, by0 = badgeY - pillH / 2;

      ctx.save();
      if (isEscaped) {
        const bgPill = ctx.createLinearGradient(bx0, by0, bx0, by0 + pillH);
        bgPill.addColorStop(0, "#15803d"); bgPill.addColorStop(1, "#166534");
        ctx.fillStyle = bgPill;
        ctx.strokeStyle = "#4ade80";
        ctx.lineWidth = B * .035;
        ctx.shadowColor = "#22c55e"; ctx.shadowBlur = B * .22;
        rrect(ctx, bx0, by0, pillW, pillH, pillH / 2);
        ctx.fill(); ctx.stroke();

        ctx.shadowColor = "transparent";
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 " + Math.round(B * .22) + "px " + font;
        ctx.fillText("✔ ESCAPED", hx, badgeY + 1);
      } else {
        const bgPill = ctx.createLinearGradient(bx0, by0, bx0, by0 + pillH);
        bgPill.addColorStop(0, "#991b1b"); bgPill.addColorStop(1, "#7f1d1d");
        ctx.fillStyle = bgPill;
        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = B * .035;
        ctx.shadowColor = "#ef4444"; ctx.shadowBlur = B * .22;
        rrect(ctx, bx0, by0, pillW, pillH, pillH / 2);
        ctx.fill(); ctx.stroke();

        ctx.shadowColor = "transparent";
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 " + Math.round(B * .20) + "px " + font;
        ctx.fillText("❌ ELIMINATED", hx, badgeY + 1);
      }
      ctx.restore();
    });

    // 8. Cascading Celebration Confetti Shower (3D Fluttering Paper Flakes, like reference image!)
    if (winConfetti) {
      for (const cf of winConfetti) {
        ctx.save();
        ctx.translate(cf.x, cf.y);
        ctx.rotate(cf.rot);
        const scaleY = Math.cos(cf.flip);
        ctx.scale(1, scaleY);
        ctx.fillStyle = cf.c;
        ctx.fillRect(-cf.w / 2, -cf.h / 2, cf.w, cf.h);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // On-Canvas Defeat / Sad Ending Banner (No modal popup!)
  if (state === "over") {
    ctx.save();
    ctx.fillStyle = "rgba(10, 2, 4, 0.65)";
    ctx.fillRect(0, 0, cw, ch);
    const font = getComputedStyle(document.body).getPropertyValue("--display") || "sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const vy = ch * .28 + Math.sin(T / 350) * B * .05;
    ctx.font = "900 " + Math.round(B * .68) + "px " + font;
    ctx.shadowColor = "#ff0033"; ctx.shadowBlur = B * .6;
    ctx.strokeStyle = "#000"; ctx.lineWidth = B * .14;
    ctx.fillStyle = "#ff1744";
    ctx.strokeText("MISSION FAILED", cw / 2, vy);
    ctx.fillText("MISSION FAILED", cw / 2, vy);

    ctx.font = "900 " + Math.round(B * .38) + "px " + font;
    ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = B * .3;
    ctx.fillStyle = "#ffd23f";
    const sub = G.defeatMsg || "CANNOT ESCAPE ALONE! 💔";
    ctx.strokeText(sub, cw / 2, vy + B * .72);
    ctx.fillText(sub, cw / 2, vy + B * .72);
    ctx.restore();
  }
  updateExitFlyOverlay();
}

// -------------------------------------------------------------
// PURE JAVASCRIPT IN-BROWSER PROGRESSIVE MP4 REMUXER & DURATION FIXER
// Converts MediaRecorder fMP4 into 100% YouTube Shorts Compliant Progressive MP4
// (Constructs progressive moov with populated stts, stsz, stsc, stco, stss, and esds bitrate)
// -------------------------------------------------------------
class MP4BoxWriter {
  constructor() {
    this.chunks = [];
    this.totalLen = 0;
  }
  write(u8) {
    this.chunks.push(u8);
    this.totalLen += u8.byteLength;
  }
  writeU32(val) {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, val, false);
    this.write(b);
  }
  writeU16(val) {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, val, false);
    this.write(b);
  }
  writeU8(val) {
    this.write(new Uint8Array([val]));
  }
  writeBox(type, payloadU8) {
    const sz = 8 + payloadU8.byteLength;
    this.writeU32(sz);
    const typeU8 = new Uint8Array(4);
    for (let i = 0; i < 4; i++) typeU8[i] = type.charCodeAt(i);
    this.write(typeU8);
    this.write(payloadU8);
  }
  getBytes() {
    const out = new Uint8Array(this.totalLen);
    let off = 0;
    for (const c of this.chunks) {
      out.set(c, off);
      off += c.byteLength;
    }
    return out;
  }
}

function remuxFMP4ToProgressive(arrayBuffer, targetWidth, targetHeight) {
  const data = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const totalLen = data.byteLength;

  function listBoxes(buf, start, end) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const out = [];
    let p = start;
    while (p + 8 <= end) {
      let sz = dv.getUint32(p, false);
      const bt = String.fromCharCode(buf[p + 4], buf[p + 5], buf[p + 6], buf[p + 7]);
      let hdr = 8;
      if (sz === 1 && p + 16 <= end) {
        sz = Number(dv.getBigUint64(p + 8, false));
        hdr = 16;
      } else if (sz === 0) {
        sz = end - p;
      }
      if (sz < hdr || p + sz > end) break;
      out.push({ type: bt, offset: p, size: sz, headerLen: hdr, end: p + sz });
      p += sz;
    }
    return out;
  }

  function findBox(buf, start, end, type) {
    return listBoxes(buf, start, end).find(b => b.type === type) || null;
  }

  const topBoxes = listBoxes(data, 0, totalLen);
  const moovBox = topBoxes.find(b => b.type === "moov");
  if (!moovBox) return arrayBuffer;

  const moovChildren = listBoxes(data, moovBox.offset + moovBox.headerLen, moovBox.end);
  let videoTrackId = null;
  let audioTrackId = null;
  let videoTimescale = 30000;
  let audioTimescale = 48000;
  let vStsdEntry = null;
  let aStsdEntry = null;
  let w = targetWidth || 1080;
  let h = targetHeight || 1920;

  // Parse each trak accurately by hdlr handler_type ('vide' vs 'soun') instead of assuming trackId=1
  for (const trak of moovChildren.filter(b => b.type === "trak")) {
    const tkhd = findBox(data, trak.offset + 8, trak.end, "tkhd");
    const mdia = findBox(data, trak.offset + 8, trak.end, "mdia");
    if (!tkhd || !mdia) continue;
    const tkVer = data[tkhd.offset + 8];
    const trackId = view.getUint32(tkVer === 0 ? tkhd.offset + 20 : tkhd.offset + 28, false);
    const mdhd = findBox(data, mdia.offset + 8, mdia.end, "mdhd");
    const hdlr = findBox(data, mdia.offset + 8, mdia.end, "hdlr");
    const minf = findBox(data, mdia.offset + 8, mdia.end, "minf");
    if (!mdhd || !hdlr || !minf) continue;

    const mdVer = data[mdhd.offset + 8];
    const ts = view.getUint32(mdVer === 0 ? mdhd.offset + 20 : mdhd.offset + 28, false) || 30000;
    const hdlrType = String.fromCharCode(data[hdlr.offset + 16], data[hdlr.offset + 17], data[hdlr.offset + 18], data[hdlr.offset + 19]);
    const stbl = findBox(data, minf.offset + 8, minf.end, "stbl");
    const stsd = stbl ? findBox(data, stbl.offset + 8, stbl.end, "stsd") : null;
    let firstStsdEntry = null;
    if (stsd && stsd.size > 24) {
      const entryOff = stsd.offset + 16;
      const entrySz = view.getUint32(entryOff, false);
      if (entrySz >= 8 && entryOff + entrySz <= stsd.end) {
        firstStsdEntry = data.slice(entryOff, entryOff + entrySz);
      }
    }

    if (hdlrType === "vide") {
      videoTrackId = trackId;
      videoTimescale = ts;
      vStsdEntry = firstStsdEntry;
      const offW = tkVer === 0 ? tkhd.offset + 84 : tkhd.offset + 96;
      const parsedW = view.getUint32(offW, false) >> 16;
      const parsedH = view.getUint32(offW + 4, false) >> 16;
      if (parsedW > 0 && parsedH > 0 && parsedW <= 7680) {
        w = parsedW;
        h = parsedH;
      }
    } else if (hdlrType === "soun") {
      audioTrackId = trackId;
      audioTimescale = ts;
      aStsdEntry = firstStsdEntry;
    }
  }

  if (videoTrackId === null || !vStsdEntry) return arrayBuffer;

  // Parse mvex/trex defaults for track durations, sizes, and sync flags
  const trexDefaults = {};
  const mvex = moovChildren.find(b => b.type === "mvex");
  if (mvex) {
    for (const trex of listBoxes(data, mvex.offset + 8, mvex.end).filter(b => b.type === "trex")) {
      const tid = view.getUint32(trex.offset + 12, false);
      trexDefaults[tid] = {
        defDur: view.getUint32(trex.offset + 20, false),
        defSize: view.getUint32(trex.offset + 24, false),
        defFlags: view.getUint32(trex.offset + 28, false)
      };
    }
  }

  const vSamples = [];
  const vDurations = [];
  const vSync = [];
  const aSamples = [];
  const aDurations = [];

  for (let bIdx = 0; bIdx < topBoxes.length; bIdx++) {
    const moof = topBoxes[bIdx];
    if (moof.type !== "moof") continue;
    // Find the mdat associated with this moof (immediately following)
    let mdat = null;
    for (let k = bIdx + 1; k < topBoxes.length; k++) {
      if (topBoxes[k].type === "mdat") { mdat = topBoxes[k]; break; }
      if (topBoxes[k].type === "moof") break;
    }
    if (!mdat) continue;
    let runningMdatPos = mdat.offset + mdat.headerLen;

    for (const traf of listBoxes(data, moof.offset + moof.headerLen, moof.end).filter(b => b.type === "traf")) {
      const tfhd = findBox(data, traf.offset + 8, traf.end, "tfhd");
      if (!tfhd) continue;
      const tfhdFlags = (data[tfhd.offset + 9] << 16) | (data[tfhd.offset + 10] << 8) | data[tfhd.offset + 11];
      const trackId = view.getUint32(tfhd.offset + 12, false);
      let tfhdPtr = tfhd.offset + 16;
      let baseDataOffset = null;
      if (tfhdFlags & 0x01) { baseDataOffset = Number(view.getBigUint64(tfhdPtr, false)); tfhdPtr += 8; }
      else if (tfhdFlags & 0x020000) { baseDataOffset = moof.offset; }
      if (tfhdFlags & 0x02) tfhdPtr += 4;
      const trex = trexDefaults[trackId] || { defDur: 0, defSize: 0, defFlags: 0 };
      let defDuration = (tfhdFlags & 0x08) ? view.getUint32(tfhdPtr, false) : trex.defDur;
      if (tfhdFlags & 0x08) tfhdPtr += 4;
      let defSize = (tfhdFlags & 0x10) ? view.getUint32(tfhdPtr, false) : trex.defSize;
      if (tfhdFlags & 0x10) tfhdPtr += 4;
      let defFlags = (tfhdFlags & 0x20) ? view.getUint32(tfhdPtr, false) : trex.defFlags;

      for (const trun of listBoxes(data, traf.offset + 8, traf.end).filter(b => b.type === "trun")) {
        const flags = (data[trun.offset + 9] << 16) | (data[trun.offset + 10] << 8) | data[trun.offset + 11];
        const sCount = view.getUint32(trun.offset + 12, false);
        let ptr = trun.offset + 16;
        let dataOffset = null;
        if (flags & 0x01) { dataOffset = view.getInt32(ptr, false); ptr += 4; }
        let firstFlags = defFlags;
        if (flags & 0x04) { firstFlags = view.getUint32(ptr, false); ptr += 4; }

        let curPos;
        if (dataOffset !== null) {
          curPos = (baseDataOffset !== null ? baseDataOffset : moof.offset) + dataOffset;
        } else {
          curPos = runningMdatPos;
        }

        for (let s = 0; s < sCount; s++) {
          const dur = (flags & 0x100) ? (() => { const v = view.getUint32(ptr, false); ptr += 4; return v; })() : defDuration;
          const sz = (flags & 0x200) ? (() => { const v = view.getUint32(ptr, false); ptr += 4; return v; })() : defSize;
          let sFlags = (flags & 0x400) ? (() => { const v = view.getUint32(ptr, false); ptr += 4; return v; })() : (s === 0 ? firstFlags : defFlags);
          if (flags & 0x800) ptr += 4;
          if (curPos < 0 || curPos + sz > totalLen) break;

          const sData = data.subarray(curPos, curPos + sz);
          curPos += sz;

          if (trackId === videoTrackId) {
            vSamples.push(sData);
            vDurations.push(dur > 0 ? dur : Math.round(videoTimescale / 60));
            const isNonSync = (sFlags >> 16) & 1;
            if (!isNonSync || vSamples.length === 1) {
              vSync.push(vSamples.length);
            }
          } else if (audioTrackId !== null && trackId === audioTrackId) {
            aSamples.push(sData);
            aDurations.push(dur > 0 ? dur : 1024);
          }
        }
        runningMdatPos = Math.max(runningMdatPos, curPos);
      }
    }
  }

  if (!vSamples.length) return arrayBuffer;

  const movieTimescale = 1000;
  const totalVDur = vDurations.reduce((a, b) => a + b, 0);
  const vDurMs = Math.max(1, Math.round(totalVDur * 1000 / videoTimescale));
  const totalADur = aDurations.reduce((a, b) => a + b, 0);
  const aDurMs = aDurations.length ? Math.max(1, Math.round(totalADur * 1000 / audioTimescale)) : vDurMs;
  const movieDurMs = Math.max(vDurMs, aDurMs);

  const ftypBw = new MP4BoxWriter();
  const ftypPayload = new Uint8Array([
    0x69, 0x73, 0x6f, 0x6d,
    0x00, 0x00, 0x02, 0x00,
    0x69, 0x73, 0x6f, 0x6d,
    0x69, 0x73, 0x6f, 0x36,
    0x6d, 0x70, 0x34, 0x31,
    0x61, 0x76, 0x63, 0x31
  ]);
  ftypBw.writeBox('ftyp', ftypPayload);
  const ftypBytes = ftypBw.getBytes();

  let vMdatLen = 0;
  for (const s of vSamples) vMdatLen += s.byteLength;
  let aMdatLen = 0;
  for (const s of aSamples) aMdatLen += s.byteLength;
  const mdatPayloadLen = vMdatLen + aMdatLen;

  function buildSttsBytes(durations) {
    const sttsEntries = [];
    if (durations.length) {
      let curD = durations[0];
      let curC = 1;
      for (let j = 1; j < durations.length; j++) {
        if (durations[j] === curD) curC++;
        else { sttsEntries.push([curC, curD]); curD = durations[j]; curC = 1; }
      }
      sttsEntries.push([curC, curD]);
    }
    const bw = new MP4BoxWriter();
    bw.writeU8(0); bw.write(new Uint8Array(3));
    bw.writeU32(sttsEntries.length);
    for (const [c, d] of sttsEntries) { bw.writeU32(c); bw.writeU32(d); }
    return bw.getBytes();
  }

  function buildMoov(coV, coA) {
    const moovBw = new MP4BoxWriter();

    const mvhdBw = new MP4BoxWriter();
    mvhdBw.writeU8(0);
    mvhdBw.write(new Uint8Array(3));
    mvhdBw.writeU32(0);
    mvhdBw.writeU32(0);
    mvhdBw.writeU32(movieTimescale);
    mvhdBw.writeU32(movieDurMs);
    mvhdBw.writeU32(0x00010000);
    mvhdBw.writeU16(0x0100);
    mvhdBw.write(new Uint8Array(10));
    const matrix = new Uint8Array(36);
    const dvM = new DataView(matrix.buffer);
    dvM.setUint32(0, 0x00010000, false);
    dvM.setUint32(16, 0x00010000, false);
    dvM.setUint32(32, 0x40000000, false);
    mvhdBw.write(matrix);
    mvhdBw.write(new Uint8Array(24));
    mvhdBw.writeU32(3);

    moovBw.writeBox('mvhd', mvhdBw.getBytes());

    // VIDEO TRAK
    const vTrakBw = new MP4BoxWriter();
    const tkhdBw = new MP4BoxWriter();
    tkhdBw.writeU8(0);
    tkhdBw.write(new Uint8Array([0, 0, 7]));
    tkhdBw.writeU32(0);
    tkhdBw.writeU32(0);
    tkhdBw.writeU32(1);
    tkhdBw.writeU32(0);
    tkhdBw.writeU32(vDurMs);
    tkhdBw.write(new Uint8Array(8));
    tkhdBw.writeU16(0);
    tkhdBw.writeU16(0);
    tkhdBw.writeU16(0);
    tkhdBw.writeU16(0);
    tkhdBw.write(matrix);
    tkhdBw.writeU32(w << 16);
    tkhdBw.writeU32(h << 16);
    vTrakBw.writeBox('tkhd', tkhdBw.getBytes());

    const vMdiaBw = new MP4BoxWriter();
    const mdhdBw = new MP4BoxWriter();
    mdhdBw.writeU8(0);
    mdhdBw.write(new Uint8Array(3));
    mdhdBw.writeU32(0);
    mdhdBw.writeU32(0);
    mdhdBw.writeU32(videoTimescale);
    mdhdBw.writeU32(totalVDur);
    mdhdBw.writeU16(0x55c4);
    mdhdBw.writeU16(0);
    vMdiaBw.writeBox('mdhd', mdhdBw.getBytes());

    const hdlrBw = new MP4BoxWriter();
    hdlrBw.writeU8(0);
    hdlrBw.write(new Uint8Array(3));
    hdlrBw.writeU32(0);
    hdlrBw.write(new Uint8Array([0x76, 0x69, 0x64, 0x65]));
    hdlrBw.write(new Uint8Array(12));
    hdlrBw.write(new Uint8Array([86,105,100,101,111,72,97,110,100,108,101,114,0]));
    vMdiaBw.writeBox('hdlr', hdlrBw.getBytes());

    const minfBw = new MP4BoxWriter();
    const vmhdBw = new MP4BoxWriter();
    vmhdBw.writeU8(0);
    vmhdBw.write(new Uint8Array([0, 0, 1]));
    vmhdBw.writeU16(0);
    vmhdBw.write(new Uint8Array(6));
    minfBw.writeBox('vmhd', vmhdBw.getBytes());

    const dinfBw = new MP4BoxWriter();
    const drefPayload = new MP4BoxWriter();
    drefPayload.writeU8(0);
    drefPayload.write(new Uint8Array(3));
    drefPayload.writeU32(1);
    drefPayload.writeBox('url ', new Uint8Array([0, 0, 0, 1]));
    dinfBw.writeBox('dref', drefPayload.getBytes());
    minfBw.writeBox('dinf', dinfBw.getBytes());

    const stblBw = new MP4BoxWriter();
    const stsdBw = new MP4BoxWriter();
    stsdBw.writeU8(0);
    stsdBw.write(new Uint8Array(3));
    stsdBw.writeU32(1);
    stsdBw.write(vStsdEntry);
    stblBw.writeBox('stsd', stsdBw.getBytes());
    stblBw.writeBox('stts', buildSttsBytes(vDurations));

    const stssBw = new MP4BoxWriter();
    stssBw.writeU8(0); stssBw.write(new Uint8Array(3));
    stssBw.writeU32(vSync.length || 1);
    for (const idx of (vSync.length ? vSync : [1])) stssBw.writeU32(idx);
    stblBw.writeBox('stss', stssBw.getBytes());

    const stscBw = new MP4BoxWriter();
    stscBw.writeU8(0); stscBw.write(new Uint8Array(3));
    stscBw.writeU32(1); stscBw.writeU32(1); stscBw.writeU32(vSamples.length); stscBw.writeU32(1);
    stblBw.writeBox('stsc', stscBw.getBytes());

    const stszBw = new MP4BoxWriter();
    stszBw.writeU8(0); stszBw.write(new Uint8Array(3));
    stszBw.writeU32(0); stszBw.writeU32(vSamples.length);
    for (const s of vSamples) stszBw.writeU32(s.byteLength);
    stblBw.writeBox('stsz', stszBw.getBytes());

    const stcoBw = new MP4BoxWriter();
    stcoBw.writeU8(0); stcoBw.write(new Uint8Array(3));
    stcoBw.writeU32(1); stcoBw.writeU32(coV);
    stblBw.writeBox('stco', stcoBw.getBytes());

    minfBw.writeBox('stbl', stblBw.getBytes());
    vMdiaBw.writeBox('minf', minfBw.getBytes());
    vTrakBw.writeBox('mdia', vMdiaBw.getBytes());
    moovBw.writeBox('trak', vTrakBw.getBytes());

    // AUDIO TRAK
    if (aSamples.length && aStsdEntry) {
      const aTrakBw = new MP4BoxWriter();
      const aTkhdBw = new MP4BoxWriter();
      aTkhdBw.writeU8(0);
      aTkhdBw.write(new Uint8Array([0, 0, 7]));
      aTkhdBw.writeU32(0); aTkhdBw.writeU32(0);
      aTkhdBw.writeU32(2); aTkhdBw.writeU32(0);
      aTkhdBw.writeU32(aDurMs);
      aTkhdBw.write(new Uint8Array(8));
      aTkhdBw.writeU16(0); aTkhdBw.writeU16(0);
      aTkhdBw.writeU16(0x0100); aTkhdBw.writeU16(0);
      aTkhdBw.write(matrix);
      aTkhdBw.writeU32(0); aTkhdBw.writeU32(0);
      aTrakBw.writeBox('tkhd', aTkhdBw.getBytes());

      const aMdiaBw = new MP4BoxWriter();
      const aMdhdBw = new MP4BoxWriter();
      aMdhdBw.writeU8(0); aMdhdBw.write(new Uint8Array(3));
      aMdhdBw.writeU32(0); aMdhdBw.writeU32(0);
      aMdhdBw.writeU32(audioTimescale);
      aMdhdBw.writeU32(totalADur);
      aMdhdBw.writeU16(0x55c4); aMdhdBw.writeU16(0);
      aMdiaBw.writeBox('mdhd', aMdhdBw.getBytes());

      const aHdlrBw = new MP4BoxWriter();
      aHdlrBw.writeU8(0); aHdlrBw.write(new Uint8Array(3));
      aHdlrBw.writeU32(0);
      aHdlrBw.write(new Uint8Array([0x73, 0x6f, 0x75, 0x6e]));
      aHdlrBw.write(new Uint8Array(12));
      aHdlrBw.write(new Uint8Array([83,111,117,110,100,72,97,110,100,108,101,114,0]));
      aMdiaBw.writeBox('hdlr', aHdlrBw.getBytes());

      const aMinfBw = new MP4BoxWriter();
      const smhdBw = new MP4BoxWriter();
      smhdBw.writeU8(0); smhdBw.write(new Uint8Array(3));
      smhdBw.writeU16(0); smhdBw.writeU16(0);
      aMinfBw.writeBox('smhd', smhdBw.getBytes());
      aMinfBw.writeBox('dinf', dinfBw.getBytes());

      const aStblBw = new MP4BoxWriter();
      const aStsdBw = new MP4BoxWriter();
      aStsdBw.writeU8(0); aStsdBw.write(new Uint8Array(3));
      aStsdBw.writeU32(1);
      aStsdBw.write(aStsdEntry);
      aStblBw.writeBox('stsd', aStsdBw.getBytes());
      aStblBw.writeBox('stts', buildSttsBytes(aDurations));

      const aStscBw = new MP4BoxWriter();
      aStscBw.writeU8(0); aStscBw.write(new Uint8Array(3));
      aStscBw.writeU32(1); aStscBw.writeU32(1); aStscBw.writeU32(aSamples.length); aStscBw.writeU32(1);
      aStblBw.writeBox('stsc', aStscBw.getBytes());

      const aStszBw = new MP4BoxWriter();
      aStszBw.writeU8(0); aStszBw.write(new Uint8Array(3));
      aStszBw.writeU32(0); aStszBw.writeU32(aSamples.length);
      for (const s of aSamples) aStszBw.writeU32(s.byteLength);
      aStblBw.writeBox('stsz', aStszBw.getBytes());

      const aStcoBw = new MP4BoxWriter();
      aStcoBw.writeU8(0); aStcoBw.write(new Uint8Array(3));
      aStcoBw.writeU32(1); aStcoBw.writeU32(coA);
      aStblBw.writeBox('stco', aStcoBw.getBytes());

      aMinfBw.writeBox('stbl', aStblBw.getBytes());
      aMdiaBw.writeBox('minf', aMinfBw.getBytes());
      aTrakBw.writeBox('mdia', aMdiaBw.getBytes());
      moovBw.writeBox('trak', aTrakBw.getBytes());
    }

    const fullMoov = new MP4BoxWriter();
    fullMoov.writeBox('moov', moovBw.getBytes());
    return fullMoov.getBytes();
  }

  const guessMoov = buildMoov(0, 0);
  const moovLen = guessMoov.byteLength;
  const mdatHdrLen = 8;
  const mdatStart = ftypBytes.byteLength + moovLen;

  let coV = mdatStart + mdatHdrLen;
  let coA = coV + vMdatLen;

  let finalMoov = buildMoov(coV, coA);
  if (finalMoov.byteLength !== moovLen) {
    const delta = finalMoov.byteLength - moovLen;
    coV += delta;
    coA += delta;
    finalMoov = buildMoov(coV, coA);
  }

  const finalFile = new Uint8Array(ftypBytes.byteLength + finalMoov.byteLength + mdatHdrLen + mdatPayloadLen);
  let cur = 0;
  finalFile.set(ftypBytes, cur); cur += ftypBytes.byteLength;
  finalFile.set(finalMoov, cur); cur += finalMoov.byteLength;

  const dvMdat = new DataView(finalFile.buffer, cur);
  dvMdat.setUint32(0, 8 + mdatPayloadLen, false);
  finalFile[cur + 4] = 0x6d; finalFile[cur + 5] = 0x64; finalFile[cur + 6] = 0x61; finalFile[cur + 7] = 0x74;
  cur += 8;

  for (const s of vSamples) {
    finalFile.set(s, cur);
    cur += s.byteLength;
  }
  for (const s of aSamples) {
    finalFile.set(s, cur);
    cur += s.byteLength;
  }

  return finalFile.buffer;
}

// Fallback duration patcher
function patchMp4Duration(arrayBuffer, durationMs) {
  if (!arrayBuffer || arrayBuffer.byteLength < 16) return;
  const view = new DataView(arrayBuffer);
  const totalLen = arrayBuffer.byteLength;
  let offset = 0;
  function getBoxType(off) {
    return String.fromCharCode(view.getUint8(off), view.getUint8(off + 1), view.getUint8(off + 2), view.getUint8(off + 3));
  }
  function patchMvhd(off, sz) {
    if (off + 36 > totalLen) return;
    const version = view.getUint8(off + 8);
    if (version === 0) {
      const timescale = view.getUint32(off + 20) || 1000;
      const durUnits = Math.round((durationMs / 1000) * timescale);
      view.setUint32(off + 24, durUnits);
    }
  }
  while (offset + 8 <= totalLen) {
    const boxSize = view.getUint32(offset);
    if (boxSize < 8) break;
    const type = getBoxType(offset + 4);
    if (type === "moov") {
      let cur = offset + 8;
      const end = Math.min(offset + boxSize, totalLen);
      while (cur + 8 <= end) {
        const sz = view.getUint32(cur);
        if (sz < 8) break;
        if (getBoxType(cur + 4) === "mvhd") patchMvhd(cur, sz);
        cur += sz;
      }
      break;
    }
    offset += boxSize;
  }
}

// -------------------------------------------------------------
// IN-GAME STUDIO 60FPS DIRECT VIDEO RECORDER (1080p FHD, 2K QHD 1440p & 4K UHD 2160p)
// -------------------------------------------------------------
const GameRecorder = {
  recording: false,
  recorder: null,
  chunks: [],
  startTime: 0,
  timerInterval: null,
  lastBlob: null,
  lastUrl: null,
  recCv: null,
  recCtx: null,
  templateCv: null,
  layout: null,
  resMode: "1080p", // "1080p", "2k", or "4k"
  rw: 1080,
  rh: 1920,
  isMp4: true,

  getResSpec() {
    const mode = this.resMode === "4k" ? "4k" : (this.resMode === "2k" ? "2k" : "1080p");
    const specs = {
      "1080p": {
        mode: "1080p", label: "1080p", fullLabel: "1080p", badge: "1080P",
        portraitTag: "9:16 Shorts", landscapeTag: "16:9 Landscape",
        pw: 1080, ph: 1920, lw: 1920, lh: 1080, videoBps: 9000000
      },
      "2k": {
        mode: "2k", label: "2K", fullLabel: "2K 1440p", badge: "2K 1440P",
        portraitTag: "2K Shorts", landscapeTag: "16:9 Landscape",
        pw: 1440, ph: 2560, lw: 2560, lh: 1440, videoBps: 24000000
      },
      "4k": {
        mode: "4k", label: "4K", fullLabel: "4K 2160p", badge: "4K 2160P",
        portraitTag: "4K Shorts", landscapeTag: "4K 16:9 UHD",
        pw: 2160, ph: 3840, lw: 3840, lh: 2160, videoBps: 35000000
      }
    };
    return specs[mode];
  },

  init() {
    const recBtn = $("btn-record");
    const fsBtn = $("btn-fullscreen");
    const resSel = $("sel-rec-res");
    if (recBtn) recBtn.addEventListener("click", () => this.toggle());
    if (fsBtn) fsBtn.addEventListener("click", () => this.toggleFullscreen());
    if (resSel) {
      resSel.addEventListener("change", (e) => {
        this.resMode = e.target.value;
        this.templateCv = null;
        this.layout = null;
        if (recBtn && !this.recording) {
          const lbl = recBtn.querySelector(".rec-label");
          if (lbl) lbl.textContent = `REC ${this.getResSpec().label.toUpperCase()}`;
        }
      });
    }
    const closeBtn = $("btn-rec-close");
    if (closeBtn) closeBtn.addEventListener("click", () => {
      const modal = $("rec-modal");
      if (modal) modal.hidden = true;
    });
  },

  toggleFullscreen() {
    const f = $("frame");
    if (!f) return;
    f.classList.toggle("studio-1080p");
    resize();
    toast(f.classList.contains("studio-1080p") ? "Studio Mode ON" : "Standard Mode");
  },

  toggle() {
    if (this.recording) this.stop();
    else this.start();
  },

  prepareCanvas() {
    if (!this.recCv) {
      this.recCv = document.createElement("canvas");
      this.recCv.style.position = "fixed";
      this.recCv.style.left = "0px";
      this.recCv.style.top = "0px";
      this.recCv.style.width = "2px";
      this.recCv.style.height = "2px";
      this.recCv.style.pointerEvents = "none";
      this.recCv.style.opacity = "0.01";
      this.recCv.style.zIndex = "-100";
      document.body.appendChild(this.recCv);
    }
    const spec = this.getResSpec();
    this.rw = this.recCv.width = (ratio === "9:16") ? spec.pw : spec.lw;
    this.rh = this.recCv.height = (ratio === "9:16") ? spec.ph : spec.lh;
    this.recCtx = this.recCv.getContext("2d");
    this.recCtx.imageSmoothingEnabled = true;
    this.recCtx.imageSmoothingQuality = "high";
    this.recCtx.fillStyle = "#0a1236";
    this.recCtx.fillRect(0, 0, this.rw, this.rh);
    this.cacheTemplate();
  },

  cacheTemplate() {
    if (!this.templateCv) {
      this.templateCv = document.createElement("canvas");
    }
    this.templateCv.width = this.rw;
    this.templateCv.height = this.rh;
    const tc = this.templateCv.getContext("2d");
    tc.imageSmoothingEnabled = true;
    tc.imageSmoothingQuality = "high";

    const rw = this.rw, rh = this.rh;

    if (ratio === "9:16") {
      const s = rw / 1080;
      const pad = Math.round(24 * s), gap = Math.round(16 * s);

      // Frame background
      tc.fillStyle = "#0a1236";
      tc.fillRect(0, 0, rw, rh);

      // Cast slots (Friends + VS + Enemies matching top HUD bar!)
      const friends = (G && (G.p1 || G.p2 || G.p3)) ? [G.p1, G.p2, G.p3].filter(Boolean) : (L && L.cast && L.cast.friends ? L.cast.friends.map(id => ({ id, name: CHAR_NAMES[id] || id })) : [{ id: "tom", name: "Tom" }]);
      const enemies = (G && G.bosses && G.bosses.length) ? G.bosses : (L && L.cast && L.cast.enemies ? L.cast.enemies.map(id => ({ id, name: CHAR_NAMES[id] || id })) : []);
      const totCast = friends.length + enemies.length;
      const hasVs = friends.length > 0 && enemies.length > 0;
      const vsW = hasVs ? Math.round((totCast >= 5 ? 40 : 54) * s) : 0;
      const castGap = Math.round((totCast >= 5 ? 10 : 14) * s);
      const castH = Math.round((totCast >= 5 ? 186 : 232) * s);
      const availW = rw - pad * 2 - vsW - (totCast - 1) * castGap - (hasVs ? castGap : 0);
      const maxSlotW = totCast === 1 ? Math.round(232 * s) : (totCast === 2 ? Math.round(201 * s) : Math.round(166 * s));
      const castW = Math.min(maxSlotW, Math.floor(availW / Math.max(1, totCast)));

      const slots = [];
      let curX = pad;
      friends.forEach((f, idx) => {
        slots.push({ kind: "fr", idx, id: f.id, x: curX, y: pad });
        curX += castW + castGap;
      });
      if (hasVs) {
        tc.font = `900 ${Math.round((totCast >= 5 ? 28 : 34) * s)}px "Lilita One", sans-serif`;
        tc.textAlign = "center";
        tc.textBaseline = "middle";
        tc.fillStyle = "#ffd23f";
        tc.fillText("VS", curX + vsW / 2, pad + castH / 2);
        curX += vsW + castGap;
      }
      enemies.forEach((en, idx) => {
        slots.push({ kind: "en", idx, id: en.id, x: curX, y: pad });
        curX += castW + castGap;
      });

      slots.forEach(sl => {
        const cx = sl.x, cy = sl.y;
        tc.fillStyle = sl.kind === "en" ? "#260812" : "#0c1844";
        tc.beginPath();
        if (tc.roundRect) tc.roundRect(cx, cy, castW, castH, Math.round(22 * s));
        else tc.rect(cx, cy, castW, castH);
        tc.fill();

        tc.lineWidth = Math.round(4 * s);
        tc.strokeStyle = sl.kind === "en" ? "#dc2626" : "#283e82";
        tc.stroke();
      });

      // Brand Strip (Full-width white board with channel name on left & star pill inside on right)
      const brandY = pad + castH + gap;
      const brandH = Math.round(57 * s);
      const brandW = rw - pad * 2;

      tc.fillStyle = "#ffffff";
      tc.beginPath();
      if (tc.roundRect) tc.roundRect(pad, brandY, brandW, brandH, Math.round(16 * s));
      else tc.rect(pad, brandY, brandW, brandH);
      tc.fill();

      tc.font = `900 ${Math.round(32 * s)}px "Lilita One", sans-serif`;
      const m1 = tc.measureText("GLOBAL GAMES ");
      const textPad = Math.round(24 * s);

      tc.textBaseline = "middle";
      tc.textAlign = "left";
      tc.fillStyle = "#000000";
      const textY = brandY + brandH / 2;
      tc.fillText("GLOBAL GAMES ", pad + textPad, textY);
      tc.fillStyle = "#e5243a";
      tc.fillText("SK", pad + textPad + m1.width, textY);

      // Star counter pill inside right end of white board
      const pillW = Math.round(brandW * 0.22);
      const pillH = Math.round(44 * s);
      const pillX = pad + brandW - pillW - Math.round(8 * s);
      const pillY = brandY + (brandH - pillH) / 2;

      tc.fillStyle = "rgba(8,18,56,0.9)";
      tc.strokeStyle = "#ffd23f";
      tc.lineWidth = Math.round(3 * s);
      tc.beginPath();
      if (tc.roundRect) tc.roundRect(pillX, pillY, pillW, pillH, Math.round(22 * s));
      else tc.rect(pillX, pillY, pillW, pillH);
      tc.fill(); tc.stroke();

      // Golden Stage Border
      const stageY = brandY + brandH + gap;
      const stageW = rw - pad * 2;
      const stageH = rh - stageY - pad;

      tc.strokeStyle = "#ffd23f";
      tc.lineWidth = Math.round(7 * s);
      tc.beginPath();
      if (tc.roundRect) tc.roundRect(pad, stageY, stageW, stageH, Math.round(28 * s));
      else tc.rect(pad, stageY, stageW, stageH);
      tc.stroke();

      // Outer White Border
      tc.strokeStyle = "#ffffff";
      tc.lineWidth = Math.round(8 * s);
      const strokePad = Math.round(4 * s);
      tc.strokeRect(strokePad, strokePad, rw - strokePad * 2, rh - strokePad * 2);

      this.layout = { s, pad, gap, castW, castH, slots, brandY, brandH, brandW, pillX, pillY, pillW, pillH, stageY, stageW, stageH };
    } else {
      // 16:9 Landscape Mode
      const s = rw / 1920;
      const pad = Math.round(20 * s), gap = Math.round(12 * s);

      tc.fillStyle = "#0a1236";
      tc.fillRect(0, 0, rw, rh);

      const friends = (G && (G.p1 || G.p2 || G.p3)) ? [G.p1, G.p2, G.p3].filter(Boolean) : (L && L.cast && L.cast.friends ? L.cast.friends.map(id => ({ id, name: CHAR_NAMES[id] || id })) : [{ id: "tom", name: "Tom" }]);
      const enemies = (G && G.bosses && G.bosses.length) ? G.bosses : (L && L.cast && L.cast.enemies ? L.cast.enemies.map(id => ({ id, name: CHAR_NAMES[id] || id })) : []);
      const totCast = friends.length + enemies.length;
      const hasVs = friends.length > 0 && enemies.length > 0;
      const castH = Math.round(142 * s);
      const castW = Math.round((totCast >= 5 ? 118 : 142) * s);
      const vsW = hasVs ? Math.round(42 * s) : 0;
      const slots = [];
      let curX = pad;
      friends.forEach((f, idx) => {
        slots.push({ kind: "fr", idx, id: f.id, x: curX, y: pad });
        curX += castW + gap;
      });
      if (hasVs) {
        tc.font = `900 ${Math.round(28 * s)}px "Lilita One", sans-serif`;
        tc.textAlign = "center"; tc.textBaseline = "middle"; tc.fillStyle = "#ffd23f";
        tc.fillText("VS", curX + vsW / 2, pad + castH / 2);
        curX += vsW + gap;
      }
      enemies.forEach((en, idx) => {
        slots.push({ kind: "en", idx, id: en.id, x: curX, y: pad });
        curX += castW + gap;
      });
      slots.forEach(sl => {
        const cx = sl.x, cy = sl.y;
        tc.fillStyle = sl.kind === "en" ? "#260812" : "#0c1844";
        tc.beginPath();
        if (tc.roundRect) tc.roundRect(cx, cy, castW, castH, Math.round(18 * s));
        else tc.rect(cx, cy, castW, castH);
        tc.fill();
        tc.lineWidth = Math.round(3 * s);
        tc.strokeStyle = sl.kind === "en" ? "#dc2626" : "#283e82";
        tc.stroke();
      });

      const castTotalW = curX - pad;
      const brandX = pad + castTotalW;
      const brandH = Math.round(54 * s);
      const brandY = pad + (castH - brandH) / 2;
      const brandW = rw - brandX - pad;

      tc.fillStyle = "#ffffff";
      tc.beginPath();
      if (tc.roundRect) tc.roundRect(brandX, brandY, brandW, brandH, Math.round(14 * s));
      else tc.rect(brandX, brandY, brandW, brandH);
      tc.fill();

      tc.font = `900 ${Math.round(30 * s)}px "Lilita One", sans-serif`;
      const m1 = tc.measureText("GLOBAL GAMES ");
      const textPad = Math.round(24 * s);

      tc.textBaseline = "middle";
      tc.textAlign = "left";
      tc.fillStyle = "#000000";
      const textY = brandY + brandH / 2;
      tc.fillText("GLOBAL GAMES ", brandX + textPad, textY);
      tc.fillStyle = "#e5243a";
      tc.fillText("SK", brandX + textPad + m1.width, textY);

      const pillW = Math.round(brandW * 0.20);
      const pillH = Math.round(42 * s);
      const pillX = brandX + brandW - pillW - Math.round(8 * s);
      const pillY = brandY + (brandH - pillH) / 2;

      tc.fillStyle = "rgba(8,18,56,0.9)";
      tc.strokeStyle = "#ffd23f";
      tc.lineWidth = Math.round(3 * s);
      tc.beginPath();
      if (tc.roundRect) tc.roundRect(pillX, pillY, pillW, pillH, Math.round(21 * s));
      else tc.rect(pillX, pillY, pillW, pillH);
      tc.fill(); tc.stroke();

      const stageY = pad + castH + gap;
      const stageW = rw - pad * 2;
      const stageH = rh - stageY - pad;

      tc.strokeStyle = "#ffd23f";
      tc.lineWidth = Math.round(7 * s);
      tc.beginPath();
      if (tc.roundRect) tc.roundRect(pad, stageY, stageW, stageH, Math.round(24 * s));
      else tc.rect(pad, stageY, stageW, stageH);
      tc.stroke();

      tc.strokeStyle = "#ffffff";
      tc.lineWidth = Math.round(8 * s);
      const strokePad = Math.round(4 * s);
      tc.strokeRect(strokePad, strokePad, rw - strokePad * 2, rh - strokePad * 2);

      this.layout = { s, pad, gap, castW, castH, slots, brandX, brandY, brandH, brandW, pillX, pillY, pillW, pillH, stageY, stageW, stageH };
    }
  },

  renderFrame() {
    if (!this.recCtx) return;
    if (!cw || !ch) {
      resize();
      if (G) draw();
    }
    if (!this.templateCv || !this.layout) this.cacheTemplate();

    const rc = this.recCtx;
    const L = this.layout;
    if (!L) return;
    const s = L.s;

    // 1. Stamp pre-rendered template (borders, brand strip, static frames)
    rc.drawImage(this.templateCv, 0, 0);

    // 2. Draw live game maze board
    if (cv && cv.width > 0 && cv.height > 0) {
      rc.save();
      rc.beginPath();
      if (rc.roundRect) rc.roundRect(L.pad, L.stageY, L.stageW, L.stageH, Math.round((ratio === "9:16" ? 28 : 24) * s));
      else rc.rect(L.pad, L.stageY, L.stageW, L.stageH);
      rc.clip();
      rc.drawImage(cv, L.pad, L.stageY, L.stageW, L.stageH);
      rc.restore();
    }

    // 3. Dynamic hero & villain cast overlays (Active yellow glow, Escaped check, Dead cross)
    const friends = G ? [G.p1, G.p2, G.p3].filter(Boolean) : [];
    const enemies = (G && G.bosses) ? G.bosses : [];
    (L.slots || []).forEach(sl => {
      const actor = sl.kind === "fr" ? friends[sl.idx] : enemies[sl.idx];
      if (!actor) return;
      const cx = sl.x, cy = sl.y;
      const isActive = (sl.kind === "fr" && G && G.active === sl.idx + 1);
      const isEscaped = (sl.kind === "fr" && actor.escaped);
      const isDead = (sl.kind === "en" && actor.dead) || (G && G.dead && G.dead.has(actor.id) && (sl.kind !== "fr" || !actor.deathFlyStart || actor.deathBadgeReady));
      const emo = sl.kind === "fr" ? getHeroEmotionName(actor) : (actor.dead ? "cry" : getBossEmotionName(actor));
      const liveImg = getCharImg(actor.id, emo);
      if (liveImg && liveImg.complete) {
        rc.save();
        rc.beginPath();
        const imgPad = Math.round((ratio === "9:16" ? 6 : 4) * s);
        if (rc.roundRect) rc.roundRect(cx + imgPad, cy + imgPad, L.castW - imgPad * 2, L.castH - imgPad * 2, Math.round((ratio === "9:16" ? 16 : 14) * s));
        else rc.rect(cx + imgPad, cy + imgPad, L.castW - imgPad * 2, L.castH - imgPad * 2);
        rc.clip();
        rc.drawImage(liveImg, cx + imgPad, cy + imgPad, L.castW - imgPad * 2, L.castH - imgPad * 2);
        rc.restore();
      }

      if (isActive || isEscaped) {
        rc.save();
        rc.lineWidth = isActive ? Math.round(6 * s) : Math.round(4 * s);
        rc.strokeStyle = isEscaped ? "#22c55e" : "#ffd23f";
        if (isActive) {
          rc.shadowColor = "rgba(255, 210, 63, 0.85)";
          rc.shadowBlur = Math.round(18 * s);
        }
        rc.beginPath();
        if (rc.roundRect) rc.roundRect(cx, cy, L.castW, L.castH, Math.round((ratio === "9:16" ? 22 : 18) * s));
        else rc.rect(cx, cy, L.castW, L.castH);
        rc.stroke();
        rc.restore();
      }

      if (isEscaped) {
        rc.fillStyle = "#22c55e";
        rc.font = `900 ${Math.round((ratio === "9:16" ? 64 : 48) * s)}px sans-serif`;
        rc.textAlign = "center";
        rc.textBaseline = "middle";
        rc.fillText("✔", cx + L.castW / 2, cy + L.castH / 2);
      } else if (isDead) {
        const pad = Math.round(L.castW * 0.14);
        const x1 = cx + pad, y1 = cy + pad;
        const x2 = cx + L.castW - pad, y2 = cy + L.castH - pad;
        rc.save();
        rc.lineCap = "round";
        rc.strokeStyle = "rgba(40, 4, 8, 0.92)";
        rc.lineWidth = Math.round((ratio === "9:16" ? 19 : 14) * s);
        rc.beginPath(); rc.moveTo(x1, y1); rc.lineTo(x2, y2); rc.moveTo(x2, y1); rc.lineTo(x1, y2); rc.stroke();
        rc.strokeStyle = "#ff1e38";
        rc.shadowColor = "rgba(255, 20, 45, 0.9)";
        rc.shadowBlur = Math.round(10 * s);
        rc.lineWidth = Math.round((ratio === "9:16" ? 11 : 8) * s);
        rc.beginPath(); rc.moveTo(x1, y1); rc.lineTo(x2, y2); rc.moveTo(x2, y1); rc.lineTo(x1, y2); rc.stroke();
        rc.restore();
      }
    });

    // 4. Dynamic star score
    const starTotal = (window.L && window.L.stars != null) ? window.L.stars : 10;
    rc.font = `900 ${Math.round((ratio === "9:16" ? 32 : 30) * s)}px "Lilita One", sans-serif`;
    rc.textAlign = "center";
    rc.textBaseline = "middle";
    rc.fillStyle = "#ffd23f";
    rc.fillText(`★ ${G ? G.score : 0} / ${starTotal}`, L.pillX + L.pillW / 2, L.pillY + L.pillH / 2);

    // 5. Render shrinking Exit-to-TopCast and Death-to-RedCross flying portraits across brand strip
    if (G && cw && ch) {
      getActiveCastFlights().forEach(f => {
        const dst = L.slots.find(sl => sl.kind === "fr" && sl.id === f.hero.id);
        if (!dst) return;
        const cvX = (f.src[0] - camX) * B + cw / 2;
        const cvY = (f.src[1] - camY) * B + ch / 2;
        const sx = L.pad + (cvX / cw) * L.stageW;
        const sy = L.stageY + (cvY / ch) * L.stageH;
        const sW = ((B * 1.95 * f.scaleMul) / cw) * L.stageW;
        const dx = dst.x + L.castW / 2;
        const dy = dst.y + L.castH / 2;
        const pose = computeCastFlyPose(sx, sy, sW, dx, dy, L.castW, f.startT, f.dur, s, f.endScale);
        const flyImg = getCharImg(f.hero.id, f.emo);
        rc.save();
        pose.trails.forEach((tr, ti) => {
          rc.fillStyle = ti === 0 ? f.trailA : f.trailB;
          rc.beginPath();
          rc.arc(tr.x, tr.y, tr.size * 0.34, 0, 7);
          rc.fill();
        });
        const hs = pose.size;
        const hx = pose.x - hs / 2, hy = pose.y - hs / 2, hr = Math.max(6, hs * 0.16);
        rc.shadowColor = f.glow;
        rc.shadowBlur = Math.round(20 * s);
        rc.fillStyle = f.bg;
        rrect(rc, hx, hy, hs, hs, hr); rc.fill();
        if (flyImg && flyImg.complete) {
          rc.save();
          rrect(rc, hx, hy, hs, hs, hr); rc.clip();
          const pad = hs * 0.05;
          rc.drawImage(flyImg, hx + pad, hy + pad, hs - pad * 2, hs - pad * 2);
          rc.restore();
        }
        rc.strokeStyle = f.border;
        rc.lineWidth = Math.max(2.5, hs * 0.055);
        rrect(rc, hx, hy, hs, hs, hr); rc.stroke();
        rc.restore();
      });
    }
  },

  start() {
    if (this.recording) return;
    try {
      if (G && cw) {
        draw();
      }
      this.prepareCanvas();
      this.renderFrame();

      // 1. Capture 60 FPS video stream directly from composite studio canvas
      const vStream = this.recCv.captureStream(60);

      // 2. Capture digital audio stream directly from Web Audio API
      let aTracks = [];
      try {
        if (GameAudio.getAudioContext && GameAudio.getAudioContext()) {
          const ac = GameAudio.getAudioContext();
          if (ac.state === "suspended") ac.resume();
        }
        const aStream = GameAudio.getMediaStream ? GameAudio.getMediaStream() : null;
        if (aStream) {
          aTracks = aStream.getAudioTracks();
        }
      } catch (e) {
        console.warn("Audio stream capture:", e);
      }

      const spec = this.getResSpec();

      // Codec negotiation: H.264 High Profile L5.2 (avc1.640034) for 4K, L5.1 (avc1.640033) for 2K, standard H.264/VP9 fallback
      const candidates = spec.mode === "4k"
        ? ["video/mp4;codecs=avc1.640034,mp4a.40.2", "video/mp4;codecs=avc1.640033,mp4a.40.2", "video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"]
        : spec.mode === "2k"
          ? ["video/mp4;codecs=avc1.640033,mp4a.40.2", "video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"]
          : ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"];
      const mime = candidates.find(m => MediaRecorder.isTypeSupported(m)) || "";

      this.isMp4 = mime.includes("mp4");

      const streamTracks = [...vStream.getVideoTracks()];
      if (aTracks.length > 0) streamTracks.push(...aTracks);
      const stream = new MediaStream(streamTracks);

      const videoBps = spec.videoBps;
      const opts = mime ? { mimeType: mime, videoBitsPerSecond: videoBps, audioBitsPerSecond: 192000 } : { videoBitsPerSecond: videoBps, audioBitsPerSecond: 192000 };
      this.recorder = new MediaRecorder(stream, opts);
      this.chunks = [];

      this.recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) this.chunks.push(e.data);
      };

      this.recorder.onerror = (ev) => {
        console.warn("MediaRecorder error:", ev && ev.error ? ev.error.message : ev);
      };

      this.recorder.onstop = () => {
        this.onStopComplete();
      };

      this.recorder.start(250);
      this.recording = true;
      this.startTime = Date.now();

      const btn = $("btn-record");
      if (btn) {
        btn.classList.add("recording");
        const lbl = btn.querySelector(".rec-label");
        if (lbl) lbl.textContent = "STOP";
        const timer = $("rec-timer");
        if (timer) {
          timer.hidden = false;
          timer.textContent = "00:00";
        }
      }

      clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
        const s = String(elapsed % 60).padStart(2, "0");
        const timer = $("rec-timer");
        if (timer) timer.textContent = `${m}:${s}`;
      }, 1000);

      toast(`🔴 Recording Started! (${this.getResSpec().fullLabel} 60FPS MP4 Studio)`);
    } catch (err) {
      console.error("Recording error:", err);
      toast("Recording error: " + err.message);
    }
  },

  stop() {
    if (!this.recording || !this.recorder) return;
    this.recording = false;
    clearInterval(this.timerInterval);
    const btn = $("btn-record");
    if (btn) {
      btn.classList.remove("recording");
      const lbl = btn.querySelector(".rec-label");
      if (lbl) lbl.textContent = `REC ${this.resMode.toUpperCase()}`;
      const timer = $("rec-timer");
      if (timer) timer.hidden = true;
    }
    if (this.recorder.state !== "inactive") {
      if (this.recorder.state === "recording") {
        try { this.recorder.requestData(); } catch {}
      }
      this.recorder.stop();
    }
  },

  async onStopComplete() {
    if (!this.chunks.length) return;
    const blobType = this.chunks[0]?.type || (this.isMp4 ? "video/mp4" : "video/webm");
    let rawBlob = new Blob(this.chunks, { type: blobType });

    if (this.isMp4) {
      try {
        const rawBuffer = await rawBlob.arrayBuffer();
        const progBuffer = remuxFMP4ToProgressive(rawBuffer, this.rw, this.rh);
        this.lastBlob = new Blob([progBuffer], { type: "video/mp4" });
      } catch (e) {
        console.warn("MP4 progressive remuxing fallback to duration patching:", e);
        try {
          const rawBuffer = await rawBlob.arrayBuffer();
          const elapsedMs = Math.max(1000, Date.now() - this.startTime);
          patchMp4Duration(rawBuffer, elapsedMs);
          this.lastBlob = new Blob([rawBuffer], { type: "video/mp4" });
        } catch (e2) {
          this.lastBlob = rawBlob;
        }
      }
    } else {
      this.lastBlob = rawBlob;
    }

    if (this.lastUrl) URL.revokeObjectURL(this.lastUrl);
    this.lastUrl = URL.createObjectURL(this.lastBlob);

    const modal = $("rec-modal");
    const video = $("rec-video-preview");
    const dlBtn = $("btn-rec-download");
    const specRes = $("spec-res");
    const specFmt = $("spec-fmt");
    const recBadge = $("rec-badge");

    const spec = this.getResSpec();
    const ext = this.isMp4 ? "mp4" : "webm";
    const fmtTag = this.isMp4 ? "MP4" : "WebM";
    if (video) video.src = this.lastUrl;
    if (recBadge) recBadge.textContent = `🎬 ${spec.badge} 60FPS ${fmtTag} VIDEO READY`;
    if (specRes) specRes.textContent = `${this.rw} × ${this.rh} (${ratio === "9:16" ? spec.portraitTag : spec.landscapeTag})`;
    if (specFmt) specFmt.textContent = this.isMp4 ? "MP4 (H.264 / AAC)" : "WebM (VP9 / Opus)";
    if (dlBtn) {
      dlBtn.href = this.lastUrl;
      const lvlNum = (L && L.num != null) ? L.num : (li + 1);
      dlBtn.download = `Tom_Cherry_Maze_Level_${lvlNum}_${this.rw}x${this.rh}_60fps.${ext}`;
      dlBtn.textContent = `⬇️ Download Clear ${spec.label} ${fmtTag} Video`;
    }
    if (modal) modal.hidden = false;
    toast(`✓ ${spec.label} 60FPS ${fmtTag} Video Ready!`);
  }
};

function loop(now) {
  const dt = Math.min(50, now - (last || now)); last = now;
  if (G && cw) { update(dt); cam(dt); draw(); }
  if (GameRecorder.recording) { GameRecorder.renderFrame(); }
  requestAnimationFrame(loop);
}

const KM = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
const km = e => KM[e.key.length > 1 ? e.key : e.key.toLowerCase()];

// Keyboard switching: '1' Tom, '2' Cherry, '3' Bulldog, '7' Pick/Carry Bomb, '8' Throw Bomb
addEventListener("keydown", e => {
  if (e.key === "1" && !G.dead.has("tom")) {
    G.active = 1;
    G.p1.lastMoveT = T;
    const [nx, ny] = pos(G.p1); camX = nx; camY = ny;
    ui(); return;
  }
  if (e.key === "2" && G.p2 && !G.dead.has("cherry")) {
    G.active = 2;
    G.p2.lastMoveT = T;
    const [nx, ny] = pos(G.p2); camX = nx; camY = ny;
    ui(); return;
  }
  if (e.key === "3" && G.p3 && !G.dead.has(G.p3.id)) {
    G.active = 3;
    G.p3.lastMoveT = T;
    const [nx, ny] = pos(G.p3); camX = nx; camY = ny;
    ui(); return;
  }
  if (e.key === "7" || e.code === "Digit7" || e.code === "Numpad7") {
    if (T < 3000) {
      toast("Opening Hook! Power-ups unlock at 3s!");
      return;
    }
    const h = G.p;
    if (h && !G.dead.has(h.id)) {
      const [px, py] = pos(h);
      const nearBomb = (G.bombs || []).find(b => !b.got && Math.hypot(b.x - px, b.y - py) < 1.85);
      if (nearBomb) {
        nearBomb.got = 1;
        h.bombs = (h.bombs || 0) + 1;
        h.holdingBomb = true;
        setHeroEmotion(h, "angry", 1.5, 4);
        playBombPickupSound();
        VFX.text(px, py, "💣 CARRYING!", T);
        toast(`${h.name} is carrying a Bomb! 💣 (Press 8 to Throw)`);
      } else if ((h.bombs || 0) > 0) {
        h.holdingBomb = !h.holdingBomb;
        toast(h.holdingBomb ? `${h.name} is carrying a Bomb! 💣 (Press 8 to Throw)` : "Bomb stashed.");
      } else {
        toast("No bomb nearby to pick up!");
      }
    }
    return;
  }
  if (e.key === "8" || e.code === "Digit8" || e.code === "Numpad8") {
    const h = G.p;
    if (h && !G.dead.has(h.id)) {
      if (!h.holdingBomb && (h.bombs || 0) === 0) {
        toast("No bomb ready! Stand near bomb and press 7 to pick up.");
        return;
      }
      throwHeroBomb(h);
    }
    return;
  }
  const m = km(e); if (!m) return;
  e.preventDefault(); if (!ctl.key.includes(m)) ctl.key.push(m);
  if (G && G.p && DIR[m]) G.p.look = [DIR[m][0], DIR[m][1]];
});
addEventListener("keyup", e => { const m = km(e); if (m) ctl.key = ctl.key.filter(k => k !== m); });
addEventListener("blur", () => { ctl.key = []; ctl.ptr = ctl.pad = null; });

let ox0 = 0, oy0 = 0, pid = null;
cv.addEventListener("pointerdown", e => { ox0 = e.clientX; oy0 = e.clientY; pid = e.pointerId; cv.setPointerCapture(pid); });
cv.addEventListener("pointermove", e => {
  if (e.pointerId !== pid) return;
  const dx = e.clientX - ox0, dy = e.clientY - oy0;
  ctl.ptr = Math.max(Math.abs(dx), Math.abs(dy)) < 14 ? null : Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
  if (G && G.p && ctl.ptr && DIR[ctl.ptr]) G.p.look = [DIR[ctl.ptr][0], DIR[ctl.ptr][1]];
});
const endP = e => { if (e.pointerId === pid) { pid = null; ctl.ptr = null; } };
cv.addEventListener("pointerup", endP); cv.addEventListener("pointercancel", endP);

[["u", "up"], ["l", "left"], ["d", "down"], ["r", "right"]].forEach(([i, d]) => {
  const b = $(i), up = () => { if (ctl.pad === d) ctl.pad = null; };
  b.addEventListener("pointerdown", e => {
    e.preventDefault();
    ctl.pad = d;
    if (G && G.p && DIR[d]) G.p.look = [DIR[d][0], DIR[d][1]];
    b.setPointerCapture(e.pointerId);
  });
  b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("lostpointercapture", up);
});

const run = (forceAuto) => {
  if (typeof forceAuto === "boolean") autoPlayMode = forceAuto;
  const levelAuto = Boolean((L && L.alwaysAuto) || autoPlayMode);
  if (G) { G.autoPlay = levelAuto; G.autoIdx = 0; G.autoWaitUntil = 0; }
  $("frame").classList.add("playing"); $("ov").hidden = true; state = "play";
  resize();
  if (G) {
    const [nx, ny] = pos(G.p);
    camX = nx; camY = ny;
    draw();
  }

  // Auto-start recording based on selected resolution option in creator dock
  const resSel = $("sel-rec-res");
  if (resSel) {
    GameRecorder.resMode = resSel.value;
    const recBtn = $("btn-record");
    if (recBtn && !GameRecorder.recording) {
      const lbl = recBtn.querySelector(".rec-label");
      if (lbl) lbl.textContent = `REC ${GameRecorder.resMode.toUpperCase()}`;
    }
  }

  if (GameRecorder.recording) {
    GameRecorder.stop();
  }

  setTimeout(() => {
    if (state === "play" && !GameRecorder.recording) {
      if (G) draw();
      GameRecorder.start();
    }
  }, 180);

  initTcSounds().then(() => {
    setTimeout(() => {
      if (state === "play") {
        if (isTcAudioV2()) tcPlay("powerup_boing", { vol: 0.8, fallback: "start" });
        else GameAudio.play("start");
      }
    }, 500);
  });
};

function syncAutoPlayUI() {
  const txt = autoPlayMode ? "🤖 Auto-Play Bot: ON (<50s Auto)" : "🤖 Auto-Play Bot: OFF (Manual Play)";
  ["btn-autoplay-opt", "ext-autoplay-btn"].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.classList.toggle("on", autoPlayMode);
    el.setAttribute("aria-pressed", String(autoPlayMode));
    if (id === "btn-autoplay-opt") el.textContent = txt;
    else el.textContent = autoPlayMode ? "🤖 Auto: ON" : "🤖 Auto: OFF";
  });
}

["btn-autoplay-opt", "ext-autoplay-btn"].forEach(id => {
  const el = $(id);
  if (el) {
    el.addEventListener("click", () => {
      autoPlayMode = !autoPlayMode;
      if (G && state === "play") G.autoPlay = autoPlayMode;
      syncAutoPlayUI();
      toast(autoPlayMode ? "Auto-Play Enabled!" : "Manual Control Enabled!");
    });
  }
});

// Menu navigation: Ratio -> Level Select -> Game
$("btn-to-levels").addEventListener("click", () => { showMenu("levels"); });
$("btn-back-ratio").addEventListener("click", () => { showMenu("ratio"); });

document.querySelectorAll(".lvl-btn, .lvl-card").forEach(el => {
  el.addEventListener("click", e => {
    e.stopPropagation();
    const btn = el.closest(".lvl-btn");
    const card = el.closest(".lvl-card") || el;
    const lvlIdx = parseInt(card.dataset.lvl || "0", 10);
    if (btn && btn.dataset.auto === "1") autoPlayMode = true;
    syncAutoPlayUI();
    loadLevel(lvlIdx);
    run(btn && btn.dataset.auto === "1" ? true : undefined);
  });
});

$("btn-retry").addEventListener("click", () => { newGame(); run(); });
$("btn-choose-level").addEventListener("click", () => { showMenu("levels"); });

$("rs").addEventListener("click", () => { newGame(); run(); });
$("sd").addEventListener("click", () => Snd.toggle());
$("mn").addEventListener("click", () => {
  state = "ready";
  Snd.music(false);
  if (GameRecorder.recording) GameRecorder.stop();
  showMenu("levels");
});

document.querySelectorAll('input[name="ra"]').forEach(r => r.addEventListener("change", () => { ratio = r.value; resize(); }));
document.addEventListener("visibilitychange", () => { last = 0; });

const qParams = new URLSearchParams(location.search);
if (qParams.has("ra")) { ratio = qParams.get("ra"); }
const radioInput = document.querySelector('input[value="' + ratio + '"]');
if (radioInput) radioInput.checked = true;
const initLvl = parseInt(qParams.get("lvl") || "0", 10);
loadLevel(initLvl);
sdIcon();
GameRecorder.init();
if (qParams.has("levels")) showMenu("levels");
else showMenu("ratio");

if (qParams.has("play")) run();
addEventListener("resize", () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); });
if (document.fonts) document.fonts.load('20px "Lilita One"');
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("button");
  if (b && b.id !== "sd") GameAudio.play("click", { vol: .6 });
}, true);

requestAnimationFrame(loop);
