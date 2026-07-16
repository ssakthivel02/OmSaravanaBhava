#!/usr/bin/env bash
set -euo pipefail

root="${1:-.}"
manifest="${2:-}"
remote="${3:-origin}"
branch="${4:-main}"
no_push="${NO_PUSH:-0}"
cd "$root"
if [[ -z "$manifest" ]]; then
  manifest="$(python -m tools.release_control.discovery --root .)"
fi

readarray -t metadata < <(python - "$manifest" <<'PY'
import json
import sys
from pathlib import Path
payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
print(payload["base_commit"])
print(payload["required_commit_title"])
for key in ("added_files", "modified_files", "deleted_files"):
    for path in payload.get(key, []):
        print(path)
PY
)
base="${metadata[0]}"
title="${metadata[1]}"
declared=("${metadata[@]:2}")
head="$(git rev-parse HEAD)"
[[ "$head" == "$base" ]] || {
  printf 'Base mismatch. expected=%s current=%s\n' "$base" "$head" >&2
  exit 1
}

mapfile -t actual < <(git status --porcelain=v1 | sed -E 's/^...//' | sed -E 's/^.* -> //; s/^"|"$//g')
for path in "${actual[@]}"; do
  found=0
  for expected in "${declared[@]}"; do
    [[ "$path" == "$expected" ]] && found=1 && break
  done
  [[ $found -eq 1 ]] || {
    printf 'Unexpected changed path: %s\n' "$path" >&2
    exit 1
  }
done

python tools/release_validate.py --root . --manifest "$manifest" --package-mode
git add -- "${declared[@]}"
git commit -m "$title"
scripts/release/check-commit-metadata.sh "$manifest" strict
if [[ "$no_push" != "1" ]]; then
  git push "$remote" "HEAD:$branch"
fi
printf 'Release commit created with exact subject: %s\n' "$title"
