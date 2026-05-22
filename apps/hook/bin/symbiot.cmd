@echo off
REM symbiot shim (Windows): mirror of bin/symbiot for cmd.exe / PowerShell.
REM Subcommands: prepare | run-hook | <other> — see bin/symbiot for the contract.

setlocal EnableExtensions EnableDelayedExpansion

set "PLUGIN_ROOT=%~dp0.."
if "%CLAUDE_PLUGIN_DATA%"=="" (
  set "DATA_DIR=%USERPROFILE%\.symbiot\plugin-data"
) else (
  set "DATA_DIR=%CLAUDE_PLUGIN_DATA%"
)

REM Only one Windows triple is supported for now.
if /I not "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
  echo symbiot: unsupported platform %PROCESSOR_ARCHITECTURE% 1>&2
  exit /b 1
)
set "TRIPLE=windows-x64"
set "BIN=%DATA_DIR%\bin\symbiot-%TRIPLE%.exe"

set "EXPECTED="
for /f "tokens=1,2" %%a in (%PLUGIN_ROOT%\bin\SHA256SUMS) do (
  if "%%b"=="symbiot-%TRIPLE%.exe" set "EXPECTED=%%a"
)
if "%EXPECTED%"=="" (
  echo symbiot: no SHA256 for symbiot-%TRIPLE%.exe in SHA256SUMS 1>&2
  exit /b 1
)

if exist "%BIN%" (
  for /f "tokens=*" %%h in ('certutil -hashfile "%BIN%" SHA256 ^| findstr /v ":"') do set "ACTUAL=%%h"
  set "ACTUAL=!ACTUAL: =!"
  if /I "!ACTUAL!"=="%EXPECTED%" (
    if "%~1"=="prepare" exit /b 0
    "%BIN%" %*
    exit /b !errorlevel!
  )
)

if not exist "%DATA_DIR%\bin" mkdir "%DATA_DIR%\bin"
set /p VERSION=<"%PLUGIN_ROOT%\bin\VERSION"
set "URL=https://github.com/awinogradov/symbiot/releases/download/%VERSION%/symbiot-%TRIPLE%.exe"
echo symbiot: downloading %URL% ... 1>&2
curl.exe -fsSL "%URL%" -o "%BIN%.tmp"
if errorlevel 1 (
  echo symbiot: download failed 1>&2
  del /q "%BIN%.tmp" 2>nul
  exit /b 1
)

for /f "tokens=*" %%h in ('certutil -hashfile "%BIN%.tmp" SHA256 ^| findstr /v ":"') do set "ACTUAL=%%h"
set "ACTUAL=!ACTUAL: =!"
if /I not "!ACTUAL!"=="%EXPECTED%" (
  echo symbiot: sha256 mismatch ^(expected %EXPECTED%, got !ACTUAL!^) 1>&2
  del /q "%BIN%.tmp"
  exit /b 1
)
move /y "%BIN%.tmp" "%BIN%" >nul

if "%~1"=="prepare" exit /b 0
"%BIN%" %*
exit /b %errorlevel%
