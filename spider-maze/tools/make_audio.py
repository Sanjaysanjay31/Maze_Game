#!/usr/bin/env python3
"""Synthesises every Spider Maze sound (SFX + 2 adaptive music stems) as WAV files and bundles them into audio/audio-data.js.
Run from this folder:  python3 make_audio.py   (needs numpy + scipy). Edit the functions to change any sound."""
import numpy as np, wave, os, json, base64
from scipy import signal
SR = 44100; rng = np.random.default_rng(11); ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "audio")
T = lambda d: np.arange(int(d * SR)) / SR
nz = lambda d: rng.standard_normal(int(d * SR))
def lp(x, fc, o=4): return signal.sosfilt(signal.butter(o, min(fc, SR * .45) / (SR / 2), 'low', output='sos'), x)
def hp(x, fc, o=4): return signal.sosfilt(signal.butter(o, fc / (SR / 2), 'high', output='sos'), x)
def bp(x, a, b, o=3): return signal.sosfilt(signal.butter(o, [a / (SR / 2), min(b, SR * .45) / (SR / 2)], 'band', output='sos'), x)
def M(*a):
    n = max(len(x) for x in a); o = np.zeros(n)
    for x in a: o[:len(x)] += x
    return o
def at(x, s): return np.r_[np.zeros(int(s * SR)), x]
def sine(f, d): return np.sin(2 * np.pi * f * T(d))
def sweep(f0, f1, d): t = T(d); return np.sin(2 * np.pi * np.cumsum(f0 * (f1 / f0) ** (t / d)) / SR)
def saw(f, d, h=20):
    t = T(d); x = np.zeros_like(t); k = 1
    while k <= h and f * k < SR / 2.3: x += np.sin(2 * np.pi * f * k * t) / k; k += 1
    return x * 2 / np.pi
def pulse(f, d, duty=.5): return lp(signal.square(2 * np.pi * f * T(d), duty), 7000, 2)
def ad(d, a, tau): t = T(d); return np.minimum(t / a, 1) * np.exp(-t / tau)
def bell(f, d, ratio=2., idx=3., dec=.15):
    t = T(d); mod = idx * np.exp(-t / (dec * .6)) * np.sin(2 * np.pi * f * ratio * t); return np.sin(2 * np.pi * f * t + mod) * ad(d, .001, dec)
def verb(x, rt=.8, mix=.2, dark=5000, keep=True):
    n = int(rt * SR); t = np.arange(n) / SR; ir = lp(rng.standard_normal(n) * np.exp(-6.9 * t / rt), dark, 2); ir[0] = 0; ir /= np.sqrt((ir ** 2).sum())
    w = signal.fftconvolve(x, ir); o = np.zeros(len(w)); o[:len(x)] = x; o += w * mix * 2.2
    return o if keep else o[:len(x)]
def pnoise(d, lo, hi):
    n = int(d * SR); s = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR); return np.fft.irfft(s * ((f > lo) & (f < hi)), n)
# ---------------------------------------------------------------- SFX
def coin():
    a = bell(1318.5, .6, 2, 3.2, .13); b = at(bell(1975.5, .54, 2, 2.6, .2), .06)
    return verb(M(a * .7, b * .7, hp(nz(.05), 5500) * np.exp(-T(.05) / .012) * .25, sine(2637, .12) * np.exp(-T(.12) / .04) * .2), .4, .1)
def hit():
    t = T(.6); f = 45 + 95 * np.exp(-t / .06); thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .12)
    crack = hp(nz(.6), 2500) * np.exp(-t / .015) * .9; body = lp(nz(.6), 1600) * np.exp(-t / .09) * .8
    ouch = sweep(640, 230, .32) * ad(.32, .004, .13) * .4
    return verb(np.tanh(M(thump * 1.1, crack, body, ouch) * 1.5), .35, .1)
