from __future__ import annotations

import json
import subprocess
from pathlib import Path


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def base_config() -> dict:
    return {
        "release": 232,
        "baseCommit": "a" * 40,
        "requiredCommitTitle": "Release 232: add deterministic release governance gate",
        "requiredEvidenceFiles": [],
        "checksumLedger": "SUMS.txt",
        "patchPath": "release.patch",
        "filePolicy": {"warningThreshold": 100, "hardLimit": 500},
        "commitPolicy": {
            "rejectSubjects": ["Add files via upload"],
            "requireExactSubject": True,
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
        "release": 232,
        "name": "Governance Gate",
        "base_commit": "a" * 40,
        "base_release": 231,
        "generated": "2026-07-15",
        "required_commit_title": "Release 232: add deterministic release governance gate",
        "validation_status": "PASS",
        "production_objective": "Add deterministic release governance checks.",
        "added_files": [],
        "modified_files": [],
        "deleted_files": [],
        "new_browser_storage_key": False,
        "content_changes": False,
        "validation_results": {},
        "known_limitations": ["Repository checks run only after upload."],
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
    git(root, "commit", "-qm", "Release 231 baseline")
    return git(root, "rev-parse", "HEAD")
