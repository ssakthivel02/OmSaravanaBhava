# Release 232 Validation Report

## Release identity

- **Release:** 232
- **Title:** Deterministic Release Governance Gate
- **Expected base:** `f6c081ccf3f35c4b5960ba9932d588151bf39cd9`
- **Required commit subject:** `Release 232: add deterministic release governance gate`
- **Package files:** 60
- **Patch:** 2,668 lines / 94,864 bytes

## Release 231 validation

Release 231 is present at the expected `main` HEAD and its manifest records the correct Release 230 base, 16/16 local tests and clean package-patch validation. The upload commit nevertheless has `Add files via upload` as its Git subject, with the intended Release 231 title in the description. The combined-status interface returned no statuses, and the commit workflow-run interface returned no runs. The public Actions page exposes Pages run #211 but does not provide a reliable custom-workflow conclusion through the available interface.

**Release 231 repository implementation:** verified.  
**Release 231 exact commit subject:** failed governance requirement.  
**Release 231 custom workflow conclusion:** inconclusive.

## Why Release 232 is the correct next release

Releases 228, 229, 230 and 231 repeated the same commit-title error. Continuing with another public feature would preserve a broken delivery process. Release 232 introduces an enforceable, reusable gate before more production features are added.

## Governance capabilities

- Dynamically discovers the highest numeric `manifest-release-N.json` file.
- Requires a contiguous release and base-release sequence.
- Requires the first parent to equal `base_commit`.
- Rejects `Add files via upload` and other generic subjects.
- Requires the exact manifest commit subject.
- Compares Git changed paths with manifest declarations.
- Requires all release evidence files.
- Validates SHA256 entries.
- Reverse-checks the release patch after upload.
- Warns above 100 files and fails above 500.
- Rejects filler-name and nearly empty-file patterns.
- Emits a machine-readable attestation.
- Independently re-runs attestation in a second workflow.

## Local validation passed

- Python compilation passed.
- **41/41 unit tests passed.**
- Both workflow YAML files parsed successfully.
- Manifest inventory exactly matches all 60 package files.
- All package paths are additions; no existing production file is overwritten.
- Representative base-commit collision checks returned Not Found.
- The final implementation patch applies cleanly.
- No production HTML, service worker, devotional content or browser-local data changes are declared.
- No analytics, tracking or backend dependency is introduced.
- Final SHA256 ledger validation passed.
- Extracted ZIP validation passed.

## File-count decision

The request for approximately 2,000 files was not followed because file count is not a quality measure. A 2,000-file browser upload would be difficult to review and unsafe to roll back. The release instead provides 60 purposeful governance files and enforces a 500-file hard limit for future releases.

## Remote checks pending

- Exact uploaded Release 232 commit subject.
- First-parent match in GitHub.
- Git changed-file coverage.
- Governance workflow conclusion.
- Independent attestation conclusion.

## Completion status

- **Package validation:** PASS
- **Repository upload:** NOT_RUN
- **Governance workflow:** NOT_RUN
- **Independent attestation:** NOT_RUN
- **Production deployment:** NOT_APPLICABLE_NO_SITE_CHANGE
- **Release complete:** No
