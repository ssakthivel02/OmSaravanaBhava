[CmdletBinding()]
param(
    [string]$Root = ".",
    [string]$Manifest = "",
    [switch]$RepositoryMode,
    [switch]$StrictCommitSubject
)

$ErrorActionPreference = "Stop"
$mode = if ($RepositoryMode) { "--repository-mode" } else { "--package-mode" }
Push-Location $Root
try {
    if ([string]::IsNullOrWhiteSpace($Manifest)) {
        $Manifest = (python -m tools.release_control.discovery --root .).Trim()
    }
    $strict = if ($StrictCommitSubject) { "--strict-commit-subject" } else { $null }
    python tools/release_validate.py `
        --root . `
        --manifest $Manifest `
        $mode `
        $strict
    if ($LASTEXITCODE -ne 0) {
        throw "Release governance validation failed for $Manifest."
    }
    Write-Host "Release governance validation passed for $Manifest." -ForegroundColor Green
}
finally {
    Pop-Location
}
