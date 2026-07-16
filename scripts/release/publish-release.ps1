[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$Root = ".",
    [string]$Manifest = "",
    [string]$Remote = "origin",
    [string]$Branch = "main",
    [switch]$NoPush
)

$ErrorActionPreference = "Stop"
Push-Location $Root
try {
    if ([string]::IsNullOrWhiteSpace($Manifest)) {
        $Manifest = (python -m tools.release_control.discovery --root .).Trim()
    }
    $metadata = Get-Content -Raw -LiteralPath $Manifest | ConvertFrom-Json
    $expectedBase = [string]$metadata.base_commit
    $title = [string]$metadata.required_commit_title
    $head = (& git rev-parse HEAD).Trim()
    if ($head -ne $expectedBase) {
        throw "Base mismatch. Expected $expectedBase; current HEAD is $head."
    }

    $declared = @($metadata.added_files) + @($metadata.modified_files) + @($metadata.deleted_files)
    $declared = $declared | ForEach-Object { [string]$_ } | Sort-Object -Unique
    $actual = & git status --porcelain=v1
    $actualPaths = @()
    foreach ($line in $actual) {
        if ($line.Length -lt 4) { continue }
        $path = $line.Substring(3)
        if ($path -match " -> ") { $path = ($path -split " -> ")[-1] }
        $actualPaths += $path.Trim('"')
    }
    $unexpected = $actualPaths | Where-Object { $_ -notin $declared }
    if ($unexpected) {
        throw "Unexpected changed paths: $($unexpected -join ', ')"
    }

    python tools/release_validate.py --root . --manifest $Manifest --package-mode
    if ($LASTEXITCODE -ne 0) { throw "Package governance validation failed." }

    & git add -- $declared
    if ($LASTEXITCODE -ne 0) { throw "git add failed." }
    $staged = & git diff --cached --name-only
    $missing = $declared | Where-Object { $_ -notin $staged -and (Test-Path -LiteralPath $_) }
    if ($missing) { throw "Declared paths were not staged: $($missing -join ', ')" }

    if ($PSCmdlet.ShouldProcess("$Branch", "Commit '$title'")) {
        & git commit -m $title
        if ($LASTEXITCODE -ne 0) { throw "git commit failed." }
    }
    & "$PSScriptRoot/check-commit-metadata.ps1" -Manifest $Manifest -Strict
    if ($LASTEXITCODE -ne 0) { throw "Strict metadata validation failed." }

    if (-not $NoPush -and $PSCmdlet.ShouldProcess("$Remote/$Branch", "Push release commit")) {
        & git push $Remote "HEAD:$Branch"
        if ($LASTEXITCODE -ne 0) { throw "git push failed." }
    }
    Write-Host "Release commit created with exact subject: $title" -ForegroundColor Green
}
finally {
    Pop-Location
}
