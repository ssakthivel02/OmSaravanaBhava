[CmdletBinding()]
param([string]$Manifest = "")

$ErrorActionPreference = "Stop"
& "$PSScriptRoot/check-commit-metadata.ps1" -Manifest $Manifest -Strict
exit $LASTEXITCODE
