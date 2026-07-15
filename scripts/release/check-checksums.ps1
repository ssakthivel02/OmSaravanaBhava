[CmdletBinding()]
param([string]$Ledger = "RELEASE_232_SHA256SUMS.txt")

$ErrorActionPreference = "Stop"
Get-Content $Ledger | ForEach-Object {
    if ([string]::IsNullOrWhiteSpace($_)) { return }
    $parts = $_ -split "  ", 2
    if ($parts.Count -ne 2) { throw "Invalid checksum line: $_" }
    $expected = $parts[0]
    $path = $parts[1]
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Checksum target missing: $path"
    }
    $actual = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expected.ToLowerInvariant()) {
        throw "Checksum mismatch: $path"
    }
    Write-Host "PASS $path"
}
