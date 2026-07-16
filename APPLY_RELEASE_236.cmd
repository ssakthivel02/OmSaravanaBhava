@echo off
setlocal EnableExtensions
set "PACKAGE_ROOT=%~dp0"

where git >nul 2>nul || (
  echo ERROR: Git is not installed or not in PATH.
  pause
  exit /b 1
)
where python >nul 2>nul || (
  echo ERROR: Python is not installed or not in PATH.
  pause
  exit /b 1
)

set "REPOSITORY_ROOT=%~1"
if "%REPOSITORY_ROOT%"=="" (
  echo.
  echo Enter the full path to your local OmSaravanaBhava Git repository.
  set /p "REPOSITORY_ROOT=Repository path: "
)

if not exist "%REPOSITORY_ROOT%\.git" (
  echo ERROR: "%REPOSITORY_ROOT%" is not a Git repository.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass ^
  -File "%PACKAGE_ROOT%scripts\release236\apply-release-236.ps1" ^
  -RepositoryRoot "%REPOSITORY_ROOT%" ^
  -PackageRoot "%PACKAGE_ROOT%"

set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" pause
exit /b %RESULT%
