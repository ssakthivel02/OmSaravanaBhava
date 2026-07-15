from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools.release_control.checks_patch import check_patch
from tests.release_control.support import base_config, git, init_repo


VALID_PATCH = """diff --git a/new.txt b/new.txt
new file mode 100644
index 0000000..3e75765
--- /dev/null
+++ b/new.txt
@@ -0,0 +1 @@
+new
"""


class PatchChecks(unittest.TestCase):
    def test_missing_patch_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            result = check_patch(Path(directory), base_config(), False)
            self.assertEqual(result.status, "FAIL")

    def test_invalid_patch_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "release.patch").write_text("not a patch\n", encoding="utf-8")
            result = check_patch(root, base_config(), False)
            self.assertEqual(result.status, "FAIL")

    def test_structured_patch_passes_package_mode(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "release.patch").write_text(VALID_PATCH, encoding="utf-8")
            result = check_patch(root, base_config(), False)
            self.assertEqual(result.status, "PASS")

    def test_reverse_patch_passes_uploaded_commit(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            init_repo(root)
            (root / "new.txt").write_text("new\n", encoding="utf-8")
            git(root, "add", "new.txt")
            git(root, "commit", "-qm", "Release 232: add deterministic release governance gate")
            patch = git(root, "show", "--format=", "--binary", "HEAD")
            (root / "release.patch").write_text(patch + "\n", encoding="utf-8")
            result = check_patch(root, base_config(), True)
            self.assertEqual(result.status, "PASS")


if __name__ == "__main__":
    unittest.main()
