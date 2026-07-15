[CmdletBinding()]
param(
    [string]$Root = ".",
    [switch]$RepositoryMode
)

$ErrorActionPreference = "Stop"
$mode = if ($RepositoryMode) { "--repository-mode" } else { "--package-mode" }
Push-Location $Root
try {
    python tools/release_232_validate.py `
        --root . `
        --manifest manifest-release-232.json `
        $mode
    if ($LASTEXITCODE -ne 0) {
        throw "Release 232 governance validation failed."
    }
    Write-Host "Release 232 governance validation passed." -ForegroundColor Green
}
finally {
    Pop-Location
}
