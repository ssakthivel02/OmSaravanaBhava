#!/usr/bin/env bash
set -euo pipefail

root="${1:-.}"
mode="${2:---package-mode}"
manifest="${3:-}"
strict="${4:-}"
cd "$root"
if [[ -z "$manifest" ]]; then
  manifest="$(python -m tools.release_control.discovery --root .)"
fi
args=(
  tools/release_validate.py
  --root .
  --manifest "$manifest"
  "$mode"
)
if [[ "$strict" == "strict" ]]; then
  args+=(--strict-commit-subject)
fi
python "${args[@]}"
