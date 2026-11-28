/* Spider Maze visual effects. Reusable in any level: VFX.add(type,x,y,T,{c}) with positions in block coordinates.
   Types: cloud (dust cloud with stars), spark (star burst), ring (expanding ring), plus (rising green plus signs), dust (footstep puff).
   Also: VFX.confetti, VFX.text (floating text), VFX.flash (screen flash), low-health red vignette via draw({lowhp:true}). */
const VFX = (() => {
  let L = [], fT = -1e9, fC = "255,40,60", font = null;
  const LIFE = { cloud: 900, spark: 1000, conf: 1800, ring: 750, plus: 1150, text: 1000, dust: 520, sparkle: 1200, ember: 1100 };
  const star = (g, x, y, r) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); };
  const plus = (g, x, y, r) => { const w = r * .38; g.beginPath(); g.moveTo(x - w, y - r); g.lineTo(x + w, y - r); g.lineTo(x + w, y - w); g.lineTo(x + r, y - w); g.lineTo(x + r, y + w); g.lineTo(x + w, y + w); g.lineTo(x + w, y + r); g.lineTo(x - w, y + r); g.lineTo(x - w, y + w); g.lineTo(x - r, y + w); g.lineTo(x - r, y - w); g.lineTo(x - w, y - w); g.closePath(); };
  return {
    add(type, x, y, t, o) { L.push({ type, x, y, t, o: o || {} }); },
    text(x, y, s, t) { L.push({ type: "text", x, y, t, o: { s } }); },
    confetti(x, y, t) { const C = ["#ffd23f", "#ff4a5c", "#4ab3ff", "#5be39a", "#c25cf0"]; for (let k = 0; k < 60; k++) L.push({ type: "conf", x, y, t, o: { vx: (Math.random() - .5) * 11, vy: -2 - Math.random() * 9, c: C[k % 5], r: .1 + Math.random() * .1, sp: Math.random() * 8 } }); },
    cracker(x, y, t) {
      const C = ["#ff003c", "#ffea00", "#00f0ff", "#39ff14", "#ff00ff", "#ffffff", "#ff8800"];
      for (let k = 0; k < 28; k++) {
        const ang = Math.random() * Math.PI * 2, spd = 2 + Math.random() * 9;
        L.push({ type: "ember", x, y, t, o: { vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 2, c: C[k % C.length], size: .11 + Math.random() * .18 } });
      }
      L.push({ type: "ring", x, y, t, o: { c: "#ffea00" } });
    },
    fireblast(x, y, t) {
      fC = "255,100,20"; fT = t;
      L.push({ type: "ring", x, y, t, o: { c: "#ff3b00" } });
      L.push({ type: "ring", x, y, t: t + 40, o: { c: "#ffd23f" } });
      const C = ["#ff2200", "#ff6a00", "#ffb700", "#ffffff", "#d9381e"];
      // Bomb blast fiery glowing embers (round blast sparks, ZERO stars)
      for (let k = 0; k < 36; k++) {
        const ang = Math.random() * Math.PI * 2, spd = 3 + Math.random() * 11;
        L.push({ type: "ember", x, y, t, o: { vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, c: C[k % C.length], size: .14 + Math.random() * .22 } });
      }
      for (let k = 0; k < 5; k++) {
        const ox = (Math.random() - .5) * 1.1, oy = (Math.random() - .5) * 1.1;
        L.push({ type: "cloud", x: x + ox, y: y + oy, t: t + k * 35, o: {} });
      }
    },
    flash(c, t) { fC = c; fT = t; },
    clear() { L = []; fT = -1e9; },
    update(T) { L = L.filter(f => T - f.t < (LIFE[f.type] || 900)); },
    draw(g, e) {
      const { X, Y, B, T } = e; font = font || getComputedStyle(document.body).getPropertyValue("--display") || "sans-serif";
      for (const f of L) {
        const a = (T - f.t) / (LIFE[f.type] || 900), px = X(f.x), py = Y(f.y), o = f.o;
        if (f.type === "cloud") {
          // Pure smoke / dust puff with NO stars
          const s = B * (2.4 + a * .9);
          g.globalAlpha = Math.max(0, 1 - a * a);
          g.drawImage(e.cloud, px - s / 2, py - s / 2, s, s);
          g.globalAlpha = 1;
        }
        else if (f.type === "spark") {
          // Golden starburst split ONLY for collecting stars!
          g.globalAlpha = Math.min(1, (1 - a) * 1.6);
          g.strokeStyle = "#4a1500";
          g.lineWidth = B * .035;
          for (let i = 0; i < 12; i++) {
            const k = i * .52 + .3, d = a * B * (i % 2 ? 3.1 : 2);
            g.fillStyle = ["#ff6a00", "#e0310c", "#b3124f", "#ff4d00"][i % 4];
            star(g, px + Math.cos(k) * d, py + Math.sin(k) * d, B * (.26 - a * .1));
            g.fill(); g.stroke();
          }
          g.globalAlpha = 1;
        }
        else if (f.type === "ember") {
          // Round fiery glowing ember sparks for explosions / bomb blast (ZERO stars!)
          const t = (T - f.t) / 1000;
          g.save();
          g.globalAlpha = Math.min(1, (1 - a) * 2.2);
          const spx = X(f.x + o.vx * t), spy = Y(f.y + o.vy * t + 4 * t * t);
          g.fillStyle = o.c;
          g.shadowColor = o.c;
          g.shadowBlur = B * .35;
          g.beginPath();
          g.arc(spx, spy, Math.max(1, B * o.size * (1 - a * .45)), 0, 7);
          g.fill();
          g.restore();
        }
        else if (f.type === "conf") { const t = (T - f.t) / 1000; g.save(); g.globalAlpha = Math.min(1, (1 - a) * 2); g.translate(X(f.x + o.vx * t), Y(f.y + o.vy * t + 9 * t * t / 2)); g.rotate(o.sp * t); g.fillStyle = o.c; g.fillRect(-B * o.r, -B * o.r * .5, B * o.r * 2, B * o.r); g.restore(); }
        else if (f.type === "ring") { g.globalAlpha = 1 - a; g.strokeStyle = o.c || "#fff"; g.lineWidth = B * .16 * (1 - a) + 1; g.beginPath(); g.arc(px, py, B * (.5 + a * 3), 0, 7); g.stroke(); g.globalAlpha = 1; }
        else if (f.type === "plus") { g.lineJoin = "round"; g.lineWidth = B * .05; g.strokeStyle = "#fff"; g.fillStyle = "#22c55e"; g.globalAlpha = 1 - a * a; for (let i = 0; i < 7; i++) { plus(g, px + (i - 3) * B * .34 + Math.sin(T / 200 + i) * B * .06, py - a * B * (1.6 + (i % 3) * .5) - (i % 2) * B * .2, B * (.2 + (i % 3) * .05) * (1 - a * .3)); g.stroke(); g.fill(); } g.globalAlpha = 1; }
        else if (f.type === "text") { g.globalAlpha = 1 - a * a; g.font = "400 " + Math.round(B * .5) + "px " + font; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = B * .1; g.strokeStyle = "#5a2a00"; g.lineJoin = "round"; g.strokeText(o.s, px, py - B * (.6 + a * 1.4)); g.fillStyle = "#fff3a0"; g.fillText(o.s, px, py - B * (.6 + a * 1.4)); g.globalAlpha = 1; }
        else if (f.type === "dust") { g.globalAlpha = .55 * (1 - a); g.fillStyle = "#fff4c8"; g.beginPath(); g.arc(px, py, B * (.1 + a * .28), 0, 7); g.fill(); g.globalAlpha = 1; }
      }
      const fa = (T - fT) / 380; if (fa >= 0 && fa < 1) { g.fillStyle = "rgba(" + fC + "," + (.42 * (1 - fa)) + ")"; g.fillRect(0, 0, e.cw, e.ch); }
      if (e.lowhp) { const p = .5 + .5 * Math.sin(T / 260), r = g.createRadialGradient(e.cw / 2, e.ch / 2, Math.min(e.cw, e.ch) * .35, e.cw / 2, e.ch / 2, Math.max(e.cw, e.ch) * .7); r.addColorStop(0, "rgba(255,0,30,0)"); r.addColorStop(1, "rgba(255,0,30," + (.25 + .2 * p) + ")"); g.fillStyle = r; g.fillRect(0, 0, e.cw, e.ch); }
    }
  };
})();
