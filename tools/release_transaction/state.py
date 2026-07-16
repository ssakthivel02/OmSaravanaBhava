"""Transaction-state validation."""

from __future__ import annotations

from .models import Finding


def validate_bootstrap(
    *,
    parent: str,
    subject: str,
    policy: dict,
) -> list[Finding]:
    findings: list[Finding] = []
    if parent != policy.get("transactionBaseCommit"):
        findings.append(Finding("bootstrap-parent", "Bootstrap parent does not match the approved Release 237 base."))
    if subject != policy.get("bootstrapCommitTitle"):
        findings.append(Finding("bootstrap-subject", "Bootstrap commit subject is not exact."))
    return findings


def validate_final(
    *,
    parent: str,
    subject: str,
    bootstrap_commit: str,
    policy: dict,
) -> list[Finding]:
    findings: list[Finding] = []
    if parent != bootstrap_commit:
        findings.append(Finding("final-parent", "Final commit parent does not match the bootstrap commit."))
    if subject != policy.get("finalCommitTitle"):
        findings.append(Finding("final-subject", "Final commit subject is not exact."))
    return findings
