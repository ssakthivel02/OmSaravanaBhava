from __future__ import annotations
import fnmatch
import re
from pathlib import Path
from .models import Finding

RELEASE_ROOT = re.compile(r"^(?:RELEASE_\d|manifest-release-(?!241\.json$))")

def expected_changes(manifest: dict) -> dict[str, str]:
    result: dict[str, str] = {}
    for path in manifest.get("added_files", []): result[str(path)] = "A"
    for path in manifest.get("modified_files", []): result[str(path)] = "M"
    for path in manifest.get("deleted_files", []): result[str(path)] = "D"
    return result

def static_findings(root: Path, policy: dict, contract: dict, manifest: dict, tracked: set[str] | None) -> list[Finding]:
    findings: list[Finding] = []
    if manifest.get("release") != 241:
        findings.append(Finding("manifest-release", "Manifest release must be 241."))
    if manifest.get("base_commit") != policy.get("requiredBaseCommit"):
        findings.append(Finding("manifest-base", "Manifest base commit differs from policy."))
    if manifest.get("required_commit_title") != policy.get("requiredCommitTitle"):
        findings.append(Finding("manifest-title", "Manifest title differs from policy."))
    expected = expected_changes(manifest)
    if len(expected) > int(policy.get("hardChangedFileLimit", 500)):
        findings.append(Finding("hard-limit", "Changed path count exceeds 500."))
    for path in contract.get("requiredPermanentControls", []):
        if not (root / path).is_file():
            findings.append(Finding("required-control", "Permanent control is missing.", path))
    sw = (root / "service-worker.js")
    if not sw.is_file() or "const RELEASE = '241';" not in sw.read_text(encoding="utf-8"):
        findings.append(Finding("service-worker-release", "Service worker is not Release 241.", "service-worker.js"))
    if tracked is not None:
        for path in contract.get("forbiddenExactPaths", []):
            if path in tracked:
                findings.append(Finding("forbidden-exact", "Legacy path remains tracked.", path))
        for path in sorted(tracked):
            if RELEASE_ROOT.match(path):
                findings.append(Finding("historic-root-release", "Historic release artifact remains tracked.", path))
            for pattern in policy.get("forbiddenTrackedPatterns", []):
                if fnmatch.fnmatch(path, pattern):
                    if path not in set(policy.get("allowedRootReleaseFiles", [])):
                        findings.append(Finding("forbidden-pattern", f"Matched {pattern}.", path))
                        break
        workflows = {p for p in tracked if p.startswith(".github/workflows/") and p.endswith((".yml", ".yaml"))}
        approved = set(contract.get("approvedWorkflows", []))
        for path in sorted(workflows - approved):
            findings.append(Finding("unapproved-workflow", "Workflow is not in the permanent approved set.", path))
    return findings
