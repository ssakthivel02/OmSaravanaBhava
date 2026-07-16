from __future__ import annotations

import json
import subprocess
from pathlib import Path


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def base_config() -> dict:
    return {
        "release": 233,
        "baseCommit": "a" * 40,
        "requiredCommitTitle": "Release 233: add browser-compatible commit attestation",
        "requiredEvidenceFiles": [],
        "checksumLedger": "SUMS.txt",
        "patchPath": "release.patch",
        "filePolicy": {"warningThreshold": 100, "hardLimit": 500},
        "commitPolicy": {
            "mode": "browser-compatible",
            "requireExactSubject": True,
            "allowBrowserDescriptionFallback": True,
            "browserFallbackSubjects": ["Add files via upload"],
            "bodyTitleMatch": "first-non-empty-line",
            "fallbackStatus": "WARN",
        },
        "noFillerPolicy": {
            "enabled": True,
            "forbiddenNamePatterns": ["dummy-"],
            "minimumNonWhitespaceBytes": 2,
        },
    }


def base_manifest() -> dict:
    return {
        "project": "OmSaravanaBhava",
        "release": 233,
        "name": "Browser-Compatible Commit Attestation",
        "base_commit": "a" * 40,
        "base_release": 232,
        "generated": "2026-07-15",
        "required_commit_title": "Release 233: add browser-compatible commit attestation",
        "validation_status": "PASS",
        "production_objective": "Add transparent browser-compatible commit metadata validation.",
        "added_files": [],
        "modified_files": [],
        "deleted_files": [],
        "new_browser_storage_key": False,
        "content_changes": False,
        "validation_results": {},
        "known_limitations": ["Production checks remain separate."],
    }


def git(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=True,
    )
    return result.stdout.strip()


def init_repo(root: Path, base_file: str = "base.txt") -> str:
    git(root, "init", "-q")
    git(root, "config", "user.email", "tests@example.invalid")
    git(root, "config", "user.name", "Release Tests")
    (root / base_file).write_text("base\n", encoding="utf-8")
    git(root, "add", ".")
    git(root, "commit", "-qm", "Release 232 baseline")
    return git(root, "rev-parse", "HEAD")


def commit(root: Path, subject: str, body: str = "") -> None:
    command = ["commit", "-qm", subject]
    if body:
        command.extend(["-m", body])
    git(root, *command)
