# Release upload checklist

- [ ] Current main HEAD matches manifest base_commit.
- [ ] ZIP checksum matches the supplied value.
- [ ] Hidden `.github` directory is visible.
- [ ] Contents—not the outer folder—are selected for upload.
- [ ] No unexpected deletion is shown.
- [ ] Preferred: exact title is entered in the small upper subject field.
- [ ] Browser fallback: exact title is the first non-empty description line.
- [ ] No explanatory text appears before the fallback title.
- [ ] Governance workflow overall status is PASS.
- [ ] Commit metadata is reviewed as PASS or WARN.
- [ ] Attestation artifact is downloaded and retained.
- [ ] GitHub Pages is checked separately when production files changed.
- [ ] Production checks use precise status language.

- [ ] Effective route-registry drift validation passes.
- [ ] Override records remain sorted and evidence-backed.
- [ ] Historical `data/site-routes.json` remains unmodified.

- [ ] Repository Hygiene workflow passes with zero violations.
- [ ] No `__pycache__`, `.pyc`, build, artifact or temporary extraction path is tracked.
- [ ] Release 235 is applied through local Git because browser upload cannot delete tracked files.
- [ ] Thirteen cache deletions appear in the commit.

- [ ] Release 236 is applied through `APPLY_RELEASE_236.cmd`, PowerShell or Bash.
- [ ] The exact base SHA is `d06aa0d99315344ad2c23ee3a1d98fb635f33b16`.
- [ ] Exactly thirteen tracked `.pyc` paths are deleted.
- [ ] Repository Hygiene and Repository Integrity both pass with zero violations.
- [ ] The release commit subject exactly matches the Release 236 title.

- [ ] Release 237 is published with the auto-clone publisher, not GitHub browser upload.
- [ ] Fresh-clone base is exactly `dfc5ce53229d9af53a99fe9a089d5d29bb3ea9b5`.
- [ ] All thirteen tracked Python caches and `assets/js/site-directory.js` are deleted.
- [ ] Content Status, Discovery and Site Directory import the explicit registry loader.
- [ ] No route-consumer source assigns `globalThis.fetch` or `window.fetch`.
- [ ] JavaScript, Python, hygiene, integrity and effective-consumer gates all pass.
- [ ] Staged changed-file count and status exactly match `manifest-release-237.json`.

- [ ] Upload Release 238 with the exact bootstrap title, not the final title.
- [ ] Confirm Actions workflow permissions allow `contents: write`.
- [ ] Confirm `Release 238 Finalizer` starts after the bootstrap upload.
- [ ] Confirm the final commit title is exact and its parent is the bootstrap SHA.
- [ ] Confirm all thirteen `.pyc` files and `assets/js/site-directory.js` are deleted.
- [ ] Confirm service-worker cache release is 238 and the legacy script is not precached.
- [ ] Confirm deployment conformance, hygiene, integrity and strict governance pass.
