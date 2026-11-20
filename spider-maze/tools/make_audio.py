#!/usr/bin/env python3
"""Synthesises every Spider Maze sound (SFX + 2 adaptive music stems: Brazilian Phonk & Calm)
as WAV files and bundles them into audio/audio-data.js.
Run from this folder: python3 make_audio.py (needs numpy + scipy)."""
import numpy as np, wave, os, json, base64
from scipy import signal

SR = 44100
rng = np.random.default_rng(42)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "audio")
T = lambda d: np.arange(int(d * SR)) / SR
nz = lambda d: rng.standard_normal(int(d * SR))
mtof = lambda m: 440.0 * (2.0 ** ((m - 69.0) / 12.0))

def lp(x, fc, o=4):
    return signal.sosfilt(signal.butter(o, min(fc, SR * 0.45) / (SR / 2), 'low', output='sos'), x)

def hp(x, fc, o=4):
    return signal.sosfilt(signal.butter(o, fc / (SR / 2), 'high', output='sos'), x)

def bp(x, a, b, o=3):
    return signal.sosfilt(signal.butter(o, [a / (SR / 2), min(b, SR * 0.45) / (SR / 2)], 'band', output='sos'), x)

def M(*a):
    n = max(len(x) for x in a)
    o = np.zeros(n)
    for x in a: o[:len(x)] += x
    return o

def at(x, s):
    return np.r_[np.zeros(int(s * SR)), x]

def sine(f, d):
    return np.sin(2 * np.pi * f * T(d))

def sweep(f0, f1, d):
    t = T(d)
    return np.sin(2 * np.pi * np.cumsum(f0 * (f1 / f0) ** (t / d)) / SR)

def saw(f, d, h=24):
    t = T(d); x = np.zeros_like(t); k = 1
    while k <= h and f * k < SR / 2.2:
        x += np.sin(2 * np.pi * f * k * t) / k
        k += 1
    return x * (2.0 / np.pi)

def pulse(f, d, duty=0.5):
    return lp(signal.square(2 * np.pi * f * T(d), duty), 7000, 2)

def ad(d, a, tau):
    t = T(d)
    return np.minimum(t / max(a, 1e-4), 1.0) * np.exp(-t / tau)

def bell(f, d, ratio=2.0, idx=3.0, dec=0.15):
    t = T(d)
    mod = idx * np.exp(-t / (dec * 0.6)) * np.sin(2 * np.pi * f * ratio * t)
    return np.sin(2 * np.pi * f * t + mod) * ad(d, 0.001, dec)

def verb(x, rt=0.6, mix=0.18, dark=5000, keep=True):
    n = int(rt * SR); t = np.arange(n) / SR
    ir = lp(rng.standard_normal(n) * np.exp(-6.9 * t / rt), dark, 2)
    ir[0] = 0; ir /= np.sqrt((ir ** 2).sum() + 1e-9)
    w = signal.fftconvolve(x, ir)
    o = np.zeros(len(w))
    o[:len(x)] = x
    o += w * mix * 2.0
    return o if keep else o[:len(x)]

def pnoise(d, lo, hi):
    n = int(d * SR); s = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR)
    return np.fft.irfft(s * ((f > lo) & (f < hi)), n)

# ---------------------------------------------------------------- SFX (Punchy Cartoon & Arcade)
def coin():
    # Crisp arcade star sparkle chime with bright harmonics
    d = 0.45; t = T(d)
    n1 = bell(1568.0, 0.35, 2.0, 2.5, 0.12) # G6
    n2 = at(bell(2093.0, 0.35, 2.0, 2.8, 0.14), 0.04) # C7
    n3 = at(bell(2637.0, 0.35, 2.0, 3.0, 0.16), 0.08) # E7
    sparkle = hp(nz(d), 6500) * np.exp(-t / 0.03) * 0.45
    twinkle = sine(3136.0, 0.25) * np.exp(-T(0.25) / 0.05) * 0.35
    return verb(np.tanh(M(n1 * 0.7, n2 * 0.8, n3 * 0.9, sparkle, at(twinkle, 0.06)) * 1.5), 0.3, 0.12)

