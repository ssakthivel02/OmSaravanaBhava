#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
QUEUE = ROOT / "reports" / "pack-101" / "push-workflow-review.json"
OUT = ROOT / "reports" / "pack-101" / "workflow-rationalisation"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def extract_run_blocks(text: str) -> list[str]:
    commands: list[str] = []
    lines = text.splitlines()
    for index, line in enumerate(lines):
        match = re.match(r"\s*run:\s*(.*)$", line)
        if not match:
            continue
        value = match.group(1).strip()
        if value and value != "|":
            commands.append(value)
            continue
        indent = len(line) - len(line.lstrip())
        block: list[str] = []
        for next_line in lines[index + 1 :]:
            if next_line.strip() and len(next_line) - len(next_line.lstrip()) <= indent:
                break
            block.append(next_line.strip())
        if block:
            commands.append(" ".join(item for item in block if item))
    return commands


def extract_uses(text: str) -> list[str]:
    return sorted(set(re.findall(r"uses:\s*['\"]?([^'\"\s]+)", text)))


def classify(path: str, text: str) -> str:
    lower = path.lower()
    if "audit" in lower:
        return "scheduled-or-manual-audit"
    if "deployment" in lower or "production-baseline" in lower:
        return "production-deployment-gate"
    if "route" in lower:
        return "route-validation"
    if "observability" in lower:
        return "operations-observability"
    if "hygiene" in lower or "integrity" in lower:
        return "repository-quality-gate"
    return "other"


rows = json.loads(QUEUE.read_text(encoding="utf-8"))
OUT.mkdir(parents=True, exist_ok=True)
review = []
command_index: dict[str, list[str]] = defaultdict(list)
uses_index: dict[str, list[str]] = defaultdict(list)

for row in rows:
    path = row["path"]
    target = ROOT / path
    if not target.exists():
        review.append({"path": path, "status": "missing"})
        continue
    text = read_text(target)
    commands = extract_run_blocks(text)
    uses = extract_uses(text)
    permissions_write = bool(re.search(r"permissions:[\s\S]{0,300}(write|contents:\s*write)", text, re.IGNORECASE))
    for command in commands:
        normalized = re.sub(r"\s+", " ", command).strip()
        if normalized:
            command_index[normalized].append(path)
    for action in uses:
        uses_index[action].append(path)
    review.append({
        "path": path,
        "status": "reviewed",
        "category": classify(path, text),
        "push_trigger": row.get("push_trigger", False),
        "pull_request_trigger": row.get("pull_request_trigger", False),
        "workflow_dispatch": row.get("workflow_dispatch", False),
        "permissions_write": permissions_write,
        "commands": commands,
        "actions": uses,
    })

shared_commands = [
    {"command": command, "workflows": paths}
    for command, paths in command_index.items()
    if len(paths) > 1
]
shared_actions = [
    {"action": action, "workflows": paths}
    for action, paths in uses_index.items()
    if len(paths) > 1
]

recommendations = [
    {
        "priority": 1,
        "action": "Remove broad push triggers from repository-quality-audit.yml and retain workflow_dispatch plus a scheduled run.",
        "reason": "The full audit is expensive and does not need to run after every content upload.",
        "automatic_change": False,
    },
    {
        "priority": 2,
        "action": "Combine repository-hygiene.yml and repository-integrity.yml into one repository-quality gate after command-level comparison.",
        "reason": "Both belong to the same repository-quality category and may duplicate checkout and validation work.",
        "automatic_change": False,
    },
    {
        "priority": 3,
        "action": "Keep deployment-conformance.yml and production-baseline.yml separate until their required checks and failure semantics are compared.",
        "reason": "They are production gates; premature consolidation could reduce deployment protection.",
        "automatic_change": False,
    },
    {
        "priority": 4,
        "action": "Add path filters to route, observability, hygiene and integrity workflows so unrelated bulk data uploads do not trigger them.",
        "reason": "Path scoping reduces duplicate emails and unnecessary Actions consumption while preserving checks.",
        "automatic_change": False,
    },
]

report = {
    "pack": 101,
    "stage": "push-workflow-rationalisation-review",
    "workflow_count": len(review),
    "files_deleted": 0,
    "workflows_disabled": 0,
    "review": review,
    "shared_commands": shared_commands,
    "shared_actions": shared_actions,
    "recommendations": recommendations,
}

(OUT / "workflow-rationalisation.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
)

category_counts: dict[str, int] = defaultdict(int)
for item in review:
    category_counts[item.get("category", "missing")] += 1

lines = [
    "# Pack 101 Push Workflow Rationalisation Review",
    "",
    f"- Workflows reviewed: **{len(review)}**",
    "- Workflows disabled: **0**",
    "- Workflow files deleted: **0**",
    f"- Shared command groups: **{len(shared_commands)}**",
    f"- Shared action groups: **{len(shared_actions)}**",
    "",
    "## Categories",
    "",
]
for category, count in sorted(category_counts.items()):
    lines.append(f"- {category}: **{count}**")
lines += [
    "",
    "## Decision",
    "",
    "No workflow was changed in this review. The next safe change should first remove the broad push trigger from the repository audit and add path filters to non-deployment checks.",
]
(OUT / "SUMMARY.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

print(json.dumps({
    "reviewed": len(review),
    "shared_command_groups": len(shared_commands),
    "shared_action_groups": len(shared_actions),
    "workflows_disabled": 0,
}, indent=2))