def heal():
    parts = []
    for i, f in enumerate([523.25, 659.25, 783.99, 1046.5, 1318.5]):
        for dt in (-5, 5): parts.append(at((np.sin(2 * np.pi * f * 2 ** (dt / 1200) * T(.7)) + .3 * np.sin(2 * np.pi * 2 * f * T(.7))) * ad(.7, .004, .25) * .35, i * .075))
    pad = M(*[sine(f, .9) * np.minimum(T(.9) / .3, 1) * np.exp(-T(.9) / .5) * .12 for f in (523.25, 659.25, 783.99)])
    return verb(M(*parts, pad, at(hp(nz(.3), 6500) * np.exp(-T(.3) / .08) * .12, .3)), .9, .3)
def shield():
    d = .5; t = T(d); sw = sweep(180, 1700, d) * .5 + lp(saw(1, d), 1, 1) * 0; sw2 = lp(sweep(180, 1700, d) * .6 + .4 * np.sign(sweep(180, 1700, d)), 5000)
    env = np.minimum(t / .25, 1) ** 2 * np.minimum((d - t) / .04, 1)
    spk = M(*[at(bell(f, .4, 2, 1.5, .12) * .35, .47 + k * .05) for k, f in enumerate([1568, 2093, 2637])])
    return verb(M(sw2 * env * .55, spk, hp(nz(.4), 5000) * ad(.4, .01, .1) * .08), .7, .25)
def shield_block():
    t = T(.5); x = sum(np.sin(2 * np.pi * 820 * r * t) * np.exp(-t / dd) * a for r, dd, a in [(1, .18, 1), (2.76, .12, .6), (5.4, .08, .4), (8.93, .05, .25), (11.3, .03, .15)])
    return verb(np.tanh(M(x * .8, hp(nz(.5), 3000) * np.exp(-t / .006) * .6) * 1.4), .4, .15)
