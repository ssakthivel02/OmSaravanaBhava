# Release 238 Validation Report

## Identity

- **Release:** 238
- **Transaction base:** `b7bc25a3888f5bbe4a55a55ba69fd05ac3cc8e60`
- **Bootstrap title:** `Bootstrap Release 238: install browser-safe finalizer and deployment conformance`
- **Final title:** `Release 238: reconcile repository state and enforce deployment conformance`
- **Bootstrap changed files:** 97
- **Finalizer changed files:** 18
- **Finalizer deletions:** 14
- **Package files:** 499
- **Static inventory records:** 490
- **Bootstrap patch:** 2,884 lines

## Release 237 audit

Release 237 has the correct title and parent, but the current repository still
tracks a compiled Python cache file and the retired non-module Site Directory
script. The available compare response contains no deletion entries, and no
workflow status records are exposed. Release 237 is therefore functionally
advanced but incomplete for repository cleanup.

## Release 238 design

Release 238 uses a two-stage transaction compatible with GitHub browser upload:

1. The bootstrap commit installs the transaction finalizer, deployment
   conformance controls, Release 238 service worker and all supporting tests.
2. The finalizer removes fourteen tracked paths, rewrites governance metadata to
   the actual bootstrap SHA, regenerates checksums, validates the final state and
   creates the exact final Release 238 commit.

## Deployment improvements

- Service-worker cache identity advances from 228 to 238.
- Focused core and route-consumer precaching replaces the stale oversized list.
- The explicit effective route registry and three public consumers are precached.
- The retired `assets/js/site-directory.js` path is forbidden.
- Global Fetch API replacement remains forbidden.
- Navigation uses network-first behaviour.
- Route data uses network-first with bounded data caching.
- Runtime assets use stale-while-revalidate.

## Validation

- JavaScript tests: **18/18 PASS**
- Python tests: **142/142 PASS**
- Workflow YAML: **7/7 PASS**
- Deployment Conformance: **PASS, zero findings**
- Bootstrap patch applicability/reverse applicability: **PASS**
- Bootstrap changed-file simulation: **97/97 PASS**
- Finalizer changed-file simulation: **18/18 PASS**
- Finalizer deletions: **14/14 PASS**
- Final strict governance: **PASS**
- Final transaction validation: **PASS**
- Remote automatic finalization: **NOT_RUN**

## Completion boundary

The bootstrap commit alone is not Release 238 completion. Completion requires
the exact final title, a parent equal to the bootstrap SHA, zero planned
deletion targets, service-worker cache release 238 and the generated
`RELEASE_238_FINALIZATION_RESULT.json`.
