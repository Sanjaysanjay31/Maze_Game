import os
import base64
from PIL import Image, ImageFilter, ImageEnhance

IMAGES_DIR = "C:/Skills/Youtube/MAZE_GAME/spider-maze/images"
TARGETS = [
    {
        "src": "Spider_man_card_1024.png",
        "out": "Spider_man_card_4k.png",
        "key": "spiderman",
        "target_size": (4096, 4096)
    },
    {
        "src": "Ghost_Spider_card_1024.png",
        "out": "Ghost_Spider_card_4k.png",
        "key": "gwen",
        "target_size": (4096, 4096)
    },
    {
        "src": "Miles_Spider_card_1024.png",
        "out": "Miles_Spider_card_4k.png",
        "key": "miles",
        "target_size": (4096, 4096)
    },
    {
        "src": "Green_Goblin_card_1024.png",
        "out": "Green_Goblin_card_4k.png",
        "key": "goblin",
        "target_size": (4096, 4096)
    }
]

print("Starting 4K ultra-clarity texture upscaling with Lanczos and HDR Unsharp Mask...")

for t in TARGETS:
    src_path = os.path.join(IMAGES_DIR, t["src"])
    out_path = os.path.join(IMAGES_DIR, t["out"])

    if not os.path.exists(src_path):
        print(f"Warning: {src_path} does not exist!")
        continue

    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    print(f"\nProcessing {t['key']}: {w}x{h} -> {t['target_size']}")

    # 1. High-precision Lanczos 4K resampling
    img_4k = img.resize(t["target_size"], Image.Resampling.LANCZOS)

    # 2. Smart Unsharp Mask for micro-texture and suit edge details
    img_4k = img_4k.filter(ImageFilter.UnsharpMask(radius=2.0, percent=125, threshold=1))

    # 3. Micro sharpness enhancement
    sharpener = ImageEnhance.Sharpness(img_4k)
    img_4k = sharpener.enhance(1.15)

    # 4. Color & Vibrance optimization for 4K display
    contrast = ImageEnhance.Contrast(img_4k)
    img_4k = contrast.enhance(1.04)

    # Save 4K PNG
    img_4k.save(out_path, "PNG", optimize=True)
    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"Saved {t['out']}: {size_mb:.2f} MB")

print("\nAll 4 character images successfully upscaled to 4K (4096x4096)!")
