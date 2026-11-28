#!/usr/bin/env python3
"""Bundles all WAV clips in T_C_Sounds/ into audio/tc-audio-data.js as window.TC_AUDIO_DATA."""
import base64
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOUNDS_DIR = os.path.join(ROOT, "T_C_Sounds")
OUT_FILE = os.path.join(ROOT, "audio", "tc-audio-data.js")


def main():
    data = {}
    for fname in sorted(os.listdir(SOUNDS_DIR)):
        if not fname.lower().endswith(".wav"):
            continue
        stem = os.path.splitext(fname)[0]
        fpath = os.path.join(SOUNDS_DIR, fname)
        with open(fpath, "rb") as f:
            data[stem] = base64.b64encode(f.read()).decode("ascii")

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write("// Auto-generated Tom & Cherry Level 8+ audio clips from T_C_Sounds/\n")
        f.write("window.TC_AUDIO_DATA = " + json.dumps(data, separators=(",", ":")) + ";\n")
    print(f"Wrote {OUT_FILE} ({len(data)} clips, {os.path.getsize(OUT_FILE)} bytes).")


if __name__ == "__main__":
    main()
