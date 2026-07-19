#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDIT = ROOT / "repository-quality-audit.json"
ROUTES = ROOT / "route-inventory.json"
WORKFLOWS = ROOT / "workflow-inventory.json"
OUT = ROOT / "reports" / "pack-101"
OUT.mkdir(parents=True, exist_ok=True)


def load(path: Path):
    if not path.exists():
        raise SystemExit(f"Required audit report is missing: {path.name}")
    return json.loads(path.read_text(encoding="utf-8"))


def as_rows(value):
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        for key in ("routes", "workflows", "items", "records"):
            if isinstance(value.get(key), list):
                return value[key]
    return []


audit = load(AUDIT)
routes = as_rows(load(ROUTES))
workflows = as_rows(load(WORKFLOWS))
summary = audit.get("summary", audit)
duplicate_groups = audit.get("largest_duplicate_groups", [])

missing_main = [r for r in routes if not r.get("has_main", True)]
missing_viewport = [r for r in routes if not r.get("has_viewport", True)]
missing_description = [r for r in routes if not r.get("has_description", True)]
push_workflows = [w for w in workflows if w.get("push") or w.get("push_trigger")]

candidate_groups = []
for group in duplicate_groups:
    files = group.get("files", [])
    categories = Counter()
    for name in files:
        if name.startswith("assets/js/pack-"):
            categories["generated_pack_javascript"] += 1
        elif name.startswith("assets/css/pack-"):
            categories["generated_pack_css"] += 1
        elif name.startswith("docs/"):
            categories["documentation"] += 1
        elif name.startswith(".github/workflows/"):
            categories["workflow"] += 1
        elif name.endswith(".json"):
            categories["json_data"] += 1
        else:
            categories["other"] += 1
    candidate_groups.append({
        "sha256": group.get("sha256"),
        "file_count": len(files),
        "categories": dict(categories),
        "sample_files": files[:25],
        "automatic_deletion_allowed": False,
        "review_required": True,
    })

plan = {
    "pack": 101,
    "title": "Repository Inventory, Duplicate Cleanup and Workflow Rationalisation",
    "baseline": summary,
    "queues": {
        "duplicate_groups_sampled": len(candidate_groups),
        "routes_missing_main": len(missing_main),
        "routes_missing_viewport": len(missing_viewport),
        "routes_missing_description": len(missing_description),
        "push_triggered_workflows": len(push_workflows),
    },
    "safety": {
        "automatic_deletion": False,
        "production_route_preservation": True,
        "rollback_manifest_required": True,
    },
    "duplicate_candidates": candidate_groups,
    "workflow_candidates": push_workflows,
}

(OUT / "pack-101-remediation-plan.json").write_text(
    json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8"
)
(OUT / "routes-missing-main.json").write_text(
    json.dumps(missing_main, ensure_ascii=False, indent=2), encoding="utf-8"
)
(OUT / "routes-missing-viewport.json").write_text(
    json.dumps(missing_viewport, ensure_ascii=False, indent=2), encoding="utf-8"
)
(OUT / "routes-missing-description.json").write_text(
    json.dumps(missing_description, ensure_ascii=False, indent=2), encoding="utf-8"
)
(OUT / "push-workflow-review.json").write_text(
    json.dumps(push_workflows, ensure_ascii=False, indent=2), encoding="utf-8"
)

markdown = f"""# Pack 101 Remediation Summary

- Total files: **{summary.get('total_files', 'unknown')}**
- HTML routes: **{summary.get('html_routes', 'unknown')}**
- Workflows: **{summary.get('workflow_count', 'unknown')}**
- Duplicate files beyond first: **{summary.get('exact_duplicate_files_beyond_first', 'unknown')}**
- Routes missing `<main>`: **{len(missing_main)}**
- Routes missing viewport: **{len(missing_viewport)}**
- Routes missing description: **{len(missing_description)}**
- Push-triggered workflows: **{len(push_workflows)}**

## Decision

No files were deleted. Pack 101 has generated review queues and rollback-controlled remediation inputs. The next change should repair HTML metadata in small batches before duplicate deletion.
"""
(OUT / "PACK-101-SUMMARY.md").write_text(markdown, encoding="utf-8")
print(markdown)
