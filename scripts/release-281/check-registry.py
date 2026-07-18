import json
from pathlib import Path
r=Path(__file__).resolve().parents[2];d=json.loads((r/'data/release-281/platform-routes.json').read_text());ids=[x['release'] for x in d['records']];assert len(ids)==len(set(ids)) and '281' in ids
print('Registry valid')