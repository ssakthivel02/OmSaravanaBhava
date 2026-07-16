# GitHub browser upload procedure

## Before upload

1. Confirm `main` is still `514eaf96ecaa53560bfd47cc8fc84ebd49e686f1`.
2. Extract the release ZIP.
3. Enable hidden files in Windows File Explorer.
4. Verify `.github` is visible.
5. Run `scripts/release/preflight.ps1` against the extracted package when practical.

## Preferred commit form

GitHub normally shows a small upper commit-title field and a larger optional description field.

Enter this in the small upper field:

`Release 233: add browser-compatible commit attestation`

Leave the description blank unless context is required. This produces an exact-subject `PASS`.

## Browser fallback

When the interface does not allow the default `Add files via upload` subject to be replaced, enter this exact title as the **first non-empty line** of the larger description field:

`Release 233: add browser-compatible commit attestation`

The governance gate will record a `WARN` with `metadata_mode: browser-description-fallback`. It will not pretend the subject was correct.

Do not add greetings, spaces or explanatory text before the title. The first non-empty description line must be exact.

## Preferred local publisher

After Release 233 is available locally, use:

```powershell
./scripts/release/publish-release.ps1 -Manifest manifest-release-N.json
```

or:

```bash
scripts/release/publish-release.sh . manifest-release-N.json
```

The publisher verifies the base SHA and declared files, creates an exact-subject commit and optionally pushes it.

## After upload

1. Copy the new `main` SHA.
2. Confirm its parent matches the manifest `base_commit`.
3. Open **Release Governance Gate**.
4. Confirm overall status is `PASS`.
5. Review whether commit metadata is `PASS` or `WARN`.
6. Confirm the independent attestation passes.
7. Retain both artifacts before starting the next release.
