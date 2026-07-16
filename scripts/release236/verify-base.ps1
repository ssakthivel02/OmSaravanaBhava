[CmdletBinding()]
param([string]$Root = ".")
$expected = "d06aa0d99315344ad2c23ee3a1d98fb635f33b16"
Push-Location $Root
try {
    $actual = (& git rev-parse HEAD).Trim()
    if ($actual -ne $expected) { throw "Expected $expected but found $actual." }
    Write-Host "Base commit verified: $actual"
}
finally { Pop-Location }
