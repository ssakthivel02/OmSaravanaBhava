# OmSaravanaBhava Native R6 Source Inventory

## Source authority
The next-generation website source authority is the recovered Manus export:

- `OmSaravanaBhava_R6_FINAL_MANUS_MASTER_SOURCE.zip`
- SHA-256: `3477dd375e9545bd51482f9cacabe851adc6a841cdf111ffd5eb408f76c26585`

Equivalent recovery lineage is recorded in:

- `MANUS_ALL_WEBSITES_LATEST_EXPORT_2026-08-27.zip`
- SHA-256: `47eef4cb07a6d466ad370d3923ec972ae43a916b18081ed85182d2b32da3ddfc`
- internal path: `01_OmSaravanaBhava/source/R6_FINAL_MASTER/`

Historical dashboard evidence confirms that the R6 final premium source was created and later packaged into a Windows owner-QA R2 archive, but the executable archive bytes are not currently present in this GitHub branch. Do not substitute R5 or another project for the missing R6 bytes.

## Known native contract
Recovery evidence identifies an editable native application rather than the current donor overlay:

- React + Vite frontend.
- Express server entry where present in the recovered source.
- pnpm dependency workflow.
- canonical production build: `pnpm run build`.

The exact package scripts, routes, external origins and file inventory must be regenerated from the recovered source; historical descriptions are not accepted as current build evidence.

## Asset recovery state
Recovery evidence records:

- 2,521 referenced assets present.
- 52 unresolved referenced assets.

The governed reconciliation ledger is `docs/R6_ASSET_RECONCILIATION.csv`. All 52 entries are intentionally `PENDING` until the exact R6 recovery report/source reveals the original reference paths. Production requires every record to finish as one of:

- `FOUND_VERIFIED`
- `RIGHTS_SAFE_REPLACEMENT`
- `QUARANTINED`
- `INTENTIONALLY_REMOVED`

No missing image/audio/font/source asset may be silently replaced from an unrelated project.

## Import boundary
Only hash-verified native R6 source belongs under `native-r6/`.

`native-r6/IMPORT_PROVENANCE.json` is repository-controlled provenance metadata and must be preserved during source import.

Generated/local material is prohibited from commit, including dependencies, build output, caches, local environment files, private keys and source archives.

## Automated recovery controls
The reconstruction branch now includes:

- `tools/native-r6/verify_import.py` — validates provenance, required package/build contract, repository hygiene and exact cross-project technical contamination indicators.
- `tools/native-r6/inventory_source.py` — generates a deterministic JSON inventory of source files, hashes, package scripts, candidate route literals and external origins after import.
- `tools/native-r6/verify_asset_ledger.py` — enforces the 52-record asset reconciliation ledger and blocks production while any entry remains `PENDING`.
- `tools/native-r6/verify_release_gates.py` — enforces the machine-readable production gate state in `release/R6_RELEASE_GATES.json`.
- `docs/R6_BROWSER_QA_MATRIX.csv` — 40 P0 browser/experience cases covering identity, navigation, deep refresh, songs, Thiruppugazh, mantras, temples, search, audio, canonical Tamil, language candidates, accessibility, motion, responsive behavior, PWA, SEO, security, performance and exact-head release evidence.

## Current executable state
`SOURCE_IMPORT_PENDING`

Expected CI behavior until the exact source is recovered:

1. governance/schema checks pass;
2. asset ledger validates structurally with 52 `PENDING` records;
3. release gate schema validates;
4. native candidate CI fails closed at `verify_import.py` because `native-r6/package.json` and the remaining native source are absent;
5. dependency install/build/preview steps remain skipped.

This failure is intentional and must not be bypassed by copying `main`, Kandan legacy material or another project into `native-r6/`.

## Post-import execution sequence
1. Verify authoritative archive SHA-256.
2. Import only native R6 files into `native-r6/` while retaining `IMPORT_PROVENANCE.json`.
3. Run `verify_import.py`.
4. Generate and retain the deterministic source inventory.
5. Extract the exact 52 unresolved asset references into the governed ledger.
6. Run frozen dependency install and the actual R6 package scripts.
7. Run `pnpm run build`.
8. Derive exact route/function test coverage from the recovered source rather than assumptions.
9. Resolve all asset dispositions with evidence.
10. Execute the 40-case browser qualification matrix and any source-discovered additional cases.
11. Complete canonical/source/publication-rights, accessibility, PWA, SEO, performance, security and rollback evidence.
12. Consider owner approval only for the exact commit whose required release gates are all PASS.

## Production boundary
No file in this inventory authorizes:

- merge to `main`;
- DNS change;
- production GitHub Pages cutover;
- canonical devotional text rewrite;
- promotion of staged/research-only data;
- production-ready claims.

The existing production remains rollback/reference evidence until an exact-head native R6 candidate is demonstrably qualified.
