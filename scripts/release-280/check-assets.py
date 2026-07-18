#!/usr/bin/env python3
from pathlib import Path
root=Path(__file__).resolve().parents[2]
for p in ['assets/css/release-280.css','assets/js/release-280.mjs']:assert (root/p).exists(),p
print('Asset check passed.')
