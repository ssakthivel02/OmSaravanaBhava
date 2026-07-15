#!/usr/bin/env bash
set -euo pipefail

root="${1:-.}"
mode="${2:---package-mode}"
cd "$root"
python tools/release_232_validate.py   --root .   --manifest manifest-release-232.json   "$mode"
