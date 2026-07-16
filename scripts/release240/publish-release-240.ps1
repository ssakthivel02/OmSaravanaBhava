[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$PackageRoot,[Parameter(Mandatory=$true)][string]$TargetRoot,[string]$RemoteUrl="https://github.com/ssakthivel02/OmSaravanaBhava.git",[switch]$NoPush)
$ErrorActionPreference="Stop"; $base="546830197db7dddca9ab0cf8aaf62595ab3bc07f"; $stageTitle="Stage Release 240: install self-healing repository closure"; $finalTitle="Release 240: complete repository cleanup and establish self-healing release closure"
$PackageRoot=(Resolve-Path $PackageRoot).Path; $TargetRoot=[IO.Path]::GetFullPath($TargetRoot)
if(Test-Path $TargetRoot){if(@(Get-ChildItem -Force $TargetRoot).Count -gt 0){throw "Target is not empty: $TargetRoot"}}else{New-Item -ItemType Directory -Path $TargetRoot|Out-Null}
& git clone --branch main --single-branch $RemoteUrl $TargetRoot; if($LASTEXITCODE){throw "Clone failed"}
Push-Location $TargetRoot
try{
  if((& git rev-parse HEAD).Trim() -ne $base){throw "Remote main moved from approved base."}
  $manifest=Get-Content (Join-Path $PackageRoot 'manifest-release-240.json') -Raw|ConvertFrom-Json
  foreach($path in @($manifest.added_files)+@($manifest.modified_files)){$src=Join-Path $PackageRoot $path; $dst=Join-Path $TargetRoot $path; New-Item -ItemType Directory -Force -Path (Split-Path $dst)|Out-Null; Copy-Item -Force $src $dst}
  & git add --all; & git commit -m $stageTitle; if($LASTEXITCODE){throw "Stage commit failed"}
  $stage=(& git rev-parse HEAD).Trim(); $env:PYTHONDONTWRITEBYTECODE='1'
  python -B scripts/release240/finalize-release-240.py --root . --stage-sha $stage
  python -B scripts/release240/verify-final-state.py --root .
  python -B -m tools.release_closure.validate --root . --mode staged
  python -B scripts/release240/run-release-tests.py --root .
  python -B -m tools.repository_hygiene.validate --root .
  python -B -m tools.repository_integrity.validate --root . --manifest manifest-release-240.json
  python -B tools/release_validate.py --root . --manifest manifest-release-240.json --package-mode
  python -B scripts/release240/finalize-release-240.py --root . --mark-pass
  & git commit -m $finalTitle; if($LASTEXITCODE){throw "Final commit failed"}
  python -B tools/release_validate.py --root . --manifest manifest-release-240.json --repository-mode --strict-commit-subject
  python -B -m tools.release_closure.validate --root . --mode final
  if(-not $NoPush){& git push origin HEAD:main; if($LASTEXITCODE){throw "Push failed"}}
  & git log -2 --oneline
}finally{Pop-Location}
