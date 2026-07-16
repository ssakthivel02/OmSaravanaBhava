[CmdletBinding()]
param([string]$Root = ".")
Push-Location $Root
try {
    & git diff --cached --name-status
    & git diff --cached --stat
}
finally { Pop-Location }
