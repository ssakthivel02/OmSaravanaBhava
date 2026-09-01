#!/usr/bin/env python3
"""Run the existing Phase D-E recovery audit with strict legacy compatibility.

The original audit contains one legacy JSON-style boolean token (`false`) in a Python
mapping. Python accepts that token during compilation as a name, but raises NameError
when the summary is created. This runner supplies only the missing boolean bindings and
executes the original non-destructive audit unchanged.
"""

from __future__ import annotations

from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "tools/phase-c-h/build_route_recovery.py"

if not TARGET.is_file():
    raise SystemExit(f"Phase D-E audit script not found: {TARGET}")

runpy.run_path(
    str(TARGET),
    init_globals={"false": False, "true": True, "null": None},
    run_name="__main__",
)
