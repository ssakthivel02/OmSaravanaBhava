#!/usr/bin/env bash
set -euo pipefail
root="${1:-.}"
remote="${2:-origin}"
branch="${3:-main}"
expected="d43c5ffbb240a01ddd444839c10ba61c438c85a1"
title="Release 235: repair repository hygiene and governance baseline"
cd "$root"
[[ "$(git rev-parse HEAD)" == "$expected" ]] || {
  printf 'Expected HEAD %s but found %s\n' "$expected" "$(git rev-parse HEAD)" >&2
  exit 1
}
scripts/repository/remove-tracked-generated-files.sh .
export PYTHONDONTWRITEBYTECODE=1
python -B tools/release_validate.py --root . --manifest manifest-release-235.json --package-mode
git add -A
git commit -m "$title"
python -B tools/release_validate.py --root . --manifest manifest-release-235.json --repository-mode --strict-commit-subject
if [[ "${NO_PUSH:-0}" != "1" ]]; then
  git push "$remote" "HEAD:$branch"
fi