def hit():
    # Heavy comic smack + punchy 808 impact crunch with sub drop
    d = 0.55; t = T(d)
    f = 160 * np.exp(-t / 0.02) + 40
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12) * 1.3
    slap = hp(nz(d), 2800) * np.exp(-t / 0.015) * 1.2
    crunch = bp(nz(d), 600, 2400) * np.exp(-t / 0.06) * 1.0
    body = lp(saw(85, d, 8), 1200) * np.exp(-t / 0.08) * 0.7
    return verb(np.tanh(M(sub * 1.4, slap, crunch, body) * 2.2), 0.3, 0.15)

def heal():
    d = 0.75
    parts = []
    for i, f in enumerate([587.33, 739.99, 880.0, 1174.66]):
        parts.append(at(bell(f, 0.5, 2.0, 2.0, 0.18) * 0.45, i * 0.07))
    pad = M(*[sine(f, 0.75) * np.minimum(T(0.75) / 0.2, 1) * np.exp(-T(0.75) / 0.4) * 0.15 for f in (587.33, 880.0)])
    shimmer = hp(nz(0.75), 6000) * np.exp(-T(0.75) / 0.1) * 0.2
    return verb(M(*parts, pad, shimmer), 0.7, 0.25)

def shield():
    # Power-up energy surge
    d = 0.6; t = T(d)
    sw = sweep(150, 2200, d) * ad(d, 0.01, 0.35) * 0.7
    sw_harm = sweep(300, 4400, d) * ad(d, 0.01, 0.25) * 0.4
    chime = M(*[at(bell(f, 0.4, 2.0, 1.8, 0.15) * 0.5, 0.25 + k * 0.06) for k, f in enumerate([1760, 2349, 3136])])
    return verb(np.tanh(M(sw, sw_harm, chime) * 1.5), 0.6, 0.2)

def shield_block():
    # Resonant metallic Captain America vibranium shield clank ("CLANG!")
    d = 0.55; t = T(d)
    # Metallic modal frequencies
    ping = sum(np.sin(2 * np.pi * 840 * r * t) * np.exp(-t / dec) * amp
               for r, dec, amp in [(1.0, 0.22, 1.0), (2.74, 0.16, 0.7), (5.38, 0.11, 0.5), (8.89, 0.07, 0.35), (11.5, 0.04, 0.2)])
    ricochet = hp(nz(d), 3500) * np.exp(-t / 0.008) * 0.85
    ring = sine(840 * 2.74, d) * np.exp(-t / 0.3) * 0.4
    return verb(np.tanh(M(ping * 1.1, ricochet, ring) * 1.8), 0.4, 0.18)

def shield_end():
    d = 0.4; return verb(np.tanh(sweep(1200, 180, d) * ad(d, 0.002, 0.18) * 2.0) * 0.8, 0.25, 0.1)

def shield_tick():
    return M(sine(1800, 0.05) * ad(0.05, 0.001, 0.015) * 0.8, hp(nz(0.04), 5000) * np.exp(-T(0.04) / 0.005) * 0.3)

def laser_on():
    # Sizzling high-voltage neon zap
    d = 0.5; t = T(d)
    buzz = (saw(120, d, 20) + saw(123, d, 20)) * ad(d, 0.002, 0.25) * 0.7
    crackle = hp(nz(d), 2800) * np.exp(-t / 0.08) * 0.95
    pew = sweep(2400, 320, 0.18) * ad(0.18, 0.002, 0.09) * 0.8
    return verb(np.tanh(M(buzz, crackle, pew) * 1.9), 0.3, 0.15)

def laser_off():
    d = 0.25; return verb(np.tanh(sweep(1600, 100, d) * ad(d, 0.002, 0.09) * 1.5), 0.2, 0.1)

def laser_hum():
    # Electrical transformer hum with pulsating sizzle
    d = 1.0; t = T(d)
    core = sum(np.sin(2 * np.pi * 120 * k * t) / (k ** 0.85) for k in range(1, 12)) * (0.8 + 0.2 * np.sin(2 * np.pi * 6 * t))
    sizzle = pnoise(d, 2400, 8000) * 0.14 * (0.7 + 0.3 * np.sin(2 * np.pi * 12 * t))
    return core * 0.55 + sizzle

