# GitHub browser upload procedure

## Before upload

1. Confirm `main` is still `f6c081ccf3f35c4b5960ba9932d588151bf39cd9`.
2. Extract the release ZIP.
3. Enable hidden files in Windows File Explorer.
4. Verify `.github` is visible.
5. Run `scripts/release/preflight.ps1` when a local extracted copy is available.

## Commit form

GitHub shows two text fields:

1. the small upper **commit title** field;
2. the larger optional description field.

Enter this in the small upper field:

`Release 232: add deterministic release governance gate`

Leave the description blank unless additional context is genuinely required.

`Add files via upload` is not an acceptable release subject. Release 232 will fail automatically when that subject is used.

## After upload

1. Copy the new `main` SHA.
2. Confirm its parent is `f6c081ccf3f35c4b5960ba9932d588151bf39cd9`.
3. Open Actions.
4. Confirm **Release 232 Deterministic Governance Gate** passes.
5. Download the governance evidence artifact.
6. Confirm the independent attestation passes.
7. Record the exact commit SHA and workflow conclusions before starting Release 233.
