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
const spider = IM.spiderman; if ($("face")) $("face").src = A.spiderman;
let cw, ch, B, floorT, wallT, sawS, cloudS, shadow, G, camX = 0, camY = 0, shake = 0, T = 0, last = 0, state = "ready", ratio = innerWidth > innerHeight ? "16:9" : "9:16", mini, hudB = 0;

const Snd = {
  sfx: k => {
    if (k === "hit") GameAudio.play("hit", { rand: .06 });
    else if (k === "heal") GameAudio.play("heal", { rand: .03 });
    else if (k === "shield") GameAudio.play("shield");
    else if (k === "win") { GameAudio.duck(2); GameAudio.play("win", { vol: 2.2 }); }
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
      } else if (n === "miles" && G.p3 && !G.dead.has("miles")) {
        G.active = 3;
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
  (G.switches || []).forEach(sw => { dot(sw.x, sw.y, r * 1.2, sw.active ? "#ff1744" : "#00e676", "#fff"); });
  dot(cen(...L.exit)[0], cen(...L.exit)[1], r * 1.6, "#2bd9a4", "#fff");
  if (G.goblin) { dot(G.goblin.x, G.goblin.y, r * 1.5, "#a855f7", "#22c55e"); }
  const [px, py] = pos(G.p); dot(px, py, r * 1.5, "#ffd23f", "#0a1536");
  if (G.p2) { const [gx, gy] = pos(G.p2); dot(gx, gy, r * 1.4, "#ff4081", "#ffffff"); }
  if (G.p3) { const [mx, my] = pos(G.p3); dot(mx, my, r * 1.4, "#eab308", "#ffffff"); }
  ctx.restore();
}

const star = (g, x, y, r) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); };
const cen = (i, j) => [3 * i + 2, 3 * j + 2];

function newGame() {
  const [si, sj] = L.start;
  const p1 = { i: si, j: sj, bi: si, bj: sj, t: 0, last: [si, sj], hp: MAXHP, id: "spiderman", name: "Spider-Man", shield: 0, sh1: 0, bombs: 0, holdingBomb: false, inv: 0, blk: -1e9, look: null, pp: null, dt: 0 };
  let p2 = null, p3 = null;
  if (L.start2) {
    const [s2i, s2j] = L.start2;
    p2 = { i: s2i, j: s2j, bi: s2i, bj: s2j, t: 0, last: [s2i, s2j], hp: MAXHP, id: "gwen", name: "Ghost Spider", shield: 0, sh1: 0, bombs: 0, holdingBomb: false, inv: 0, blk: -1e9, look: null, pp: null, dt: 0 };
  }
  if (L.start3) {
    const [s3i, s3j] = L.start3;
    const heroId = L.hero3 || "miles";
    const heroName = heroId === "miles" ? "Miles Morales" : heroId;
    p3 = { i: s3i, j: s3j, bi: s3i, bj: s3j, t: 0, last: [s3i, s3j], hp: MAXHP, id: heroId, name: heroName, shield: 0, sh1: 0, bombs: 0, holdingBomb: false, inv: 0, blk: -1e9, look: null, pp: null, dt: 0 };
  }
  let goblin = null;
  if (L.cast && L.cast.enemies && L.cast.enemies.includes("goblin")) {
    const gDef = (L.enemies || []).find(e => e.id === "goblin") || { x: 11, y: 17 };
    goblin = {
      id: "goblin",
      name: "Green Goblin",
      x: gDef.x,
      y: gDef.y,
      speed: 2.2,
      stunnedUntil: 0,
      lastAttack: 1800,
      look: [0, 1],
      wpIdx: 0,
      waypoints: [
        [11, 17], [17, 17], [17, 23], [11, 23], [5, 23], [5, 17],
        [11, 29], [17, 29], [17, 35], [11, 35], [5, 35], [5, 29]
      ]
    };
  }
  G = {
    dead: new Set(),
    p1,
    p2,
    p3,
    goblin,
    goblinBombs: [],
    active: 1, // 1: Spider-Man, 2: Ghost Spider, 3: Miles Morales
    get p() {
      if (this.active === 3 && this.p3) return this.p3;
      if (this.active === 2 && this.p2) return this.p2;
      return this.p1;
    },
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
    const isDead = G.dead.has(e.dataset.n);
    const heroObj = e.dataset.n === "spiderman" ? G.p1 : (e.dataset.n === "gwen" ? G.p2 : (e.dataset.n === "miles" ? G.p3 : null));
    const isEscaped = !!(heroObj && heroObj.escaped && !isDead);
    e.classList.toggle("dead", isDead);
    e.classList.toggle("escaped", isEscaped);
    const isHero1 = e.dataset.n === "spiderman" && G.active === 1;
    const isHero2 = e.dataset.n === "gwen" && G.active === 2;
    const isHero3 = e.dataset.n === "miles" && G.active === 3;
    e.classList.toggle("active-hero", (isHero1 || isHero2 || isHero3) && !isDead && !isEscaped);
  });
}

function fx(type, x, y) { VFX.add(type, x, y, T); }

function showMenu(mode) {
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
    const living = [G.p1, G.p2, G.p3].filter(p => p && !G.dead.has(p.id));
    if (living.length === 0) {
      triggerDefeat("ALL HEROES OUT OF HEALTH!");
      ui(); return;
    }
    if (G.p.id === h.id) {
      G.active = living[0].id === "spiderman" ? 1 : (living[0].id === "gwen" ? 2 : 3);
      toast(`Switched to ${living[0].name}!`);
      const [nx, ny] = pos(G.p); camX = nx; camY = ny;
    }
    ui(); return;
  }
  toast(msg);
}

function hasLineOfSight(x0, y0, x1, y1, isGate) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  if (dist < 0.3) return true;
  const steps = Math.max(4, Math.ceil(dist * 4));
  const maxT = isGate ? 0.82 : 0.92;
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

