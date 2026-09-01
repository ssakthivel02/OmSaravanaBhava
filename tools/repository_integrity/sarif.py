"""SARIF conversion for repository-integrity findings."""

from __future__ import annotations

from .models import IntegrityReport


def to_sarif(report: IntegrityReport) -> dict:
    results = []
    for item in report.violations:
        results.append({
            "ruleId": item.rule,
            "level": item.severity,
            "message": {"text": item.message},
            "locations": [{
                "physicalLocation": {
                    "artifactLocation": {"uri": item.path}
                }
            }],
        })
    return {
        "version": "2.1.0",
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "runs": [{
            "tool": {
                "driver": {
                    "name": "OmSaravanaBhava Repository Integrity",
                    "rules": [],
                }
            },
            "results": results,
        }],
    }
