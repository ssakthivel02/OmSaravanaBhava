from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools.release_control.checks_commit import check_commit
from tools.release_control.models import ManifestView
from tests.release_control.support import (
    base_config,
    base_manifest,
    commit,
    git,
    init_repo,
    write_json,
)


class CommitChecks(unittest.TestCase):
    def prepare(self, subject: str, body: str = ""):
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
        commit(root, subject, body)
        return directory, root, ManifestView(path, payload), config

    def metadata(self, results):
        return next(item for item in results if item.name == "commit-metadata")

    def parent(self, results):
        return next(item for item in results if item.name == "commit-parent")

    def test_package_mode_skips_commit_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = base_manifest()
            path = root / "manifest.json"
            write_json(path, payload)
            results = check_commit(
                root,
                ManifestView(path, payload),
                base_config(),
                False,
            )
            self.assertEqual(results[0].status, "SKIPPED")

    def test_exact_subject_passes(self):
        title = base_manifest()["required_commit_title"]
        holder, root, manifest, config = self.prepare(title)
        with holder:
            results = check_commit(root, manifest, config, True)
            metadata = self.metadata(results)
            self.assertEqual(metadata.status, "PASS")
            self.assertEqual(metadata.details["metadata_mode"], "exact-subject")
            self.assertTrue(metadata.details["subject_matches"])
            self.assertEqual(self.parent(results).status, "PASS")

    def test_browser_default_with_exact_body_warns(self):
        title = base_manifest()["required_commit_title"]
        holder, root, manifest, config = self.prepare(
            "Add files via upload",
            title,
        )
        with holder:
            metadata = self.metadata(
                check_commit(root, manifest, config, True)
            )
            self.assertEqual(metadata.status, "WARN")
            self.assertEqual(
                metadata.details["metadata_mode"],
                "browser-description-fallback",
            )
            self.assertFalse(metadata.details["subject_matches"])
            self.assertTrue(metadata.details["body_matches"])

    def test_browser_body_may_have_blank_lines_before_title(self):
        title = base_manifest()["required_commit_title"]
        holder, root, manifest, config = self.prepare(
            "Add files via upload",
            f"\n\n{title}\nAdditional description",
        )
        with holder:
            metadata = self.metadata(
                check_commit(root, manifest, config, True)
            )
            self.assertEqual(metadata.status, "WARN")
            self.assertEqual(metadata.details["body_first_line"], title)

    def test_browser_body_title_after_explanation_fails(self):
        title = base_manifest()["required_commit_title"]
        holder, root, manifest, config = self.prepare(
            "Add files via upload",
            f"Please upload this release\n{title}",
        )
        with holder:
            metadata = self.metadata(
                check_commit(root, manifest, config, True)
            )
            self.assertEqual(metadata.status, "FAIL")

    def test_browser_default_without_body_fails(self):
        holder, root, manifest, config = self.prepare("Add files via upload")
        with holder:
            metadata = self.metadata(
                check_commit(root, manifest, config, True)
            )
            self.assertEqual(metadata.status, "FAIL")

    def test_unapproved_generic_subject_fails_even_with_exact_body(self):
        title = base_manifest()["required_commit_title"]
        holder, root, manifest, config = self.prepare("Update files", title)
        with holder:
            metadata = self.metadata(
                check_commit(root, manifest, config, True)
            )
            self.assertEqual(metadata.status, "FAIL")

    def test_strict_mode_rejects_browser_fallback(self):
        title = base_manifest()["required_commit_title"]
        holder, root, manifest, config = self.prepare(
            "Add files via upload",
            title,
        )
        with holder:
            metadata = self.metadata(
                check_commit(
                    root,
                    manifest,
                    config,
                    True,
                    strict_subject=True,
                )
            )
            self.assertEqual(metadata.status, "FAIL")
            self.assertTrue(metadata.details["strict_subject"])

    def test_fallback_can_be_disabled_by_configuration(self):
        title = base_manifest()["required_commit_title"]
        holder, root, manifest, config = self.prepare(
            "Add files via upload",
            title,
        )
        with holder:
            config["commitPolicy"]["allowBrowserDescriptionFallback"] = False
            metadata = self.metadata(
                check_commit(root, manifest, config, True)
            )
            self.assertEqual(metadata.status, "FAIL")

    def test_wrong_parent_fails_independently(self):
        title = base_manifest()["required_commit_title"]
        holder, root, manifest, config = self.prepare(title)
        with holder:
            manifest.data["base_commit"] = "c" * 40
            results = check_commit(root, manifest, config, True)
            self.assertEqual(self.metadata(results).status, "PASS")
            self.assertEqual(self.parent(results).status, "FAIL")


if __name__ == "__main__":
    unittest.main()
