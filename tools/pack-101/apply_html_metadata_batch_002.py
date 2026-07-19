#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
QUEUE = ROOT / "reports" / "pack-101" / "routes-missing-viewport.json"
OUT = ROOT / "reports" / "pack-101" / "metadata-batch-002"
OFFSET = 25
BATCH_SIZE = 50


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def description_for(path: str, title: str) -> str:
    label = title.strip() if title and title.strip() else Path(path).stem.replace("-", " ").title()
    value = f"Explore {label} on Om Saravana Bhava, a Tamil and English Lord Murugan devotional knowledge platform."
    return value[:155]


def insert_before_head_close(text: str, addition: str) -> str | None:
    match = re.search(r"</head\s*>", text, flags=re.IGNORECASE)
    if not match:
        return None
    return text[:match.start()] + addition + "\n" + text[match.start():]


rows = json.loads(QUEUE.read_text(encoding="utf-8"))
OUT.mkdir(parents=True, exist_ok=True)

changed = []
skipped = []
considered = 0
eligible_seen = 0

for row in rows:
    path = row.get("path", "")
    if not path or path.startswith("reports/"):
        continue
    target = ROOT / path
    if not target.exists() or not target.is_file():
        continue

    if eligible_seen < OFFSET:
        eligible_seen += 1
        continue
    if considered >= BATCH_SIZE:
        break

    eligible_seen += 1
    considered += 1
    original = target.read_text(encoding="utf-8", errors="strict")
    additions = []

    if not re.search(r'<meta\s+[^>]*name=["\']viewport["\']', original, flags=re.IGNORECASE):
        additions.append('  <meta name="viewport" content="width=device-width, initial-scale=1">')
    if not re.search(r'<meta\s+[^>]*name=["\']description["\']', original, flags=re.IGNORECASE):
        desc = description_for(path, row.get("title", "")).replace('"', '&quot;')
        additions.append(f'  <meta name="description" content="{desc}">')

    if not additions:
        skipped.append({"path": path, "reason": "metadata already present"})
        continue

    result = insert_before_head_close(original, "\n".join(additions))
    if result is None:
        skipped.append({"path": path, "reason": "no closing head tag"})
        continue

    target.write_text(result, encoding="utf-8")
    changed.append({
        "path": path,
        "before_sha256": sha256(original),
        "after_sha256": sha256(result),
        "added": additions,
    })

manifest = {
    "pack": 101,
    "batch": 2,
    "purpose": "Add missing viewport and description metadata only",
    "queue_offset": OFFSET,
    "batch_limit": BATCH_SIZE,
    "considered_count": considered,
    "changed_count": len(changed),
    "skipped_count": len(skipped),
    "changed": changed,
    "skipped": skipped,
    "safety": {
        "files_deleted": 0,
        "body_content_changed": False,
        "main_elements_added": False,
        "rollback": "Revert the batch commit or restore files identified by before_sha256.",
    },
}

(OUT / "rollback-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
(OUT / "SUMMARY.md").write_text(
    "# Pack 101 Metadata Batch 002\n\n"
    f"- Queue offset: **{OFFSET}**\n"
    f"- Pages considered: **{considered}**\n"
    f"- Pages changed: **{len(changed)}**\n"
    f"- Pages skipped: **{len(skipped)}**\n"
    "- Files deleted: **0**\n"
    "- Scope: viewport and description metadata only\n",
    encoding="utf-8",
)

print(json.dumps({"considered": considered, "changed": len(changed), "skipped": len(skipped)}, indent=2))
if not changed:
    raise SystemExit("No pages were changed; inspect the skipped list before continuing.")
