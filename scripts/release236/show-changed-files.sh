#!/usr/bin/env bash
set -euo pipefail
cd "${1:-.}"
git diff --cached --name-status
git diff --cached --stat
