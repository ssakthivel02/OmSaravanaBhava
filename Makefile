PYTHON ?= python
NODE ?= node
.PHONY: test js-test baseline visual observability deployment consumers hygiene integrity verify
test:
	$(PYTHON) -B -m unittest discover -s tests -p "test_*.py" -v
js-test:
	$(NODE) --test tests/js/*.test.mjs
baseline:
	$(PYTHON) -B -m tools.production_baseline.validate --root . --mode package
visual:
	$(PYTHON) -B -m tools.visual_experience.validate --root .
observability:
	$(PYTHON) -B -m tools.operations_observability.validate --root . --mode package --report artifacts/operations-observability-report.json
deployment:
	$(PYTHON) -B -m tools.deployment_conformance.validate --root .
consumers:
	$(PYTHON) -B -m tools.effective_route_consumers.validate --root .
hygiene:
	$(PYTHON) -B -m tools.repository_hygiene.validate --root .
integrity:
	$(PYTHON) -B -m tools.repository_integrity.validate --root .
verify: baseline visual observability deployment consumers hygiene integrity js-test test
