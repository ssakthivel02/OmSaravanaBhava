"""Release patch contract checks."""

from __future__ import annotations

from pathlib import Path

from .constants import FAIL, PASS, SKIPPED
from .git import is_repository, reverse_patch_check
from .models import CheckResult


def check_patch(root: Path, config: dict, repository_mode: bool) -> CheckResult:
    relative = str(config.get("patchPath", ""))
    patch = root / relative
    if not patch.is_file():
        return CheckResult("release-patch", FAIL, f"Patch is missing: {relative}")
    text = patch.read_text(encoding="utf-8", errors="replace")
    if "diff --git" not in text or "new file mode" not in text:
        return CheckResult(
            "release-patch",
            FAIL,
            "Patch does not contain a Git diff with added implementation files.",
        )
    if not repository_mode:
        return CheckResult(
            "release-patch",
            PASS,
            "Patch structure is present; reverse applicability runs after upload.",
            {"lines": len(text.splitlines())},
        )
    if not is_repository(root):
        return CheckResult(
            "release-patch",
            FAIL,
            "Repository mode patch check requires a Git work tree.",
        )
    result = reverse_patch_check(root, patch)
    return CheckResult(
        "release-patch",
        PASS if result.code == 0 else FAIL,
        "Release patch reverses cleanly from the uploaded commit."
        if result.code == 0
        else f"Release patch reverse check failed: {result.output}",
        {"output": result.output},
    )
