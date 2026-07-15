from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools.release_control.checks_files import check_files
from tools.release_control.models import ManifestView
from tests.release_control.support import base_config, base_manifest, git, init_repo, write_json


class FileChecks(unittest.TestCase):
    def test_required_evidence_missing_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = base_manifest()
            path = root / "manifest.json"
            write_json(path, payload)
            config = base_config()
            config["requiredEvidenceFiles"] = ["missing.txt"]
            results = check_files(root, ManifestView(path, payload), config, False)
            evidence = next(item for item in results if item.name == "required-evidence-files")
            self.assertEqual(evidence.status, "FAIL")

    def test_declared_file_must_exist(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = base_manifest()
            payload["added_files"] = ["missing.txt"]
            path = root / "manifest.json"
            write_json(path, payload)
            results = check_files(root, ManifestView(path, payload), base_config(), False)
            exists = next(item for item in results if item.name == "manifest-declared-files-exist")
            self.assertEqual(exists.status, "FAIL")

    def test_package_mode_counts_declared_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = base_manifest()
            payload["added_files"] = ["one.txt", "two.txt"]
            for name in payload["added_files"]:
                (root / name).write_text("content\n", encoding="utf-8")
            path = root / "manifest.json"
            write_json(path, payload)
            results = check_files(root, ManifestView(path, payload), base_config(), False)
            count = next(item for item in results if item.name == "release-file-count")
            self.assertEqual(count.details["count"], 2)

    def test_hard_file_limit_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = base_manifest()
            payload["added_files"] = ["one.txt", "two.txt"]
            for name in payload["added_files"]:
                (root / name).write_text("content\n", encoding="utf-8")
            path = root / "manifest.json"
            write_json(path, payload)
            config = base_config()
            config["filePolicy"]["hardLimit"] = 1
            results = check_files(root, ManifestView(path, payload), config, False)
            count = next(item for item in results if item.name == "release-file-count")
            self.assertEqual(count.status, "FAIL")

    def test_filler_name_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = base_manifest()
            payload["added_files"] = ["dummy-example.txt"]
            (root / "dummy-example.txt").write_text("content\n", encoding="utf-8")
            path = root / "manifest.json"
            write_json(path, payload)
            results = check_files(root, ManifestView(path, payload), base_config(), False)
            filler = next(item for item in results if item.name == "no-filler-file-policy")
            self.assertEqual(filler.status, "FAIL")

    def test_git_changed_file_coverage_passes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            base = init_repo(root)
            payload = base_manifest()
            payload["base_commit"] = base
            payload["added_files"] = ["manifest.json", "new.txt"]
            path = root / "manifest.json"
            write_json(path, payload)
            (root / "new.txt").write_text("new content\n", encoding="utf-8")
            git(root, "add", ".")
            git(root, "commit", "-qm", payload["required_commit_title"])
            config = base_config()
            config["baseCommit"] = base
            results = check_files(root, ManifestView(path, payload), config, True)
            coverage = next(item for item in results if item.name == "changed-file-coverage")
            self.assertEqual(coverage.status, "PASS")

    def test_undeclared_git_change_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            base = init_repo(root)
            payload = base_manifest()
            payload["base_commit"] = base
            payload["added_files"] = ["manifest.json"]
            path = root / "manifest.json"
            write_json(path, payload)
            (root / "extra.txt").write_text("extra\n", encoding="utf-8")
            git(root, "add", ".")
            git(root, "commit", "-qm", payload["required_commit_title"])
            config = base_config()
            config["baseCommit"] = base
            results = check_files(root, ManifestView(path, payload), config, True)
            coverage = next(item for item in results if item.name == "changed-file-coverage")
            self.assertEqual(coverage.status, "FAIL")


if __name__ == "__main__":
    unittest.main()
