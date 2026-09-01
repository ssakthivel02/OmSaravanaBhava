# Muththaiththaru Primary Evidence — Batch 04

Use this prompt with **one research system at a time**. Return evidence only. Do not reproduce the complete lyrics.

---

You are performing a primary-source verification audit for the Om Saravana Bhava Tamil devotional platform.

Subject:

- Tamil title: முத்தைத்தரு பத்தித் திருநகை
- Roman title: Muththaiththaru Pathi Thirunagai
- Author attribution: Arunagirinathar
- Corpus: Thiruppugazh
- Current internal ID: 0006
- Current source-specific number: 6

The current production number and Tamil text must not be changed.

A prior research report made claims about early printed editions, Arunagirinathar chronology, Tiruvannamalai hagiography, prosody, ragas and copyright. Many citations were weak, unresolved or secondary. Your task is to find stronger primary or institutional evidence.

## Evidence hierarchy

Use, in order:

1. Institutional scans of early printed books
2. National, university or specialist-library catalogues
3. Peer-reviewed or university-published scholarship
4. Government-supported Tamil academic resources
5. Official record-label or rights-holder catalogues
6. Reliable digital text indexes for numbering comparison

Do not use Wikipedia, Grokipedia, Scribd, generic blogs, lyrics sites or commercial book descriptions as final authority.

## Task A — Early print chronology

Verify or reject each claim:

- 1894 local fascicles
- 1895 consolidated edition at Madras Ripon Press
- 1901 structured edition at K.G.F. Press or Madras Standard Press
- page 4 in the claimed 1895 edition
- page 12 in the claimed 1901 edition
- catalogue identifiers `RMRL / UVSL-TB-1895-TP`, `RMRL-45982`, `UVSL-TB-1901-TP`
- archive identifiers `tiruppugazh_1895_vts` and `tiruppugazh_1901_vts_vol1`

For each witness return:

- exact title as printed
- editor/compiler
- publisher/printer
- place
- year
- volume/part
- page or song number for Muththaiththaru
- institutional catalogue ID
- stable scan URL
- whether the scan is directly viewable
- verification status

If no institutional record is found, mark the claim `NOT_VERIFIED`.

## Task B — Arunagirinathar chronology

Use page-level academic evidence to assess:

- possible date ranges for Arunagirinathar
- references to Praudhadevaraya in Thiruppugazh
- whether multiple rulers could bear that title
- whether the synchronism is historical, literary, legendary or disputed
- whether any evidence dates this exact song rather than the poet generally

Return competing scholarly positions, not one forced conclusion.

## Task C — Rescue narrative lineage

Trace separately:

- dissolute youth narrative
- sister episode
- suicide attempt from the Tiruvannamalai tower
- rescue by Murugan
- Vel inscription on the tongue
- Murugan dictating the opening phrase
- Muththaiththaru as the first-composed song

For each element provide:

- earliest traceable text
- author and date
- edition/page/stanza
- institutional scan or scholarly citation
- classification:
  - EARLY_TEXTUAL_WITNESS
  - SIXTEENTH_CENTURY_TEMPLE_PURANA
  - NINETEENTH_CENTURY_HAGIOGRAPHY
  - MODERN_DEVOTIONAL_RETELLING
  - NOT_VERIFIED

Do not state that `Arunachala Puranam` corroborates the full modern legend unless the exact passage is produced.

## Task D — Prosody

Verify the song-specific Chandam:

- தத்தத்தன தத்தத் தனதன

Find a specialist Tamil prosody or Thiruppugazh source that explicitly analyses this composition. A general citation to Tolkappiyam is insufficient unless the cited source performs the exact song-level scansion.

Return:

- source title
- author/editor
- publication year
- page/section
- exact analysis
- whether heavy/light mapping is explicit or inferred
- verification status

## Task E — Modern musical arrangements

Research each claimed arrangement separately:

1. 1964 film soundtrack
2. Shanmukhapriya claim
3. Hamsadhvani claim
4. Bouli claim

For each return:

- recording title
- performer
- composer/arranger
- film/album/concert
- year
- label/publisher/broadcaster
- catalogue or track ID
- official URL
- explicit raga evidence source
- current rights-holder evidence
- status:
  - VERIFIED_RECORDING_METADATA
  - VERIFIED_RAGA_ASSIGNMENT
  - RECORDING_VERIFIED_RAGA_UNVERIFIED
  - NOT_VERIFIED

The official Saregama catalogue may be used for the 1964 track metadata. Do not infer a raga from devotional convention or title association.

## Task F — Rights and reuse

Assess each layer separately:

- underlying literary text
- early print edition
- modern edition
- digital transcription
- transliteration
- translation
- commentary
- musical composition
- arrangement
- notation
- performance
- sound recording
- book scan
- photograph

For each return:

- jurisdiction
- relevant statutory section or licence
- author/owner/rights-holder
- term calculation inputs
- current status
- permitted use
- prohibited or uncertain use
- legal/rights-holder review required

Do not conclude that any layer is public domain worldwide.
Do not conclude that the 1964 recording is reusable merely from a date calculation.

## Required output

Return exactly one JSON object:

```json
{
  "researchStatus": "VERIFIED | PARTIALLY_VERIFIED | CONFLICT_REQUIRES_REVIEW | SOURCE_REQUIRED",
  "earlyPrintWitnesses": [],
  "chronologyPositions": [],
  "hagiographyWitnesses": [],
  "prosodyEvidence": [],
  "recordingAndRagaEvidence": [],
  "rightsLayers": [],
  "claimsVerified": [],
  "claimsRejected": [],
  "claimsStillUnresolved": [],
  "bibliography": [],
  "productionMetadataAllowed": [],
  "productionMetadataBlocked": [],
  "keepInternalId0006": true,
  "keepSourceSpecificNumber6": true,
  "keepPublishedTamilTextUnchanged": true,
  "humanReviewRequired": true
}
```

Return no prose before or after the JSON object.
