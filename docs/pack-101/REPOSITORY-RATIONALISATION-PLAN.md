# Pack 101 — Repository Inventory, Duplicate Cleanup and Workflow Rationalisation

## Audit baseline

- Total files: 217,503
- HTML routes: 4,006
- Workflows: 167
- Exact duplicate groups: 748
- Duplicate files beyond the first copy: 10,230
- Routes missing `<main>`: 230
- Routes missing viewport metadata: 226
- Routes missing descriptions: 1,653
- Push-triggered workflows: 7

## Safety policy

This pack does not delete production files automatically. It first creates deterministic cleanup plans, protects published routes and requires review before any destructive change.

## Execution phases

1. Classify duplicate groups into generated pack scaffolding, documentation, workflows, data and production assets.
2. Identify safe consolidation candidates without deleting canonical routes.
3. Generate HTML remediation lists for missing `<main>`, viewport and description metadata.
4. Inventory workflow trigger overlap and identify workflows suitable for manual-only execution.
5. Produce rollback manifests for every proposed change.
6. Apply cleanup through small reviewed changes with route and Pages validation.

## Initial focus

The audit shows repeated files under `assets/js/pack-*` among the largest duplicate groups. These are scaffolding candidates, not automatically safe deletions. Pack 101 will consolidate only after confirming no production HTML imports the duplicate paths.

## Exit criteria

- No broken production routes.
- No unexpected GitHub Pages deployment failures.
- Duplicate candidates classified.
- HTML remediation queues generated.
- Workflow rationalisation proposal generated.
- Every future deletion has a rollback manifest.