def saw_loop():
    # Sharp industrial grinding saw blade
    d = 1.0; t = T(d)
    whir = saw(165, d, 28) * (0.7 + 0.3 * np.sin(2 * np.pi * 24 * t))
    grate = pnoise(d, 2800, 7500) * (0.6 + 0.4 * np.sin(2 * np.pi * 48 * t)) * 0.65
    metal = sine(2100, d) * 0.12 * (1 + np.sin(2 * np.pi * 32 * t))
    return whir * 0.6 + grate * 0.5 + metal

def wall_whoosh():
    d = 0.9; t = T(d); g = lambda c, w: np.exp(-((t - c) / w) ** 2)
    air = bp(nz(d), 350, 1800) * g(0.45, 0.18) * 1.2
    scrape = lp(saw(110, d, 16), 1200) * g(0.45, 0.25) * 0.7
    return verb(M(air, scrape), 0.3, 0.1)

def bounce():
    # Cartoon spring trampoline launch ("BOING!")
    d = 0.55; t = T(d)
    wobble = 26.0 * np.sin(2 * np.pi * 20.0 * t)
    f = 140.0 + 400.0 * (t / d) ** 0.65 + wobble
    ph = 2 * np.pi * np.cumsum(f) / SR
    spring = (np.sin(ph) + 0.35 * np.sin(2 * ph)) * np.exp(-t / 0.22) * np.minimum(t / 0.003, 1)
    snap = bp(nz(d), 1500, 4500) * np.exp(-t / 0.025) * 0.5
    return verb(np.tanh((spring + snap) * 1.7) * 0.92, 0.3, 0.12)

def win():
    d = 2.4; t = T(d)
    notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    c = []
    for i, f in enumerate(notes):
        c.append(at(bell(f, 1.2, 2.0, 2.2, 0.35) * 0.6, i * 0.1))
    cym = hp(nz(1.5), 6000) * np.exp(-T(1.5) / 0.4) * 0.4
    chord = M(*[sine(f, 1.6) * np.exp(-T(1.6) / 0.8) * 0.25 for f in [523.25, 659.25, 783.99, 1046.5]])
    return verb(np.tanh(M(*c, at(cym, 0.4), at(chord, 0.4)) * 1.5), 1.0, 0.28)

def lose():
    d = 1.8; t = T(d)
    # Sad trombone wa-wa-wa
    def wah(f, s):
        d0 = 0.38; tt = T(d0)
        x = saw(f, d0, 12) * np.exp(-tt / 0.28) * (0.8 + 0.2 * np.sin(2 * np.pi * 6 * tt))
        return at(lp(x, 700) * 0.8, s)
    seq = [wah(220, 0), wah(207.65, 0.36), wah(196, 0.72), wah(185, 1.08)]
    thud = at(sine(50, 0.6) * np.exp(-T(0.6) / 0.15) * 0.9, 1.1)
    return verb(M(*seq, thud), 0.6, 0.18)

def start():
    d = 0.6; t = T(d)
    riser = sweep(180, 1100, d) * (t / d) ** 1.8 * 0.5
    chord = at(M(*[bell(f, 0.6, 2.0, 1.8, 0.22) * 0.4 for f in (587.33, 880.0, 1174.66)]), d * 0.85)
    return verb(M(riser, chord), 0.6, 0.2)

def click():
    return M(sweep(1200, 500, 0.03) * ad(0.03, 0.001, 0.01) * 0.8, hp(nz(0.02), 4500) * np.exp(-T(0.02) / 0.003) * 0.3)

def heartbeat():
    d = 0.85; x = np.zeros(int(d * SR))
    for s, a in [(0, 1.0), (0.18, 0.75)]:
        t = T(0.3); h = np.sin(2 * np.pi * np.cumsum(75 * np.exp(-t / 0.05) + 36) / SR) * np.exp(-t / 0.07) * a
        i = int(s * SR); x[i:i + len(h)] += h
    return lp(x, 200, 3) * 1.4

SFX = dict(coin=(coin, 0.92), hit=(hit, 0.98), heal=(heal, 0.85), shield=(shield, 0.88),
           shield_block=(shield_block, 0.92), shield_end=(shield_end, 0.8), shield_tick=(shield_tick, 0.7),
           laser_on=(laser_on, 0.88), laser_off=(laser_off, 0.75), laser_hum=(laser_hum, 0.65),
           saw_loop=(saw_loop, 0.7), wall_whoosh=(wall_whoosh, 0.8), bounce=(bounce, 0.92),
           win=(win, 0.92), lose=(lose, 0.9), start=(start, 0.88), click=(click, 0.6), heartbeat=(heartbeat, 0.88))
