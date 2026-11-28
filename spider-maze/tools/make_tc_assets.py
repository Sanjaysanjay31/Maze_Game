import base64
import io
import json
import os
from PIL import Image

ROOT = r"C:\Skills\Youtube\MAZE_GAME\spider-maze"
IMG_DIR = os.path.join(ROOT, "T_C_Images")
OUT_FILE = os.path.join(ROOT, "tc_assets.js")

TARGET_SIZE = 1024
WEBP_QUALITY = 92

FILES = {
    "tom_happy": os.path.join("Tom_4k", "tom_happy.png"),
    "tom_laugh": os.path.join("Tom_4k", "tom_laugh.png"),
    "tom_wink": os.path.join("Tom_4k", "tom_wink.png"),
    "tom_smug": os.path.join("Tom_4k", "tom_smug.png"),
    "tom_angry": os.path.join("Tom_4k", "tom_angry.png"),
    "tom_scared": os.path.join("Tom_4k", "tom_scared.png"),
    "tom_dizzy": os.path.join("Tom_4k", "tom_dizzy.png"),
    "tom_sad_cry": os.path.join("Tom_4k", "tom_sad_cry.png"),
    "cherry_happy": os.path.join("jerry_4k", "cherry_happy.png"),
    "cherry_joy": os.path.join("jerry_4k", "cherry_joy.png"),
    "cherry_laugh": os.path.join("jerry_4k", "cherry_laugh.png"),
    "cherry_wink": os.path.join("jerry_4k", "cherry_wink.png"),
    "cherry_curious": os.path.join("jerry_4k", "cherry_curious.png"),
    "cherry_scared": os.path.join("jerry_4k", "cherry_scared.png"),
    "cherry_sad": os.path.join("jerry_4k", "cherry_sad.png"),
    "bulldog_happy": os.path.join("bulldog_4k", "bulldog_happy.png"),
    "bulldog_laugh": os.path.join("bulldog_4k", "bulldog_laugh.png"),
    "bulldog_angry": os.path.join("bulldog_4k", "bulldog_angry.png"),
    "bulldog_skeptical": os.path.join("bulldog_4k", "bulldog_skeptical.png"),
    "bulldog_sad": os.path.join("bulldog_4k", "bulldog_sad.png"),
    "bulldog_crying": os.path.join("bulldog_4k", "bulldog_crying.png"),
    "bulldog_sleepy": os.path.join("bulldog_4k", "bulldog_sleepy_.png"),
    "buffalo_normal_scared": os.path.join("buffalo_crop_4k", "buffalo_normal_scared.png"),
    "buffalo_angry": os.path.join("buffalo_crop_4k", "buffalo_angry.png"),
    "buffalo_sad_cry": os.path.join("buffalo_crop_4k", "buffalo_sad_cry.png"),
    "blackfox_normal_scared": os.path.join("blackfox_4k", "blackfox_normal_scared.png"),
    "blackfox_angry": os.path.join("blackfox_4k", "blackfox_Angry_4k.png"),
    "blackfox_sad_cry": os.path.join("blackfox_4k", "blackfox_sad_cry.png"),
    "redfox_normal_scared": os.path.join("redfox_4k", "redfox_normal_scared.png"),
    "redfox_angry": os.path.join("redfox_4k", "redfox_angry.png"),
}


PROPS_DIR = os.path.join(ROOT, "T_C_Props")
PROP_FILES = {
    "switch_green": "switch_green.png",
    "switch_red": "switch_red.png",
    "shield_cap": "shield_cap.png",
    "bomb_evil": "bomb_evil.png",
}


def encode_square_webp(path: str) -> str:
    with Image.open(path) as im:
        im = im.convert("RGB")
        w, h = im.size
        if w != h:
            side = max(w, h)
            canvas = Image.new("RGB", (side, side), (0, 0, 0))
            canvas.paste(im, ((side - w) // 2, (side - h) // 2))
            im = canvas
        im = im.resize((TARGET_SIZE, TARGET_SIZE), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format="WEBP", quality=WEBP_QUALITY, method=6)
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        return f"data:image/webp;base64,{b64}"


def encode_rgba_webp(path: str) -> str:
    with Image.open(path) as im:
        im = im.convert("RGBA")
        buf = io.BytesIO()
        im.save(buf, format="WEBP", lossless=True)
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        return f"data:image/webp;base64,{b64}"


def main():
    assets = {}
    for key, rel in FILES.items():
        full_path = os.path.join(IMG_DIR, rel)
        if not os.path.exists(full_path):
            raise FileNotFoundError(full_path)
        assets[key] = encode_square_webp(full_path)
        print(f"Encoded {key}: {len(assets[key])} chars")

    for key, fn in PROP_FILES.items():
        full_path = os.path.join(PROPS_DIR, fn)
        if not os.path.exists(full_path):
            raise FileNotFoundError(full_path)
        assets[key] = encode_rgba_webp(full_path)
        print(f"Encoded prop {key}: {len(assets[key])} chars")

    js = (
        "// Tom & Cherry Ultra-Clarity Character & Emotion Textures (Origin-Clean Data URLs)\n"
        "window.ASSETS = "
        + json.dumps(assets)
        + ";\n"
        + "window.ASSETS.tom = window.ASSETS.tom_happy;\n"
        + "window.ASSETS.cherry = window.ASSETS.cherry_happy;\n"
        + "window.ASSETS.bulldog = window.ASSETS.bulldog_happy;\n"
        + "window.ASSETS.buffalo = window.ASSETS.buffalo_normal_scared;\n"
        + "window.ASSETS.blackfox = window.ASSETS.blackfox_normal_scared;\n"
        + "window.ASSETS.redfox = window.ASSETS.redfox_normal_scared;\n"
    )
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"Wrote {OUT_FILE} ({os.path.getsize(OUT_FILE) / (1024*1024):.2f} MB)")


if __name__ == "__main__":
    main()
