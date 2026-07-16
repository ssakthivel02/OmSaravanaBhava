[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$PackageRoot,

    [Parameter(Mandatory = $true)]
    [string]$TargetRoot,

    [string]$RemoteUrl = "https://github.com/ssakthivel02/OmSaravanaBhava.git",

    [string]$Branch = "main",

    [switch]$NoPush
)

$ErrorActionPreference = "Stop"
$expectedBase = "dfc5ce53229d9af53a99fe9a089d5d29bb3ea9b5"
$title = "Release 237: migrate effective route consumers and finalise tracked-cache cleanup"

$PackageRoot = (Resolve-Path $PackageRoot).Path
$TargetRoot = [System.IO.Path]::GetFullPath($TargetRoot)

if (Test-Path -LiteralPath $TargetRoot) {
    $items = @(Get-ChildItem -Force -LiteralPath $TargetRoot)
    if ($items.Count -gt 0) {
        throw "Target directory is not empty: $TargetRoot"
    }
}
else {
    New-Item -ItemType Directory -Path $TargetRoot | Out-Null
}

Write-Host "Cloning verified repository into: $TargetRoot"
& git clone --branch $Branch --single-branch $RemoteUrl $TargetRoot
if ($LASTEXITCODE -ne 0) {
    throw "Git clone failed."
}

Push-Location $TargetRoot
try {
    $actual = (& git rev-parse HEAD).Trim()
    if ($actual -ne $expectedBase) {
        throw "Expected HEAD $expectedBase but found $actual."
    }

    $env:PYTHONDONTWRITEBYTECODE = "1"

    python -B `
        (Join-Path $PackageRoot "scripts\release237\prepare-checkout.py") `
        --package-root $PackageRoot `
        --repository-root $TargetRoot
    if ($LASTEXITCODE -ne 0) {
        throw "Manifest-driven copy and deletion failed."
    }

    python -B scripts/release237/verify-base.py --root .
    if ($LASTEXITCODE -ne 0) {
        throw "Base verification failed."
    }

    python -B scripts/release237/verify-staged-change-set.py `
        --repository-root .
    if ($LASTEXITCODE -ne 0) {
        throw "Staged change-set verification failed."
    }

    python -B scripts/release237/verify-no-tracked-cache.py
    if ($LASTEXITCODE -ne 0) {
        throw "Tracked cache verification failed."
    }

    python -B scripts/release237/run-release-tests.py --root .
    if ($LASTEXITCODE -ne 0) {
        throw "Release regression tests failed."
    }

    python -B -m tools.repository_hygiene.validate --root .
    if ($LASTEXITCODE -ne 0) {
        throw "Repository hygiene failed."
    }

    python -B -m tools.repository_integrity.validate `
        --root . `
        --manifest manifest-release-237.json
    if ($LASTEXITCODE -ne 0) {
        throw "Repository integrity failed."
    }

    python -B tools/release_validate.py `
        --root . `
        --manifest manifest-release-237.json `
        --package-mode
    if ($LASTEXITCODE -ne 0) {
        throw "Package governance failed."
    }

    $userName = (& git config user.name).Trim()
    $userEmail = (& git config user.email).Trim()
    if ([string]::IsNullOrWhiteSpace($userName)) {
        $userName = Read-Host "Git commit name"
        & git config user.name $userName
    }
    if ([string]::IsNullOrWhiteSpace($userEmail)) {
        $userEmail = Read-Host "Git commit email"
        & git config user.email $userEmail
    }

    & git diff --cached --name-status
    & git commit -m $title
    if ($LASTEXITCODE -ne 0) {
        throw "Commit failed."
    }

    python -B tools/release_validate.py `
        --root . `
        --manifest manifest-release-237.json `
        --repository-mode `
        --strict-commit-subject
    if ($LASTEXITCODE -ne 0) {
        throw "Strict repository governance failed."
    }

    if (-not $NoPush) {
        & git push origin "HEAD:$Branch"
        if ($LASTEXITCODE -ne 0) {
            throw "Push failed. Complete GitHub authentication and rerun."
        }
    }

    $published = (& git rev-parse HEAD).Trim()
    Write-Host "Release 237 commit prepared successfully: $published"
    Write-Host "Working clone: $TargetRoot"
}
finally {
    Pop-Location
}
