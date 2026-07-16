@echo off
setlocal EnableExtensions
set "REPO=%~1"
if "%REPO%"=="" set /p "REPO=Local repository path containing the Release 240 stage commit: "
if not exist "%REPO%\.git" (echo ERROR: Invalid Git repository.& pause & exit /b 1)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%REPO%'; $env:PYTHONDONTWRITEBYTECODE='1'; python -B scripts/release240/finalize-release-240.py --root .; python -B scripts/release240/verify-final-state.py --root .; python -B -m tools.release_closure.validate --root . --mode staged; python -B scripts/release240/run-release-tests.py --root .; python -B -m tools.repository_hygiene.validate --root .; python -B -m tools.repository_integrity.validate --root . --manifest manifest-release-240.json; python -B scripts/release240/finalize-release-240.py --root . --mark-pass; git commit -m 'Release 240: complete repository cleanup and establish self-healing release closure'; python -B tools/release_validate.py --root . --manifest manifest-release-240.json --repository-mode --strict-commit-subject; python -B -m tools.release_closure.validate --root . --mode final; git push origin HEAD:main"
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" pause
exit /b %RESULT%
