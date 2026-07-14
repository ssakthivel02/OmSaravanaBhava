# Release 227 Validation Report

## Identity

- Release: **227**
- Feature: **Browser-Local Devotional Collections Centre**
- Base commit: `a241ba10ff7fc319a4347d616e2f0c6bb816cbd7`
- Required commit title: `Release 227: add browser-local devotional collections`

## Local package validation

- Required package files: **PASS**
- Collections JavaScript syntax: **PASS**
- Personal-data JavaScript syntax: **PASS**
- Maintenance JavaScript syntax: **PASS**
- Collections unit tests: **PASS**
- Personal-data continuity tests: **PASS**
- Maintenance continuity tests: **PASS**
- Python syntax: **PASS**
- JSON parsing: **PASS**
- Sitemap XML parsing: **PASS**
- Release overlay validation: **PASS**
- Patch application against Release 226: **PASS**
- SHA-256 package manifest: **PASS**
- ZIP integrity: **PASS**

## Functional boundaries checked locally

- Maximum 20 collections.
- Maximum 50 route references per collection.
- Collection names are capped at 60 characters.
- Descriptions are capped at 240 characters.
- Same-origin route enforcement is active.
- Duplicate routes in one collection are rejected.
- Draft, private, unpublished, archived, utility, navigation, directory and milestone routes are excluded.
- Platform, Maintenance and Navigation categories are excluded from the route browser.
- Route titles and publication metadata are resolved from the current route directory.
- Stale references are reported and removed only through an explicit action.
- Route ordering supports bounded up/down movement.
- Collections store route references only.
- Devotional text, selected text, page bodies, images and audio content are not stored.
- Personal Data backup now contains exactly six registered datasets.
- Collection backup supports bounded merge and selected replacement.
- No account, cloud synchronization, analytics, recommendations or collaboration was added.
- New PWA files remain optional and cannot block service-worker installation.

## GitHub Actions validation

**NOT RUN.**

No combined status checks were returned for the Release 226 head.

## Deployed production validation

**NOT RUN.**

These checks can run only after the package is committed and GitHub Pages deploys it.
