"""Atomic publishing models."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class Finding:
    rule: str
    message: str
    path: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
