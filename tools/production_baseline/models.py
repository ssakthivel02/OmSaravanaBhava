from __future__ import annotations
from dataclasses import asdict, dataclass

@dataclass(frozen=True)
class Finding:
    rule: str
    message: str
    path: str = ""
    def to_dict(self) -> dict:
        return asdict(self)
