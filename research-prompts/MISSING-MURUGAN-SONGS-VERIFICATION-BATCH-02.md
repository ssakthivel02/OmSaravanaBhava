# Gemini / Manus Research Prompt — Missing Murugan Songs Verification Batch 02

Use this prompt with one title at a time. Do not combine multiple titles in one answer unless each item has completely separate evidence.

---

## Master instruction

You are assisting **Om Saravana Bhava**, a source-aware Tamil Lord Murugan devotional library.

Research the requested composition using primary or authoritative sources. Your task is **source identification and rights verification**, not lyric generation.

### Non-negotiable rules

1. Do not reconstruct, autocomplete or supply lyrics from memory.
2. Do not copy lyrics from lyrics websites, social media, YouTube descriptions, Scribd, Slideshare, mobile-app pages or unattributed blogs.
3. Do not assume that an old devotional subject makes a modern song public domain.
4. Treat literary text, printed edition, translation, notation, musical composition, arrangement, choreography and sound recording as separate rights layers.
5. Project Madurai availability alone is not proof that every work is public domain; record the exact distribution statement and whether it applies to the complete file or extracted text.
6. For film, album or modern devotional songs, return metadata only unless the rights holder provides explicit republication permission.
7. When two or more songs share a similar title, return `IDENTITY_AMBIGUOUS` and list the distinguishing evidence required.
8. Every factual field must include a source URL and quoted or paraphrased evidence location.
9. Prefer, in this order:
   - official author/estate/archive page;
   - publisher or record-label catalogue;
   - original film/album credits or library catalogue;
   - government, university or established digital-text repository;
   - scholarly publication.
10. When evidence is inadequate, return `SOURCE_REQUIRED`. That is a valid result.

---

## Requested title

```text
Tamil title: [INSERT ONE TITLE]
English/transliterated title: [INSERT TITLE]
Known first line or refrain: [INSERT OR LEAVE BLANK]
Known singer/recording: [INSERT OR LEAVE BLANK]
Approximate year/era: [INSERT OR LEAVE BLANK]
User-supplied audio, image or URL: [INSERT OR LEAVE BLANK]
```

---

## Required JSON output

Return exactly one JSON object:

```json
{
  "researchStatus": "VERIFIED_METADATA | SOURCE_REQUIRED | IDENTITY_AMBIGUOUS | PERMISSION_REQUIRED",
  "identity": {
    "canonicalTamilTitle": "",
    "canonicalEnglishTitle": "",
    "alternateTamilTitles": [],
    "alternateRomanTitles": [],
    "incipitTamil": "metadata-only; do not include protected lyrics",
    "workType": "thiruppugazh | classical-literary | carnatic-composition | temple-tradition | folk | film-song | album-song | bhajan | mantra | unknown",
    "distinguishingNotes": ""
  },
  "credits": {
    "lyricist": {
      "name": "",
      "verificationStatus": "verified | traditional-attribution | disputed | source-required",
      "evidenceUrl": "",
      "evidenceNote": ""
    },
    "composer": {
      "name": "",
      "verificationStatus": "verified | disputed | source-required",
      "evidenceUrl": "",
      "evidenceNote": ""
    },
    "performers": [],
    "filmOrAlbum": "",
    "recordLabelOrPublisher": "",
    "releaseYear": null,
    "raga": "",
    "tala": ""
  },
  "source": {
    "primaryOrAuthoritativeUrls": [],
    "editionTitle": "",
    "publisher": "",
    "publicationYear": null,
    "pageOrSection": "",
    "catalogueOrReleaseNumber": "",
    "sourceQuality": "primary | official-rights-holder | authoritative-secondary | weak-secondary | unknown",
    "conflicts": [],
    "missingEvidence": []
  },
  "rights": {
    "underlyingTextStatus": "public-domain | licensed | permission-confirmed | quotation-only | permission-required | unknown",
    "editionStatus": "public-domain | licensed | permission-confirmed | permission-required | unknown",
    "translationStatus": "not-requested | original-site-summary-only | licensed | permission-required | unknown",
    "musicalCompositionStatus": "public-domain | licensed | permission-confirmed | permission-required | unknown",
    "soundRecordingStatus": "owned | licensed | permission-confirmed | permission-required | unknown",
    "fullTamilLyricsMayBeRepublished": false,
    "audioMayBeHosted": false,
    "rightsHolder": "",
    "permissionContactOrOfficialPage": "",
    "rightsEvidence": ""
  },
  "publicationRecommendation": {
    "recommendedStatus": "source-required | metadata-only | partial-reviewed | published-source-linked | withheld-rights-review",
    "allowedNow": [],
    "withhold": [],
    "humanReviewRequired": true,
    "nextAction": ""
  },
  "confidence": {
    "level": "high | medium | low",
    "rationale": ""
  }
}
```

Do not return lyric bodies. A title or opening phrase may appear only when necessary to disambiguate identity and when supported by an authoritative source.

