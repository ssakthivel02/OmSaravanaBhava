#!/usr/bin/env bash
set -euo pipefail

manifest="${1:-}"
if [[ -z "$manifest" ]]; then
  manifest="$(python -m tools.release_control.discovery --root .)"
fi
mode="${2:-browser-compatible}"
expected="$(python - "$manifest" <<'PY'
import json
import sys
from pathlib import Path
print(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))["required_commit_title"])
PY
)"
subject="$(git log -1 --pretty=%s)"
body_first="$(git log -1 --pretty=%b | awk 'NF {gsub(/^[[:space:]]+|[[:space:]]+$/, ""); print; exit}')"

if [[ "$subject" == "$expected" ]]; then
  printf 'PASS exact commit subject: %s\n' "$subject"
  exit 0
fi

if [[ "$mode" != "strict" && "$subject" == "Add files via upload" && "$body_first" == "$expected" ]]; then
  printf 'WARN browser fallback accepted: subject=%q body-first-line=%q\n' "$subject" "$body_first" >&2
  exit 0
fi

printf 'FAIL commit metadata mismatch. expected=%q subject=%q body-first-line=%q\n' "$expected" "$subject" "$body_first" >&2
exit 1
