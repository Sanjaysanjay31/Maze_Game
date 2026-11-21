"use strict";
const LV = window.LEVELS, A = window.ASSETS, M = 3, SS = 14, SPEED = 6.2, MAXHP = 5;
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
const spider = IM.spiderman; if ($("face")) $("face").src = A.spiderman;
let cw, ch, B, floorT, wallT, sawS, cloudS, shadow, G, camX = 0, camY = 0, shake = 0, T = 0, last = 0, state = "ready", ratio = innerWidth > innerHeight ? "16:9" : "9:16", mini, hudB = 0;

const Snd = {
  sfx: k => {
    if (k === "hit") GameAudio.play("hit", { rand: .06 });
    else if (k === "heal") GameAudio.play("heal", { rand: .03 });
    else if (k === "shield") GameAudio.play("shield");
    else if (k === "win") { GameAudio.duck(2); GameAudio.play("win"); }
    else if (k === "lose") GameAudio.play("lose");
  },
  music: p => { if (p) GameAudio.begin().then(() => { if (state === "play") GameAudio.musicStart(); }); else GameAudio.musicStop(); },
  unlock: () => GameAudio.begin(),
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
  for (let k = 0; k < 3; k++) blur(a, w, h, Math.round(SS * .5));
  for (let i = 0; i < a.length; i++) d.data[i * 4 + 3] = Math.min(235, a[i] * 1.7); g.putImageData(d, 0, 0); return c;
}

function buildTiles() {
  floorT = [...Array(8)].map((_, v) => {
    const c = mk(B, B), g = c.getContext("2d"), q = n => rnd(v * 17 + n);
    const gr = g.createRadialGradient(B / 2, B / 2, B * .1, B / 2, B / 2, B * .72);
    gr.addColorStop(0, "#ffc744"); gr.addColorStop(1, "#f29d18"); g.fillStyle = gr; g.fillRect(0, 0, B, B);
    g.strokeStyle = "rgba(180,95,0,.14)"; g.lineWidth = Math.max(1, B * .02); g.strokeRect(0, 0, B, B);
    g.fillStyle = "rgba(150,75,0,.08)"; for (let i = 0; i < 4; i++) g.fillRect(q(i) * B, 0, B * (.015 + q(i + 9) * .02), B);
    g.fillStyle = "rgba(120,55,0,.25)"; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(q(i + 20) * B, q(i + 30) * B, B * .016, B * .01, 0, 0, 7); g.fill(); }
    if (v % 3 === 0) {
      const bx = B * (.28 + q(40) * .4), by = B * (.62 + q(41) * .3);
      for (let i = 0; i < 7; i++) {
        const dx = (i - 3) * B * .035, h = B * (.18 + q(i + 50) * .12), ln = (i - 3) * B * .025;
        g.fillStyle = ["#7be834", "#34c828", "#9eef52"][i % 3]; g.strokeStyle = "rgba(10,65,0,.45)"; g.lineWidth = Math.max(1, B * .012);
        g.beginPath(); g.moveTo(bx + dx - B * .03, by); g.lineTo(bx + dx + ln, by - h); g.lineTo(bx + dx + B * .03, by); g.closePath(); g.fill(); g.stroke();
      }
    }
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
    if (g.createConicGradient) { gr = g.createConicGradient(0, m, m); for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, i % 2 ? "#838c9c" : "#dde3ee"); }
    else { gr = g.createRadialGradient(m, m, 0, m, m, m); gr.addColorStop(0, "#e6ebf3"); gr.addColorStop(1, "#727b8c"); }
    g.fillStyle = gr; g.strokeStyle = "#262c38"; g.lineWidth = D * .013; g.beginPath();
    for (let i = 0; i < 48; i++) { const a = i * Math.PI / 24, r = i % 2 ? D * .4 : D * .485; g.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r); }
    g.closePath(); g.fill(); g.stroke(); g.strokeStyle = "rgba(35,40,55,.55)"; g.lineWidth = D * .02; g.beginPath(); g.arc(m, m, D * .3, 0, 7); g.stroke();
    g.fillStyle = "rgba(30,35,48,.78)"; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.arc(m + Math.cos(a) * D * .22, m + Math.sin(a) * D * .22, D * .055, 0, 7); g.fill(); }
    g.fillStyle = "#d3243a"; g.beginPath(); g.arc(m, m, D * .1, 0, 7); g.fill(); g.fillStyle = "#fff"; g.fillRect(m - D * .013, m - D * .1, D * .026, D * .1); return c;
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
  if (ratio === "9:16") {
    const availW = Math.min(innerWidth * .96, innerHeight * .96 * r);
    w = Math.max(495, Math.round(availW / 9) * 9);
    h = Math.round(w * 16 / 9);
  } else {
    const availH = Math.min(innerHeight * .96, (innerWidth * .96) / r);
    h = Math.max(495, Math.round(availH / 9) * 9);
    w = Math.round(h * 16 / 9);
  }
  const f = $("frame"); f.style.width = w + "px"; f.style.height = h + "px";
  f.style.setProperty("--u", clamp(Math.min(w / 495, h / 880), .8, 1.8));
  const s = $("stage");
  // HIGH-RESOLUTION RENDER TARGET: at least 1080px wide for crystal-clear recording clarity
  const minW = ratio === "9:16" ? 1080 : 1920;
  const dpr = Math.max(window.devicePixelRatio || 1, minW / s.clientWidth, 2.25);
  cw = cv.width = Math.round(s.clientWidth * dpr);
  ch = cv.height = Math.round(s.clientHeight * dpr);
  B = Math.round(clamp(Math.min(cw / 8.4, ch / (r > 1 ? 8 : 10.5)), 80, 260));
  buildTiles(); buildMini();
}

function buildMini() {
  mini = mk(W * 3, H * 3); const g = mini.getContext("2d"); g.fillStyle = "#f2b13a"; g.fillRect(0, 0, W * 3, H * 3); g.fillStyle = "#17307f";
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (WALL[y][x]) g.fillRect(x * 3, y * 3, 3, 3);
  hudB = 0;
}