---

## Batch A — exact identity required

Run the master prompt separately for each title below. Include an audio/source clue whenever possible.

1. **ஆறுமுக மங்களத்தை — Aarumuga Mangalathai**
   - Current status: `IDENTITY_AMBIGUOUS`
   - Needed: exact opening line, singer/recording, album or printed source.

2. **முருகா முருகா என்றால் — Muruga Muruga Endral**
   - Current status: `SOURCE_REQUIRED`
   - Needed: authoritative lyricist/composer and original publication/recording.

3. **கந்தன் கருணை புரிவான் — Kandhan Karunai Purivaan**
   - Current status: `SOURCE_REQUIRED`
   - Needed: exact title spelling, first line, singer, album/film and credits.

4. **சின்ன சின்ன முருகா — Chinna Chinna Muruga**
   - Current status: `IDENTITY_AMBIGUOUS`
   - Warning: multiple distinct bhajans and recordings use similar titles.
   - Needed: first four lines or exact audio link.

5. **வடிவேல் முருகனுக்கு அரோகரா — Vadivel Muruganukku Arohara**
   - Current status: `IDENTITY_AMBIGUOUS`
   - Warning: this may be a refrain or devotional slogan rather than a standalone canonical title.
   - Needed: surrounding text or recording.

6. **பழனி மலை வாசா — Palani Malai Vaasa**
   - Current status: `SOURCE_REQUIRED`
   - Needed: exact recording, performer, label, year and credits.

---

## Batch B — metadata and rights confirmation

Do not request lyrics. Confirm official credits and rights only.

1. **மருதமலை மாமணியே — Maruthamalai Maamaniye**
   - Candidate: film `Dheivam`, Kannadasan, Kunnakudi Vaidyanathan, Madurai Somasundaram, 1972.
   - Verify against original rights-holder catalogue and release metadata.

2. **பழம் நீயப்பா — Pazham Neeyappa**
   - Candidate: film `Thiruvilaiyadal`, Kannadasan, K. V. Mahadevan, K. B. Sundarambal, 1965.
   - Verify against original label/film credits.

3. **குன்றத்திலே குமரனுக்கு — Kundrathile Kumaranukku**
   - Candidate: film `Dheivam`, Kannadasan, Kunnakudi Vaidyanathan, Bangalore A. R. Ramani Ammal, 1972.

4. **திருச்செந்தூரில் போர் புரிந்து — Thiruchenduril Por Purindhu**
   - Candidate: film `Dheivam`; the commercial catalogue may use a shortened title.
   - Verify the exact canonical commercial title from original label artwork or catalogue.

5. **அழகென்ற சொல்லுக்கு முருகா — Azhagendra Sollukku Muruga**
   - Needed: original album, lyricist, composer, singer, label and release year from a rights-holder source.

6. **கற்பனை என்றாலும் — Karpanai Endralum**
   - Candidate attribution: Vaalee as lyricist.
   - Needed: original label credits, composer, performer, album and release year.

7. **செந்தில் ஆண்டவன் — Senthil Andavan**
   - Candidate: Papanasam Sivan Carnatic composition.
   - Needed: exact incipit, authoritative composition catalogue, raga, tala, edition and literary-rights status.

---

## Batch C — source-controlled classical ingestion

### கைத்தல நிறைகனி — Kaithala Niraikani

Known lead: Project Madurai Thiruppugazh Part I identifies this as song 1, a Vinayagar invocation attributed to Arunagirinathar.

Required work:

1. Compare the Project Madurai record with the repository's uploaded 2,191-page Thiruppugazh compilation.
2. Confirm song number, canonical title, venue/category, metre/rhythm heading and exact Tamil lineation.
3. Record all textual variants; do not silently merge them.
4. Document Project Madurai file-distribution conditions.
5. Recommend whether the repository should publish:
   - source-register metadata only;
   - a partial reviewed extract; or
   - a complete source-linked song after Tamil proofreading and rights review.
6. Do not generate easy-reading Tamil until the canonical Tamil text is approved.

---

## Batch D — permission research

### உள்ளம் உருகுதடா / உள்ளம் உருகுதையா முருகா

Official lead: Andavan Pichai archive.

Request written permission separately for:

- full Tamil lyrics;
- easy-reading Tamil;
- transliteration;
- original-site English/Tamil summary;
- musical notation and Raga Attana tune references;
- audio streaming or download;
- cover artwork or photographs.

### நீ மனமிரங்கி வந்தருள்வாய்

Official lead: Andavan Pichai archive.

Request separate permission for:

- lyrics associated with Andavan Pichai and Kamakshi Kuppuswamy;
- Kamakshi Kuppuswamy's musical composition;
- notation and swara patterns;
- choreography/abhinaya material;
- the 1995 recording and later performances;
- translation and explanatory excerpts.

Until written permission is stored, both records remain `metadata-only` and `withheld-rights-review`.
