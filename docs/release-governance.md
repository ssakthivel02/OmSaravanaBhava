# OmSaravanaBhava release governance

Release 233 extends the deterministic gate with explicit GitHub browser-upload compatibility while preserving strict local Git mode.

## Required identity

Every release must have:

- a contiguous release number;
- the exact first-parent base commit;
- an explicit required release title;
- an auditable commit-metadata mode;
- a complete changed-file manifest;
- a SHA256 ledger;
- a reversible patch;
- local and remote evidence with precise status language.

For Release 233 the required title is:

`Release 233: add browser-compatible commit attestation`

## Commit metadata

Preferred local and GitHub form:

- subject exactly equals the required title;
- status `PASS`;
- mode `exact-subject`.

Controlled GitHub browser fallback:

- subject is exactly `Add files via upload`;
- first non-empty body line exactly equals the required title;
- status `WARN`;
- mode `browser-description-fallback`.

All other forms fail. Strict mode disables fallback.

## Other gate behaviour

The workflow fails when:

- the first parent differs from the manifest base commit;
- Git changed files and manifest paths differ;
- required evidence is missing;
- checksums fail;
- the patch cannot be reversed from the uploaded commit;
- filler or nearly empty files are detected;
- the hard file-count limit is exceeded;
- the manifest omits limitations or uses unsafe paths.

## Non-goals

The gate does not certify devotional scholarship, production interaction quality or editorial completeness. It certifies repository release mechanics and records any browser compatibility warning without hiding it.
