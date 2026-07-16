"""Deletion-plan validation."""

from __future__ import annotations

from .models import Finding


def validate_plan(plan: dict) -> list[Finding]:
    findings: list[Finding] = []
    paths = plan.get("paths")
    if plan.get("release") != 238:
        findings.append(Finding("plan-release", "Deletion plan release must be 238."))
    if not isinstance(paths, list):
        return findings + [Finding("plan-paths", "Deletion plan paths must be an array.")]
    values = [str(path) for path in paths]
    if len(values) != 14:
        findings.append(Finding("plan-count", "Deletion plan must contain exactly 14 paths."))
    if len(set(values)) != len(values):
        findings.append(Finding("plan-duplicates", "Deletion plan paths must be unique."))
    if int(plan.get("expectedCount", -1)) != len(values):
        findings.append(Finding("plan-expected-count", "expectedCount does not match path count."))
    cache_count = sum(
        1 for path in values
        if "__pycache__" in path or path.endswith((".pyc", ".pyo"))
    )
    if cache_count != 13:
        findings.append(Finding("plan-cache-count", "Deletion plan must include thirteen Python cache files."))
    if "assets/js/site-directory.js" not in values:
        findings.append(Finding("plan-legacy-consumer", "Legacy Site Directory script is missing from deletion plan."))
    return findings
