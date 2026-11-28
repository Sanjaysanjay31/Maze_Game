import os
import base64
import io
from PIL import Image

IMAGES_DIR = "C:/Skills/Youtube/MAZE_GAME/spider-maze/images"
ASSETS_JS = "C:/Skills/Youtube/MAZE_GAME/spider-maze/assets.js"

MAP = {
    "spiderman": "Spider_man_card_4k.png",
    "gwen": "Ghost_Spider_card_4k.png",
    "ghost_spider": "Ghost_Spider_card_4k.png",
    "miles": "Miles_Spider_card_4k.png",
    "goblin": "Green_Goblin_card_4k.png"
}

print("Building 4K character assets for assets.js...")
js_entries = []

for key, filename in MAP.items():
    p = os.path.join(IMAGES_DIR, filename)
    if not os.path.exists(p):
        print(f"Error: {p} does not exist!")
        continue

    img = Image.open(p)
    w, h = img.size
    print(f"Encoding {key} from {filename} ({w}x{h})...")

    # Encode as ultra-crisp 4K WebP Data URL for instant origin-clean canvas rendering
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=92)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    data_url = f"data:image/webp;base64,{b64}"
    js_entries.append(f'  "{key}": "{data_url}"')
    print(f"  -> Encoded size: {len(data_url)/1024:.1f} KB")

content = "// 4K Ultra-Clarity Character Textures (Origin-Clean Data URLs)\nwindow.ASSETS = {\n" + ",\n".join(js_entries) + "\n};\n"

with open(ASSETS_JS, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nSuccessfully wrote 4K assets to {ASSETS_JS} ({os.path.getsize(ASSETS_JS)/(1024*1024):.2f} MB)!")
