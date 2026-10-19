"""Validate decoded launcher artwork and the shared Android/Web icon contract."""
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image, ImageChops
from export import ROOT, images

ANDROID = '{http://schemas.android.com/apk/res/android}'
expected = images()
for size, artwork in expected.items():
    with Image.open(ROOT / f'couple-web/assets/loveroll-icon-{size}.png') as icon:
        assert icon.format == 'PNG' and icon.size == (size, size)
        assert ImageChops.difference(icon.convert('RGB'), artwork).getbbox() is None
with Image.open(ROOT / 'app/src/main/res/drawable-nodpi/loveroll_launcher.webp') as native:
    assert ImageChops.difference(native.convert('RGB'), expected[512]).getbbox() is None, 'Android and Web icons diverged'
with Image.open(ROOT / 'couple-web/assets/loveroll-icon-maskable-512.png') as maskable:
    assert maskable.convert('RGBA').getextrema()[3] == (255, 255)
    assert ImageChops.difference(maskable.convert('RGB'), expected[512]).getbbox() is None
manifest = json.loads((ROOT / 'couple-web/manifest.webmanifest').read_text())
assert manifest['id'] == './' and manifest['start_url'] == './', 'Installed app identity changed'
assert manifest['theme_color'] == manifest['background_color'] == '#10070c'
assert any(icon.get('purpose') == 'maskable' for icon in manifest['icons'])
for version in (26, 33):
    icon = ET.parse(ROOT / f'app/src/main/res/mipmap-anydpi-v{version}/ic_launcher.xml').getroot()
    assert icon.tag == 'adaptive-icon' and icon.find('foreground') is not None and icon.find('background') is not None
    if version == 33:
        assert icon.find('monochrome') is not None
package = ET.parse(ROOT / 'app/src/main/AndroidManifest.xml').getroot()
assert package.find('application').get(ANDROID+'icon') == '@mipmap/ic_launcher'
assert package.find('application').get(ANDROID+'roundIcon') == '@mipmap/ic_launcher'
print('APP_ICONS_OK same decoded artwork, PNG sizes, opaque maskable, stable PWA identity, Android adaptive and themed layers')
