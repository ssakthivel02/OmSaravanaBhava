"""Normalisation helpers."""

from __future__ import annotations

from urllib.parse import urlsplit

from .errors import RouteRegistryError


def normalise_route(value: object) -> str:
    raw = str(value or "").strip()
    if not raw:
        raise RouteRegistryError("Route must not be empty.")
    parsed = urlsplit(raw)
    if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment:
        raise RouteRegistryError(f"Route must be a path only: {raw!r}")
    if not raw.startswith("/"):
        raise RouteRegistryError(f"Route must start with '/': {raw!r}")
    while "//" in raw:
        raw = raw.replace("//", "/")
    return raw


def normalise_text(value: object, field: str) -> str:
    text = str(value or "").strip()
    if not text:
        raise RouteRegistryError(f"{field} must not be empty.")
    return text
