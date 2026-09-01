# Release 211 — Production Integrity Recovery

## Revalidated baseline

- Repository head inspected: `6ff49f60695fb3a970fa8b294d2f744c00768487`.
- Repository release identity before this package: **210**.
- Releases 201–210 are present as ten commits after Release 200.
- The visible GitHub commit subject remains `Add files via upload`; release-specific wording is stored only in the body.
- GitHub returned no independent combined status checks for the Release 210 head.

## Blocking defects confirmed

### 1. Broken atomic service-worker installation risk

Release 208 added these URLs to `PRECACHE_URLS`:

- `/panchangam-framework.html`
- `/data/panchangam-framework.json`

Neither file exists at the Release 210 repository head. Release 210 still installs the complete precache through `cache.addAll(PRECACHE_URLS)`. A failure for either URL can reject the complete service-worker installation.

### 2. CI/deployment gate was never implemented

The Release 200→210 comparison contains no GitHub Actions workflow. The release validation reports are self-declared files rather than independently executed checks.

### 3. Repository and production are not proven equivalent

The repository contains the new Release 210 premium homepage, while the production observation available during audit served an earlier homepage. Repository progress is therefore not deployment evidence.

### 4. Homepage metrics were hard-coded

Release 210 displayed fixed values for search, source and read-aloud records. Release 211 derives all three counts from the corresponding JSON files at runtime and shows `Unavailable` rather than inventing a value when loading fails.

## Release 211 changes

### Production integrity

- Restores `panchangam-framework.html` and `data/panchangam-framework.json`.
- Explicitly marks the Panchangam module as a non-computational framework.
- Advances the service-worker identity from 210 to 211.
- Keeps a small mandatory shell atomic while caching optional modules individually.
- Prevents one missing optional route from invalidating the complete PWA install.
- Restores homepage Open Graph, Twitter, JSON-LD and mobile/PWA metadata.
- Replaces hard-coded homepage counts with data-derived counts.
- Adds transparent repository/deployment/runtime evidence wording.
- Connects the Panchangam framework from the homepage and platform hub.

### Independent evidence

- Adds `.github/workflows/static-site-integrity.yml`.
- Adds `.github/workflows/production-smoke.yml`.
- Adds a standard-library repository validator covering:
  - required files;
  - JSON validity;
  - HTML structure and parsing;
  - page titles;
  - root Tamil language attributes;
  - canonical count, origin and duplication;
  - internal links and asset paths;
  - CSS asset paths;
  - sitemap syntax, duplicates and missing routes;
  - manifest icons;
  - service-worker release identity;
  - precache duplication and target existence;
  - rejection of an oversized atomic complete precache.
- Adds five validator unit tests.
- Adds JSON and Markdown workflow artifacts.

## Local package validation

- Validator unit tests: **5/5 passed**.
- Python compilation: **passed**.
- JavaScript syntax: **passed**.
- JSON syntax: **passed**.
- Workflow YAML parsing: **passed**.
- Service-worker precache entries: **162 total / 162 unique**.
- Complete optional precache is no longer installed atomically.

## Honest release status

**Package validation: PASS**

**Repository-wide integrity: PENDING GitHub Actions**

**Production deployment evidence: PENDING Production smoke**

Release 211 must not be called production-certified until both workflows complete successfully against the uploaded repository and deployed custom domain.
