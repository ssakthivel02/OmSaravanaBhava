# Release 236 Validation Report

## Identity

- **Release:** 236
- **Title:** Tracked-Cache Cleanup and Repository Integrity Enforcement
- **Base commit:** `d06aa0d99315344ad2c23ee3a1d98fb635f33b16`
- **Required commit title:** `Release 236: complete tracked-cache cleanup and enforce repository integrity`
- **Changed files:** 135
- **Added:** 115
- **Modified:** 7
- **Deleted:** 13
- **Package files:** 318
- **Tracked inventory records:** 310
- **Implementation patch:** 5,365 lines

## Release 235 audit

Release 235 has the exact required subject and is exactly one commit above
Release 234. It contains only 80 actual Git changes rather than the declared
93. The thirteen declared compiled-cache deletions are absent, and a sampled
`.pyc` file remains retrievable at the Release 235 HEAD. Release 235 therefore
did not complete its repository-hygiene objective.

## Release 236 scope

- Includes all thirteen binary cache deletions.
- Adds deterministic tracked-file inventory and SHA256 evidence.
- Checks required governance assets and release-manifest structure.
- Emits JSON, inventory and SARIF integrity evidence.
- Adds a dedicated Repository Integrity workflow.
- Adds pre-commit hooks, Make targets and Python project metadata.
- Provides CMD, PowerShell and Bash external-package installers.
- Enforces deterministic LF bytes for installer checksum portability.
- Preserves public pages, routes, devotional content and browser-local data.

## Validation

- Python compile: **PASS**
- Unit tests: **112/112 PASS**
- Workflow YAML: **4/4 PASS**
- Repository Hygiene: **PASS, zero violations**
- Repository Integrity: **PASS, zero violations**
- Binary patch applicability: **PASS**
- Synthetic staged coverage: **135/135 PASS**
- Synthetic deletions: **13/13 PASS**
- Package validation: **PASS**
- Extracted ZIP validation: **PASS**
- GitHub Actions: **NOT_RUN**
- Independent attestation: **NOT_RUN**

## Application method

Keep the package outside the repository and run `APPLY_RELEASE_236.cmd`.
The installer prompts for the local repository path and applies the patch
without an unsafe ZIP overlay.

## Production impact

No public HTML, devotional text, route content, service worker, browser-local
storage, analytics, tracking or backend dependency is changed.
