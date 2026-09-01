OmSaravanaBhava - Next Safe Upload Package

Repository checked: https://github.com/ssakthivel02/OmSaravanaBhava
Current public repo is root-only static HTML/CSS/JS.
This package intentionally keeps the same root style:
- script.js at root
- styles.css at root
- data/ JSON folder added

Upload/replace these files at GitHub repository root:
1. script.js
2. styles.css
3. data/app_config.json
4. data/temples.json
5. data/festivals.json
6. data/slokas.json
7. data/panchangam.json

Do NOT upload Batch-47 to Batch-61 backend files yet.
The live repo does not currently have the required backend/modular structure.

Suggested commit message:
feat(static): add safe data layer and dynamic page enhancements

After upload test:
- Home page opens
- Temples page opens
- Slokas page opens
- Festivals page opens
- Mobile menu opens/closes
- Browser console has no red errors
