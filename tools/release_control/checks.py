"""Governance validation orchestration."""

from __future__ import annotations

from pathlib import Path

from .checks_checksums import check_checksums
from .checks_commit import check_commit
from .checks_files import check_files
from .checks_manifest import check_manifest
from .checks_patch import check_patch
from .jsonio import load_json
from .models import GovernanceReport, ManifestView
from .report import build_attestation


def validate_release(
    root: Path,
    config_path: Path,
    manifest_path: Path,
    repository_mode: bool,
) -> GovernanceReport:
    config = load_json(config_path)
    manifest = ManifestView(manifest_path, load_json(manifest_path))
    report = GovernanceReport(
        release=manifest.release,
        mode="repository" if repository_mode else "package",
        root=str(root),
    )
    for result in check_manifest(manifest, config):
        report.add(result)
    for result in check_commit(root, manifest, config, repository_mode):
        report.add(result)
    for result in check_files(root, manifest, config, repository_mode):
        report.add(result)
    report.add(check_checksums(root, config))
    report.add(check_patch(root, config, repository_mode))
    report.attestation = build_attestation(
        root,
        manifest,
        report,
        repository_mode,
    )
    return report
