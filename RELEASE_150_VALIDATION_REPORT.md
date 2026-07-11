# OmSaravanaBhava Release 150 — Premium Typography and Tamil Read-Aloud

- Baseline GitHub commit: `7b656954f1a730ceee8591668c4be7307cc43d78`
- Release: **150**
- Validation status: **PASS**
- Production files: **46**
- HTML pages inspected: **39**
- Requested audio-library works catalogued: **14**
- Requested works with verified Tamil device read-aloud now: **3**
- Verified devotional pages with read-aloud controls: **14**
- Third-party audio binaries bundled: **0**
- Extra ZIP parent folder: **No**

## Confirmed test findings addressed

1. The Sources-page brand/home navigation is standardised to an explicit `index.html` route.
2. All production brand links now use an explicit root or parent-relative `index.html`.
3. Tamil typography now uses a Windows-safe and cross-platform fallback stack.
4. Body, card, navigation and verse typography have a stronger responsive scale.
5. The audio page is now a usable, indexable Tamil read-aloud catalogue rather than an empty audio element.
6. Ten verified Thiruppugazh songs and four published sloka/mantra pages have accessible play, pause and stop controls.

## Audio rights boundary

The text of an old hymn and a modern performance recording are legally separate. This package does not download, re-host or hotlink a commercial recording. It uses the browser's installed Tamil speech voice for verified text and records which works still require an owned or explicitly licensed recording.

## Browser zoom warning

The supplied screenshots show browser zoom values of approximately 50–60 percent on several pages. This is outside website CSS control. Use `Ctrl+0` to return the browser to 100 percent before judging the final typography.

## Issues

- None

## Warnings

- Several user screenshots were captured at 50–60% browser zoom; use Ctrl+0 for 100% during visual QA.
- No third-party or commercial MP3 is bundled. Device speech synthesis quality depends on the installed Tamil voice.
