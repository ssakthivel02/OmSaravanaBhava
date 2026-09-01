#!/usr/bin/env bash
set -euo pipefail
root="${1:-.}"
targets="${2:-policies/repository-cleanup-targets.json}"
mode="${3:-apply}"
cd "$root"
mapfile -t paths < <(python - "$targets" <<'PY'
import json
import sys
from pathlib import Path
payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
for path in payload.get("trackedPathsToRemove", []):
    print(path)
PY
)
for path in "${paths[@]}"; do
  if [[ "$mode" == "dry-run" ]]; then
    printf 'Would remove tracked generated file: %s\n' "$path"
  else
    git rm -f --ignore-unmatch -- "$path"
  fi
done
