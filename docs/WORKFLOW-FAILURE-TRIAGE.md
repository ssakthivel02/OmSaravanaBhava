# Workflow Failure Triage

1. Confirm `pages-build-deployment` status first.
2. Open the failing workflow and inspect the first failed step.
3. Separate deployment failures from optional quality-check failures.
4. Do not ignore repeated failures indefinitely: disable obsolete workflows or repair their assumptions.
5. Keep this Release 250C workflow additive until older workflows are audited.
