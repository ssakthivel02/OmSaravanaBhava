# Release 225 Validation Report

## Identity

- Release: **225**
- Feature: **Browser-Local Personal Data Backup and Restore Centre**
- Base commit: `3600bf1b301d2240f3bdb7f8edbcbe8e552e916c`
- Required commit title: `Release 225: add browser-local data backup centre`

## Local package validation

- Required package files: **PASS**
- Personal-data JavaScript syntax: **PASS**
- Maintenance JavaScript syntax: **PASS**
- Personal-data unit tests: **PASS**
- Maintenance continuity tests: **PASS**
- Python syntax: **PASS**
- JSON parsing: **PASS**
- Sitemap XML parsing: **PASS**
- Release overlay validation: **PASS**
- Patch application against Release 224: **PASS**
- SHA-256 package manifest: **PASS**
- ZIP integrity: **PASS**

## Functional boundaries checked locally

- Exactly five registered datasets are portable.
- Unknown localStorage keys are not exported or restored.
- Backup schema and canonical origin are validated.
- Import is capped at 1 MB.
- Import requires preview and explicit Apply.
- Array datasets support deterministic timestamp-aware merge.
- Replace affects only explicitly selected registered datasets.
- Invalid, duplicate and external-route records are removed.
- Selected devotional text and page-body fields are discarded.
- Cache API contents are never read or exported.
- Accessibility preferences remain a bounded four-boolean object.
- SHA-256 export digest uses browser Web Crypto when available.
- No account, cloud upload, analytics or collaborative service was added.
- New PWA files remain optional and cannot block service-worker installation.

## GitHub Actions validation

**NOT RUN.**

No status checks were returned for the Release 224 head by the connected combined-status endpoint.

## Deployed production validation

**NOT RUN.**

These checks can run only after the package is committed and GitHub Pages deploys it.
