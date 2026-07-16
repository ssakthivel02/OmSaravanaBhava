# Windows Publisher

Extract the package outside any repository and double-click
`PUBLISH_RELEASE_239.cmd`. The script creates a unique temporary clone, verifies
the exact base SHA, applies the manifest, runs all gates and pushes through Git
Credential Manager.
