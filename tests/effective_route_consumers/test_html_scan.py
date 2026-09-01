from pathlib import Path
import tempfile
import unittest

from tools.effective_route_consumers.html_scan import scan_html


class HtmlScanTests(unittest.TestCase):
    def test_release_and_module_pass(self):
        source = (
            '<body data-release="238">'
            '<script type="module" src="assets/js/x.mjs"></script>'
        )
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "x.html"
            path.write_text(source, encoding="utf-8")
            self.assertEqual(
                scan_html(path, "x.html", "assets/js/x.mjs"),
                [],
            )

    def test_missing_release_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "x.html"
            path.write_text(
                '<script type="module" src="assets/js/x.mjs"></script>',
                encoding="utf-8",
            )
            findings = scan_html(
                path,
                "x.html",
                "assets/js/x.mjs",
            )
            self.assertTrue(
                any(
                    item.rule == "release-marker-missing"
                    for item in findings
                )
            )


if __name__ == "__main__":
    unittest.main()
