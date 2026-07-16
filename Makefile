PYTHON ?= python
NODE ?= node
.PHONY: test js-test closure deployment hygiene integrity release-check cleanup
test:
	$(PYTHON) -B -m unittest discover -s tests -p "test_*.py" -v
js-test:
	$(NODE) --test tests/js/*.test.mjs
closure:
	$(PYTHON) -B -m tools.release_closure.validate --root . --mode final
deployment:
	$(PYTHON) -B -m tools.deployment_conformance.validate --root .
hygiene:
	$(PYTHON) -B -m tools.repository_hygiene.validate --root .
integrity:
	$(PYTHON) -B -m tools.repository_integrity.validate --root . --manifest manifest-release-240.json
release-check:
	$(PYTHON) -B tools/release_validate.py --root . --manifest manifest-release-240.json --package-mode
cleanup:
	$(PYTHON) -B -m tools.repository_integrity.cleanup --root .