def shield_end(): d = .45; return verb(np.tanh(sweep(1100, 170, d) * ad(d, .003, .2) * 2) * .8, .3, .1)
def shield_tick(): return M(sine(1500, .06) * ad(.06, .001, .018), sine(3000, .04) * ad(.04, .001, .01) * .4)
def laser_on():
    d = .55; t = T(d); buzz = (saw(110, d, 14) + saw(113, d, 14)) * (.6 + .4 * np.sign(np.sin(2 * np.pi * 55 * t))) * ad(d, .004, .35) * .5
    zap = hp(nz(d), 1500) * np.exp(-t / .07) * .8; whine = sweep(300, 2600, .2) * ad(.2, .003, .12) * .5
    crack = np.zeros(int(d * SR)); idx = rng.integers(0, len(crack) // 2, 30); crack[idx] = rng.standard_normal(30); crack = lp(crack, 6000, 2) * 2 * np.exp(-t / .2)
    return verb(np.tanh(M(buzz, zap, at(whine, 0), crack) * 1.4), .3, .1)
def laser_off(): d = .3; return verb(np.tanh(M(sweep(1800, 110, d) * ad(d, .002, .12) * .8, lp(nz(d), 800) * np.exp(-T(d) / .05) * .5) * 1.3), .25, .1)
def laser_hum():
    d = 1.; t = T(d); x = sum(np.sin(2 * np.pi * 100 * k * t + k) / k for k in range(1, 14)) * (.7 + .3 * np.sign(np.sin(2 * np.pi * 50 * t))) * (.85 + .15 * np.sin(2 * np.pi * 4 * t))
    return x * .5 + pnoise(d, 900, 3500) * .08 * 1
def saw_loop():
    d = 1.; t = T(d); base = saw(150, d, 26) * (.7 + .3 * np.sin(2 * np.pi * 20 * t)); grind = pnoise(d, 2200, 6500) * (.5 + .5 * np.sin(2 * np.pi * 40 * t)) * .5
    return base * .55 + grind * .5 + sine(75, d) * .4 + sine(1800, d) * .08 * (1 + np.sin(2 * np.pi * 20 * t))
def wall_whoosh():
    d = 1.0; t = T(d); g = lambda c, w: np.exp(-((t - c) / w) ** 2)
    x = bp(nz(d), 250, 700) * g(.3, .18) * 1.0 + bp(nz(d), 700, 1800) * g(.5, .2) * .9 + bp(nz(d), 1800, 4200) * g(.5, .14) * .6
    grind = lp(saw(95, d, 14), 900) * g(.5, .3) * .5
    return verb(M(x * 1.2, grind), .35, .12)
def win():
    def brass(f, d, v=1.): t = T(d); x = lp(saw(f, d, 18) + .5 * pulse(f, d, .4), 2800) * np.minimum(t / .03, 1) * np.minimum((d - t) / .08, 1) * (1 + .02 * np.sin(2 * np.pi * 5.5 * t)); return x * v
    notes = [at(brass(f, d), s) for f, d, s in [(523.25, .13, 0), (659.25, .13, .14), (783.99, .13, .28), (1046.5, .5, .42)]]
    chord = [at(brass(f, 1.1, .5), .42) for f in (523.25, 659.25, 783.99)]
    cym = at(hp(nz(1.3), 5500) * np.exp(-T(1.3) / .45) * .3, .42)
    sp = [at(bell(f, .6, 2, 1.8, .2) * .3, .6 + i * .09) for i, f in enumerate([2093, 2637, 3136, 4186])]
    return verb(np.tanh(M(*notes, *chord, cym, *sp) * 1.1), 1.3, .3)
def lose():
    def wah(f0, f1, d, s):
        t = T(d); f = np.linspace(f0, f1, len(t)); x = np.sin(2 * np.pi * np.cumsum(f) / SR); x = np.tanh(x * 3) + .3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
        lo, hi = lp(x, 500), lp(x, 2300); m = (np.sin(2 * np.pi * 4.5 * t) + 1) / 2; return at((lo * (1 - m) + hi * m) * np.minimum(t / .02, 1) * np.minimum((d - t) / .06, 1) * .6, s)
    seq = [wah(196, 196, .34, 0), wah(185, 185, .34, .36), wah(175, 175, .34, .72), wah(165, 140, .8, 1.08)]
    th = at(np.sin(2 * np.pi * np.cumsum(50 * np.exp(-T(.5) / .2) + 30) / SR) * np.exp(-T(.5) / .15) * .8, 1.1)
    return verb(M(*seq, th), .7, .2)
def start():
    d = .5; t = T(d); rise = hp(nz(d), 800) * (t / d) ** 2 * .5 + sweep(200, 900, d) * (t / d) ** 2 * .4
    hitn = at(M(sine(70, .5) * np.exp(-T(.5) / .12), *[bell(f, .6, 2, 1.5, .25) * .3 for f in (523.25, 784, 1046.5)]), d)
    return verb(M(rise, hitn), .8, .25)
def click(): return M(sweep(1100, 600, .035) * ad(.035, .001, .012) * .8, hp(nz(.02), 4000) * np.exp(-T(.02) / .004) * .25)
def heartbeat():
    d = .85; x = np.zeros(int(d * SR))
    for s, a in [(0, 1), (.19, .75)]:
        t = T(.3); h = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t / .05) + 38) / SR) * np.exp(-t / .07) * a; i = int(s * SR); x[i:i + len(h)] += h
    return lp(x, 220, 3) * 1.3
SFX = dict(coin=(coin, .85), hit=(hit, .95), heal=(heal, .8), shield=(shield, .85), shield_block=(shield_block, .8), shield_end=(shield_end, .8), shield_tick=(shield_tick, .7),
           laser_on=(laser_on, .8), laser_off=(laser_off, .7), laser_hum=(laser_hum, .6), saw_loop=(saw_loop, .6), wall_whoosh=(wall_whoosh, .8), win=(win, .9), lose=(lose, .9),
           start=(start, .85), click=(click, .6), heartbeat=(heartbeat, .85))
