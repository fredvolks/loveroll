"""Encode launcher sizes from the single approved LoveRoll artwork. No retouching."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).with_name('source.webp')

def images():
    with Image.open(SOURCE) as source:
        return {size: source.convert('RGB').resize((size, size), Image.Resampling.LANCZOS)
                for size in (48, 180, 192, 512)}

def export():
    for size, image in images().items():
        image.save(ROOT / f'couple-web/assets/loveroll-icon-{size}.png', optimize=True)
        if size == 512:
            image.save(ROOT / 'couple-web/assets/loveroll-icon-maskable-512.png', optimize=True)
            image.save(ROOT / 'app/src/main/res/drawable-nodpi/loveroll_launcher.webp', lossless=True, method=6)

if __name__ == '__main__':
    export()
