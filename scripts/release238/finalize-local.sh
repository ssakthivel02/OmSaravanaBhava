#!/usr/bin/env bash
set -euo pipefail

root="${1:-.}"
cd "$root"
export PYTHONDONTWRITEBYTECODE=1

python -B scripts/release238/verify-bootstrap.py --root .
bootstrap="$(git rev-parse HEAD)"
python -B scripts/release238/finalize-release-238.py \
  --root . --bootstrap-sha "$bootstrap"
python -B scripts/release238/verify-final-state.py --root .
python -B scripts/release238/run-release-238-tests.py --root .
python -B -m tools.repository_hygiene.validate --root .
python -B -m tools.repository_integrity.validate \
  --root . --manifest manifest-release-238.json
python -B scripts/release238/finalize-release-238.py --root . --mark-pass

git commit -m "Release 238: reconcile repository state and enforce deployment conformance"
python -B tools/release_validate.py \
  --root . \
  --manifest manifest-release-238.json \
  --repository-mode \
  --strict-commit-subject

if [[ "${NO_PUSH:-0}" != "1" ]]; then
  git push origin HEAD:main
fi