function buildCast() {
  const c = $("cast"), fr = L.cast.friends.slice(0, 6), en = L.cast.enemies.slice(0, 6 - fr.length), tot = fr.length + en.length; c.innerHTML = "";
  const add = (n, k) => {
    const d = document.createElement("div"); d.className = "ct " + k + (tot === 1 ? " solo" : ""); d.dataset.n = n;
    const i = new Image(); i.src = A[n] || ""; i.alt = n; d.appendChild(i);
    // Clicking hero avatar switches active character!
    d.addEventListener("click", () => {
      if (n === "spiderman" && !G.dead.has("spiderman")) {
        G.active = 1;
        const [nx, ny] = pos(G.p1); camX = nx; camY = ny;
        ui();
      } else if (n === "gwen" && G.p2 && !G.dead.has("gwen")) {
        G.active = 2;
        const [nx, ny] = pos(G.p2); camX = nx; camY = ny;
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
  (G.switches || []).forEach(sw => { dot(sw.x, sw.y, r * 1.2, sw.active ? "#ff1744" : "#00e676", "#fff"); });
  dot(cen(...L.exit)[0], cen(...L.exit)[1], r * 1.6, "#2bd9a4", "#fff");
  const [px, py] = pos(G.p); dot(px, py, r * 1.5, "#ffd23f", "#0a1536");
  if (G.p2) { const [gx, gy] = pos(G.p2); dot(gx, gy, r * 1.4, "#ff4081", "#ffffff"); }
  ctx.restore();
}

const star = (g, x, y, r) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); };
const cen = (i, j) => [3 * i + 2, 3 * j + 2];

function newGame() {
  const [si, sj] = L.start;
  const p1 = { i: si, j: sj, bi: si, bj: sj, t: 0, last: [si, sj], hp: MAXHP, id: "spiderman", name: "Spider-Man", shield: 0, sh1: 0, bombs: 0, holdingBomb: false, inv: 0, blk: -1e9, look: null, pp: null, dt: 0 };
  let p2 = null;
  if (L.start2) {
    const [s2i, s2j] = L.start2;
    p2 = { i: s2i, j: s2j, bi: s2i, bj: s2j, t: 0, last: [s2i, s2j], hp: MAXHP, id: "gwen", name: "Ghost Spider", shield: 0, sh1: 0, bombs: 0, holdingBomb: false, inv: 0, blk: -1e9, look: null, pp: null, dt: 0 };
  }
  G = {
    dead: new Set(),
    p1,
    p2,
    active: 1, // 1: Spider-Man, 2: Ghost Spider
    get p() { return (this.active === 2 && this.p2) ? this.p2 : this.p1; },
    score: 0,
    t: 0,
    switches: (L.switches || []).map(s => ({ ...s, active: false })),
    gates: (L.gates || []).map(g => ({ ...g, open: false })),
    coins: L.coins.map((c, k) => ({ x: c[0], y: c[1], got: 0, ph: k })),
    bombs: (L.bombs || []).map(b => ({ x: b[0], y: b[1], got: 0, prompted: false })),
    projectiles: [],
    bub: L.bubbles.map(b => ({ x: b[0], y: b[1], got: 0 })),
    shields: L.shields.map(b => ({ x: b[0], y: b[1], got: 0 })),
    saws: (L.saws || []).map(s => ({ data: s, destroyed: false })),
    wsaws: (L.wsaws || []).map(w => ({ data: w, destroyed: false })),
    lasers: (L.lasers || []).map(l => ({ data: l, disabled: false, destroyed: false }))
  };
  // Re-lock gates
  G.gates.forEach(g => {
    if (!g.open) {
      g.blocks.forEach(([gx, gy]) => { if (WALL[gy]) WALL[gy][gx] = 1; });
    }
  });
  T = 0; VFX.clear(); GameAudio.stopLoops();
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
    const isDead = G.dead.has(e.dataset.n);
    const heroObj = e.dataset.n === "spiderman" ? G.p1 : G.p2;
    const isEscaped = !!(heroObj && heroObj.escaped && !isDead);
    e.classList.toggle("dead", isDead);
    e.classList.toggle("escaped", isEscaped);
    const isHero1 = e.dataset.n === "spiderman" && G.active === 1;
    const isHero2 = e.dataset.n === "gwen" && G.active === 2;
    e.classList.toggle("active-hero", (isHero1 || isHero2) && !isDead && !isEscaped);
  });
}

function fx(type, x, y) { VFX.add(type, x, y, T); }

function showMenu(mode) {
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
  toast("MISSION FAILED!");
}

function checkCoopDefeat() {
  if (!G.p2) return false;
  const living = [G.p1, G.p2].filter(p => p && !G.dead.has(p.id));
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
      h.blk = T; GameAudio.play("shield_block", { min: .2, rand: .08 });
      const q = pos(h); VFX.add("ring", q[0], q[1], T, { c: "#7fd0ff" });
    }
    return;
  }
  if (T < h.inv) return;
  h.hp--; h.inv = T + 600; shake = 1; Snd.sfx("hit"); VFX.flash("255,40,60", T); GameAudio.duck(1.3);
  fx("cloud", ...pos(h)); if (navigator.vibrate) navigator.vibrate(70);
  h.i = h.last[0]; h.j = h.last[1]; h.bi = h.i; h.bj = h.j; h.t = 0;
  if (h.hp <= 0) {
    G.dead.add(h.id);
    toast(`${h.name} is down!`);
    fx("cloud", ...pos(h));
    if (checkCoopDefeat()) { ui(); return; }
    const living = [G.p1, G.p2].filter(p => p && !G.dead.has(p.id));
    if (living.length === 0) {
      triggerDefeat("ALL HEROES OUT OF HEALTH!");
      ui(); return;
    }
    if (G.p.id === h.id) {
      G.active = living[0].id === "spiderman" ? 1 : 2;
      toast(`Switched to ${living[0].name}!`);
      const [nx, ny] = pos(G.p); camX = nx; camY = ny;
    }
    ui(); return;
  }
  toast(msg);
}

function throwHeroBomb(h) {
  const [px, py] = pos(h);
  const lk = h.look || [0, 1];
  let targetX = px + lk[0] * 2.2;
  let targetY = py + lk[1] * 2.2;
  let targetType = "ground", targetObj = null;

  // Gather all potential hazard & gate targets within reach (up to 4.5 blocks)
  const candidates = [];

  // Saws
  (G.saws || []).forEach((sObj, k) => {
    if (sObj.destroyed) return;
    const [sx, sy] = sawAt(sObj.data, k);
    const d = Math.hypot(sx - px, sy - py);
    if (d <= 4.5) {
      const dot = (sx - px) * lk[0] + (sy - py) * lk[1];
      candidates.push({ type: "saw", obj: sObj, x: sx, y: sy, dist: d, dot });
    }
  });

  // Wall Saws
  (G.wsaws || []).forEach(wObj => {
    if (wObj.destroyed) return;
    const [wx, wy] = wsPos(wObj.data);
    const d = Math.hypot(wx - px, wy - py);
    if (d <= 4.5) {
      const dot = (wx - px) * lk[0] + (wy - py) * lk[1];
      candidates.push({ type: "wsaw", obj: wObj, x: wx, y: wy, dist: d, dot });
    }
  });

  // Lasers
  (G.lasers || []).forEach(lObj => {
    if (lObj.destroyed || lObj.disabled) return;
    const [lx, ly] = lObj.data;
    const d = Math.hypot(lx - px, ly - py);
    if (d <= 4.5) {
      const dot = (lx - px) * lk[0] + (ly - py) * lk[1];
      candidates.push({ type: "laser", obj: lObj, x: lx, y: ly, dist: d, dot });
    }
  });

  // Locked Gates
  (G.gates || []).forEach(gate => {
    if (gate.open) return;
    for (const [gx, gy] of gate.blocks) {
      const cx = gx + 0.5, cy = gy + 0.5;
      const d = Math.hypot(cx - px, cy - py);
      if (d <= 4.5) {
        const dot = (cx - px) * lk[0] + (cy - py) * lk[1];
        candidates.push({ type: "gate", obj: gate, x: cx, y: cy, dist: d, dot });
      }
    }
  });

  // Pick candidate: prefer ones in front of the hero (dot > 0.1), sorted by distance
  const inFront = candidates.filter(c => c.dot > 0.1);
  const list = inFront.length ? inFront : candidates;
  list.sort((a, b) => a.dist - b.dist);

  if (list.length > 0) {
    const best = list[0];
    targetX = best.x;
    targetY = best.y;
    targetType = best.type;
    targetObj = best.obj;
  }

  h.bombs = Math.max(0, (h.bombs || 0) - 1);
  h.holdingBomb = false;

  G.projectiles = G.projectiles || [];
  G.projectiles.push({
    sx: px, sy: py,
    tx: targetX, ty: targetY,
    t0: T, dur: 320,
    targetType, targetObj
  });

  GameAudio.play("coin", { vol: 1.2, rand: .1 });
  toast(`${h.name} threw a Bomb! 💣💥`);
}

