# Operations

Run `make verify` before every production change. GitHub workflows repeat the
same checks after pushes and pull requests. Python is always invoked with `-B`
to prevent bytecode creation.
