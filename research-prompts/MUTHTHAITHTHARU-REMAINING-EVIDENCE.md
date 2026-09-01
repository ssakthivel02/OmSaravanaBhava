# Muththaiththaru — Remaining Evidence Collection Prompt

Use this prompt with Gemini, Manus or another research assistant. Research one section at a time and return source-linked evidence only.

## Subject

- Tamil title: `முத்தைத்தரு பத்தித் திருநகை`
- Short title: `முத்தைத்தரு`
- Roman title: `Muththaiththaru Pathi Thirunagai`
- Author attribution: Arunagirinathar
- Corpus: Thiruppugazh
- Current Om Saravana Bhava internal ID: `0006`
- Current source-specific number: `6`

## Already accepted

1. The current uploaded source identifies the work as `பாடல் 6 (நூல்)`.
2. Sivaya identifies it as sequence 6 and displays the Chandam opening.
3. Tamil Virtual Academy states that `கைத்தலம் நிறைகனி` appears first among special introductory verses and that `முத்தைத்தரு` is placed at the beginning of the main book.
4. The production ID, number and Tamil text must not be overwritten.
5. Traditional hagiography must be labelled as tradition, not independent historical proof.
6. India-specific statutory research must not be converted into a universal international public-domain conclusion.

## Remaining research tasks

Research only the following unresolved areas.

### A. Early print chronology

Find the earliest accessible printed edition containing Muththaiththaru.

Return:

- exact edition title
- editor/compiler
- publisher and place
- year printed
- volume
- page or song number
- library catalogue identifier
- scan URL
- title and number as printed
- whether introductory verses are counted
- evidence distinguishing 1894, 1895 and 1901 claims

Preferred evidence:

- national or university library catalogue
- Internet Archive or institutional scan
- WorldCat/union catalogue record
- publisher catalogue or scholarly bibliography

Do not use Wikipedia as the final authority.

### B. Arunagirinathar chronology and Deva Raya references

Verify the most defensible date range for Arunagirinathar and identify the textual or epigraphic evidence connecting him with Deva Raya II.

Return:

- scholar and publication
- publisher or journal
- year
- page number
- exact evidence summary
- whether the date applies to the poet generally or to this composition specifically
- competing scholarly views
- confidence: high, medium or low

Do not infer the date of this exact song merely from the poet's approximate lifetime.

### C. Hagiography classification

Research the earliest traceable source for the Tiruvannamalai rescue and divine-opening-phrase narrative.

Return:

- source title
- author/compiler
- date
- page/section
- whether the account is hagiography, oral tradition, later biography or independently corroborated history
- exact wording summary without copying protected modern prose

Use one of these labels:

- `TRADITIONAL_HAGIOGRAPHY`
- `LATER_BIOGRAPHICAL_TRADITION`
- `SCHOLARLY_INTERPRETATION`
- `HISTORICALLY_CORROBORATED`
- `SOURCE_REQUIRED`

### D. Edition-numbering comparison

Find every reliable edition or index that assigns a number or structural position to Muththaiththaru.

For each witness return:

- edition/index name
- editor/institution
- year
- number assigned
- section heading
- whether introductory Vinayagar verses are counted
- relationship to `கைத்தலம் நிறைகனி`
- URL or page
- source quality

Do not recommend renumbering the Om Saravana Bhava record.

### E. Prosody

Find an authoritative Tamil prosody or Thiruppugazh source for the Chandam:

`தத்தத்தன தத்தத் தனதன`

Return:

- exact notation
- source title
- author/editor
- publication year
- page/section
- explanation of what is textually encoded versus later performance practice

Do not call the rhythm an infallible cryptographic checksum unless a scholarly source explicitly supports that analogy.

### F. Modern musical arrangements

Research Bouli, Hamsadhvani and Shanmukhapriya separately.

For each claimed raga return:

- identifiable performer or arranger
- album/concert/publication
- release year
- label or publisher
- track/catalogue identifier
- rights holder
- authoritative source
- status: `VERIFIED_MODERN_ARRANGEMENT` or `UNVERIFIED`

Do not treat a commonly repeated raga name as part of the original literary work.

### G. Rights layers

Review separately:

- underlying literary text
- early printed edition
- modern edited edition
- digital transcription
- easy-reading Tamil
- transliteration
- translation
- commentary
- musical composition
- modern arrangement
- notation
- performance
- sound recording
- image or scan

For each layer return:

- jurisdiction reviewed
- legal or licence basis
- current status
- source/rights holder
- allowed uses
- withheld uses
- whether written permission is required
- whether human/legal review remains required

Human/legal review must remain `true` for publication decisions.

## Required output

Return exactly one JSON object:

```json
{
  "researchStatus": "PARTIALLY_VERIFIED | VERIFIED | CONFLICT_REQUIRES_REVIEW | SOURCE_REQUIRED",
  "earlyPrintChronology": [],
  "historicalDating": [],
  "hagiographySources": [],
  "numberingWitnesses": [],
  "prosodyEvidence": [],
  "modernArrangementEvidence": [],
  "rightsLayers": [],
  "bibliography": [],
  "supportedMetadataChanges": [],
  "blockedMetadataChanges": [],
  "humanReviewRequired": true,
  "remainingUnknowns": []
}
```

## Prohibited outputs

- complete lyrics
- copied modern translations or commentary
- fabricated confidence percentages
- unqualified global public-domain claims
- recommendation to change internal ID `0006`
- recommendation to change source-specific number `6`
- unsupported claims that devotional tradition is proven history
