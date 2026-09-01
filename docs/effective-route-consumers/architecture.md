# Architecture

The runtime loads the preserved historical route registry and deterministic exact-path overrides concurrently, validates both payloads, composes a new in-memory registry, and exposes diagnostics without mutating source files.
