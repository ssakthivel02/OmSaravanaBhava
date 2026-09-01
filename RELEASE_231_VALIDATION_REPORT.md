# Release 231 Validation Report

## Identity

- **Release:** 231
- **Title:** Canonical Publication Status Propagation
- **Expected base:** `2cec1d02d81aa3251da131667fabd4d24a98147a`
- **Required commit title:** `Release 231: propagate canonical publication statuses`

## Objective

Release 230 established an evidence-backed boundary registry for eight literature routes. Release 231 propagates that canonical status policy consistently to three public consumers:

1. Content Publication Status
2. Discovery Workspace
3. Complete Site Route Directory

The physical `data/site-routes.json` file is deliberately retained as a historical directory snapshot. A narrowly scoped same-origin fetch overlay reconciles only that registry response before the three consumers render it.

## Behaviour

- Kandar Anubhuti is presented as `partial-reviewed`.
- Six literature registers are presented as `source-register`.
- The Thirumurugatruppadai structured navigator is presented as `navigation`.
- Audited cards receive a visible canonical-status provenance badge.
- Unregistered routes remain byte-for-byte semantically unchanged in the effective response.
- If the boundary registry fails, the base route registry is returned and an explicit fallback state is shown.

## Local validation passed

- Seven modified files matched the current Release 230 Git blob SHAs exactly.
- JavaScript syntax passed for the reconciliation bootstrap, Content Status module and service worker.
- **16/16 Node tests passed.**
- The synthetic browser test confirmed real fetch interception and a reconciled `Response`.
- Python validator compilation passed.
- Both GitHub Actions workflow files parsed successfully.
- Eight unique boundary records and three exact consumers validated.
- Seven routes remain reading-ineligible; Kandar Anubhuti remains bounded-reading eligible.
- All three consumer pages load the synchronous policy script before their mature renderer.
- No browser-local storage write, analytics, tracking, backend dependency or generated devotional content was introduced.
- Service-worker cache generation remains 228; three Release 231 assets are added exactly once.
- The final **1,560-line patch** applies cleanly to the byte-exact Release 230 baseline.
- Final SHA256 ledger and extracted ZIP validation passed.

## Remote Release 230 validation status

- Repository `main` contains Release 230 at `2cec1d02d81aa3251da131667fabd4d24a98147a`.
- The expected Release 230 implementation and manifest are present.
- A GitHub Pages run after the upload is visible.
- Custom Release 230 workflow conclusions were not available through the accessible status interface.
- The GitHub commit subject is still `Add files via upload`; the intended Release 230 title is in the description.

## Warnings

- Release 231 does not physically rewrite `data/site-routes.json`; the canonical overlay is the public-consumer contract.
- Only eight evidence-backed literature routes are covered.
- A failed boundary request intentionally falls back to historical labels rather than breaking navigation.
- Releases 228, 229 and 230 used the wrong GitHub commit-title field.

## Skipped locally

- Live custom-domain page execution.
- Real screen-reader and browser zoom testing.
- Installed-PWA service-worker update and offline testing.
- Release 231 GitHub Actions.
- Post-upload GitHub Pages deployment verification.

## Completion status

- **Package validation passed:** Yes
- **Repository upload verified:** No
- **GitHub Actions passed:** Not yet
- **Production deployment verified:** Not yet
- **Release complete:** No
