# Release status language

Use only evidence-backed terms.

## PASS

A check ran and all stated assertions succeeded.

## FAIL

A check ran and one or more stated assertions failed.

## NOT_RUN

The check has not been executed.

## INCONCLUSIVE

The check was attempted but the available interface or evidence could not establish a reliable conclusion.

## SKIPPED

The check was intentionally omitted because it does not apply in the current mode.

Never translate `NOT_RUN`, `INCONCLUSIVE` or `SKIPPED` into `PASS`. Repository validation and production validation are separate claims.
