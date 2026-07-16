PYTHON ?= python
NODE ?= node

.PHONY: test js-test hygiene integrity route-consumers transaction deployment release-check cleanup

test:
	$(PYTHON) -B -m unittest discover -s tests -p "test_*.py" -v

js-test:
	$(NODE) --test tests/js/*.test.mjs

hygiene:
	$(PYTHON) -B -m tools.repository_hygiene.validate --root .

integrity:
	$(PYTHON) -B -m tools.repository_integrity.validate --root .

route-consumers:
	$(PYTHON) -B -m tools.effective_route_consumers.validate --root .

transaction:
	$(PYTHON) -B -m tools.release_transaction.validate --root . --mode bootstrap

deployment:
	$(PYTHON) -B -m tools.deployment_conformance.validate --root .

release-check:
	$(PYTHON) -B tools/release_validate.py --root . --manifest manifest-release-238.json --package-mode

cleanup:
	$(PYTHON) -B -m tools.repository_integrity.cleanup --root .
