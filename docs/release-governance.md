# OmSaravanaBhava release governance

Release 232 introduces a deterministic gate for repository releases. The gate treats a release as an auditable change set rather than a file-count exercise.

## Required identity

Every release must have:

- a contiguous release number;
- the exact first-parent base commit;
- one exact Git commit subject;
- an explicit manifest;
- complete changed-file declarations;
- a SHA256 ledger;
- a reversible patch;
- local and remote evidence with precise status language.

For Release 232 the required subject is:

`Release 232: add deterministic release governance gate`

The subject is the first line of the Git commit message. A description may follow, but it does not replace the subject.

## Gate behaviour

The workflow fails when:

- the subject is `Add files via upload` or another generic title;
- the first parent differs from the manifest base commit;
- Git changed files and manifest paths differ;
- required evidence is missing;
- checksums fail;
- the patch cannot be reversed from the uploaded commit;
- filler or nearly empty files are detected;
- the hard file-count limit is exceeded;
- the manifest omits limitations or uses unsafe paths.

## Non-goals

The gate does not certify devotional scholarship, prove production interaction quality, or replace human editorial review. It certifies repository release mechanics only.
