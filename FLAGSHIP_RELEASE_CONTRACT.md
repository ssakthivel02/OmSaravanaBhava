# OmSaravanaBhava Flagship Release Contract

## Scope
This repository is the clean next-generation flagship. `ssakthivel02/kandan-legacy` remains the independent legacy production site.

## Hard gates before production
1. Exact-head build and type-check PASS.
2. Responsive desktop/tablet/mobile navigation PASS.
3. Direct-route and 404 fallback PASS.
4. Accessibility baseline: landmarks, focus, keyboard, reduced-motion, labels and contrast reviewed.
5. PWA manifest, service worker and offline fallback validated.
6. Canonical URL, title, OpenGraph, robots, sitemap and structured metadata validated.
7. No unverified devotional promises or fabricated scriptural quotations.
8. AI/guidance outputs visibly separate source text, editorial meaning, interpretation and generated reflection.
9. No wildcard DNS/CORS; no secrets in browser or repository.
10. Rollback commit and legacy Kandan production remain available.
11. GitHub Pages deployment PASS before custom-domain cutover.
12. Live HTTPS smoke PASS after cutover.

## Target production domain
`https://omsaravanabhava.org/`

The domain must not be assigned to this repo until the release branch is green and the owner performs the required Pages/DNS handoff.
