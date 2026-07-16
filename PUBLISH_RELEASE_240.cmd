@echo off
setlocal EnableExtensions
set "PACKAGE_ROOT=%~dp0"
set "TARGET_ROOT=%~1"
if "%TARGET_ROOT%"=="" set "TARGET_ROOT=%TEMP%\OmSaravanaBhava-release240-%RANDOM%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE_ROOT%scripts\release240\publish-release-240.ps1" -PackageRoot "%PACKAGE_ROOT%" -TargetRoot "%TARGET_ROOT%"
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" pause
exit /b %RESULT%
