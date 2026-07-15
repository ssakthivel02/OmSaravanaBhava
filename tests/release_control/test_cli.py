from __future__ import annotations

import unittest

from tools.release_control.cli import build_parser


class CliChecks(unittest.TestCase):
    def test_package_mode_arguments_parse(self):
        args = build_parser().parse_args([
            "--manifest", "manifest-release-232.json", "--package-mode"
        ])
        self.assertTrue(args.package_mode)
        self.assertFalse(args.repository_mode)

    def test_repository_mode_arguments_parse(self):
        args = build_parser().parse_args([
            "--manifest", "manifest-release-232.json", "--repository-mode"
        ])
        self.assertTrue(args.repository_mode)
        self.assertFalse(args.package_mode)

    def test_mode_is_required(self):
        with self.assertRaises(SystemExit):
            build_parser().parse_args(["--manifest", "manifest-release-232.json"])


if __name__ == "__main__":
    unittest.main()
