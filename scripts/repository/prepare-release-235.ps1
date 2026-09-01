[CmdletBinding()]
param(
    [string]$Root = ".",
    [string]$Remote = "origin",
    [string]$Branch = "main",
    [switch]$NoPush
)

$ErrorActionPreference = "Stop"
$expectedBase = "d43c5ffbb240a01ddd444839c10ba61c438c85a1"
$title = "Release 235: repair repository hygiene and governance baseline"
Push-Location $Root
try {
    $head = (& git rev-parse HEAD).Trim()
    if ($head -ne $expectedBase) {
        throw "Expected HEAD $expectedBase but found $head."
    }
    & "$PSScriptRoot/remove-tracked-generated-files.ps1" -Root .
    $env:PYTHONDONTWRITEBYTECODE = "1"
    python -B tools/release_validate.py --root . --manifest manifest-release-235.json --package-mode
    if ($LASTEXITCODE -ne 0) { throw "Package validation failed." }
    & git add -A
    & git commit -m $title
    if ($LASTEXITCODE -ne 0) { throw "Commit failed." }
    python -B tools/release_validate.py --root . --manifest manifest-release-235.json --repository-mode --strict-commit-subject
    if ($LASTEXITCODE -ne 0) { throw "Strict repository validation failed." }
    if (-not $NoPush) {
        & git push $Remote "HEAD:$Branch"
        if ($LASTEXITCODE -ne 0) { throw "Push failed." }
    }
}
finally {
    Pop-Location
}
