"""Read-only check of the exact public image declared to Messenger, not a legacy file.
Run after deployment or from the live-check workflow; no invitation/account needed.
"""
from html.parser import HTMLParser
from io import BytesIO
import json
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from PIL import Image

BASE = 'https://fredvolks.github.io/mon-wallet-android/'
AGENT = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'

def fetch(url):
    with urlopen(Request(url, headers={'User-Agent': AGENT, 'Cache-Control': 'no-cache'}), timeout=25) as response:
        assert response.status == 200, (url, response.status)
        return response.read(), response.headers.get_content_type()

class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.values = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta' and attrs.get('property', '').startswith('og:'):
            key = attrs['property']
            assert key not in self.values, 'Ambiguous duplicate metadata: ' + key
            self.values[key] = attrs.get('content', '')

html, content_type = fetch(BASE + 'index.html')
assert content_type == 'text/html', content_type
parser = Metadata()
parser.feed(html.decode('utf8'))
meta = parser.values
url = meta['og:image']
assert url.startswith(BASE + 'assets/') and urlsplit(url).scheme == 'https', url
assert meta['og:image:secure_url'] == url, 'Secure image must match the primary image'
image_bytes, content_type = fetch(url)
assert content_type == meta['og:image:type'], (content_type, meta['og:image:type'])
assert 30000 < len(image_bytes) < 8 * 1024 * 1024, len(image_bytes)
with Image.open(BytesIO(image_bytes)) as image:
    assert image.format in ('JPEG', 'PNG'), image.format
    assert Image.MIME[image.format] == content_type, (image.format, content_type)
    size = image.size
    assert size == (int(meta['og:image:width']), int(meta['og:image:height'])) == (1200, 630), size
    image.verify()
version, _ = fetch(BASE + 'web-version.json')
print(json.dumps({'build': json.loads(version)['build'], 'image': url,
                  'type': content_type, 'bytes': len(image_bytes), 'size': size,
                  'status': 'valid', 'agent': 'facebookexternalhit'}))
