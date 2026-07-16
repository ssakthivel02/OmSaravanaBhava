# Release 233 Validation Report

## Identity

- **Release:** 233
- **Title:** Browser-Compatible Commit Attestation
- **Expected base:** `514eaf96ecaa53560bfd47cc8fc84ebd49e686f1`
- **Required title:** `Release 233: add browser-compatible commit attestation`
- **Actual Git changed files:** 43
- **Byte-identical package support files:** 15
- **ZIP files:** 58
- **Patch:** 2,111 lines

## Release 232 validation

Release 232 is uploaded as one commit directly on top of Release 231. The expected governance files and 60-file manifest are present. However, the Git subject is still `Add files via upload`; the intended Release 232 title is the first commit-body line. This violates Release 232's strict exact-subject policy. The available commit-status and workflow-run interfaces returned no custom conclusions, while the public Actions page exposes Pages run #211. Therefore the Release 232 implementation is verified, but its strict governance result is not a PASS.

## Corrective objective

Release 233 preserves exact-subject governance for local Git workflows and adds a narrow, transparent GitHub browser compatibility path.

### Preferred mode

- Subject exactly equals `required_commit_title`.
- Commit check: `PASS`.
- Attestation mode: `exact-subject`.

### Controlled browser fallback

Accepted only when:

1. the subject is exactly `Add files via upload`;
2. the first non-empty body line exactly equals `required_commit_title`;
3. strict subject mode is disabled.

The commit check is `WARN`, not a false PASS. Overall governance may remain `PASS` when every other check succeeds. The attestation records `subject_matches=false`, `body_matches=true` and `metadata_mode=browser-description-fallback`.

### Strict mode

`--strict-commit-subject` or `OSB_STRICT_COMMIT_SUBJECT=1` disables browser fallback. The new local publishing scripts create an exact-subject commit and perform strict validation before push.

## Validation passed

- 25 modified baselines matched the current Release 232 package; key governance files were independently matched to GitHub blob SHAs.
- Python compilation passed.
- **60/60 unit tests passed.**
- Two workflow YAML files parsed successfully.
- Four shell scripts passed `bash -n`.
- Full synthetic repository validation proved browser fallback returns overall PASS with a visible WARN.
- The same browser metadata failed strict mode as intended.
- Exact-subject metadata passed strict repository mode.
- Git changed-file coverage passed 43/43 in integration testing.
- Reverse patch validation passed.
- Final implementation patch applies cleanly to the Release 232 package baseline.
- No production HTML, service worker, route registry, devotional content or browser-local personal data was changed.
- No analytics, tracking or backend dependency was introduced.
- SHA256 ledger and extracted ZIP validation passed.

## Package support files

Fifteen byte-identical Release 232 files are included so the extracted overlay can run the complete governance test suite independently. They are not declared as Git changes and should not appear in the uploaded commit because their bytes are unchanged.

## Remote checks pending

- Uploaded Release 233 commit parent.
- Commit metadata PASS or WARN outcome.
- Git changed-file coverage in GitHub Actions.
- Governance artifact.
- Independent attestation artifact.

## Completion status

- **Package validation:** PASS
- **Repository integration simulation:** PASS
- **Repository upload:** NOT_RUN
- **Governance workflow:** NOT_RUN
- **Independent attestation:** NOT_RUN
- **Production deployment:** NOT_APPLICABLE_NO_SITE_CHANGE
- **Release complete:** No
