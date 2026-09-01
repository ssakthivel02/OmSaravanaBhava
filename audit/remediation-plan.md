# Remediation Plan

## Batch 144
- Inventory real published temple, sloka, and festival records.
- Generate stable static HTML routes.
- Add breadcrumbs and related-content links.
- Preserve existing visual design.
- Keep query-parameter pages only as compatibility aliases.

## Batch 145
- Build canonical URLs from real routes.
- Rebuild sitemap from publishable pages.
- Add page-specific titles, descriptions, and JSON-LD.
- Exclude draft and placeholder content from indexation.

## Batch 146
- Replace the root manifest with a valid PWA manifest.
- Replace the destructive service worker.
- Add explicit cache versioning and offline fallback.
- Remove stale hard-coded `v=44` behaviour.

## Batch 147
- Add `draft`, `reviewed`, and `published` content states.
- Expose only reviewed records to navigation, search, sitemap, and PWA cache.
- Link claims to source and review records.

## Batch 148
- Run route, JSON, link, PWA, accessibility, SEO, and user-journey tests.
- Produce a clean deployable ZIP and a factual pass/fail report.
