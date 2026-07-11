# Release 148 Final Deployment Checklist

## Before committing

- Upload the extracted files to the repository root.
- Confirm there is no Release148, package, output or cleanup parent directory.
- Confirm `404.html`, `assets/css/osb44.css`, `assets/js/osb44.js` and `service-worker.js` are at their exact repository-relative paths.
- Confirm `manifest.json`, icons and devotional JSON content are not unexpectedly changed.
- Review the GitHub changed-file list against `RELEASE_148_CHANGED_FILES.txt`.

## Commit

Use the upper GitHub commit-title field:

`Release 148: complete production QA accessibility and performance hardening`

Commit directly to `main`.

## Post-deployment verification

1. Open the homepage in a private/incognito window.
2. Open `/404-test-route` and confirm the branded 404 page appears.
3. Test Home → Temple → Literature citation → Home.
4. Test local search with `Palani`, `Sashti` and `Thirumurugatruppadai`.
5. Test keyboard-only navigation and visible focus.
6. Test dark mode and text-size persistence.
7. In browser developer tools, verify the service worker reaches version 148.
8. Accept the update prompt and confirm the page reloads once.
9. Enable offline mode and open Home, a temple page, a sloka page and `offline.html`.
10. Confirm directory-review temple pages remain noindex and absent from the sitemap.
11. Submit `sitemap.xml` to the configured search-console property only after the production checks pass.

## Acceptance boundary

Release 148 closes the original 145–148 stabilization roadmap. Later work—complete Thiruppugazh digitisation, Skanda Purana graph, temple expansion, maps, Panchangam, advanced AI search and audio—must continue as separate releases after this baseline is accepted.
