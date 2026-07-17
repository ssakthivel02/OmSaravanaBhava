@echo off
setlocal EnableExtensions
set "PACKAGE_ROOT=%~dp0"
where git >nul 2>nul || (echo ERROR: Git is required.& pause& exit /b 1)
where python >nul 2>nul || (echo ERROR: Python is required.& pause& exit /b 1)
where node >nul 2>nul || (echo ERROR: Node.js is required.& pause& exit /b 1)
set "TARGET=%~1"
if "%TARGET%"=="" set "TARGET=%TEMP%\OmSaravanaBhava-release242-%RANDOM%"
echo.
echo IMPORTANT: This is a LOCAL publisher. Do not upload this package to GitHub.
echo.
python -B "%PACKAGE_ROOT%publisher\publish.py" --package-root "%PACKAGE_ROOT%" --target "%TARGET%"
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" pause
exit /b %RESULT%
