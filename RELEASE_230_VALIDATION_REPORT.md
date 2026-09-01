# Release 230 Validation Report

## Identity

- **Release:** 230
- **Title:** Literature Publication Boundary Enforcement
- **Expected base:** `292f9f8b2a481f1aab43db2e75d31ccf0a0ffd81`
- **Commit title:** `Release 230: enforce literature publication boundaries`

## Why this release is necessary

Release 229 made publication status highly visible in the premium Reading Workspace. Repository review then exposed an integrity defect: eight literature routes are labelled `published` in the route directory even though their own pages and canonical data declare bounded extracts, source registers, or navigation-only scope.

Release 230 does not manufacture missing literature or conceal the discrepancy. It creates an explicit evidence crosswalk, removes source-only routes from reading eligibility, and converts the existing Content Status page from stale hard-coded totals to a runtime-derived audit.

## Audited boundary

- **8** literature routes have explicit page/data evidence.
- **7** source-register or navigation-only routes are excluded from reading progress.
- **1** bounded extract—Kandar Anubhuti—remains eligible and is effectively labelled `partial-reviewed`.
- **0** devotional verses, translations, commentary records or audio assets are added or changed.
- **0** new browser-storage keys are introduced.

## Local results

### Passed

- Byte-exact baseline verification for all five modified files.
- JavaScript syntax for both Release 230 modules and `service-worker.js`.
- **14/14** Node tests.
- Python validator compilation.
- Both workflow YAML files.
- Publication-boundary JSON schema and unique route IDs.
- Reading exclusion alignment.
- Runtime-derived status-count configuration.
- HTML semantics, Tamil language metadata and live status region.
- Reduced-motion, responsive and print CSS checks.
- No production credential, localhost, analytics, tracking or browser-storage write markers.
- Additive service-worker precache with unchanged cache generation.
- Final 2,141-line patch applicability against Release 229.
- Final package SHA256 verification.

### Failed

None.

### Warnings

- `data/site-routes.json` still carries the historical `published` labels. Release 230 intentionally displays these declared labels as audit evidence instead of silently rewriting them.
- Release 228 and 229 were uploaded with `Add files via upload` as the GitHub commit subject because the intended title was entered in the description field.
- Release 229 custom workflow conclusions were not available through the commit-status interface.

### Skipped locally

- Same-origin requests against all eight deployed pages.
- Screen-reader testing.
- Browser zoom at 200%.
- Real viewport testing.
- Installed-PWA service-worker upgrade and offline testing.
- Release 230 GitHub Actions.
- Post-upload production verification.

## Completion status

- **Package validation passed:** Yes
- **Repository upload verified:** No
- **GitHub Actions passed:** Not yet
- **Production deployment verified:** Not yet
- **Release complete:** No
