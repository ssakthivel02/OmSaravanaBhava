# Production verification boundary

Repository governance does not certify production.

After a governance PASS, verify independently:

- GitHub Pages deployment conclusion;
- expected custom-domain routes;
- JavaScript and JSON assets returning HTTP 200;
- responsive layouts and keyboard behaviour;
- service-worker update and offline behaviour;
- no regression to browser-local data;
- no unexpected console errors;
- source, completeness and rights statements remaining visible.

Record production results as PASS, FAIL, NOT_RUN or INCONCLUSIVE. Do not infer production success from a local package validator.
