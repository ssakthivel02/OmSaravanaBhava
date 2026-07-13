# OmSaravanaBhava Release 152 — Premium Read-Aloud Player and Media Session

- Baseline GitHub commit: `8d0ee72942b1949ae63f3c78565859c3a76aac97`
- Release: **152**
- Validation status: **FAIL**
- Production files: **7**
- Verified queue items: **14**
- Mantra/Kavasam items: **4**
- Thiruppugazh items: **10**
- Third-party audio files: **0**
- External CDN dependencies: **0**
- Extra ZIP parent folder: **No**

## Implemented

1. Added a normalized 14-item verified-text playlist.
2. Added a persistent responsive player with Play/Pause, Stop, Previous and Next.
3. Added Tamil voice selection and four reading-speed options.
4. Added optional continue-to-next behavior; disabled by default.
5. Added local preference persistence without automatic playback.
6. Added chunked speech output for longer Thiruppugazh texts.
7. Added Media Session metadata and supported hardware-control handlers.
8. Added direct links back to every source text.
9. Reworked requested-work cards to use the common player.
10. Added offline caching for the playlist and player script.

## Deliberate exclusions

- No fake duration, progress bar, waveform or quality badge.
- No seek controls because device text-to-speech has no reliable time-position model.
- No autoplay.
- No Tailwind, Chart.js, Google Fonts or other external CDN.
- No commercial, YouTube or third-party recording.
- No claim of universal dashboard or headset compatibility.

## Issues

- Audio page contains simulated progress or Hi-Fi claims

## Warnings

- Media Session controls are progressive enhancement and depend on browser and operating-system support.
- Speech synthesis has no reliable duration or seek model, so Release 152 deliberately exposes no progress bar or seek controls.
- Voice quality depends on the Tamil speech voice installed on the visitor's device.
