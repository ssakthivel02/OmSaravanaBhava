"""Commit metadata and ancestry checks."""

from __future__ import annotations

from pathlib import Path

from .constants import FAIL, PASS, SKIPPED, WARN
from .git import (
    commit_body,
    commit_subject,
    current_sha,
    first_non_empty_line,
    is_repository,
    parent_sha,
)
from .models import CheckResult, ManifestView


def check_commit(
    root: Path,
    manifest: ManifestView,
    config: dict,
    repository_mode: bool,
    strict_subject: bool = False,
) -> list[CheckResult]:
    if not repository_mode:
        return [
            CheckResult(
                "commit-metadata",
                SKIPPED,
                "Commit metadata and ancestry are checked after repository upload.",
                {"strict_subject": strict_subject},
            )
        ]
    if not is_repository(root):
        return [
            CheckResult(
                "commit-metadata",
                FAIL,
                "Repository mode was requested outside a Git work tree.",
                {"strict_subject": strict_subject},
            )
        ]

    policy = config.get("commitPolicy", {})
    subject = commit_subject(root)
    body = commit_body(root)
    body_first_line = first_non_empty_line(body)
    expected = manifest.required_title
    exact_subject = subject == expected
    exact_body = body_first_line == expected
    fallback_subjects = {
        str(item)
        for item in policy.get("browserFallbackSubjects", [])
    }
    fallback_allowed = (
        not strict_subject
        and bool(policy.get("allowBrowserDescriptionFallback"))
        and subject in fallback_subjects
        and exact_body
    )

    if exact_subject:
        metadata_status = PASS
        metadata_mode = "exact-subject"
        message = "Git commit subject exactly matches the release manifest."
    elif fallback_allowed:
        metadata_status = WARN
        metadata_mode = "browser-description-fallback"
        message = (
            "GitHub browser default subject accepted with warning because the "
            "first non-empty commit-body line exactly matches the release title."
        )
    else:
        metadata_status = FAIL
        metadata_mode = "invalid"
        strict_note = " Strict subject mode is enabled." if strict_subject else ""
        message = (
            f"Expected subject {expected!r}; found {subject!r}. "
            f"Commit-body first line was {body_first_line!r}.{strict_note}"
        )

    sha = current_sha(root)
    parent = parent_sha(root)
    ancestry_ok = parent == manifest.base_commit
    return [
        CheckResult(
            "commit-metadata",
            metadata_status,
            message,
            {
                "subject": subject,
                "expected": expected,
                "subject_matches": exact_subject,
                "body_first_line": body_first_line,
                "body_matches": exact_body,
                "metadata_mode": metadata_mode,
                "fallback_subject_allowed": subject in fallback_subjects,
                "strict_subject": strict_subject,
            },
        ),
        CheckResult(
            "commit-parent",
            PASS if ancestry_ok else FAIL,
            "Git first parent matches manifest base_commit."
            if ancestry_ok
            else "Git first parent does not match manifest base_commit.",
            {
                "sha": sha,
                "parent": parent,
                "expected_parent": manifest.base_commit,
            },
        ),
    ]
