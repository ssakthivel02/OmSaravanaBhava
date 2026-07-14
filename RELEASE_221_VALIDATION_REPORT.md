# Release 221 Validation Report

## Identity

- Release: **221**
- Feature: **Static Platform Maintenance Centre**
- Base commit: `a3bebc4f28059e0147d9ddcb8cfa3372b36b2ebb`
- Required commit title: `Release 221: add static platform maintenance centre`

## Local package validation

- Required package files: **PASS**
- Maintenance JavaScript syntax: **PASS**
- Maintenance unit tests: **PASS**
- Python syntax: **PASS**
- JSON parsing: **PASS**
- Sitemap XML parsing: **PASS**
- Release overlay validation: **PASS**
- Patch application against corrected Release 220: **PASS**
- SHA-256 manifest: **PASS**
- ZIP integrity: **PASS**

## Operational boundaries checked locally

- Eight same-origin release checks are defined.
- Critical routes are audited independently.
- Required files are derived from the deployed static-audit configuration.
- One missing route or file does not stop the remaining checks.
- Service-worker update checks do not force a repository change.
- Cache cleanup is restricted to `osb-runtime-v*` and `osb-data-v*`.
- Static shell caches are not classified as transient.
- Reading-list, accessibility and audio-history storage keys are explicitly protected.
- No analytics, remote maintenance service or server account was added.
- The page states that it cannot prove GitHub Actions status.
- The page does not claim production certification.

## GitHub Actions validation

**NOT RUN.**

## Deployed production validation

**NOT RUN.**

These checks can run only after the package is committed and GitHub Pages deploys it.
