PYTHON ?= python

.PHONY: test hygiene integrity release-check cleanup

test:
	$(PYTHON) -B -m unittest discover -s tests -p "test_*.py" -v

hygiene:
	$(PYTHON) -B -m tools.repository_hygiene.validate --root .

integrity:
	$(PYTHON) -B -m tools.repository_integrity.validate --root .

release-check:
	$(PYTHON) -B tools/release_validate.py --root . --manifest manifest-release-236.json --package-mode

cleanup:
	$(PYTHON) -B -m tools.repository_integrity.cleanup --root .
