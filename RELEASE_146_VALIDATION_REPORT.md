# OmSaravanaBhava Release 146 — PWA Repair Validation

- Baseline GitHub commit: `e08eb9ce7d45233dca859963d0ad61aef533de7d`
- Release: **146**
- Status: **PASS**
- Modified HTML pages: **24**
- Production files in package: **31**
- Precached URLs: **37**
- Extra parent folder: **No**

## Implemented

1. Replaced the invalid Batch 94 root manifest with a valid installable web-app manifest.
2. Replaced the cache-deleting service worker with versioned, scoped caching.
3. Added complete Release 145/145.1 route precaching.
4. Added network-first navigation with an offline fallback.
5. Added network-first JSON data caching and safe offline fallback.
6. Added stale-while-revalidate caching for CSS, JavaScript and image assets.
7. Added controlled cleanup limited to old `osb-` caches.
8. Added service-worker registration and an accessible update notification.
9. Added an offline page using the existing visual design system.
10. Added 192px, 512px and maskable PWA icons.
11. Added manifest, theme-colour and Apple touch-icon metadata to all 24 production pages.

## Validation issues

- None
