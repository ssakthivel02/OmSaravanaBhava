# Release 220 Validation Report

## Identity

- Release: **220**
- Feature: **Source-Controlled Knowledge Graph Explorer**
- Base commit: `76414c2834dd291d2432832cdc81f5f954137eac`
- Required commit title: `Release 220: add local knowledge graph explorer`

## Local package validation

- Required package files: **PASS**
- Graph-explorer JavaScript syntax: **PASS**
- Graph-explorer unit tests: **PASS**
- Python syntax: **PASS**
- JSON parsing: **PASS**
- Sitemap XML parsing: **PASS**
- Release overlay validator: **PASS**
- Patch application against Release 219: **PASS**
- SHA-256 manifest: **PASS**
- ZIP integrity: **PASS**

## Source-boundary validation

- Existing graph registers represented: **5**
- Explicit source-page entity nodes: **18**
- Explorer nodes including register nodes: **23**
- Explorer metadata relationships: **20**
- Known relationship totals reported by source pages: **27**
- Source registers without a published relationship total: **2**
- Phase 3 fabricated node records: **0**
- Phase 4 fabricated node records: **0**
- External graph libraries: **none**
- Remote graph or analytics services: **none**

The explorer distinguishes:

1. Domain-relationship totals reported by existing graph pages.
2. Metadata edges used only to navigate entities and source registers.

It does not claim that metadata edges are theological relationships.

## GitHub Actions validation

**NOT RUN.**

## Deployed production validation

**NOT RUN.**

Those checks can run only after the release is committed and GitHub Pages deploys it.
