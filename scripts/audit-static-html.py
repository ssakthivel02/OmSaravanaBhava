#!/usr/bin/env python3
from pathlib import Path
import re,sys
root=Path(__file__).resolve().parents[1];errors=[]
for p in root.glob('*.html'):
    text=p.read_text(encoding='utf-8',errors='ignore')
    if '<html' not in text or '<title>' not in text:errors.append(f'{p.name}: missing html/title')
    for tag in re.findall(r'<img\b[^>]*>',text,re.I):
        if 'alt=' not in tag:errors.append(f'{p.name}: image missing alt')
if errors:print('\n'.join(errors));sys.exit(1)
print('Static HTML audit passed.')
