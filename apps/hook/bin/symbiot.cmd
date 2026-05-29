@echo off
REM symbiot shim (Windows): mirror of bin/symbiot for cmd.exe / PowerShell.
REM Subcommands: prepare | run-hook | <other> — see bin/symbiot for the contract.
REM
REM Concurrency: a portable `md` lock lets a second invocation wait for an
REM in-progress download instead of racing it (mirrors the POSIX mkdir lock).
REM Downloads go to a unique temp so two downloaders never clobber one file.
REM Batch has no trap/`kill -0`, so a holder killed mid-download leaves a stale
REM lock; waiters recover via the bounded-wait self-download fallback below.

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
set "LOCKDIR=%DATA_DIR%\bin\.download.lock"

set "EXPECTED="
for /f "tokens=1,2" %%a in (%PLUGIN_ROOT%\bin\SHA256SUMS) do (
  if "%%b"=="symbiot-%TRIPLE%.exe" set "EXPECTED=%%a"
)
if "%EXPECTED%"=="" (
  echo symbiot: no SHA256 for symbiot-%TRIPLE%.exe in SHA256SUMS 1>&2
  exit /b 1
)

REM Cache-hit fast path.
call :binary_valid
if %errorlevel%==0 goto :run

if not exist "%DATA_DIR%\bin" mkdir "%DATA_DIR%\bin"

REM A pre-0.3.0 shim may have left .download.lock as a regular file; `md` can
REM never acquire over a non-directory, so remove any squatting the path first.
if exist "%LOCKDIR%" if not exist "%LOCKDIR%\" del /q "%LOCKDIR%" 2>nul

REM Try to acquire the lock; if held, wait for the in-progress download.
md "%LOCKDIR%" 2>nul
if %errorlevel%==0 (
  call :binary_valid
  if !errorlevel! neq 0 call :download_binary
  rd /s /q "%LOCKDIR%" 2>nul
  goto :verify_and_run
)

REM SessionStart `prepare` is best-effort and time-boxed; don't block on the
REM holder — run-hook owns the reliable download.
if "%~1"=="prepare" exit /b 0
echo symbiot: waiting for in-progress download ... 1>&2
set /a waited=0
:waitloop
call :binary_valid
if %errorlevel%==0 goto :run
if !waited! GEQ 300 (
  call :download_binary
  goto :verify_and_run
)
timeout /t 1 /nobreak >nul
set /a waited+=1
goto :waitloop

:verify_and_run
call :binary_valid
if %errorlevel% neq 0 (
  echo symbiot: binary unavailable after download 1>&2
  exit /b 1
)

:run
if "%~1"=="prepare" exit /b 0
"%BIN%" %*
exit /b %errorlevel%

REM ── subroutines ──────────────────────────────────────────────────────────

REM Returns errorlevel 0 when the cached binary matches EXPECTED, else 1.
:binary_valid
if not exist "%BIN%" exit /b 1
set "ACTUAL="
for /f "tokens=*" %%h in ('certutil -hashfile "%BIN%" SHA256 ^| findstr /v ":"') do set "ACTUAL=%%h"
set "ACTUAL=!ACTUAL: =!"
if /I "!ACTUAL!"=="%EXPECTED%" exit /b 0
exit /b 1

REM Download, verify, and atomically install the binary via a unique temp file.
:download_binary
set /p VERSION=<"%PLUGIN_ROOT%\bin\VERSION"
set "URL=https://github.com/awinogradov/symbiot/releases/download/!VERSION!/symbiot-%TRIPLE%.exe"
set "TMP=%BIN%.tmp.%RANDOM%%RANDOM%"
echo symbiot: downloading !URL! ... 1>&2
curl.exe -fsSL "!URL!" -o "!TMP!"
if errorlevel 1 (
  echo symbiot: download failed 1>&2
  del /q "!TMP!" 2>nul
  exit /b 1
)
set "ACTUAL="
for /f "tokens=*" %%h in ('certutil -hashfile "!TMP!" SHA256 ^| findstr /v ":"') do set "ACTUAL=%%h"
set "ACTUAL=!ACTUAL: =!"
if /I not "!ACTUAL!"=="%EXPECTED%" (
  echo symbiot: sha256 mismatch ^(expected %EXPECTED%, got !ACTUAL!^) 1>&2
  del /q "!TMP!" 2>nul
  exit /b 1
)
move /y "!TMP!" "%BIN%" >nul
exit /b 0
