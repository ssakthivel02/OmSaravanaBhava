# Phase F — Uploaded Murugan Research Review

Generated: 2026-07-22

## Outcome

Four uploaded research files were reviewed as evidence intake:

- `kaumara_digital_repository_archival_framework(1).html`
- `Murugan Devotional Song Research.docx`
- `kaumara_hymnal_archive.html`
- `Murugan Songs Metadata Research.docx`

No uploaded HTML file was copied directly into the production site. No attachment-derived lyric body or audio file was published.

## Why the HTML dashboards were not deployed directly

- They load Tailwind CSS and Chart.js from third-party CDNs rather than the controlled production asset pipeline.
- Their charts use estimated or illustrative values that are not backed by repository evidence.
- Some historical dates and public-domain conclusions are broader than the cited sources support.
- They mix source evidence, interpretation, rights conclusions and lyrics inside one client-side data object.
- They lack the repository's canonical/easy-Tamil/transliteration/meaning/audio/source separation.

The useful parts were converted into governed research records instead.

## Five attachment-derived song decisions

### 1. Kanda Sashti Kavasam

- Existing repository record retained.
- No duplicate song or route created.
- Project Madurai PM0034_02 accepted as an external digital witness.
- The attachment's 16th-century date was not accepted without an edition-level historical source.
- Full attachment lyrics were not imported.
- Existing publication remains `partial-reviewed`.

### 2. Skanda Guru Kavasam

- Existing repository record retained.
- No duplicate song or route created.
- Project Madurai PM0034_03 accepted for the authorship heading, Raga Nattai heading and file-level distribution conditions.
- Project Madurai availability was not converted into an unrestricted public-domain claim.
- Existing publication remains `partial-reviewed`.

### 3. Muththaiththaru

- Existing source-linked Thiruppugazh record remains canonical.
- Attachment commentary, translation and transliteration were not imported.
- The next safe enhancement is human-reviewed easy-reading Tamil and a documented transliteration generated from the repository's canonical Tamil source.

### 4. Ullam Uruguthada / Ullam Uruguthaiya Muruga

- New research identity recorded as metadata only.
- Official Andavan Pichai archive accepted for authorship, the 1952 context, Raga Attana and rights control.
- Lyrics, translation, notation, tune and recordings remain withheld pending written permission.

### 5. Nee Manamirangi Vandarulvai

- New research identity recorded as metadata only.
- Official Andavan Pichai archive accepted for lyric/music credits, Raga Lathangi, Adi tala and the 1995 recording context.
- Lyrics, notation, choreography and audio remain withheld pending separate permissions.

## Popular-song list reconciliation

The 14 previously missing popular titles were triaged into four controlled groups:

1. **Source identified, not yet ingested**
   - Kaithala Niraikani — identified as Thiruppugazh song 1, Vinayagar invocation.

2. **Modern commercial metadata only**
   - Maruthamalai Maamaniye
   - Pazham Neeyappa
   - Kundrathile Kumaranukku
   - Thiruchenduril Por Purindhu
   - Azhagendra Sollukku Muruga
   - Karpanai Endralum

3. **Classical composition requiring exact identity and rights review**
   - Senthil Andavan

4. **Ambiguous or still source required**
   - Aarumuga Mangalathai
   - Muruga Muruga Endral
   - Kandhan Karunai Purivaan
   - Chinna Chinna Muruga
   - Vadivel Muruganukku Arohara
   - Palani Malai Vaasa

The detailed machine-readable decisions are stored in:

- `data/research-intake/attachment-song-evidence-2026-07-22.json`
- `data/research-intake/popular-song-triage-2026-07-22.json`

## Publication safety boundary

- A title match is not proof of canonical text.
- A digital source is not automatically a legal permission for extracted republication.
- The underlying literary text, modern edition, translation, notation, arrangement and sound recording require separate rights decisions.
- Film and album songs are metadata-only until the rights holder permits additional use.
- Ambiguous titles require an exact incipit or recording before a canonical identity is assigned.
- No generated or reconstructed lyrics are accepted.

## Next controlled action

Collect the exact source and rights fields requested in `research-prompts/MISSING-MURUGAN-SONGS-VERIFICATION-BATCH-02.md`. Each returned item must undergo source, Tamil proofreading and rights review before canonical ingestion.
