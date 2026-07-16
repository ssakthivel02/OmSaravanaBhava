from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from tools.release_control.cli import build_parser


class CliChecks(unittest.TestCase):
    def test_package_mode_arguments_parse(self):
        args = build_parser().parse_args([
            "--manifest",
            "manifest-release-233.json",
            "--package-mode",
        ])
        self.assertTrue(args.package_mode)
        self.assertFalse(args.repository_mode)

    def test_repository_mode_arguments_parse(self):
        args = build_parser().parse_args([
            "--manifest",
            "manifest-release-233.json",
            "--repository-mode",
        ])
        self.assertTrue(args.repository_mode)
        self.assertFalse(args.package_mode)

    def test_strict_subject_flag_parses(self):
        args = build_parser().parse_args([
            "--manifest",
            "manifest-release-233.json",
            "--repository-mode",
            "--strict-commit-subject",
        ])
        self.assertTrue(args.strict_commit_subject)

    def test_strict_environment_default(self):
        with patch.dict(os.environ, {"OSB_STRICT_COMMIT_SUBJECT": "true"}):
            args = build_parser().parse_args([
                "--manifest",
                "manifest-release-233.json",
                "--repository-mode",
            ])
            self.assertTrue(args.strict_commit_subject)

    def test_mode_is_required(self):
        with self.assertRaises(SystemExit):
            build_parser().parse_args([
                "--manifest",
                "manifest-release-233.json",
            ])


if __name__ == "__main__":
    unittest.main()
