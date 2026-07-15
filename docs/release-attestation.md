# Release attestation

The Release 232 gate emits a JSON attestation containing:

- release number and overall governance status;
- uploaded commit SHA and first parent;
- exact commit subject and match result;
- manifest path, SHA256 and base commit;
- changed-file count and manifest coverage differences;
- every deterministic check and result;
- UTC generation timestamp.

The independent attestation workflow re-runs the same deterministic checks against the selected commit. It does not reuse the first workflow's conclusion as proof.
