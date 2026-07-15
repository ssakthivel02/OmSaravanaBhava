"""Changed-file coverage, evidence and no-filler policy checks."""

from __future__ import annotations

from pathlib import Path

from .constants import FAIL, PASS, SKIPPED
from .git import changed_files, is_repository
from .models import CheckResult, ManifestView


def _is_filler(path: Path, patterns: list[str], minimum_bytes: int) -> bool:
    lower = path.name.lower()
    if any(pattern.lower() in lower for pattern in patterns):
        return True
    try:
        if path.is_file() and path.stat().st_size < minimum_bytes:
            return True
    except OSError:
        return True
    return False


def check_files(root: Path, manifest: ManifestView, config: dict, repository_mode: bool) -> list[CheckResult]:
    results: list[CheckResult] = []
    required_evidence = [str(item) for item in config.get("requiredEvidenceFiles", [])]
    missing_evidence = [path for path in required_evidence if not (root / path).is_file()]
    results.append(CheckResult(
        "required-evidence-files",
        FAIL if missing_evidence else PASS,
        f"Missing evidence files: {missing_evidence}"
        if missing_evidence
        else "All required release evidence files are present.",
        {"missing": missing_evidence},
    ))

    declared = manifest.declared_paths
    missing_declared = sorted(path for path in declared if not (root / path).exists() and path not in manifest.data.get("deleted_files", []))
    results.append(CheckResult(
        "manifest-declared-files-exist",
        FAIL if missing_declared else PASS,
        f"Declared files missing from package: {missing_declared}"
        if missing_declared
        else "All non-deleted manifest paths exist.",
        {"missing": missing_declared},
    ))

    policy = config.get("filePolicy", {})
    warning_threshold = int(policy.get("warningThreshold", 100))
    hard_limit = int(policy.get("hardLimit", 500))

    if repository_mode and is_repository(root):
        changed = set(changed_files(root))
        undeclared = sorted(changed - declared)
        overdeclared = sorted(declared - changed)
        coverage_ok = not undeclared and not overdeclared
        results.append(CheckResult(
            "changed-file-coverage",
            PASS if coverage_ok else FAIL,
            "Every changed path is declared exactly once in the manifest."
            if coverage_ok
            else "Manifest and Git changed-file set differ.",
            {"changed": sorted(changed), "undeclared": undeclared, "overdeclared": overdeclared},
        ))
        count = len(changed)
    else:
        results.append(CheckResult(
            "changed-file-coverage",
            SKIPPED,
            "Git changed-file coverage is checked after upload.",
        ))
        count = len(declared)

    limit_ok = count <= hard_limit
    message = f"Release declares {count} files; hard limit is {hard_limit}."
    details = {
        "count": count,
        "warning_threshold": warning_threshold,
        "hard_limit": hard_limit,
        "warning": count > warning_threshold,
    }
    results.append(CheckResult(
        "release-file-count",
        PASS if limit_ok else FAIL,
        message,
        details,
    ))

    filler = config.get("noFillerPolicy", {})
    if filler.get("enabled"):
        patterns = [str(item) for item in filler.get("forbiddenNamePatterns", [])]
        minimum = int(filler.get("minimumNonWhitespaceBytes", 1))
        filler_paths = []
        for relative in sorted(declared):
            target = root / relative
            if target.exists() and target.is_file() and _is_filler(target, patterns, minimum):
                filler_paths.append(relative)
        results.append(CheckResult(
            "no-filler-file-policy",
            FAIL if filler_paths else PASS,
            f"Potential filler files: {filler_paths}"
            if filler_paths
            else "No filler-name or empty-file pattern was detected.",
            {"matches": filler_paths},
        ))
    return results
