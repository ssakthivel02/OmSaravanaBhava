"""Runtime contract checks."""

from __future__ import annotations

from .models import Finding


def validate_runtime(payload: dict, path: str) -> list[Finding]:
    findings: list[Finding] = []
    if payload.get("release") != 238:
        findings.append(Finding(
            path,
            "runtime-release",
            "Runtime contract release must be 238.",
        ))
    if payload.get("globalFetchInterception") is not False:
        findings.append(Finding(
            path,
            "runtime-fetch-policy",
            "Runtime contract must disable global fetch interception.",
        ))
    consumers = payload.get("consumers")
    if not isinstance(consumers, list) or len(consumers) < 3:
        findings.append(Finding(
            path,
            "runtime-consumers",
            "Runtime contract must declare at least three consumers.",
        ))
    return findings
