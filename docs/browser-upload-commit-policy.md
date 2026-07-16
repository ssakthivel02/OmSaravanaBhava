# Browser-compatible commit policy

Release 233 recognises two evidence-backed commit-metadata modes.

## Exact-subject mode

The preferred mode uses this exact Git subject:

`Release 233: add browser-compatible commit attestation`

The commit check returns `PASS`, and the attestation records:

- `subject_matches: true`
- `metadata_mode: exact-subject`

The supplied PowerShell and shell publishing scripts always create this form.

## GitHub browser-description fallback

GitHub's browser uploader may retain `Add files via upload` as the subject when the release title is entered in the larger description field. Release 233 accepts that form only when:

1. the subject is exactly `Add files via upload`;
2. the first non-empty commit-body line exactly equals the manifest's `required_commit_title`;
3. strict subject mode is not enabled.

The commit check returns `WARN`, while overall governance may remain `PASS` if every other check succeeds. The attestation records:

- `subject_matches: false`
- `body_matches: true`
- `metadata_mode: browser-description-fallback`

This is a transparent compatibility path, not a claim that the subject is correct.

## Rejected forms

The gate fails when:

- both subject and body title are wrong;
- the generic subject is used with an empty body;
- the required title appears later than the first non-empty body line;
- an unapproved generic subject is used;
- strict subject mode is enabled.

## Strict mode

Use `--strict-commit-subject` or set `OSB_STRICT_COMMIT_SUBJECT=1` to disable browser fallback. The local publishing scripts use strict validation after creating the commit.
