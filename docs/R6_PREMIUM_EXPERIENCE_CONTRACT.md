# OmSaravanaBhava R6 — Premium Sacred-Tech Experience Contract

This contract defines the quality bar for the native R6 website. It is an acceptance framework, not permission to invent devotional content or replace canonical source material.

## 1. Product identity

The site must feel unmistakably like **OmSaravanaBhava**, a premium Murugan devotional knowledge universe. It must not read like a renamed SaaS dashboard, a generic AI landing page, a template marketplace, or another project in the portfolio.

Primary experiential anchors:
- Vel-centric geometry and navigation cues used with restraint.
- Tamil-first devotional hierarchy, with high-quality multilingual support where qualified.
- Sacred luminosity, temple atmosphere and spatial depth without visual clutter.
- Arupadai Veedu / pilgrimage discovery presented as journeys rather than generic cards.
- Songs, Thiruppugazh, mantras and literature treated as readable devotional works, not content tiles.
- Sources, verification and publication state visible without overwhelming the devotional experience.

## 2. Visual language

### Required
- Strong, immediately recognizable OmSaravanaBhava masthead/identity.
- Clear display, reading and utility typography roles.
- Excellent Tamil shaping, line-height and long-form reading width.
- Responsive image art direction rather than one desktop crop stretched everywhere.
- Intentional depth through light, texture, geometry and motion—not excessive glass panels.
- Consistent spacing rhythm and component states.
- Elegant dark/light treatment only if both are intentionally designed and tested.

### Avoid
- Generic neon AI-dashboard appearance.
- Dense card grids as the dominant page grammar.
- Excessive gradients, particles, glows or animation competing with devotional text.
- Decorative Sanskrit/Tamil-like glyphs with no verified meaning.
- Reusing another project’s hero, nav, background, card or motion grammar.
- Fake documentary temple imagery or unlabeled AI art presented as factual evidence.

## 3. Homepage experience

The first viewport should communicate, without scrolling:
1. OmSaravanaBhava identity.
2. Murugan devotional purpose.
3. A clear primary exploration path.
4. A calm but premium visual moment.
5. Excellent mobile composition.

The homepage should then expose major journeys through differentiated editorial sections, not a uniform collection of identical cards.

Preferred journey hierarchy:
- Daily / immediate devotional entry.
- Murugan knowledge discovery.
- Temples and pilgrimage.
- Songs / Thiruppugazh / mantra practice.
- Source-aware learning and search.
- Family / accessibility / offline continuation where available.

## 4. Sacred text reading

Canonical devotional text is a first-class reading surface.

Required:
- Canonical Tamil visually separated from easy-reading, transliteration, meaning and commentary.
- No generated text visually indistinguishable from canonical source text.
- Stable reading position and comfortable line length.
- Copy/share controls must not alter the source text.
- Source/verification state accessible from the work without forcing users through technical metadata first.
- Audio/read-aloud provenance labeled clearly.
- No infinite-scroll pattern that makes a sacred work difficult to cite, resume or navigate.

## 5. Temple and pilgrimage experience

Temple pages should balance devotion, discovery and evidence.

Required:
- Temple identity and Murugan relationship clear.
- Official/source-linked facts separated from reviewed narrative and visitor guidance.
- Maps/locations only when verified.
- Documentary/official photography provenance retained where used.
- AI devotional illustration explicitly distinguished from documentary imagery.
- Arupadai Veedu experience should support both individual temple exploration and an understandable six-abode journey.

## 6. Search and knowledge discovery

Search must prioritize source-aware understanding over opaque AI output.

Required result distinctions where applicable:
- canonical/source record;
- reviewed editorial explanation;
- traditional account;
- generated reflection/assistant response;
- needs-review / unpublished state excluded from public results unless intentionally exposed as metadata.

Generated answers must cite or link the underlying governed records when claims depend on them.

## 7. Motion

Motion should feel ceremonial, spatial and meaningful.

Acceptable uses:
- subtle Vel/light reveal;
- section transitions that reinforce hierarchy;
- pilgrimage progression;
- responsive audio state;
- respectful micro-interactions.

Rules:
- no animation should delay access to devotional text;
- no essential meaning may depend on animation alone;
- reduced-motion mode must preserve hierarchy and function;
- continuous decorative animation must be limited and performance-tested.

## 8. Responsive quality

The website is mobile-first but not mobile-only.

Required qualification widths include at minimum:
- 320–375px narrow mobile;
- 390–430px modern mobile;
- 768–1024px tablet;
- 1280–1440px desktop;
- >=1920px wide desktop sanity check.

No clipped Tamil, inaccessible menus, horizontally overflowing reading surfaces, tiny audio controls or desktop-only interactions are acceptable.

## 9. Accessibility

Accessibility is part of premium quality.

Required baseline:
- semantic landmarks;
- keyboard-operable navigation and controls;
- visible focus;
- labeled buttons/inputs;
- meaningful alt treatment;
- sufficient contrast;
- reduced-motion support;
- logical heading order;
- zoom/reflow resilience;
- language/dir attributes correct for multilingual and Arabic RTL surfaces.

## 10. Performance

The experience must remain fast despite imagery/audio richness.

The authoritative numeric budget is `release/R6_PERFORMANCE_BUDGET.json`.

Design must prefer:
- responsive modern images;
- route/code splitting;
- lazy non-critical media;
- no audio/video in initial payload unless essential;
- controlled font loading;
- incremental data loading for large knowledge collections.

## 11. PWA and offline

Where R6 supports PWA/offline:
- install metadata must identify OmSaravanaBhava correctly;
- offline fallback must remain useful and branded;
- stale service workers must not trap users on broken releases;
- canonical source updates require predictable cache invalidation;
- offline state must be communicated rather than silently showing incomplete dynamic data.

## 12. Multilingual / RTL

A language selector is not proof of multilingual completion.

For every claimed release language, qualification must cover:
- navigation;
- major routes;
- persistence;
- mixed-script rendering;
- search behavior;
- metadata/hreflang;
- fallback behavior;
- content publication state.

Arabic additionally requires true RTL layout qualification. UI translation must never imply that sacred-source translation has been editorially verified when it has not.

## 13. Release acceptance

A visually impressive homepage alone cannot satisfy this contract.

R6 is eligible for owner release review only after:
- exact native source provenance passes;
- build and route gates pass;
- 52 unresolved asset references have governed dispositions;
- critical devotional journeys pass browser QA;
- accessibility, reduced-motion, PWA and performance gates pass;
- canonical/source/rights checks pass;
- cross-project contamination checks pass;
- evidence is tied to the exact candidate commit.

The target is a world-class experience. That means exceptional design **and** devotional integrity, technical reliability, accessibility, performance and evidence quality—not visual novelty alone.
