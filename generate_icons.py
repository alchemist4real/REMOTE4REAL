"""
Generates monochromatic minimalist white void PWA controller icons.
"""

import os
from PIL import Image, ImageDraw

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "static", "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)

def create_icon(size: int, filename: str):
    img = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Outer black ring
    margin = size // 10
    draw.ellipse([margin, margin, size - margin, size - margin], outline=(0, 0, 0, 255), width=max(2, size // 28))
    
    # Center cross representation
    mid = size // 2
    arm_w = size // 10
    arm_h = size // 4
    draw.rectangle([mid - arm_w // 2, mid - arm_h, mid + arm_w // 2, mid + arm_h], fill=(0, 0, 0, 255))
    draw.rectangle([mid - arm_h, mid - arm_w // 2, mid + arm_h, mid + arm_w // 2], fill=(0, 0, 0, 255))
    
    # Center white dot
    dot_r = size // 16
    draw.ellipse([mid - dot_r, mid - dot_r, mid + dot_r, mid + dot_r], fill=(255, 255, 255, 255))

    out_path = os.path.join(ASSETS_DIR, filename)
    img.save(out_path, "PNG")
    print(f"Generated icon: {out_path}")

create_icon(192, "icon-192.png")
create_icon(512, "icon-512.png")
