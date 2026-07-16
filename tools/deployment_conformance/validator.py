"""Deployment conformance orchestration."""

from __future__ import annotations

from pathlib import Path

from .constants import FAIL, PASS
from .html import validate_consumer_html
from .modules import validate_modules
from .routes import validate_route_assets
from .service_worker import validate_service_worker


def validate_deployment(root: Path, policy: dict, contract: dict) -> dict:
    findings = []
    service_worker_path = root / str(policy.get("serviceWorker", "service-worker.js"))
    if service_worker_path.is_file():
        findings.extend(validate_service_worker(
            service_worker_path.read_text(encoding="utf-8"),
            contract,
            service_worker_path.relative_to(root).as_posix(),
        ))
    else:
        from .models import Finding
        findings.append(Finding("service-worker.js", "service-worker-missing", "Service worker is missing."))

    findings.extend(validate_consumer_html(root, contract.get("consumerPages", {})))
    findings.extend(validate_modules(root, [
        "assets/js/effective-route-registry.mjs",
        "assets/js/content-status-audit.mjs",
        "assets/js/discovery-workspace.mjs",
        "assets/js/site-directory.mjs",
        "assets/js/route-status-reconciliation.js",
    ]))
    findings.extend(validate_route_assets(root))
    return {
        "status": PASS if not findings else FAIL,
        "release": int(policy.get("release", 240)),
        "findingCount": len(findings),
        "findings": [item.to_dict() for item in findings],
    }
