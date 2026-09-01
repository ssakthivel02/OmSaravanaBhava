[CmdletBinding()]
param(
    [string]$Root = ".",
    [string]$Targets = "policies/repository-cleanup-targets.json",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Push-Location $Root
try {
    $payload = Get-Content -Raw -LiteralPath $Targets | ConvertFrom-Json
    foreach ($path in @($payload.trackedPathsToRemove)) {
        if ($DryRun) {
            Write-Host "Would remove tracked generated file: $path"
            continue
        }
        if (Test-Path -LiteralPath $path) {
            & git rm -f -- $path
            if ($LASTEXITCODE -ne 0) { throw "git rm failed for $path" }
        }
        else {
            & git rm -f --ignore-unmatch -- $path
        }
    }
}
finally {
    Pop-Location
}
