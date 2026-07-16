#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
"$script_dir/check-commit-metadata.sh" "${1:-}" strict
