from __future__ import annotations

from collections import Counter
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[2]
EXCLUDED_PARTS = {'.git', 'node_modules', '.venv', 'venv'}


def included(path: Path) -> bool:
    return path.is_file() and not any(part in EXCLUDED_PARTS for part in path.parts)


files = sorted(p for p in ROOT.rglob('*') if included(p))
extensions = Counter((p.suffix.lower() or '[no extension]') for p in files)

hash_owner: dict[str, Path] = {}
duplicate_groups: dict[str, list[str]] = {}
for path in files:
    try:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
    except OSError:
        continue
    rel = path.relative_to(ROOT).as_posix()
    if digest in hash_owner:
        first = hash_owner[digest].relative_to(ROOT).as_posix()
        duplicate_groups.setdefault(digest, [first]).append(rel)
    else:
        hash_owner[digest] = path

routes = []
for path in sorted(ROOT.rglob('*.html')):
    if not included(path):
        continue
    text = path.read_text(encoding='utf-8', errors='ignore')
    title = re.search(r'<title>(.*?)</title>', text, flags=re.I | re.S)
    routes.append({
        'path': path.relative_to(ROOT).as_posix(),
        'title': re.sub(r'\s+', ' ', title.group(1)).strip() if title else '',
        'has_main': '<main' in text.lower(),
        'has_viewport': bool(re.search(r'<meta[^>]+name=["\']viewport["\']', text, flags=re.I)),
        'has_description': bool(re.search(r'<meta[^>]+name=["\']description["\']', text, flags=re.I)),
    })

workflow_dir = ROOT / '.github' / 'workflows'
workflows = []
if workflow_dir.exists():
    for path in sorted(list(workflow_dir.glob('*.yml')) + list(workflow_dir.glob('*.yaml'))):
        text = path.read_text(encoding='utf-8', errors='ignore')
        workflows.append({
            'path': path.relative_to(ROOT).as_posix(),
            'push_trigger': bool(re.search(r'(?m)^\s*push\s*:', text)),
            'pull_request_trigger': bool(re.search(r'(?m)^\s*pull_request\s*:', text)),
            'workflow_dispatch': 'workflow_dispatch' in text,
            'checkout_v4': 'actions/checkout@v4' in text,
        })

summary = {
    'total_files': len(files),
    'html_routes': len(routes),
    'workflow_count': len(workflows),
    'exact_duplicate_groups': len(duplicate_groups),
    'exact_duplicate_files_beyond_first': sum(len(v) - 1 for v in duplicate_groups.values()),
    'routes_missing_main': sum(not r['has_main'] for r in routes),
    'routes_missing_viewport': sum(not r['has_viewport'] for r in routes),
    'routes_missing_description': sum(not r['has_description'] for r in routes),
    'push_triggered_workflows': sum(w['push_trigger'] for w in workflows),
}

quality_report = {
    'summary': summary,
    'extensions': dict(extensions.most_common()),
    'largest_duplicate_groups': sorted(
        ({'sha256': sha, 'files': names, 'count': len(names)} for sha, names in duplicate_groups.items()),
        key=lambda x: x['count'],
        reverse=True,
    )[:500],
}

(ROOT / 'repository-quality-audit.json').write_text(json.dumps(quality_report, indent=2), encoding='utf-8')
(ROOT / 'route-inventory.json').write_text(json.dumps(routes, indent=2), encoding='utf-8')
(ROOT / 'workflow-inventory.json').write_text(json.dumps(workflows, indent=2), encoding='utf-8')
(ROOT / 'repository-audit-summary.md').write_text(
    '# Repository Quality Audit Summary\n\n' + '\n'.join(f'- **{key.replace("_", " ").title()}**: {value}' for key, value in summary.items()) + '\n',
    encoding='utf-8',
)

print(json.dumps(summary, indent=2))
