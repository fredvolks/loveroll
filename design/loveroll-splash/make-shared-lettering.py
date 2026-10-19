"""Build the exact outlined lettering shared by the Web and native loading view.

The generated SVG files contain one path and no font dependency. Run with
fonttools and the URW Base35 Nimbus fonts installed. Artwork stays separate.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parents[2]
FONTS = Path('/usr/share/fonts/opentype/urw-base35')


def lettering(name, font_name, text, width, height, color, ink_width=None):
    font = TTFont(FONTS / font_name)
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    bounds = BoundsPen(glyphs)
    positions = []
    advance = 0
    for char in text:
        glyph = glyphs[cmap[ord(char)]]
        glyph.draw(TransformPen(bounds, (1, 0, 0, 1, advance, 0)))
        positions.append((glyph, advance))
        advance += glyph.width
    left, bottom, right, top = bounds.bounds
    scale = ink_width / (right - left) if ink_width else 1
    x = width / 2 - (left + right) * scale / 2
    y = height / 2 + (bottom + top) * scale / 2
    path = SVGPathPen(glyphs, ntos=lambda value: format(value, '.3f').rstrip('0').rstrip('.'))
    for glyph, advance in positions:
        glyph.draw(TransformPen(path, (scale, 0, 0, -scale, x + advance * scale, y)))
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + str(width) + ' ' + str(height) + '">'
           '<path fill="' + color + '" d="' + path.getCommands() + '"/></svg>\n')
    for directory in (ROOT / 'couple-web/assets', ROOT / 'app/src/main/assets'):
        (directory / name).write_text(svg)
    print(name, len(svg.encode()), 'bytes')


lettering('loveroll-wordmark-v127.svg', 'NimbusRoman-Italic.otf', 'LoveRoll',
          4200, 1150, '#f5dcd8', ink_width=4100)
lettering('loveroll-loading-caption-v127.svg', 'NimbusSans-Regular.otf',
          'Chargement de votre espace…', 14000, 1500, '#ccb3bf')
