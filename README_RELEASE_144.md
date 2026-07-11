# OmSaravanaBhava Release 144

## Static Routes & Navigation Consolidation

Copy the contents of this package into the repository root.

### Replace these existing files
- `assets/js/osb44.js`
- `temple-details.html`
- `sloka-reader.html`
- `festival-details.html`

### Add these folders/files
- `temples/*.html`
- `slokas/*.html`
- `festivals/*.html`
- `data/routes-release-144.json`

### Behaviour
- Existing cards and search results now open stable static URLs.
- Old query-parameter links remain functional through redirect compatibility pages.
- Static pages contain breadcrumbs, canonical URLs, descriptions, and basic structured data.
- No completed colours, branding, navigation, or layout are redesigned.

### Important
The temple pages intentionally avoid publishing the old explicit “summary placeholder” wording as history. Source-backed enrichment remains a separate release.
