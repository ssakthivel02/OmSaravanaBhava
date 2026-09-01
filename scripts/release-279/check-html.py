#!/usr/bin/env python3
from pathlib import Path
root=Path(__file__).resolve().parents[2]
t=(root/'release-279.html').read_text(encoding='utf-8')
assert '<title>' in t and '<main' in t and 'viewport' in t
print('HTML check passed.')
