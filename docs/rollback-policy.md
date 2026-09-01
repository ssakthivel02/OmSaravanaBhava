# Release rollback policy

A rollback must be deterministic and must preserve browser-local user data.

1. Identify the exact release commit and first parent.
2. Prefer a Git revert of the complete release commit.
3. Do not delete reading progress, notes, lists, collections, plans, accessibility preferences or audio history.
4. Re-run the governance gate on the rollback commit.
5. Verify GitHub Pages deployment separately.
6. Record the rollback reason, affected release, commit SHA and validation conclusions.

A rollback is not complete merely because files were removed from the repository.