LOOPS = {"laser_hum", "saw_loop", "heartbeat"}
def fin(x, peak, loop=False):
    x = x - x.mean() * 0 ; x = x / (np.abs(x).max() + 1e-9) * peak
    if not loop:
        n = int(.006 * SR); x[-n:] *= np.linspace(1, 0, n); x[:int(.001 * SR)] *= np.linspace(0, 1, int(.001 * SR))
    return (x * 32767).astype(np.int16)
def wav(path, x, sr=SR):
    with wave.open(path, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(x.tobytes())
# ---------------------------------------------------------------- MUSIC (A minor, 112 BPM, 8 bars, seamless loop)
BPM = 112; SPB = 60 / BPM / 4; STEPS = 128; NL = int(STEPS * SPB * SR)
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
BARS = [(45, [57, 60, 64]), (41, [53, 57, 60]), (48, [55, 60, 64]), (43, [55, 59, 62]), (45, [57, 60, 64]), (41, [53, 57, 60]), (43, [55, 59, 62]), (40, [52, 56, 59])]
MEL = [(0, 2, 69), (2, 2, 72), (4, 4, 76), (8, 2, 74), (10, 2, 72), (12, 4, 69), (16, 2, 65), (18, 2, 69), (20, 4, 72), (24, 2, 69), (26, 2, 67), (28, 4, 65),
       (32, 2, 67), (34, 2, 72), (36, 4, 76), (40, 2, 79), (42, 2, 76), (44, 4, 74), (48, 2, 74), (50, 2, 79), (52, 2, 71), (54, 2, 74), (56, 6, 79),
       (64, 2, 69), (66, 2, 72), (68, 4, 76), (72, 2, 81), (74, 2, 79), (76, 4, 76), (80, 2, 77), (82, 2, 76), (84, 4, 72), (88, 2, 69), (90, 2, 72), (92, 4, 77),
       (96, 2, 79), (98, 2, 74), (100, 2, 71), (102, 2, 74), (104, 4, 79), (108, 2, 81), (110, 2, 83), (112, 4, 80), (116, 2, 76), (118, 2, 71), (120, 8, 76)]
def kick():
    t = T(.3); f = 48 + 110 * np.exp(-t / .035); return np.tanh((np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .11) + np.sin(2 * np.pi * 3000 * t) * np.exp(-t / .002) * .2) * 1.6) * .95
def snare(): t = T(.24); return np.tanh((hp(nz(.24), 1200) * np.exp(-t / .07) + sine(190, .24) * np.exp(-t / .05) * .6) * 1.2) * .6
def hat(o=False): d = .28 if o else .06; return hp(nz(d), 7000) * np.exp(-T(d) / (.09 if o else .016)) * .35
def bassn(m, d):
    f = mtof(m); t = T(d); e = np.minimum(t / .005, 1) * np.exp(-t / (d * .9)); x = saw(f, d, 10) * .6 + sine(f, d) * .8; k = np.exp(-t / .06)
    return (lp(x, 2200) * k + lp(x, 500) * (1 - k)) * e
def padn(ms, d):
    t = T(d); x = sum(saw(mtof(m) * 2 ** (c / 1200), d, 14) for m in ms for c in (-7, 0, 7)); return lp(x, 1400) * np.minimum(t / .35, 1) * np.minimum((d - t) / .3, 1) / 9
def stab(ms, d): return lp(sum(pulse(mtof(m), d, .4) for m in ms), 3000) * ad(d, .002, .09) / 3
def pluck(m, d): f = mtof(m); return (sine(f, d) + .35 * sine(2 * f, d)) * ad(d, .003, .13)
def arpn(m, d): return pulse(mtof(m), d, .25) * ad(d, .001, .09)
def lead(m, d):
    t = T(d); f = mtof(m) * 2 ** (np.minimum(t / .15, 1) * 12 * np.sin(2 * np.pi * 5.5 * t) / 1200); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + .5 * np.sin(2 * ph) + .33 * np.sin(3 * ph) + .2 * np.sign(np.sin(ph)); return lp(x, 3800) * np.minimum(t / .015, 1) * np.minimum((d - t) / .08, 1) * .5
