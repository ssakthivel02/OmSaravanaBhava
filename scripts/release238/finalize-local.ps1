[CmdletBinding()]
param(
    [string]$RepositoryRoot = ".",
    [switch]$NoPush
)

$ErrorActionPreference = "Stop"
Push-Location $RepositoryRoot
try {
    $env:PYTHONDONTWRITEBYTECODE = "1"
    python -B scripts/release238/verify-bootstrap.py --root .
    if ($LASTEXITCODE -ne 0) { throw "Bootstrap verification failed." }

    $bootstrap = (& git rev-parse HEAD).Trim()
    python -B scripts/release238/finalize-release-238.py `
      --root . --bootstrap-sha $bootstrap
    if ($LASTEXITCODE -ne 0) { throw "Finalization preparation failed." }

    python -B scripts/release238/verify-final-state.py --root .
    python -B scripts/release238/run-release-238-tests.py --root .
    python -B -m tools.repository_hygiene.validate --root .
    python -B -m tools.repository_integrity.validate `
      --root . --manifest manifest-release-238.json
    if ($LASTEXITCODE -ne 0) { throw "Validation failed." }
    python -B scripts/release238/finalize-release-238.py --root . --mark-pass

    git commit -m "Release 238: reconcile repository state and enforce deployment conformance"
    if ($LASTEXITCODE -ne 0) { throw "Commit failed." }

    python -B tools/release_validate.py `
      --root . `
      --manifest manifest-release-238.json `
      --repository-mode `
      --strict-commit-subject
    if ($LASTEXITCODE -ne 0) { throw "Strict governance failed." }

    if (-not $NoPush) {
        git push origin HEAD:main
        if ($LASTEXITCODE -ne 0) { throw "Push failed." }
    }
}
finally {
    Pop-Location
}
