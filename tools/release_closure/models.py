from __future__ import annotations
from dataclasses import dataclass, asdict
@dataclass(frozen=True)
class Finding:
    rule: str
    message: str
    path: str = ""
    def to_dict(self): return asdict(self)
