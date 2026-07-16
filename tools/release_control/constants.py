"""Release-governance constants."""

from __future__ import annotations

DEFAULT_CONFIG = ".release-governance.json"
DEFAULT_MANIFEST_PATTERN = "manifest-release-{release}.json"
SHA1_PATTERN = r"^[0-9a-f]{40}$"
SHA256_PATTERN = r"^[0-9a-f]{64}$"
PASS = "PASS"
WARN = "WARN"
FAIL = "FAIL"
SKIPPED = "SKIPPED"
INCONCLUSIVE = "INCONCLUSIVE"
NOT_RUN = "NOT_RUN"

RELEASE_EVIDENCE_SUFFIXES = (
    "_CHANGED_FILES.txt",
    "_GITHUB_PORTAL_INSTRUCTIONS.txt",
    "_LOCAL_TEST_EVIDENCE.txt",
    "_VALIDATION_REPORT.md",
    "_SHA256SUMS.txt",
    ".patch",
)
