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
$expectedBase = "530ad97c68b6e7b8cbe997f2b6bbaf440ec5d527"
$title = "Release 239: atomically reconcile repository state and establish verifiable publishing"

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

Write-Host "Cloning current repository into: $TargetRoot"
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
      (Join-Path $PackageRoot "scripts\release239\prepare-checkout.py") `
      --package-root $PackageRoot `
      --repository-root $TargetRoot
    if ($LASTEXITCODE -ne 0) {
        throw "Manifest application failed."
    }

    python -B scripts/release239/verify-base.py --root .
    python -B scripts/release239/verify-staged-change-set.py --root .
    python -B scripts/release239/run-release-tests.py --root .
    python -B -m tools.repository_hygiene.validate --root .
    python -B -m tools.repository_integrity.validate `
      --root . `
      --manifest manifest-release-239.json
    python -B tools/release_validate.py `
      --root . `
      --manifest manifest-release-239.json `
      --package-mode
    if ($LASTEXITCODE -ne 0) {
        throw "Release validation failed."
    }

    $userName = (& git config user.name).Trim()
    $userEmail = (& git config user.email).Trim()
    if ([string]::IsNullOrWhiteSpace($userName)) {
        & git config user.name "Sakthivel S"
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
      --manifest manifest-release-239.json `
      --repository-mode `
      --strict-commit-subject
    python -B -m tools.atomic_publisher.validate `
      --root . `
      --mode final
    if ($LASTEXITCODE -ne 0) {
        throw "Post-commit validation failed."
    }

    if (-not $NoPush) {
        & git push origin "HEAD:$Branch"
        if ($LASTEXITCODE -ne 0) {
            throw "Push failed. Complete GitHub authentication and rerun."
        }
    }

    Write-Host "Release 239 committed successfully:"
    & git log -1 --oneline
    Write-Host "Clone retained at: $TargetRoot"
}
finally {
    Pop-Location
}
