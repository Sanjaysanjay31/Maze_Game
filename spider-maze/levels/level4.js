(window.LEVELS = window.LEVELS || []).push({
  "name": "Level 4: Spider-Verse Trio",
  "num": 4,
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
    "1000001001001001000001",
    "1000001001001001000001",
    "1111001111001111001111",
    "1001001000001001001001",
    "1001001000001001001001",
    "1111001001111111001111",
    "1000001000000001000001",
    "1000001000000001000001",
    "1001111111111001111001",
    "1001001001000001001001",
    "1001001001000001001001",
    "1001111111001111111001",
    "1000001001001001000001",
    "1000001001001001000001",
    "1111001111001111001111",
    "1001001001000001001001",
    "1001001001000001001001",
    "1111001111111001001111",
    "1000001001001001000001",
    "1000001001001001000001",
    "1001111111111001111001",
    "1001001000000001001001",
    "1001001000000001001001",
    "1001111001111111111001",
    "1000001001001001000001",
    "1000001001001001000001",
    "1111001001111111001111",
    "1001001000001001001001",
    "1001001000001001001001",
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
      11,
      20
    ],
    [
      11,
      35
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
      29
    ]
  ],
  "saws": [
    [
      2,
      14,
      5,
      14
    ],
    [
      17,
      14,
      20,
      14
    ],
    [
      8,
      20,
      14,
      20
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
      26,
      1,
      0,
      1200
    ],
    [
      20,
      26,
      -1,
      0,
      1200
    ],
    [
      11,
      38,
      0,
      1,
      1400
    ]
  ],
  "lasers": [
    [
      8,
      20,
      "h",
      "laser_miles1"
    ],
    [
      14,
      20,
      "h",
      "laser_miles2"
    ],
    [
      11,
      32,
      "h",
      "laser_miles3"
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
        "gate_miles_red"
      ],
      "msg": "Spider-Man disabled Red Lockdown for Miles!"
    },
    {
      "id": "sw2",
      "hero": "gwen",
      "x": 20,
      "y": 8,
      "side": "right",
      "color": "#06b6d4",
      "targets": [
        "gate_miles_cyan"
      ],
      "msg": "Ghost Spider disabled Cyan Lockdown for Miles!"
    },
    {
      "id": "sw3",
      "hero": "miles",
      "x": 11,
      "y": 23,
      "side": "right",
      "color": "#eab308",
      "targets": [
        "gate_spidey_venom",
        "gate_gwen_venom",
        "laser_miles1",
        "laser_miles2"
      ],
      "msg": "Miles Morales triggered Venom Surge! Lateral Gates Unlocked!"
    },
    {
      "id": "sw4",
      "hero": "spiderman",
      "x": 2,
      "y": 38,
      "side": "left",
      "color": "#ef4444",
      "targets": [
        "gate_trio_left"
      ],
      "msg": "Spider-Man breached Left Trio Access!"
    },
    {
      "id": "sw5",
      "hero": "gwen",
      "x": 20,
      "y": 38,
      "side": "right",
      "color": "#06b6d4",
      "targets": [
        "gate_trio_right"
      ],
      "msg": "Ghost Spider breached Right Trio Access!"
    },
    {
      "id": "sw6",
      "hero": "miles",
      "x": 11,
      "y": 41,
      "side": "right",
      "color": "#10b981",
      "targets": [
        "gate_trio_vault",
        "laser_miles3"
      ],
      "msg": "Miles Morales bypassed the Master Trio Vault Door! Everyone to Exit!"
    }
  ],
  "gates": [
    {
      "id": "gate_miles_red",
      "blocks": [
        [
          10,
          9
        ],
        [
          11,
          9
        ]
      ],
      "open": false,
      "label": "RED LOCK"
    },
    {
      "id": "gate_miles_cyan",
      "blocks": [
        [
          10,
          15
        ],
        [
          11,
          15
        ]
      ],
      "open": false,
      "label": "CYAN LOCK"
    },
    {
      "id": "gate_spidey_venom",
      "blocks": [
        [
          1,
          21
        ],
        [
          2,
          21
        ]
      ],
      "open": false,
      "label": "SPIDEY VENOM GATE"
    },
    {
      "id": "gate_gwen_venom",
      "blocks": [
        [
          19,
          21
        ],
        [
          20,
          21
        ]
      ],
      "open": false,
      "label": "GWEN VENOM GATE"
    },
    {
      "id": "gate_trio_left",
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
      "label": "LEFT TRIO GATE"
    },
    {
      "id": "gate_trio_right",
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
      "label": "RIGHT TRIO GATE"
    },
    {
      "id": "gate_trio_vault",
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
      "label": "MASTER TRIO VAULT"
    }
  ],
  "bubbles": [
    [
      5,
      26
    ],
    [
      17,
      26
    ]
  ],
  "shields": [
    [
      2,
      17
    ],
    [
      20,
      17
    ]
  ],
  "enemies": [],
  "cast": {
    "friends": [
      "spiderman",
      "gwen",
      "miles"
    ],
    "enemies": []
  }
});
