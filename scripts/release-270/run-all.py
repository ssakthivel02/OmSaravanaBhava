#!/usr/bin/env python3
import subprocess,sys
from pathlib import Path
here=Path(__file__).resolve().parent
for s in ['check-json.py','check-html.py','check-assets.py','check-routes.py','check-duplicates.py','validate-release.py']:
    r=subprocess.run([sys.executable,str(here/s)])
    if r.returncode:raise SystemExit(r.returncode)
print('All checks passed.')