def stem(action):
    L = {k: np.zeros(2 * NL + SR) for k in ("drums", "bass", "pad", "stab", "arp", "lead")}
    def put(k, x, step, v=1.):
        for c in (0, 1):
            i = int((step + c * STEPS) * SPB * SR); L[k][i:i + len(x)] += x[:max(0, len(L[k]) - i)] * v
    for b, (root, ch) in enumerate(BARS):
        s0 = b * 16; bar = 16 * SPB; tones = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24]
        put("pad", padn(ch, bar), s0, .24 if action else .42)
        if action:
            for st in (0, 4, 8, 12): put("drums", kick(), s0 + st, .9)
            if b in (3, 7): put("drums", kick(), s0 + 14, .8); put("drums", snare(), s0 + 15, .45)
            for st in (4, 12): put("drums", snare(), s0 + st, .7)
            for st in range(0, 16, 2): put("drums", hat(st == 14 and b % 2 == 1), s0 + st, .55 if st % 4 else .8)
            for st in range(1, 16, 2): put("drums", hat(), s0 + st, .18)
            for st in range(0, 16, 2): put("bass", bassn(root + (12 if st in (6, 14) else 0), 1.7 * SPB), s0 + st, .75)
            for st in (2, 6, 10, 14): put("stab", stab(ch, .8 * SPB), s0 + st, .5)
            for i in range(16): put("arp", arpn(tones[[0, 1, 2, 3, 2, 1, 2, 1][i % 8]], 1.5 * SPB), s0 + i, .42 if i % 4 == 0 else .3)
        else:
            for st in (0, 8): put("bass", bassn(root, 7 * SPB), s0 + st, .55)
            for st in (0, 3, 6, 8, 11, 14): put("arp", pluck(tones[[0, 2, 1, 3, 2, 1][(0, 3, 6, 8, 11, 14).index(st)]], 3 * SPB), s0 + st, .38)
            for st in (2, 6, 10, 14): put("drums", hat(), s0 + st, .2)
    if action:
        for st, ln, m in MEL: put("lead", lead(m, ln * SPB * 1.05), st, .8)
    def echo(x, k=3, fb=.38):
        d = int(k * SPB * SR); y = x.copy()
        for n in range(1, 5): y[d * n:] += x[:len(x) - d * n] * fb ** n
        return y
    mix = L["drums"] * .9 + L["bass"] * .8 + L["pad"] + L["stab"] * .6 + echo(L["arp"] + L["lead"] * 1.1)
    return verb(mix, .9, .1, 6000, False)[NL:2 * NL]
def build():
    os.makedirs(ROOT + "/sfx", exist_ok=True); os.makedirs(ROOT + "/music", exist_ok=True); data = {"sfx": {}, "music": {}}; report = []
    for n, (fn, pk) in SFX.items():
        x = fin(fn(), pk, n in LOOPS); p = f"{ROOT}/sfx/{n}.wav"; wav(p, x); data["sfx"][n] = base64.b64encode(open(p, "rb").read()).decode()
        report.append((n, len(x) / SR, int(np.abs(x).max()), int(np.sqrt((x.astype(float) ** 2).mean()))))
    calm, act = stem(False), stem(True); g = .8 / max(np.abs(calm).max(), np.abs(act).max())
    for n, x in (("calm", calm), ("action", act)):
        y = signal.resample_poly(x * g, 320, 441); y = (y * 32767).astype(np.int16); p = f"{ROOT}/music/{n}.wav"; wav(p, y, 32000)
        data["music"][n] = base64.b64encode(open(p, "rb").read()).decode(); report.append(("music_" + n, len(y) / 32000, int(np.abs(y).max()), int(np.sqrt((y.astype(float) ** 2).mean()))))
    open(ROOT + "/audio-data.js", "w").write("// Generated by tools/make_audio.py. Base64 WAV data so the game also works when opened straight from disk.\nwindow.AUDIO_DATA = " + json.dumps(data) + ";\n")
    for r in report: print("%-14s %5.2fs peak %5d rms %5d" % r)
if __name__ == "__main__": build()
