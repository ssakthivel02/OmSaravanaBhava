[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$PackageRoot,

    [Parameter(Mandatory = $true)]
    [string]$TargetRoot
)

& (Join-Path $PSScriptRoot "publish-release-237.ps1") `
  -PackageRoot $PackageRoot `
  -TargetRoot $TargetRoot `
  -NoPush
exit $LASTEXITCODE
