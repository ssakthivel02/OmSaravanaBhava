# Release 249C Rollback

1. Revert the Release 249C commit.
2. Remove `temple-experience.html`.
3. Remove Release 249C CSS, JavaScript, manifests and service worker.
4. Purge Cloudflare cache.
5. In browser developer tools, unregister `temple-experience-sw.js` if testing locally.
6. Confirm Releases 249A and 249B routes still work.
