# Release attestation

The governance gate emits JSON containing:

- release number and overall governance status;
- warning count and warning messages;
- uploaded commit SHA and first parent;
- Git subject and first non-empty body line;
- subject-match and body-match booleans;
- metadata mode: exact subject, browser fallback, invalid or not run;
- strict-subject flag;
- manifest path, SHA256 and base commit;
- changed-file count and manifest coverage differences;
- every deterministic check and result;
- UTC generation timestamp.

The independent attestation workflow re-runs the same checks against the selected commit. It does not reuse the first workflow's conclusion as proof.
