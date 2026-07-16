"""Release transaction orchestration."""

from __future__ import annotations

from pathlib import Path

from .constants import FAIL, PASS
from .models import Finding
from .plan import validate_plan
from .state import validate_bootstrap, validate_final


def validate_transaction(
    *,
    root: Path,
    policy: dict,
    transaction: dict,
    plan: dict,
    mode: str,
    parent: str = "",
    subject: str = "",
    bootstrap_commit: str = "",
    tracked_paths: set[str] | None = None,
) -> dict:
    findings: list[Finding] = []
    findings.extend(validate_plan(plan))

    if transaction.get("release") != 238:
        findings.append(Finding("transaction-release", "Transaction release must be 238."))
    if transaction.get("transactionBaseCommit") != policy.get("transactionBaseCommit"):
        findings.append(Finding("transaction-base", "Transaction and policy base commits differ."))

    if mode == "bootstrap":
        findings.extend(validate_bootstrap(parent=parent, subject=subject, policy=policy))
        expected_present = set(plan.get("paths", []))
        if tracked_paths is not None:
            missing = sorted(expected_present - tracked_paths)
            if missing:
                findings.append(Finding(
                    "bootstrap-deletion-targets",
                    "Bootstrap must begin while every planned deletion target is still tracked: " + ", ".join(missing),
                ))
    elif mode == "final":
        findings.extend(validate_final(
            parent=parent,
            subject=subject,
            bootstrap_commit=bootstrap_commit,
            policy=policy,
        ))
        if tracked_paths is not None:
            remaining = sorted(set(plan.get("paths", [])) & tracked_paths)
            if remaining:
                findings.append(Finding(
                    "final-deletions",
                    "Final state still tracks planned deletion targets: " + ", ".join(remaining),
                ))
        result_path = root / str(policy.get("finalizationResult", ""))
        if not result_path.is_file():
            findings.append(Finding("final-result", "Finalization result file is missing."))
    else:
        findings.append(Finding("transaction-mode", f"Unsupported transaction mode: {mode}"))

    return {
        "status": PASS if not findings else FAIL,
        "release": 238,
        "mode": mode,
        "findingCount": len(findings),
        "findings": [item.to_dict() for item in findings],
    }
