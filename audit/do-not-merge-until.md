# Temporary Merge Gate

Do not merge new generic batches until all of the following are true:

- Root manifest is a valid PWA manifest.
- Service worker no longer deletes all caches.
- Placeholder content is excluded from public indexing.
- Static entity routes exist for published records.
- Sitemap is generated from real publishable routes.
- Search uses current published paths.
- Production smoke tests pass.
