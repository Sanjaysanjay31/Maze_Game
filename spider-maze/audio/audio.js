/* Spider Maze audio engine (Web Audio). Loads window.AUDIO_DATA (audio/audio-data.js), which is built by tools/make_audio.py
   from the WAV files in audio/sfx and audio/music.
   Features: combo pitch-rising star sound, distance + stereo positioning for blades, wall blades and lasers, looping hazard sounds,
   heartbeat at low health, adaptive music (calm while standing, energetic while running), limiter, mute with memory. */
const GameAudio = (() => {
  "use strict";
  let ac = null, master, sfxBus, musBus, buf = {}, ready = null, on = true, last = {}, loops = {}, prev = {}, mus = null, winSource = null;
  const combo = { n: 0, t: -9 }, SC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  try { on = localStorage.getItem("sm_snd") !== "0"; } catch (e) {}
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function ctx() {
    if (ac) return ac;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ac = new C();
    const lim = ac.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = .002; lim.release.value = .08;
    master = ac.createGain(); master.gain.value = on ? 1 : 0; master.connect(lim); lim.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = 1.35; sfxBus.connect(master);
    musBus = ac.createGain(); musBus.gain.value = 0; musBus.connect(master);
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
    s.buffer = buf[n]; s.playbackRate.value = (o.rate || 1) * (o.rand ? 1 + (Math.random() - .5) * o.rand : 1);
    if (n === "win") {
      s.loop = true; // Loop the victory celebration music during win celebration screen
      if (winSource) { try { winSource.stop(); } catch(e){} }
      winSource = s;
    }
    g.gain.value = (o.vol == null ? 1 : o.vol) * (n === "hit" ? 1.85 : n === "win" ? 2.2 : n === "heal" ? 1.75 : n === "shield" || n === "shield_block" ? 1.6 : 1.25);
    s.connect(g);
    let out = g; if (o.pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); g.connect(p); out = p; }
    out.connect(sfxBus); s.start();
    return s;
  }
  function stopWin() {
    if (winSource) {
      try { winSource.stop(); } catch (e) {}
      winSource = null;
    }
  }
  function coin() {
    const t = ac ? ac.currentTime : 0; combo.n = t - combo.t < 1.25 ? Math.min(combo.n + 1, SC.length - 1) : 0; combo.t = t;
    play("coin", { rate: Math.pow(2, SC[combo.n] / 12), vol: 1.25 + .03 * combo.n });
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
  function stopLoops() { stopWin(); for (const k in loops) { try { loops[k].s.stop(); } catch (e) {} } loops = {}; prev = {}; }
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
  }
  function musicStart() {}
  function musicStop() { stopLoops(); }
  function duck() {}
  function toggle() { on = !on; try { localStorage.setItem("sm_snd", on ? "1" : "0"); } catch (e) {} if (master) master.gain.setTargetAtTime(on ? 1 : 0, ac.currentTime, .05); return on; }
  function getMediaStream() {
    const a = ctx();
    if (!a) return null;
    if (!a._recDest) {
      a._recDest = a.createMediaStreamDestination();
      // Add DelayNode (0.45s) between master and recording destination to synchronize Web Audio with canvas captureStream encoder latency
      try {
        const recDelay = a.createDelay(1.0);
        recDelay.delayTime.value = 0.45;
        master.connect(recDelay);
        recDelay.connect(a._recDest);
      } catch (e) {
        master.connect(a._recDest);
      }
      // Continuous silent clock source so the MP4 muxer always receives audio packets
      try {
        const osc = a.createOscillator();
        const g = a.createGain();
        g.gain.value = 0.000005; // Inaudible keep-alive clock
        osc.connect(g);
        g.connect(a._recDest);
        osc.start();
      } catch (e) {}
    }
    return a._recDest.stream;
  }
  document.addEventListener("visibilitychange", () => { if (ac) { if (document.hidden) ac.suspend(); else ac.resume(); } });
  return { begin, play, coin, frame, musicStart, musicStop, duck, toggle, stopLoops, stopWin, getMediaStream, getAudioContext: () => ac, get on() { return on; }, get combo() { return combo.n + 1; }, get buf() { return buf; } };
})();
