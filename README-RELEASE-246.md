# Release 246 — Visual Recovery and Sacred Temple Experience

## Verified current baseline

- The repository's latest clearly identifiable implementation is Release 245.
- Release 245 introduced the premium hero and interaction layer.
- The live mobile result is visually weak because the SVG hero artwork renders as a simplified geometric figure and dominates the viewport.
- The metric cards appear before meaningful devotional content on small screens.
- Temple imagery is not sufficiently represented.
- Release numbers above 245 must not be treated as completed until their files and live routes are independently verified.

## Scope of this package

1. Replace the weak geometric hero with a layered sunrise, Murugan, Vel and temple composition.
2. Repair the mobile information hierarchy.
3. Add a usable responsive navigation menu.
4. Add real links for Thiruppugazh, temples, audio, timeline, knowledge graph and AI search.
5. Add a visual Sacred Collections section.
6. Replace the basic temples landing page with an Arupadai Veedu visual gateway.
7. Preserve reduced-motion support and keyboard navigation.
8. Use local WebP assets to avoid remote image dependencies.

## Upload order

Upload the package contents to the repository root, preserving directories:

- `index.html`
- `temples.html`
- `assets/css/release-246.css`
- `assets/js/release-246.js`
- `assets/images/*`
- `docs/RELEASE-246-VALIDATION.md`

Do not upload the outer ZIP folder itself.

## Mandatory validation

- Open the home page in a private browser window.
- Test iPhone width 390px and desktop width 1440px.
- Confirm Menu opens and closes.
- Confirm every visible CTA resolves to a published route.
- Confirm all six temple cards render.
- Confirm no horizontal scrolling.
- Confirm PageSpeed/Lighthouse has no critical accessibility error.
- Purge the Cloudflare cache after GitHub Pages deployment.
