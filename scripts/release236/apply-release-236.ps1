[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$RepositoryRoot,

    [string]$PackageRoot = "",

    [string]$Remote = "origin",

    [string]$Branch = "main",

    [switch]$NoPush
)

$ErrorActionPreference = "Stop"
$expected = "d06aa0d99315344ad2c23ee3a1d98fb635f33b16"
$title = "Release 236: complete tracked-cache cleanup and enforce repository integrity"

if ([string]::IsNullOrWhiteSpace($PackageRoot)) {
    $PackageRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}
else {
    $PackageRoot = (Resolve-Path $PackageRoot).Path
}
$RepositoryRoot = (Resolve-Path $RepositoryRoot).Path
$patch = Join-Path $PackageRoot "RELEASE_236.patch"

$evidence = @(
    "RELEASE_236.patch",
    "RELEASE_236_CHANGED_FILES.txt",
    "RELEASE_236_GITHUB_PORTAL_INSTRUCTIONS.txt",
    "RELEASE_236_LOCAL_TEST_EVIDENCE.txt",
    "RELEASE_236_SHA256SUMS.txt",
    "RELEASE_236_VALIDATION_REPORT.md"
)

Push-Location $RepositoryRoot
try {
    $head = (& git rev-parse HEAD).Trim()
    if ($head -ne $expected) {
        throw "Expected HEAD $expected but found $head."
    }

    $env:PYTHONDONTWRITEBYTECODE = "1"
    & git apply --index --binary $patch
    if ($LASTEXITCODE -ne 0) {
        throw "Release patch application failed."
    }

    & git checkout-index -f -- `
        "APPLY_RELEASE_236.cmd" `
        "scripts/release236/apply-release-236.ps1" `
        "scripts/release236/show-changed-files.ps1" `
        "scripts/release236/verify-base.ps1"
    if ($LASTEXITCODE -ne 0) {
        throw "Installer line-ending normalisation failed."
    }

    foreach ($relative in $evidence) {
        Copy-Item -Force `
            -LiteralPath (Join-Path $PackageRoot $relative) `
            -Destination (Join-Path $RepositoryRoot $relative)
        & git add -- $relative
        if ($LASTEXITCODE -ne 0) {
            throw "Unable to stage $relative."
        }
    }

    python -B -m tools.repository_hygiene.validate --root .
    if ($LASTEXITCODE -ne 0) {
        throw "Repository hygiene failed."
    }

    python -B -m tools.repository_integrity.validate --root .
    if ($LASTEXITCODE -ne 0) {
        throw "Repository integrity failed."
    }

    python -B tools/release_validate.py `
        --root . `
        --manifest manifest-release-236.json `
        --package-mode
    if ($LASTEXITCODE -ne 0) {
        throw "Package governance failed."
    }

    & git diff --cached --name-status
    & git commit -m $title
    if ($LASTEXITCODE -ne 0) {
        throw "Commit failed."
    }

    python -B tools/release_validate.py `
        --root . `
        --manifest manifest-release-236.json `
        --repository-mode `
        --strict-commit-subject
    if ($LASTEXITCODE -ne 0) {
        throw "Strict repository governance failed."
    }

    if (-not $NoPush) {
        & git push $Remote "HEAD:$Branch"
        if ($LASTEXITCODE -ne 0) {
            throw "Push failed."
        }
    }
}
finally {
    Pop-Location
}
