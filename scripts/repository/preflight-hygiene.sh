#!/usr/bin/env bash
set -euo pipefail
root="${1:-.}"
cd "$root"
export PYTHONDONTWRITEBYTECODE=1
python -B -m tools.repository_hygiene.validate --root .
