#!/usr/bin/env bash
set -euo pipefail
cd "${1:-.}"
expected="d06aa0d99315344ad2c23ee3a1d98fb635f33b16"
actual="$(git rev-parse HEAD)"
[[ "$actual" == "$expected" ]] || {
  printf 'Expected %s but found %s\n' "$expected" "$actual" >&2
  exit 1
}
printf 'Base commit verified: %s\n' "$actual"
