
from __future__ import annotations
from pathlib import Path
from .constants import FAIL, PASS
from .models import Finding
from .rules import expected_changes, static_findings

def validate(*, root: Path, policy: dict, contract: dict, manifest: dict, mode: str, tracked: set[str] | None = None, staged: dict[str, str] | None = None, parent: str | None = None, subject: str | None = None) -> dict:
    findings: list[Finding] = static_findings(root, policy, contract, manifest, tracked)
    expected = expected_changes(manifest)
    if mode == "staged" and staged is not None:
        missing=sorted(set(expected)-set(staged)); extra=sorted(set(staged)-set(expected)); wrong=sorted(p for p in set(expected)&set(staged) if expected[p]!=staged[p])
        if missing: findings.append(Finding("staged-missing", ", ".join(missing)))
        if extra: findings.append(Finding("staged-extra", ", ".join(extra)))
        if wrong: findings.append(Finding("staged-status", ", ".join(wrong)))
    if mode == "final":
        if parent != manifest.get("base_commit"): findings.append(Finding("commit-parent", "Commit parent is not the approved base."))
        if subject != manifest.get("required_commit_title"): findings.append(Finding("commit-title", "Commit subject is not exact."))
    release=int(manifest.get("release",0))
    return {"status":PASS if not findings else FAIL,"release":release,"mode":mode,"findingCount":len(findings),"declaredChangedCount":len(expected),"declaredDeletedCount":len(manifest.get("deleted_files",[])),"findings":[f.to_dict() for f in findings]}
