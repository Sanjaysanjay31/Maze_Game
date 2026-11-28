"""Update Tom & Cherry levels (tc_levels.js) with side-route shields, bombs,
wall-attached Red->Green switches, and Opposing 3D Zigzag Cone Spikes,
then run an exhaustive solvability & geometry verifier on all 6 levels.
"""

import json
import os
from collections import deque

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TC_LEVELS = os.path.join(ROOT, "tc_levels.js")


def open_doorway(walls_grid, cw, ch, c1, c2):
    """Carve a 2-tile-wide corridor doorway between adjacent grid cells c1 and c2,
    making sure c2's 2x2 center room tiles are also carved open."""
    i1, j1 = c1
    i2, j2 = c2
    di, dj = i2 - i1, j2 - j1
    assert abs(di) + abs(dj) == 1, f"Cells {c1} and {c2} must be orthogonally adjacent"

    # Carve 2x2 center of both cells
    for ci, cj in (c1, c2):
        for dx in (1, 2):
            for dy in (1, 2):
                walls_grid[3 * cj + dy][3 * ci + dx] = "0"

    # Carve 2-tile doorway on the wall separator between c1 and c2
    if di == 1:
        wx = 3 * (i1 + 1)
        for dy in (1, 2):
            walls_grid[3 * j1 + dy][wx] = "0"
    elif di == -1:
        wx = 3 * i1
        for dy in (1, 2):
            walls_grid[3 * j1 + dy][wx] = "0"
    elif dj == 1:
        wy = 3 * (j1 + 1)
        for dx in (1, 2):
            walls_grid[wy][3 * i1 + dx] = "0"
    elif dj == -1:
        wy = 3 * j1
        for dx in (1, 2):
            walls_grid[wy][3 * i1 + dx] = "0"


def has_adjacent_wall(walls_grid, x, y, side):
    H, W = len(walls_grid), len(walls_grid[0])
    for d in (1, 2):
        if side == "left" and x - d >= 0 and walls_grid[y][x - d] == "1":
            return True
        if side == "right" and x + d < W and walls_grid[y][x + d] == "1":
            return True
        if side == "top" and y - d >= 0 and walls_grid[y - d][x] == "1":
            return True
        if side == "bottom" and y + d < H and walls_grid[y + d][x] == "1":
            return True
    return False


