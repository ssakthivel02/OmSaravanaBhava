"""Deployment conformance models."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class Finding:
    path: str
    rule: str
    message: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
