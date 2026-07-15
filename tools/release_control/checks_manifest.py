"""Release-manifest contract checks."""

from __future__ import annotations

import re
from pathlib import Path

from .constants import FAIL, PASS, SHA1_PATTERN
from .jsonio import safe_relative_path, unique_strings
from .models import CheckResult, ManifestView

REQUIRED_FIELDS = (
    "project",
    "release",
    "name",
    "base_commit",
    "base_release",
    "generated",
    "required_commit_title",
    "validation_status",
    "production_objective",
    "added_files",
    "modified_files",
    "deleted_files",
    "new_browser_storage_key",
    "content_changes",
    "validation_results",
    "known_limitations",
)


def check_manifest(manifest: ManifestView, config: dict) -> list[CheckResult]:
    results: list[CheckResult] = []
    data = manifest.data
    missing = [field for field in REQUIRED_FIELDS if field not in data]
    results.append(CheckResult(
        "manifest-required-fields",
        FAIL if missing else PASS,
        f"Missing fields: {missing}" if missing else "All required manifest fields are present.",
        {"missing": missing},
    ))

    expected_release = int(config.get("release", 0))
    sequence_ok = (
        manifest.release == expected_release
        and manifest.base_release == expected_release - 1
    )
    results.append(CheckResult(
        "manifest-release-sequence",
        PASS if sequence_ok else FAIL,
        "Release and base release form a contiguous sequence."
        if sequence_ok
        else f"Expected release {expected_release} based on {expected_release - 1}; got {manifest.release} based on {manifest.base_release}.",
    ))

    base_ok = bool(re.fullmatch(SHA1_PATTERN, manifest.base_commit)) and (
        manifest.base_commit == str(config.get("baseCommit", ""))
    )
    results.append(CheckResult(
        "manifest-base-commit",
        PASS if base_ok else FAIL,
        "Manifest base commit matches governance configuration."
        if base_ok
        else "Manifest base commit is invalid or does not match the configured base.",
        {"manifest": manifest.base_commit, "configured": config.get("baseCommit")},
    ))

    expected_title = str(config.get("requiredCommitTitle", ""))
    title_ok = manifest.required_title == expected_title
    results.append(CheckResult(
        "manifest-required-title",
        PASS if title_ok else FAIL,
        "Manifest required commit title is exact."
        if title_ok
        else "Manifest required commit title differs from governance configuration.",
        {"manifest": manifest.required_title, "configured": expected_title},
    ))

    path_errors: list[str] = []
    duplicates: dict[str, list[str]] = {}
    all_paths: set[str] = set()
    for key in ("added_files", "modified_files", "deleted_files"):
        unique, values = unique_strings(data.get(key))
        if not unique:
            duplicates[key] = values
        for value in values:
            if not safe_relative_path(value):
                path_errors.append(value)
            if value in all_paths:
                path_errors.append(f"duplicate-across-lists:{value}")
            all_paths.add(value)
    path_ok = not path_errors and not duplicates
    results.append(CheckResult(
        "manifest-path-safety",
        PASS if path_ok else FAIL,
        "All declared paths are unique repository-relative paths."
        if path_ok
        else "Unsafe or duplicate paths were declared.",
        {"path_errors": path_errors, "duplicate_lists": duplicates},
    ))

    limitations = data.get("known_limitations")
    limitations_ok = (
        isinstance(limitations, list)
        and len(limitations) > 0
        and all(isinstance(item, str) and len(item.strip()) >= 5 for item in limitations)
    )
    results.append(CheckResult(
        "manifest-limitations",
        PASS if limitations_ok else FAIL,
        "Known limitations are explicitly documented."
        if limitations_ok
        else "Manifest must include at least one meaningful limitation.",
    ))
    return results
