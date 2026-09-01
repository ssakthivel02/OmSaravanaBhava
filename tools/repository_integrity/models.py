"""Repository integrity data models."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class IntegrityViolation:
    path: str
    rule: str
    message: str
    severity: str = "error"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class IntegrityReport:
    status: str
    tracked_files: int
    violations: list[IntegrityViolation] = field(default_factory=list)
    inventory_sha256: str = ""
    ignored_allowlist: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "tracked_files": self.tracked_files,
            "violation_count": len(self.violations),
            "violations": [item.to_dict() for item in self.violations],
            "inventory_sha256": self.inventory_sha256,
            "ignored_allowlist": list(self.ignored_allowlist),
        }