const ctl = {
  key: [], ptr: null, pad: null,
  currDir: null,
  pressT: 0,
  stepMoved: 0,
  isHeld: false
};

function held() { return ctl.pad || ctl.ptr || ctl.key[ctl.key.length - 1] || null; }

function update(dt) {
  if (state !== "play") return;
  T += dt; G.t += dt;
  const p = G.p;
  const curInput = held();
  const v = DIR[curInput];

  if (!curInput) {
    ctl.currDir = null;
    ctl.stepMoved = 0;
    ctl.isHeld = false;
  } else {
    if (ctl.currDir !== curInput) {
      ctl.currDir = curInput;
      ctl.pressT = T;
      ctl.stepMoved = 0;
      ctl.isHeld = false;
    } else if (!ctl.isHeld && (T - ctl.pressT) >= 200) {
      ctl.isHeld = true;
    }
  }

  if (v && !G.dead.has(p.id)) {
    let rem = SPEED * dt / 3000;
    if (!ctl.isHeld) {
      const allowed = Math.max(0, 0.25 - ctl.stepMoved);
      rem = Math.min(rem, allowed);
    }
    let distThisFrame = 0, g = 0;
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
      const step = d * rem;
      p.t += step;
      p.look = d > 0 ? eu : [-eu[0], -eu[1]];
      distThisFrame += Math.abs(step);

      if (p.t >= 1) { rem = p.t - 1; p.last = [p.i, p.j]; p.i = p.bi; p.j = p.bj; p.t = 0; }
      else if (p.t <= 0) { rem = -p.t; p.t = 0; p.bi = p.i; p.bj = p.j; }
      else rem = 0;
    }
    ctl.stepMoved += distThisFrame;
  }

  // Update thrown bomb projectiles (3D flying arc to target)
  if (G.projectiles && G.projectiles.length) {
    G.projectiles = G.projectiles.filter(pj => {
      const elapsed = T - pj.t0;
      if (elapsed >= pj.dur) {
        // DETONATE WITH INTENSE FIREBLAST (NO CONFETTI / NO CELEBRATION HERE!)
        const x = pj.tx, y = pj.ty;
        VFX.fireblast(x, y, T);
        shake = 1.8;
        GameAudio.play("lose", { vol: 1.4 });
        GameAudio.play("hit", { vol: 1.4 });

        // FULL AREA OF EFFECT (AOE) OBLITERATION (R <= 3.5 blocks)
        const blastRadius = 3.5;
        let destroyedCount = 0;

        // 1. Saws
        (G.saws || []).forEach((sObj, k) => {
          if (sObj.destroyed) return;
          const [sx, sy] = sawAt(sObj.data, k);
          if (Math.hypot(sx - x, sy - y) <= blastRadius) {
            sObj.destroyed = true;
            destroyedCount++;
            fx("spark", sx, sy);
          }
        });

        // 2. Wall Saws
        (G.wsaws || []).forEach(wObj => {
          if (wObj.destroyed) return;
          const [wx, wy] = wsPos(wObj.data);
          if (Math.hypot(wx - x, wy - y) <= blastRadius) {
            wObj.destroyed = true;
            destroyedCount++;
            fx("spark", wx, wy);
          }
        });

        // 3. Lasers
        (G.lasers || []).forEach(lObj => {
          if (lObj.destroyed) return;
          const [lx, ly] = lObj.data;
          if (Math.hypot(lx - x, ly - y) <= blastRadius) {
            lObj.destroyed = true;
            lObj.disabled = true;
            destroyedCount++;
            fx("spark", lx, ly);
          }
        });

        // 4. Gates
        (G.gates || []).forEach(gate => {
          if (gate.open) return;
          let hitGate = false;
          for (const [gx, gy] of gate.blocks) {
            if (Math.hypot(gx + 0.5 - x, gy + 0.5 - y) <= blastRadius) {
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

        // 5. Explicit target fallback
        if (pj.targetObj) {
          if (pj.targetType === "gate" && !pj.targetObj.open) {
            pj.targetObj.open = true;
            for (const [gx, gy] of pj.targetObj.blocks) {
              if (WALL[gy]) WALL[gy][gx] = 0;
              fx("cloud", gx, gy);
            }
            shadow = buildShadow();
          } else if (pj.targetType === "laser") {
            pj.targetObj.destroyed = true;
            pj.targetObj.disabled = true;
          } else {
            pj.targetObj.destroyed = true;
          }
        }

        toast(destroyedCount > 0 ? "Hazards Obliterated by Bomb! 💥" : "Bomb Detonated! 💥");
        return false;
      }
      return true;
    });
  }

  const heroes = [G.p1, G.p2].filter(Boolean);
  for (const h of heroes) {
    if (G.dead.has(h.id)) continue;
    const [px, py] = pos(h);
    // Collectible Bombs (💣 on Floor)
    for (const b of (G.bombs || [])) {
      if (!b.got && Math.hypot(b.x - px, b.y - py) < 1.7) {
        if (!b.prompted && h === G.p && !h.holdingBomb) {
          b.prompted = true;
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
          GameAudio.play("lose", { vol: 1.4 });
          GameAudio.play("hit", { vol: 1.4 });
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
          GameAudio.play("lose", { vol: 1.4 });
          GameAudio.play("hit", { vol: 1.4 });
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
          GameAudio.play("lose", { vol: 1.4 });
          GameAudio.play("hit", { vol: 1.4 });
          toast("Laser Generator Destroyed! 💥");
        } else {
          hitHero(h, "Laser zap!");
        }
      }
    });

    // Star Coins
    for (const c of G.coins) {
      if (!c.got && Math.hypot(c.x - px, c.y - py) < 1.4) {
        c.got = 1; G.score = G.coins.filter(k => k.got).length; GameAudio.coin();
        fx("spark", c.x, c.y); VFX.text(c.x, c.y, "+1" + (GameAudio.combo > 1 ? " x" + GameAudio.combo : ""), T);
      }
    }
    // Health Bubbles
    for (const b of G.bub) {
      if (!b.got && Math.hypot(b.x - px, b.y - py) < 1.4) {
        b.got = 1; fx("spark", b.x, b.y); Snd.sfx("heal"); GameAudio.duck(.65);
        VFX.add("plus", b.x, b.y, T); if (h.hp < MAXHP) { h.hp++; toast("Health +1"); } else { toast("Full Health!"); }
      }
    }
    // Shields
    for (const s of G.shields) {
      if (!s.got && Math.hypot(s.x - px, s.y - py) < 1.4) {
        s.got = 1; fx("spark", s.x, s.y); Snd.sfx("shield"); GameAudio.duck(.65);
        VFX.add("ring", s.x, s.y, T, { c: "#7fd0ff" }); h.shield = T + 8000; h.sh1 = 1; toast("Shield on for 8 seconds");
      }
    }

    // Wall Switches
    for (const sw of (G.switches || [])) {
      if (!sw.active && Math.hypot(sw.x - px, sw.y - py) < 1.35) {
        sw.active = true; GameAudio.play("click", { vol: 1.3, rand: .05 });
        fx("spark", sw.x, sw.y); VFX.add("ring", sw.x, sw.y, T, { c: sw.color || "#00e676" });
        toast(sw.msg || "Secret Gate Unlocked!"); shake = 0.85;
        // Trigger linked targets
        for (const tid of sw.targets) {
          const gate = (G.gates || []).find(g => g.id === tid);
          if (gate && !gate.open) {
            gate.open = true;
            for (const [gx, gy] of gate.blocks) {
              if (WALL[gy]) WALL[gy][gx] = 0;
              fx("cloud", gx, gy); fx("spark", gx, gy);
            }
            shadow = buildShadow();
          }
          const laserObj = (G.lasers || []).find(l => l.data[3] === tid || l.data.id === tid);
          if (laserObj) { laserObj.disabled = true; }
        }
      }
    }

    // Exit reach for individual living heroes
    if (h.i === L.exit[0] && h.j === L.exit[1] && h.t === 0) {
      if (!h.escaped) {
        h.escaped = true;
        const card = document.querySelector(`.ct[data-n="${h.id}"]`);
        if (card) card.classList.add("escaped");
        const living = [G.p1, G.p2].filter(p => p && !G.dead.has(p.id));
        if (living.length > 1 && !living.every(p => p.escaped)) {
          toast(`${h.name} reached Exit!`);
        }
      }
    }

    // Dust particles when moving
    const mv = !!h.pp && Math.hypot(px - h.pp[0], py - h.pp[1]) > 1e-3; h.pp = [px, py];
    if (mv && T > (h.dt || 0)) { h.dt = T + 130; const lk = h.look || [0, 0]; VFX.add("dust", px - lk[0] * .9, py - lk[1] * .9, T); }
  }

  // ALL LIVING HEROES MUST REACH EXIT TO WIN!
  const living = [G.p1, G.p2].filter(p => p && !G.dead.has(p.id));
  const allEscaped = living.length > 0 && living.every(h => h.escaped);
  if (allEscaped && state !== "won") {
    state = "won";
    Snd.music(false);
    Snd.sfx("win");
    toast("★ ALL HEROES ESCAPED! VICTORY! ★");
    const [p1x, p1y] = pos(G.p1);
    VFX.cracker(p1x, p1y, T); VFX.confetti(p1x, p1y, T);
    if (G.p2) { const [p2x, p2y] = pos(G.p2); VFX.cracker(p2x, p2y, T); VFX.confetti(p2x, p2y, T); }
    VFX.add("ring", cen(...L.exit)[0], cen(...L.exit)[1], T, { c: "#22c55e" });
    // NO POPUP MODAL! Screen stays 100% clean for seamless video recording!
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
  const [x, y] = pos(G.p), k = 1 - Math.pow(.002, dt / 1000), hw = cw / B / 2, hh = ch / B / 2, lk = G.p.look && held() ? G.p.look : [0, 0];
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
    if (ex > sx && ey > sy) ctx.drawImage(shadow, sx, sy, ex - sx, ey - sy, X(sx / SS - M), Y(sy / SS - M), (ex - sx) / SS * B, (ey - sy) / SS * B);
  }
  ctx.lineCap = "round";

  // Lasers
  (G.lasers || []).forEach((lObj, k) => {
    if (lObj.destroyed || lObj.disabled) return;
    const l = lObj.data;
    const on = lOn(k), w = lWarn(k); if (!on && !(w && Math.floor(T / 60) % 2)) return;
    const hz = l[2] === "h", col = hz ? "#ff163c" : "#2f8cff", glow = hz ? "#ff4872" : "#6ec3ff";
    const span = 1.05;
    const a = hz ? [X(l[0] - span), Y(l[1])] : [X(l[0]), Y(l[1] - span)];
    const b = hz ? [X(l[0] + span), Y(l[1])] : [X(l[0]), Y(l[1] + span)];
    ctx.save(); ctx.lineCap = "round"; const pl = on ? (1 + .18 * Math.sin(T / 45 + k)) : .4;
    ctx.shadowColor = on ? col : "rgba(255,100,100,.35)"; ctx.shadowBlur = on ? B * .85 * pl : B * .2;
    ctx.strokeStyle = on ? col : "rgba(255,220,220,.3)"; ctx.lineWidth = on ? B * .25 * pl : B * .05; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
    if (on) {
      ctx.shadowBlur = B * .35; ctx.strokeStyle = glow; ctx.lineWidth = B * .12; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = "#fff"; ctx.lineWidth = B * .055; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
      [a, b].forEach(([ex, ey]) => { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, ey, B * .075, 0, 7); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ex, ey, B * .04, 0, 7); ctx.fill(); });
    }
    ctx.restore();
  });

  // Saws
  (G.saws || []).forEach((sObj, k) => {
    if (sObj.destroyed) return;
    const s = sObj.data;
    const [x, y] = sawAt(s, k), px = X(x), py = Y(y), D = sawS.width; ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(px + B * .1, py + B * .18, B * 1.15, B * 1.05, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(px, py); ctx.rotate(T / 650); ctx.drawImage(sawS, -D / 2, -D / 2); ctx.restore();
  });
  (G.wsaws || []).forEach((wObj, k) => {
    if (wObj.destroyed) return;
    const w = wObj.data;
    const [x, y] = wsPos(w), D = sawS.width; ctx.save(); ctx.translate(X(x), Y(y)); ctx.rotate(T / 650 * (k % 2 ? -1 : 1)); ctx.drawImage(sawS, -D / 2, -D / 2); ctx.restore();
  });
  L.enemies.forEach((s, k) => { const [x, y] = sawAt(s, k + 9), S = B * 1.8; if (IM[s[4]]) ctx.drawImage(IM[s[4]], X(x) - S / 2, Y(y) - S / 2, S, S); });

  // Shields
  for (const s of G.shields) if (!s.got) {
    const r = B * .72; ctx.save(); ctx.translate(X(s.x), Y(s.y) + Math.sin(T / 280) * B * .07); ctx.shadowColor = "rgba(80,180,255,.9)"; ctx.shadowBlur = B * .4;
    ctx.beginPath(); ctx.moveTo(0, -r * .95); ctx.bezierCurveTo(r * .55, -r * .85, r * .85, -r * .8, r * .85, -r * .5); ctx.bezierCurveTo(r * .85, r * .3, r * .45, r * .7, 0, r * .98); ctx.bezierCurveTo(-r * .45, r * .7, -r * .85, r * .3, -r * .85, -r * .5); ctx.bezierCurveTo(-r * .85, -r * .8, -r * .55, -r * .85, 0, -r * .95); ctx.closePath();
    const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, "#7fd0ff"); g.addColorStop(1, "#1b62d6"); ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = "transparent"; ctx.strokeStyle = "#fff"; ctx.lineWidth = B * .07; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.moveTo(-r * .5, -r * .55); ctx.lineTo(-r * .1, -r * .55); ctx.lineTo(-r * .1, r * .35); ctx.lineTo(-r * .5, -r * .1); ctx.fill(); ctx.restore();
  }

  // Collectible Bombs (💣)
  for (const b of (G.bombs || [])) if (!b.got) {
    const px = X(b.x), py = Y(b.y) + Math.sin(T / 240) * B * .06, r = B * .36;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath();
    ctx.ellipse(px, Y(b.y) + B * .3, r * 1.05, r * .42, 0, 0, 7);
    ctx.fill();

    const bg = ctx.createRadialGradient(px - r * .32, py - r * .35, r * .08, px, py, r);
    bg.addColorStop(0, "#64748b");
    bg.addColorStop(0.35, "#334155");
    bg.addColorStop(1, "#0f172a");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, 7);
    ctx.fill();
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = B * .035;
    ctx.stroke();

    ctx.fillStyle = "#d97706";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = B * .02;
    ctx.fillRect(px - r * .22, py - r - r * .18, r * .44, r * .2);
    ctx.strokeRect(px - r * .22, py - r - r * .18, r * .44, r * .2);

    ctx.beginPath();
    ctx.moveTo(px, py - r - r * .18);
    ctx.quadraticCurveTo(px + r * .3, py - r - r * .5, px + r * .15, py - r - r * .72);
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = B * .045;
    ctx.stroke();

    const sparkR = B * (.08 + .04 * Math.sin(T / 40));
    const sparkG = ctx.createRadialGradient(px + r * .15, py - r - r * .72, 0, px + r * .15, py - r - r * .72, sparkR * 2.5);
    sparkG.addColorStop(0, "#ffffff");
    sparkG.addColorStop(0.3, "#fef08a");
    sparkG.addColorStop(0.7, "#f97316");
    sparkG.addColorStop(1, "rgba(239,68,68,0)");
    ctx.fillStyle = sparkG;
    ctx.beginPath();
    ctx.arc(px + r * .15, py - r - r * .72, sparkR * 2.5, 0, 7);
    ctx.fill();
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

  // Wall Switches (3D Trapezoidal Wall-Mounted Switch matching Reference Image)
  for (const sw of (G.switches || [])) {
    const cx = X(sw.x), cy = Y(sw.y);
    const side = sw.side || "right";
    const act = sw.active;
    ctx.save();

    // From reference image: metallic base plate on wall border + protruding 3D green trapezoid push button
    const plateW = B * .18, plateH = B * 1.05;
    const depth = act ? B * .1 : B * .45; // pushes in when pressed
    const hBase = B * .82, hFront = B * .52; // trapezoid tapers into corridor
    ctx.lineJoin = "miter";

    if (side === "right") {
      const edgeX = cx + B * .5;
      const px0 = edgeX - plateW, py0 = cy - plateH / 2;
      // Steel base plate
      ctx.fillStyle = "#334155"; ctx.strokeStyle = "#0f172a"; ctx.lineWidth = Math.max(2, B * .04);
      ctx.fillRect(px0, py0, plateW, plateH); ctx.strokeRect(px0, py0, plateW, plateH);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(px0 + plateW * .3, py0 + B * .1, B * .06, B * .06);
      ctx.fillRect(px0 + plateW * .3, py0 + plateH - B * .16, B * .06, B * .06);

      // Trapezoid extending LEFT into corridor
      const bX = px0, fX = bX - depth;
      const t1 = cy - hBase / 2, b1 = cy + hBase / 2;
      const t2 = cy - hFront / 2, b2 = cy + hFront / 2;

      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.moveTo(bX, b1); ctx.lineTo(fX, b2); ctx.lineTo(fX - B * .04, b2 + B * .08); ctx.lineTo(bX, b1 + B * .08); ctx.closePath(); ctx.fill();

      ctx.beginPath(); ctx.moveTo(bX, t1); ctx.lineTo(fX, t2); ctx.lineTo(fX, b2); ctx.lineTo(bX, b1); ctx.closePath();
      const g = ctx.createLinearGradient(fX, cy, bX, cy);
      if (!act) { g.addColorStop(0, "#00e676"); g.addColorStop(0.7, "#00c853"); g.addColorStop(1, "#009624"); }
      else { g.addColorStop(0, "#38bdf8"); g.addColorStop(1, "#0284c7"); }
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "#000000"; ctx.lineWidth = Math.max(2.5, B * .06); ctx.stroke();

      ctx.fillStyle = !act ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.75)";
      ctx.beginPath(); ctx.moveTo(bX, t1); ctx.lineTo(fX, t2); ctx.lineTo(fX + depth * .25, t2 + B * .06); ctx.lineTo(bX, t1 + B * .06); ctx.closePath(); ctx.fill();
    } else if (side === "left") {
      const edgeX = cx - B * .5;
      const px0 = edgeX, py0 = cy - plateH / 2;
      ctx.fillStyle = "#334155"; ctx.strokeStyle = "#0f172a"; ctx.lineWidth = Math.max(2, B * .04);
      ctx.fillRect(px0, py0, plateW, plateH); ctx.strokeRect(px0, py0, plateW, plateH);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(px0 + plateW * .3, py0 + B * .1, B * .06, B * .06);
      ctx.fillRect(px0 + plateW * .3, py0 + plateH - B * .16, B * .06, B * .06);

      const bX = px0 + plateW, fX = bX + depth;
      const t1 = cy - hBase / 2, b1 = cy + hBase / 2;
      const t2 = cy - hFront / 2, b2 = cy + hFront / 2;

      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.moveTo(bX, b1); ctx.lineTo(fX, b2); ctx.lineTo(fX + B * .04, b2 + B * .08); ctx.lineTo(bX, b1 + B * .08); ctx.closePath(); ctx.fill();

      ctx.beginPath(); ctx.moveTo(bX, t1); ctx.lineTo(fX, t2); ctx.lineTo(fX, b2); ctx.lineTo(bX, b1); ctx.closePath();
      const g = ctx.createLinearGradient(bX, cy, fX, cy);
      if (!act) { g.addColorStop(0, "#009624"); g.addColorStop(0.3, "#00c853"); g.addColorStop(1, "#00e676"); }
      else { g.addColorStop(0, "#0284c7"); g.addColorStop(1, "#38bdf8"); }
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "#000000"; ctx.lineWidth = Math.max(2.5, B * .06); ctx.stroke();

      ctx.fillStyle = !act ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.75)";
      ctx.beginPath(); ctx.moveTo(bX, t1); ctx.lineTo(fX, t2); ctx.lineTo(fX - depth * .25, t2 + B * .06); ctx.lineTo(bX, t1 + B * .06); ctx.closePath(); ctx.fill();
    } else if (side === "top") {
      const edgeY = cy - B * .5;
      const px0 = cx - plateH / 2, py0 = edgeY;
      ctx.fillStyle = "#334155"; ctx.strokeStyle = "#0f172a"; ctx.lineWidth = Math.max(2, B * .04);
      ctx.fillRect(px0, py0, plateH, plateW); ctx.strokeRect(px0, py0, plateH, plateW);

      const bY = py0 + plateW, fY = bY + depth;
      const l1 = cx - hBase / 2, r1 = cx + hBase / 2;
      const l2 = cx - hFront / 2, r2 = cx + hFront / 2;

      ctx.beginPath(); ctx.moveTo(l1, bY); ctx.lineTo(l2, fY); ctx.lineTo(r2, fY); ctx.lineTo(r1, bY); ctx.closePath();
      const g = ctx.createLinearGradient(cx, bY, cx, fY);
      if (!act) { g.addColorStop(0, "#009624"); g.addColorStop(1, "#00e676"); }
      else { g.addColorStop(0, "#0284c7"); g.addColorStop(1, "#38bdf8"); }
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "#000000"; ctx.lineWidth = Math.max(2.5, B * .06); ctx.stroke();
    } else {
      const edgeY = cy + B * .5;
      const px0 = cx - plateH / 2, py0 = edgeY - plateW;
      ctx.fillStyle = "#334155"; ctx.strokeStyle = "#0f172a"; ctx.lineWidth = Math.max(2, B * .04);
      ctx.fillRect(px0, py0, plateH, plateW); ctx.strokeRect(px0, py0, plateH, plateW);

      const bY = py0, fY = bY - depth;
      const l1 = cx - hBase / 2, r1 = cx + hBase / 2;
      const l2 = cx - hFront / 2, r2 = cx + hFront / 2;

      ctx.beginPath(); ctx.moveTo(l1, bY); ctx.lineTo(l2, fY); ctx.lineTo(r2, fY); ctx.lineTo(r1, bY); ctx.closePath();
      const g = ctx.createLinearGradient(cx, bY, cx, fY);
      if (!act) { g.addColorStop(0, "#009624"); g.addColorStop(1, "#00e676"); }
      else { g.addColorStop(0, "#0284c7"); g.addColorStop(1, "#38bdf8"); }
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "#000000"; ctx.lineWidth = Math.max(2.5, B * .06); ctx.stroke();
    }
    ctx.restore();
  }

  // Draw Flying Bomb Projectiles (3D parabolic arc)
  (G.projectiles || []).forEach(pj => {
    const p = Math.min(1, Math.max(0, (T - pj.t0) / pj.dur));
    const curX = pj.sx + (pj.tx - pj.sx) * p;
    const curY = pj.sy + (pj.ty - pj.sy) * p;
    const arcH = Math.sin(p * Math.PI) * B * 1.25;
    const px = X(curX), py = Y(curY) - arcH, r = B * .4;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0," + (0.35 * (1 - p * 0.3)) + ")";
    ctx.beginPath(); ctx.ellipse(X(curX), Y(curY), r * 0.9, r * 0.38, 0, 0, 7); ctx.fill();

    ctx.translate(px, py);
    ctx.rotate(p * Math.PI * 4);
    const bg = ctx.createRadialGradient(-r * .3, -r * .35, r * .08, 0, 0, r);
    bg.addColorStop(0, "#718096"); bg.addColorStop(0.35, "#2d3748"); bg.addColorStop(1, "#0d1117");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.strokeStyle = "#1a202c"; ctx.lineWidth = B * .035; ctx.stroke();

    ctx.fillStyle = "#d97706"; ctx.fillRect(-r * .2, -r - r * .18, r * .4, r * .2);
    ctx.beginPath(); ctx.moveTo(0, -r - r * .18); ctx.quadraticCurveTo(r * .25, -r - r * .5, r * .12, -r - r * .65);
    ctx.strokeStyle = "#fef08a"; ctx.lineWidth = B * .045; ctx.stroke();

    const sparkR = B * (.1 + .04 * Math.sin(T / 35));
    const sparkG = ctx.createRadialGradient(r * .12, -r - r * .65, 0, r * .12, -r - r * .65, sparkR * 2);
    sparkG.addColorStop(0, "#ffffff"); sparkG.addColorStop(0.4, "#fef08a"); sparkG.addColorStop(0.8, "#ff3b00"); sparkG.addColorStop(1, "rgba(255,59,0,0)");
    ctx.fillStyle = sparkG; ctx.beginPath(); ctx.arc(r * .12, -r - r * .65, sparkR * 2, 0, 7); ctx.fill();
    ctx.restore();
  });

  // Draw Heroes (Spider-Man and Ghost Spider)
  const heroList = [
    { p: G.p1, img: IM.spiderman, active: G.active === 1 },
    G.p2 && { p: G.p2, img: IM.gwen, active: G.active === 2 }
  ].filter(Boolean);

  for (const h of heroList) {
    if (G.dead.has(h.p.id)) continue;
    const [x, y] = pos(h.p), px = X(x), py = Y(y), S = B * 1.95, sh = T < h.p.shield;
    ctx.save(); ctx.fillStyle = "rgba(8,4,0,.36)"; ctx.beginPath(); ctx.ellipse(px, py + S * .47, S * .44, S * .16, 0, 0, 7); ctx.fill(); ctx.restore();

    // Active control focus pulse aura (no numbers on screen!)
    if (h.active) {
      ctx.save();
      const pulseR = S * (.58 + .05 * Math.sin(T / 120));
      ctx.shadowColor = "#ffd23f"; ctx.shadowBlur = B * .35;
      ctx.strokeStyle = "rgba(255, 210, 63, " + (.6 + .3 * Math.sin(T / 120)) + ")";
      ctx.lineWidth = Math.max(2, B * .055);
      ctx.beginPath(); ctx.arc(px, py, pulseR, 0, 7); ctx.stroke();
      ctx.restore();
    }

    if (!(T < h.p.inv && Math.floor(T / 80) % 2 === 0)) {
      ctx.save(); const br = B * .26;
      ctx.shadowColor = sh ? "rgba(80,180,255,.95)" : "rgba(0,0,0,.55)"; ctx.shadowBlur = sh ? B * .65 : B * .25; ctx.shadowOffsetY = sh ? 0 : B * .08;
      ctx.fillStyle = "#08102d"; rrect(ctx, px - S / 2, py - S / 2, S, S, br); ctx.fill();
      ctx.save(); rrect(ctx, px - S / 2 + 2, py - S / 2 + 2, S - 4, S - 4, br * .9); ctx.clip();
      if (h.img && h.img.complete) ctx.drawImage(h.img, px - S * .5, py - S * .5, S, S); ctx.restore();
      ctx.strokeStyle = sh ? "#6bd4ff" : h.active ? "#ffd23f" : "#24376e"; ctx.lineWidth = sh ? Math.max(2, B * .055) : Math.max(1.5, B * .03);
      rrect(ctx, px - S / 2, py - S / 2, S, S, br); ctx.stroke(); ctx.restore();
      if (sh) {
        ctx.strokeStyle = "rgba(120,210,255," + (.6 + .35 * Math.sin(T / 120)) + ")"; ctx.lineWidth = B * .11;
        rrect(ctx, px - S / 2 - B * .07, py - S / 2 - B * .07, S + B * .14, S + B * .14, br * 1.2); ctx.stroke();
      }
    }
    const bw = S * .92, bh = B * .2, bx = px - bw / 2, by = py - S / 2 - bh - B * .1, f = h.p.hp / MAXHP;
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

    // 3D BOMB CARRYING ANIMATION (Hero holding bomb out in front, bobbing with steps)
    if (h.p.holdingBomb) {
      ctx.save();
      const lk = h.p.look || [0, 1];
      const isMoving = h.p.t !== 0 || held();
      const bob = Math.sin(T / 80) * (isMoving ? B * .12 : B * .04);
      const bx = px + lk[0] * B * .55;
      const by = py + lk[1] * B * .45 - B * .1 + bob;
      const br = B * .42;

      // 1. Bomb ground shadow
      ctx.fillStyle = "rgba(0,0,0,0.38)";
      ctx.beginPath();
      ctx.ellipse(bx, py + S * .46, br * 1.1, br * .44, 0, 0, 7);
      ctx.fill();

      // 2. Cartoon Gloves holding the bomb from both sides
      const isSpidey = h.p.id === "spiderman";
      const gloveCol = isSpidey ? "#e52521" : "#ffffff";
      const gloveStroke = isSpidey ? "#7f1d1d" : "#0891b2";
      const handW = B * .26, handH = B * .22;

      ctx.save();
      ctx.fillStyle = gloveCol; ctx.strokeStyle = gloveStroke; ctx.lineWidth = Math.max(1.8, B * .04);
      rrect(ctx, bx - br * 1.05, by - handH / 2, handW, handH, handH * .4); ctx.fill(); ctx.stroke();
      rrect(ctx, bx + br * 1.05 - handW, by - handH / 2, handW, handH, handH * .4); ctx.fill(); ctx.stroke();
      ctx.restore();

      // 3. Spherical 3D Bomb Body with Specular Highlight
      const bg = ctx.createRadialGradient(bx - br * .32, by - br * .35, br * .08, bx, by, br);
      bg.addColorStop(0, "#718096"); bg.addColorStop(0.35, "#2d3748"); bg.addColorStop(1, "#090d16");
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill();
      ctx.strokeStyle = "#000000"; ctx.lineWidth = Math.max(2, B * .045); ctx.stroke();

      // Specular shine dot
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath(); ctx.arc(bx - br * .32, by - br * .35, br * .2, 0, 7); ctx.fill();

      // 4. Brass Collar Neck
      ctx.fillStyle = "#d97706"; ctx.strokeStyle = "#78350f"; ctx.lineWidth = B * .025;
      ctx.fillRect(bx - br * .22, by - br - br * .18, br * .44, br * .2);
      ctx.strokeRect(bx - br * .22, by - br - br * .18, br * .44, br * .2);

      // 5. Curved Rope Fuse
      ctx.beginPath();
      ctx.moveTo(bx, by - br - br * .18);
      ctx.quadraticCurveTo(bx + br * .35, by - br - br * .5, bx + br * .18, by - br - br * .75);
      ctx.strokeStyle = "#fef08a"; ctx.lineWidth = B * .05; ctx.stroke();

      // 6. Animated Burning Flame Spark
      const sparkR = B * (.11 + .04 * Math.sin(T / 35));
      const sparkG = ctx.createRadialGradient(bx + br * .18, by - br - br * .75, 0, bx + br * .18, by - br - br * .75, sparkR * 2.8);
      sparkG.addColorStop(0, "#ffffff"); sparkG.addColorStop(0.3, "#fef08a"); sparkG.addColorStop(0.7, "#ff4500"); sparkG.addColorStop(1, "rgba(255,69,0,0)");
      ctx.fillStyle = sparkG;
      ctx.beginPath(); ctx.arc(bx + br * .18, by - br - br * .75, sparkR * 2.8, 0, 7); ctx.fill();

      ctx.restore();
    }
  }

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
    const bw = Math.min(cw * .95, B * 9.8);
    const bh = B * 5.6;
    const bx = (cw - bw) / 2;
    const by = Math.max(B * 0.5, (ch - bh) / 2);

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
    const headerY = by + B * .62;
    ctx.font = "900 " + Math.round(B * .44) + "px " + font;
    ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = B * .2;
    ctx.fillStyle = "#ffffff";
    ctx.fillText("GLOBAL GAMES ", cw / 2 - B * .4, headerY);
    ctx.fillStyle = "#ff1744"; ctx.shadowColor = "#ff1744"; ctx.shadowBlur = B * .35;
    ctx.fillText("SK", cw / 2 + B * 1.35, headerY);
    ctx.shadowColor = "transparent";

    // 4. Determine Dynamic Headline & Subtitle based on survivor status
    const p1Esc = G.p1 && G.p1.escaped && !G.dead.has("spiderman");
    const p2Esc = G.p2 && G.p2.escaped && !G.dead.has("gwen");
    const p1Dead = G.dead.has("spiderman");
    const p2Dead = G.p2 && G.dead.has("gwen");
    let headline = "ALL HEROES ESCAPED!";
    let subtitle = "★★★ GRAND VICTORY ★★★";
    let subColor = "#22c55e";

    if (G.p1 && G.p2) {
      if (p1Esc && p2Esc) {
        headline = "ALL HEROES ESCAPED!";
        subtitle = "★★★ GRAND VICTORY ★★★";
        subColor = "#22c55e";
      } else if (p1Esc && p2Dead) {
        headline = "SPIDER-MAN ESCAPED!";
        subtitle = "★★★ SOLO SURVIVOR ★★★";
        subColor = "#38bdf8";
      } else if (p2Esc && p1Dead) {
        headline = "GHOST SPIDER ESCAPED!";
        subtitle = "★★★ SOLO SURVIVOR ★★★";
        subColor = "#f472b6";
      } else if (p1Esc) {
        headline = "SPIDER-MAN ESCAPED!";
        subtitle = "★★★ MISSION COMPLETE ★★★";
        subColor = "#22c55e";
      }
    } else {
      headline = "SPIDER-MAN ESCAPED!";
      subtitle = "★★★ GRAND VICTORY ★★★";
      subColor = "#22c55e";
    }

    // 5. Main Headline
    const titleY = headerY + B * .85;
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
    const subY = titleY + B * .68;
    ctx.font = "900 " + Math.round(B * .44) + "px " + font;
    ctx.fillStyle = subColor; ctx.shadowColor = subColor; ctx.shadowBlur = B * .4;
    ctx.strokeStyle = "#050b1c"; ctx.lineWidth = B * .09;
    ctx.strokeText(subtitle, cw / 2, subY);
    ctx.fillText(subtitle, cw / 2, subY);
    ctx.shadowColor = "transparent";

    // 7. Enlarged Avatar Cards with Status Badges UNDER the image
    const cardY = subY + B * 1.14;
    const cr = B * .78;
    const heroes = [G.p1, G.p2].filter(Boolean);
    const cardSpacing = heroes.length > 1 ? B * 2.7 : 0;

    heroes.forEach((hero, idx) => {
      const hx = cw / 2 + (idx - (heroes.length - 1) / 2) * cardSpacing;
      const isDead = G.dead.has(hero.id);
      const isEscaped = hero.escaped && !isDead;

      // 1. Avatar Outer Ring & Base
      ctx.save();
      if (isEscaped) {
        ctx.fillStyle = "#0a192f";
        ctx.strokeStyle = "#22c55e";
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = B * .32;
      } else {
        ctx.fillStyle = "#1e080a";
        ctx.strokeStyle = "#ef4444";
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = B * .25;
      }
      ctx.lineWidth = B * .07;
      ctx.beginPath(); ctx.arc(hx, cardY, cr, 0, 7); ctx.fill(); ctx.stroke();
      ctx.shadowColor = "transparent";
      ctx.clip();

      // 2. Avatar Face Image (Full color if escaped, grayscale + dimmed if eliminated)
      const img = hero.id === "spiderman" ? IM.spiderman : IM.gwen;
      if (img && img.complete) {
        if (isDead) {
          ctx.filter = "grayscale(100%) brightness(55%)";
        }
        ctx.drawImage(img, hx - cr, cardY - cr, cr * 2, cr * 2);
        ctx.filter = "none";
        if (isDead) {
          ctx.fillStyle = "rgba(220, 38, 38, 0.35)";
          ctx.beginPath(); ctx.arc(hx, cardY, cr, 0, 7); ctx.fill();
        }
      }
      ctx.restore();

      // 3. Hero Name (Clean, placed underneath avatar)
      const nameY = cardY + cr + B * .28;
      ctx.font = "800 " + Math.round(B * .28) + "px " + font;
      ctx.fillStyle = isEscaped ? "#f8fafc" : "#94a3b8";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(hero.id === "spiderman" ? "Spider-Man" : "Ghost Spider", hx, nameY);

      // 4. Status Badge UNDER the image (below name)
      const badgeY = nameY + B * .38;
      const pillW = B * 1.85, pillH = B * .44;
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
}

function loop(now) {
  const dt = Math.min(50, now - (last || now)); last = now;
  if (G && cw) { update(dt); cam(dt); draw(); }
  requestAnimationFrame(loop);
}

const KM = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
const km = e => KM[e.key.length > 1 ? e.key : e.key.toLowerCase()];

// Keyboard switching: '1' Spider-Man, '2' Ghost Spider, '7' Pick/Carry Bomb, '8' Throw Bomb
addEventListener("keydown", e => {
  if (e.key === "1" && !G.dead.has("spiderman")) {
    G.active = 1;
    const [nx, ny] = pos(G.p1); camX = nx; camY = ny;
    ui(); return;
  }
  if (e.key === "2" && G.p2 && !G.dead.has("gwen")) {
    G.active = 2;
    const [nx, ny] = pos(G.p2); camX = nx; camY = ny;
    ui(); return;
  }
  if (e.key === "7" || e.code === "Digit7" || e.code === "Numpad7") {
    const h = G.p;
    if (h && !G.dead.has(h.id)) {
      const [px, py] = pos(h);
      const nearBomb = (G.bombs || []).find(b => !b.got && Math.hypot(b.x - px, b.y - py) < 1.85);
      if (nearBomb) {
        nearBomb.got = 1;
        h.bombs = (h.bombs || 0) + 1;
        h.holdingBomb = true;
        GameAudio.play("coin", { vol: 1.4 });
        fx("spark", nearBomb.x, nearBomb.y);
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
});
addEventListener("keyup", e => { const m = km(e); if (m) ctl.key = ctl.key.filter(k => k !== m); });
addEventListener("blur", () => { ctl.key = []; ctl.ptr = ctl.pad = null; });

let ox0 = 0, oy0 = 0, pid = null;
cv.addEventListener("pointerdown", e => { ox0 = e.clientX; oy0 = e.clientY; pid = e.pointerId; cv.setPointerCapture(pid); });
cv.addEventListener("pointermove", e => {
  if (e.pointerId !== pid) return;
  const dx = e.clientX - ox0, dy = e.clientY - oy0;
  ctl.ptr = Math.max(Math.abs(dx), Math.abs(dy)) < 14 ? null : Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
});
const endP = e => { if (e.pointerId === pid) { pid = null; ctl.ptr = null; } };
cv.addEventListener("pointerup", endP); cv.addEventListener("pointercancel", endP);

[["u", "up"], ["l", "left"], ["d", "down"], ["r", "right"]].forEach(([i, d]) => {
  const b = $(i), up = () => { if (ctl.pad === d) ctl.pad = null; };
  b.addEventListener("pointerdown", e => { e.preventDefault(); ctl.pad = d; b.setPointerCapture(e.pointerId); });
  b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("lostpointercapture", up);
});

const run = () => {
  $("frame").classList.add("playing"); $("ov").hidden = true; state = "play";
  GameAudio.begin().then(() => { GameAudio.play("start"); if (state === "play") GameAudio.musicStart(); });
};

// Menu navigation: Ratio -> Level Select -> Game
$("btn-to-levels").addEventListener("click", () => { showMenu("levels"); });
$("btn-back-ratio").addEventListener("click", () => { showMenu("ratio"); });

document.querySelectorAll(".lvl-btn, .lvl-card").forEach(el => {
  el.addEventListener("click", e => {
    e.stopPropagation();
    const card = el.closest(".lvl-card") || el;
    const lvlIdx = parseInt(card.dataset.lvl || "0", 10);
    loadLevel(lvlIdx);
    run();
  });
});

$("btn-retry").addEventListener("click", () => { newGame(); run(); });
$("btn-choose-level").addEventListener("click", () => { showMenu("levels"); });

$("rs").addEventListener("click", () => { newGame(); run(); });
$("sd").addEventListener("click", () => Snd.toggle());
$("mn").addEventListener("click", () => { state = "ready"; Snd.music(false); showMenu("levels"); });

document.querySelectorAll('input[name="ra"]').forEach(r => r.addEventListener("change", () => { ratio = r.value; resize(); }));
document.addEventListener("visibilitychange", () => { last = 0; });

document.querySelector('input[value="' + ratio + '"]').checked = true;
const qParams = new URLSearchParams(location.search);
const initLvl = parseInt(qParams.get("lvl") || "0", 10);
loadLevel(initLvl);
sdIcon();
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
