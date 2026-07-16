# Release 237 Validation Report

## Identity

- **Release:** 237
- **Title:** Explicit Effective Route Consumers and Final Tracked-Cache Cleanup
- **Base commit:** `dfc5ce53229d9af53a99fe9a089d5d29bb3ea9b5`
- **Required commit title:** `Release 237: migrate effective route consumers and finalise tracked-cache cleanup`
- **Changed files:** 138
- **Added:** 105
- **Modified:** 19
- **Deleted:** 14
- **Package files:** 429
- **Stable inventory records:** 421
- **Governance subset patch:** 6,071 lines

## Release 236 audit

Release 236 has the exact required subject and is exactly one commit above
Release 235. The current GitHub tree nevertheless still exposes a tracked
compiled Python cache file, and the available compare response does not contain
the declared cache deletions. Accessible status interfaces expose no completed
workflow records. The tracked-cache cleanup is therefore incomplete.

## Release 237 production scope

Release 237:

- deletes all thirteen tracked Python cache files;
- deletes the retired `assets/js/site-directory.js` consumer;
- adds `effective-route-registry.mjs`;
- migrates Content Status, Discovery and Site Directory to explicit loading;
- removes global Fetch API replacement from the compatibility helper;
- preserves the historical route registry and eight deterministic overrides;
- provides visible historical fallback if override loading fails;
- adds Node and Python policy enforcement;
- adds an Effective Route Consumers workflow;
- provides a fresh auto-clone publisher with exact staged-status verification.

## Validation

- JavaScript tests: **18/18 PASS**
- Python tests: **125/125 PASS**
- Workflow YAML: **5/5 PASS**
- Effective Route Consumers: **PASS, zero findings**
- Repository Hygiene: **PASS, zero violations**
- Repository Integrity: **PASS, zero violations**
- Synthetic staged coverage: **138/138 PASS**
- Synthetic deletions: **14/14 PASS**
- Synthetic exact commit subject: **PASS**
- Synthetic commit changed files: **138 PASS**
- Synthetic commit deletions: **14 PASS**
- No tracked Python cache after staging: **PASS**
- Patch applicability and reverse applicability: **PASS**
- Package governance and checksum ledger: **PASS**
- Extracted ZIP validation and byte equality: **PASS**
- GitHub Actions: **INCONCLUSIVE — no status records exposed**
- Independent attestation: **INCONCLUSIVE — no workflow runs exposed**

## Application method

Do not upload the ZIP through the GitHub browser. Run
`PUBLISH_RELEASE_237.cmd`. It creates a fresh clone, verifies the exact base,
applies the manifest change set, validates, commits and pushes.

## Production and data boundaries

The release changes consumer logic and explanatory page copy only. It does not
change devotional texts, `data/site-routes.json`,
`data/site-routes-effective-overrides.json`, browser-local storage keys,
analytics, tracking, service-worker behaviour or backend dependencies.
