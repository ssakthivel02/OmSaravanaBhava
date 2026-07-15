# Release 229 Validation Report

**Release:** 229 — Premium Desktop Literature Navigator  
**Expected base commit:** `513949e743a9cab67281fbea7d379bf4c0d06d66`  
**Package date:** 2026-07-15  
**Current status:** **Package validation passed**. Repository upload, GitHub Actions and Release 229 production deployment have not occurred.

## 1. Baseline audit

| Gate | Result | Evidence / boundary |
|---|---|---|
| Repository accessible | Pass | Public repository `ssakthivel02/OmSaravanaBhava` was accessible. |
| Default branch | Pass | `main`. |
| Current HEAD | Pass | Exact SHA `513949e743a9cab67281fbea7d379bf4c0d06d66`. |
| Release identity | Pass with warning | Commit body identifies Release 228, but the GitHub commit subject is `Add files via upload`; the intended title was entered as the description. |
| Release 228 implementation/evidence files | Pass | Commit diff, manifest, changed-files, validation, checksum, patch and upload-instruction evidence were present. |
| Service worker identity | Pass | `const RELEASE = '228';`. |
| Release 228 manifest | Pass | Valid JSON, release 228, correct base and explicit remote-validation limitations. |
| GitHub Actions for Release 228 | Unavailable / inconclusive | No reliable custom-workflow conclusion was exposed by the available commit-status interfaces. No CI pass is claimed. |
| Production website | Partial | The production homepage was reachable. The Release 228 planner page and every release asset were not independently exercised in a real browser during package creation. |

### Baseline exactness for modified files

The reconstructed Release 228 source blobs match GitHub exactly:

- `reading-workspace.html` → `5a94ce2cffd204728424236124b803533ef9cac1`
- `service-worker.js` → `0eeacd9d3daf146a875c46f8dbb506c6507cf1ba`

This permits a deterministic patch against the verified Release 228 baseline.

## 2. Release recommendation and scope

**Required commit title:** `Release 229: add premium desktop literature navigator`

The repository already contains Discovery, Reading Workspace, Reading Notes, Personal Library, Collections, Practice Planner, Accessibility and Print/PDF systems. Creating another dashboard would duplicate established systems and fragment browser-local state. Release 229 therefore upgrades the existing `reading-workspace.html` route in place.

### Problem solved

The current workspace uses a card grid that is adequate on mobile but inefficient for scanning a larger literature catalogue on desktop. Release 229 introduces a desktop-first master-detail navigator with:

- a keyboard-operable route list;
- a persistent detail inspector at wide desktop widths;
- source/publication-state visibility;
- existing reading-progress and reading-list integration;
- Tamil and English search;
- responsive one-column fallback;
- visible focus, reduced-motion and print handling.

### Acceptance criteria

1. No new route, duplicate route, sitemap entry or devotional-content record is created.
2. Wide desktop presentation uses a readable two-column master-detail layout.
3. Tablet and mobile presentation collapses to one column without horizontal scrolling.
4. Route options support `ArrowUp`, `ArrowDown`, `Home` and `End`.
5. `/` focuses search when the user is not editing another control.
6. Every interactive route option has visible keyboard focus and an accessible selected state.
7. Existing progress and reading-list datasets are reused; selection creates no new storage key.
8. No analytics, tracking, backend, account or secret is introduced.
9. Existing publication boundaries and route summaries remain visible.
10. The two new static assets are available through the existing service-worker precache without resetting cache generation.

## 3. File impact

### Modified

- `reading-workspace.html`
- `service-worker.js`

### Added implementation / validation

- `assets/css/reading-workspace-desktop.css`
- `assets/js/reading-workspace-desktop.mjs`
- `tests/reading-workspace-desktop.test.mjs`
- `tools/release_229_validate.py`
- `.github/workflows/release-229-integrity.yml`
- `.github/workflows/release-229-production-smoke.yml`
- `manifest-release-229.json`

### Deliberately unchanged

- `data/site-routes.json` — the existing route is reused.
- `sitemap.xml` — the canonical route already exists exactly once.
- personal-data schemas — no new dataset or key.
- devotional texts and source registries — no content change.
- service-worker cache generation — remains 228; the update is additive, not a cache-schema migration.

## 4. Validation results

### Passed

- Exact baseline SHA and exact modified-file blob identities.
- JavaScript syntax for the desktop module.
- Service-worker JavaScript syntax.
- Release 229 Node tests: **10 passed, 0 failed**.
- Python validator compilation.
- Both workflow YAML files parsed and contained `name`, `on` and `jobs`.
- HTML structural markers, one master-detail navigator and unique key IDs.
- Visible-focus, reduced-motion and print CSS markers.
- Tamil UTF-8 text preservation.
- No new storage write operation or tracking beacon in the desktop module.
- Additive service-worker precache entries appear once each.
- Patch applicability against byte-identical Release 228 baseline.
- Final SHA256 ledger verification.

### Failed

None in local package validation.

### Warnings

1. Release 228’s GitHub commit subject is generic because the intended title was placed in the description.
2. The production homepage was reachable, but this environment did not complete a real-browser functional audit of the Release 228 planner route.
3. The service-worker release constant intentionally remains `228`; changing it merely to match the release number would cause an unnecessary cache-generation reset. The Release 229 assets are added to the existing optional precache.

### Skipped locally

- Real-browser responsive checks at all representative widths.
- Screen-reader and 200% zoom checks.
- Real offline/cache-upgrade behaviour.
- Full repository HTML/link audit because a complete local repository clone was unavailable.

### Unavailable until upload

- Release 229 GitHub Actions result.
- Release 229 GitHub Pages deployment result.
- Release 229 deployed production smoke result.

## 5. Regression risks and controls

| Risk | Control |
|---|---|
| Existing reader module also initialises on the workspace | The old card-grid host is removed; the existing module still supplies shared model/progress functions without rendering a parallel workspace. |
| Mobile regression | New layout defaults to one column and activates the split layout only at 1180px and above. |
| Keyboard trap or hidden function | Native buttons, roving tab index, listbox semantics and visible focus are used. |
| Personal-data expansion | No new storage key or data schema; only existing explicit reading-list save actions write data. |
| Stale offline assets | Both new assets are added exactly once to the established optional precache. |
| Cache migration data loss | Cache generation remains unchanged and user-reading cache protection remains intact. |
| Patch overwrite against newer work | Upload instructions require the exact base SHA and mandate stopping if `main` has moved. |

## 6. Status terminology

- **Package validation passed** — yes.
- **Repository upload verified** — no; upload has not occurred.
- **GitHub Actions passed** — no claim; not run for Release 229.
- **Production deployment verified** — no; Release 229 is not deployed.
- **Release complete** — no.
