"""Governance report and machine-readable attestation generation."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .git import commit_subject, current_sha, is_repository, parent_sha
from .jsonio import sha256_file
from .models import GovernanceReport, ManifestView


def build_attestation(
    root: Path,
    manifest: ManifestView,
    report: GovernanceReport,
    repository_mode: bool,
) -> dict[str, Any]:
    repository = repository_mode and is_repository(root)
    subject = commit_subject(root) if repository else "NOT_RUN"
    sha = current_sha(root) if repository else "NOT_RUN"
    parent = parent_sha(root) if repository else manifest.base_commit
    manifest_sha = sha256_file(manifest.path)
    changed_detail = next(
        (check.details for check in report.checks if check.name == "changed-file-coverage"),
        {},
    )
    declared = manifest.declared_paths
    return {
        "release": manifest.release,
        "status": report.status,
        "commit": {
            "sha": sha,
            "parent": parent,
            "subject": subject,
            "subject_matches": subject == manifest.required_title if repository else False,
        },
        "manifest": {
            "path": manifest.path.relative_to(root).as_posix(),
            "sha256": manifest_sha,
            "base_commit": manifest.base_commit,
        },
        "files": {
            "changed": len(changed_detail.get("changed", [])) if changed_detail else 0,
            "declared": len(declared),
            "undeclared": changed_detail.get("undeclared", []),
            "missing": changed_detail.get("overdeclared", []),
        },
        "checks": [item.to_dict() for item in report.checks],
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
    }
