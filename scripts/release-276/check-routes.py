#!/usr/bin/env python3
from pathlib import Path
root=Path(__file__).resolve().parents[2]
raise SystemExit(0 if (root/'release-276.html').exists() else 1)
