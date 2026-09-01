# Temple Encyclopedia Architecture

## Data layer
Each temple has one file under `data/temples/<id>.json`.
The browser uses `data/temples/index.json`.
The schema is stored in `data/schemas/temple.schema.json`.

## Presentation layer
- `temple-encyclopedia.html`: searchable browser
- `temple-detail.html`: reusable detail template
- Component CSS files under `assets/css/components`

## Runtime layer
- Core data loading and state
- Reusable render components
- Search and pilgrimage features
- SEO and navigation helpers

## Extension model
Future temples should be added by:
1. Creating one JSON record
2. Adding a compact record to the index
3. Adding verified local images
4. Running schema and route validation