function throwHeroBomb(h) {
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

  // 5. Green Goblin Boss
  if (G.goblin) {
    const dGob = Math.hypot(G.goblin.x - px, G.goblin.y - py);
    const fwdGob = (G.goblin.x - px) * nx + (G.goblin.y - py) * ny;
    const sideGob = Math.abs((G.goblin.x - px) * -ny + (G.goblin.y - py) * nx);
    if (fwdGob >= 0.5 && fwdGob <= 10.0 && sideGob <= 2.2) {
      candidates.push({ type: "goblin", obj: G.goblin, x: G.goblin.x, y: G.goblin.y, dist: dGob, fwd: fwdGob });
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
  const flightDur = Math.max(260, Math.min(420, Math.round(throwDist * 50)));

  G.projectiles = G.projectiles || [];
  G.projectiles.push({
    sx: px, sy: py,
    tx: targetX, ty: targetY,
    t0: T, dur: flightDur,
    targetType, targetObj
  });

  GameAudio.play("coin", { vol: 1.2, rand: .1 });
  toast(`${h.name} threw a Bomb! 💣💥`);
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

function held() { return ctl.pad || ctl.ptr || ctl.key[ctl.key.length - 1] || null; }

function update(dt) {
  if (state !== "play") {
    if (state === "won") {
      updateWinConfetti(dt);
    }
    return;
  }
  T += dt; G.t += dt;
  const p = G.p;
  const curInput = held();
  const v = DIR[curInput];

  if (v && !G.dead.has(p.id)) {
    p.look = [v[0], v[1]];
    let rem = SPEED * dt / 3000;
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

        // FULL AREA OF EFFECT (AOE) OBLITERATION (R <= 4.2 blocks)
        const blastRadius = 4.2;
        let destroyedCount = 0;

        // 1. Saws
        (G.saws || []).forEach((sObj, k) => {
          if (sObj.destroyed) return;
          const [sx, sy] = sawAt(sObj.data, k);
          const s = sObj.data;
          const dCurr = Math.hypot(sx - x, sy - y);
          const dStart = Math.hypot(s[0] - x, s[1] - y);
          const dEnd = Math.hypot(s[2] - x, s[3] - y);
          if (dCurr <= blastRadius || dStart <= blastRadius || dEnd <= blastRadius) {
            sObj.destroyed = true;
            destroyedCount++;
            fx("cloud", sx, sy);
          }
        });

        // 2. Wall Saws
        (G.wsaws || []).forEach(wObj => {
          if (wObj.destroyed) return;
          const [wx, wy] = wsPos(wObj.data);
          if (Math.hypot(wx - x, wy - y) <= blastRadius) {
            wObj.destroyed = true;
            destroyedCount++;
            fx("cloud", wx, wy);
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
            fx("cloud", lx, ly);
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

        // 5. Green Goblin Boss Stun Detonation
        if (G.goblin && Math.hypot(G.goblin.x - x, G.goblin.y - y) <= blastRadius) {
          G.goblin.stunnedUntil = T + 5000;
          destroyedCount++;
          VFX.fireblast(G.goblin.x, G.goblin.y, T);
          toast("Green Goblin Stunned by Bomb! 🎃💥 (5s)");
        }

        // 6. Explicit target fallback
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
          } else if (pj.targetType === "goblin" && G.goblin) {
            G.goblin.stunnedUntil = T + 5000;
            VFX.fireblast(G.goblin.x, G.goblin.y, T);
            toast("Direct Hit on Green Goblin! 🎃💥 (5s)");
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

  const heroes = [G.p1, G.p2, G.p3].filter(Boolean);
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
        b.got = 1; Snd.sfx("heal"); GameAudio.duck(.65);
        VFX.add("plus", b.x, b.y, T); if (h.hp < MAXHP) { h.hp++; toast("Health +1"); } else { toast("Full Health!"); }
      }
    }
    // Shields
    for (const s of G.shields) {
      if (!s.got && Math.hypot(s.x - px, s.y - py) < 1.4) {
        s.got = 1; Snd.sfx("shield"); GameAudio.duck(.65);
        VFX.add("ring", s.x, s.y, T, { c: "#7fd0ff" }); h.shield = T + 8000; h.sh1 = 1; toast("Shield on for 8 seconds");
      }
    }

    // Wall Switches
    for (const sw of (G.switches || [])) {
      if (!sw.active && Math.hypot(sw.x - px, sw.y - py) < 1.35) {
        if (sw.hero && sw.hero !== h.id) continue;
        sw.active = true; GameAudio.play("click", { vol: 1.3, rand: .05 });
        VFX.add("ring", sw.x, sw.y, T, { c: sw.color || "#00e676" });
        toast(sw.msg || "Secret Gate Unlocked!"); shake = 0.85;
        // Trigger linked targets
        for (const tid of sw.targets) {
          const gate = (G.gates || []).find(g => g.id === tid);
          if (gate && !gate.open) {
            gate.open = true;
            for (const [gx, gy] of gate.blocks) {
              if (WALL[gy]) WALL[gy][gx] = 0;
              fx("cloud", gx, gy);
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
        const living = [G.p1, G.p2, G.p3].filter(p => p && !G.dead.has(p.id));
        if (living.length > 1 && !living.every(p => p.escaped)) {
          toast(`${h.name} reached Exit!`);
        }
      }
    }

    // Dust particles when moving
    const mv = !!h.pp && Math.hypot(px - h.pp[0], py - h.pp[1]) > 1e-3; h.pp = [px, py];
    if (mv && T > (h.dt || 0)) { h.dt = T + 130; const lk = h.look || [0, 0]; VFX.add("dust", px - lk[0] * .9, py - lk[1] * .9, T); }
  }

  // -------------------------------------------------------------
  // AUTONOMOUS AI GREEN GOBLIN UPDATE (Level 5 Boss Mode)
  // -------------------------------------------------------------
  if (G.goblin) {
    const gob = G.goblin;
    const isStunned = T < gob.stunnedUntil;

    if (isStunned) {
      if (Math.random() < 0.25) {
        fx("cloud", gob.x + (Math.random() - .5) * .8, gob.y + (Math.random() - .5) * .8);
      }
    } else {
      const activeHero = G.p;
      const [px, py] = pos(activeHero);
      const dHero = Math.hypot(px - gob.x, py - gob.y);
      const canSeeHero = dHero < 9.5 && hasLineOfSight(gob.x, gob.y, px, py);

      let targetX, targetY;
      if (canSeeHero) {
        targetX = px;
        targetY = py;
        gob.mode = "hunt";
      } else {
        const wp = gob.waypoints[gob.wpIdx % gob.waypoints.length];
        targetX = wp[0];
        targetY = wp[1];
        if (Math.hypot(targetX - gob.x, targetY - gob.y) < 1.0) {
          gob.wpIdx = (gob.wpIdx + 1) % gob.waypoints.length;
        }
        gob.mode = "patrol";
      }

      const angle = Math.atan2(targetY - gob.y, targetX - gob.x);
      const moveDist = gob.speed * (dt / 1000);
      const nextX = gob.x + Math.cos(angle) * moveDist;
      const nextY = gob.y + Math.sin(angle) * moveDist;

      if (!solid(Math.floor(nextX), Math.floor(nextY))) {
        gob.x = nextX;
        gob.y = nextY;
      } else if (!solid(Math.floor(nextX), Math.floor(gob.y))) {
        gob.x = nextX;
      } else if (!solid(Math.floor(gob.x), Math.floor(nextY))) {
        gob.y = nextY;
      }
      gob.look = [Math.cos(angle) >= 0 ? 1 : -1, Math.sin(angle) >= 0 ? 1 : -1];

      // Pumpkin Bomb Throw Attack
      if (T - gob.lastAttack > 4200 && dHero <= 10.0 && canSeeHero) {
        gob.lastAttack = T;
        GameAudio.play("coin", { vol: 1.3, rand: .1 });
        toast("Green Goblin threw a Pumpkin Bomb! 🎃💣");
        G.goblinBombs = G.goblinBombs || [];
        G.goblinBombs.push({
          sx: gob.x,
          sy: gob.y,
          tx: px,
          ty: py,
          t0: T,
          dur: Math.max(300, Math.min(520, Math.round(dHero * 55)))
        });
      }

      // Contact attack with heroes
      for (const h of heroes) {
        if (G.dead.has(h.id)) continue;
        const [hx, hy] = pos(h);
        if (near(gob.x, gob.y, 1.25, hx, hy)) {
          hitHero(h, "Slashed by Green Goblin's Glider! 🎃");
        }
      }
    }
  }

  // Update Goblin's flying pumpkin bombs
  if (G.goblinBombs && G.goblinBombs.length) {
    G.goblinBombs = G.goblinBombs.filter(pb => {
      if (T - pb.t0 >= pb.dur) {
        VFX.fireblast(pb.tx, pb.ty, T);
        shake = 1.3;
        GameAudio.play("lose", { vol: 1.3 });
        GameAudio.play("hit", { vol: 1.3 });
        for (const h of heroes) {
          if (G.dead.has(h.id)) continue;
          const [hx, hy] = pos(h);
          if (Math.hypot(hx - pb.tx, hy - pb.ty) <= 2.2) {
            hitHero(h, "Hit by Goblin's Pumpkin Bomb! 🎃💥");
          }
        }
        return false;
      }
      return true;
    });
  }

  // ALL LIVING HEROES MUST REACH EXIT TO WIN!
  const living = [G.p1, G.p2, G.p3].filter(p => p && !G.dead.has(p.id));
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
      setTimeout(() => { GameRecorder.stop(); }, 3800);
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
  L.enemies.forEach((s, k) => { const [x, y] = sawAt(s, k + 9), S = B * 1.8; if (IM[s[4]]) ctx.drawImage(IM[s[4]], X(x) - S / 2, Y(y) - S / 2, S, S); });

  // Shields
  for (const s of G.shields) if (!s.got) {
    const r = B * .72; ctx.save(); ctx.translate(X(s.x), Y(s.y) + Math.sin(T / 280) * B * .07); ctx.shadowColor = "rgba(80,180,255,.9)"; ctx.shadowBlur = B * .4;
    ctx.beginPath(); ctx.moveTo(0, -r * .95); ctx.bezierCurveTo(r * .55, -r * .85, r * .85, -r * .8, r * .85, -r * .5); ctx.bezierCurveTo(r * .85, r * .3, r * .45, r * .7, 0, r * .98); ctx.bezierCurveTo(-r * .45, r * .7, -r * .85, r * .3, -r * .85, -r * .5); ctx.bezierCurveTo(-r * .85, -r * .8, -r * .55, -r * .85, 0, -r * .95); ctx.closePath();
    const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, "#7fd0ff"); g.addColorStop(1, "#1b62d6"); ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = "transparent"; ctx.strokeStyle = "#fff"; ctx.lineWidth = B * .07; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.moveTo(-r * .5, -r * .55); ctx.lineTo(-r * .1, -r * .55); ctx.lineTo(-r * .1, r * .35); ctx.lineTo(-r * .5, -r * .1); ctx.fill(); ctx.restore();
  }

  // 3D Collectible Bombs (💣 with realistic metallic sphere, specular highlight, brass collar & burning wick)
  for (const b of (G.bombs || [])) if (!b.got) {
    const px = X(b.x), py = Y(b.y) + Math.sin(T / 240) * B * .06, r = B * .36;
    ctx.save();

    // 1. Soft 3D Ground Contact Shadow
    ctx.fillStyle = "rgba(0,0,0,.38)";
    ctx.beginPath();
    ctx.ellipse(px + B * .05, Y(b.y) + B * .32, r * 1.15, r * .45, 0, 0, 7);
    ctx.fill();

    // 2. 3D Cast Iron Spherical Body with Realistic Lighting
    const bg = ctx.createRadialGradient(px - r * .35, py - r * .38, r * .05, px - r * .1, py - r * .1, r * 1.05);
    bg.addColorStop(0, "#94a3b8");       // Glossy specular highlight
    bg.addColorStop(0.18, "#475569");     // Midtone slate
    bg.addColorStop(0.65, "#1e293b");     // Deep cast iron
    bg.addColorStop(0.95, "#0b1120");     // Shadow side
    bg.addColorStop(1, "#1e293b");        // Bottom rim reflection
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, 7);
    ctx.fill();

    // 3D Rim light highlight on upper crest
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = B * .02;
    ctx.beginPath();
    ctx.arc(px, py, r - B * .01, Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke();

    // 3. 3D Brass Fuse Collar Cylinder
    const collarW = r * .46, collarH = r * .22;
    const collarX = px - collarW / 2, collarY = py - r - collarH * .8;
    const brassG = ctx.createLinearGradient(collarX, collarY, collarX + collarW, collarY);
    brassG.addColorStop(0, "#78350f"); brassG.addColorStop(0.3, "#fde047"); brassG.addColorStop(0.7, "#d97706"); brassG.addColorStop(1, "#451a03");
    ctx.fillStyle = brassG;
    rrect(ctx, collarX, collarY, collarW, collarH, collarH * .3);
    ctx.fill();
    ctx.strokeStyle = "#451a03"; ctx.lineWidth = B * .015;
    rrect(ctx, collarX, collarY, collarW, collarH, collarH * .3);
    ctx.stroke();

    // 4. Curved 3D Rope Wick
    ctx.beginPath();
    ctx.moveTo(px, collarY);
    ctx.quadraticCurveTo(px + r * .32, py - r - r * .55, px + r * .16, py - r - r * .78);
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = B * .045;
    ctx.stroke();

    // 5. Burning Ember with Radial Heat Glow
    const sparkR = B * (.09 + .03 * Math.sin(T / 35));
    const sparkG = ctx.createRadialGradient(px + r * .16, py - r - r * .78, 0, px + r * .16, py - r - r * .78, sparkR * 2.8);
    sparkG.addColorStop(0, "#ffffff");
    sparkG.addColorStop(0.25, "#fef08a");
    sparkG.addColorStop(0.65, "#f97316");
    sparkG.addColorStop(1, "rgba(239,68,68,0)");
    ctx.fillStyle = sparkG;
    ctx.beginPath();
    ctx.arc(px + r * .16, py - r - r * .78, sparkR * 2.8, 0, 7);
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

  // Draw Heroes (Spider-Man, Ghost Spider, Miles Morales)
  const heroList = [
    { p: G.p1, img: IM.spiderman, active: G.active === 1 },
    G.p2 && { p: G.p2, img: IM.gwen, active: G.active === 2 },
    G.p3 && { p: G.p3, img: IM[G.p3.id] || IM.miles, active: G.active === 3 }
  ].filter(Boolean);

  for (const h of heroList) {
    if (G.dead.has(h.p.id)) continue;
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
      ctx.shadowColor = sh ? "rgba(80,180,255,.95)" : "rgba(0,0,0,.55)"; ctx.shadowBlur = sh ? B * .65 : B * .25; ctx.shadowOffsetY = sh ? 0 : B * .08;
      ctx.fillStyle = "#ffffff"; rrect(ctx, -S / 2, -S / 2, S, S, br); ctx.fill();
      ctx.save(); rrect(ctx, -S / 2 + 1, -S / 2 + 1, S - 2, S - 2, br * .95); ctx.clip();
      if (h.img && h.img.complete) ctx.drawImage(h.img, -S * .5, -S * .5, S, S); ctx.restore();
      ctx.strokeStyle = sh ? "#6bd4ff" : h.active ? "#ffd23f" : "#1e293b"; ctx.lineWidth = sh ? Math.max(3, B * .065) : h.active ? Math.max(2.5, B * .045) : Math.max(1.8, B * .03);
      rrect(ctx, -S / 2, -S / 2, S, S, br); ctx.stroke();
      if (sh) {
        ctx.strokeStyle = "rgba(120,210,255," + (.6 + .35 * Math.sin(T / 120)) + ")"; ctx.lineWidth = B * .11;
        rrect(ctx, -S / 2 - B * .07, -S / 2 - B * .07, S + B * .14, S + B * .14, br * 1.2); ctx.stroke();
      }
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

  // Draw Goblin's Flying Pumpkin Bombs (🎃 with fiery trail)
  (G.goblinBombs || []).forEach(pb => {
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
    bg.addColorStop(0, "#fed7aa"); bg.addColorStop(0.3, "#f97316"); bg.addColorStop(0.85, "#c2410c"); bg.addColorStop(1, "#431407");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.strokeStyle = "#431407"; ctx.lineWidth = B * .04; ctx.stroke();

    ctx.fillStyle = "#fef08a"; ctx.shadowColor = "#fef08a"; ctx.shadowBlur = B * .3;
    ctx.beginPath();
    ctx.moveTo(-r * .4, -r * .2); ctx.lineTo(-r * .15, -r * .4); ctx.lineTo(-r * .1, -r * .15); ctx.closePath();
    ctx.moveTo(r * .4, -r * .2); ctx.lineTo(r * .15, -r * .4); ctx.lineTo(r * .1, -r * .15); ctx.closePath();
    ctx.moveTo(-r * .5, r * .15); ctx.lineTo(0, r * .4); ctx.lineTo(r * .5, r * .15); ctx.lineTo(r * .25, r * .22); ctx.lineTo(0, r * .28); ctx.lineTo(-r * .25, r * .22); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#15803d"; ctx.fillRect(-r * .15, -r - r * .2, r * .3, r * .22);
    ctx.restore();
  });

  // Draw Green Goblin Boss (Autonomous Enemy with Bat Glider)
  if (G.goblin) {
    const gob = G.goblin;
    const px = X(gob.x), py = Y(gob.y);
    const S = B * 2.1;
    const isStunned = T < gob.stunnedUntil;
    const hoverBob = isStunned ? 0 : Math.sin(T / 110) * B * .08;
    const drawY = py + hoverBob;

    ctx.save();

    // 1. Ground Shadow
    ctx.fillStyle = "rgba(0,0,0,0.36)";
    ctx.beginPath();
    ctx.ellipse(px, py + S * .52, S * .55, S * .2, 0, 0, 7);
    ctx.fill();

    // 2. Glider Jet Thruster Flame
    if (!isStunned) {
      const flameLen = B * (.55 + .2 * Math.sin(T / 35));
      const flG = ctx.createLinearGradient(px, drawY + S * .35, px, drawY + S * .35 + flameLen);
      flG.addColorStop(0, "#ffffff"); flG.addColorStop(0.3, "#fef08a"); flG.addColorStop(0.7, "#f97316"); flG.addColorStop(1, "rgba(239,68,68,0)");
      ctx.fillStyle = flG;
      ctx.beginPath();
      ctx.moveTo(px - B * .18, drawY + S * .35);
      ctx.lineTo(px + B * .18, drawY + S * .35);
      ctx.lineTo(px, drawY + S * .35 + flameLen);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Bat Glider Wings
    const wingW = S * 1.35, wingH = B * .42;
    const wingY = drawY + S * .3;
    const wg = ctx.createLinearGradient(px - wingW / 2, wingY, px + wingW / 2, wingY);
    wg.addColorStop(0, "#334155"); wg.addColorStop(0.5, "#94a3b8"); wg.addColorStop(1, "#1e293b");
    ctx.fillStyle = wg; ctx.strokeStyle = "#0f172a"; ctx.lineWidth = B * .04;
    ctx.beginPath();
    ctx.moveTo(px - wingW / 2, wingY - wingH * .5);
    ctx.quadraticCurveTo(px, wingY + wingH * .8, px + wingW / 2, wingY - wingH * .5);
    ctx.lineTo(px + wingW * .35, wingY + wingH * .6);
    ctx.lineTo(px, wingY + wingH * .95);
    ctx.lineTo(px - wingW * .35, wingY + wingH * .6);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 4. Goblin Character Card (High-resolution 4K Sprite from IM.goblin)
    ctx.save();
    ctx.translate(px, drawY);
    const br = B * .32;
    ctx.shadowColor = isStunned ? "rgba(251,191,36,0.9)" : "rgba(168,85,247,0.95)";
    ctx.shadowBlur = B * .45;
    ctx.fillStyle = "#140a24";
    rrect(ctx, -S / 2, -S / 2, S, S, br);
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.save();
    rrect(ctx, -S / 2 + 1, -S / 2 + 1, S - 2, S - 2, br * .95);
    ctx.clip();
    const gImg = IM.goblin || IM.green_goblin;
    if (gImg && gImg.complete) {
      if (isStunned) {
        ctx.filter = "sepia(70%) hue-rotate(30deg) brightness(85%)";
      }
      ctx.drawImage(gImg, -S * .5, -S * .5, S, S);
      ctx.filter = "none";
    }
    ctx.restore();

    ctx.strokeStyle = isStunned ? "#f59e0b" : "#a855f7";
    ctx.lineWidth = Math.max(3, B * .06);
    rrect(ctx, -S / 2, -S / 2, S, S, br);
    ctx.stroke();
    ctx.restore();

    // 5. Boss Health / Status Bar above Goblin
    const bw = S * 1.1, bh = B * .24, bx0 = px - bw / 2, by0 = drawY - S / 2 - bh - B * .15;
    ctx.fillStyle = "#0f172a"; ctx.strokeStyle = "#a855f7"; ctx.lineWidth = B * .035;
    rrect(ctx, bx0, by0, bw, bh, bh / 2); ctx.fill(); ctx.stroke();

    ctx.font = "900 " + Math.round(bh * .82) + "px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (isStunned) {
      ctx.fillStyle = "#fbbf24";
      const secs = Math.ceil((gob.stunnedUntil - T) / 1000);
      ctx.fillText(`💫 STUNNED! (${secs}s)`, px, by0 + bh / 2);
    } else {
      ctx.fillStyle = "#a855f7";
      ctx.fillText("🎃 GREEN GOBLIN", px, by0 + bh / 2);
    }

    // 6. Spinning Dizzy Stars when stunned
    if (isStunned) {
      for (let s = 0; s < 3; s++) {
        const starA = T / 180 + s * (Math.PI * 2 / 3);
        const starX = px + Math.cos(starA) * B * .75;
        const starY = by0 - B * .18 + Math.sin(starA) * B * .25;
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
    let headline = allHeroes.length > 1 ? "ALL HEROES ESCAPED!" : "SPIDER-MAN ESCAPED!";
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

      // 2. Rectangular Character Image (Clipped inside rounded rectangle)
      ctx.save();
      rrect(ctx, cx, cy, cardW, cardH, cardR);
      ctx.clip();
      const img = IM[hero.id] || (hero.id === "spiderman" ? IM.spiderman : (hero.id === "miles" ? IM.miles : IM.gwen));
      if (img && img.complete) {
        if (isDead) {
          ctx.filter = "grayscale(100%) brightness(55%)";
        }
        const pad = B * .08;
        ctx.drawImage(img, cx + pad, cy + pad, cardW - pad * 2, cardH - pad * 2);
        ctx.filter = "none";
        if (isDead) {
          ctx.fillStyle = "rgba(220, 38, 38, 0.35)";
          rrect(ctx, cx, cy, cardW, cardH, cardR);
          ctx.fill();
        }
      }
      ctx.restore();
      ctx.restore();

      // 3. Hero Name (Clean, placed underneath rectangular card)
      const nameY = cy + cardH + B * .26;
      ctx.font = "800 " + Math.round(B * (heroes.length > 2 ? .24 : .28)) + "px " + font;
      ctx.fillStyle = isEscaped ? "#f8fafc" : "#94a3b8";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(hero.name || (hero.id === "spiderman" ? "Spider-Man" : (hero.id === "miles" ? "Miles Morales" : "Ghost Spider")), hx, nameY);

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

  let offset = 0;
  let moovData = null;
  const moofs = [];
  const mdats = [];

  while (offset + 8 <= totalLen) {
    let sz = view.getUint32(offset, false);
    const btype = String.fromCharCode(data[offset+4], data[offset+5], data[offset+6], data[offset+7]);
    let hdr = 8;
    if (sz === 1) {
      sz = Number(view.getBigUint64(offset + 8, false));
      hdr = 16;
    } else if (sz === 0) {
      sz = totalLen - offset;
    }
    if (sz < hdr || offset + sz > totalLen) break;

    if (btype === 'moov') {
      moovData = data.subarray(offset, offset + sz);
    } else if (btype === 'moof') {
      moofs.push({ offset, size: sz });
    } else if (btype === 'mdat') {
      mdats.push({ offset, size: sz, headerLen: hdr });
    }
    offset += sz;
  }

  if (!moovData || !moofs.length || !mdats.length) {
    return arrayBuffer;
  }

  function findSub(u8, pat) {
    const p0 = pat.charCodeAt(0), p1 = pat.charCodeAt(1), p2 = pat.charCodeAt(2), p3 = pat.charCodeAt(3);
    for (let i = 0; i <= u8.length - 4; i++) {
      if (u8[i] === p0 && u8[i+1] === p1 && u8[i+2] === p2 && u8[i+3] === p3) return i;
    }
    return -1;
  }

  let vStsdEntry = null;
  let aStsdEntry = null;

  const avc1Idx = findSub(moovData, 'avc1');
  if (avc1Idx !== -1) {
    const avc1Sz = new DataView(moovData.buffer, moovData.byteOffset).getUint32(avc1Idx - 4, false);
    vStsdEntry = moovData.slice(avc1Idx - 4, avc1Idx - 4 + avc1Sz);
  }

  const mp4aIdx = findSub(moovData, 'mp4a');
  if (mp4aIdx !== -1) {
    const mp4aSz = new DataView(moovData.buffer, moovData.byteOffset).getUint32(mp4aIdx - 4, false);
    aStsdEntry = moovData.slice(mp4aIdx - 4, mp4aIdx - 4 + mp4aSz);
  }

  let w = targetWidth || 1080;
  let h = targetHeight || 1920;
  const tkhdIdx = findSub(moovData, 'tkhd');
  if (tkhdIdx !== -1) {
    const dv = new DataView(moovData.buffer, moovData.byteOffset);
    const ver = moovData[tkhdIdx + 4];
    const offW = ver === 0 ? tkhdIdx + 80 : tkhdIdx + 92;
    const parsedW = dv.getUint32(offW, false) >> 16;
    const parsedH = dv.getUint32(offW + 4, false) >> 16;
    if (parsedW > 0 && parsedH > 0 && parsedW <= 7680) {
      w = parsedW;
      h = parsedH;
    }
  }

  const vSamples = [];
  const vDurations = [];
  const vSync = [];
  const aSamples = [];
  const aDurations = [];

  for (let i = 0; i < moofs.length; i++) {
    const moof = moofs[i];
    const mdat = mdats[i] || mdats[0];
    const moofU8 = data.subarray(moof.offset, moof.offset + moof.size);

    let trafIdx = 0;
    while (true) {
      const idx = findSub(moofU8.subarray(trafIdx), 'traf');
      if (idx === -1) break;
      const actualTraf = trafIdx + idx;
      const dvMoof = new DataView(moofU8.buffer, moofU8.byteOffset);
      const tSz = dvMoof.getUint32(actualTraf - 4, false);
      const traf = moofU8.subarray(actualTraf - 4, actualTraf - 4 + tSz);
      const dvTraf = new DataView(traf.buffer, traf.byteOffset);

      const tfhdIdx = findSub(traf, 'tfhd');
      const tfhdFlags = (dvTraf.getUint8(tfhdIdx + 5) << 16) | (dvTraf.getUint8(tfhdIdx + 6) << 8) | dvTraf.getUint8(tfhdIdx + 7);
      const trackId = dvTraf.getUint32(tfhdIdx + 8, false);
      let tfhdPtr = tfhdIdx + 12;
      if (tfhdFlags & 0x01) tfhdPtr += 8; // base-data-offset
      if (tfhdFlags & 0x02) tfhdPtr += 4; // sample-description-index
      let defDuration = 0;
      if (tfhdFlags & 0x08) { defDuration = dvTraf.getUint32(tfhdPtr, false); tfhdPtr += 4; }
      let defSize = 0;
      if (tfhdFlags & 0x10) { defSize = dvTraf.getUint32(tfhdPtr, false); tfhdPtr += 4; }
      let defFlags = 0;
      if (tfhdFlags & 0x20) { defFlags = dvTraf.getUint32(tfhdPtr, false); tfhdPtr += 4; }

      const trunIdx = findSub(traf, 'trun');
      if (trunIdx !== -1) {
        const flags = (dvTraf.getUint8(trunIdx + 5) << 16) | (dvTraf.getUint8(trunIdx + 6) << 8) | dvTraf.getUint8(trunIdx + 7);
        const sCount = dvTraf.getUint32(trunIdx + 8, false);

        let ptr = trunIdx + 12;
        let dataOffset = 0;
        if (flags & 0x01) {
          dataOffset = dvTraf.getInt32(ptr, false);
          ptr += 4;
        }
        let firstFlags = 0;
        if (flags & 0x04) {
          firstFlags = dvTraf.getUint32(ptr, false);
          ptr += 4;
        }

        let curPos = (dataOffset > 0) ? (moof.offset + dataOffset) : (mdat.offset + mdat.headerLen);

        for (let s = 0; s < sCount; s++) {
          let dur = 0, sz = 0, sFlags = 0;
          if (flags & 0x100) {
            dur = dvTraf.getUint32(ptr, false);
            ptr += 4;
          } else if (defDuration) {
            dur = defDuration;
          }
          if (flags & 0x200) {
            sz = dvTraf.getUint32(ptr, false);
            ptr += 4;
          } else if (defSize) {
            sz = defSize;
          }
          if (flags & 0x400) {
            sFlags = dvTraf.getUint32(ptr, false);
            ptr += 4;
          } else if (defFlags) {
            sFlags = defFlags;
          }
          if (flags & 0x800) {
            ptr += 4;
          }

          if (s === 0 && (flags & 0x04)) sFlags = firstFlags;

          const sData = data.subarray(curPos, curPos + sz);
          curPos += sz;

          if (trackId === 1) {
            vSamples.push(sData);
            vDurations.push(dur > 0 ? dur : 500);
            const isNonSync = (sFlags >> 16) & 1;
            if (!isNonSync || vSamples.length === 1) {
              vSync.push(vSamples.length);
            }
          } else {
            aSamples.push(sData);
            aDurations.push(dur > 0 ? dur : 1024);
          }
        }
      }

      trafIdx = actualTraf + tSz;
    }
  }

  if (!vSamples.length) return arrayBuffer;

  const videoTimescale = 30000;
  const audioTimescale = 48000;
  const movieTimescale = 1000;

  const totalVDur = vDurations.reduce((a, b) => a + b, 0);
  const vDurMs = Math.round(totalVDur * 1000 / videoTimescale);
  const totalADur = aDurations.reduce((a, b) => a + b, 0);
  const aDurMs = aDurations.length ? Math.round(totalADur * 1000 / audioTimescale) : vDurMs;
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
    const hName = new Uint8Array([86,105,100,101,111,72,97,110,100,108,101,114,0]);
    hdlrBw.write(hName);
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
    const urlPayload = new Uint8Array([0, 0, 0, 1]);
    drefPayload.writeBox('url ', urlPayload);
    dinfBw.writeBox('dref', drefPayload.getBytes());
    minfBw.writeBox('dinf', dinfBw.getBytes());

    const stblBw = new MP4BoxWriter();
    const stsdBw = new MP4BoxWriter();
    stsdBw.writeU8(0);
    stsdBw.write(new Uint8Array(3));
    stsdBw.writeU32(1);
    stsdBw.write(vStsdEntry);
    stblBw.writeBox('stsd', stsdBw.getBytes());

    const sttsEntries = [];
    if (vDurations.length) {
      let curD = vDurations[0];
      let curC = 1;
      for (let j = 1; j < vDurations.length; j++) {
        if (vDurations[j] === curD) {
          curC++;
        } else {
          sttsEntries.push([curC, curD]);
          curD = vDurations[j];
          curC = 1;
        }
      }
      sttsEntries.push([curC, curD]);
    }
    const sttsBw = new MP4BoxWriter();
    sttsBw.writeU8(0); sttsBw.write(new Uint8Array(3));
    sttsBw.writeU32(sttsEntries.length);
    for (const [c, d] of sttsEntries) {
      sttsBw.writeU32(c);
      sttsBw.writeU32(d);
    }
    stblBw.writeBox('stts', sttsBw.getBytes());

    const stssBw = new MP4BoxWriter();
    stssBw.writeU8(0); stssBw.write(new Uint8Array(3));
    stssBw.writeU32(vSync.length || 1);
    for (const idx of (vSync.length ? vSync : [1])) {
      stssBw.writeU32(idx);
    }
    stblBw.writeBox('stss', stssBw.getBytes());

    const stscBw = new MP4BoxWriter();
    stscBw.writeU8(0); stscBw.write(new Uint8Array(3));
    stscBw.writeU32(1);
    stscBw.writeU32(1);
    stscBw.writeU32(vSamples.length);
    stscBw.writeU32(1);
    stblBw.writeBox('stsc', stscBw.getBytes());

    const stszBw = new MP4BoxWriter();
    stszBw.writeU8(0); stszBw.write(new Uint8Array(3));
    stszBw.writeU32(0);
    stszBw.writeU32(vSamples.length);
    for (const s of vSamples) {
      stszBw.writeU32(s.byteLength);
    }
    stblBw.writeBox('stsz', stszBw.getBytes());

    const stcoBw = new MP4BoxWriter();
    stcoBw.writeU8(0); stcoBw.write(new Uint8Array(3));
    stcoBw.writeU32(1);
    stcoBw.writeU32(coV);
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
      aTkhdBw.writeU32(0);
      aTkhdBw.writeU32(0);
      aTkhdBw.writeU32(2);
      aTkhdBw.writeU32(0);
      aTkhdBw.writeU32(aDurMs);
      aTkhdBw.write(new Uint8Array(8));
      aTkhdBw.writeU16(0);
      aTkhdBw.writeU16(0);
      aTkhdBw.writeU16(0x0100);
      aTkhdBw.writeU16(0);
      aTkhdBw.write(matrix);
      aTkhdBw.writeU32(0);
      aTkhdBw.writeU32(0);
      aTrakBw.writeBox('tkhd', aTkhdBw.getBytes());

      const aMdiaBw = new MP4BoxWriter();
      const aMdhdBw = new MP4BoxWriter();
      aMdhdBw.writeU8(0);
      aMdhdBw.write(new Uint8Array(3));
      aMdhdBw.writeU32(0);
      aMdhdBw.writeU32(0);
      aMdhdBw.writeU32(audioTimescale);
      aMdhdBw.writeU32(totalADur);
      aMdhdBw.writeU16(0x55c4);
      aMdhdBw.writeU16(0);
      aMdiaBw.writeBox('mdhd', aMdhdBw.getBytes());

      const aHdlrBw = new MP4BoxWriter();
      aHdlrBw.writeU8(0); aHdlrBw.write(new Uint8Array(3));
      aHdlrBw.writeU32(0);
      aHdlrBw.write(new Uint8Array([0x73, 0x6f, 0x75, 0x6e]));
      aHdlrBw.write(new Uint8Array(12));
      const sName = new Uint8Array([83,111,117,110,100,72,97,110,100,108,101,114,0]);
      aHdlrBw.write(sName);
      aMdiaBw.writeBox('hdlr', aHdlrBw.getBytes());

      const aMinfBw = new MP4BoxWriter();
      const smhdBw = new MP4BoxWriter();
      smhdBw.writeU8(0); smhdBw.write(new Uint8Array(3));
      smhdBw.writeU16(0); smhdBw.writeU16(0);
      aMinfBw.writeBox('smhd', smhdBw.getBytes());
      aMinfBw.writeBox('dinf', dinfBw.getBytes());

      const aStblBw = new MP4BoxWriter();
      const patchedAStsd = new Uint8Array(aStsdEntry);
      const esdsIdx = findSub(patchedAStsd, 'esds');
      if (esdsIdx !== -1) {
        for (let p = esdsIdx; p < patchedAStsd.length - 12; p++) {
          if (patchedAStsd[p] === 0x04) {
            const dvA = new DataView(patchedAStsd.buffer, patchedAStsd.byteOffset);
            dvA.setUint32(p + 7, 192000, false);
            dvA.setUint32(p + 11, 192000, false);
            break;
          }
        }
      }

      const aStsdBw = new MP4BoxWriter();
      aStsdBw.writeU8(0); aStsdBw.write(new Uint8Array(3));
      aStsdBw.writeU32(1);
      aStsdBw.write(patchedAStsd);
      aStblBw.writeBox('stsd', aStsdBw.getBytes());

      const aSttsBw = new MP4BoxWriter();
      aSttsBw.writeU8(0); aSttsBw.write(new Uint8Array(3));
      aSttsBw.writeU32(1);
      aSttsBw.writeU32(aSamples.length);
      aSttsBw.writeU32(1024);
      aStblBw.writeBox('stts', aSttsBw.getBytes());

      const aStscBw = new MP4BoxWriter();
      aStscBw.writeU8(0); aStscBw.write(new Uint8Array(3));
      aStscBw.writeU32(1);
      aStscBw.writeU32(1);
      aStscBw.writeU32(aSamples.length);
      aStscBw.writeU32(1);
      aStblBw.writeBox('stsc', aStscBw.getBytes());

      const aStszBw = new MP4BoxWriter();
      aStszBw.writeU8(0); aStszBw.write(new Uint8Array(3));
      aStszBw.writeU32(0);
      aStszBw.writeU32(aSamples.length);
      for (const s of aSamples) {
        aStszBw.writeU32(s.byteLength);
      }
      aStblBw.writeBox('stsz', aStszBw.getBytes());

      const aStcoBw = new MP4BoxWriter();
      aStcoBw.writeU8(0); aStcoBw.write(new Uint8Array(3));
      aStcoBw.writeU32(1);
      aStcoBw.writeU32(coA);
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
// IN-GAME STUDIO 60FPS DIRECT VIDEO RECORDER (1080p FHD & 2K QHD 1440p)
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
  resMode: "1080p", // "1080p" or "2k"
  rw: 1080,
  rh: 1920,
  isMp4: true,

  init() {
    const recBtn = $("btn-record");
    const fsBtn = $("btn-fullscreen");
    const resSel = $("sel-rec-res");
    if (recBtn) recBtn.addEventListener("click", () => this.toggle());
    if (fsBtn) fsBtn.addEventListener("click", () => this.toggleFullscreen());
    if (resSel) {
      resSel.addEventListener("change", (e) => {
        this.resMode = e.target.value;
        if (recBtn && !this.recording) {
          const lbl = recBtn.querySelector(".rec-label");
          if (lbl) lbl.textContent = `REC ${this.resMode.toUpperCase()}`;
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
      this.recCv.style.left = "-9999px";
      this.recCv.style.top = "-9999px";
      this.recCv.style.pointerEvents = "none";
      this.recCv.style.opacity = "0";
      this.recCv.style.zIndex = "-100";
      document.body.appendChild(this.recCv);
    }
    const is2k = (this.resMode === "2k");
    if (ratio === "9:16") {
      this.rw = this.recCv.width = is2k ? 1440 : 1080;
      this.rh = this.recCv.height = is2k ? 2560 : 1920;
    } else {
      this.rw = this.recCv.width = is2k ? 2560 : 1920;
      this.rh = this.recCv.height = is2k ? 1440 : 1080;
    }
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

      // Hero slots and static portraits
      const heroes = (G && (G.p1 || G.p2 || G.p3)) ? [G.p1, G.p2, G.p3].filter(Boolean) : (L && L.cast && L.cast.friends ? L.cast.friends.map(id => ({ id, name: id === "spiderman" ? "Spider-Man" : (id === "gwen" ? "Ghost Spider" : "Miles Morales") })) : [{ id: "spiderman", name: "Spider-Man" }]);
      const castH = Math.round(150 * s);
      const castW = heroes.length > 2 ? Math.round(105 * s) : (heroes.length > 1 ? Math.round(130 * s) : Math.round(150 * s));

      heroes.forEach((h, idx) => {
        const cx = pad + idx * (castW + gap);
        const cy = pad;

        tc.fillStyle = "#0c1844";
        tc.beginPath();
        if (tc.roundRect) tc.roundRect(cx, cy, castW, castH, Math.round(24 * s));
        else tc.rect(cx, cy, castW, castH);
        tc.fill();

        tc.lineWidth = Math.round(4 * s);
        tc.strokeStyle = "#283e82";
        tc.stroke();

        if (IM && IM[h.id]) {
          tc.save();
          tc.beginPath();
          const imgPad = Math.round(6 * s);
          if (tc.roundRect) tc.roundRect(cx + imgPad, cy + imgPad, castW - imgPad * 2, castH - imgPad * 2, Math.round(18 * s));
          tc.clip();
          tc.drawImage(IM[h.id], cx + imgPad, cy + imgPad, castW - imgPad * 2, castH - imgPad * 2);
          tc.restore();
        }
      });

      // Brand Strip
      const brandY = pad + castH + gap;
      const brandH = Math.round(76 * s);
      const brandW = rw - pad * 2;

      tc.fillStyle = "#ffffff";
      tc.beginPath();
      if (tc.roundRect) tc.roundRect(pad, brandY, brandW, brandH, Math.round(20 * s));
      else tc.rect(pad, brandY, brandW, brandH);
      tc.fill();

      tc.font = `900 ${Math.round(40 * s)}px "Lilita One", sans-serif`;
      tc.textBaseline = "middle";
      tc.textAlign = "left";
      tc.fillStyle = "#000000";
      const textY = brandY + brandH / 2;
      const textPad = Math.round(24 * s);
      tc.fillText("GLOBAL GAMES ", pad + textPad, textY);
      const m = tc.measureText("GLOBAL GAMES ");
      tc.fillStyle = "#e5243a";
      tc.fillText("SK", pad + textPad + m.width, textY);

      // Star counter pill background
      const pillW = Math.round(brandW * 0.28);
      const pillH = Math.round(56 * s);
      const pillX = pad + brandW - pillW - Math.round(10 * s);
      const pillY = brandY + (brandH - pillH) / 2;

      tc.fillStyle = "#ffd23f";
      tc.beginPath();
      if (tc.roundRect) tc.roundRect(pillX, pillY, pillW, pillH, Math.round(16 * s));
      else tc.rect(pillX, pillY, pillW, pillH);
      tc.fill();

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

      this.layout = { s, pad, gap, castW, castH, brandY, brandH, brandW, pillX, pillY, pillW, pillH, stageY, stageW, stageH };
    } else {
      // 16:9 Landscape Mode
      const s = rw / 1920;
      const pad = Math.round(20 * s), gap = Math.round(12 * s);

      tc.fillStyle = "#0a1236";
      tc.fillRect(0, 0, rw, rh);

      const heroes = (G && (G.p1 || G.p2 || G.p3)) ? [G.p1, G.p2, G.p3].filter(Boolean) : (L && L.cast && L.cast.friends ? L.cast.friends.map(id => ({ id, name: id === "spiderman" ? "Spider-Man" : (id === "gwen" ? "Ghost Spider" : "Miles Morales") })) : [{ id: "spiderman", name: "Spider-Man" }]);
      const castH = Math.round(92 * s);
      const castW = Math.round(92 * s);
      heroes.forEach((h, idx) => {
        const cx = pad + idx * (castW + gap);
        const cy = pad;

        tc.fillStyle = "#0c1844";
        tc.beginPath();
        if (tc.roundRect) tc.roundRect(cx, cy, castW, castH, Math.round(18 * s));
        else tc.rect(cx, cy, castW, castH);
        tc.fill();

        tc.lineWidth = Math.round(3 * s);
        tc.strokeStyle = "#283e82";
        tc.stroke();

        if (IM && IM[h.id]) {
          tc.save();
          tc.beginPath();
          const imgPad = Math.round(4 * s);
          if (tc.roundRect) tc.roundRect(cx + imgPad, cy + imgPad, castW - imgPad * 2, castH - imgPad * 2, Math.round(14 * s));
          tc.clip();
          tc.drawImage(IM[h.id], cx + imgPad, cy + imgPad, castW - imgPad * 2, castH - imgPad * 2);
          tc.restore();
        }
      });

      const castTotalW = heroes.length * (castW + gap);
      const brandX = pad + castTotalW;
      const brandH = Math.round(72 * s);
      const brandY = pad + (castH - brandH) / 2;
      const brandW = rw - brandX - pad;

      tc.fillStyle = "#ffffff";
      tc.beginPath();
      if (tc.roundRect) tc.roundRect(brandX, brandY, brandW, brandH, Math.round(18 * s));
      else tc.rect(brandX, brandY, brandW, brandH);
      tc.fill();

      tc.font = `900 ${Math.round(38 * s)}px "Lilita One", sans-serif`;
      tc.textBaseline = "middle";
      tc.textAlign = "left";
      tc.fillStyle = "#000000";
      const textY = brandY + brandH / 2;
      const textPad = Math.round(24 * s);
      tc.fillText("GLOBAL GAMES ", brandX + textPad, textY);
      const m = tc.measureText("GLOBAL GAMES ");
      tc.fillStyle = "#e5243a";
      tc.fillText("SK", brandX + textPad + m.width, textY);

      const pillW = Math.round(brandW * 0.24);
      const pillH = Math.round(54 * s);
      const pillX = brandX + brandW - pillW - Math.round(10 * s);
      const pillY = brandY + (brandH - pillH) / 2;

      tc.fillStyle = "#ffd23f";
      tc.beginPath();
      if (tc.roundRect) tc.roundRect(pillX, pillY, pillW, pillH, Math.round(16 * s));
      else tc.rect(pillX, pillY, pillW, pillH);
      tc.fill();

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

      this.layout = { s, pad, gap, castW, castH, brandX, brandY, brandH, brandW, pillX, pillY, pillW, pillH, stageY, stageW, stageH };
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

    // 3. Dynamic hero overlays (Active yellow glow, Escaped check, Dead cross)
    const heroes = G ? [G.p1, G.p2, G.p3].filter(Boolean) : [];
    heroes.forEach((h, idx) => {
      const cx = L.pad + idx * (L.castW + L.gap);
      const cy = L.pad;
      const isActive = (G && G.active === idx + 1);
      const isEscaped = h.escaped;
      const isDead = G && G.dead && G.dead.has(h.id);

      if (isActive || isEscaped || isDead) {
        rc.save();
        rc.lineWidth = isActive ? Math.round(6 * s) : Math.round(4 * s);
        rc.strokeStyle = isEscaped ? "#22c55e" : (isDead ? "#ff2438" : "#ffd23f");
        if (isActive) {
          rc.shadowColor = "rgba(255, 210, 63, 0.85)";
          rc.shadowBlur = Math.round(18 * s);
        }
        rc.beginPath();
        if (rc.roundRect) rc.roundRect(cx, cy, L.castW, L.castH, Math.round((ratio === "9:16" ? 24 : 18) * s));
        else rc.rect(cx, cy, L.castW, L.castH);
        rc.stroke();
        rc.restore();
      }

      if (isEscaped) {
        rc.fillStyle = "#22c55e";
        rc.font = `900 ${Math.round((ratio === "9:16" ? 68 : 48) * s)}px sans-serif`;
        rc.textAlign = "center";
        rc.textBaseline = "middle";
        rc.fillText("✔", cx + L.castW / 2, cy + L.castH / 2);
      } else if (isDead) {
        rc.fillStyle = "#ff2438";
        rc.font = `900 ${Math.round((ratio === "9:16" ? 68 : 48) * s)}px sans-serif`;
        rc.textAlign = "center";
        rc.textBaseline = "middle";
        rc.fillText("✕", cx + L.castW / 2, cy + L.castH / 2);
      }
    });

    // 4. Dynamic star score
    const starTotal = (window.L && window.L.stars != null) ? window.L.stars : 10;
    rc.font = `900 ${Math.round((ratio === "9:16" ? 32 : 30) * s)}px "Lilita One", sans-serif`;
    rc.textAlign = "center";
    rc.textBaseline = "middle";
    rc.fillStyle = "#0a1236";
    rc.fillText(`★ ${G ? G.score : 0} / ${starTotal}`, L.pillX + L.pillW / 2, L.pillY + L.pillH / 2);
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

      const is2k = (this.resMode === "2k");

      // Codec negotiation: High Profile Level 5.1 (avc1.640033) for 2K/QHD 60FPS
      let mime = "";
      if (is2k) {
        if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.640033,mp4a.40.2")) {
          mime = "video/mp4;codecs=avc1.640033,mp4a.40.2";
        } else if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1,mp4a.40.2")) {
          mime = "video/mp4;codecs=avc1,mp4a.40.2";
        } else if (MediaRecorder.isTypeSupported("video/mp4")) {
          mime = "video/mp4";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
          mime = "video/webm;codecs=vp9,opus";
        } else if (MediaRecorder.isTypeSupported("video/webm")) {
          mime = "video/webm";
        }
      } else {
        if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1,mp4a.40.2")) {
          mime = "video/mp4;codecs=avc1,mp4a.40.2";
        } else if (MediaRecorder.isTypeSupported("video/mp4")) {
          mime = "video/mp4";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
          mime = "video/webm;codecs=vp9,opus";
        } else if (MediaRecorder.isTypeSupported("video/webm")) {
          mime = "video/webm";
        }
      }

      this.isMp4 = mime.includes("mp4");

      const streamTracks = [...vStream.getVideoTracks()];
      if (aTracks.length > 0) streamTracks.push(...aTracks);
      const stream = new MediaStream(streamTracks);

      const videoBps = is2k ? 28000000 : 18000000;
      const opts = mime ? { mimeType: mime, videoBitsPerSecond: videoBps, audioBitsPerSecond: 192000 } : { videoBitsPerSecond: videoBps, audioBitsPerSecond: 192000 };
      this.recorder = new MediaRecorder(stream, opts);
      this.chunks = [];

      this.recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) this.chunks.push(e.data);
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

      toast(`🔴 Recording Started! (${is2k ? "2K 1440p" : "1080p"} 60FPS MP4 Studio)`);
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

    const is2k = (this.resMode === "2k");
    if (video) video.src = this.lastUrl;
    if (recBadge) recBadge.textContent = `🎬 ${is2k ? "2K 1440P" : "1080P"} 60FPS MP4 VIDEO READY`;
    if (specRes) specRes.textContent = `${this.rw} × ${this.rh} (${ratio === "9:16" ? (is2k ? "2K Shorts" : "9:16 Shorts") : "16:9 Landscape"})`;
    if (specFmt) specFmt.textContent = this.isMp4 ? "MP4 (H.264 / AAC)" : "WebM (VP9 / Opus)";
    if (dlBtn) {
      dlBtn.href = this.lastUrl;
      const ext = this.isMp4 ? "mp4" : "webm";
      const lvlNum = (L && L.num != null) ? L.num : (li + 1);
      dlBtn.download = `Spider_Maze_Level_${lvlNum}_${this.rw}x${this.rh}_60fps.${ext}`;
      dlBtn.textContent = `⬇️ Download Clear ${is2k ? "2K" : "1080p"} MP4 Video`;
    }
    if (modal) modal.hidden = false;
    toast(`✓ ${is2k ? "2K" : "1080p"} 60FPS MP4 Video Ready!`);
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
  if (e.key === "3" && G.p3 && !G.dead.has(G.p3.id)) {
    G.active = 3;
    const [nx, ny] = pos(G.p3); camX = nx; camY = ny;
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

const run = () => {
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

  GameAudio.begin().then(() => {
    setTimeout(() => {
      if (state === "play") GameAudio.play("start");
    }, 500);
  });
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
