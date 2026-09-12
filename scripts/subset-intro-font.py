"""Rebuild the home intro subset after changing home.intro (fonttools + brotli)."""
import json
from pathlib import Path
from fontTools import subset

root = Path(__file__).resolve().parents[1]
text = ''.join(chr(code) for code in range(32, 127))
for locale in ('zh', 'en'):
    messages = json.loads((root / 'messages' / f'{locale}.json').read_text(encoding='utf-8'))
    text += messages['home']['intro']
options = subset.Options()
options.flavor = 'woff2'
font = subset.load_font(str(root / 'src/assets/fonts/chill-round.woff2'), options)
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=text)
subsetter.subset(font)
target = root / 'src/assets/fonts/chill-round-intro.woff2'
subset.save_font(font, str(target), options)
print(f'Intro subset: {target.stat().st_size} bytes')
