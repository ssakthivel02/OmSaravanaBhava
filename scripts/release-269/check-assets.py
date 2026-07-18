#!/usr/bin/env python3
from pathlib import Path
root=Path(__file__).resolve().parents[2]
for p in ['assets/css/release-269.css','assets/js/release-269.mjs']:assert (root/p).exists(),p
print('Asset check passed.')
