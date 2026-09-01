# Release numbering policy

Releases are monotonically increasing integers.

- `release` must equal the release number in the manifest filename.
- `base_release` must equal `release - 1`.
- `base_commit` must be the exact first parent of the uploaded release commit.
- A corrective release receives the next number; an existing number is never silently reused.
- Labels such as `A`, `B` or `.1` are not used unless a documented migration explicitly requires them.

The release number identifies governance sequence, not the number of files or features.
