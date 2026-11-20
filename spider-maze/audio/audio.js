/* Spider Maze audio engine (Web Audio). Loads window.AUDIO_DATA (audio/audio-data.js), which is built by tools/make_audio.py
   from the WAV files in audio/sfx and audio/music.
   Features: combo pitch-rising star sound, distance + stereo positioning for blades, wall blades and lasers, looping hazard sounds,
   heartbeat at low health, adaptive music (calm while standing, energetic while running), limiter, mute with memory. */
const GameAudio = (() => {
  "use strict";
  let ac = null, master, sfxBus, musBus, buf = {}, ready = null, on = true, last = {}, loops = {}, prev = {}, mus = null;
  const combo = { n: 0, t: -9 }, SC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  try { on = localStorage.getItem("sm_snd") !== "0"; } catch (e) {}
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function ctx() {
    if (ac) return ac;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ac = new C();
    const lim = ac.createDynamicsCompressor(); lim.threshold.value = -14; lim.knee.value = 12; lim.ratio.value = 5; lim.attack.value = .004; lim.release.value = .2;
    master = ac.createGain(); master.gain.value = on ? 1 : 0; master.connect(lim); lim.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = .9; sfxBus.connect(master);
    musBus = ac.createGain(); musBus.gain.value = .5; musBus.connect(master);
    return ac;
  }
  const b64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; };
  const dec = ab => new Promise((ok, no) => { const p = ac.decodeAudioData(ab, ok, no); if (p && p.catch) p.catch(no); });
  function begin() {
    const a = ctx(); if (!a) return Promise.resolve();
    if (a.state === "suspended") a.resume();
    if (!ready) {
      const D = window.AUDIO_DATA || { sfx: {}, music: {} }, jobs = [];
      for (const k in D.sfx) jobs.push(dec(b64(D.sfx[k])).then(x => buf[k] = x, () => 0));
      for (const k in D.music) jobs.push(dec(b64(D.music[k])).then(x => buf["m_" + k] = x, () => 0));
      ready = Promise.all(jobs);
    }
    return ready;
  }
  function play(n, o) {
    o = o || {}; if (!on || !ac || !buf[n]) return null;
    const t = ac.currentTime; if (o.min && t - (last[n] || -9) < o.min) return null; last[n] = t;
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = buf[n]; s.playbackRate.value = (o.rate || 1) * (o.rand ? 1 + (Math.random() - .5) * o.rand : 1); g.gain.value = o.vol == null ? 1 : o.vol; s.connect(g);
    let out = g; if (o.pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); g.connect(p); out = p; }
    out.connect(sfxBus); s.start();
    if (n === "hit") duck(1.3);
    else if (n !== "heartbeat") duck(o.duck || 0.4);
    return s;
  }
  function coin() {
    const t = ac ? ac.currentTime : 0; combo.n = t - combo.t < 1.25 ? Math.min(combo.n + 1, SC.length - 1) : 0; combo.t = t;
    play("coin", { rate: Math.pow(2, SC[combo.n] / 12), vol: .8 + .02 * combo.n });
  }
  function loop(id, n, rate) {
    if (loops[id] || !ac || !buf[n]) return loops[id];
    const s = ac.createBufferSource(), g = ac.createGain(), p = ac.createStereoPanner ? ac.createStereoPanner() : null;
    s.buffer = buf[n]; s.loop = true; s.playbackRate.value = rate || 1; g.gain.value = 0; s.connect(g);
    if (p) { g.connect(p); p.connect(sfxBus); } else g.connect(sfxBus);
    s.start(0, Math.random() * .9); return loops[id] = { s, g, p };
  }
  function setLoop(id, v, pan) {
    const l = loops[id]; if (!l) return; const t = ac.currentTime;
    l.g.gain.setTargetAtTime(on ? v : 0, t, .05); if (l.p) l.p.pan.setTargetAtTime(clamp(pan || 0, -1, 1), t, .05);
  }
  function stopLoops() { for (const k in loops) { try { loops[k].s.stop(); } catch (e) {} } loops = {}; prev = {}; }
  /* called every frame while playing: f = {px,py,moving,hp,saws:[[x,y]],wsaws:[[x,y,moving]],lasers:[[x,y,on]]} (block coordinates) */
  function frame(f) {
    if (!ac) return;
    const near = (x, y, R) => { const dx = x - f.px, dy = y - f.py; return [Math.pow(Math.max(0, 1 - Math.hypot(dx, dy) / R), 2), clamp(dx / 9, -1, 1) * .85]; };
    f.lasers.forEach((l, i) => {
      const id = "l" + i, [v, p] = near(l[0], l[1], 10); loop(id, "laser_hum", 1 + .02 * i); setLoop(id, l[2] ? v * .55 : 0, p);
      if (prev[id] !== undefined && l[2] !== prev[id]) { const [vv, pp] = near(l[0], l[1], 14); if (vv > .02) play(l[2] ? "laser_on" : "laser_off", { vol: vv, pan: pp, rand: .05 }); }
      prev[id] = l[2];
    });
    if (f.hp === 1) { loop("hb", "heartbeat", 1); setLoop("hb", .8, 0); } else if (loops.hb) setLoop("hb", 0, 0);
    if (mus) { const t = ac.currentTime, v = f.moving ? 1 : .12; mus.cg.gain.setTargetAtTime((1.35 - .9 * v) * (f.hp === 1 ? 1.1 : 1), t, .5); mus.ag.gain.setTargetAtTime(v, t, .35); }
  }
  function musicStart() {
    if (!ac || mus || !buf.m_calm || !buf.m_action) return;
    const t = ac.currentTime + .08, mk = (n, g0) => { const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = buf[n]; s.loop = true; g.gain.value = g0; s.connect(g); g.connect(musBus); s.start(t); return { s, g }; };
    const c = mk("m_calm", 0), a = mk("m_action", 0); mus = { cs: c.s, as: a.s, cg: c.g, ag: a.g }; c.g.gain.setTargetAtTime(1.2, t, .4);
  }
  function musicStop() {
    if (mus) { const t = ac.currentTime, m = mus; mus = null; m.cg.gain.setTargetAtTime(0, t, .15); m.ag.gain.setTargetAtTime(0, t, .15); setTimeout(() => { try { m.cs.stop(); m.as.stop(); } catch (e) {} }, 900); }
    stopLoops();
  }
  function duck(sec) { if (!ac) return; const t = ac.currentTime; musBus.gain.cancelScheduledValues(t); musBus.gain.setTargetAtTime(.04, t, .03); musBus.gain.setTargetAtTime(.5, t + (sec || .5), .35); }
  function toggle() { on = !on; try { localStorage.setItem("sm_snd", on ? "1" : "0"); } catch (e) {} if (master) master.gain.setTargetAtTime(on ? 1 : 0, ac.currentTime, .05); return on; }
  document.addEventListener("visibilitychange", () => { if (ac) { if (document.hidden) ac.suspend(); else ac.resume(); } });
  return { begin, play, coin, frame, musicStart, musicStop, duck, toggle, stopLoops, get on() { return on; }, get combo() { return combo.n + 1; } };
})();
