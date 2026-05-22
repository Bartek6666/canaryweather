#!/usr/bin/env python3
"""
Generate Google Play Console graphics using existing icon.png:
- Developer icon: 512x512 px
- Header image: 4096x2304 px
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Brand colors (extracted from icon)
GRADIENT_TOP = (17, 102, 204)     # #1166CC - top blue
GRADIENT_BOTTOM = (16, 96, 192)   # #1060C0 - bottom blue

def create_gradient(width, height):
    """Create vertical gradient background matching icon"""
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)

    for y in range(height):
        ratio = y / height
        r = int(GRADIENT_TOP[0] + (GRADIENT_BOTTOM[0] - GRADIENT_TOP[0]) * ratio)
        g = int(GRADIENT_TOP[1] + (GRADIENT_BOTTOM[1] - GRADIENT_TOP[1]) * ratio)
        b = int(GRADIENT_TOP[2] + (GRADIENT_BOTTOM[2] - GRADIENT_TOP[2]) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    return img

def create_developer_icon(icon_path):
    """Create 512x512 developer icon by scaling the app icon"""
    # Open and resize icon to 512x512
    icon = Image.open(icon_path).convert('RGB')
    icon_resized = icon.resize((512, 512), Image.LANCZOS)
    return icon_resized

def create_header_image(icon_path):
    """Create 4096x2304 header image with icon and text"""
    width = 4096
    height = 2304

    # Create gradient background
    img = create_gradient(width, height)

    # Open icon
    icon = Image.open(icon_path).convert('RGBA')

    # Scale icon to fit nicely (about 60% of height)
    icon_size = int(height * 0.65)
    icon_resized = icon.resize((icon_size, icon_size), Image.LANCZOS)

    # Position icon on left side, vertically centered
    icon_x = int(width * 0.08)
    icon_y = (height - icon_size) // 2

    # Paste icon (handle transparency)
    if icon_resized.mode == 'RGBA':
        # Create a background for the icon area
        img.paste(icon_resized, (icon_x, icon_y), icon_resized)
    else:
        img.paste(icon_resized, (icon_x, icon_y))

    # Add text
    draw = ImageDraw.Draw(img)

    try:
        # Try system fonts
        font_size = int(height * 0.11)
        font_small_size = int(height * 0.045)

        # Try different font paths
        font_paths = [
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/SFNSDisplay.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
        ]

        font = None
        for fp in font_paths:
            try:
                font = ImageFont.truetype(fp, font_size)
                font_small = ImageFont.truetype(fp, font_small_size)
                break
            except:
                continue

        if font is None:
            font = ImageFont.load_default()
            font_small = font

    except Exception as e:
        print(f"Font loading error: {e}")
        font = ImageFont.load_default()
        font_small = font

    # Text position - right side of icon
    text_x = icon_x + icon_size + int(width * 0.06)
    text_y = height * 0.38

    # Main title
    draw.text((text_x, text_y), "Canary Weather", fill=(255, 255, 255), font=font)

    # Tagline
    tagline_y = text_y + font_size * 1.3
    draw.text((text_x, tagline_y), "Sun & Weather for the Canary Islands", fill=(220, 220, 220), font=font_small)

    return img

def main():
    script_dir = os.path.dirname(__file__)
    project_dir = os.path.join(script_dir, '..')
    icon_path = os.path.join(project_dir, 'assets', 'icon.png')
    output_dir = os.path.join(project_dir, 'assets', 'store')

    os.makedirs(output_dir, exist_ok=True)

    print("Generating Google Play Console graphics from icon.png...")
    print()

    # Developer icon
    print("1. Creating developer icon (512x512)...")
    icon = create_developer_icon(icon_path)
    icon_path_out = os.path.join(output_dir, 'developer-icon-512.png')
    icon.save(icon_path_out, 'PNG', optimize=True)
    print(f"   Saved: {icon_path_out}")

    # Header image
    print("2. Creating header image (4096x2304)...")
    header = create_header_image(icon_path)
    header_path = os.path.join(output_dir, 'header-4096x2304.png')
    header.save(header_path, 'PNG', optimize=True)
    print(f"   Saved: {header_path}")

    print()
    print("Done! Files saved to assets/store/")

if __name__ == '__main__':
    main()
