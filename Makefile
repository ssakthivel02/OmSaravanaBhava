PYTHON ?= python
NODE ?= node

.PHONY: test js-test atomic deployment hygiene integrity release-check cleanup

test:
	$(PYTHON) -B -m unittest discover -s tests -p "test_*.py" -v

js-test:
	$(NODE) --test tests/js/*.test.mjs

atomic:
	$(PYTHON) -B -m tools.atomic_publisher.validate --root . --mode package

deployment:
	$(PYTHON) -B -m tools.deployment_conformance.validate --root .

hygiene:
	$(PYTHON) -B -m tools.repository_hygiene.validate --root .

integrity:
	$(PYTHON) -B -m tools.repository_integrity.validate --root .

release-check:
	$(PYTHON) -B tools/release_validate.py --root . --manifest manifest-release-239.json --package-mode

cleanup:
	$(PYTHON) -B -m tools.repository_integrity.cleanup --root .
