"""Manifest change-set validation."""

from __future__ import annotations

from .models import Finding


def expected_changes(manifest: dict) -> dict[str, str]:
    expected: dict[str, str] = {}
    for path in manifest.get("added_files", []):
        expected[str(path)] = "A"
    for path in manifest.get("modified_files", []):
        expected[str(path)] = "M"
    for path in manifest.get("deleted_files", []):
        expected[str(path)] = "D"
    return expected


def validate_manifest_plan(manifest: dict, policy: dict) -> list[Finding]:
    findings: list[Finding] = []
    expected = expected_changes(manifest)
    if manifest.get("release") != 239:
        findings.append(Finding("manifest-release", "Manifest release must be 239."))
    if manifest.get("base_commit") != policy.get("requiredBaseCommit"):
        findings.append(Finding("manifest-base", "Manifest base commit is not the approved Release 238 SHA."))
    if manifest.get("required_commit_title") != policy.get("requiredCommitTitle"):
        findings.append(Finding("manifest-title", "Manifest commit title is not exact."))
    if len(expected) > int(policy.get("hardChangedFileLimit", 500)):
        findings.append(Finding("hard-limit", "Declared changed-file count exceeds the hard limit."))
    if len(manifest.get("deleted_files", [])) != 14:
        findings.append(Finding("deletion-count", "Release 239 must declare exactly fourteen deletions."))
    if len(expected) != (
        len(manifest.get("added_files", [])) +
        len(manifest.get("modified_files", [])) +
        len(manifest.get("deleted_files", []))
    ):
        findings.append(Finding("duplicate-path", "A path appears in more than one manifest change list."))
    return findings
