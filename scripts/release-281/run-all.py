import subprocess,sys
from pathlib import Path
h=Path(__file__).resolve().parent
for s in ['check-json.py','check-html.py','check-registry.py','check-aliases.py','check-releases.py']:
 x=subprocess.run([sys.executable,str(h/s)])
 if x.returncode:raise SystemExit(x.returncode)
print('Release 281 checks passed')