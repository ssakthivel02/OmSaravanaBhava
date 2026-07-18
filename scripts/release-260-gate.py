#!/usr/bin/env python3
import json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
matrix=json.loads((root/'config/release-260-route-matrix.json').read_text())
errors=[]
for item in matrix['routes']:
    path=item['path'].split('?',1)[0].lstrip('/')
    if not (root/path).exists():errors.append(f"Missing {item['path']}")
for required in matrix['required_directories']:
    if not (root/required).exists():errors.append(f"Missing directory {required}")
if errors:print('\n'.join(errors));sys.exit(1)
print(f"Release 260 gate passed: {len(matrix['routes'])} routes.")
