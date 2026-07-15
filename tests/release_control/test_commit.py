from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools.release_control.checks_commit import check_commit
from tools.release_control.models import ManifestView
from tests.release_control.support import base_config, base_manifest, git, init_repo, write_json


class CommitChecks(unittest.TestCase):
    def prepare(self, subject: str):
        directory = tempfile.TemporaryDirectory()
        root = Path(directory.name)
        base = init_repo(root)
        payload = base_manifest()
        payload["base_commit"] = base
        config = base_config()
        config["baseCommit"] = base
        path = root / "manifest.json"
        write_json(path, payload)
        git(root, "add", ".")
        git(root, "commit", "-qm", subject)
        return directory, root, ManifestView(path, payload), config

    def test_package_mode_skips_commit_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = base_manifest()
            path = root / "manifest.json"
            write_json(path, payload)
            results = check_commit(
                root, ManifestView(path, payload), base_config(), False
            )
            self.assertEqual(results[0].status, "SKIPPED")

    def test_exact_subject_and_parent_pass(self):
        holder, root, manifest, config = self.prepare(
            manifest_title := base_manifest()["required_commit_title"]
        )
        with holder:
            results = check_commit(root, manifest, config, True)
            self.assertTrue(all(item.status == "PASS" for item in results))
            self.assertEqual(manifest_title, config["requiredCommitTitle"])

    def test_add_files_subject_fails(self):
        holder, root, manifest, config = self.prepare("Add files via upload")
        with holder:
            results = check_commit(root, manifest, config, True)
            subject = next(item for item in results if item.name == "commit-subject")
            self.assertEqual(subject.status, "FAIL")

    def test_wrong_parent_fails(self):
        holder, root, manifest, config = self.prepare(
            base_manifest()["required_commit_title"]
        )
        with holder:
            manifest.data["base_commit"] = "c" * 40
            results = check_commit(root, manifest, config, True)
            parent = next(item for item in results if item.name == "commit-parent")
            self.assertEqual(parent.status, "FAIL")


if __name__ == "__main__":
    unittest.main()