def main():
    with open(TC_LEVELS, "r", encoding="utf-8") as f:
        raw = f.read()

    levels = json.loads(raw[raw.index("["):raw.rindex("]") + 1])
    # Support idempotent runs on 6 or 7 levels (preserve original L3 base when building L7)
    base_l3 = json.loads(json.dumps(levels[2]))

    # ------------------------------------------------------------------
    # LEVEL 1 (Solo Tom, theme=blue)
    # ------------------------------------------------------------------
    l1 = levels[0]
    l1["shields"] = [[8, 32], [14, 14]]   # Widely spaced inner branches (>18 tiles apart)
    l1["bombs"] = [[11, 17]]              # Center inner branch (far from start [2,2])
    l1["switches"] = [
        {
            "id": "sw1",
            "x": 5,
            "y": 2,
            "side": "top",
            "toggle": True,
            "color": "#00e676",
            "targets": ["sp1", "sp2"],
            "msg": "Green Switch! Zigzag Spikes Opened!",
            "closeMsg": "Red Switch! Zigzag Spikes Closed!"
        }
    ]
    l1["spikes"] = [
        {"id": "sp1", "x": 20, "y": 32, "dir": "v"},
        {"id": "sp2", "x": 20, "y": 5, "dir": "v"}
    ]

    # ------------------------------------------------------------------
    # LEVEL 2 (Co-op Duo: Tom + Cherry, theme=blue)
    # ------------------------------------------------------------------
    l2 = levels[1]
    l2["shields"] = [[2, 11], [14, 14]]         # True 1-way dead-end pockets spaced apart
    l2["bombs"] = [[14, 2], [20, 11]]           # Widely separated opposite wings
    l2["switches"] = [
        {
            "id": "sw1", "hero": "cherry", "x": 20, "y": 8, "side": "right",
            "toggle": True, "color": "#00e676",
            "targets": ["gate1", "sp1"],
            "msg": "Green Switch! Cherry unlocked Gate 1 & Spikes for Tom!",
            "closeMsg": "Red Switch! Gate 1 & Spikes Closed!"
        },
        {
            "id": "sw2", "hero": "tom", "x": 2, "y": 20, "side": "left",
            "toggle": True, "color": "#00e676",
            "targets": ["gate2", "sp2"],
            "msg": "Green Switch! Tom unlocked Gate 2 & Spikes for Cherry!",
            "closeMsg": "Red Switch! Gate 2 & Spikes Closed!"
        },
        {
            "id": "sw3", "hero": "cherry", "x": 20, "y": 38, "side": "right",
            "color": "#00e676",
            "targets": ["gate3", "sp3"],
            "msg": "Green Switch! Cherry opened the Vault Gate & Spikes!"
        }
    ]
    l2["spikes"] = [
        {"id": "sp1", "x": 5, "y": 29, "dir": "h"},
        {"id": "sp2", "x": 17, "y": 23, "dir": "h"},
        {"id": "sp3", "x": 8, "y": 38, "dir": "v"}
    ]

    # ------------------------------------------------------------------
    # LEVEL 3 (Matrix Gauntlet: Tom + Cherry, theme=blue)
    # ------------------------------------------------------------------
    l3 = levels[2]
    w3 = [list(r) for r in l3["walls"]]
    open_doorway(w3, 7, 18, (2, 10), (2, 9))  # Make existing isolated coin (8, 29) a true dead-end pocket
    l3["walls"] = ["".join(r) for r in w3]
    l3["shields"] = [[8, 17], [14, 35]]        # Spaced far from starts & from each other
    l3["bombs"] = [[5, 26], [20, 29]]          # Widely spaced mid/lower side branches
    l3["switches"] = [
        {
            "id": "sw1", "hero": "cherry", "x": 20, "y": 8, "side": "right",
            "toggle": True, "color": "#00e676",
            "targets": ["gate1", "sp1"],
            "msg": "Green Switch! Cherry unlocked Gate 1 & Tom's Spikes!",
            "closeMsg": "Red Switch! Gate 1 & Spikes Closed!"
        },
        {
            "id": "sw2", "hero": "tom", "x": 2, "y": 20, "side": "left",
            "toggle": True, "color": "#00e676",
            "targets": ["gate2", "laser_spidey", "sp2"],
            "msg": "Green Switch! Tom unlocked Gate 2 & Cherry's Spikes!",
            "closeMsg": "Red Switch! Gate 2 & Spikes Closed!"
        },
        {
            "id": "sw3", "hero": "cherry", "x": 20, "y": 38, "side": "right",
            "color": "#00e676",
            "targets": ["gate3", "laser_gwen", "sp3"],
            "msg": "Green Switch! Cherry opened Titanium Gate & Spikes!"
        },
        {
            "id": "sw4", "hero": "tom", "x": 2, "y": 44, "side": "left",
            "color": "#00e676",
            "targets": ["gate_vault", "laser_vault"],
            "msg": "Green Switch! Tom opened the Master Vault Chamber!"
        }
    ]
    l3["spikes"] = [
        {"id": "sp1", "x": 5, "y": 29, "dir": "v"},
        {"id": "sp2", "x": 17, "y": 35, "dir": "h"},
        {"id": "sp3", "x": 2, "y": 41, "dir": "v"}
    ]

    # ------------------------------------------------------------------
    # LEVEL 4 (Tom & Friends Trio, theme=blue)
    # ------------------------------------------------------------------
    l4 = levels[3]
    w4 = [list(r) for r in l4["walls"]]
    # Carve true 1-way dead-end side pockets for Shields & Bombs
    open_doorway(w4, 7, 18, (0, 4), (0, 5))   # [2, 17] Shield pocket (Tom)
    open_doorway(w4, 7, 18, (6, 4), (6, 5))   # [20, 17] Shield pocket (Cherry)
    open_doorway(w4, 7, 18, (1, 9), (0, 9))   # [2, 29] Bomb pocket (Tom)
    open_doorway(w4, 7, 18, (5, 9), (6, 9))   # [20, 29] Bomb pocket (Cherry)
    open_doorway(w4, 7, 18, (3, 9), (2, 9))   # [8, 29] Bomb pocket (Bulldog)
    l4["walls"] = ["".join(r) for r in w4]
    l4["shields"] = [[2, 17], [20, 17]]
    l4["bombs"] = [[2, 29], [20, 29]]
    for sw in l4["switches"]:
        if sw["id"] == "sw1":
            sw["targets"] = list(dict.fromkeys(sw["targets"] + ["sp2"]))
            sw["toggle"] = True
        elif sw["id"] == "sw2":
            sw["targets"] = list(dict.fromkeys(sw["targets"] + ["sp1"]))
            sw["toggle"] = True
        elif sw["id"] == "sw3":
            sw["side"] = "left"
            sw["targets"] = list(dict.fromkeys(sw["targets"] + ["sp3"]))
    l4["spikes"] = [
        {"id": "sp1", "x": 5, "y": 17, "dir": "v"},
        {"id": "sp2", "x": 17, "y": 17, "dir": "v"},
        {"id": "sp3", "x": 8, "y": 38, "dir": "v"}
    ]

    # ------------------------------------------------------------------
    # LEVELS 5 & 6 (Buffalo Boss theme=blue, Villain Trio Showdown theme=purple)
    # ------------------------------------------------------------------
    for l_boss in (levels[4], levels[5]):
        wb = [list(r) for r in l_boss["walls"]]
        # Open isolated coin pockets (5,14) and (17,14) into true dead-ends
        open_doorway(wb, 7, 18, (0, 4), (1, 4))   # [5, 14] coin pocket
        open_doorway(wb, 7, 18, (6, 4), (5, 4))   # [17, 14] coin pocket
        # Carve side-pocket alcoves for Shields & Bombs off main routes
        open_doorway(wb, 7, 18, (0, 5), (1, 5))   # [5, 17] Shield pocket 1
        open_doorway(wb, 7, 18, (6, 5), (5, 5))   # [17, 17] Shield pocket 2
        open_doorway(wb, 7, 18, (2, 10), (2, 9))  # [8, 29] Bomb pocket 1
        open_doorway(wb, 7, 18, (3, 12), (4, 12)) # [14, 38] Bomb pocket 2
        l_boss["walls"] = ["".join(r) for r in wb]
        l_boss["shields"] = [[5, 17], [17, 17]]
        l_boss["bombs"] = [[8, 29], [14, 38]]
        for sw in l_boss["switches"]:
            if sw["id"] == "sw1":
                sw["targets"] = list(dict.fromkeys(sw["targets"] + ["sp2"]))
                sw["toggle"] = True
            elif sw["id"] == "sw2":
                sw["targets"] = list(dict.fromkeys(sw["targets"] + ["sp1"]))
                sw["toggle"] = True
            elif sw["id"] == "sw6":
                sw["targets"] = list(dict.fromkeys(sw["targets"] + ["sp3"]))
        l_boss["spikes"] = [
            {"id": "sp1", "x": 8, "y": 35, "dir": "v"},
            {"id": "sp2", "x": 14, "y": 29, "dir": "v"},
            {"id": "sp3", "x": 11, "y": 44, "dir": "v"}
        ]

    # ------------------------------------------------------------------
    # LEVEL 7 (Tom & Cherry Only, ~1-minute Matrix Blitz, wide spacing!)
    # ------------------------------------------------------------------
    l7 = json.loads(json.dumps(base_l3))
    w7 = [list(r) for r in l7["walls"]]
    open_doorway(w7, 7, 18, (2, 10), (2, 9))  # Open isolated coin (8, 29)
    l7["walls"] = ["".join(r) for r in w7]
    l7["name"] = "Level 7: Matrix Blitz"
    l7["theme"] = "blue"
    l7["start"] = [1, 0]
    l7["start2"] = [5, 0]
    l7.pop("start3", None)
    l7.pop("hero3", None)
    l7["cast"] = {"friends": ["tom", "cherry"], "enemies": []}
    l7["enemies"] = []
    # Simplified, faster ~1-minute hazard set
    l7["saws"] = [[2, 14, 5, 14], [17, 14, 20, 14]]
    l7["wsaws"] = [[11, 47, 0, 1, 1500]]
    l7["lasers"] = [[5, 20, "h", "laser_tom"], [17, 26, "h", "laser_cherry"]]
    # Widely separated props (all >= 15 tiles from starts & 17-22 tiles apart!)
    l7["shields"] = [[8, 17]]
    l7["bombs"] = [[20, 29], [2, 38]]
    l7["switches"] = [
        {
            "id": "sw1", "hero": "cherry", "x": 20, "y": 8, "side": "right",
            "toggle": True, "color": "#00e676",
            "targets": ["gate1", "sp1"],
            "msg": "Green Switch! Cherry unlocked Gate 1 & Tom's Black Spikes!",
            "closeMsg": "Red Switch! Gate 1 & Spikes Closed!"
        },
        {
            "id": "sw2", "hero": "tom", "x": 2, "y": 20, "side": "left",
            "toggle": True, "color": "#00e676",
            "targets": ["gate2", "laser_tom", "sp2"],
            "msg": "Green Switch! Tom unlocked Gate 2 & Cherry's Black Spikes!",
            "closeMsg": "Red Switch! Gate 2 & Spikes Closed!"
        },
        {
            "id": "sw3", "hero": "cherry", "x": 20, "y": 38, "side": "right",
            "color": "#00e676",
            "targets": ["gate3", "gate_vault", "laser_cherry"],
            "msg": "Green Switch! Cherry opened the Vault Exit!"
        }
    ]
    l7["spikes"] = [
        {"id": "sp1", "x": 5, "y": 29, "dir": "v"},
        {"id": "sp2", "x": 17, "y": 35, "dir": "h"}
    ]
    if len(levels) >= 7:
        levels[6] = l7
    else:
        levels.append(l7)

    # ------------------------------------------------------------------
    # LEVEL 8 (Trio Twist: Tom + Cherry + Bulldog, Blue walls like L3, 84/84 single-tile inner walls, < 50s!)
    # ------------------------------------------------------------------
    W8, H8 = 22, 37
    w8 = [["1"] * W8 for _ in range(H8)]
    l8_edges = [
        # --- LEFT WING (cols 0..2, all 36 cells carved with 1-tile inner walls!) ---
        # Upper sub-tree above gate_tom_trap (rows 0..6):
        ((0, 0), (0, 1)), ((0, 1), (0, 2)), ((0, 2), (0, 3)),
        ((0, 3), (1, 3)),  # 1-way dead-end pocket holding Bomb [5, 11] (Tom backtracks after hitting twist gate)
        ((0, 0), (1, 0)), ((1, 0), (2, 0)), ((2, 0), (2, 1)), ((2, 1), (1, 1)),
        ((1, 1), (1, 2)), ((1, 2), (2, 2)), ((2, 2), (2, 3)),
        ((0, 3), (0, 4)), ((0, 4), (0, 5)), ((0, 5), (0, 6)),
        ((0, 4), (1, 4)), ((1, 4), (2, 4)),  # [2, 4] = [8, 14] Switch sw1
        ((1, 4), (1, 5)), ((2, 4), (2, 5)), ((2, 5), (2, 6)), ((1, 5), (1, 6)),
        # Bottleneck gate_tom_trap sits on (1,6)<->(1,7) ([4, 21],[5, 21]):
        ((1, 6), (1, 7)),
        # Lower sub-tree below gate_tom_trap (rows 7..11):
        ((1, 7), (1, 8)), ((1, 8), (1, 9)), ((1, 9), (1, 10)),
        ((1, 10), (2, 10)), ((2, 10), (3, 10)),
        ((1, 7), (0, 7)), ((0, 7), (0, 8)), ((0, 8), (0, 9)), ((0, 9), (0, 10)), ((0, 10), (0, 11)),
        ((0, 11), (1, 11)), ((1, 11), (2, 11)), ((2, 10), (2, 9)), ((2, 9), (2, 8)), ((2, 8), (2, 7)),

        # --- CENTER WING (col 3, all 12 cells carved) ---
        ((3, 0), (3, 1)), ((3, 1), (3, 2)), ((3, 2), (3, 3)),
        ((3, 3), (3, 4)),  # gate_bulldog ([10, 12],[11, 12])
        ((3, 4), (3, 5)), ((3, 5), (3, 6)), ((3, 6), (3, 7)),
        ((3, 7), (4, 7)),  # 1-way dead-end pocket holding Final Switch sw3 [14, 23]
        ((3, 7), (3, 8)), ((3, 8), (3, 9)), ((3, 9), (3, 10)), ((3, 10), (3, 11)),

        # --- RIGHT WING (cols 4..6, all remaining 35 cells carved cleanly!) ---
        # Upper sub-tree above gate_cherry (rows 0..4):
        ((6, 0), (6, 1)), ((6, 1), (6, 2)), ((6, 2), (6, 3)), ((6, 3), (6, 4)),
        ((6, 0), (5, 0)), ((5, 0), (4, 0)), ((4, 0), (4, 1)), ((4, 1), (5, 1)),
        ((5, 1), (5, 2)), ((5, 2), (4, 2)), ((4, 2), (4, 3)), ((4, 3), (5, 3)),
        ((5, 3), (5, 4)), ((5, 4), (4, 4)),
        # Bottleneck gate_cherry sits on (6,4)<->(6,5) ([19, 15],[20, 15]):
        ((6, 4), (6, 5)),
        # Mid sub-tree above Black Spikes sp_cherry [20, 26] (rows 5..7):
        ((6, 5), (6, 6)), ((6, 6), (6, 7)),
        ((6, 6), (5, 6)), ((5, 6), (4, 6)),  # Side wing: Shield [17, 20] + Twist sw2 [14, 20]
        ((5, 6), (5, 5)), ((5, 5), (4, 5)), ((5, 6), (5, 7)),
        # Bottleneck sp_cherry sits on (6,8) ([20, 26], pure 'UD' 2-wall corridor):
        ((6, 7), (6, 8)), ((6, 8), (6, 9)),
        # Lower sub-tree below sp_cherry (rows 8..11):
        ((6, 9), (6, 10)), ((6, 10), (5, 10)), ((5, 10), (4, 10)), ((4, 10), (3, 10)),
        ((5, 10), (5, 9)), ((5, 9), (4, 9)), ((4, 9), (4, 8)), ((4, 8), (5, 8)),
        ((4, 10), (4, 11)), ((4, 11), (5, 11)), ((5, 11), (6, 11))
    ]
    for c1, c2 in l8_edges:
        open_doorway(w8, 7, 12, c1, c2)

    l8 = {
        "name": "Level 8: Blue Trio Twist",
        "W": W8,
        "H": H8,
        "theme": "blue",
        "walls": ["".join(r) for r in w8],
        "start": [0, 0],
        "start2": [6, 0],
        "start3": [3, 0],
        "hero3": "bulldog",
        "exit": [3, 11],
        "cast": {"friends": ["tom", "cherry", "bulldog"], "enemies": []},
        "enemies": [],
        "coins": [
            [2, 5], [2, 14], [5, 20], [5, 29],
            [20, 8], [20, 17], [20, 29],
            [11, 8], [11, 17], [11, 32]
        ],
        "bubbles": [[5, 32], [20, 23]],
        "shields": [[17, 20]],
        "bombs": [[5, 11], [2, 23]],
        "saws": [],
        "wsaws": [],
        "lasers": [[5, 26, "h", "laser_tom_twist"]],
        "gates": [
            {"id": "gate_cherry", "blocks": [[19, 15], [20, 15]], "open": False, "label": "CHERRY GATE"},
            {"id": "gate_bulldog", "blocks": [[10, 12], [11, 12]], "open": False, "label": "BULLDOG GATE"},
            {"id": "gate_tom_trap", "blocks": [[4, 21], [5, 21]], "open": True, "initialOpen": True, "label": "TWIST TRAP"}
        ],
        "switches": [
            {
                "id": "sw1", "hero": "tom", "x": 8, "y": 14, "side": "right",
                "color": "#00e676",
                "targets": ["gate_cherry"],
                "msg": "Green Switch! Tom opened Cherry's Wing!"
            },
            {
                "id": "sw2", "hero": "cherry", "x": 14, "y": 20, "side": "left",
                "color": "#00e676",
                "targets": ["gate_bulldog"],
                "closeTargets": ["gate_tom_trap"],
                "msg": "⚡ TWIST! Bulldog Freed — Gate Slammed Shut on Tom!"
            },
            {
                "id": "sw3", "hero": "bulldog", "x": 14, "y": 23, "side": "right",
                "color": "#00e676",
                "targets": ["sp_final"],
                "msg": "Green Switch! Bulldog Cleared Final Spikes! Rush to Exit!"
            }
        ],
        "spikes": [
            {"id": "sp_cherry", "x": 20, "y": 26, "dir": "v"},
            {"id": "sp_final", "x": 11, "y": 29, "dir": "v"}
        ],
        # Need-driven choreography + comedic setback: heroes confront hazards first, backtrack, and Tom gets zapped by laser -> backtracks for spare Bomb -> blasts laser -> laughs!
        "autoPlan": [
            {"h": 1, "to": [2, 4], "minT": 0, "pauseMs": 250},        # Tom opens Cherry's Gate (sw1) -> skips [1,3] Bomb for now!
            {"h": 1, "to": [1, 6]},                                   # Tom waits in main lane
            {"h": 2, "to": [6, 7], "pauseMs": 320},                   # Cherry advances & CONFRONTS Black Spikes [20, 26] FIRST!
            {"h": 2, "to": [5, 6], "minT": 3100, "pauseMs": 260},     # Needs protection -> BACKTRACKS to Shield [17, 20]
            {"h": 2, "to": [4, 6], "pauseMs": 500},                   # Hits Twist Switch sw2 -> frees Bulldog & LOCKS gate_tom_trap!
            {"h": 2, "to": [6, 9], "pauseMs": 220},                   # Shielded Cherry smashes through Black Spikes sp_cherry!
            {"h": 1, "to": [1, 3], "minT": 3100, "key": "7", "pauseMs": 320},  # Trapped Tom BACKTRACKS up to Bomb #1 [5, 11]!
            {"h": 1, "to": [1, 6], "look": [0, 1], "key": "8", "pauseMs": 600}, # Returns & BLASTS Twist Gate open!
            {"h": 1, "to": [1, 7], "pauseMs": 120},                   # Tom steps in front of Laser [5, 26]
            {"h": 1, "waitLaserOn": 0, "touchLaser": True, "to": [1, 8], "pauseMs": 450}, # Tom touches active Laser -> ZAP & bounce back!
            {"h": 1, "to": [0, 7], "key": "7", "pauseMs": 260},       # Injured Tom BACKTRACKS to pocket Bomb #2 [2, 23]!
            {"h": 1, "to": [1, 7], "look": [0, 1], "key": "8", "pauseMs": 750}, # Blasts Laser [5, 26] & LAUGHS!
            {"h": 3, "to": [3, 8], "pauseMs": 280},                   # Freed Bulldog CONFRONTS Black Spikes sp_final [11, 29] FIRST!
            {"h": 3, "to": [4, 7], "pauseMs": 280},                   # BACKTRACKS to Switch sw3 -> opens sp_final!
            {"h": 3, "to": [3, 11]},
            {"h": 2, "to": [3, 11]},
            {"h": 1, "to": [3, 11]}
        ]
    }
    if len(levels) >= 8:
        levels[7] = l8
    else:
        levels.append(l8)

    # ------------------------------------------------------------------
    # LEVEL 9: Tom, Cherry & Bulldog Story Escape (<50s Continuous In-Frame Co-Op!)
    # ------------------------------------------------------------------
    W9, H9 = 22, 37  # 7 cols x 12 rows (84 cells, all 1-layer inner walls)
    w9 = [["1"] * W9 for _ in range(H9)]
    for ci in range(7):
        for cj in range(12):
            for dx in (1, 2):
                for dy in (1, 2):
                    w9[3 * cj + dy][3 * ci + dx] = "0"

    l9_edges = [
        # --- ZONE 1: LASER ZAP -> SHIELD #1 -> FREE CHERRY (3-WALL+GATE) -> RED FOX FIGHT ---
        ((1, 0), (1, 1)), ((1, 1), (0, 1)),  # Tom start (1,0), Shield #1 at (0,1)=[2,5]
        ((1, 1), (1, 2)), ((1, 2), (1, 3)),  # Laser [5,8,"h"] on (1,2)
        ((1, 3), (2, 3)), ((2, 2), (2, 3)),  # Switch sw1 [5,11]; Cherry locked in (2,2)=[8,8] by gate_cherry [7,9],[8,9]
        ((1, 3), (1, 4)), ((1, 4), (2, 4)), ((1, 4), (1, 5)),  # Tom steps directly down to [5,14] facing Red Fox [8,14]; Cherry lines up behind at (1,3)!
        # Unused upper cells connected cleanly without bypassing Laser or gate_cherry:
        ((0, 0), (1, 0)), ((1, 0), (2, 0)), ((2, 0), (2, 1)),
        ((0, 2), (0, 3)), ((0, 3), (0, 4)), ((0, 4), (1, 4)),
        ((2, 0), (3, 0)), ((3, 0), (4, 0)), ((4, 0), (5, 0)), ((5, 0), (6, 0)),
        ((3, 0), (3, 1)), ((4, 0), (4, 1)), ((5, 0), (5, 1)), ((6, 0), (6, 1)),
        ((3, 1), (3, 2)), ((4, 1), (4, 2)), ((5, 1), (5, 2)), ((6, 1), (6, 2)),
        ((3, 2), (3, 3)), ((4, 2), (4, 3)), ((5, 2), (5, 3)), ((6, 2), (6, 3)),
        ((3, 3), (4, 3)), ((5, 3), (6, 3)), ((5, 3), (5, 4)), ((5, 4), (6, 4)), ((6, 4), (6, 5)), ((5, 4), (5, 5)),

        # --- ZONE 2: TOGETHER -> SAW #1 -> CHERRY SHIELD CROSS -> RETRACT SAW SW2 ---
        ((2, 4), (3, 4)), ((3, 4), (4, 4)),  # Shield #2 at (4,4)=[14,14]
        ((4, 4), (4, 5)), ((3, 5), (4, 5)), ((4, 5), (4, 6)),  # Saw saw_mid [11,17]-[14,17] at row 5
        ((3, 6), (4, 6)), ((2, 6), (3, 6)), ((2, 5), (2, 6)),  # Switch sw2 [14,20]; Switch sw_bulldog [11,20]; queue slot (2,5)=[8,17] behind Bulldog!
        ((5, 5), (5, 6)), ((5, 6), (6, 6)),

        # --- ZONE 3: FREE BULLDOG (3-WALL+GATE) -> TEAM VS BLACK FOX ---
        ((1, 6), (2, 6)),                    # Bulldog locked in (1,6)=[5,20] by gate_bulldog [6,19],[6,20]
        ((3, 6), (3, 7)),                    # Safe approach directly to Bomb #1 [11,23] without touching Black Fox early!
        ((2, 6), (2, 7)), ((2, 7), (3, 7)),  # Arena upper lane [8,23]<->[11,23]
        ((3, 7), (4, 7)),                    # Outer cell (4,7)
        ((2, 7), (2, 8)), ((3, 7), (3, 8)), ((2, 8), (3, 8)),  # Black Fox Arena (2..3, 7..8)
        ((1, 7), (2, 7)), ((0, 7), (1, 7)), ((0, 7), (0, 6)), ((0, 6), (0, 5)),  # outer col 0 mid (note (1,6) keeps 3 walls!)
        ((4, 7), (4, 8)), ((4, 7), (5, 7)), ((5, 7), (5, 8)), ((5, 7), (6, 7)), ((6, 7), (6, 8)),

        # --- ZONE 4: BLACK SPIKES -> FINAL SWITCH & BOMB #2 -> FINAL RED LASER -> EXIT ---
        ((1, 8), (2, 8)),                    # Pocket (1,8)=[5,26] Bomb #2
        ((2, 8), (2, 9)), ((2, 9), (2, 10)), ((2, 10), (2, 11)),  # sp_final [8,29] on (2,9); Laser [8,32] on (2,10); Exit [8,35]
        # Remaining lower cells behind (2, 10) connected cleanly (zero bypass of sp_final!):
        ((0, 8), (1, 8)), ((1, 9), (1, 10)), ((0, 9), (1, 9)), ((0, 9), (0, 10)),
        ((0, 10), (0, 11)), ((0, 11), (1, 11)), ((1, 10), (2, 10)),
        ((2, 10), (3, 10)), ((3, 9), (3, 10)), ((3, 10), (4, 10)), ((4, 9), (4, 10)),
        ((4, 10), (5, 10)), ((5, 9), (5, 10)), ((5, 10), (6, 10)), ((6, 9), (6, 10)),
        ((3, 10), (3, 11)), ((3, 11), (4, 11)), ((4, 11), (5, 11)), ((5, 11), (6, 11))
    ]
    for c1, c2 in l9_edges:
        open_doorway(w9, 7, 12, c1, c2)

    l9 = {
        "name": "Level 9: Foxes Ambush Co-Op",
        "W": W9,
        "H": H9,
        "theme": "blue",
        "alwaysAuto": True,
        "walls": ["".join(r) for r in w9],
        "start": [1, 0],
        "start2": [2, 2],
        "start3": [1, 6],
        "hero3": "bulldog",
        "exit": [2, 11],
        "cast": {"friends": ["tom", "cherry", "bulldog"], "enemies": ["redfox", "blackfox"]},
        "enemies": [
            {
                "id": "redfox", "name": "Red Fox", "x": 8, "y": 14, "speed": 1.9, "hp": 1,
                "waitForFrame": True,
                "bounds": [7.8, 13.5, 9.2, 16.0],
                "waypoints": [[8, 14], [9, 14], [8, 15]]
            },
            {
                "id": "blackfox", "name": "Black Fox", "x": 8, "y": 26, "speed": 1.9, "hp": 2,
                "waitForFrame": True,
                "bounds": [7.6, 25.6, 9.2, 26.9],
                "waypoints": [[8, 25.8], [9, 26], [8, 26.4]]
            }
        ],
        "coins": [
            [5, 5], [2, 5], [5, 11], [5, 14], [11, 14],
            [14, 17], [11, 20], [11, 23], [8, 29], [8, 32]
        ],
        "bubbles": [[8, 26]],
        "shields": [[2, 5], [14, 14]],
        "bombs": [[11, 23], [5, 26]],
        "saws": [[11, 17, 14, 17, "saw_mid"]],
        "wsaws": [],
        "lasers": [
            [5, 8, "h", "laser_upper"],
            [8, 32, "h", "laser_exit"]
        ],
        "gates": [
            {"id": "gate_cherry", "blocks": [[7, 9], [8, 9]], "open": False, "label": "CHERRY CAGE"},
            {"id": "gate_bulldog", "blocks": [[6, 19], [6, 20]], "open": False, "label": "BULLDOG CAGE"}
        ],
        "switches": [
            {
                "id": "sw1", "hero": "tom", "x": 5, "y": 11, "side": "left",
                "color": "#00e676",
                "targets": ["gate_cherry"],
                "msg": "Green Switch! Tom Freed Cherry!"
            },
            {
                "id": "sw2", "hero": "cherry", "x": 14, "y": 20, "side": "right",
                "color": "#00e676",
                "targets": ["saw_mid"],
                "msg": "Switch! Cherry Retracted Saw Blade!"
            },
            {
                "id": "sw_bulldog", "hero": "tom", "x": 11, "y": 20, "side": "top",
                "color": "#00e676",
                "targets": ["gate_bulldog"],
                "msg": "Green Switch! Bulldog Joins the Squad!"
            },
            {
                "id": "sw_final", "hero": "bulldog", "x": 11, "y": 26, "side": "bottom",
                "color": "#00e676",
                "targets": ["sp_final"],
                "msg": "Green Switch! Bulldog Cleared Black Spikes!"
            }
        ],
        "spikes": [
            {"id": "sp_final", "x": 8, "y": 29, "dir": "v"}
        ],
        "autoPlan": [
            # Zone 1 (0s-12.5s): Tom enters, gets zapped by Laser [5,8], grabs Shield #1 [2,5], charges Laser, hits sw1 [5,11] freeing Cherry in-frame!
            {"h": 1, "to": [1, 1], "pauseMs": 450, "speedMul": 0.40},
            {"h": 1, "waitLaserOn": 0, "touchLaser": True, "to": [1, 2], "pauseMs": 950, "speedMul": 0.41},
            {"h": 1, "to": [0, 1], "minT": 3200, "pauseMs": 600, "speedMul": 0.41},
            {"h": 1, "to": [1, 3], "camFocus": [6.5, 10.0], "pauseMs": 1150, "speedMul": 0.42},
            # Zone 1b: Cherry lines up cleanly 1 cell behind Tom at (1,3) [5,11]; Tom steps to (1,4) [5,14] facing Red Fox [8,14]!
            {
                "focus": 1, "camBoss": "redfox", "pauseMs": 450,
                "parallel": [
                    {"h": 1, "to": [1, 4], "look": [1, 0], "speedMul": 0.43},
                    {"h": 2, "to": [1, 3], "speedMul": 0.43}
                ]
            },
            # Pure 1v1 Fight #1: Tom throws Captain Shield cleanly across open hall to Red Fox (Cherry watches behind at (1,3)!)
            {"h": 1, "to": [1, 4], "look": [1, 0], "camBoss": "redfox", "key": "shield_throw", "targetBoss": "redfox", "pauseMs": 1950},
            # Zone 2: Tom & Cherry step into Zone 2, then Tom WAITS at (3,4) while Cherry grabs Shield #2 [14,14], crosses Saw saw_mid, & flips sw2 [14,20] center-frame!
            {
                "focus": 1, "camTeam": True, "pauseMs": 650,
                "parallel": [
                    {"h": 1, "to": [3, 4], "speedMul": 0.41},
                    {"h": 2, "to": [2, 4], "speedMul": 0.41}
                ]
            },
            {"h": 2, "focus": 2, "to": [4, 4], "camFocus": [12.5, 14.0], "pauseMs": 850, "speedMul": 0.41},
            {"h": 2, "focus": 2, "to": [4, 6], "camFocus": [13.2, 18.2], "pauseMs": 1750, "speedMul": 0.41},
            # Zone 3a: Cherry moves cleanly to (2,5) queue spot; Tom hits sw_bulldog [11,20] freeing Bulldog inside the exact same camera frame [8.6, 19.5]!
            {
                "focus": 1, "camFocus": [8.6, 19.5], "pauseMs": 1650,
                "parallel": [
                    {"h": 1, "to": [3, 6], "speedMul": 0.43},
                    {"h": 2, "to": [2, 5], "speedMul": 0.43}
                ]
            },
            {
                "focus": 1, "camBoss": "blackfox", "pauseMs": 750,
                "parallel": [
                    {"h": 1, "to": [3, 7], "key": "7", "speedMul": 0.42},
                    {"h": 2, "to": [2, 5], "speedMul": 0.42},
                    {"h": 3, "to": [2, 6], "speedMul": 0.42}
                ]
            },
            # Pure 1v1 Fight #2: Cherry (2,5) -> Bulldog (2,6) -> Tom (2,7) stacked vertically; Tom faces Black Fox [8,26] then throws Bomb #1 straight down!
            {
                "focus": 1, "camBoss": "blackfox", "pauseMs": 750,
                "parallel": [
                    {"h": 1, "to": [2, 7], "look": [0, 1], "speedMul": 0.42},
                    {"h": 2, "to": [2, 5], "speedMul": 0.42},
                    {"h": 3, "to": [2, 6], "speedMul": 0.42}
                ]
            },
            {"h": 1, "to": [2, 7], "look": [0, 1], "camBoss": "blackfox", "key": "8", "targetBoss": "blackfox", "pauseMs": 1850},
            # Zone 4a: BULLDOG SPOTLIGHT — Tom & Cherry STOP cleanly behind while Bulldog flips sw_final [11,26] clearing sp_final [8,29] center-frame!
            {
                "focus": 3, "camFocus": [9.5, 27.0], "pauseMs": 1800,
                "parallel": [
                    {"h": 3, "to": [3, 8], "speedMul": 0.42},
                    {"h": 1, "to": [2, 7], "speedMul": 0.42},
                    {"h": 2, "to": [2, 6], "speedMul": 0.42}
                ]
            },
            # Zone 4b: Tom grabs Bomb #2 [5,26] while Bulldog returns to (2,8) & Cherry holds (2,7)!
            {
                "focus": 1, "camTeam": True, "pauseMs": 650,
                "parallel": [
                    {"h": 1, "to": [1, 8], "key": "7", "speedMul": 0.44},
                    {"h": 3, "to": [2, 8], "speedMul": 0.44},
                    {"h": 2, "to": [2, 7], "speedMul": 0.44}
                ]
            },
            # Zone 4c: Tom blasts Final Red Laser [8,32] -> Trio exits together!
            {
                "focus": 1, "camFocus": [8.0, 30.5], "pauseMs": 1250,
                "parallel": [
                    {"h": 1, "to": [2, 9], "look": [0, 1], "key": "8", "speedMul": 0.44},
                    {"h": 2, "to": [2, 8], "speedMul": 0.44},
                    {"h": 3, "to": [2, 8], "speedMul": 0.44}
                ]
            },
            {
                "focus": 1, "camTeam": True, "pauseMs": 0,
                "parallel": [
                    {"h": 1, "to": [2, 11], "speedMul": 0.46},
                    {"h": 2, "to": [2, 11], "speedMul": 0.46},
                    {"h": 3, "to": [2, 11], "speedMul": 0.46}
                ]
            }
        ]
    }
    if len(levels) >= 9:
        levels[8] = l9
    else:
        levels.append(l9)

    # ------------------------------------------------------------------
    # LEVEL 10: Trio Finale Gauntlet (40-50s In-Frame Spotlights & 3 Boss 1v1 Duels!)
    # ------------------------------------------------------------------
    W10, H10 = 22, 43  # 7 cols x 14 rows (98 cells, all 1-layer inner walls)
    w10 = [["1"] * W10 for _ in range(H10)]
    for ci in range(7):
        for cj in range(14):
            for dx in (1, 2):
                for dy in (1, 2):
                    w10[3 * cj + dy][3 * ci + dx] = "0"

    l10_edges = [
        # --- ZONE 1 (rows 0-2): Tom Laser Zap -> Side Bomb #1 (0,1) -> Blast laser_top [8,8] ---
        ((2, 0), (2, 1)), ((2, 1), (1, 1)), ((1, 1), (0, 1)),
        ((2, 1), (2, 2)), ((2, 2), (2, 3)),
        ((0, 0), (1, 0)), ((1, 0), (2, 0)), ((2, 0), (3, 0)), ((3, 0), (4, 0)), ((4, 0), (5, 0)), ((5, 0), (6, 0)),
        ((0, 0), (0, 1)), ((0, 1), (0, 2)), ((1, 1), (1, 2)),
        ((3, 0), (3, 1)), ((4, 0), (4, 1)), ((5, 0), (5, 1)), ((6, 0), (6, 1)),
        ((3, 1), (3, 2)), ((4, 1), (4, 2)), ((5, 1), (5, 2)), ((6, 1), (6, 2)),

        # --- ZONE 2 (rows 3-5): Free Bulldog & Cherry -> Shield #1 (5,3) -> CHERRY vs RED FOX (2,5) ---
        ((0, 3), (1, 3)), ((1, 3), (2, 3)), ((2, 3), (3, 3)), ((3, 3), (4, 3)), ((4, 3), (5, 3)), ((5, 3), (6, 3)),
        ((2, 3), (2, 4)), ((1, 4), (2, 4)), ((2, 4), (3, 4)), ((3, 4), (4, 4)),
        ((1, 4), (0, 4)), ((0, 4), (0, 5)), ((1, 4), (1, 5)),
        ((5, 3), (5, 4)), ((5, 4), (6, 4)), ((5, 4), (5, 5)), ((6, 4), (6, 5)),
        ((2, 4), (2, 5)),

        # --- ZONE 3 (rows 5-8): sp_mid (2,6) + Betrayal gate_trap -> Bomb #2 (4,7) -> BULLDOG vs BLACK FOX (2,8) ---
        ((2, 5), (3, 5)), ((3, 5), (4, 5)), ((4, 5), (4, 6)), ((4, 6), (4, 7)),
        ((4, 6), (5, 6)), ((5, 6), (6, 6)), ((4, 7), (5, 7)), ((5, 7), (6, 7)),
        ((0, 5), (0, 6)), ((0, 6), (1, 6)), ((3, 5), (3, 6)),
        ((2, 5), (2, 6)), ((2, 6), (2, 7)),
        ((2, 7), (1, 7)), ((1, 7), (0, 7)), ((0, 7), (0, 8)), ((1, 7), (1, 8)),
        ((2, 7), (3, 7)), ((3, 7), (3, 8)), ((3, 8), (4, 8)), ((4, 8), (5, 8)), ((5, 8), (6, 8)),
        ((5, 7), (5, 8)), ((6, 7), (6, 8)),
        ((2, 7), (2, 8)),

        # --- ZONE 4 (rows 9-13): TOM vs BUFFALO (2,11) -> Cherry sw_exit (3,11) -> sp_exit (2,12) -> Exit (2,13) ---
        ((2, 8), (2, 9)), ((1, 9), (2, 9)), ((2, 9), (3, 9)),
        ((0, 9), (1, 9)), ((0, 9), (0, 10)), ((1, 9), (1, 10)),
        ((3, 9), (4, 9)), ((4, 9), (5, 9)), ((5, 9), (6, 9)),
        ((2, 9), (2, 10)), ((2, 10), (2, 11)), ((2, 11), (3, 11)),
        ((0, 10), (1, 10)), ((1, 10), (1, 11)), ((0, 11), (1, 11)),
        ((3, 10), (4, 10)), ((4, 10), (5, 10)), ((5, 10), (6, 10)),
        ((3, 11), (4, 11)), ((4, 10), (4, 11)), ((5, 11), (6, 11)),
        ((0, 11), (0, 12)), ((0, 12), (1, 12)), ((4, 11), (4, 12)), ((3, 12), (4, 12)),
        ((5, 11), (5, 12)), ((6, 11), (6, 12)),
        ((2, 11), (2, 12)), ((2, 12), (2, 13)),
        ((0, 13), (1, 13)), ((1, 13), (2, 13)), ((2, 13), (3, 13)), ((3, 13), (4, 13)), ((4, 13), (5, 13)), ((5, 13), (6, 13))
    ]
    for c1, c2 in l10_edges:
        open_doorway(w10, 7, 14, c1, c2)

    l10 = {
        "name": "Level 10: Trio Finale Gauntlet",
        "W": W10,
        "H": H10,
        "theme": "blue",
        "alwaysAuto": True,
        "walls": ["".join(r) for r in w10],
        "start": [2, 0],
        "start2": [4, 3],
        "start3": [0, 3],
        "hero3": "bulldog",
        "exit": [2, 13],
        "cast": {"friends": ["tom", "cherry", "bulldog"], "enemies": ["redfox", "blackfox", "buffalo"]},
        "enemies": [
            {
                "id": "redfox", "name": "Red Fox", "x": 8, "y": 17, "speed": 1.85, "hp": 1,
                "waitForFrame": True,
                "bounds": [7.6, 16.6, 9.2, 18.2],
                "waypoints": [[8, 17], [8.8, 17], [8, 17.8]]
            },
            {
                "id": "blackfox", "name": "Black Fox", "x": 8, "y": 26, "speed": 1.9, "hp": 2,
                "waitForFrame": True,
                "bounds": [7.6, 25.6, 9.2, 27.2],
                "waypoints": [[8, 25.8], [8.8, 26], [8, 26.8]]
            },
            {
                "id": "buffalo", "name": "Buffalo", "x": 8, "y": 35, "speed": 1.85, "hp": 2,
                "waitForFrame": True,
                "bounds": [7.6, 34.6, 9.2, 36.2],
                "waypoints": [[8, 34.8], [8.8, 35], [8, 35.8]]
            }
        ],
        "coins": [
            [8, 5], [8, 11], [5, 11], [14, 11], [17, 11],
            [8, 17], [14, 20], [11, 23], [11, 29], [8, 38]
        ],
        "bubbles": [[5, 29]],
        "shields": [[17, 11]],
        "bombs": [[2, 5], [14, 23], [11, 23], [11, 29]],
        "saws": [],
        "wsaws": [],
        "lasers": [
            [8, 8, "h", "laser_top"]
        ],
        "gates": [
            {"id": "gate_bulldog", "blocks": [[3, 10], [3, 11]], "open": False, "label": "BULLDOG CAGE"},
            {"id": "gate_cherry", "blocks": [[12, 10], [12, 11]], "open": False, "label": "CHERRY CAGE"},
            {"id": "gate_trap", "blocks": [[12, 16], [12, 17]], "open": True, "initialOpen": True, "label": "TRAP GATE"}
        ],
        "switches": [
            {
                "id": "sw_bulldog", "hero": "tom", "x": 5, "y": 11, "side": "top",
                "color": "#00e676",
                "targets": ["gate_bulldog"],
                "msg": "Green Switch! Tom Freed Bulldog!"
            },
            {
                "id": "sw_cherry", "hero": "bulldog", "x": 11, "y": 11, "side": "top",
                "color": "#00e676",
                "targets": ["gate_cherry"],
                "msg": "Green Switch! Bulldog Freed Cherry!"
            },
            {
                "id": "sw_mid_trap", "hero": "bulldog", "x": 14, "y": 20, "side": "left",
                "color": "#00e676",
                "targets": ["sp_mid"],
                "closeTargets": ["gate_trap"],
                "msg": "Trap Twist! Spikes Opened — Gate Slammed Behind Bulldog!"
            },
            {
                "id": "sw_exit", "hero": "cherry", "x": 11, "y": 35, "side": "bottom",
                "color": "#00e676",
                "targets": ["sp_exit"],
                "msg": "Final Green Switch! Cherry Cleared Exit Spikes!"
            }
        ],
        "spikes": [
            {"id": "sp_mid", "x": 8, "y": 20, "dir": "v"},
            {"id": "sp_exit", "x": 8, "y": 38, "dir": "v"}
        ],
        "autoPlan": [
            # Zone 1 (0s-6.5s): Tom confronts Laser [8,8], gets zapped, detours to [2,5] for Bomb #1, blasts Laser!
            {"h": 1, "to": [2, 1], "pauseMs": 220, "speedMul": 0.56},
            {"h": 1, "waitLaserOn": 0, "touchLaser": True, "to": [2, 2], "pauseMs": 500, "speedMul": 0.56},
            {"h": 1, "to": [0, 1], "minT": 3100, "key": "7", "camFocus": [4.5, 5.0], "pauseMs": 350, "speedMul": 0.58},
            {"h": 1, "to": [2, 1], "look": [0, 1], "key": "8", "camFocus": [8.0, 6.5], "pauseMs": 720, "speedMul": 0.58},
            # Zone 2a (6.5s-11.5s): Tom hits sw_bulldog [5,11] freeing Bulldog in-frame; then Tom stops & Bulldog hits sw_cherry [11,11] freeing Cherry in-frame!
            {"h": 1, "to": [1, 3], "camFocus": [3.8, 11.0], "pauseMs": 850, "speedMul": 0.56},
            {
                "focus": 3, "camFocus": [12.0, 11.0], "pauseMs": 850,
                "parallel": [
                    {"h": 3, "to": [3, 3], "speedMul": 0.56},
                    {"h": 1, "to": [2, 3], "speedMul": 0.54}
                ]
            },
            # Zone 2b (11.5s-18s): CHERRY SPOTLIGHT — Tom & Bulldog stack behind at (2,3)/(2,2) while Cherry grabs Shield #1 [17,11], takes (2,4), & duels Red Fox 1v1!
            {
                "focus": 2, "camFocus": [14.5, 11.0], "pauseMs": 420,
                "parallel": [
                    {"h": 2, "to": [5, 3], "speedMul": 0.58},
                    {"h": 1, "to": [1, 3], "speedMul": 0.56},
                    {"h": 3, "to": [2, 2], "speedMul": 0.56}
                ]
            },
            {
                "focus": 2, "camBoss": "redfox", "pauseMs": 380,
                "parallel": [
                    {"h": 2, "to": [2, 4], "look": [0, 1], "speedMul": 0.58},
                    {"h": 1, "to": [2, 3], "speedMul": 0.56},
                    {"h": 3, "to": [2, 2], "speedMul": 0.56}
                ]
            },
            {"h": 2, "focus": 2, "to": [2, 4], "look": [0, 1], "camBoss": "redfox", "key": "shield_throw", "targetBoss": "redfox", "pauseMs": 1350},
            # Zone 3a (18s-25s): Trio confronts sp_mid [8,20]; BULLDOG detours to sw_mid_trap [14,20] (clears sp_mid + slams gate_trap!), grabs Bomb #2 [14,23] & blasts gate_trap!
            {
                "focus": 1, "camFocus": [8.0, 18.5], "pauseMs": 360,
                "parallel": [
                    {"h": 3, "to": [2, 5], "speedMul": 0.58},
                    {"h": 2, "to": [2, 4], "speedMul": 0.58},
                    {"h": 1, "to": [2, 3], "speedMul": 0.58}
                ]
            },
            {
                "focus": 3, "camFocus": [11.5, 18.5], "pauseMs": 1050,
                "parallel": [
                    {"h": 3, "to": [4, 6], "speedMul": 0.58},
                    {"h": 2, "to": [2, 5], "speedMul": 0.56},
                    {"h": 1, "to": [2, 4], "speedMul": 0.56}
                ]
            },
            {"h": 3, "focus": 3, "to": [4, 7], "key": "7", "camFocus": [13.5, 20.5], "pauseMs": 320, "speedMul": 0.58},
            {"h": 3, "focus": 3, "to": [4, 5], "look": [-1, 0], "key": "8", "camFocus": [12.5, 17.5], "pauseMs": 820, "speedMul": 0.58},
            # Zone 3b (25s-31s): BULLDOG vs BLACK FOX 1v1 — Bulldog grabs Bomb #3 [11,23], faces Black Fox [8,26] while Cherry (2,6) & Tom (2,5) watch behind!
            {
                "focus": 3, "camBoss": "blackfox", "pauseMs": 380,
                "parallel": [
                    {"h": 3, "to": [3, 7], "key": "7", "speedMul": 0.58},
                    {"h": 2, "to": [2, 6], "speedMul": 0.58},
                    {"h": 1, "to": [2, 5], "speedMul": 0.58}
                ]
            },
            {"h": 3, "focus": 3, "to": [2, 7], "look": [0, 1], "camBoss": "blackfox", "key": "8", "targetBoss": "blackfox", "pauseMs": 1350},
            # Zone 4a (31s-37s): TOM vs BUFFALO 1v1 — Tom grabs Bomb #4 [11,29], stacks in front of Bulldog (2,9) & Cherry (2,8), & blasts Buffalo [8,35]!
            {
                "focus": 1, "camBoss": "buffalo", "pauseMs": 380,
                "parallel": [
                    {"h": 1, "to": [3, 9], "key": "7", "speedMul": 0.58},
                    {"h": 3, "to": [2, 9], "speedMul": 0.58},
                    {"h": 2, "to": [2, 8], "speedMul": 0.58}
                ]
            },
            {"h": 1, "focus": 1, "to": [2, 10], "look": [0, 1], "camBoss": "buffalo", "key": "8", "targetBoss": "buffalo", "pauseMs": 1350},
            # Zone 4b (37s-44.5s): CHERRY SPOTLIGHT — Tom & Bulldog stop while Cherry flips sw_exit [11,35] clearing sp_exit [8,38] center-frame -> Trio exits together!
            {
                "focus": 2, "camFocus": [9.5, 36.5], "pauseMs": 1150,
                "parallel": [
                    {"h": 2, "to": [3, 11], "speedMul": 0.56},
                    {"h": 1, "to": [2, 11], "speedMul": 0.56},
                    {"h": 3, "to": [2, 10], "speedMul": 0.56}
                ]
            },
            {
                "focus": 1, "camTeam": True, "pauseMs": 0,
                "parallel": [
                    {"h": 1, "to": [2, 13], "speedMul": 0.58},
                    {"h": 2, "to": [2, 13], "speedMul": 0.58},
                    {"h": 3, "to": [2, 13], "speedMul": 0.58}
                ]
            }
        ]
    }
    if len(levels) >= 10:
        levels[9] = l10
    else:
        levels.append(l10)

    # ------------------------------------------------------------------
    # LEVEL 11: Skyward Logic Protocol (Conditional Co-Op + One-by-One Shrinking Exit-to-TopCast Flight!)
    # ------------------------------------------------------------------
    W11, H11 = 22, 43  # 7 cols x 14 rows (98 cells, all 1-layer inner walls)
    w11 = [["1"] * W11 for _ in range(H11)]
    for ci in range(7):
        for cj in range(14):
            for dx in (1, 2):
                for dy in (1, 2):
                    w11[3 * cj + dy][3 * ci + dx] = "0"

    l11_edges = [
        # --- ZONE 1 (rows 0-3): Tom Laser Zap -> Cherry hits sw_cherry_laser [14,5] -> Tom frees Bulldog via sw_bulldog [11,11] ---
        ((1, 0), (1, 1)), ((1, 1), (2, 1)), ((2, 1), (3, 1)), ((3, 1), (4, 1)), ((4, 0), (4, 1)),
        ((0, 0), (1, 0)), ((1, 0), (2, 0)), ((2, 0), (3, 0)), ((3, 0), (4, 0)), ((4, 0), (5, 0)), ((5, 0), (6, 0)),
        ((0, 0), (0, 1)), ((0, 1), (0, 2)), ((1, 1), (1, 2)),
        ((5, 0), (5, 1)), ((6, 0), (6, 1)), ((5, 1), (5, 2)), ((6, 1), (6, 2)), ((3, 1), (3, 2)), ((4, 1), (4, 2)),
        ((2, 1), (2, 2)), ((2, 2), (2, 3)),
        ((1, 3), (2, 3)), ((2, 3), (3, 3)), ((3, 3), (4, 3)), ((4, 3), (5, 3)), ((5, 3), (6, 3)),
        ((0, 3), (0, 4)), ((0, 4), (1, 4)),

        # --- ZONE 2 (rows 4-5): Shield #1 (1,4) -> Saw saw_top [11..14,14] -> sw_saw_off (4,5) -> Bomb #1 (5,4) -> Red Fox (2,5) ---
        ((2, 3), (2, 4)), ((1, 4), (2, 4)),
        ((2, 4), (3, 4)), ((3, 4), (4, 4)), ((4, 4), (5, 4)), ((4, 4), (4, 5)), ((3, 5), (4, 5)),
        ((5, 4), (6, 4)), ((6, 4), (6, 5)), ((5, 4), (5, 5)),
        ((2, 4), (2, 5)),

        # --- ZONE 3 (rows 5-8): sp_mid (2,6) + Left Trap Twist (0,6) -> Tom Rescue sw_rescue_cherry (1,5) -> Black Fox (2,8) ---
        ((2, 5), (1, 5)), ((1, 5), (0, 5)), ((0, 5), (0, 6)),
        ((2, 5), (2, 6)), ((2, 6), (2, 7)),
        ((1, 6), (1, 7)), ((0, 7), (1, 7)), ((0, 7), (0, 8)), ((1, 7), (1, 8)), ((1, 7), (2, 7)),
        ((2, 7), (3, 7)), ((3, 7), (4, 7)), ((4, 6), (4, 7)), ((3, 6), (4, 6)), ((4, 6), (5, 6)), ((5, 6), (6, 6)), ((5, 6), (5, 7)), ((6, 6), (6, 7)),
        ((2, 7), (2, 8)),

        # --- ZONE 4 (rows 8-13): Buffalo (2,11) -> Bulldog sw_exit (3,11) -> sp_exit (2,12) -> Exit (2,13) ---
        ((3, 7), (3, 8)), ((3, 8), (4, 8)), ((4, 8), (5, 8)), ((5, 8), (6, 8)), ((5, 7), (5, 8)), ((6, 7), (6, 8)),
        ((2, 8), (2, 9)), ((1, 9), (2, 9)), ((2, 9), (3, 9)),
        ((0, 9), (1, 9)), ((0, 9), (0, 10)), ((1, 9), (1, 10)), ((0, 10), (1, 10)), ((1, 10), (1, 11)), ((0, 11), (1, 11)),
        ((3, 9), (4, 9)), ((4, 9), (5, 9)), ((5, 9), (6, 9)),
        ((2, 9), (2, 10)), ((2, 10), (2, 11)), ((2, 11), (3, 11)),
        ((3, 10), (4, 10)), ((4, 10), (5, 10)), ((5, 10), (6, 10)), ((4, 10), (4, 11)), ((3, 11), (4, 11)), ((5, 11), (6, 11)),
        ((0, 11), (0, 12)), ((0, 12), (1, 12)), ((4, 11), (4, 12)), ((3, 12), (4, 12)), ((5, 11), (5, 12)), ((6, 11), (6, 12)),
        ((2, 11), (2, 12)), ((2, 12), (2, 13)),
        ((0, 13), (1, 13)), ((1, 13), (2, 13)), ((2, 13), (3, 13)), ((3, 13), (4, 13)), ((4, 13), (5, 13)), ((5, 13), (6, 13))
    ]
    for c1, c2 in l11_edges:
        open_doorway(w11, 7, 14, c1, c2)

    l11 = {
        "name": "Level 11: Skyward Logic Protocol",
        "W": W11,
        "H": H11,
        "theme": "blue",
        "alwaysAuto": True,
        "exitFly": True,
        "walls": ["".join(r) for r in w11],
        "start": [1, 0],
        "start2": [4, 0],
        "start3": [1, 3],
        "hero3": "bulldog",
        "exit": [2, 13],
        "cast": {"friends": ["tom", "cherry", "bulldog"], "enemies": ["redfox", "blackfox", "buffalo"]},
        "enemies": [
            {
                "id": "redfox", "name": "Red Fox", "x": 8, "y": 17, "speed": 1.85, "hp": 1,
                "waitForFrame": True,
                "bounds": [7.6, 16.6, 9.2, 18.2],
                "waypoints": [[8, 17], [8.8, 17], [8, 17.8]]
            },
            {
                "id": "blackfox", "name": "Black Fox", "x": 8, "y": 26, "speed": 1.9, "hp": 2,
                "waitForFrame": True,
                "bounds": [7.6, 25.6, 9.2, 27.2],
                "waypoints": [[8, 25.8], [8.8, 26], [8, 26.8]]
            },
            {
                "id": "buffalo", "name": "Buffalo", "x": 8, "y": 35, "speed": 1.85, "hp": 2,
                "waitForFrame": True,
                "bounds": [7.6, 34.6, 9.2, 36.2],
                "waypoints": [[8, 34.8], [8.8, 35], [8, 35.8]]
            }
        ],
        "coins": [
            [8, 5], [14, 5], [11, 11], [14, 14], [17, 14],
            [2, 20], [11, 23], [11, 29], [11, 35], [8, 38]
        ],
        "bubbles": [[5, 29]],
        "shields": [[5, 14]],
        "bombs": [[17, 14], [11, 23], [11, 29]],
        "saws": [[11, 14, 14, 14, "saw_top"]],
        "wsaws": [],
        "lasers": [
            [8, 8, "h", "laser_top"]
        ],
        "gates": [
            {"id": "gate_bulldog", "blocks": [[6, 10], [6, 11]], "open": False, "label": "BULLDOG CAGE"},
            {"id": "gate_trap", "blocks": [[3, 16], [3, 17]], "open": True, "initialOpen": True, "label": "TRAP GATE"}
        ],
        "switches": [
            {
                "id": "sw_cherry_laser", "hero": "cherry", "x": 14, "y": 5, "side": "right",
                "color": "#00e676",
                "targets": ["laser_top"],
                "msg": "Green Switch! Cherry Disabled Upper Laser!"
            },
            {
                "id": "sw_bulldog", "hero": "tom", "x": 11, "y": 11, "side": "top",
                "color": "#00e676",
                "targets": ["gate_bulldog"],
                "msg": "Green Switch! Tom Freed Bulldog!"
            },
            {
                "id": "sw_saw_off", "hero": "cherry", "x": 14, "y": 17, "side": "bottom",
                "color": "#00e676",
                "targets": ["saw_top"],
                "msg": "Switch! Cherry Retracted Saw Blade!"
            },
            {
                "id": "sw_left_twist", "hero": "cherry", "x": 2, "y": 20, "side": "left",
                "color": "#00e676",
                "targets": ["sp_mid"],
                "closeTargets": ["gate_trap"],
                "msg": "Left Trap Twist! Spikes Opened — Cherry Trapped!"
            },
            {
                "id": "sw_rescue_cherry", "hero": "tom", "x": 5, "y": 17, "side": "bottom",
                "color": "#00e676",
                "targets": ["gate_trap"],
                "msg": "Rescue Switch! Tom Freed Cherry!"
            },
            {
                "id": "sw_exit", "hero": "bulldog", "x": 11, "y": 35, "side": "bottom",
                "color": "#00e676",
                "targets": ["sp_exit"],
                "msg": "Final Switch! Bulldog Cleared Exit Spikes!"
            }
        ],
        "spikes": [
            {"id": "sp_mid", "x": 8, "y": 20, "dir": "v"},
            {"id": "sp_exit", "x": 8, "y": 38, "dir": "v"}
        ],
        "autoPlan": [
            # Zone 1a (0s-7.5s): Tom confronts Laser [8,8], gets zapped! Cherry stops & flips sw_cherry_laser [14,5] center-frame disabling Laser!
            {"h": 1, "to": [2, 1], "pauseMs": 200, "speedMul": 0.56},
            {"h": 1, "waitLaserOn": 0, "touchLaser": True, "to": [2, 2], "pauseMs": 450, "speedMul": 0.56},
            {"h": 2, "focus": 2, "to": [4, 1], "camFocus": [11.5, 6.5], "pauseMs": 850, "speedMul": 0.58},
            # Zone 1b (7.5s-11.5s): Team reunites at (2,3); Tom flips sw_bulldog [11,11] freeing Bulldog in-frame!
            {
                "focus": 1, "camFocus": [8.0, 11.0], "pauseMs": 950,
                "parallel": [
                    {"h": 1, "to": [3, 3], "speedMul": 0.58},
                    {"h": 2, "to": [2, 3], "speedMul": 0.58}
                ]
            },
            # Zone 2a (11.5s-18.5s): Tom & Bulldog pause while Cherry grabs Shield #1 [5,14], crosses spinning Saw [11..14,14], flips sw_saw_off [14,17] center-frame!
            {
                "focus": 2, "camFocus": [6.5, 13.0], "pauseMs": 360,
                "parallel": [
                    {"h": 2, "to": [1, 4], "speedMul": 0.58},
                    {"h": 1, "to": [2, 3], "speedMul": 0.56},
                    {"h": 3, "to": [2, 2], "speedMul": 0.56}
                ]
            },
            {"h": 2, "focus": 2, "to": [4, 5], "camFocus": [12.5, 15.5], "pauseMs": 900, "speedMul": 0.60},
            # Zone 2b (18.5s-23.5s): BULLDOG SPOTLIGHT — Bulldog grabs Bomb #1 [17,14], Cherry steps behind at (2,3) & Tom at (2,2), BULLDOG vs RED FOX 1v1!
            {
                "focus": 3, "camFocus": [14.5, 14.0], "pauseMs": 360,
                "parallel": [
                    {"h": 3, "to": [5, 4], "key": "7", "speedMul": 0.62},
                    {"h": 2, "to": [2, 3], "speedMul": 0.60},
                    {"h": 1, "to": [2, 2], "speedMul": 0.60}
                ]
            },
            {"h": 3, "focus": 3, "to": [2, 4], "look": [0, 1], "camBoss": "redfox", "key": "8", "targetBoss": "redfox", "pauseMs": 1250},
            # Zone 3a (23.5s-29.5s): Trio confronts sp_mid [8,20]; Cherry detours LEFT to sw_left_twist [2,20] clearing sp_mid & slamming gate_trap! Tom steps to sw_rescue_cherry [5,17] freeing Cherry in-frame!
            {
                "focus": 2, "camFocus": [5.5, 18.5], "pauseMs": 1050,
                "parallel": [
                    {"h": 2, "to": [0, 6], "speedMul": 0.60},
                    {"h": 3, "to": [2, 5], "speedMul": 0.58},
                    {"h": 1, "to": [2, 4], "speedMul": 0.58}
                ]
            },
            {
                "focus": 1, "camFocus": [4.5, 17.5], "pauseMs": 850,
                "parallel": [
                    {"h": 1, "to": [1, 5], "speedMul": 0.58},
                    {"h": 3, "to": [2, 5], "speedMul": 0.58}
                ]
            },
            # Zone 3b (29.5s-34.5s): TOM vs BLACK FOX 1v1 — Tom grabs Bomb #2 [11,23], Cherry (2,6) & Bulldog (2,5) line behind, Tom blasts Black Fox!
            {
                "focus": 1, "camBoss": "blackfox", "pauseMs": 350,
                "parallel": [
                    {"h": 1, "to": [3, 7], "key": "7", "speedMul": 0.60},
                    {"h": 2, "to": [2, 6], "speedMul": 0.60},
                    {"h": 3, "to": [2, 5], "speedMul": 0.60}
                ]
            },
            {"h": 1, "focus": 1, "to": [2, 7], "look": [0, 1], "camBoss": "blackfox", "key": "8", "targetBoss": "blackfox", "pauseMs": 1250},
            # Zone 4a (34.5s-41.5s): CHERRY vs BUFFALO 1v1 -> Bulldog flips sw_exit [11,35] clearing sp_exit [8,38] center-frame!
            {
                "focus": 2, "camBoss": "buffalo", "pauseMs": 350,
                "parallel": [
                    {"h": 2, "to": [3, 9], "key": "7", "speedMul": 0.60},
                    {"h": 1, "to": [2, 9], "speedMul": 0.60},
                    {"h": 3, "to": [2, 8], "speedMul": 0.60}
                ]
            },
            {"h": 2, "focus": 2, "to": [2, 10], "look": [0, 1], "camBoss": "buffalo", "key": "8", "targetBoss": "buffalo", "pauseMs": 1250},
            {
                "focus": 3, "camFocus": [9.5, 36.5], "pauseMs": 950,
                "parallel": [
                    {"h": 3, "to": [3, 11], "speedMul": 0.58},
                    {"h": 2, "to": [2, 11], "speedMul": 0.58},
                    {"h": 1, "to": [2, 10], "speedMul": 0.58}
                ]
            },
            # Zone 5 (41.5s-45s): ONE-BY-ONE SKYWARD EXIT! Cherry -> Tom -> Bulldog each enter Exit (2,13) solo, shrink & fly over GLOBAL GAMES SK to earn green ticks in order!
            {
                "focus": 2, "camFocus": [8.0, 39.5], "pauseMs": 540,
                "parallel": [
                    {"h": 2, "to": [2, 13], "speedMul": 0.66},
                    {"h": 1, "to": [2, 12], "speedMul": 0.64},
                    {"h": 3, "to": [2, 11], "speedMul": 0.64}
                ]
            },
            {
                "focus": 1, "camFocus": [8.0, 39.5], "pauseMs": 540,
                "parallel": [
                    {"h": 1, "to": [2, 13], "speedMul": 0.66},
                    {"h": 3, "to": [2, 12], "speedMul": 0.64}
                ]
            },
            {"h": 3, "focus": 3, "to": [2, 13], "camFocus": [8.0, 39.5], "pauseMs": 560, "speedMul": 0.66}
        ]
    }
    if len(levels) >= 11:
        levels[10] = l11
    else:
        levels.append(l11)

    # ------------------------------------------------------------------
    # LEVEL 12: Sacrifice & Revenge Protocol (Blocked-Star Sad + Combat Casualty + Survivor Sky Flight)
    # ------------------------------------------------------------------
    W12, H12 = 22, 43  # 7 cols x 14 rows (98 cells, all 1-layer inner walls)
    w12 = [["1"] * W12 for _ in range(H12)]
    for ci in range(7):
        for cj in range(14):
            for dx in (1, 2):
                for dy in (1, 2):
                    w12[3 * cj + dy][3 * ci + dx] = "0"

    l12_edges = [
        # --- ZONE 1 (rows 0-3): Cherry Blocked at gate_star (4,1)->(4,2) [14,8] (SAD EMOTION!) -> Tom sw_star_gate (2,2) -> Free Bulldog (1,3) ---
        ((1, 0), (2, 0)), ((2, 0), (2, 1)), ((4, 0), (4, 1)), ((4, 1), (4, 2)),
        ((2, 1), (3, 1)), ((3, 1), (4, 1)), ((2, 1), (2, 2)), ((2, 2), (2, 3)),
        ((0, 0), (1, 0)), ((2, 0), (3, 0)), ((3, 0), (4, 0)), ((4, 0), (5, 0)), ((5, 0), (6, 0)),
        ((0, 0), (0, 1)), ((0, 1), (1, 1)), ((0, 1), (0, 2)), ((1, 1), (1, 2)),
        ((5, 0), (5, 1)), ((6, 0), (6, 1)), ((5, 1), (5, 2)), ((6, 1), (6, 2)), ((3, 1), (3, 2)),
        ((1, 3), (2, 3)), ((2, 3), (3, 3)), ((3, 3), (4, 3)), ((4, 3), (5, 3)), ((5, 3), (6, 3)),
        ((0, 3), (0, 4)), ((0, 4), (1, 4)),

        # --- ZONE 2 (rows 4-5): Tom Shield #1 (1,4) -> saw_top [11..14,14] -> sw_saw (4,5) -> Cherry Bomb #1 (5,4) -> Red Fox (2,5) ---
        ((2, 3), (2, 4)), ((1, 4), (2, 4)),
        ((2, 4), (3, 4)), ((3, 4), (4, 4)), ((4, 4), (5, 4)), ((4, 4), (4, 5)), ((3, 5), (4, 5)),
        ((5, 4), (6, 4)), ((6, 4), (6, 5)), ((5, 4), (5, 5)),
        ((2, 4), (2, 5)),

        # --- ZONE 3 (rows 5-8): sp_mid (2,6) -> Bulldog sw_mid (4,6) -> Bulldog Sacrifice vs Black Fox (2,8, hp=3) -> Tom Avenge Bomb #2 (1,7)! ---
        ((2, 5), (2, 6)), ((2, 6), (2, 7)),
        ((0, 5), (1, 5)), ((1, 5), (2, 5)), ((0, 5), (0, 6)), ((0, 6), (1, 6)),
        ((3, 5), (3, 6)), ((3, 6), (4, 6)), ((4, 6), (5, 6)), ((5, 6), (6, 6)),
        ((0, 7), (1, 7)), ((0, 7), (0, 8)), ((1, 7), (1, 8)), ((1, 7), (2, 7)),
        ((2, 7), (3, 7)), ((3, 7), (4, 7)), ((4, 7), (5, 7)), ((5, 7), (6, 7)),
        ((2, 7), (2, 8)),

        # --- ZONE 4 (rows 8-13): Cherry Bomb #3 vs Buffalo (2,11) -> Tom sw_exit (3,11) -> sp_exit (2,12) -> 2 Survivors Skyward Exit (2,13) ---
        ((3, 8), (4, 8)), ((4, 8), (5, 8)), ((5, 8), (6, 8)), ((3, 7), (3, 8)), ((5, 7), (5, 8)), ((6, 7), (6, 8)),
        ((2, 8), (2, 9)), ((1, 9), (2, 9)), ((2, 9), (3, 9)),
        ((0, 9), (1, 9)), ((0, 9), (0, 10)), ((1, 9), (1, 10)), ((0, 10), (1, 10)), ((1, 10), (1, 11)), ((0, 11), (1, 11)),
        ((3, 9), (4, 9)), ((4, 9), (5, 9)), ((5, 9), (6, 9)),
        ((2, 9), (2, 10)), ((2, 10), (2, 11)), ((2, 11), (3, 11)),
        ((3, 10), (4, 10)), ((4, 10), (5, 10)), ((5, 10), (6, 10)), ((4, 10), (4, 11)), ((3, 11), (4, 11)), ((5, 11), (6, 11)),
        ((0, 11), (0, 12)), ((0, 12), (1, 12)), ((4, 11), (4, 12)), ((3, 12), (4, 12)), ((5, 11), (5, 12)), ((6, 11), (6, 12)),
        ((2, 11), (2, 12)), ((2, 12), (2, 13)),
        ((0, 13), (1, 13)), ((1, 13), (2, 13)), ((2, 13), (3, 13)), ((3, 13), (4, 13)), ((4, 13), (5, 13)), ((5, 13), (6, 13))
    ]
    for c1, c2 in l12_edges:
        open_doorway(w12, 7, 14, c1, c2)

    l12 = {
        "name": "Level 12: Sacrifice & Revenge",
        "W": W12,
        "H": H12,
        "theme": "blue",
        "alwaysAuto": True,
        "exitFly": True,
        "walls": ["".join(r) for r in w12],
        "start": [1, 0],
        "start2": [4, 0],
        "start3": [1, 3],
        "hero3": "bulldog",
        "exit": [2, 13],
        "cast": {"friends": ["tom", "cherry", "bulldog"], "enemies": ["redfox", "blackfox", "buffalo"]},
        "enemies": [
            {
                "id": "redfox", "name": "Red Fox", "x": 8, "y": 17, "speed": 1.85, "hp": 1,
                "waitForFrame": True,
                "bounds": [7.6, 16.6, 9.2, 18.2],
                "waypoints": [[8, 17], [8.8, 17], [8, 17.8]]
            },
            {
                "id": "blackfox", "name": "Black Fox", "x": 8, "y": 26, "speed": 1.9, "hp": 3,
                "waitForFrame": True,
                "bounds": [7.6, 25.6, 9.2, 27.2],
                "waypoints": [[8, 25.8], [8.8, 26], [8, 26.8]]
            },
            {
                "id": "buffalo", "name": "Buffalo", "x": 8, "y": 35, "speed": 1.85, "hp": 2,
                "waitForFrame": True,
                "bounds": [7.6, 34.6, 9.2, 36.2],
                "waypoints": [[8, 34.8], [8.8, 35], [8, 35.8]]
            }
        ],
        "coins": [
            [14, 8], [8, 8], [11, 11], [14, 14], [17, 14],
            [14, 20], [5, 23], [11, 29], [11, 35], [8, 38]
        ],
        "bubbles": [[5, 29]],
        "shields": [[5, 14], [11, 23]],
        "bombs": [[17, 14], [5, 23], [11, 29]],
        "saws": [[11, 14, 14, 14, "saw_top"]],
        "wsaws": [],
        "lasers": [],
        "gates": [
            {"id": "gate_star", "blocks": [[13, 6], [14, 6]], "open": False, "label": "STAR LOCK"},
            {"id": "gate_bulldog", "blocks": [[6, 10], [6, 11]], "open": False, "label": "BULLDOG CAGE"}
        ],
        "switches": [
            {
                "id": "sw_star_gate", "hero": "tom", "x": 8, "y": 8, "side": "left",
                "color": "#00e676",
                "targets": ["gate_star"],
                "msg": "Green Switch! Tom Unlocked Cherry's Star!"
            },
            {
                "id": "sw_bulldog", "hero": "tom", "x": 11, "y": 11, "side": "top",
                "color": "#00e676",
                "targets": ["gate_bulldog"],
                "msg": "Green Switch! Tom Freed Bulldog!"
            },
            {
                "id": "sw_saw", "hero": "tom", "x": 14, "y": 17, "side": "bottom",
                "color": "#00e676",
                "targets": ["saw_top"],
                "msg": "Switch! Tom Retracted Saw Blade!"
            },
            {
                "id": "sw_mid", "hero": "bulldog", "x": 14, "y": 20, "side": "bottom",
                "color": "#00e676",
                "targets": ["sp_mid"],
                "msg": "Green Switch! Bulldog Cleared Mid Spikes!"
            },
            {
                "id": "sw_exit", "hero": "tom", "x": 11, "y": 35, "side": "bottom",
                "color": "#00e676",
                "targets": ["sp_exit"],
                "msg": "Final Switch! Tom Cleared Exit Spikes!"
            }
        ],
        "spikes": [
            {"id": "sp_mid", "x": 8, "y": 20, "dir": "v"},
            {"id": "sp_exit", "x": 8, "y": 38, "dir": "v"}
        ],
        "autoPlan": [
            # Zone 1a (0s-4s): Cherry reaches blocked gate_star (4,1) trying to collect Star [14,8] -> SAD EMOTION!
            {
                "focus": 2, "camFocus": [13.5, 6.5], "pauseMs": 850,
                "parallel": [
                    {"h": 2, "to": [4, 1], "look": [0, 1], "emo": "sad", "emoSec": 1.6, "speedMul": 0.66},
                    {"h": 1, "to": [2, 1], "speedMul": 0.66}
                ]
            },
            # Zone 1b (4s-10s): Tom hits sw_star_gate [8,8] center-frame; Cherry celebrates & collects [14,8], then Tom hits sw_bulldog [11,11] under [8.0, 11.0]!
            {"h": 1, "focus": 1, "to": [2, 2], "camFocus": [11.0, 6.5], "pauseMs": 720, "speedMul": 0.68},
            {
                "focus": 2, "camFocus": [13.0, 7.0], "pauseMs": 380,
                "parallel": [
                    {"h": 2, "to": [4, 2], "emo": "laugh", "emoSec": 1.4, "speedMul": 0.72},
                    {"h": 1, "to": [2, 2], "speedMul": 0.66}
                ]
            },
            {
                "focus": 1, "camFocus": [8.0, 11.0], "pauseMs": 720,
                "parallel": [
                    {"h": 1, "to": [3, 3], "speedMul": 0.68},
                    {"h": 2, "to": [2, 3], "speedMul": 0.70}
                ]
            },
            # Zone 2 (10s-17s): Tom Shield #1 -> saw_top -> sw_saw (4,5) [14,17]; then CHERRY grabs Bomb #1 (5,4) -> CHERRY vs RED FOX 1v1!
            {
                "focus": 1, "camFocus": [6.5, 13.0], "pauseMs": 260,
                "parallel": [
                    {"h": 1, "to": [1, 4], "speedMul": 0.70},
                    {"h": 2, "to": [2, 3], "speedMul": 0.68},
                    {"h": 3, "to": [2, 2], "speedMul": 0.68}
                ]
            },
            {"h": 1, "focus": 1, "to": [4, 5], "camFocus": [12.5, 15.5], "pauseMs": 720, "speedMul": 0.72},
            {
                "focus": 2, "camFocus": [14.5, 14.0], "pauseMs": 260,
                "parallel": [
                    {"h": 2, "to": [5, 4], "key": "7", "speedMul": 0.74},
                    {"h": 1, "to": [2, 3], "speedMul": 0.72},
                    {"h": 3, "to": [2, 2], "speedMul": 0.72}
                ]
            },
            {"h": 2, "focus": 2, "to": [2, 4], "look": [0, 1], "camBoss": "redfox", "key": "8", "targetBoss": "redfox", "pauseMs": 1050},
            # Zone 3a (17s-21s): sp_mid blocked -> Bulldog hits sw_mid (4,6) [14,20] center-frame clearing spikes!
            {
                "focus": 3, "camFocus": [11.0, 18.5], "pauseMs": 720,
                "parallel": [
                    {"h": 3, "to": [4, 6], "speedMul": 0.72},
                    {"h": 2, "to": [2, 5], "speedMul": 0.70},
                    {"h": 1, "to": [2, 4], "speedMul": 0.70}
                ]
            },
            # Zone 3b (21s-30s): BULLDOG vs BLACK FOX (hp=3) -> Bulldog Shield Throw (hp 3->2), then Heroic Melee Clash -> BULLDOG DIES IN COMBAT! Tom & Cherry grieve!
            {
                "focus": 3, "camBoss": "blackfox", "pauseMs": 260,
                "parallel": [
                    {"h": 3, "to": [3, 7], "speedMul": 0.72},
                    {"h": 2, "to": [2, 6], "speedMul": 0.72},
                    {"h": 1, "to": [2, 5], "speedMul": 0.72}
                ]
            },
            {"h": 3, "focus": 3, "to": [2, 7], "look": [0, 1], "camBoss": "blackfox", "key": "shield_throw", "targetBoss": "blackfox", "pauseMs": 820},
            {"h": 3, "focus": 3, "to": [2, 8], "look": [0, 1], "camBoss": "blackfox", "sacrificeToBoss": "blackfox", "dmg": 1, "pauseMs": 1150},
            # AVENGING BULLDOG: Tom grabs Bomb #2 (1,7) [5,23], Cherry backs up to (2,6), Tom blasts wounded Black Fox!
            {
                "focus": 1, "camBoss": "blackfox", "pauseMs": 260,
                "parallel": [
                    {"h": 1, "to": [1, 7], "key": "7", "speedMul": 0.72},
                    {"h": 2, "to": [2, 6], "speedMul": 0.70}
                ]
            },
            {"h": 1, "focus": 1, "to": [2, 7], "look": [0, 1], "camBoss": "blackfox", "key": "8", "targetBoss": "blackfox", "pauseMs": 1050},
            # Zone 4 (30s-39s): CHERRY vs BUFFALO 1v1 -> Tom hits sw_exit [11,35] clearing sp_exit [8,38] center-frame!
            {
                "focus": 2, "camBoss": "buffalo", "pauseMs": 260,
                "parallel": [
                    {"h": 2, "to": [3, 9], "key": "7", "speedMul": 0.72},
                    {"h": 1, "to": [2, 9], "speedMul": 0.72}
                ]
            },
            {"h": 2, "focus": 2, "to": [2, 10], "look": [0, 1], "camBoss": "buffalo", "key": "8", "targetBoss": "buffalo", "pauseMs": 1050},
            {
                "focus": 1, "camFocus": [9.5, 36.5], "pauseMs": 780,
                "parallel": [
                    {"h": 1, "to": [3, 11], "speedMul": 0.70},
                    {"h": 2, "to": [2, 11], "speedMul": 0.70}
                ]
            },
            # Zone 5 (39s-44s): Two Survivors CHERRY -> TOM fly one-by-one from Exit into Happy Green Ticks while Bulldog stays Red X Crying!
            {
                "focus": 2, "camFocus": [8.0, 39.5], "pauseMs": 520,
                "parallel": [
                    {"h": 2, "to": [2, 13], "speedMul": 0.72},
                    {"h": 1, "to": [2, 12], "speedMul": 0.70}
                ]
            },
            {"h": 1, "focus": 1, "to": [2, 13], "camFocus": [8.0, 39.5], "pauseMs": 540, "speedMul": 0.72}
        ]
    }
    if len(levels) >= 12:
        levels[11] = l12
    else:
        levels.append(l12)

    # ------------------------------------------------------------------
    # LEVEL 13 (7x10 Grid | Theme=blue | Swift Sacrifice <30s & 4K Shorts)
    # Tight sub-30s runtime + recording length (<30s), Cherry fights & dies heroically
    # vs Black Fox (sad + red cross), Tom avenges her, Tom & Bulldog fly 1-by-1!
    # ------------------------------------------------------------------
    cw13, ch13 = 7, 10
    w13 = 3 * cw13 + 1   # 22
    h13 = 3 * ch13 + 1   # 31
    wg13 = [["1"] * w13 for _ in range(h13)]
    l13_edges = [
        # Top Zone (Rows 0-2): Tom frees blocked star for Cherry, Cherry frees Bulldog
        ((0, 0), (1, 0)), ((1, 0), (2, 0)), ((2, 0), (3, 0)), ((3, 0), (3, 1)),
        ((1, 0), (1, 1)), ((1, 1), (2, 1)),
        ((4, 0), (5, 0)), ((5, 0), (6, 0)), ((6, 0), (6, 1)), ((5, 0), (5, 1)),
        ((4, 0), (4, 1)), ((4, 1), (4, 2)),
        ((0, 1), (0, 2)), ((0, 2), (1, 2)), ((1, 2), (2, 2)),
        ((2, 1), (2, 2)), ((4, 2), (3, 2)), ((3, 2), (2, 2)),
        ((4, 2), (5, 2)), ((5, 2), (6, 2)), ((6, 2), (6, 3)),
        ((5, 2), (5, 3)), ((5, 3), (4, 3)), ((4, 3), (3, 3)),
        # Zone 2 (Rows 3-4): Bulldog grabs Shield at (1,3) & 1v1 vs Red Fox at (2,4)
        ((2, 2), (2, 3)), ((2, 3), (1, 3)), ((1, 3), (0, 3)),
        ((2, 3), (2, 4)),
        ((2, 4), (1, 4)), ((1, 4), (0, 4)), ((1, 4), (1, 5)), ((1, 5), (0, 5)),
        ((2, 4), (3, 4)), ((3, 4), (4, 4)), ((4, 4), (5, 4)), ((5, 4), (6, 4)),
        ((6, 4), (6, 5)), ((6, 5), (5, 5)),
        # Row 5: Switch sw_mid at (4,5) clears sp_mid at (2,5) (1-way spine!)
        ((4, 4), (4, 5)), ((4, 5), (3, 5)),
        ((2, 4), (2, 5)), ((2, 5), (2, 6)),
        # Zone 3 (Rows 6-7): Cherry Shield + Sacrifice vs Black Fox, Tom Bomb Revenge
        ((2, 6), (1, 6)), ((1, 6), (0, 6)), ((0, 6), (0, 7)), ((1, 6), (1, 7)),
        ((2, 6), (3, 6)), ((3, 6), (4, 6)), ((4, 6), (5, 6)), ((5, 6), (6, 6)),
        ((6, 6), (6, 7)), ((6, 7), (5, 7)),
        ((2, 6), (2, 7)),
        # Zone 4 (Rows 7-9): Final Switch sw_exit at (4,8) clears sp_exit at (2,8) -> Exit (2,9)
        ((2, 7), (3, 7)), ((3, 7), (4, 7)), ((4, 7), (4, 8)), ((3, 7), (3, 8)),
        ((6, 7), (6, 8)), ((6, 8), (5, 8)),
        ((0, 7), (0, 8)), ((0, 8), (1, 8)),
        ((2, 7), (2, 8)), ((2, 8), (2, 9)),
        ((2, 9), (1, 9)), ((1, 9), (0, 9)),
        ((2, 9), (3, 9)), ((3, 9), (4, 9)), ((4, 9), (5, 9)), ((5, 9), (6, 9))
    ]
    for c1, c2 in l13_edges:
        open_doorway(wg13, cw13, ch13, c1, c2)

    l13 = {
        "name": "Level 13: Swift Sacrifice (<30s)",
        "W": w13,
        "H": h13,
        "theme": "blue",
        "alwaysAuto": True,
        "exitFly": True,
        "under30s": True,
        "start": [1, 0],
        "start2": [4, 0],
        "start3": [1, 2],
        "hero3": "bulldog",
        "exit": [2, 9],
        "walls": ["".join(r) for r in wg13],
        "cast": {
            "friends": ["tom", "cherry", "bulldog"],
            "enemies": ["redfox", "blackfox"]
        },
        "enemies": [
            {
                "id": "redfox",
                "name": "Red Fox",
                "x": 8,
                "y": 14,
                "speed": 1.9,
                "hp": 1,
                "waitForFrame": True,
                "bounds": [7.6, 13.6, 9.2, 15.2],
                "waypoints": [[8, 14], [8.8, 14], [8, 14.8]]
            },
            {
                "id": "blackfox",
                "name": "Black Fox",
                "x": 8,
                "y": 23,
                "speed": 1.95,
                "hp": 3,
                "waitForFrame": True,
                "bounds": [7.6, 22.6, 9.2, 24.2],
                "waypoints": [[8, 22.8], [8.8, 23], [8, 23.8]]
            }
        ],
        "bubbles": [],
        "shields": [[5, 11], [5, 20]],
        "bombs": [[11, 20]],
        "saws": [],
        "wsaws": [],
        "lasers": [],
        "coins": [
            [5, 5],
            [14, 8],
            [11, 8],
            [8, 11],
            [11, 14],
            [14, 14],
            [8, 17],
            [8, 20],
            [14, 23],
            [8, 26]
        ],
        "gates": [
            {
                "id": "gate_star",
                "blocks": [[13, 6], [14, 6]],
                "open": False,
                "label": "STAR LOCK"
            },
            {
                "id": "gate_bulldog",
                "blocks": [[6, 7], [6, 8]],
                "open": False,
                "label": "BULLDOG CAGE"
            }
        ],
        "switches": [
            {
                "id": "sw_star_gate",
                "hero": "tom",
                "x": 8,
                "y": 4,
                "side": "top",
                "color": "#00e676",
                "targets": ["gate_star"],
                "msg": "Green Switch! Tom Unlocked Cherry's Star!"
            },
            {
                "id": "sw_bulldog",
                "hero": "cherry",
                "x": 11,
                "y": 7,
                "side": "top",
                "color": "#00e676",
                "targets": ["gate_bulldog"],
                "msg": "Green Switch! Cherry Freed Bulldog!"
            },
            {
                "id": "sw_mid",
                "hero": "bulldog",
                "x": 14,
                "y": 17,
                "side": "bottom",
                "color": "#00e676",
                "targets": ["sp_mid"],
                "msg": "Green Switch! Bulldog Cleared Mid Spikes!"
            },
            {
                "id": "sw_exit",
                "hero": "bulldog",
                "x": 14,
                "y": 26,
                "side": "bottom",
                "color": "#00e676",
                "targets": ["sp_exit"],
                "msg": "Final Switch! Bulldog Cleared Exit Spikes!"
            }
        ],
        "spikes": [
            {"id": "sp_mid", "x": 8, "y": 17, "dir": "v"},
            {"id": "sp_exit", "x": 8, "y": 26, "dir": "v"}
        ],
        "autoPlan": [
            # Step 0: Cherry reaches blocked gate seeing star (sad reaction) while Tom collects top star
            {
                "focus": 2,
                "camFocus": [12.5, 5.5],
                "pauseMs": 520,
                "parallel": [
                    {"h": 2, "to": [4, 1], "look": [0, 1], "emo": "sad", "emoSec": 1.5, "speedMul": 1.0},
                    {"h": 1, "to": [1, 1], "speedMul": 1.0}
                ]
            },
            # Step 1: Tom hits sw_star_gate in full frame unlocking Cherry's star
            {"h": 1, "focus": 1, "to": [2, 1], "camFocus": [11.0, 5.5], "pauseMs": 420, "speedMul": 1.04},
            # Step 2: Cherry laughs grabbing star & hits sw_bulldog freeing Bulldog (in frame!)
            {
                "focus": 2,
                "camFocus": [8.5, 7.5],
                "pauseMs": 420,
                "parallel": [
                    {"h": 2, "to": [3, 2], "emo": "laugh", "emoSec": 1.2, "speedMul": 1.06},
                    {"h": 1, "to": [2, 2], "speedMul": 0.96}
                ]
            },
            # Step 3: Bulldog rushes out to grab Shield [5,11] for 1v1 vs Red Fox
            {
                "focus": 3,
                "camFocus": [6.5, 10.5],
                "pauseMs": 220,
                "parallel": [
                    {"h": 3, "to": [1, 3], "speedMul": 1.08},
                    {"h": 2, "to": [3, 2], "speedMul": 0.96},
                    {"h": 1, "to": [2, 2], "speedMul": 0.96}
                ]
            },
            # Step 4: Bulldog 1v1 throws Shield defeating Red Fox (hp=1)
            {"h": 3, "focus": 3, "to": [2, 3], "look": [0, 1], "camBoss": "redfox", "key": "shield_throw", "targetBoss": "redfox", "pauseMs": 720, "speedMul": 1.06},
            # Step 5: Bulldog advances through Red Fox lane to hit sw_mid clearing sp_mid in full frame
            {
                "focus": 3,
                "camFocus": [11.0, 16.8],
                "pauseMs": 420,
                "parallel": [
                    {"h": 3, "to": [4, 5], "speedMul": 1.1},
                    {"h": 1, "to": [2, 3], "speedMul": 1.05},
                    {"h": 2, "to": [2, 2], "speedMul": 1.05}
                ]
            },
            # Step 6: Cherry takes lead grabbing Shield [5,20] at (1,6); Tom & Bulldog hold outside boss zone
            {
                "focus": 2,
                "camBoss": "blackfox",
                "pauseMs": 200,
                "parallel": [
                    {"h": 2, "to": [1, 6], "speedMul": 1.14},
                    {"h": 1, "to": [2, 5], "speedMul": 1.08},
                    {"h": 3, "to": [3, 4], "speedMul": 1.04}
                ]
            },
            # Step 7: Cherry 1v1 throws Shield damaging Black Fox (hp 3 -> 2)
            {"h": 2, "focus": 2, "to": [2, 6], "look": [0, 1], "camBoss": "blackfox", "key": "shield_throw", "targetBoss": "blackfox", "pauseMs": 620, "speedMul": 1.06},
            # Step 8: Cherry charges Black Fox in heroic sacrifice (dmg=1 -> hp 1, Cherry dies with red cross + sad!)
            {"h": 2, "focus": 2, "to": [2, 7], "look": [0, 1], "camBoss": "blackfox", "sacrificeToBoss": "blackfox", "dmg": 1, "pauseMs": 800, "speedMul": 1.06},
            # Step 9: Grieving Tom runs for Bomb [11,20] at (3,6) while Bulldog advances to (2,5)
            {
                "focus": 1,
                "camBoss": "blackfox",
                "pauseMs": 180,
                "parallel": [
                    {"h": 1, "to": [3, 6], "key": "7", "speedMul": 1.1},
                    {"h": 3, "to": [2, 5], "speedMul": 1.06}
                ]
            },
            # Step 10: Tom 1v1 throws Bomb finishing Black Fox to avenge Cherry!
            {"h": 1, "focus": 1, "to": [2, 6], "look": [0, 1], "camBoss": "blackfox", "key": "8", "targetBoss": "blackfox", "pauseMs": 720, "speedMul": 1.08},
            # Step 11: Bulldog clears Exit Spikes via sw_exit in full frame while Tom waits at (2,7)
            {
                "focus": 3,
                "camFocus": [11.0, 26.0],
                "pauseMs": 420,
                "parallel": [
                    {"h": 3, "to": [4, 8], "speedMul": 1.12},
                    {"h": 1, "to": [2, 7], "speedMul": 1.02}
                ]
            },
            # Step 12: Survivor #1 Tom enters Exit (2,9) and flies up to Top Cast green tick
            {
                "focus": 1,
                "camFocus": [8.0, 27.5],
                "pauseMs": 500,
                "parallel": [
                    {"h": 1, "to": [2, 9], "speedMul": 1.05},
                    {"h": 3, "to": [2, 8], "speedMul": 1.12}
                ]
            },
            # Step 13: Survivor #2 Bulldog enters Exit (2,9) and flies up to Top Cast green tick!
            {"h": 3, "focus": 3, "to": [2, 9], "camFocus": [8.0, 27.5], "pauseMs": 520, "speedMul": 1.06}
        ]
    }
    if len(levels) >= 13:
        levels[12] = l13
    else:
        levels.append(l13)

    # ------------------------------------------------------------------
    # LEVEL 14 (6x10 Grid | Theme=blue | Bulldog's Stand (~32s Video))
    # Smaller 6x10 grid + smoother reduced speed (0.72-0.78), Bulldog fights Black Fox
    # and dies (Big Crying Death-Fly -> Red Cross), Tom & Cherry avenge and fly 1-by-1!
    # ------------------------------------------------------------------
    cw14, ch14 = 6, 10
    w14 = 3 * cw14 + 1   # 19
    h14 = 3 * ch14 + 1   # 31
    wg14 = [["1"] * w14 for _ in range(h14)]
    l14_edges = [
        # Top Zone (Rows 0-2): Tom unlocks blocked star for Cherry; Cherry frees Bulldog
        ((0, 0), (1, 0)), ((1, 0), (2, 0)), ((2, 0), (3, 0)), ((3, 0), (3, 1)),
        ((1, 0), (1, 1)), ((1, 1), (2, 1)),
        ((4, 0), (5, 0)), ((5, 0), (5, 1)), ((4, 0), (4, 1)), ((4, 1), (4, 2)),
        ((0, 1), (0, 2)), ((0, 2), (1, 2)), ((1, 2), (2, 2)),
        ((2, 1), (2, 2)), ((4, 2), (3, 2)), ((3, 2), (2, 2)),
        ((4, 2), (5, 2)), ((5, 2), (5, 3)),
        # Zone 2 (Rows 3-4): Bulldog grabs Shield at (1,3) & 1v1 vs Red Fox at (2,4)
        ((2, 2), (2, 3)), ((2, 3), (1, 3)), ((1, 3), (0, 3)),
        ((3, 3), (4, 3)), ((4, 3), (5, 3)),
        ((2, 3), (2, 4)),
        ((2, 4), (1, 4)), ((1, 4), (0, 4)), ((1, 4), (1, 5)), ((1, 5), (0, 5)),
        ((2, 4), (3, 4)), ((3, 4), (4, 4)), ((4, 4), (5, 4)), ((5, 4), (5, 5)),
        # Row 5: Cherry presses sw_mid at (4,5) clearing sp_mid at (2,5)
        ((4, 4), (4, 5)), ((4, 5), (3, 5)),
        ((2, 4), (2, 5)), ((2, 5), (2, 6)),
        # Zone 3 (Rows 6-7): Bulldog Shield + Sacrifice vs Black Fox (deathFly!), Tom Bomb Revenge
        ((2, 6), (1, 6)), ((1, 6), (0, 6)), ((0, 6), (0, 7)), ((1, 6), (1, 7)),
        ((2, 6), (3, 6)), ((3, 6), (4, 6)), ((4, 6), (5, 6)), ((5, 6), (5, 7)),
        ((2, 6), (2, 7)),
        # Zone 4 (Rows 7-9): Cherry presses sw_exit at (4,8) clearing sp_exit at (2,8) -> Exit (2,9)
        ((2, 7), (3, 7)), ((3, 7), (4, 7)), ((4, 7), (4, 8)), ((3, 7), (3, 8)),
        ((5, 7), (5, 8)),
        ((0, 7), (0, 8)), ((0, 8), (1, 8)),
        ((2, 7), (2, 8)), ((2, 8), (2, 9)),
        ((2, 9), (1, 9)), ((1, 9), (0, 9)),
        ((2, 9), (3, 9)), ((3, 9), (4, 9)), ((4, 9), (5, 9))
    ]
    for c1, c2 in l14_edges:
        open_doorway(wg14, cw14, ch14, c1, c2)

    l14 = {
        "name": "Level 14: Bulldog's Stand (32s)",
        "W": w14,
        "H": h14,
        "theme": "blue",
        "alwaysAuto": True,
        "exitFly": True,
        "deathFly": True,
        "winHoldMs": 2800,
        "start": [1, 0],
        "start2": [4, 0],
        "start3": [1, 2],
        "hero3": "bulldog",
        "exit": [2, 9],
        "walls": ["".join(r) for r in wg14],
        "cast": {
            "friends": ["tom", "cherry", "bulldog"],
            "enemies": ["redfox", "blackfox"]
        },
        "enemies": [
            {
                "id": "redfox",
                "name": "Red Fox",
                "x": 8,
                "y": 14,
                "speed": 1.85,
                "hp": 1,
                "waitForFrame": True,
                "bounds": [7.6, 13.6, 9.2, 15.2],
                "waypoints": [[8, 14], [8.8, 14], [8, 14.8]]
            },
            {
                "id": "blackfox",
                "name": "Black Fox",
                "x": 8,
                "y": 23,
                "speed": 1.9,
                "hp": 3,
                "waitForFrame": True,
                "bounds": [7.6, 22.6, 9.2, 24.2],
                "waypoints": [[8, 22.8], [8.8, 23], [8, 23.8]]
            }
        ],
        "bubbles": [],
        "shields": [[5, 11], [5, 20]],
        "bombs": [[11, 20]],
        "saws": [],
        "wsaws": [],
        "lasers": [],
        "coins": [
            [5, 5],
            [14, 8],
            [11, 8],
            [8, 11],
            [11, 14],
            [14, 14],
            [8, 17],
            [8, 20],
            [14, 23],
            [8, 26]
        ],
        "gates": [
            {
                "id": "gate_star",
                "blocks": [[13, 6], [14, 6]],
                "open": False,
                "label": "STAR LOCK"
            },
            {
                "id": "gate_bulldog",
                "blocks": [[6, 7], [6, 8]],
                "open": False,
                "label": "BULLDOG CAGE"
            }
        ],
        "switches": [
            {
                "id": "sw_star_gate",
                "hero": "tom",
                "x": 8,
                "y": 4,
                "side": "top",
                "color": "#00e676",
                "targets": ["gate_star"],
                "msg": "Green Switch! Tom Unlocked Cherry's Star!"
            },
            {
                "id": "sw_bulldog",
                "hero": "cherry",
                "x": 11,
                "y": 7,
                "side": "top",
                "color": "#00e676",
                "targets": ["gate_bulldog"],
                "msg": "Green Switch! Cherry Freed Bulldog!"
            },
            {
                "id": "sw_mid",
                "hero": "cherry",
                "x": 14,
                "y": 17,
                "side": "bottom",
                "color": "#00e676",
                "targets": ["sp_mid"],
                "msg": "Green Switch! Cherry Cleared Mid Spikes!"
            },
            {
                "id": "sw_exit",
                "hero": "cherry",
                "x": 14,
                "y": 26,
                "side": "bottom",
                "color": "#00e676",
                "targets": ["sp_exit"],
                "msg": "Final Switch! Cherry Cleared Exit Spikes!"
            }
        ],
        "spikes": [
            {"id": "sp_mid", "x": 8, "y": 17, "dir": "v"},
            {"id": "sp_exit", "x": 8, "y": 26, "dir": "v"}
        ],
        "autoPlan": [
            # Step 0: Cherry reaches blocked gate seeing star (sad reaction) while Tom collects top star
            {
                "focus": 2,
                "camFocus": [12.5, 5.5],
                "pauseMs": 950,
                "parallel": [
                    {"h": 2, "to": [4, 1], "look": [0, 1], "emo": "sad", "emoSec": 1.8, "speedMul": 0.62},
                    {"h": 1, "to": [1, 1], "speedMul": 0.62}
                ]
            },
            # Step 1: Tom hits sw_star_gate in full frame unlocking Cherry's star
            {"h": 1, "focus": 1, "to": [2, 1], "camFocus": [11.0, 5.5], "pauseMs": 680, "speedMul": 0.63},
            # Step 2: Cherry laughs grabbing star & hits sw_bulldog freeing Bulldog (in frame!)
            {
                "focus": 2,
                "camFocus": [8.5, 7.5],
                "pauseMs": 700,
                "parallel": [
                    {"h": 2, "to": [3, 2], "emo": "laugh", "emoSec": 1.4, "speedMul": 0.64},
                    {"h": 1, "to": [2, 2], "speedMul": 0.60}
                ]
            },
            # Step 3: Bulldog exits cage to grab Shield [5,11] for 1v1 vs Red Fox
            {
                "focus": 3,
                "camFocus": [6.5, 10.5],
                "pauseMs": 360,
                "parallel": [
                    {"h": 3, "to": [1, 3], "speedMul": 0.65},
                    {"h": 2, "to": [3, 2], "speedMul": 0.60},
                    {"h": 1, "to": [2, 2], "speedMul": 0.60}
                ]
            },
            # Step 4: Bulldog 1v1 throws Shield defeating Red Fox (hp=1)
            {"h": 3, "focus": 3, "to": [2, 3], "look": [0, 1], "camBoss": "redfox", "key": "shield_throw", "targetBoss": "redfox", "pauseMs": 1150, "speedMul": 0.64},
            # Step 5: Cherry advances through Red Fox lane to hit sw_mid clearing sp_mid in full frame
            {
                "focus": 2,
                "camFocus": [11.0, 16.8],
                "pauseMs": 700,
                "parallel": [
                    {"h": 2, "to": [4, 5], "speedMul": 0.66},
                    {"h": 3, "to": [2, 4], "speedMul": 0.62},
                    {"h": 1, "to": [2, 3], "speedMul": 0.62}
                ]
            },
            # Step 6: Bulldog takes lead grabbing Shield [5,20] at (1,6); Tom & Cherry wait outside boss zone
            {
                "focus": 3,
                "camBoss": "blackfox",
                "pauseMs": 320,
                "parallel": [
                    {"h": 3, "to": [1, 6], "speedMul": 0.66},
                    {"h": 1, "to": [2, 5], "speedMul": 0.64},
                    {"h": 2, "to": [3, 4], "speedMul": 0.64}
                ]
            },
            # Step 7: Bulldog 1v1 throws Shield weakening Black Fox (hp 3 -> 2)
            {"h": 3, "focus": 3, "to": [2, 6], "look": [0, 1], "camBoss": "blackfox", "key": "shield_throw", "targetBoss": "blackfox", "pauseMs": 950, "speedMul": 0.64},
            # Step 8: Bulldog charges Black Fox & dies heroically -> BIG crying death-fly up to Red Cross!
            {"h": 3, "focus": 3, "to": [2, 7], "look": [0, 1], "camBoss": "blackfox", "sacrificeToBoss": "blackfox", "dmg": 1, "pauseMs": 1450, "speedMul": 0.64},
            # Step 9: Grieving Tom grabs Bomb [11,20] at (3,6) while Cherry moves up to (2,5)
            {
                "focus": 1,
                "camBoss": "blackfox",
                "pauseMs": 300,
                "parallel": [
                    {"h": 1, "to": [3, 6], "key": "7", "speedMul": 0.66},
                    {"h": 2, "to": [2, 5], "speedMul": 0.65}
                ]
            },
            # Step 10: Tom 1v1 throws Bomb finishing Black Fox to avenge Bulldog!
            {"h": 1, "focus": 1, "to": [2, 6], "look": [0, 1], "camBoss": "blackfox", "key": "8", "targetBoss": "blackfox", "pauseMs": 1020, "speedMul": 0.65},
            # Step 11: Cherry sprints down to flip sw_exit clearing Exit Spikes in full frame
            {
                "focus": 2,
                "camFocus": [11.0, 26.0],
                "pauseMs": 680,
                "parallel": [
                    {"h": 2, "to": [4, 8], "speedMul": 0.66},
                    {"h": 1, "to": [2, 7], "speedMul": 0.63}
                ]
            },
            # Step 12: Survivor #1 Cherry walks back & enters Exit (2,9) -> flies up to green tick!
            {
                "focus": 2,
                "camFocus": [8.0, 27.5],
                "pauseMs": 680,
                "parallel": [
                    {"h": 2, "to": [2, 9], "speedMul": 0.65},
                    {"h": 1, "to": [2, 8], "speedMul": 0.65}
                ]
            },
            # Step 13: Survivor #2 Tom enters Exit (2,9) -> flies up to green tick!
            {"h": 1, "focus": 1, "to": [2, 9], "camFocus": [8.0, 27.5], "pauseMs": 680, "speedMul": 0.65}
        ]
    }
    if len(levels) >= 14:
        levels[13] = l14
    else:
        levels.append(l14)

    # Write formatted tc_levels.js
    out_js = "// Tom & Cherry Arcade Maze Levels (Exact maze layouts with Tom, Cherry, Bulldog & Villains)\nwindow.LEVELS = " + json.dumps(levels, indent=2) + ";\n"
    with open(TC_LEVELS, "w", encoding="utf-8") as f:
        f.write(out_js)
    print(f"Wrote updated {TC_LEVELS} ({len(levels)} levels).")

    # ------------------------------------------------------------------
    # VERIFY GEOMETRY & INTERACTIVE SOLVABILITY (ALL 6 LEVELS)
    # ------------------------------------------------------------------
    for idx, L in enumerate(levels):
        walls = L["walls"]
        H, W = len(walls), len(walls[0])
        CW, CH = (W - 1) // 3, (H - 1) // 3

        def is_open(x, y, opened_gate_tiles):
            return 0 <= x < W and 0 <= y < H and (walls[y][x] == "0" or (x, y) in opened_gate_tiles)

        def cell_neighbors(i, j, closed_tiles, closed_edges, opened_gate_tiles):
            cx, cy = 3 * i + 2, 3 * j + 2
            res = []
            for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ni, nj = i + di, j + dj
                if 0 <= ni < CW and 0 <= nj < CH:
                    if ((i, j), (ni, nj)) in closed_edges or ((ni, nj), (i, j)) in closed_edges:
                        continue
                    wx = cx + (1 if di == 1 else (-2 if di == -1 else 0))
                    wy = cy + (1 if dj == 1 else (-2 if dj == -1 else 0))
                    # Check both tiles of the 2-wide corridor & target cell center
                    tx, ty = 3 * ni + 2, 3 * nj + 2
                    if is_open(wx, wy, opened_gate_tiles) and (wx, wy) not in closed_tiles and (tx, ty) not in closed_tiles:
                        res.append((ni, nj))
            return res

        # 1. Verify switches are attached flush to an actual solid wall
        for sw in L.get("switches", []):
            assert has_adjacent_wall(walls, sw["x"], sw["y"], sw["side"]), (
                f"L{idx+1} switch {sw['id']} at ({sw['x']},{sw['y']}) side={sw['side']} has no adjacent wall!"
            )

        # 1b. Verify EVERY Zigzag Spike lies strictly between 2 opposite solid walls ('UD' for 'v', 'LR' for 'h')
        # AND never sits right next to a gate wall block (min distance >= 4.0 tiles!)
        for sp in L.get("spikes", []):
            sx, sy = sp["x"], sp["y"]
            if (sp.get("dir") or "h") == "v":
                assert walls[sy][sx - 2] == "1" and walls[sy][sx + 1] == "1", (
                    f"L{idx+1} spike {sp['id']} ({sx},{sy}) dir=v must lie strictly between left & right walls!"
                )
            else:
                assert walls[sy - 2][sx] == "1" and walls[sy + 1][sx] == "1", (
                    f"L{idx+1} spike {sp['id']} ({sx},{sy}) dir=h must lie strictly between top & bottom walls!"
                )
            for g in L.get("gates", []):
                for bx, by in g["blocks"]:
                    d_gate = ((bx - sx) ** 2 + (by - sy) ** 2) ** 0.5
                    assert d_gate >= 4.0, (
                        f"L{idx+1} spike {sp['id']} ({sx},{sy}) too close ({d_gate:.2f}) to gate {g['id']} ({bx},{by})!"
                    )

        # 1c. For Level 8+, verify EVERY grid cell (CW x CH) is carved open so inner walls are strictly 1 tile thick!
        if idx >= 7:
            for ci in range(CW):
                for cj in range(CH):
                    for dx in (1, 2):
                        for dy in (1, 2):
                            assert walls[3 * cj + dy][3 * ci + dx] == "0", (
                                f"L{idx+1} cell ({ci},{cj}) uncarved -> creates thick inner walls!"
                            )

        # 2. Verify all items sit on open walkable floor tiles
        for kind in ("coins", "shields", "bombs", "bubbles", "switches", "spikes"):
            for it in L.get(kind, []):
                px, py = (int(it["x"]), int(it["y"])) if isinstance(it, dict) else (it[0], it[1])
                assert walls[py][px] == "0", f"L{idx+1} {kind} at ({px},{py}) inside wall!"

        # 3. Simulate progression with active switches & bomb/shield Spike clearing
        heroes = [("tom", tuple(L["start"]))]
        if L.get("start2"):
            heroes.append(("cherry", tuple(L["start2"])))
        if L.get("start3"):
            heroes.append((L.get("hero3") or "bulldog", tuple(L["start3"])))

        open_gates = set(g["id"] for g in L.get("gates", []) if g.get("initialOpen"))
        open_spikes = set()
        used_bombs = set()
        used_shields = set()
        activated_switches = set()

        # Fixed-point simulation: heroes unlock switches, grab shields/bombs to clear spikes/gates
        hero_reach = {}
        for _ in range(20):
            closed = set()
            closed_edges = set()
            opened_gate_tiles = set()
            for g in L.get("gates", []):
                if g["id"] not in open_gates:
                    for bx, by in g["blocks"]:
                        closed.add((bx, by))
                else:
                    for bx, by in g["blocks"]:
                        opened_gate_tiles.add((bx, by))
            for sp in L.get("spikes", []):
                if sp["id"] not in open_spikes:
                    if sp.get("edge"):
                        c1, c2 = sp["edge"]
                        closed_edges.add((tuple(c1), tuple(c2)))
                    else:
                        closed.add((sp["x"], sp["y"]))

            changed = False
            for hid, hstart in heroes:
                seen = {hstart}
                q = deque([hstart])
                while q:
                    u = q.popleft()
                    for v in cell_neighbors(u[0], u[1], closed, closed_edges, opened_gate_tiles):
                        if v not in seen:
                            seen.add(v)
                            q.append(v)
                hero_reach[hid] = seen

                # Trigger switches reachable by this hero
                for sw in L.get("switches", []):
                    sc = ((sw["x"] - 1) // 3, (sw["y"] - 1) // 3)
                    if sc in seen and (not sw.get("hero") or sw["hero"] == hid):
                        if sw["id"] not in activated_switches:
                            activated_switches.add(sw["id"])
                            changed = True
                        for tid in sw.get("targets", []):
                            if any(g["id"] == tid for g in L.get("gates", [])) and tid not in open_gates:
                                open_gates.add(tid)
                                changed = True
                            if any(sp["id"] == tid for sp in L.get("spikes", [])) and tid not in open_spikes:
                                open_spikes.add(tid)
                                changed = True
                        for ctid in sw.get("closeTargets", []):
                            if ctid in open_gates and not used_bombs:
                                pass  # Will be blasted open if hero has a bomb!

                # Grab reachable side shields / bombs to clear any reachable adjacent spikes
                for s_idx, sh in enumerate(L.get("shields", [])):
                    shc = ((sh[0] - 1) // 3, (sh[1] - 1) // 3)
                    if shc in seen and s_idx not in used_shields:
                        for sp in L.get("spikes", []):
                            if sp["id"] not in open_spikes:
                                sp_cells = [tuple(c) for c in sp["edge"]] if sp.get("edge") else [((sp["x"] - 1) // 3, (sp["y"] - 1) // 3)]
                                if any(abs(spc[0] - r[0]) + abs(spc[1] - r[1]) <= 1 for spc in sp_cells for r in seen):
                                    open_spikes.add(sp["id"])
                                    used_shields.add(s_idx)
                                    changed = True
                                    break
                for b_idx, bm in enumerate(L.get("bombs", [])):
                    bmc = ((bm[0] - 1) // 3, (bm[1] - 1) // 3)
                    if bmc in seen and b_idx not in used_bombs:
                        for sp in L.get("spikes", []):
                            if sp["id"] not in open_spikes:
                                sp_cells = [tuple(c) for c in sp["edge"]] if sp.get("edge") else [((sp["x"] - 1) // 3, (sp["y"] - 1) // 3)]
                                if any(abs(spc[0] - r[0]) + abs(spc[1] - r[1]) <= 1 for spc in sp_cells for r in seen):
                                    open_spikes.add(sp["id"])
                                    used_bombs.add(b_idx)
                                    changed = True
                                    break
            if not changed:
                break

        ex = tuple(L["exit"])
        all_reach = set().union(*hero_reach.values())
        coins_missed = [c for c in L["coins"] if ((c[0] - 1) // 3, (c[1] - 1) // 3) not in all_reach]
        heroes_blocked = [hid for hid, _ in heroes if ex not in hero_reach[hid]]
        assert not coins_missed, f"L{idx+1} unreachable coins: {coins_missed}"
        assert not heroes_blocked, f"L{idx+1} heroes cannot reach Exit: {heroes_blocked}"
        print(f"L{idx+1} ({L['name']}, theme={L.get('theme')}): PASS! heroes={len(heroes)}, coins={len(L['coins'])}/10 reachable, switches={len(activated_switches)}/{len(L.get('switches',[]))}, spikes={len(L.get('spikes',[]))}, shields={L['shields']}, bombs={L['bombs']}")


if __name__ == "__main__":
    main()
