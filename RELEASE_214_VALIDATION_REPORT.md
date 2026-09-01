# Release 214 — Navigation Information Architecture

## Baseline

- Repository base: Release 213
- Base commit: `f54e2b4eefeefb3fccd770a0493a23fee3bbfdf8`
- Release identity: `214`
- Repository-wide CI status: **pending upload and GitHub execution**

## Meaningful changes

- Adds a structured Explore gateway organised into 8 sections.
- Publishes 34 purpose-oriented module links.
- Supports browser-local text and audience filtering.
- Updates the homepage, platform hub and 404 recovery navigation.
- Adds `/explore.html` to the route directory and sitemap.
- Advances the service worker to Release 214.
- Aligns static-audit configuration, unit-test fixtures, workflow evidence names and production-smoke markers to Release 214.
- Corrects the stale production-smoke implementation that still checked Release 211 markers.

## Local package validation

- HTML structure and Tamil root language: PASS
- Canonical route: PASS
- Navigation JSON structure: PASS
- All navigation destinations represented by the current route directory: PASS
- Route directory uniqueness: PASS
- Sitemap includes Explore exactly once: PASS
- Service-worker release identity: PASS
- New assets present in optional precache: PASS
- JavaScript syntax: PASS
- Python syntax: PASS
- Existing validator unit tests: PASS
- ZIP integrity: PASS

## Evidence boundary

This report validates the release package and CI alignment files. It does not claim that
GitHub Actions, GitHub Pages deployment, browser rendering, responsive layout or production
service-worker activation passed.
