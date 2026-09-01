[CmdletBinding()]
param([string]$Root = ".")

$ErrorActionPreference = "Stop"
Push-Location $Root
try {
    $env:PYTHONDONTWRITEBYTECODE = "1"
    python -B -m tools.repository_hygiene.validate --root .
    if ($LASTEXITCODE -ne 0) { throw "Repository hygiene validation failed." }
}
finally {
    Pop-Location
}
