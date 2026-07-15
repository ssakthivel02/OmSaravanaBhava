"""Typed models for governance checks and reports."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class CheckResult:
    name: str
    status: str
    message: str
    details: dict[str, Any] = field(default_factory=dict)

    @property
    def passed(self) -> bool:
        return self.status in {"PASS", "SKIPPED", "INCONCLUSIVE", "NOT_RUN"}

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class GovernanceReport:
    release: int
    mode: str
    root: str
    status: str = "PASS"
    checks: list[CheckResult] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    attestation: dict[str, Any] = field(default_factory=dict)

    def add(self, result: CheckResult) -> None:
        self.checks.append(result)
        if result.status == "FAIL":
            self.status = "FAIL"
            self.errors.append(f"{result.name}: {result.message}")
        elif result.status in {"INCONCLUSIVE", "NOT_RUN"}:
            self.warnings.append(f"{result.name}: {result.message}")

    def to_dict(self) -> dict[str, Any]:
        return {
            "release": self.release,
            "mode": self.mode,
            "root": self.root,
            "status": self.status,
            "errors": self.errors,
            "warnings": self.warnings,
            "checks": [item.to_dict() for item in self.checks],
            "attestation": self.attestation,
        }


@dataclass(frozen=True)
class ManifestView:
    path: Path
    data: dict[str, Any]

    @property
    def release(self) -> int:
        return int(self.data.get("release", 0))

    @property
    def base_release(self) -> int:
        return int(self.data.get("base_release", -1))

    @property
    def base_commit(self) -> str:
        return str(self.data.get("base_commit", ""))

    @property
    def required_title(self) -> str:
        return str(self.data.get("required_commit_title", ""))

    @property
    def declared_paths(self) -> set[str]:
        result: set[str] = set()
        for key in ("added_files", "modified_files", "deleted_files"):
            values = self.data.get(key, [])
            if isinstance(values, list):
                result.update(str(value) for value in values)
        return result
