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
