#!/usr/bin/env bash
set -euo pipefail
expected='Release 232: add deterministic release governance gate'
actual="$(git log -1 --pretty=%s)"
if [[ "$actual" != "$expected" ]]; then
  printf 'Commit subject mismatch. Expected %q; found %q.
' "$expected" "$actual" >&2
  exit 1
fi
printf 'PASS exact commit subject: %s
' "$actual"
