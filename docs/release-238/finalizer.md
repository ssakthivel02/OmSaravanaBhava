# Automatic Finalizer

The finalizer runs with `contents: write`, verifies every deletion target is
tracked, stages fourteen deletions, creates the finalization result, rewrites
the manifest and governance configuration, regenerates the checksum ledger,
runs all gates, commits the exact final title and pushes to `main`.
