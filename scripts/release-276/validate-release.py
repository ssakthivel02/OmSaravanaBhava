#!/usr/bin/env python3
import json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
data=json.loads((root/'data/release-276/index.json').read_text(encoding='utf-8'))
errors=[]
if data.get('release')!=276:errors.append('release mismatch')
if len(data.get('records',[]))!=12:errors.append('record count mismatch')
for r in data.get('records',[]):
    for key in ['id','title','title_ta','summary','category','status','version']:
        if not r.get(key):errors.append(f"{r.get('id')} missing {key}")
if errors:print('\n'.join(errors));sys.exit(1)
print('Release 276 validation passed.')