LOOPS = {"laser_hum", "saw_loop", "heartbeat"}

def fin(x, peak, loop=False):
    x = x - x.mean() * 0
    x = x / (np.abs(x).max() + 1e-9) * peak
    if not loop:
        n = int(0.006 * SR); x[-n:] *= np.linspace(1, 0, n); x[:int(0.001 * SR)] *= np.linspace(0, 1, int(0.001 * SR))
    return (x * 32767).astype(np.int16)

def wav(path, x, sr=SR):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(x.tobytes())

# ---------------------------------------------------------------- MUSIC: High-Energy Brazilian Phonk (134 BPM)
BPM = 134
SPB = 60.0 / BPM / 4.0   # 16th note step duration
STEPS = 64               # 4 bars, 16 steps per bar
NL = int(STEPS * SPB * SR)

def phonk_kick():
    # Hard-hitting 808 kick drum
    t = T(0.32)
    f = 175.0 * np.exp(-t / 0.028) + 44.0
    phase = 2 * np.pi * np.cumsum(f) / SR
    sub = np.sin(phase) * np.exp(-t / 0.15)
    click = hp(nz(0.32), 3200) * np.exp(-t / 0.004) * 0.65
    return np.tanh((sub * 1.8 + click) * 1.6) * 0.95

def phonk_clap():
    # Snappy trap / phonk clap
    d = 0.26; t = T(d)
    env = (np.exp(-t / 0.008) * 0.35 +
           np.exp(-np.abs(t - 0.011) / 0.009) * 0.45 +
           np.exp(-np.abs(t - 0.022) / 0.009) * 0.6 +
           np.exp(-np.maximum(0, t - 0.032) / 0.065) * 0.95)
    noise = bp(nz(d), 1100, 6800, 3) * env
    snap = np.sin(2 * np.pi * 240 * t) * np.exp(-t / 0.03) * 0.45
    return np.tanh((noise * 1.6 + snap) * 1.5) * 0.85

def phonk_hat(open_hat=False):
    d = 0.22 if open_hat else 0.05
    return hp(nz(d), 7500) * np.exp(-T(d) / (0.07 if open_hat else 0.014)) * 0.4

def phonk_cowbell(m, d):
    # Iconic Brazilian Phonk cowbell synth tone
    f = mtof(m); t = T(d)
    s1 = signal.square(2 * np.pi * f * t)
    s2 = signal.square(2 * np.pi * (f * 1.485) * t)
    filt = bp((s1 + s2) * 0.5, f * 0.75, min(f * 2.4, SR * 0.45), 4)
    env = np.exp(-t / 0.085) * np.minimum(t / 0.0015, 1.0)
    return np.tanh(filt * env * 2.4) * 0.85

def phonk_bass808(m, d):
    # Distorted sliding 808 sub-bass
    f = mtof(m); t = T(d)
    phase = 2 * np.pi * f * t
    sub = np.sin(phase) + 0.3 * np.sin(2 * phase)
    sat = np.tanh(sub * 2.8) * 0.85
    env = np.minimum(t / 0.006, 1.0) * np.exp(-t / (d * 0.92))
    return sat * env

