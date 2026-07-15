#!/usr/bin/env bash
set -euo pipefail
ledger="${1:-RELEASE_232_SHA256SUMS.txt}"
sha256sum --check "$ledger"
