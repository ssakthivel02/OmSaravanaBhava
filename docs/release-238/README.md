# Release 238

Release 238 introduces a browser-compatible two-stage transaction. The first
commit installs the finalizer and deployment controls. The finalizer creates the
actual Release 238 commit after deleting the fourteen paths that browser upload
cannot remove.
