# Pack 101 — Full Reachability and Murugan Song Inventory

This is a non-destructive audit. No production file was deleted or modified.

- Total repository files scanned: **217530**
- Public-file candidates: **200528**
- HTML routes: **4006**
- Reachable files from principal hubs: **346**
- Registry-mapped files: **116**
- Sitemap-mapped files: **0**
- Unmapped public candidates: **200180**
- Unreachable HTML candidates: **3878**
- Unresolved local references: **2387**
- Murugan song candidate files: **5090**
- Popular-song entries found: **6/19**
- Duplicate groups containing at least one mapped file: **5**

## Required architecture

`Home → Platform/Directory Hub → Song Library → Collection → Song Detail`

A file does not need a direct homepage link to be valid. It must be reachable through a governed hub, route registry, search index, sitemap, or runtime data reference.

## Next safe action

Review the unmapped and song-coverage reports, then create links only through collection hubs and the canonical route registry. Do not delete duplicate files until mapped duplicates are separated from genuinely unused copies.
