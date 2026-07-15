[CmdletBinding()]
param([string]$Expected = "Release 232: add deterministic release governance gate")

$ErrorActionPreference = "Stop"
$actual = (git log -1 --pretty=%s).Trim()
if ($actual -ne $Expected) {
    Write-Error "Commit subject mismatch. Expected '$Expected'; found '$actual'."
    exit 1
}
Write-Host "Commit subject is exact: $actual" -ForegroundColor Green
