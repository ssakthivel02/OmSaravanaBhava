"""Typed repository hygiene models."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class Violation:
    path: str
    rule: str
    reason: str
    size_bytes: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class HygieneReport:
    status: str
    scanned_files: int
    violations: list[Violation] = field(default_factory=list)
    ignored_allowlist: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "scanned_files": self.scanned_files,
            "violation_count": len(self.violations),
            "violations": [item.to_dict() for item in self.violations],
            "ignored_allowlist": list(self.ignored_allowlist),
        }
