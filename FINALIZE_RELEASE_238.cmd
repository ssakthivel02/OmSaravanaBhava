@echo off
setlocal EnableExtensions
set "REPOSITORY_ROOT=%~1"

if "%REPOSITORY_ROOT%"=="" (
  echo Enter the local OmSaravanaBhava repository containing the Release 238 bootstrap commit.
  set /p "REPOSITORY_ROOT=Repository path: "
)

if not exist "%REPOSITORY_ROOT%\.git" (
  echo ERROR: Not a Git repository: %REPOSITORY_ROOT%
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass ^
  -File "%REPOSITORY_ROOT%\scripts\release238\finalize-local.ps1" ^
  -RepositoryRoot "%REPOSITORY_ROOT%"

set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" pause
exit /b %RESULT%
