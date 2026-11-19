#!/usr/bin/env python3
"""Spider Maze level maker. Example:
python3 make_level.py --name "Level 2" --cols 8 --rows 15 --lasers 4 --saws 4 --wall-blades 4 \
  --friends spiderman --enemies venom --out ../levels/level2.js
Characters: 1 to 6 in total. Every name must exist in assets.js (window.ASSETS)."""
import argparse, json, random
ap = argparse.ArgumentParser()
for k, v in [("name", "Level 1"), ("cols", 7), ("rows", 13), ("lasers", 3), ("saws", 3), ("wall-blades", 3), ("shields", 2), ("heals", 2), ("min-path", 48), ("seed", -1)]:
    ap.add_argument("--" + k, type=type(v), default=v)
ap.add_argument("--friends", default="spiderman"); ap.add_argument("--enemies", default=""); ap.add_argument("--out", default="level.js")
a = ap.parse_args(); CW, CH = a.cols, a.rows
fr = [n for n in a.friends.split(",") if n]; en = [n for n in a.enemies.split(",") if n]
assert 1 <= len(fr) + len(en) <= 6, "use 1 to 6 characters in total"
D = [(1, 0), (-1, 0), (0, 1), (0, -1)]
def gen(seed):
    r = random.Random(seed); seen = {(0, 0)}; links = set(); st = [(0, 0)]; last = None
    while st:
        x, y = st[-1]; o = [(x + p, y + q, (p, q)) for p, q in D if 0 <= x + p < CW and 0 <= y + q < CH and (x + p, y + q) not in seen]
        if not o: st.pop(); last = None; continue
        pk = next((c for c in o if c[2] == last), None) if last and r.random() < .8 else None
        nx, ny, d = pk or r.choice(o); seen.add((nx, ny)); links.add(frozenset(((x, y), (nx, ny)))); st.append((nx, ny)); last = d
    return links
nb = lambda L, c: [(c[0] + p, c[1] + q) for p, q in D if frozenset((c, (c[0] + p, c[1] + q))) in L]
def bfs(L, s, e):
    pr = {s: None}; qu = [s]
    for c in qu:
        for n in nb(L, c):
            if n not in pr: pr[n] = c; qu.append(n)
    out = []; c = e
    while c: out.append(c); c = pr[c]
    return out[::-1]
S, E = (0, 0), (CW - 1, CH - 1); cells = [(x, y) for x in range(CW) for y in range(CH)]
if a.seed >= 0: seed = a.seed
else:
    best = None
    for sd in range(4000):
        L = gen(sd); n = len(bfs(L, S, E)); de = sum(len(nb(L, c)) == 1 for c in cells)
        sc = (n < a.min_path, de, -n)
        if best is None or sc < best[0]: best = (sc, sd)
    seed = best[1]
L = gen(seed); sol = bfs(L, S, E); r = random.Random(5)
for c in [c for c in cells if len(nb(L, c)) == 1 and c not in sol][:2]:
    o = [n for n in [(c[0] + p, c[1] + q) for p, q in D] if 0 <= n[0] < CW and 0 <= n[1] < CH and frozenset((c, n)) not in L]
    if o: L.add(frozenset((c, r.choice(o))))
sol = bfs(L, S, E); W, H = CW * 3 + 1, CH * 3 + 1
g = [[1] * W for _ in range(H)]
for y in range(CH):
    for x in range(CW):
        for p in (1, 2):
            for q in (1, 2): g[3 * y + p][3 * x + q] = 0
for l in L:
    (p, q), (c, d) = sorted(l)
    if c > p: g[3 * q + 1][3 * p + 3] = g[3 * q + 2][3 * p + 3] = 0
    elif d > q: g[3 * q + 3][3 * p + 1] = g[3 * q + 3][3 * p + 2] = 0
ctr = lambda c: [3 * c[0] + 2, 3 * c[1] + 2]
def straight(c):
    n = nb(L, c); return len(n) == 2 and n[0][0] - c[0] == -(n[1][0] - c[0]) and n[0][1] - c[1] == -(n[1][1] - c[1])
used = {S, E}; lasers = []; saws = []; wsaws = []; enemies = []
def pick(f, ok):
    i = int(f * len(sol))
    while i < len(sol) - 3 and not ok(i): i += 1
    return i if ok(i) else None
ok1 = lambda i: straight(sol[i]) and sol[i] not in used
def ok2(i):
    p, q, z = sol[i], sol[i + 1], sol[i - 1]
    return straight(p) and straight(q) and p not in used and q not in used and p[0] - q[0] == z[0] - p[0] and p[1] - q[1] == z[1] - p[1]
cnt = {"laser": a.lasers, "saw": a.saws, "wall": a.wall_blades}; seq = []
while any(cnt.values()):
    for t in cnt:
        if cnt[t]: seq.append(t); cnt[t] -= 1
for k, t in enumerate(seq):
    f = .16 + .78 * k / max(1, len(seq) - 1)
    if t == "saw":
        i = pick(f, ok2)
        if i is not None: p, q = sol[i], sol[i + 1]; used |= {p, q}; saws.append(ctr(p) + ctr(q))
        continue
    i = pick(f, ok1)
    if i is None: continue
    c = sol[i]; horiz = nb(L, c)[0][1] == c[1]
    if t == "laser": used.add(c); lasers.append(ctr(c) + ['v' if horiz else 'h'])
    else:  # wall blade: starts in this corridor and slides through the wall into the neighbouring corridor
        s0 = r.choice((-1, 1))
        for sg in (s0, -s0):
            n = [0, sg] if horiz else [sg, 0]; b = (c[0] + n[0], c[1] + n[1])
            if 0 <= b[0] < CW and 0 <= b[1] < CH: used.add(c); wsaws.append(ctr(c) + n + [round(r.random() * 4800)]); break
        else: continue
for k, nme in enumerate(en):
    i = pick(.45 + .45 * k / max(1, len(en)), ok2)
    if i is not None: p, q = sol[i], sol[i + 1]; used |= {p, q}; enemies.append(ctr(p) + ctr(q) + [nme])
def free(f):
    i = int(f * len(sol))
    while sol[i] in used or sol[i] == S: i += 1
    used.add(sol[i]); return ctr(sol[i])
shields = [free(.08 + .42 * k / max(1, a.shields - 1)) for k in range(a.shields)]
des = [c for c in cells if len(nb(L, c)) == 1 and c not in used and c not in (S, E)]
heals = [ctr(c) for c in des[-a.heals:]]
while len(heals) < a.heals: heals.append(free(.3 + .4 * len(heals) / max(1, a.heals)))
skip = {tuple(h) for h in heals} | {tuple(s) for s in shields}
coins = [ctr(c) for c in cells if c not in used and c not in (S, E) and tuple(ctr(c)) not in skip]
lv = {"name": a.name, "W": W, "H": H, "walls": ["".join(map(str, row)) for row in g], "start": S, "exit": E, "coins": coins, "saws": saws, "wsaws": wsaws,
      "lasers": lasers, "bubbles": heals, "shields": shields, "enemies": enemies, "cast": {"friends": fr, "enemies": en}}
open(a.out, "w").write("(window.LEVELS = window.LEVELS || []).push(" + json.dumps(lv, separators=(",", ":")) + ");\n")
print(a.name, "seed", seed, "path", len(sol), "coins", len(coins), "blades", len(saws), "wall blades", len(wsaws), "lasers", len(lasers), "shields", len(shields), "heals", len(heals), "enemies", len(enemies))
