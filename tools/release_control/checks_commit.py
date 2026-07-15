"""Commit identity and ancestry checks."""

from __future__ import annotations

from pathlib import Path

from .constants import FAIL, PASS, SKIPPED
from .git import commit_subject, current_sha, is_repository, parent_sha
from .models import CheckResult, ManifestView


def check_commit(root: Path, manifest: ManifestView, config: dict, repository_mode: bool) -> list[CheckResult]:
    if not repository_mode:
        return [CheckResult(
            "commit-identity",
            SKIPPED,
            "Commit subject and ancestry are checked after repository upload.",
        )]
    if not is_repository(root):
        return [CheckResult(
            "commit-identity",
            FAIL,
            "Repository mode was requested outside a Git work tree.",
        )]

    subject = commit_subject(root)
    expected = manifest.required_title
    reject = [str(item) for item in config.get("commitPolicy", {}).get("rejectSubjects", [])]
    exact_ok = subject == expected
    rejected = subject in reject
    title_ok = exact_ok and not rejected

    sha = current_sha(root)
    parent = parent_sha(root)
    ancestry_ok = parent == manifest.base_commit
    return [
        CheckResult(
            "commit-subject",
            PASS if title_ok else FAIL,
            "Git commit subject exactly matches the release manifest."
            if title_ok
            else f"Expected {expected!r}; found {subject!r}.",
            {"subject": subject, "expected": expected, "rejected": rejected},
        ),
        CheckResult(
            "commit-parent",
            PASS if ancestry_ok else FAIL,
            "Git first parent matches manifest base_commit."
            if ancestry_ok
            else "Git first parent does not match manifest base_commit.",
            {"sha": sha, "parent": parent, "expected_parent": manifest.base_commit},
        ),
    ]
