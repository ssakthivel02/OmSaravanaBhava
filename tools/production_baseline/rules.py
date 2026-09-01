
from __future__ import annotations
import fnmatch
from pathlib import Path
from .models import Finding

def expected_changes(manifest: dict) -> dict[str, str]:
    result: dict[str, str] = {}
    for path in manifest.get("added_files", []): result[str(path)] = "A"
    for path in manifest.get("modified_files", []): result[str(path)] = "M"
    for path in manifest.get("deleted_files", []): result[str(path)] = "D"
    return result

def static_findings(root: Path, policy: dict, contract: dict, manifest: dict, tracked: set[str] | None) -> list[Finding]:
    findings: list[Finding] = []
    expected_release = int(policy.get("release", 0))
    if manifest.get("release") != expected_release:
        findings.append(Finding("manifest-release", f"Manifest release must be {expected_release}."))
    if manifest.get("base_commit") != policy.get("requiredBaseCommit"):
        findings.append(Finding("manifest-base", "Manifest base commit differs from policy."))
    if manifest.get("required_commit_title") != policy.get("requiredCommitTitle"):
        findings.append(Finding("manifest-title", "Manifest title differs from policy."))
    expected = expected_changes(manifest)
    if len(expected) > int(policy.get("hardChangedFileLimit", 500)):
        findings.append(Finding("hard-limit", "Changed path count exceeds 500."))
    for path in contract.get("requiredPermanentControls", []):
        if not (root / path).is_file(): findings.append(Finding("required-control", "Permanent control is missing.", path))
    sw_release = str(contract.get("serviceWorkerRelease", expected_release))
    sw = root / "service-worker.js"
    if not sw.is_file() or f"const RELEASE = '{sw_release}';" not in sw.read_text(encoding="utf-8"):
        findings.append(Finding("service-worker-release", f"Service worker is not Release {sw_release}.", "service-worker.js"))
    if tracked is not None:
        for path in contract.get("forbiddenExactPaths", []):
            if path in tracked: findings.append(Finding("forbidden-exact", "Legacy path remains tracked.", path))
        allowed = set(policy.get("allowedRootReleaseFiles", []))
        for path in sorted(tracked):
            for pattern in policy.get("forbiddenTrackedPatterns", []):
                if fnmatch.fnmatch(path, pattern) and path not in allowed:
                    findings.append(Finding("forbidden-pattern", f"Matched {pattern}.", path)); break
        workflows = {p for p in tracked if p.startswith(".github/workflows/") and p.endswith((".yml", ".yaml"))}
        approved = set(contract.get("approvedWorkflows", []))
        for path in sorted(workflows - approved): findings.append(Finding("unapproved-workflow", "Workflow is not in the permanent approved set.", path))
    return findings
