# Release 215 Validation Report

## Release identity

- Release: **215**
- Name: **Published-Content Search Facets**
- Verified Release 214 base commit: `17bd5228f38f6520e8c496fc9cd3924f562de6e2`
- Required commit title: `Release 215: add published-content search facets`

## Production change

Release 215 adds a browser-local search-facets dashboard that:

- reads the existing `data/search-index.json`;
- validates destinations against `data/site-routes.json`;
- derives totals and content-type counts at runtime;
- excludes drafts, not-published records and source-review-required records;
- preserves visible labels for reviewed extracts and source registers;
- sends no query or interaction data to remote AI or analytics services.

## Local package validation — PASS

The following checks were executed against the generated Release 215 overlay:

- JavaScript syntax check for `assets/js/search-facets.mjs`;
- six Node.js unit tests for release identity, route normalisation, publication boundaries, draft exclusion, derived counts and Tamil filtering;
- Python syntax compilation for the Release 215 validator, production smoke tool and site-audit tests;
- JSON parsing for the route registry, release manifest and CI configuration;
- XML parsing for `sitemap.xml`;
- Release 215 identity, route, optional-cache and workflow-artifact validation;
- patch dry-run and clean application against exact Release 214 base files;
- byte-for-byte comparison of all 16 patched payload files.

The reconstructed Release 214 base files matched the repository blob identifiers used to create this package, including:

- `index.html`: `5bf18df37c4415849b0b50b639c057e4d0ff6758`
- `platform.html`: `d7ca75c4b53d1134a25d53eb3e146e24199e423e`
- `data/site-routes.json`: `4efe1f51e7177896147f2635a70b0678b96b49ba`
- `sitemap.xml`: `e881ffe9bd9bd01555e4913db6b7c04148ab922a`
- `service-worker.js`: `855e810d628e2c52c7135c703ed2ac9b0983e892`
- `quality/site-audit-config.json`: `40832862248fafefee1a03a8c48f220d89c20b54`
- `tools/production_smoke.py`: `03d1352aa14cadaa2e4f1b4052a21c45bfd87505`
- `tests/test_site_audit.py`: `c6c4d3a56d24c180d8966951a99c971595263156`

## GitHub Actions validation — NOT RUN

The workflow files are included in this package, but GitHub has not executed them because Release 215 has not yet been committed.

No GitHub Actions pass claim is made.

## Deployed production validation — NOT RUN

The custom domain has not yet deployed Release 215. Production smoke results therefore do not exist yet.

No deployed-production pass claim is made.

## Required post-commit checks

After committing, verify:

1. repository head;
2. service-worker identity `215`;
3. `search-facets.html` route existence;
4. route-directory entry;
5. sitemap entry;
6. JSON validity;
7. internal links;
8. Static Site Integrity workflow;
9. Production Smoke workflow;
10. absence of stale Release 214 markers in the Release 215 changed files.

Release 216 must not be created until the Release 215 commit is verified.
