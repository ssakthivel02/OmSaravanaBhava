# Production Release Checklist

- [ ] Work from a clean clone of the exact approved base SHA.
- [ ] Use one local Git transaction; do not upload an extracted archive.
- [ ] Verify exact staged path and status coverage.
- [ ] Confirm no tracked `__pycache__`, `.pyc` or retired consumer assets.
- [ ] Run production baseline, deployment, consumer, hygiene and integrity gates.
- [ ] Confirm exact commit subject and parent before push.
