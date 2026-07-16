[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$RepositoryRoot)

Push-Location $RepositoryRoot
try {
    Write-Host "HEAD:" (& git rev-parse HEAD)
    Write-Host "Subject:" (& git log -1 --format=%s)
    Write-Host "Parent:" (& git rev-parse HEAD^)
    Write-Host "Changed files:" (
        (& git diff --name-only HEAD^ HEAD | Measure-Object).Count
    )
    Write-Host "Deleted files:" (
        (& git diff --name-status HEAD^ HEAD |
          Select-String "^D`t" |
          Measure-Object).Count
    )
}
finally {
    Pop-Location
}
