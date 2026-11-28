(window.LEVELS = window.LEVELS || []).push({
  "name": "Level 5: Goblin Boss Gauntlet",
  "num": 5,
  "theme": "blue",
  "W": 22,
  "H": 55,
  "walls": [
    "1111111111111111111111",
    "1001001001001001001001",
    "1001001001001001001001",
    "1001111111001111111001",
    "1000001001001001000001",
    "1000001001001001000001",
    "1111001111001111001111",
    "1000001001001001000001",
    "1000001001001001000001",
    "1001111111001111111001",
    "1001001001001001001001",
    "1001001001001001001001",
    "1001111111001111111001",
    "1001001001001001001001",
    "1001001001001001001001",
    "1001111111001111111001",
    "1001001000000001001001",
    "1001001000000001001001",
    "1001111001111001111001",
    "1000001000000001000001",
    "1000001000000001000001",
    "1111001111001111001111",
    "1001001001001001001001",
    "1001001001001001001001",
    "1111001111001111001111",
    "1000001001000001000001",
    "1000001001000001000001",
    "1001111111111001111001",
    "1001001001001001001001",
    "1001001001001001001001",
    "1001111111111001111001",
    "1000001000000001000001",
    "1000001000000001000001",
    "1111001001111111001111",
    "1001001001001001001001",
    "1001001001001001001001",
    "1111001001111111001111",
    "1000001000001001000001",
    "1000001000001001000001",
    "1001111111001111111001",
    "1000001001001001000001",
    "1000001001001001000001",
    "1111001111001111001111",
    "1001000001001000001001",
    "1001000001001000001001",
    "1111111001001001111111",
    "1001001000000001001001",
    "1001001000000001001001",
    "1111111111001111111111",
    "1001001001001001001001",
    "1001001001001001001001",
    "1111111111001111111111",
    "1001001001001001001001",
    "1001001001001001001001",
    "1111111111111111111111"
  ],
  "start": [
    0,
    0
  ],
  "start2": [
    6,
    0
  ],
  "start3": [
    3,
    0
  ],
  "hero3": "miles",
  "exit": [
    3,
    17
  ],
  "coins": [
    [
      2,
      5
    ],
    [
      5,
      14
    ],
    [
      2,
      32
    ],
    [
      20,
      5
    ],
    [
      17,
      14
    ],
    [
      20,
      32
    ],
    [
      11,
      8
    ],
    [
      8,
      20
    ],
    [
      14,
      20
    ],
    [
      11,
      50
    ]
  ],
  "bombs": [
    [
      2,
      11
    ],
    [
      20,
      11
    ],
    [
      11,
      26
    ],
    [
      11,
      38
    ]
  ],
  "saws": [
    [
      2,
      20,
      5,
      20
    ],
    [
      17,
      20,
      20,
      20
    ],
    [
      8,
      26,
      14,
      26
    ],
    [
      2,
      35,
      5,
      35
    ],
    [
      17,
      35,
      20,
      35
    ]
  ],
  "wsaws": [
    [
      2,
      29,
      1,
      0,
      1100
    ],
    [
      20,
      29,
      -1,
      0,
      1100
    ],
    [
      11,
      35,
      0,
      1,
      1300
    ]
  ],
  "lasers": [
    [
      8,
      17,
      "h",
      "laser_goblin1"
    ],
    [
      14,
      17,
      "h",
      "laser_goblin2"
    ],
    [
      11,
      32,
      "h",
      "laser_goblin3"
    ]
  ],
  "switches": [
    {
      "id": "sw1",
      "hero": "spiderman",
      "x": 2,
      "y": 8,
      "side": "left",
      "color": "#ef4444",
      "targets": [
        "gate_goblin_2",
        "laser_goblin1"
      ],
      "msg": "Spider-Man overloaded Goblin Shield Beta for Ghost Spider!"
    },
    {
      "id": "sw2",
      "hero": "gwen",
      "x": 20,
      "y": 8,
      "side": "right",
      "color": "#06b6d4",
      "targets": [
        "gate_goblin_1",
        "gate_miles_gate",
        "laser_goblin2"
      ],
      "msg": "Ghost Spider unlocked Goblin Shield Alpha & Arena Gate!"
    },
    {
      "id": "sw3",
      "hero": "miles",
      "x": 11,
      "y": 23,
      "side": "right",
      "color": "#eab308",
      "targets": [
        "gate_access_left",
        "gate_access_right"
      ],
      "msg": "Miles Morales discharged Venom Shock! Pylon Gates Unlocked!"
    },
    {
      "id": "sw4",
      "hero": "spiderman",
      "x": 2,
      "y": 38,
      "side": "left",
      "color": "#ef4444",
      "targets": [
        "gate_core_pylon_a"
      ],
      "msg": "Spider-Man disabled Left Core Pylon!"
    },
    {
      "id": "sw5",
      "hero": "gwen",
      "x": 20,
      "y": 38,
      "side": "right",
      "color": "#06b6d4",
      "targets": [
        "gate_core_pylon_b"
      ],
      "msg": "Ghost Spider disabled Right Core Pylon!"
    },
    {
      "id": "sw6",
      "hero": "miles",
      "x": 11,
      "y": 41,
      "side": "right",
      "color": "#10b981",
      "targets": [
        "gate_goblin_core",
        "gate_core_pylon_a",
        "gate_core_pylon_b",
        "laser_goblin3"
      ],
      "msg": "Miles Morales detonated Goblin Core Vault! Breach the Exit!"
    }
  ],
  "gates": [
    {
      "id": "gate_goblin_1",
      "blocks": [
        [
          1,
          15
        ],
        [
          2,
          15
        ]
      ],
      "open": false,
      "label": "PUMPKIN SHIELD ALPHA"
    },
    {
      "id": "gate_goblin_2",
      "blocks": [
        [
          19,
          15
        ],
        [
          20,
          15
        ]
      ],
      "open": false,
      "label": "PUMPKIN SHIELD BETA"
    },
    {
      "id": "gate_miles_gate",
      "blocks": [
        [
          10,
          12
        ],
        [
          11,
          12
        ]
      ],
      "open": false,
      "label": "GOBLIN ARENA GATE"
    },
    {
      "id": "gate_access_left",
      "blocks": [
        [
          6,
          43
        ],
        [
          6,
          44
        ]
      ],
      "open": false,
      "label": "LEFT PYLON GATE"
    },
    {
      "id": "gate_access_right",
      "blocks": [
        [
          15,
          43
        ],
        [
          15,
          44
        ]
      ],
      "open": false,
      "label": "RIGHT PYLON GATE"
    },
    {
      "id": "gate_goblin_core",
      "blocks": [
        [
          10,
          48
        ],
        [
          11,
          48
        ]
      ],
      "open": false,
      "label": "GOBLIN CORE VAULT"
    }
  ],
  "bubbles": [
    [
      5,
      23
    ],
    [
      17,
      23
    ]
  ],
  "shields": [
    [
      11,
      17
    ],
    [
      11,
      44
    ]
  ],
  "enemies": [
    {
      "id": "goblin",
      "x": 11,
      "y": 17,
      "speed": 2.2,
      "sprite": "goblin"
    }
  ],
  "cast": {
    "friends": [
      "spiderman",
      "gwen",
      "miles"
    ],
    "enemies": [
      "goblin"
    ]
  }
});