def stem_phonk(action=True):
    L = {k: np.zeros(2 * NL + SR) for k in ("kick", "clap", "hat", "bass", "bell", "pad")}
    def put(k, x, step, v=1.0):
        for c in (0, 1):
            i = int((step + c * STEPS) * SPB * SR)
            if i < len(L[k]):
                L[k][i:i + len(x)] += x[:max(0, len(L[k]) - i)] * v

    # 4-bar phonk progression in A minor (A, F, G, E)
    chords = [
        (45, [57, 60, 64]), # Am
        (41, [53, 57, 60]), # F
        (43, [55, 59, 62]), # G
        (40, [52, 55, 59])  # Em
    ]

    # Catchy Phonk Cowbell Hook (Step, Duration in 16ths, MIDI Note)
    # Riff: A5, A5, C6, A5, D6, C6, G5, E5
    cowbell_riff = [
        (0, 2, 81), (3, 2, 81), (6, 2, 84), (8, 2, 81),
        (11, 2, 86), (14, 2, 84),
        (16, 2, 79), (19, 2, 79), (22, 2, 81), (24, 2, 79),
        (27, 2, 84), (30, 2, 81),
        (32, 2, 81), (35, 2, 81), (38, 2, 84), (40, 2, 81),
        (43, 2, 86), (46, 2, 88),
        (48, 2, 84), (51, 2, 81), (54, 2, 79), (56, 2, 76),
        (59, 2, 79), (62, 2, 81)
    ]

    for bar_idx, (root, ch) in enumerate(chords):
        s0 = bar_idx * 16

        # Drums
        if action:
            # 808 Kick: syncopated rhythm
            for st in (0, 3, 6, 8, 11, 14):
                put("kick", phonk_kick(), s0 + st, 0.95)
            # Snappy Clap on 4 and 12 (standard 2 & 4)
            for st in (4, 12):
                put("clap", phonk_clap(), s0 + st, 0.9)
            # Fast Hi-Hats: 16th notes with open hats at transitions
            for st in range(0, 16):
                open_h = (st in (6, 14))
                put("hat", phonk_hat(open_h), s0 + st, 0.7 if st % 2 == 0 else 0.45)
            # 808 Bass: following the kick
            for st in (0, 3, 6, 8, 11, 14):
                put("bass", phonk_bass808(root, 2.5 * SPB), s0 + st, 0.85)
        else:
            # Calm ambient stem: softer pulse
            for st in (0, 8):
                put("kick", phonk_kick(), s0 + st, 0.45)
            for st in (4, 12):
                put("clap", phonk_clap(), s0 + st, 0.35)
            for st in range(0, 16, 2):
                put("hat", phonk_hat(False), s0 + st, 0.25)
            put("bass", phonk_bass808(root, 7.0 * SPB), s0, 0.5)

        # Pad atmosphere
        pad_t = T(16 * SPB)
        pad_wave = sum(saw(mtof(m), 16 * SPB, 10) for m in ch) * 0.25
        pad_wave = lp(pad_wave, 900 if action else 1200) * np.minimum(pad_t / 0.1, 1) * np.minimum((16 * SPB - pad_t) / 0.1, 1)
        put("pad", pad_wave, s0, 0.3 if action else 0.5)

    if action:
        for st, ln, note in cowbell_riff:
            put("bell", phonk_cowbell(note, ln * SPB * 1.1), st, 0.88)
    else:
        # In calm mode, cowbell is muted/very gentle
        for st, ln, note in cowbell_riff[::2]:
            put("bell", phonk_cowbell(note - 12, ln * SPB * 0.8), st, 0.25)

    mix = (L["kick"] * 1.0 + L["clap"] * 0.95 + L["hat"] * 0.65 +
           L["bass"] * 0.95 + L["bell"] * 0.9 + L["pad"] * 0.5)
    return verb(mix, 0.7, 0.12, 6500, False)[NL:2 * NL]

def build():
    os.makedirs(ROOT + "/sfx", exist_ok=True)
    os.makedirs(ROOT + "/music", exist_ok=True)
    data = {"sfx": {}, "music": {}}
    report = []
    print("Synthesizing SFX...")
    for n, (fn, pk) in SFX.items():
        x = fin(fn(), pk, n in LOOPS)
        p = f"{ROOT}/sfx/{n}.wav"
        wav(p, x)
        data["sfx"][n] = base64.b64encode(open(p, "rb").read()).decode()
        report.append((n, len(x) / SR, int(np.abs(x).max()), int(np.sqrt((x.astype(float) ** 2).mean()))))

    print("Music bundled: NONE (SFX-only mode for YouTube Shorts safe audio mapping)")
    data["music"] = {}

    open(ROOT + "/audio-data.js", "w").write(
        "// Generated by tools/make_audio.py. High-energy Brazilian Phonk + Punchy SFX bundle.\nwindow.AUDIO_DATA = " + json.dumps(data) + ";\n"
    )
    for r in report:
        print("%-14s %5.2fs peak %5d rms %5d" % r)
    print("Audio rebuild complete!")

if __name__ == "__main__":
    build()
