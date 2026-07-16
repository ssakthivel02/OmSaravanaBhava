#!/usr/bin/env bash
set -euo pipefail

package_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
target_root="${1:-${TMPDIR:-/tmp}/OmSaravanaBhava-release237-$$}"
remote_url="${2:-https://github.com/ssakthivel02/OmSaravanaBhava.git}"
branch="${3:-main}"
expected="dfc5ce53229d9af53a99fe9a089d5d29bb3ea9b5"
title="Release 237: migrate effective route consumers and finalise tracked-cache cleanup"

if [[ -e "$target_root" ]] && [[ -n "$(find "$target_root" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
  printf 'Target directory is not empty: %s\n' "$target_root" >&2
  exit 1
fi
mkdir -p "$target_root"

git clone --branch "$branch" --single-branch "$remote_url" "$target_root"
cd "$target_root"

actual="$(git rev-parse HEAD)"
[[ "$actual" == "$expected" ]] || {
  printf 'Expected HEAD %s but found %s\n' "$expected" "$actual" >&2
  exit 1
}

export PYTHONDONTWRITEBYTECODE=1

python -B "$package_root/scripts/release237/prepare-checkout.py" \
  --package-root "$package_root" \
  --repository-root "$target_root"

python -B scripts/release237/verify-base.py --root .
python -B scripts/release237/verify-staged-change-set.py \
  --repository-root .
python -B scripts/release237/verify-no-tracked-cache.py
python -B scripts/release237/run-release-tests.py --root .
python -B -m tools.repository_hygiene.validate --root .
python -B -m tools.repository_integrity.validate \
  --root . \
  --manifest manifest-release-237.json
python -B tools/release_validate.py \
  --root . \
  --manifest manifest-release-237.json \
  --package-mode

git diff --cached --name-status
git commit -m "$title"

python -B tools/release_validate.py \
  --root . \
  --manifest manifest-release-237.json \
  --repository-mode \
  --strict-commit-subject

if [[ "${NO_PUSH:-0}" != "1" ]]; then
  git push origin "HEAD:$branch"
fi

printf 'Release 237 prepared successfully: %s\n' "$(git rev-parse HEAD)"
printf 'Working clone: %s\n' "$target_root"
