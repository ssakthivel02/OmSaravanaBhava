[CmdletBinding()]
param(
    [string]$Manifest = "",
    [switch]$Strict
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($Manifest)) {
    $Manifest = (python -m tools.release_control.discovery --root .).Trim()
}
$metadata = Get-Content -Raw -LiteralPath $Manifest | ConvertFrom-Json
$expected = [string]$metadata.required_commit_title
$subject = (& git log -1 --pretty=%s).Trim()
$body = & git log -1 --pretty=%b
$bodyFirst = ($body -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -First 1).Trim()

if ($subject -eq $expected) {
    Write-Host "PASS exact commit subject: $subject" -ForegroundColor Green
    exit 0
}

if (-not $Strict -and $subject -eq "Add files via upload" -and $bodyFirst -eq $expected) {
    Write-Warning "Browser fallback accepted: generic subject with exact release title in the first non-empty body line."
    exit 0
}

Write-Error "Commit metadata mismatch. Expected '$expected'; subject='$subject'; body first line='$bodyFirst'."
exit 1
