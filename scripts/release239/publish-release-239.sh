#!/usr/bin/env bash
set -euo pipefail

package_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
target_root="${1:-${TMPDIR:-/tmp}/OmSaravanaBhava-release239-$$}"
remote_url="${2:-https://github.com/ssakthivel02/OmSaravanaBhava.git}"
branch="${3:-main}"
expected="530ad97c68b6e7b8cbe997f2b6bbaf440ec5d527"
title="Release 239: atomically reconcile repository state and establish verifiable publishing"

if [[ -e "$target_root" ]] && [[ -n "$(find "$target_root" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
  printf 'Target directory is not empty: %s\n' "$target_root" >&2
  exit 1
fi
mkdir -p "$target_root"

git clone --branch "$branch" --single-branch "$remote_url" "$target_root"
cd "$target_root"

[[ "$(git rev-parse HEAD)" == "$expected" ]] || {
  printf 'Expected HEAD %s but found %s\n' "$expected" "$(git rev-parse HEAD)" >&2
  exit 1
}

export PYTHONDONTWRITEBYTECODE=1
python -B "$package_root/scripts/release239/prepare-checkout.py" \
  --package-root "$package_root" \
  --repository-root "$target_root"
python -B scripts/release239/verify-base.py --root .
python -B scripts/release239/verify-staged-change-set.py --root .
python -B scripts/release239/run-release-tests.py --root .
python -B -m tools.repository_hygiene.validate --root .
python -B -m tools.repository_integrity.validate \
  --root . --manifest manifest-release-239.json
python -B tools/release_validate.py \
  --root . --manifest manifest-release-239.json --package-mode

git diff --cached --name-status
git commit -m "$title"

python -B tools/release_validate.py \
  --root . \
  --manifest manifest-release-239.json \
  --repository-mode \
  --strict-commit-subject
python -B -m tools.atomic_publisher.validate \
  --root . --mode final

if [[ "${NO_PUSH:-0}" != "1" ]]; then
  git push origin "HEAD:$branch"
fi

git log -1 --oneline
printf 'Clone retained at: %s\n' "$target_root"
