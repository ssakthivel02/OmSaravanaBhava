@echo off
setlocal EnableExtensions
set "PACKAGE_ROOT=%~dp0"

where git >nul 2>nul || (
  echo ERROR: Git is not installed or unavailable in PATH.
  pause
  exit /b 1
)
where python >nul 2>nul || (
  echo ERROR: Python is not installed or unavailable in PATH.
  pause
  exit /b 1
)
where node >nul 2>nul || (
  echo ERROR: Node.js is not installed or unavailable in PATH.
  pause
  exit /b 1
)

set "TARGET_ROOT=%~1"
if "%TARGET_ROOT%"=="" (
  set "TARGET_ROOT=%TEMP%\OmSaravanaBhava-release239-%RANDOM%"
)

powershell -NoProfile -ExecutionPolicy Bypass ^
  -File "%PACKAGE_ROOT%scripts\release239\publish-release-239.ps1" ^
  -PackageRoot "%PACKAGE_ROOT%" ^
  -TargetRoot "%TARGET_ROOT%"

set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" pause
exit /b %RESULT%
