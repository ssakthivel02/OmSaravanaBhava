# Release status language

Use only evidence-backed terms.

## PASS

A check ran and all stated assertions succeeded.

## WARN

A check ran and accepted a documented compatibility condition. Overall governance may remain PASS, but the warning must remain visible in the report and attestation.

The principal Release 233 example is GitHub browser-description fallback: the body title is exact, but the subject remains `Add files via upload`.

## FAIL

A check ran and one or more stated assertions failed.

## NOT_RUN

The check has not been executed.

## INCONCLUSIVE

The check was attempted but the available interface or evidence could not establish a reliable conclusion.

## SKIPPED

The check was intentionally omitted because it does not apply in the current mode.

Never translate `WARN`, `NOT_RUN`, `INCONCLUSIVE` or `SKIPPED` into an unqualified check-level PASS. Repository validation and production validation remain separate claims.
