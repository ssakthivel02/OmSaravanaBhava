#!/usr/bin/env bash
set -euo pipefail

package_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
repository_root="${1:-.}"
remote="${2:-origin}"
branch="${3:-main}"
expected="d06aa0d99315344ad2c23ee3a1d98fb635f33b16"
title="Release 236: complete tracked-cache cleanup and enforce repository integrity"

repository_root="$(cd "$repository_root" && pwd)"
cd "$repository_root"

actual="$(git rev-parse HEAD)"
[[ "$actual" == "$expected" ]] || {
  printf 'Expected HEAD %s but found %s\n' "$expected" "$actual" >&2
  exit 1
}

export PYTHONDONTWRITEBYTECODE=1
git apply --index --binary "$package_root/RELEASE_236.patch"
git checkout-index -f --   APPLY_RELEASE_236.cmd   scripts/release236/apply-release-236.ps1   scripts/release236/show-changed-files.ps1   scripts/release236/verify-base.ps1

evidence=(
  RELEASE_236.patch
  RELEASE_236_CHANGED_FILES.txt
  RELEASE_236_GITHUB_PORTAL_INSTRUCTIONS.txt
  RELEASE_236_LOCAL_TEST_EVIDENCE.txt
  RELEASE_236_SHA256SUMS.txt
  RELEASE_236_VALIDATION_REPORT.md
)
for relative in "${evidence[@]}"; do
  cp "$package_root/$relative" "$repository_root/$relative"
  git add -- "$relative"
done

python -B -m tools.repository_hygiene.validate --root .
python -B -m tools.repository_integrity.validate --root .
python -B tools/release_validate.py \
  --root . \
  --manifest manifest-release-236.json \
  --package-mode

git diff --cached --name-status
git commit -m "$title"

python -B tools/release_validate.py \
  --root . \
  --manifest manifest-release-236.json \
  --repository-mode \
  --strict-commit-subject

if [[ "${NO_PUSH:-0}" != "1" ]]; then
  git push "$remote" "HEAD:$branch"
fi
