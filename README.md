# OmSaravanaBhava — Batch 143

## Repository Audit & Conflict Report

This package is based on the current `ssakthivel02/OmSaravanaBhava` default branch.

It is an evidence-based audit package, not a generic 99-file content batch.

### Immediate blockers
1. Root `manifest.json` has been overwritten by Batch 94 metadata.
2. `service-worker.js` removes all caches and provides no offline shell.
3. `sitemap.xml` lists only six pages.
4. Core detail pages are generated client-side from query parameters.
5. Temple history records still contain explicit placeholder text.

Do not add more content batches before the remediation sequence is completed.
